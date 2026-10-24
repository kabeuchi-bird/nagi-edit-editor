// 面グリッドの描画
import { FACES, HAND_ROWS, STATUS_LABEL } from "../model";
import type { Action, Face, FaceId, Layout } from "../model";
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

function keyCell(face: Face, key: string, action: Action | undefined): HTMLElement {
  const cell = el("button", "key");
  cell.type = "button";
  cell.dataset.face = face.id;
  cell.dataset.key = key;
  const reason = RESERVED[face.id]?.[key];
  let glyph = "";
  if (reason) {
    cell.classList.add("reserved");
    cell.disabled = true;
    cell.title = `予約：${reason}`;
    glyph = "予約";
  } else if (action) {
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

function faceBlock(face: Face, layout: Layout, actions: ReadonlyMap<string, Action>): HTMLElement {
  const section = el("section", "face");
  section.append(el("h2", "", `${face.name}（${face.trigger.join(" ")}）`));
  const grid = el("div", "grid");
  for (const row of HAND_ROWS[face.hand]) {
    for (const key of row) grid.append(keyCell(face, key, actions.get(layout[face.id][key] ?? "")));
  }
  section.append(grid);
  return section;
}

export function renderFaces(root: HTMLElement, layout: Layout, actions: ReadonlyMap<string, Action>): void {
  root.replaceChildren(
    ...DISPLAY_ORDER.map((ids) => {
      const col = el("div", "hand");
      for (const id of ids) col.append(faceBlock(FACES.find((f) => f.id === id)!, layout, actions));
      return col;
    }),
  );
}
