import { applyCommand, startRun } from "./run";
import { mount } from "./ui";
import "./style.css";

const root = document.querySelector("#app");
if (!(root instanceof HTMLElement)) {
  throw new Error("#app missing");
}

let run = startRun(Date.now());
const render = mount(root, (command) => {
  run = applyCommand(run, command);
  render(run);
});
render(run);
