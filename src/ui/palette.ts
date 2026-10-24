// アクションパレットの描画
import { CATEGORY_LABEL, STATUS_LABEL } from "../model";
import type { Action, Category } from "../model";
import { el } from "./faces";

export function renderPalette(root: HTMLElement, actions: Iterable<Action>, query: string): void {
  const q = query.trim().toLowerCase();
  const hit = (a: Action) => !q || [a.label, a.glyph, a.expr].some((s) => s.toLowerCase().includes(q));
  const groups = new Map<Category, Action[]>(Object.keys(CATEGORY_LABEL).map((c) => [c as Category, []]));
  for (const a of actions) if (hit(a)) groups.get(a.category)!.push(a);

  root.replaceChildren(
    ...[...groups].filter(([, list]) => list.length).map(([cat, list]) => {
      const items = el("div", "pal-items");
      for (const a of list) {
        const item = el("div", `pal-item cat-${a.category} st-${a.status}`);
        item.draggable = true;
        item.tabIndex = 0;
        item.dataset.id = a.id;
        const status = STATUS_LABEL[a.status];
        item.title = `${a.expr}${status ? `\n（${status}）` : ""}`;
        item.append(el("span", "glyph", a.glyph), a.glyph === a.label ? "" : a.label);
        if (!a.builtin) {
          const del = el("button", "pal-del", "×");
          del.type = "button";
          del.dataset.deleteId = a.id;
          del.title = "このカスタムアクションを削除";
          item.append(del);
        }
        items.append(item);
      }
      const group = el("div", "pal-group");
      group.append(el("h3", "", CATEGORY_LABEL[cat]), items);
      return group;
    }),
  );
}
