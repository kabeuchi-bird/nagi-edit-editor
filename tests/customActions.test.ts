import { describe, expect, it } from "vitest";
import { addCustom, allActions, checkExpr, deleteCustom, editSlotAction, textAction } from "../src/customActions";
import { DEFAULT_LAYOUT } from "../src/defaultLayout";
import { assign } from "../src/layoutOps";
import type { EditState } from "../src/model";

const S: EditState = { layout: DEFAULT_LAYOUT, customActions: [] };

describe("textAction", () => {
  it("文字列から unsupported のテキストアクションを作る", () => {
    expect(textAction("天空のファルコーン", "custom:x")).toEqual({
      id: "custom:x", label: "天空のファルコーン", glyph: "天", category: "text",
      expr: '^ "天空のファルコーン"', status: "unsupported", builtin: false,
    });
  });

  it('空文字・" を含む文字列は作らない', () => {
    expect(textAction("", "custom:x")).toBeNull();
    expect(textAction('a"b', "custom:x")).toBeNull();
  });
});

describe("checkExpr", () => {
  it("既定カタログの expr はすべて警告なし", () => {
    for (const a of allActions(S).values()) expect(checkExpr(a.expr), a.id).toEqual([]);
  });

  it("括弧・文字列・未知キー・# を警告する", () => {
    expect(checkExpr("^ Shift{ArrowUp")).toEqual(["括弧 () {} [] の対応が取れていません"]);
    expect(checkExpr("Shift(A}")).toEqual(["括弧 () {} [] の対応が取れていません"]);
    expect(checkExpr('^ "abc')).toContain("文字列リテラル（\"）が閉じていません");
    expect(checkExpr("^ ArrowUP slash")).toEqual(["不明なキー名：ArrowUP"]); // 小文字始まりはマクロ名の可能性があるので対象外
    expect(checkExpr("^ Home # x")).toEqual(["# 以降はコメントとして扱われます"]);
    expect(checkExpr('^ "{ # Foo"')).toEqual([]); // 文字列内は対象外
  });
});

describe("editSlotAction", () => {
  const slot = { face: "r1" as const, key: "Y" };

  it("既定カタログのアクションは複製してそのスロットに置く", () => {
    const out = editSlotAction(S, slot, { expr: "^ Home" });
    const id = out.layout.r1.Y;
    expect(id).toMatch(/^custom:/);
    expect(out.customActions).toHaveLength(1);
    expect(out.customActions[0]).toMatchObject({ id, label: "ホーム", expr: "^ Home", builtin: false });
    expect(allActions(out).get("home")!.expr).toBe("Home"); // カタログは不変
  });

  it("このスロット専用のカスタムアクションはその場で書き換える", () => {
    const once = editSlotAction(S, slot, { expr: "^ Home" });
    const twice = editSlotAction(once, slot, { label: "行頭" });
    expect(twice.customActions).toHaveLength(1);
    expect(twice.layout.r1.Y).toBe(once.layout.r1.Y);
    expect(twice.customActions[0].label).toBe("行頭");
  });

  it("他スロットと共用のカスタムアクションは複製する", () => {
    const once = editSlotAction(S, slot, { expr: "^ Home" });
    const shared = { ...once, layout: assign(once.layout, { face: "r2", key: "Y" }, once.layout.r1.Y) };
    const out = editSlotAction(shared, slot, { label: "行頭" });
    expect(out.customActions).toHaveLength(2);
    expect(out.layout.r1.Y).not.toBe(out.layout.r2.Y);
    expect(allActions(out).get(out.layout.r2.Y)!.label).toBe("ホーム");
  });

  it("空スロットは何もしない", () => {
    expect(editSlotAction(S, { face: "p_l", key: "Q" }, { expr: "x" })).toBe(S);
  });
});

describe("deleteCustom", () => {
  it("削除すると置いていたスロットが空になる", () => {
    const a = textAction("戸田", "custom:toda")!;
    const s = { ...addCustom(S, a), layout: assign(S.layout, { face: "p_l", key: "C" }, a.id) };
    const out = deleteCustom(s, a.id);
    expect(out.customActions).toEqual([]);
    expect("C" in out.layout.p_l).toBe(false);
  });
});
