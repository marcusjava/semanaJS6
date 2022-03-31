import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import childProcess from "child_process";
import streamsPromises from "stream/promises";
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
  dir: { publicDirectory, rootDir, fx: fxDir },
} = config;

describe("Service test suite", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test.todo("should create a stream when call #createClientStream");
  test.todo("should remove a stream when call #removeClientStream");

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
});
