import "./style.css";
import { CATALOG } from "./catalog";
import { DEFAULT_LAYOUT } from "./defaultLayout";
import { emit } from "./emit";
import { createHistory } from "./layoutOps";
import { DEFAULT_OUTPUT_OPTIONS } from "./model";
import { renderFaces } from "./ui/faces";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const facesRoot = $("#faces");
const output = $<HTMLTextAreaElement>("#output");
const copyMsg = $("#copy-msg");

const actions = new Map(CATALOG.map((a) => [a.id, a]));
const history = createHistory(DEFAULT_LAYOUT);
const outputOptions = DEFAULT_OUTPUT_OPTIONS;

function render(): void {
  renderFaces(facesRoot, history.present, actions);
  output.value = emit(history.present, actions, outputOptions);
}

$("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    copyMsg.textContent = "コピーしました";
  } catch {
    // file:// 等で Clipboard API が使えない場合
    output.focus();
    output.select();
    copyMsg.textContent = "自動コピーできませんでした。全選択したので Ctrl+C でコピーしてください";
  }
});

render();
