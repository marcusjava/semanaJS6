export default class Controller {
  constructor({ view, service }) {
    this.view = view;
    this.service = service;
  }
  static intialize(deps) {
    const controller = new Controller(deps);
    controller.onLoad();
    return controller;
  }

  async commandReceived(text) {
    return this.service.makeRequest({
      command: text.toLowerCase(),
    });
  }

  onLoad() {
    this.view.configureOnBtnClick(this.commandReceived.bind(this));
    this.view.onLoad();
  }
}
