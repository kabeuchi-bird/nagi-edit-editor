// 面グリッドの描画
import { FACES, HAND_ROWS, STATUS_LABEL } from "../model";
import type { Action, Face, FaceId, Layout } from "../model";
import { isModified } from "../layoutOps";
import type { SlotRef } from "../layoutOps";
import { RESERVED } from "../reserved";

/** 画面上の並び：左列・右列それぞれ上から */
const DISPLAY_ORDER: FaceId[][] = [
  ["l1", "l2", "p_l"],
  ["r1", "r2", "p_r"],
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = "") => {
  const e = document.createElement(tag);
  e.className = className;
  e.textContent = text;
  return e;
};

function keyCell(face: Face, key: string, layout: Layout, action: Action | undefined, selected: SlotRef | null): HTMLElement {
  // Firefox では <button> の D&D が不安定なため div を使う
  const cell = el("div", "key");
  cell.setAttribute("role", "button");
  cell.tabIndex = 0;
  cell.dataset.face = face.id;
  cell.dataset.key = key;
  if (selected?.face === face.id && selected.key === key) cell.classList.add("selected");
  if (isModified(layout, { face: face.id, key })) cell.classList.add("modified");
  const reason = RESERVED[face.id]?.[key];
  let glyph = "";
  if (reason) {
    cell.classList.add("reserved");
    cell.setAttribute("aria-disabled", "true");
    cell.tabIndex = -1;
    cell.title = `予約：${reason}`;
    glyph = "予約";
  } else if (action) {
    cell.draggable = true;
    cell.classList.add(`cat-${action.category}`, `st-${action.status}`);
    const status = STATUS_LABEL[action.status];
    cell.title = `${action.label}\n${action.expr}${status ? `\n（${status}）` : ""}`;
    glyph = action.glyph;
  } else {
    cell.classList.add("empty");
  }
  cell.append(el("span", "glyph", glyph), el("span", "keyname", key));
  return cell;
}

export function renderFaces(
  root: HTMLElement,
  layout: Layout,
  actions: ReadonlyMap<string, Action>,
  selected: SlotRef | null,
): void {
  root.replaceChildren(
    ...DISPLAY_ORDER.map((ids) => {
      const col = el("div", "hand");
      for (const id of ids) {
        const face = FACES.find((f) => f.id === id)!;
        const section = el("section", "face");
        const grid = el("div", "grid");
        for (const row of HAND_ROWS[face.hand]) {
          for (const key of row) grid.append(keyCell(face, key, layout, actions.get(layout[id][key] ?? ""), selected));
        }
        const heading = el("div", "face-head");
        const reset = el("button", "small", "既定に戻す");
        reset.type = "button";
        reset.dataset.resetFace = id;
        heading.append(el("h2", "", `${face.name}（${face.trigger.join(" ")}）`), reset);
        section.append(heading, grid);
        col.append(section);
      }
      return col;
    }),
  );
}

/** イベント対象から操作可能なスロットを取り出す（予約スロットは null） */
export function slotOf(target: EventTarget | null): SlotRef | null {
  const cell = (target as HTMLElement | null)?.closest<HTMLElement>(".key");
  if (!cell || cell.getAttribute("aria-disabled") === "true") return null;
  return { face: cell.dataset.face as FaceId, key: cell.dataset.key! };
}
