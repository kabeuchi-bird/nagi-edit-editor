// 保存・読込（docs/spec.md 10章）
import { CATALOG } from "./catalog";
import { CATEGORY_LABEL, DEFAULT_OUTPUT_OPTIONS, FACES, HAND_KEYS, STATUS_LABEL } from "./model";
import type { Action, EditState, Layout, OutputOptions } from "./model";
import { isReserved } from "./reserved";

export const STORAGE_KEY = "nagi-edit:v1:layout";
const FORMAT_VERSION = 1;

export interface Saved {
  state: EditState;
  options: OutputOptions;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function serialize({ state, options }: Saved): string {
  return JSON.stringify(
    {
      formatVersion: FORMAT_VERSION,
      faces: state.layout,
      customActions: state.customActions.map(({ builtin: _builtin, ...rest }) => rest),
      outputOptions: options,
    },
    null,
    2,
  );
}

/** 旧形式を現行形式に変換する。現状 v1 のみ */
function migrate(raw: Obj): Obj {
  if (raw.formatVersion === FORMAT_VERSION) return raw;
  throw new Error(`未対応の formatVersion です：${String(raw.formatVersion)}`);
}

function toCustomAction(v: unknown): Action | null {
  if (!isObj(v)) return null;
  const { id, label, glyph, category, expr, comment, status } = v;
  const ok =
    typeof id === "string" && id.startsWith("custom:") &&
    typeof label === "string" && typeof glyph === "string" && typeof expr === "string" &&
    typeof category === "string" && category in CATEGORY_LABEL &&
    typeof status === "string" && status in STATUS_LABEL &&
    (comment === undefined || typeof comment === "string");
  if (!ok) return null;
  return { id, label, glyph, expr, category, status, ...(comment === undefined ? {} : { comment }), builtin: false } as Action;
}

/** JSON を読み込む。読めない部分はエラーに積んで捨てる。全体が読めなければ saved は null */
export function parse(text: string): { saved: Saved | null; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { saved: null, errors: ["JSON として読めません"] };
  }
  if (!isObj(raw)) return { saved: null, errors: ["JSON の形式が違います"] };
  let data: Obj;
  try {
    data = migrate(raw);
  } catch (e) {
    return { saved: null, errors: [(e as Error).message] };
  }

  const errors: string[] = [];
  const ids = new Set(CATALOG.map((a) => a.id));
  const customActions: Action[] = [];
  (Array.isArray(data.customActions) ? data.customActions : []).forEach((v, i) => {
    const a = toCustomAction(v);
    if (!a) errors.push(`カスタムアクション ${i + 1} 件目が不正なため読み飛ばしました`);
    else if (ids.has(a.id)) errors.push(`カスタムアクション ID「${a.id}」が重複しているため読み飛ばしました`);
    else {
      ids.add(a.id);
      customActions.push(a);
    }
  });

  const layout = Object.fromEntries(FACES.map((f) => [f.id, {}])) as Layout;
  for (const [faceId, slots] of Object.entries(isObj(data.faces) ? data.faces : {})) {
    const face = FACES.find((f) => f.id === faceId);
    if (!face || !isObj(slots)) {
      errors.push(`未知の面「${faceId}」を無視しました`);
      continue;
    }
    for (const [key, id] of Object.entries(slots)) {
      const where = `${face.name}の ${key}`;
      if (!HAND_KEYS[face.hand].includes(key)) errors.push(`${where}：未知のキー名のため無視しました`);
      else if (isReserved(face.id, key)) errors.push(`${where}：予約スロットのため空にしました`);
      else if (typeof id !== "string" || !ids.has(id)) errors.push(`${where}：未知のアクション「${String(id)}」のため空にしました`);
      else layout[face.id][key] = id;
    }
  }

  const rawOpts = isObj(data.outputOptions) ? data.outputOptions : {};
  const options = { ...DEFAULT_OUTPUT_OPTIONS };
  for (const k of Object.keys(options) as (keyof OutputOptions)[]) {
    if (typeof rawOpts[k] === "boolean") options[k] = rawOpts[k];
  }

  return { saved: { state: { layout, customActions }, options }, errors };
}

/** localStorage が使えない環境では null（例外を投げない） */
export function loadLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 保存できたら true */
export function saveLocal(text: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, text);
    return true;
  } catch {
    return false;
  }
}
