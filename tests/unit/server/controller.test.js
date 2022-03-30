import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import { Controller } from "../../../server/controller.js";
import { Service } from "../../../server/service.js";
import { handler } from "../../../server/routes.js";
import TestUtil from "../_util/testUtil.js";

const {
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
});
