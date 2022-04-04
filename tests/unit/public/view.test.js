import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { JSDOM } from "jsdom";
import View from "../../../public/controller/js/view.js";

describe("View test suite", () => {
  const dom = new JSDOM();
  global.document = dom.window.document;
  global.window = dom.window;

  function makeBtnElement(
    { text, classList } = {
      text: "",
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
    }
  ) {
    return {
      onclick: jest.fn,
      classList,
      innerText: text,
    };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.spyOn(document, "getElementById").mockReturnValue(makeBtnElement());
  });

  test("#onLoad - should add unassigned class and reset onClick", () => {
    const view = new View();
    jest.spyOn(view, view.changeButtonVisibility.name).mockReturnValue();
    view.onLoad();
    expect(view.changeButtonVisibility).toHaveBeenCalled();
  });

  test("#changeButtonVisibility - given hide=true it should add unassigned class and reset onClick", () => {
    const view = new View();
    const btn = makeBtnElement();
    jest.spyOn(document, "querySelectorAll").mockReturnValue([btn]);
    view.changeButtonVisibility();
    expect(btn.classList.add).toHaveBeenCalledWith("unassigned");
    expect(btn.onclick.name).toStrictEqual("onClickReset");
    expect(() => btn.onclick()).not.toThrow();
  });
  test("#changeButtonVisibility - given hide=false it should remove unassigned class and reset onClick", () => {
    const view = new View();
    const btn = makeBtnElement();
    jest.spyOn(document, "querySelectorAll").mockReturnValue([btn]);
    view.changeButtonVisibility(false);
    expect(btn.classList.add).not.toHaveBeenCalled();
    expect(btn.classList.remove).toHaveBeenCalledWith("unassigned");
    expect(btn.onclick.name).toStrictEqual("onClickReset");
    expect(() => btn.onclick()).not.toThrow();
  });
  test.only("#configureOnBtnClick - set fn to onBtnClick", async () => {
    const result = {
      result: "ok",
    };
    const view = new View();
    view.onBtnClick = jest.fn();
    const fnCall = jest.fn();

    view.configureOnBtnClick(fnCall);
    expect(view.onBtnClick).toHaveBeenCalled();
  });
});
