export type Status = "ok" | "unsupported" | "unverified";

export const STATUS_LABEL: Record<Status, string> = { ok: "", unsupported: "Linux未対応", unverified: "未検証" };

export type Category = "cursor" | "select" | "edit" | "ime" | "symbol" | "macro" | "text";

/** パレットの表示順と見出し */
export const CATEGORY_LABEL: Record<Category, string> = {
  cursor: "移動",
  select: "範囲選択",
  edit: "編集",
  ime: "IME",
  macro: "マクロ",
  symbol: "記号",
  text: "テキスト",
};

export interface Action {
  id: string;
  label: string;
  glyph: string;
  category: Category;
  expr: string; // ">>" の右辺。生成側で加工しない
  comment?: string; // 行末コメント。未指定なら label を使う
  status: Status;
  builtin: boolean;
}

export type FaceId = "p_l" | "p_r" | "l1" | "r1" | "l2" | "r2";
type Hand = "left" | "right";

export interface Face {
  id: FaceId;
  name: string;
  trigger: string[];
  hand: Hand;
  headers: string[]; // 出力時の見出しコメント行
}

/** 面ごとの「キー名 → アクションID」。未記載のキーは空スロット */
export type Layout = Record<FaceId, Record<string, string>>;

/** Undo/Redo の対象（docs/spec.md 5章） */
export interface EditState {
  layout: Layout;
  customActions: Action[];
}

export interface OutputOptions {
  includeUnsupported: boolean;
  includeProperNouns: boolean;
  trailingComments: boolean;
}

export const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  includeUnsupported: false,
  includeProperNouns: true,
  trailingComments: true,
};

/** 画面表示用の物理配置（3段×5列） */
export const HAND_ROWS: Record<Hand, string[][]> = {
  left: [
    ["Q", "W", "E", "R", "T"],
    ["A", "S", "D", "F", "G"],
    ["Z", "X", "C", "V", "B"],
  ],
  right: [
    ["Y", "U", "I", "O", "P"],
    ["H", "J", "K", "L", "Semicolon"],
    ["N", "M", "Comma", "Period", "Slash"],
  ],
};

/** 出力順：物理配置を列優先で読む（参照元に合わせる） */
const columnMajor = (rows: string[][]) => rows[0].flatMap((_, c) => rows.map((row) => row[c]));
export const HAND_KEYS: Record<Hand, string[]> = { left: columnMajor(HAND_ROWS.left), right: columnMajor(HAND_ROWS.right) };

/** 出力順に並べた面定義 */
export const FACES: Face[] = [
  { id: "p_l", name: "固有名詞・左", trigger: ["U", "I"], hand: "left", headers: ["#固有名詞１", "# UIを押しながら左手"] },
  { id: "p_r", name: "固有名詞・右", trigger: ["E", "R"], hand: "right", headers: ["# ERを押しながら右手"] },
  { id: "l1", name: "左1面", trigger: ["J", "K"], hand: "left", headers: ["# 編集モード１", "# (J K ?) 左手 - JIS記号対応版"] },
  { id: "r1", name: "右1面", trigger: ["D", "F"], hand: "right", headers: ["# (D F ?) 右手"] },
  { id: "l2", name: "左2面", trigger: ["M", "Comma"], hand: "left", headers: ["# 編集モード２", "# (M Comma ?) 左手"] },
  { id: "r2", name: "右2面", trigger: ["C", "V"], hand: "right", headers: ["# (C V ?) 右手"] },
];
