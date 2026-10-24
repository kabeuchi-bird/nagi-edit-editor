import type { Layout } from "./model";

export const DEFAULT_LAYOUT: Layout = {
  p_l: {},
  p_r: {},
  l1: {
    Q: "jump_latest", W: "slash_full", R: "save", T: "nakaguro",
    A: "ellipsis", S: "nijukagi_open", D: "question", F: "kagi_open", G: "paren_open",
    Z: "dash", X: "nijukagi_close", C: "exclaim", V: "kagi_close", B: "paren_close",
  },
  r1: {
    Y: "home", U: "delete_to_end", I: "reconvert", O: "delete", P: "cancel_input",
    H: "commit_end", J: "up", K: "select_up", L: "select_up7", Semicolon: "katakana",
    N: "end", M: "down", Comma: "select_down", Period: "select_down7", Slash: "hiragana",
  },
  l2: {
    Q: "ruby_bar", W: "time_skip", E: "serifu_join", R: "serifu_split", T: "maru",
    A: "double_angle_open", S: "lenticular_open", D: "togaki_join", F: "togaki_split", G: "space3",
    Z: "double_angle_close", X: "lenticular_close", C: "kagi_close_nl", V: "kagi_close_nl_open", B: "kagi_close_nl_space",
  },
  r2: {
    Y: "select_home", U: "cut", I: "reconvert", O: "paste", P: "undo",
    H: "copy", J: "left", K: "right", L: "select_left7", Semicolon: "select_right7",
    N: "select_end", M: "select_left", Comma: "select_right", Period: "select_line", Slash: "redo",
  },
};
