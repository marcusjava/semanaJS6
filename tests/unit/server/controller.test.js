import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import { Controller } from "../../../server/controller.js";
import { Service } from "../../../server/service.js";
import { handler } from "../../../server/routes.js";
import TestUtil from "../_util/testUtil.js";

const {
  dir: { publicDirectory, fxDirectory },
  pages,
  location,
  constants: { CONTENT_TYPE },
} = config;

describe("Controller test suite", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("should return a file stream", async () => {
    const expectedType = ".html";
    const contentType = CONTENT_TYPE[expectedType];
    const controller = new Controller();

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    const serviceMock = jest
      .spyOn(Service.prototype, Service.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
        type: contentType,
      });

    const result = await controller.getFileStream(pages.homeHTML);

    expect(serviceMock).toHaveBeenCalledWith(pages.homeHTML);
    expect(result).toEqual({
      stream: mockFileStream,
      type: contentType,
    });
  });

  test("should send command to start stream", async () => {
    const controller = new Controller();

    const startStreamMock = jest
      .spyOn(Service.prototype, Service.prototype.startStream.name)
      .mockResolvedValue({});
    const result = await controller.handleCommand({ command: "start stream" });
    expect(startStreamMock).toHaveBeenCalled();
    expect(result).toEqual({ result: "ok" });
  });
  test("should send command to stop stream", async () => {
    const controller = new Controller();

    const stopStreamMock = jest
      .spyOn(Service.prototype, Service.prototype.stopStream.name)
      .mockReturnValue({});
    const result = await controller.handleCommand({ command: "stop stream" });
    expect(stopStreamMock).toHaveBeenCalled();
    expect(result).toEqual({ result: "ok" });
  });

  test("should append effect effect to a current stream", async () => {
    const songName = "Applause Sound Effect HD No Copyright (128 kbps).mp3";
    const controller = new Controller();
    const songPath = `${fxDirectory}/${songName}`;

    const readFxMock = jest
      .spyOn(Service.prototype, Service.prototype.readFxByName.name)
      .mockResolvedValue(songPath);

    const appendFxStreamMock = jest
      .spyOn(Service.prototype, Service.prototype.appendFxStream.name)
      .mockReturnValue();

    const result = await controller.handleCommand({ command: "applause" });
    expect(readFxMock).toHaveBeenCalled();
    expect(appendFxStreamMock).toHaveBeenCalledWith(songPath);
    expect(result).toEqual({ result: "ok" });
  });
  test("should create a client stream", async () => {
    const controller = new Controller();
    const mockStream = TestUtil.generateReadableStream(["stream"]);

    const uuid = "uuid";

    const clienStreamMock = jest
      .spyOn(Service.prototype, Service.prototype.createClientStream.name)
      .mockReturnValue({
        clientStream: mockStream,
        id: uuid,
      });

    const { clientStream } = controller.createClientStream();
    expect(clienStreamMock).toHaveBeenCalled();
    //expect(clientStream).toStrictEqual(mockStream);
  });
  it("should remove a clientStream", async () => {
    const controller = new Controller();
    const mockStream = TestUtil.generateReadableStream(["test"]);
    const mockId = "uuid";
    jest
      .spyOn(Service.prototype, Service.prototype.createClientStream.name)
      .mockReturnValue({
        id: mockId,
        clientStream: mockStream,
      });
    jest
      .spyOn(Service.prototype, Service.prototype.removeClientStream.name)
      .mockReturnValue();

    const { onClose } = controller.createClientStream();
    onClose();

    expect(Service.prototype.removeClientStream).toHaveBeenCalledWith(mockId);
  });
});
