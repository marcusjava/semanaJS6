import fs from "fs";
import config from "./config.js";
import path, { join, extname } from "path";
import fsPromises from "fs/promises";
import { randomUUID } from "crypto";
import { PassThrough, Writable } from "stream";
import streamsPromises from "stream/promises";
import Throttle from "throttle";
import childProcess from "child_process";
import { logger } from "./utils.js";
import { once } from "events";

const {
  dir: { publicDirectory, fxDirectory },
  constants: {
    fallbackBitRate,
    englishConversation,
    bitRateDivisor,
    audioMediaType,
    fxVolume,
    songVolume,
  },
} = config;
export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();
    this.clientStreams.set(id, clientStream);
    return {
      id,
      clientStream,
    };
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommands(args) {
    return childProcess.spawn("sox", args);
  }

  broadcast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [key, stream] of this.clientStreams) {
          //se o cliente desconectou nao devemos mandar mais dados pois irá quebrar a aplicação
          if (stream.writableEnded) {
            this.clientStreams.delete(key);
            continue;
          }
          stream.write(chunk);
        }
        cb();
      },
    });
  }
  async startStream() {
    logger.info(`starting with ${this.currentSong}`);
    const bitRate = (this.currentBitRate =
      (await this.getBitRate(this.currentSong)) / bitRateDivisor);
    const throttleTransform = (this.throttleTransform = new Throttle(bitRate));
    const songReadable = (this.currentReadable = this.createFileStream(
      this.currentSong
    ));
    return streamsPromises.pipeline(
      songReadable,
      throttleTransform,
      this.broadcast()
    );
  }

  stopStream() {
    logger.info("Stopping stream");
    this.throttleTransform?.end?.();
  }

  async getBitRate(song) {
    try {
      const args = ["--i", "-B", song];
      const { stderr, stdout, stdin } = this._executeSoxCommands(args);

      await Promise.all([once(stderr, "readable"), once(stdout, "readable")]);
      const [success, error] = [stdout, stderr].map((stream) => stream.read());

      if (error) return await Promise.reject(error);

      return success.toString().trim().replace(/k/, "000");
    } catch (error) {
      return fallbackBitRate;
    }
  }

  async readFxByName(fxName) {
    const songs = await fsPromises.readdir(fxDirectory);
    console.log(songs);
    const chosenSong = songs.find((filename) =>
      filename.toLowerCase().includes(fxName)
    );
    if (!chosenSong) return Promise.reject("Song not avaliable!");
    return path.join(fxDirectory, chosenSong);
  }

  appendFxStream(fx) {
    const throttleTransformable = new Throttle(this.currentBitRate);
    streamsPromises.pipeline(throttleTransformable, this.broadcast());

    const unpipe = () => {
      const transformStream = this.mergeAudioStreams(fx, this.currentReadable);
      this.throttleTransform = throttleTransformable;
      this.currentReadable = transformStream;
      this.currentReadable.removeListener("unpipe", unpipe);
      streamsPromises.pipeline(transformStream, throttleTransformable);
    };

    this.throttleTransform.on("unpipe", unpipe);
    this.throttleTransform.pause();
    this.currentReadable.unpipe(this.throttleTransform);
  }

  mergeAudioStreams(song, readable) {
    const transformStream = PassThrough();
    const args = [
      "-t",
      audioMediaType,
      "-v",
      songVolume,
      "-m",
      "-",
      "-t",
      audioMediaType,
      "-v",
      fxVolume,
      song,
      "-t",
      audioMediaType,
      "-",
    ];
    const { stdout, stdin } = this._executeSoxCommands(args);
    streamsPromises.pipeline(readable, stdin);
    streamsPromises.pipeline(stdout, transformStream);

    return transformStream;
  }

  async getFileInfo(file) {
    // home/index.html
    const fullFilePath = join(publicDirectory, file);
    await fsPromises.access(fullFilePath);
    const fileType = extname(fullFilePath);

    return {
      type: fileType,
      name: fullFilePath,
    };
  }

  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileStream(file) {
    const { type, name } = await this.getFileInfo(file);
    return {
      stream: this.createFileStream(name),
      type,
    };
  }
}
