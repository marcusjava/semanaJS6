import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import { Controller } from "../../../server/controller.js";
import { handler } from "../../../server/routes.js";
import TestUtil from "../_util/testUtil.js";

const {
  pages,
  location,
  constants: { CONTENT_TYPE },
} = config;

describe("Routes test suite for API response", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  test("GET / - should redirect to home page", async () => {
    const params = TestUtil.defaultHandlerParams();
    params.request.method = "GET";
    params.request.url = "/";
    await handler(...params.values());
    expect(params.response.writeHead).toBeCalledWith(302, {
      Location: location.home,
    });
    expect(params.response.end).toHaveBeenCalled();
  });
  test("GET /home - should response home/index.html file stream", async () => {
    const params = TestUtil.defaultHandlerParams();
    params.request.method = "GET";
    params.request.url = "/home";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();
    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith(pages.homeHTML);
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });
  test("GET /controller - should response controller/index.html file stream", async () => {
    const params = TestUtil.defaultHandlerParams();
    params.request.method = "GET";
    params.request.url = "/controller";

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();
    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith(
      pages.controllerHTML
    );
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });
  test("GET /index.html - should response with file stream", async () => {
    const params = TestUtil.defaultHandlerParams();
    params.request.method = "GET";
    params.request.url = "/index.html";

    const expectedType = ".html";
    const contentType = CONTENT_TYPE[expectedType];

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
        type: expectedType,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();
    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith(
      params.request.url
    );
    expect(params.response.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": contentType,
    });
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });
  test("GET /file.ext - should response with file stream", async () => {
    const params = TestUtil.defaultHandlerParams();
    params.request.method = "GET";
    params.request.url = "/index.ext";

    const expectedType = ".ext";
    const contentType = CONTENT_TYPE[expectedType];

    const mockFileStream = TestUtil.generateReadableStream(["data"]);

    jest
      .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
      .mockResolvedValue({
        stream: mockFileStream,
        type: expectedType,
      });

    jest.spyOn(mockFileStream, "pipe").mockReturnValue();
    await handler(...params.values());
    expect(Controller.prototype.getFileStream).toBeCalledWith(
      params.request.url
    );
    expect(params.response.writeHead).not.toHaveBeenCalled();
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
  });
  test("POST /unknown - given an inexistent route should response with 404 response", async () => {
    const params = TestUtil.defaultHandlerParams();
    params.request.method = "POST";
    params.request.url = "/unknown";
    await handler(...params.values());
    expect(params.response.writeHead).toBeCalledWith(404);
    expect(params.response.end).toHaveBeenCalled();
  });

  describe("Response exceptions errors", () => {
    test("given inexistent file should return with 404", async () => {
      const params = TestUtil.defaultHandlerParams();
      params.request.method = "GET";
      params.request.url = "/index.png";

      jest
        .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
        .mockRejectedValue(
          new Error("Error:ENOENT: no such file or directory")
        );
      await handler(...params.values());
      expect(params.response.writeHead).toBeCalledWith(404);
      expect(params.response.end).toHaveBeenCalled();
    });
    test("given an error return 500", async () => {
      const params = TestUtil.defaultHandlerParams();
      params.request.method = "GET";
      params.request.url = "/index.png";

      jest
        .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
        .mockRejectedValue(new Error("Error: API error!"));
      await handler(...params.values());
      expect(params.response.writeHead).toBeCalledWith(500);
      expect(params.response.end).toHaveBeenCalled();
    });
  });
});
