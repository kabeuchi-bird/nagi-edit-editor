import "./style.css";
import { CATALOG } from "./catalog";
import { DEFAULT_LAYOUT } from "./defaultLayout";
import { emit } from "./emit";
import { clear, commit, createHistory, redo, swap, undo } from "./layoutOps";
import type { SlotRef } from "./layoutOps";
import { DEFAULT_OUTPUT_OPTIONS } from "./model";
import type { Layout } from "./model";
import { renderFaces, slotOf } from "./ui/faces";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const facesRoot = $("#faces");
const output = $<HTMLTextAreaElement>("#output");
const diffView = $("#diff");
const diffToggle = $<HTMLInputElement>("#diff-toggle");
const copyMsg = $("#copy-msg");

const actions = new Map(CATALOG.map((a) => [a.id, a]));
const outputOptions = DEFAULT_OUTPUT_OPTIONS;
let history = createHistory(DEFAULT_LAYOUT);
let selected: SlotRef | null = null; // クリック入れ替えの1つ目
let focused: SlotRef | null = null; // 再描画後にフォーカスを戻す先

const sameSlot = (a: SlotRef, b: SlotRef) => a.face === b.face && a.key === b.key;

function render(): void {
  // グリッド内にフォーカスがあった場合だけ、作り直したキーにフォーカスを戻す
  const gridHadFocus = facesRoot.contains(document.activeElement);
  renderFaces(facesRoot, history.present, actions, selected);
  const text = emit(history.present, actions, outputOptions);
  output.value = text;
  renderDiff(text);
  if (gridHadFocus && focused) {
    facesRoot.querySelector<HTMLElement>(`[data-face="${focused.face}"][data-key="${focused.key}"]`)?.focus({ preventScroll: true });
  }
}

/** 既定配置の出力にない行をハイライトする */
function renderDiff(text: string): void {
  // ponytail: 行単位の集合比較。空にしたスロット（消えた行）は表示しない。必要になったら LCS 差分にする
  const base = new Set(emit(DEFAULT_LAYOUT, actions, outputOptions).split("\n"));
  diffView.replaceChildren(
    ...text.split("\n").map((line) => {
      const span = document.createElement("span");
      if (!base.has(line)) span.className = "changed";
      span.textContent = line + "\n";
      return span;
    }),
  );
  diffView.hidden = !diffToggle.checked;
  output.hidden = diffToggle.checked;
}

function apply(next: Layout): void {
  history = commit(history, next);
  render();
}

/** クリック（または Enter/Space）：1回目で選択、2回目で入れ替え */
function activate(slot: SlotRef): void {
  focused = slot;
  if (!selected) {
    selected = slot;
    render();
  } else if (sameSlot(selected, slot)) {
    selected = null;
    render();
  } else {
    const from = selected;
    selected = null;
    apply(swap(history.present, from, slot));
  }
}

facesRoot.addEventListener("click", (e) => {
  const slot = slotOf(e.target);
  if (slot) activate(slot);
});

// D&D：スロット間で入れ替え。予約スロットは slotOf が null を返すのでドロップ不可
const DND_TYPE = "application/x-nagi-slot";
const clearDropMarks = () => facesRoot.querySelectorAll(".drop-target").forEach((c) => c.classList.remove("drop-target"));

facesRoot.addEventListener("dragstart", (e) => {
  const slot = slotOf(e.target);
  if (!slot || !e.dataTransfer) return;
  e.dataTransfer.setData(DND_TYPE, JSON.stringify(slot));
  e.dataTransfer.setData("text/plain", `${slot.face}:${slot.key}`); // Firefox は何か設定しないとドラッグが始まらない
  e.dataTransfer.effectAllowed = "move";
});

facesRoot.addEventListener("dragover", (e) => {
  if (!slotOf(e.target) || !e.dataTransfer?.types.includes(DND_TYPE)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  (e.target as HTMLElement).closest(".key")!.classList.add("drop-target");
});

facesRoot.addEventListener("dragleave", (e) => (e.target as HTMLElement).closest?.(".key")?.classList.remove("drop-target"));
facesRoot.addEventListener("dragend", clearDropMarks);

facesRoot.addEventListener("drop", (e) => {
  const to = slotOf(e.target);
  const raw = e.dataTransfer?.getData(DND_TYPE);
  clearDropMarks();
  if (!to || !raw) return;
  e.preventDefault();
  selected = null;
  focused = to;
  apply(swap(history.present, JSON.parse(raw) as SlotRef, to));
});

document.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).closest("textarea:not([readonly]), input:not([type=checkbox]), select")) return;
  const slot = slotOf(e.target);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    history = e.shiftKey ? redo(history) : undo(history);
    render();
  } else if ((e.key === "Enter" || e.key === " ") && slot) {
    e.preventDefault();
    activate(slot);
  } else if ((e.key === "Delete" || e.key === "Backspace") && (selected ?? slot)) {
    e.preventDefault();
    const target = (selected ?? slot)!;
    selected = null;
    apply(clear(history.present, target));
  } else if (e.key === "Escape" && selected) {
    selected = null;
    render();
  }
});

diffToggle.addEventListener("change", render);

$("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    copyMsg.textContent = "コピーしました";
  } catch {
    // file:// 等で Clipboard API が使えない場合
    diffToggle.checked = false;
    render();
    output.focus();
    output.select();
    copyMsg.textContent = "自動コピーできませんでした。全選択したので Ctrl+C でコピーしてください";
  }
});

render();
