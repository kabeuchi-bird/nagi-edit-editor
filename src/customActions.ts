// カスタムアクションと編集状態の操作（docs/spec.md 6〜7章）
import { CATALOG } from "./catalog";
import { KEYS } from "./keys";
import { assign, clearAction, countUses } from "./layoutOps";
import type { SlotRef } from "./layoutOps";
import type { Action, EditState } from "./model";

export type ActionPatch = Partial<Omit<Action, "id" | "builtin">>;

export const allActions = (state: EditState): Map<string, Action> =>
  new Map([...CATALOG, ...state.customActions].map((a) => [a.id, a]));

export function newCustomId(existing: ReadonlyMap<string, unknown>): string {
  let id: string;
  do id = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  while (existing.has(id));
  return id;
}

/** 「テキスト挿入」。`"` を含む文字列は作らない（エスケープ可否が未確認のため） */
export function textAction(text: string, id: string): Action | null {
  if (!text || text.includes('"')) return null;
  return { id, label: text, glyph: [...text][0], category: "text", expr: `^ "${text}"`, status: "unsupported", builtin: false };
}

/** expr の簡易検証。警告文の配列を返す */
export function checkExpr(expr: string): string[] {
  const warnings: string[] = [];
  if ((expr.match(/"/g) ?? []).length % 2) warnings.push("文字列リテラル（\"）が閉じていません");
  const outside = expr.replace(/"[^"]*"/g, " ");
  const open: string[] = [];
  const pair: Record<string, string> = { ")": "(", "}": "{", "]": "[" };
  let balanced = true;
  for (const ch of outside) {
    if ("({[".includes(ch)) open.push(ch);
    else if (ch in pair && open.pop() !== pair[ch]) balanced = false;
  }
  if (!balanced || open.length) warnings.push("括弧 () {} [] の対応が取れていません");
  if (outside.includes("#")) warnings.push("# 以降はコメントとして扱われます");
  const unknown = [...new Set(outside.match(/\b[A-Z]\w*/g) ?? [])].filter((w) => !KEYS.has(w));
  if (unknown.length) warnings.push(`不明なキー名：${unknown.join(", ")}`);
  return warnings;
}

export const addCustom = (state: EditState, action: Action): EditState => ({
  ...state,
  customActions: [...state.customActions, action],
});

/** カスタムアクションを削除し、置いていたスロットを空にする */
export const deleteCustom = (state: EditState, id: string): EditState => ({
  layout: clearAction(state.layout, id),
  customActions: state.customActions.filter((a) => a.id !== id),
});

/**
 * スロットのアクションを編集する。
 * このスロットでしか使っていないカスタムアクションはその場で書き換え、それ以外は複製してスロットに置く
 */
export function editSlotAction(state: EditState, slot: SlotRef, patch: ActionPatch): EditState {
  const actions = allActions(state);
  const current = actions.get(state.layout[slot.face][slot.key] ?? "");
  if (!current) return state;
  const edited = { ...current, ...patch };
  if (!current.builtin && countUses(state.layout, current.id) === 1) {
    return { ...state, customActions: state.customActions.map((a) => (a.id === current.id ? edited : a)) };
  }
  const clone: Action = { ...edited, id: newCustomId(actions), builtin: false };
  return { layout: assign(state.layout, slot, clone.id), customActions: [...state.customActions, clone] };
}
