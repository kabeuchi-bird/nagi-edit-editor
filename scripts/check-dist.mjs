// ビルド成果物の検査（CLAUDE.md 12.2）：dist が index.html と .nojekyll だけで、外部参照がないこと
import { readdirSync, readFileSync } from "node:fs";

const files = readdirSync("dist").sort();
const errors = [];
if (JSON.stringify(files) !== JSON.stringify([".nojekyll", "index.html"])) errors.push(`dist の中身が想定外です: ${files.join(", ")}`);

const html = readFileSync("dist/index.html", "utf8");
if (/<script[^>]*\ssrc=/i.test(html)) errors.push("外部スクリプトを参照しています");
if (/<link[^>]*rel=["']?stylesheet/i.test(html)) errors.push("外部スタイルシートを参照しています");
if (/@import|url\(\s*["']?(https?:)?\/\//i.test(html)) errors.push("CSS から外部リソースを参照しています");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("dist OK: index.html 1枚（＋.nojekyll）、外部参照なし");
