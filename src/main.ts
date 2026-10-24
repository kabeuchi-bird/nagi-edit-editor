import { CATALOG } from "./catalog";
import { DEFAULT_LAYOUT } from "./defaultLayout";
import { emit } from "./emit";
import { DEFAULT_OUTPUT_OPTIONS } from "./model";

// M1: 既定レイアウトの出力のみ表示（GUIは M3 以降）
const output = document.querySelector<HTMLTextAreaElement>("#output")!;
output.value = emit(DEFAULT_LAYOUT, new Map(CATALOG.map((a) => [a.id, a])), DEFAULT_OUTPUT_OPTIONS);
