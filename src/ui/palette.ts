// アクションパレットの描画
import { CATEGORY_LABEL, STATUS_LABEL } from "../model";
import type { Action, Category } from "../model";

export function renderPalette(root: HTMLElement, actions: Iterable<Action>, query: string): void {
  const q = query.trim().toLowerCase();
  const hit = (a: Action) => !q || [a.label, a.glyph, a.expr].some((s) => s.toLowerCase().includes(q));
  const groups = new Map<Category, Action[]>(Object.keys(CATEGORY_LABEL).map((c) => [c as Category, []]));
  for (const a of actions) if (hit(a)) groups.get(a.category)!.push(a);

  root.replaceChildren(
    ...[...groups].filter(([, list]) => list.length).map(([cat, list]) => {
      const group = document.createElement("div");
      group.className = "pal-group";
      const h = document.createElement("h3");
      h.textContent = CATEGORY_LABEL[cat];
      const items = document.createElement("div");
      items.className = "pal-items";
      for (const a of list) {
        const item = document.createElement("div");
        item.className = `pal-item cat-${a.category} st-${a.status}`;
        item.draggable = true;
        item.tabIndex = 0;
        item.dataset.id = a.id;
        const status = STATUS_LABEL[a.status];
        item.title = `${a.expr}${status ? `\n（${status}）` : ""}`;
        const glyph = document.createElement("span");
        glyph.className = "glyph";
        glyph.textContent = a.glyph;
        item.append(glyph, a.glyph === a.label ? "" : a.label);
        if (!a.builtin) {
          const del = document.createElement("button");
          del.type = "button";
          del.className = "pal-del";
          del.dataset.deleteId = a.id;
          del.title = "このカスタムアクションを削除";
          del.textContent = "×";
          item.append(del);
        }
        items.append(item);
      }
      group.append(h, items);
      return group;
    }),
  );
}
