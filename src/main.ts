import "./style.css";
import { addCustom, allActions, checkExpr, deleteCustom, editSlotAction, newCustomId, textAction } from "./customActions";
import type { ActionPatch } from "./customActions";
import { DEFAULT_LAYOUT } from "./defaultLayout";
import { emit } from "./emit";
import { assign, clear, commit, createHistory, isModified, redo, resetFace, resetSlot, swap, undo } from "./layoutOps";
import type { SlotRef } from "./layoutOps";
import { CATEGORY_LABEL, DEFAULT_OUTPUT_OPTIONS, FACES, STATUS_LABEL } from "./model";
import type { Action, Category, EditState, FaceId, Layout, OutputOptions, Status } from "./model";
import { loadLocal, parse, saveLocal, serialize } from "./storage";
import { renderFaces, slotOf } from "./ui/faces";
import { renderPalette } from "./ui/palette";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const input = (id: string) => $<HTMLInputElement>(`#${id}`);

const facesRoot = $("#faces");
const palette = $("#palette");
const paletteList = $("#palette-list");
const paletteSearch = input("palette-search");
const output = $<HTMLTextAreaElement>("#output");
const diffView = $("#diff");
const diffToggle = input("diff-toggle");
const copyMsg = $("#copy-msg");
const notice = $("#notice");
const storageWarn = $("#storage-warn");
const detailForm = $<HTMLFormElement>("#detail-form");

// 状態
const stored = loadLocal();
const loaded = stored === null ? null : parse(stored);
let history = createHistory<EditState>(loaded?.saved?.state ?? { layout: DEFAULT_LAYOUT, customActions: [] });
let options: OutputOptions = loaded?.saved?.options ?? { ...DEFAULT_OUTPUT_OPTIONS };
let selected: SlotRef | null = null; // クリック入れ替えの1つ目
let focused: SlotRef | null = null; // 詳細パネルの対象・再描画後のフォーカス先
// 保存データが読めなかった場合、利用者が何か操作するまで上書きしない（新しい形式のデータを古い版で消さないため）
let saveBlocked = loaded !== null && loaded.saved === null;

const state = () => history.present;
const sameSlot = (a: SlotRef, b: SlotRef) => a.face === b.face && a.key === b.key;

function showNotice(lines: string[]): void {
  notice.textContent = lines.join("\n");
  notice.hidden = lines.length === 0;
}

function update(next: EditState): void {
  history = commit(history, next);
  saveBlocked = false;
  render();
}

const updateLayout = (layout: Layout) => update(layout === state().layout ? state() : { ...state(), layout });

// 描画
function render(): void {
  const actions = allActions(state());
  const gridHadFocus = facesRoot.contains(document.activeElement);
  renderFaces(facesRoot, state().layout, actions, selected);
  renderPalette(paletteList, actions.values(), paletteSearch.value);
  renderDetail(actions);
  const text = emit(state().layout, actions, options);
  output.value = text;
  renderDiff(text, actions);
  for (const k of Object.keys(options) as (keyof OutputOptions)[]) input(`opt-${k}`).checked = options[k];
  if (!saveBlocked) storageWarn.hidden = saveLocal(serialize({ state: state(), options }));
  if (gridHadFocus && focused) {
    facesRoot.querySelector<HTMLElement>(`[data-face="${focused.face}"][data-key="${focused.key}"]`)?.focus({ preventScroll: true });
  }
}

/** 既定配置の出力にない行をハイライトする */
function renderDiff(text: string, actions: ReadonlyMap<string, Action>): void {
  // ponytail: 行単位の集合比較。空にしたスロット（消えた行）は表示しない。必要になったら LCS 差分にする
  const base = new Set(emit(DEFAULT_LAYOUT, actions, options).split("\n"));
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

function renderWarnings(list: HTMLElement, expr: string): void {
  list.replaceChildren(
    ...checkExpr(expr).map((w) => {
      const li = document.createElement("li");
      li.textContent = w;
      return li;
    }),
  );
}

function renderDetail(actions: ReadonlyMap<string, Action>): void {
  const slot = focused;
  const action = slot ? actions.get(state().layout[slot.face][slot.key] ?? "") : undefined;
  $("#d-title").textContent = slot ? `詳細：${FACES.find((f) => f.id === slot.face)!.name}の ${slot.key}` : "詳細";
  $("#d-empty").textContent = slot ? "空のスロットです。パレットから置いてください" : "キーをクリックすると詳細を表示します";
  $("#d-empty").hidden = !!action;
  detailForm.hidden = !action;
  $<HTMLButtonElement>("#d-reset").disabled = !slot || !isModified(state().layout, slot);
  $<HTMLButtonElement>("#d-clear").disabled = !action;
  if (!action) return;
  input("d-label").value = action.label;
  input("d-glyph").value = action.glyph;
  input("d-expr").value = action.expr;
  input("d-comment").value = action.comment ?? "";
  $<HTMLSelectElement>("#d-status").value = action.status;
  $("#d-kind").textContent = action.builtin ? "既定カタログ" : "カスタム";
  renderWarnings($("#d-warn"), action.expr);
}

// select の選択肢
const fillSelect = (sel: HTMLSelectElement, labels: Record<string, string>) =>
  sel.replaceChildren(...Object.entries(labels).map(([value, label]) => new Option(label, value)));
const STATUS_OPTIONS = { ...STATUS_LABEL, ok: "有効" };
fillSelect($("#c-category"), CATEGORY_LABEL);
fillSelect($("#c-status"), STATUS_OPTIONS);
fillSelect($("#d-status"), STATUS_OPTIONS);

// グリッド：クリック入れ替え・面の既定に戻す
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
    updateLayout(swap(state().layout, from, slot));
  }
}

facesRoot.addEventListener("click", (e) => {
  const resetBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-reset-face]");
  if (resetBtn) return updateLayout(resetFace(state().layout, resetBtn.dataset.resetFace as FaceId));
  const slot = slotOf(e.target);
  if (slot) activate(slot);
});

// D&D：スロット↔スロットは入れ替え、パレット→スロットは上書き、スロット→パレットは空にする
const SLOT_TYPE = "application/x-nagi-slot";
const ACTION_TYPE = "application/x-nagi-action";
const clearDropMarks = () => document.querySelectorAll(".drop-target").forEach((c) => c.classList.remove("drop-target"));
const startDrag = (e: DragEvent, type: string, value: string, effect: "move" | "copy") => {
  e.dataTransfer!.setData(type, value);
  e.dataTransfer!.setData("text/plain", value); // Firefox は何か設定しないとドラッグが始まらない
  e.dataTransfer!.effectAllowed = effect;
};

facesRoot.addEventListener("dragstart", (e) => {
  const slot = slotOf(e.target);
  if (slot && e.dataTransfer) startDrag(e, SLOT_TYPE, JSON.stringify(slot), "move");
});

paletteList.addEventListener("dragstart", (e) => {
  const item = (e.target as HTMLElement).closest<HTMLElement>(".pal-item");
  if (item && e.dataTransfer) startDrag(e, ACTION_TYPE, item.dataset.id!, "copy");
});

facesRoot.addEventListener("dragover", (e) => {
  const types = e.dataTransfer?.types ?? [];
  const fromPalette = types.includes(ACTION_TYPE);
  if (!slotOf(e.target) || !(fromPalette || types.includes(SLOT_TYPE))) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = fromPalette ? "copy" : "move";
  (e.target as HTMLElement).closest(".key")!.classList.add("drop-target");
});

facesRoot.addEventListener("dragleave", (e) => (e.target as HTMLElement).closest?.(".key")?.classList.remove("drop-target"));
document.addEventListener("dragend", clearDropMarks);

facesRoot.addEventListener("drop", (e) => {
  const to = slotOf(e.target);
  const actionId = e.dataTransfer?.getData(ACTION_TYPE);
  const rawSlot = e.dataTransfer?.getData(SLOT_TYPE);
  clearDropMarks();
  if (!to || !(actionId || rawSlot)) return;
  e.preventDefault();
  selected = null;
  focused = to;
  updateLayout(actionId ? assign(state().layout, to, actionId) : swap(state().layout, JSON.parse(rawSlot!) as SlotRef, to));
});

palette.addEventListener("dragover", (e) => {
  if (!e.dataTransfer?.types.includes(SLOT_TYPE)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  palette.classList.add("drop-target");
});

palette.addEventListener("dragleave", (e) => {
  if (!palette.contains(e.relatedTarget as Node | null)) palette.classList.remove("drop-target");
});

palette.addEventListener("drop", (e) => {
  const raw = e.dataTransfer?.getData(SLOT_TYPE);
  clearDropMarks();
  if (!raw) return;
  e.preventDefault();
  selected = null;
  updateLayout(clear(state().layout, JSON.parse(raw) as SlotRef));
});

// パレット：選択中スロットへの上書き・カスタムアクション削除・絞り込み
paletteList.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const del = target.closest<HTMLElement>("[data-delete-id]");
  if (del) {
    const a = allActions(state()).get(del.dataset.deleteId!)!;
    showNotice([`「${a.label}」を削除しました（Ctrl+Z で元に戻せます）`]);
    return update(deleteCustom(state(), a.id));
  }
  const item = target.closest<HTMLElement>(".pal-item");
  if (!item || !selected) return;
  focused = selected;
  const to = selected;
  selected = null;
  updateLayout(assign(state().layout, to, item.dataset.id!));
});

paletteSearch.addEventListener("input", render);

// カスタムアクション追加
$("#text-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input("t-text").value.trim();
  const action = textAction(text, newCustomId(allActions(state())));
  if (!action) return showNotice([text ? '" を含む文字列は追加できません' : "文字列を入力してください"]);
  showNotice([`「${text}」をパレットに追加しました`]);
  input("t-text").value = "";
  update(addCustom(state(), action));
});

const customForm = $<HTMLFormElement>("#custom-form");
input("c-expr").addEventListener("input", () => renderWarnings($("#c-warn"), input("c-expr").value));
customForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const label = input("c-label").value.trim();
  const expr = input("c-expr").value.trim();
  const comment = input("c-comment").value.trim();
  const action: Action = {
    id: newCustomId(allActions(state())),
    label,
    glyph: input("c-glyph").value.trim() || [...label].slice(0, 2).join(""),
    category: $<HTMLSelectElement>("#c-category").value as Category,
    expr,
    ...(comment ? { comment } : {}),
    status: $<HTMLSelectElement>("#c-status").value as Status,
    builtin: false,
  };
  showNotice([`「${label}」をパレットに追加しました`]);
  customForm.reset();
  $("#c-warn").replaceChildren();
  update(addCustom(state(), action));
});

// 詳細パネル
detailForm.addEventListener("submit", (e) => e.preventDefault());
detailForm.addEventListener("change", (e) => {
  if (!focused) return;
  const t = e.target as HTMLInputElement | HTMLSelectElement;
  const field = t.id.slice(2) as keyof ActionPatch; // "d-label" → "label"
  const patch: ActionPatch = field === "comment" ? { comment: t.value.trim() || undefined } : { [field]: t.value };
  update(editSlotAction(state(), focused, patch));
});
input("d-expr").addEventListener("input", () => renderWarnings($("#d-warn"), input("d-expr").value));
$("#d-reset").addEventListener("click", () => focused && updateLayout(resetSlot(state().layout, focused)));
$("#d-clear").addEventListener("click", () => focused && updateLayout(clear(state().layout, focused)));

// ヘッダー
$("#reset-all").addEventListener("click", () => {
  showNotice(["配置をすべて既定に戻しました（Ctrl+Z で元に戻せます）"]);
  updateLayout(DEFAULT_LAYOUT);
});

$("#export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([serialize({ state: state(), options })], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "nagi-edit-layout.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

const importFile = input("import-file");
$("#import").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = ""; // 同じファイルを再度選べるように
  if (!file) return;
  const { saved, errors } = parse(await file.text());
  if (!saved) return showNotice(["読み込めませんでした：", ...errors]);
  showNotice(errors.length ? ["読み込みました。ただし次の問題がありました：", ...errors] : ["読み込みました（Ctrl+Z で読込前に戻せます）"]);
  options = saved.options;
  selected = focused = null;
  update(saved.state);
});

// 表示テーマ（docs/spec.md 11章）。初期適用は index.html の <head> で済んでいる
const THEME_KEY = "nagi-edit:v1:theme";
const themeButtons = document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]");
function applyTheme(choice: string): void {
  if (choice === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === choice)));
}
applyTheme(document.documentElement.dataset.theme ?? "system");
themeButtons.forEach((b) =>
  b.addEventListener("click", () => {
    const choice = b.dataset.themeChoice!;
    applyTheme(choice);
    try {
      if (choice === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, choice);
    } catch {
      // 保存できない環境ではその場限りの切り替え
    }
  }),
);

// 出力
for (const k of Object.keys(options) as (keyof OutputOptions)[]) {
  input(`opt-${k}`).addEventListener("change", (e) => {
    options = { ...options, [k]: (e.target as HTMLInputElement).checked };
    render();
  });
}
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

// キーボード
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
  } else if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).classList.contains("pal-item")) {
    e.preventDefault();
    (e.target as HTMLElement).click();
  } else if ((e.key === "Delete" || e.key === "Backspace") && (selected ?? slot)) {
    e.preventDefault();
    const target = (selected ?? slot)!;
    selected = null;
    updateLayout(clear(state().layout, target));
  } else if (e.key === "Escape" && selected) {
    selected = null;
    render();
  }
});

// 起動
if (loaded && !loaded.saved) showNotice(["保存データを読み込めなかったため既定配置で開きました。操作するまで保存データは上書きしません：", ...loaded.errors]);
else if (loaded?.errors.length) showNotice(["保存データの読込で次の問題がありました：", ...loaded.errors]);
render();
