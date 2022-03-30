export default class View {
  constructor() {
    this.btnStart = document.getElementById("start");
    this.btnStop = document.getElementById("stop");
    this.buttons = () => Array.from(document.querySelectorAll("button"));
    this.ignoreButtons = new Set(["unassigned"]);
    async function onBtnClick() {}
    this.onBtnClick = async () => {};
  }
  onLoad() {
    this.changeButtonVisibility();
    this.btnStart.onclick = this.onStartClick.bind(this);
  }

  changeButtonVisibility(hide = true) {
    Array.from(document.querySelectorAll("[name=command]")).forEach((btn) => {
      const key = hide ? "add" : "remove";
      btn.classList[key]("unassigned");
      //ATTENTION
      function onClickReset() {}
      btn.onclick = onClickReset;
    });
  }

  configureOnBtnClick(fn) {
    this.onBtnClick = fn;
  }

  async onStartClick({ srcElement: { innerText } }) {
    const btnText = innerText;
    await this.onBtnClick(btnText);
    this.toggleBtnStart();
    this.changeButtonVisibility(false);
    this.buttons()
      .filter((btn) => this.notUnassignedButtons(btn))
      .forEach(this.setupBtnAction.bind(this));
  }

  setupBtnAction(btn) {
    const text = btn.innerText.toLowerCase();
    if (text.includes("start")) return;
    if (text.includes("stop")) {
      btn.onclick = this.onStopBtn.bind(this);
      return;
    }
    btn.onclick = this.onCommandClick.bind(this);
  }

  async onCommandClick(btn) {
    const {
      srcElement: { classList, innerText },
    } = btn;
    this.toggleDisableCommandBtn(classList);
    await this.onBtnClick(innerText);
    setTimeout(() => this.toggleDisableCommandBtn(classList), 600);
  }

  toggleDisableCommandBtn(classList) {
    if (!classList.contains("active")) {
      classList.add("active");
      return;
    }
    classList.remove("active");
  }

  onStopBtn({ srcElement: { innerText } }) {
    this.toggleBtnStart(false);
    this.changeButtonVisibility(true);

    return this.onBtnClick(innerText);
  }

  notUnassignedButtons(btn) {
    const classes = Array.from(btn.classList);
    //converte para boleano e em seguida nega
    return !!!classes.find((item) => this.ignoreButtons.has(item));
  }

  toggleBtnStart(active = true) {
    if (active) {
      this.btnStart.classList.add("hidden");
      this.btnStop.classList.remove("hidden");
      return;
    }
    this.btnStart.classList.remove("hidden");
    this.btnStop.classList.add("hidden");
  }
}
