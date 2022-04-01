import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import childProcess from "child_process";
import streamPromises from "stream/promises";
import crypto from "crypto";
import { Service } from "../../../server/service.js";
import TestUtil from "../_util/testUtil.js";
import fs from "fs";
import fsPromises from "fs/promises";
import Throttle from "throttle";
import { PassThrough, Writable } from "stream";

import path from "path";

const {
  pages,
  location,
  constants: {
    fallbackBitRate,
    bitrateDivisor,
    audioMediaType,
    songVolume,
    fxVolume,
  },
  dir: { publicDirectory, rootDir, fxDirectory: fxDir },
} = config;

describe("Service test suite", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("should create a stream when call #createClientStream", async () => {
    const service = new Service();
    jest.spyOn(service.clientStreams, service.clientStreams.set.name);

    const { id, clientStream } = service.createClientStream();

    expect(id.length).toBeGreaterThan(0);
    expect(clientStream).toBeInstanceOf(PassThrough);
    expect(service.clientStreams.set).toHaveBeenCalledWith(id, clientStream);
  });
  test("should remove a stream when call #removeClientStream", async () => {
    const id = "123456789";
    const service = new Service();
    const deleteClientMock = jest.spyOn(
      service.clientStreams,
      service.clientStreams.delete.name
    );

    service.removeClientStream(id);
    expect(deleteClientMock).toHaveBeenCalledWith(id);
  });
  test("should execute sox commands #_executeSoxCommands", () => {
    const appToCall = "sox";
    const args = ["args"];
    const service = new Service();

    const spawnResponse = TestUtil.getSpawnResponse({
      stdout: "128k",
    });

    const mockProcess = jest
      .spyOn(childProcess, childProcess.spawn.name)
      .mockReturnValue(spawnResponse);

    const result = service._executeSoxCommands(args);

    expect(mockProcess).toHaveBeenCalledWith(appToCall, args);
    expect(result).toStrictEqual(spawnResponse);
  });

  it("should stop streaming if throttleTransform exists - stopStreaming()", () => {
    const service = new Service();
    const bps = 1000;
    service.throttleTransform = new Throttle(bps);

    jest.spyOn(service.throttleTransform, "end").mockReturnValue();

    service.stopStream();
    expect(service.throttleTransform.end).toHaveBeenCalled();
  });
  it("should not throw if throttleTransform exists - stopStreaming()", () => {
    const service = new Service();
    expect(() => service.stopStream()).not.toThrow();
  });

  it("should return the bitrate as string - getBitrate()", async () => {
    const service = new Service();
    const spawnResponse = TestUtil.getSpawnResponse({
      stdout: "64k",
    });

    jest
      .spyOn(service, service._executeSoxCommands.name)
      .mockReturnValue(spawnResponse);

    const song = "song.mp3";
    const result = await service.getBitRate(song);

    expect(result).toStrictEqual("64000");
    expect(service._executeSoxCommands).toHaveBeenCalledWith([
      "--i",
      "-B",
      song,
    ]);
  });

  it("should return the fallbackBitRate on error - getBitrate()", async () => {
    const service = new Service();
    const spawnResponse = TestUtil.getSpawnResponse({
      stderr: "error!",
    });

    jest
      .spyOn(service, service._executeSoxCommands.name)
      .mockReturnValue(spawnResponse);

    const song = "song.mp3";
    const result = await service.getBitRate(song);

    expect(result).toStrictEqual(fallbackBitRate);
    expect(service._executeSoxCommands).toHaveBeenCalledWith([
      "--i",
      "-B",
      song,
    ]);
  });
  it("should write only for active client streams - broadcast()", () => {
    const service = new Service();
    const onData = jest.fn();
    const client1 = TestUtil.generateWritableStream(onData);
    const client2 = TestUtil.generateWritableStream(onData);
    jest.spyOn(service.clientStreams, service.clientStreams.delete.name);

    service.clientStreams.set("1", client1);
    service.clientStreams.set("2", client2);
    client2.end();

    const writable = service.broadcast();
    writable.write("Hello World");

    expect(writable).toBeInstanceOf(Writable);
    expect(service.clientStreams.delete).toHaveBeenCalledWith("2");
    expect(onData).toHaveBeenCalledTimes(1);
  });

  test("getFileStream should return stream and type correctly", async () => {
    const filename = "/index.html";
    const expectedType = ".html";
    const fullFileDirectory = publicDirectory + filename;
    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    const service = new Service();

    const fileInfoMock = jest
      .spyOn(Service.prototype, Service.prototype.getFileInfo.name)
      .mockResolvedValue({
        type: expectedType,
        name: filename,
      });

    jest
      .spyOn(Service.prototype, Service.prototype.createFileStream.name)
      .mockReturnValue(mockFileStream);

    const result = await service.getFileStream(filename);
    expect(fileInfoMock).toHaveBeenCalledWith(filename);
    expect(result).toStrictEqual({
      stream: mockFileStream,
      type: expectedType,
    });
  });
  test("getFileInfo should return name and type correctly", async () => {
    const filename = "/index.html";
    const expectedType = ".html";
    const fullFileDirectory = publicDirectory + filename;

    jest.spyOn(fsPromises, fsPromises.access.name).mockResolvedValue(null);
    const service = new Service();
    const fileInfo = await service.getFileInfo(filename);

    expect(fileInfo).toStrictEqual({
      type: expectedType,
      name: fullFileDirectory,
    });
  });
  test("should createFileStream", async () => {
    const filename = "/index.html";
    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest.spyOn(fs, fs.createReadStream.name).mockReturnValue(mockFileStream);
    const service = new Service();
    const fileStream = await service.createFileStream(filename);

    expect(fileStream).toEqual(mockFileStream);
  });

  it("should start streaming - startStreaming()", async () => {
    const service = new Service();
    const currentSong = (service.currentSong = "song.mp3");
    const currentReadable = TestUtil.generateReadableStream(["song"]);
    const broadcastWritable = TestUtil.generateWritableStream(() => {});

    jest.spyOn(fs, fs.createReadStream.name).mockReturnValue(currentReadable);
    jest
      .spyOn(service, service.broadcast.name)
      .mockReturnValue(broadcastWritable);
    jest
      .spyOn(service, service.getBitRate.name)
      .mockResolvedValue(fallbackBitRate);
    jest
      .spyOn(streamPromises, streamPromises.pipeline.name)
      .mockResolvedValue({});

    await service.startStream();

    expect(service.currentBitRate).toEqual(
      Number(fallbackBitRate) / bitrateDivisor
    );
    expect(service.getBitRate).toHaveBeenCalledWith(currentSong);
    expect(fs.createReadStream).toHaveBeenCalledWith(currentSong);
    expect(streamPromises.pipeline).toHaveBeenCalledWith(
      currentReadable,
      service.throttleTransform,
      service.broadcast()
    );
  });

  it("should return a chosen song based on fx command sent", async () => {
    const service = new Service();
    const fxName = "songB".toLowerCase();
    const fxSounds = ["songA is awesome.mp3", "bad songB.mp3"];
    const readDir = jest
      .spyOn(fs.promises, fs.promises.readdir.name)
      .mockResolvedValue(fxSounds);
    jest
      .spyOn(path, path.join.name)
      .mockReturnValue(`${rootDir}/audio/fx/'bad songB.mp3'`);

    const chosenFx = await service.readFxByName(fxName);

    expect(readDir).toHaveBeenCalledWith(fxDir);
    expect(chosenFx).toStrictEqual(`${chosenFx}`);
  });

  it("should return an error if fx sound wasn't found", async () => {
    const service = new Service();
    const fxName = "songC".toLowerCase();
    const fxSounds = ["songA is awesome.mp3", "bad songB.mp3"];
    const readDir = jest
      .spyOn(fs.promises, fs.promises.readdir.name)
      .mockResolvedValue(fxSounds);

    expect(service.readFxByName(fxName)).rejects.toEqual(`Song not avaliable!`);
    expect(readDir).toHaveBeenCalledWith(fxDir);
  });

  it("should merge audio stream", () => {
    const service = new Service();
    const readable = TestUtil.generateReadableStream();
    const spawnResponse = TestUtil.getSpawnResponse({
      stdout: "song+fx",
      stdin: "fx",
    });
    jest
      .spyOn(service, service._executeSoxCommands.name)
      .mockReturnValue(spawnResponse);
    jest
      .spyOn(streamPromises, streamPromises.pipeline.name)
      .mockResolvedValue();

    const fxSound = "songA.mp3";
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
      fxSound,
      "-t",
      audioMediaType,
      "-",
    ];

    const transformStream = service.mergeAudioStreams(fxSound, readable);
    const [_, call2] = streamPromises.pipeline.mock.calls;
    const [stdoutCall, __] = call2;

    expect(service._executeSoxCommands).toHaveBeenCalledWith(args);
    expect(streamPromises.pipeline).toHaveBeenCalledTimes(2);
    expect(streamPromises.pipeline).toHaveBeenNthCalledWith(
      1,
      readable,
      spawnResponse.stdin
    );
    expect(stdoutCall).toStrictEqual(spawnResponse.stdout);
    expect(transformStream).toBeInstanceOf(PassThrough);
  });

  it("should append a fx stream to current stream", () => {
    const service = new Service();
    const fx = "fxSound.mp3";
    const bps = 1000;
    service.throttleTransform = new Throttle(bps);
    service.currentReadable = TestUtil.generateReadableStream(["stream"]);
    const mergedThrottleTransform = new PassThrough();
    jest
      .spyOn(streamPromises, streamPromises.pipeline.name)
      .mockResolvedValue();
    jest.spyOn(service.throttleTransform, "pause").mockReturnValue();
    jest.spyOn(service.throttleTransform, "unpipe").mockReturnValue();
    jest.spyOn(service.currentReadable, "unpipe").mockReturnValue();
    jest
      .spyOn(service, service.mergeAudioStreams.name)
      .mockReturnValue(mergedThrottleTransform);
    jest.spyOn(mergedThrottleTransform, "removeListener").mockReturnValue();

    service.appendFxStream(fx);

    expect(service.throttleTransform.pause).toHaveBeenCalled();
    expect(service.currentReadable.unpipe).toHaveBeenCalledWith(
      service.throttleTransform
    );

    service.throttleTransform.emit("unpipe");

    expect(mergedThrottleTransform.removeListener).toHaveBeenCalled();
    expect(streamPromises.pipeline).toHaveBeenCalledTimes(2);
    expect(streamPromises.pipeline).toHaveBeenNthCalledWith(
      2,
      mergedThrottleTransform,
      service.throttleTransform
    );
  });
});
