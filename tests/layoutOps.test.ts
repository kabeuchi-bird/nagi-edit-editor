import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "../src/defaultLayout";
import { assign, clear, commit, createHistory, redo, swap, undo } from "../src/layoutOps";

const L = DEFAULT_LAYOUT;

describe("swap", () => {
  it("同じ面の2スロットを入れ替える", () => {
    const out = swap(L, { face: "r1", key: "J" }, { face: "r1", key: "M" });
    expect(out.r1.J).toBe("down");
    expect(out.r1.M).toBe("up");
    expect(L.r1.J).toBe("up"); // 元は変更しない
  });

  it("面をまたいで入れ替える", () => {
    const out = swap(L, { face: "l1", key: "Q" }, { face: "r2", key: "H" });
    expect(out.l1.Q).toBe("copy");
    expect(out.r2.H).toBe("jump_latest");
  });

  it("空スロットとの入れ替えは移動になる", () => {
    const out = swap(L, { face: "r1", key: "Y" }, { face: "p_l", key: "W" });
    expect(out.p_l.W).toBe("home");
    expect("Y" in out.r1).toBe(false);
  });

  it("予約スロットが絡むと何もしない", () => {
    expect(swap(L, { face: "l1", key: "E" }, { face: "l1", key: "Q" })).toBe(L);
    expect(swap(L, { face: "r1", key: "Y" }, { face: "l1", key: "E" })).toBe(L);
  });

  it("同じ中身同士なら同じオブジェクトを返す", () => {
    expect(swap(L, { face: "r1", key: "I" }, { face: "r2", key: "I" })).toBe(L);
  });
});

describe("assign / clear", () => {
  it("上書きする。1アクションを複数スロットに置ける", () => {
    const out = assign(L, { face: "r2", key: "Y" }, "home");
    expect(out.r2.Y).toBe("home");
    expect(out.r1.Y).toBe("home");
  });

  it("予約スロットには置けない", () => {
    expect(assign(L, { face: "l1", key: "E" }, "home")).toBe(L);
  });

  it("clear で空にする。空なら同じオブジェクト", () => {
    const out = clear(L, { face: "l1", key: "Q" });
    expect("Q" in out.l1).toBe(false);
    expect(clear(out, { face: "l1", key: "Q" })).toBe(out);
  });
});

describe("history", () => {
  it("undo / redo で行き来でき、新しい commit で redo は消える", () => {
    const a = swap(L, { face: "r1", key: "J" }, { face: "r1", key: "M" });
    const b = clear(a, { face: "l1", key: "Q" });
    let h = commit(commit(createHistory(L), a), b);

    h = undo(h);
    expect(h.present).toBe(a);
    h = undo(h);
    expect(h.present).toBe(L);
    expect(undo(h)).toBe(h); // これ以上戻れない
    h = redo(h);
    expect(h.present).toBe(a);

    h = commit(h, assign(a, { face: "p_l", key: "Q" }, "home"));
    expect(h.future).toEqual([]);
    expect(redo(h)).toBe(h);
  });

  it("変化のない commit は履歴を積まない", () => {
    const h = createHistory(L);
    expect(commit(h, swap(L, { face: "l1", key: "E" }, { face: "l1", key: "Q" }))).toBe(h);
  });
});
