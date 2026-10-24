// レイアウト操作（純粋関数）。変更がなければ同じオブジェクトを返す
import { DEFAULT_LAYOUT } from "./defaultLayout";
import type { FaceId, Layout } from "./model";
import { isReserved } from "./reserved";

export interface SlotRef {
  face: FaceId;
  key: string;
}

const get = (layout: Layout, s: SlotRef): string | undefined => layout[s.face][s.key];

function set(layout: Layout, s: SlotRef, id: string | undefined): Layout {
  const face = { ...layout[s.face] };
  if (id === undefined) delete face[s.key];
  else face[s.key] = id;
  return { ...layout, [s.face]: face };
}

const reserved = (s: SlotRef) => isReserved(s.face, s.key);

/** 2スロットの中身を入れ替える（面をまたいでも可。片方が空なら移動になる） */
export function swap(layout: Layout, a: SlotRef, b: SlotRef): Layout {
  const x = get(layout, a);
  const y = get(layout, b);
  if (reserved(a) || reserved(b) || x === y) return layout;
  return set(set(layout, a, y), b, x);
}

/** スロットにアクションを置く（上書き） */
export const assign = (layout: Layout, s: SlotRef, actionId: string): Layout =>
  reserved(s) || get(layout, s) === actionId ? layout : set(layout, s, actionId);

/** 既定配置と中身が異なるか */
export const isModified = (layout: Layout, s: SlotRef): boolean => get(layout, s) !== get(DEFAULT_LAYOUT, s);

/** スロットを空にする */
export const clear = (layout: Layout, s: SlotRef): Layout =>
  get(layout, s) === undefined ? layout : set(layout, s, undefined);

/** スロットを既定に戻す */
export const resetSlot = (layout: Layout, s: SlotRef): Layout => {
  const id = get(DEFAULT_LAYOUT, s);
  return id === undefined ? clear(layout, s) : assign(layout, s, id);
};

/** 面を既定に戻す */
export function resetFace(layout: Layout, face: FaceId): Layout {
  const cur = layout[face];
  const def = DEFAULT_LAYOUT[face];
  const same = Object.keys(cur).length === Object.keys(def).length && Object.entries(def).every(([k, v]) => cur[k] === v);
  return same ? layout : { ...layout, [face]: { ...def } };
}

/** 指定アクションを置いているスロットをすべて空にする */
export function clearAction(layout: Layout, actionId: string): Layout {
  let out = layout;
  for (const face of Object.keys(layout) as FaceId[]) {
    for (const [key, id] of Object.entries(layout[face])) if (id === actionId) out = clear(out, { face, key });
  }
  return out;
}

/** アクションを置いているスロット数 */
export const countUses = (layout: Layout, actionId: string): number =>
  Object.values(layout).reduce((n, slots) => n + Object.values(slots).filter((id) => id === actionId).length, 0);

// Undo/Redo
// ponytail: 履歴は無制限。レイアウトは小さいので問題になったら上限を付ける
interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

/** 新しい状態を記録する。同じ状態なら履歴を積まない */
export const commit = <T>(h: History<T>, next: T): History<T> =>
  next === h.present ? h : { past: [...h.past, h.present], present: next, future: [] };

export const undo = <T>(h: History<T>): History<T> =>
  h.past.length === 0 ? h : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };

export const redo = <T>(h: History<T>): History<T> =>
  h.future.length === 0 ? h : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
