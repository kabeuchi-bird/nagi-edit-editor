import { describe, expect, it } from "vitest";
import { textAction } from "../src/customActions";
import { DEFAULT_LAYOUT } from "../src/defaultLayout";
import { assign } from "../src/layoutOps";
import { DEFAULT_OUTPUT_OPTIONS } from "../src/model";
import { parse, serialize } from "../src/storage";

describe("storage", () => {
  it("serialize → parse で元に戻る", () => {
    const falcon = textAction("天空のファルコーン", "custom:falcon")!;
    const saved = {
      state: { layout: assign(DEFAULT_LAYOUT, { face: "p_l", key: "W" }, falcon.id), customActions: [{ ...falcon, comment: "固有名詞" }] },
      options: { ...DEFAULT_OUTPUT_OPTIONS, trailingComments: false },
    };
    const json = serialize(saved);
    expect(JSON.parse(json)).toMatchObject({ formatVersion: 1, faces: { p_l: { W: "custom:falcon" } } });
    expect(json).not.toContain("builtin");
    expect(parse(json)).toEqual({ saved, errors: [] });
  });

  it("CLAUDE.md 7章の例を読める（未記載スロットは空）", () => {
    const { saved, errors } = parse(
      JSON.stringify({
        formatVersion: 1,
        faces: { l1: { Q: "jump_latest", W: "slash_full" }, r1: { Y: "home" }, p_l: { W: "custom:falcon" } },
        customActions: [{ id: "custom:falcon", label: "天空のファルコーン", glyph: "天", category: "text", expr: '^ "天空のファルコーン"', status: "unsupported" }],
        outputOptions: { includeUnsupported: false, includeProperNouns: true, trailingComments: true },
      }),
    );
    expect(errors).toEqual([]);
    expect(saved!.state.layout.l1).toEqual({ Q: "jump_latest", W: "slash_full" });
    expect(saved!.state.layout.r2).toEqual({});
  });

  it("不正な部分はエラーにして捨て、残りで続行する", () => {
    const { saved, errors } = parse(
      JSON.stringify({
        formatVersion: 1,
        faces: { l1: { Q: "nope", E: "home", Foo: "home", W: "slash_full" }, zz: {} },
        customActions: [{ id: "bad" }, { id: "home", label: "x", glyph: "x", category: "text", expr: "", status: "ok" }],
        outputOptions: { trailingComments: "yes" },
      }),
    );
    expect(saved!.state.layout.l1).toEqual({ W: "slash_full" });
    expect(saved!.state.customActions).toEqual([]);
    expect(saved!.options).toEqual(DEFAULT_OUTPUT_OPTIONS);
    expect(errors).toHaveLength(6);
  });

  it("category・status はプロトタイプ上のキーを受け付けず、改行を含む文字列も受け付けない", () => {
    const base = { id: "custom:a", label: "a", glyph: "a", category: "text", expr: "^ Home", status: "ok" };
    const bad = [
      { ...base, id: "custom:b1", category: "constructor" },
      { ...base, id: "custom:b2", status: "toString" },
      { ...base, id: "custom:b3", expr: "^ Home\n(D F Y) >> End" },
      { ...base, id: "custom:b4", label: "a\rb" },
      { ...base, id: "custom:b5", comment: "x\ny" },
    ];
    const { saved, errors } = parse(JSON.stringify({ formatVersion: 1, customActions: [...bad, base] }));
    expect(saved!.state.customActions.map((a) => a.id)).toEqual(["custom:a"]);
    expect(errors).toHaveLength(bad.length);
  });

  it("全体が読めない場合は saved が null", () => {
    expect(parse("{").saved).toBeNull();
    expect(parse("[]").saved).toBeNull();
    expect(parse('{"formatVersion":2}')).toEqual({ saved: null, errors: ["未対応の formatVersion です：2"] });
  });
});
