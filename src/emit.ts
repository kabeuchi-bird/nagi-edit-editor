// keymapper 出力生成（docs/spec.md 4章）
import { FACES, HAND_KEYS, PROPER_NOUN_FACES } from "./model";
import type { Action, Face, Layout, OutputOptions } from "./model";
import { isReserved } from "./reserved";

const SUFFIX = { ok: "", unsupported: "（Linux未対応）", unverified: "（未検証）" } as const;

function slotLine(face: Face, key: string, action: Action, opts: OutputOptions): string {
  const active = action.status === "ok" || opts.includeUnsupported;
  let line = `${active ? "" : "#"}(${[...face.trigger, key].join(" ")}) >> ${action.expr}`;
  if (opts.trailingComments) line += ` # ${action.comment ?? action.label}${SUFFIX[action.status]}`;
  return line.trimEnd();
}

/** 未知のアクションIDのスロットは空として扱う */
export function emit(layout: Layout, actions: ReadonlyMap<string, Action>, opts: OutputOptions): string {
  const out: string[] = [];
  for (const face of FACES) {
    if (!opts.includeProperNouns && PROPER_NOUN_FACES.includes(face.id)) continue;
    if (out.length) out.push("");
    out.push(...face.headers);
    for (const key of HAND_KEYS[face.hand]) {
      if (isReserved(face.id, key)) continue;
      const action = actions.get(layout[face.id][key] ?? "");
      if (action) out.push(slotLine(face, key, action, opts));
    }
  }
  return out.join("\n") + "\n";
}
