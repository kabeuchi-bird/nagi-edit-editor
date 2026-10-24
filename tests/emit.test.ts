import { describe, expect, it } from "vitest";
import reference from "./fixtures/tohwemon_linux_v17_editmode.txt?raw";
import { CATALOG } from "../src/catalog";
import { DEFAULT_LAYOUT } from "../src/defaultLayout";
import { emit } from "../src/emit";
import { KEYS } from "../src/keys";
import { swap } from "../src/layoutOps";
import { DEFAULT_OUTPUT_OPTIONS, FACES } from "../src/model";
import type { Layout, OutputOptions } from "../src/model";
import { isReserved } from "../src/reserved";

const ACTIONS = new Map(CATALOG.map((a) => [a.id, a]));
const run = (layout: Layout = DEFAULT_LAYOUT, opts: Partial<OutputOptions> = {}) =>
  emit(layout, ACTIONS, { ...DEFAULT_OUTPUT_OPTIONS, ...opts });

/** スロット行を正規化して取り出す（docs/spec.md 2章） */
function slots(text: string) {
  return text.split("\n").flatMap((line) => {
    const m = /^(#?)\(([^)]*)\) >>(.*)$/.exec(line);
    if (!m || /^(U I|E R) /.test(m[2])) return [];
    const expr = m[3].replace(/#[^"]*$/, "").replace(/\s+/g, "");
    return [{ slot: m[2], commented: m[1] === "#", expr }];
  });
}

// D2: 再変換は参照元 `^ 92` に対し本ツールは `^ Meta{Slash}`
const EXPR_EXCEPTIONS = new Set(["D F I", "C V I"]);
const withoutExceptions = (rows: ReturnType<typeof slots>) =>
  rows.map((r) => (EXPR_EXCEPTIONS.has(r.slot) ? { ...r, expr: "(例外)" } : r));

describe("emit", () => {
  it("既定レイアウトが参照元Linux版と一致する（ゴールデン）", () => {
    const ref = slots(reference);
    expect(ref).toHaveLength(59); // 15スロット×4面 − 予約1
    expect(withoutExceptions(slots(run()))).toEqual(withoutExceptions(ref));
  });

  it("書式：インデント・行末空白なし、LF、末尾改行1つ", () => {
    const out = run();
    expect(out).not.toMatch(/\r|[ \t]$|^[ \t]/m);
    expect(out.endsWith("\n") && !out.endsWith("\n\n")).toBe(true);
  });

  it("有効行と未対応行の書式", () => {
    const lines = run().split("\n");
    expect(lines).toContain("(J K Q) >> ^ Control{End} # 最新の位置へ");
    expect(lines).toContain('#(J K A) >> ^ "……" Enter # ……（Linux未対応）');
    expect(lines).toContain("#(M Comma E) >> ^ Home ArrowRight End repeat[Delete, 2] ArrowLeft # セリフ接ぎ（未検証）");
  });

  it("予約スロットは出力しない", () => {
    const layout = { ...DEFAULT_LAYOUT, l1: { ...DEFAULT_LAYOUT.l1, E: "home" } };
    expect(run(layout)).not.toContain("(J K E)");
  });

  it("2スロット入れ替えで該当2行の expr だけが入れ替わる", () => {
    const layout = swap(DEFAULT_LAYOUT, { face: "l1", key: "Q" }, { face: "r2", key: "H" });
    const before = run().split("\n");
    const after = run(layout).split("\n");
    const changed = after.filter((l, i) => l !== before[i]);
    expect(changed).toEqual(["(J K Q) >> ^ Control{C} # Copy", "(C V H) >> ^ Control{End} # 最新の位置へ"]);
  });

  it("出力オプション", () => {
    expect(run(DEFAULT_LAYOUT, { includeUnsupported: true })).toContain('\n(J K A) >> ^ "……" Enter # ……（Linux未対応）\n');
    expect(run(DEFAULT_LAYOUT, { trailingComments: false })).toContain("\n(D F Y) >> Home\n");
    const noProper = run(DEFAULT_LAYOUT, { includeProperNouns: false });
    expect(noProper.startsWith("# 編集モード１\n")).toBe(true);
    expect(noProper).not.toContain("固有名詞");
  });

  it("空スロットと未知のアクションIDは出力しない", () => {
    const layout = { ...DEFAULT_LAYOUT, r1: { Y: "nope" } };
    expect(run(layout)).toContain("# (D F ?) 右手\n\n# 編集モード２");
  });
});

describe("catalog / defaultLayout", () => {
  it("expr のキー名がすべて keys.ts に含まれる", () => {
    for (const a of CATALOG) {
      const idents = a.expr.replace(/"[^"]*"/g, "").match(/[A-Za-z]\w*/g) ?? [];
      for (const id of idents.filter((i) => i !== "repeat")) expect(KEYS.has(id), `${a.id}: ${id}`).toBe(true);
    }
  });

  it("アクションIDが一意で、既定配置は既知IDのみ・予約スロットを使わない", () => {
    expect(ACTIONS.size).toBe(CATALOG.length);
    for (const face of FACES) {
      for (const [key, id] of Object.entries(DEFAULT_LAYOUT[face.id])) {
        expect(ACTIONS.has(id), `${face.id}.${key}`).toBe(true);
        expect(isReserved(face.id, key)).toBe(false);
      }
    }
  });
});
