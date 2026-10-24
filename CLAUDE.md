# CLAUDE.md — 薙刀式 編集モード エディタ（nagi-edit）

## 1. 目的

薙刀式（大岡俊彦）v18トップ版の**編集モード**を個人用に並べ替えるWebツールを作る。

- 編集モードの各面を3×5グリッドで表示し、ドラッグ&ドロップで機能を並べ替える
- 並べ替え結果を **houmain/keymapper** の同時押し構文（`(D F Y) >> Home`）としてテキストボックスに出力する
- ユーザーは出力をコピーし、手元の keymapper.conf の該当範囲に貼り替える

ファイル書き出し・keymapper起動・かな配列本体の編集は対象外。

最終的に **GitHub Pages** で公開する（12章）。

## 2. 参照資料

| 資料 | 用途 |
|---|---|
| 薙刀式 v18トップ版マニュアル（PDF, p1・p22〜p34） | 編集モード各面の機能と意図 |
| https://oookaworks.seesaa.net/article/456099128.html | 薙刀式の公式解説 |
| 中野藤右衛門「Win/Mac/Linuxで薙刀式v17（設定ファイル更新）」の **Linux版** https://tohwemon.com/2026/06/25/ | **出力構文の基準**。既定値はここから取る |
| https://github.com/houmain/keymapper | 構文の一次資料 |

v17→v18の差分はかなの「め」「ね」交換のみで、編集モードは同一。

## 3. 技術スタック

- TypeScript + Vite
- 成果物は `vite-plugin-singlefile` で **HTML1枚**にビルドする（GitHub Pagesでも `file://` でも動くこと）
- `vite.config.ts` の `base` は `'./'`（相対パス）。リポジトリ名に依存させない
- 外部CDN・外部フォントは使わない（オフラインでも動作させる）
- UIフレームワークなし（素のDOM）。依存は最小限
- D&D: HTML5 Drag and Drop API
- 保存: localStorage ＋ JSONのインポート/エクスポート
- テスト: Vitest（出力生成・レイアウト操作のロジック）
- Linux（Firefox / Chromium）で動作確認

## 4. ドメインモデル

### 4.1 物理キー

keymapperのキー名で扱う。片手3段×5列。

```
左手                          右手
Q W E R T                     Y U I O P
A S D F G                     H J K L Semicolon
Z X C V B                     N M Comma Period Slash
```

### 4.2 面（Face）

| 面ID | 名称 | トリガー | 操作する手 | 出力見出し |
|---|---|---|---|---|
| `l1` | 左1面 | `J K` | 左手 | `# 編集モード１` / `# (J K ?) 左手` |
| `r1` | 右1面 | `D F` | 右手 | `# (D F ?) 右手` |
| `l2` | 左2面 | `M Comma` | 左手 | `# 編集モード２` / `# (M Comma ?) 左手` |
| `r2` | 右2面 | `C V` | 右手 | `# (C V ?) 右手` |
| `p_l` | 固有名詞・左 | `U I` | 左手 | `#固有名詞１` / `# UIを押しながら左手` |
| `p_r` | 固有名詞・右 | `E R` | 右手 | `# ERを押しながら右手` |

トリガーキーはv1では固定。データ上は面ごとに持つ。

### 4.3 予約スロット

`l1` の `E` は `(E J K)` = 「でぃ」と衝突するため配置不可。GUIでロック表示し、出力には何も出さない（参照元に行がないため。docs/spec.md D1）。

予約は `reserved.ts` に定数で持つ（かな同時押し一覧から判定する機能はv1では作らない）。

### 4.4 アクション

```ts
type Status = "ok" | "unsupported" | "unverified";

interface Action {
  id: string;         // "home", "select_up7" など一意
  label: string;      // 一覧・ツールチップ用「ホーム」「+7↑」
  glyph: string;      // キー上の短い表示「Home」「再」「「」
  category: "cursor" | "select" | "edit" | "ime" | "symbol" | "macro" | "text";
  expr: string;       // keymapper出力式（">>" の右辺）。例 "^ Shift{ArrowUp}"
  comment?: string;   // 出力行末の "# ..." コメント
  status: Status;     // ok=有効行で出力 / unsupported=Linux未対応 / unverified=挙動未検証
  builtin: boolean;   // 既定カタログ由来か
}
```

- `expr` はそのまま出力する。生成側で `^` を足したり消したりしない
- 1アクションを複数スロットに置ける

### 4.5 既定カタログ（中野藤右衛門 Linux版 v17 準拠）

`src/catalog.ts` に定義する。`status` 欄が空なら `ok`。

**左1面 `J K`**

| キー | 機能 | expr | status |
|---|---|---|---|
| Q | 最新の位置へ | `^ Control{End}` | |
| W | ／ | `^ Alt{Slash} Enter` | |
| E | （予約：でぃ） | — | — |
| R | 保存 | `^ Control{S}` | |
| T | ・ | `^ Slash` | |
| A | …… | `^ "……" Enter` | unsupported |
| S | 『 | `^ Shift{BracketRight} Enter` | unsupported |
| D | ？ | `^ Shift{Slash} Enter` | |
| F | 「 | `^ BracketRight` | |
| G | （ | `^ Shift{8} Enter` | |
| Z | ―― | `^ "――" Enter` | unsupported |
| X | 』 | `^ Shift{Backslash} Enter` | unsupported |
| C | ！ | `^ Shift{1} Enter` | |
| V | 」 | `^ Backslash` | |
| B | ） | `^ Shift{9} Enter` | |

「「」「」」はEnterなし（変換で『』を出せるようにするため）。参照元の意図なので変えない。

**右1面 `D F`**

| キー | 機能 | expr | status |
|---|---|---|---|
| Y | ホーム | `Home` | |
| U | 文末まで消去 | `^ Shift{End} Backspace` | |
| I | 再変換 | `^ Meta{Slash}` | unsupported（Mozc非対応） |
| O | Del | `^ Delete` | |
| P | 入力キャンセル | `^ Shift{Escape Escape}` | |
| H | 確定End | `^ Enter End` | |
| J | ↑ | `^ ArrowUp` | |
| K | +↑ | `^ Shift{ArrowUp}` | |
| L | +7↑ | `^ Shift{repeat[ArrowUp, 7]}` | |
| Semicolon | カタカナ | `^ F7` | |
| N | End | `^ End` | |
| M | ↓ | `^ ArrowDown` | |
| Comma | +↓ | `^ Shift{ArrowDown}` | |
| Period | +7↓ | `^ Shift{repeat[ArrowDown, 7]}` | |
| Slash | ひらがな | `^ F6` | |

**左2面 `M Comma`**

| キー | 機能 | expr | status |
|---|---|---|---|
| Q | ｜ | `^ "｜" Enter` | unsupported |
| W | 時間経過 | `^ "　　　×　　　×　　　×" Enter Enter` | unsupported |
| E | セリフ接ぎ | `^ Home ArrowRight End repeat[Delete, 2] ArrowLeft` | unverified |
| R | セリフ切り | `^ Home Enter repeat[Space, 1] ArrowLeft` | unverified |
| T | 〇 | `"〇" Enter` | unsupported |
| A | 《 | `^ "《" Enter` | unsupported |
| S | 【 | `^ "【" Enter` | unsupported |
| D | ト書き接ぎ | `^ Home ArrowRight End repeat[Delete, 4] ArrowLeft` | unverified |
| F | ト書き切り | `^ Home Enter repeat[Space, 3] ArrowLeft` | unverified |
| G | 空白3 | `^ repeat[Space, 3]` | |
| Z | 》 | `^ "》" Enter` | unsupported |
| X | 】 | `^ "】" Enter` | unsupported |
| C | 」改行 | `^ Backslash Enter Enter` | |
| V | 」改行「 | `^ Backslash Enter Enter BracketRight Enter` | |
| B | 」改行空白 | `^ Backslash Enter Enter Space` | |

**右2面 `C V`**

| キー | 機能 | expr | status |
|---|---|---|---|
| Y | +Home | `Shift{Home}` | |
| U | Cut | `^ Control{X}` | |
| I | 再変換 | `^ Meta{Slash}` | unsupported |
| O | Paste | `^ Control{V}` | |
| P | Undo | `^ Control{Z}` | |
| H | Copy | `^ Control{C}` | |
| J | ← | `^ ArrowLeft` | |
| K | → | `^ ArrowRight` | |
| L | +7← | `^ Shift{repeat[ArrowLeft, 7]}` | |
| Semicolon | +7→ | `Shift{repeat[ArrowRight, 7]}` | |
| N | +End | `^ Shift{End}` | |
| M | +← | `^ Shift{ArrowLeft}` | |
| Comma | +→ | `^ Shift{ArrowRight}` | |
| Period | 一行選択 | `^ End Shift{Home}` | |
| Slash | Redo | `^ Control{Y}` | |

**固有名詞面**：既定は空。ユーザーがテキストアクションとして追加する（`^ "文字列"`、status は unsupported）。

### 4.6 カスタムアクション

ユーザーが追加できる。入力項目：label、glyph、category、expr（自由入力）、comment、status。

- 「テキスト挿入」ショートカット：文字列を入れると `^ "文字列"` を生成し、status を unsupported にする（Linuxで文字列出力不可のため）
- expr の簡易検証：括弧・波括弧の対応、未知の大文字始まり識別子への警告（既知キー名リストを `keys.ts` に持つ）

## 5. 出力仕様

### 5.1 形式

中野藤右衛門 Linux版の該当範囲（`#固有名詞１` 〜 `(C V Slash)` の行まで）と**同じ並び・同じ書式**で出力する。ユーザーはこの範囲を丸ごと貼り替える。

```
#固有名詞１
# UIを押しながら左手
#(U I W) >> ^ "天空のファルコーン"

# ERを押しながら右手

# 編集モード１
# (J K ?) 左手 - JIS記号対応版
(J K Q) >> ^ Control{End} # 最新の位置へ
#(J K A) >> ^ "……" Enter # ……（Linux未対応）
(J K W) >> ^ Alt{Slash} Enter # ／
...

# (D F ?) 右手
(D F Y) >> Home # ホーム
...
```

### 5.2 規則

- 1スロット1行：`(<トリガー> <キー>) >> <expr> # <label>`
- スロット順は**列優先**（参照元に合わせる）
  - 左手：Q A Z W S X E D C R F V T G B
  - 右手：Y H N U J M I K Comma O L Period P Semicolon Slash
- `status` が `ok` 以外のアクションは行頭に `#` を付けてコメントアウト。行末コメントに「（Linux未対応）」「（未検証）」を付す
- 空スロットは出力しない
- 予約スロットは出力しない（4.3）
- インデントなし、行末空白なし、改行はLF
- 出力オプション（チェックボックス）
  - 「未対応・未検証も有効行で出す」（Windows等へ流用する場合用）
  - 「固有名詞面を出力する」（既定オン）
  - 「行末コメントを付ける」（既定オン）

### 5.3 出力UI

- 読み取り専用 `<textarea>`（等幅フォント）にリアルタイム反映
- 「コピー」ボタン（Clipboard API。失敗時は全選択して案内）
- 既定配置との差分行をハイライトするトグル（textareaとは別のプレビュー表示でよい）

### 5.4 検証

- ゴールデンテスト：既定レイアウトの出力が、参照元Linux版の該当範囲と一致する（`tests/fixtures/tohwemon_linux_v17_editmode.txt` に該当範囲を手で写して置く。差異は空白・コメント文言のみ許容し、それ以外は一致させる。比較規則と例外は docs/spec.md 1〜2章）
- 入れ替えテスト：2スロット交換後、該当2行の expr だけが入れ替わる

## 6. GUI要件

### 6.1 画面構成

```
┌──────────────────────────────────────────────┐
│ ヘッダー: インポート / エクスポート / 既定に戻す / 出力オプション │
├─────────────────────┬────────────────────────┤
│ 左手の面             │ 右手の面                │
│  l1 (J K)   3×5      │  r1 (D F)   3×5         │
│  l2 (M ,)   3×5      │  r2 (C V)   3×5         │
│  p_l (U I)  3×5      │  p_r (E R)  3×5         │
├─────────────────────┴────────────────────────┤
│ アクションパレット（カテゴリ別・検索・カスタム追加）    │
├──────────────────────────────────────────────┤
│ 詳細パネル（選択スロット）   │ 出力テキストボックス     │
└──────────────────────────────────────────────┘
```

- 面は物理配置どおり（左手面は左、右手面は右）。各面の見出しにトリガーキー
- 各キーに `glyph` を大きく、キー名（Q, Semicolon等）を小さく表示
- status による見た目の区別：unsupported は斜線または淡色、unverified は点線枠
- カテゴリ色はマニュアルの凡例（移動・マクロ／範囲選択／重要な操作）に寄せる

### 6.2 操作

- スロット間D&D：**入れ替え**（面をまたいでも可）
- パレット→スロット：上書き
- スロット→パレットへドロップ、または選択して Delete：空にする
- 予約スロットにはドロップ不可
- クリック2回（Aを選択→Bをクリック）でも入れ替えられる（D&Dが使いにくい環境用）
- 編集の Undo/Redo（Ctrl+Z / Ctrl+Shift+Z）
- 既定と異なるスロットに印を付ける
- 既定に戻す：スロット単位（詳細パネル）・面単位・全体

### 6.3 詳細パネル

選択スロットの label、expr、status、comment を表示。expr はその場で編集でき、編集した時点でそのスロット専用のカスタムアクションに複製する（カタログ本体は書き換えない）。

## 7. 保存形式

localStorage に自動保存。JSONでエクスポート/インポート可能。

- localStorageのキーは `nagi-edit:v1:layout` のように接頭辞付きにする。GitHub Pagesでは `<user>.github.io` 配下の全リポジトリが同じオリジンを共有するため、他のページと衝突させない
- localStorageが使えない環境（プライベートブラウズ等）でも動作は続け、「保存できません。JSONでエクスポートしてください」と表示する

```json
{
  "formatVersion": 1,
  "faces": {
    "l1": { "Q": "jump_latest", "W": "slash" },
    "r1": { "Y": "home" },
    "p_l": { "W": "custom:falcon" }
  },
  "customActions": [
    { "id": "custom:falcon", "label": "天空のファルコーン", "glyph": "天", "category": "text",
      "expr": "^ \"天空のファルコーン\"", "status": "unsupported" }
  ],
  "outputOptions": { "includeUnsupported": false, "includeProperNouns": true, "trailingComments": true }
}
```

- 未記載スロットは空
- 読込時に未知のアクションIDがあればエラー表示し、そのスロットは空にして続行
- `formatVersion` が異なる場合はマイグレーション関数を通す

## 8. ディレクトリ構成

```
nagi-edit/
├── CLAUDE.md
├── README.md                # 使い方・公開URL・クレジット
├── LICENSE
├── .github/workflows/
│   ├── ci.yml               # PR・push時に lint / test / build
│   └── deploy.yml           # main への push で GitHub Pages にデプロイ
├── docs/
│   ├── spec.md              # 本書の詳細化。仕様変更は先にここを更新
│   └── manual-test.md       # keymapperでの手動確認手順
├── index.html
├── src/
│   ├── main.ts
│   ├── model.ts             # Face, Slot, Action, Layout 型
│   ├── catalog.ts           # 既定カタログ（4.5）
│   ├── defaultLayout.ts     # 既定配置
│   ├── reserved.ts
│   ├── keys.ts              # keymapperキー名リスト
│   ├── layoutOps.ts         # swap / assign / clear / undo-redo（純粋関数）
│   ├── emit.ts              # 出力生成（純粋関数）
│   ├── storage.ts           # localStorage・JSON入出力
│   └── ui/                  # DOM描画・D&D
├── tests/
│   ├── fixtures/
│   ├── emit.test.ts
│   └── layoutOps.test.ts
└── vite.config.ts
```

ロジック（`layoutOps.ts`・`emit.ts`）はDOMに依存させない。

## 9. マイルストーン

1. **M1** 型・カタログ・既定配置・`emit.ts`、ゴールデンテスト通過
2. **M2** `layoutOps.ts`（入れ替え・割当・クリア・Undo/Redo）とテスト
3. **M3** グリッド表示・出力テキストボックス・コピー
4. **M4** D&D・クリック入れ替え・予約スロット・差分表示
5. **M5** カスタムアクション・詳細パネル編集・JSON入出力・出力オプション
6. **M6** シングルファイルビルド、`docs/manual-test.md` 作成
7. **M7** GitHub Actions（CI・Pagesデプロイ）、README・クレジット整備

各マイルストーン完了時に `npm run lint` / `npm test` / `npm run build` を通す。

## 10. 完了条件

- ビルド成果物（HTML1枚）を `file://` で開いて全機能が動く
- main へのpushで GitHub Pages に自動デプロイされ、公開URLで全機能が動く
- 既定レイアウトの出力が参照元Linux版の該当範囲と一致する
- 任意の2スロットを入れ替えた出力を keymapper.conf に貼り、Reload後に入れ替え後の位置で機能が発動する（手動確認）
- 予約スロットに配置できない
- リロード後も配置が保持される

## 11. 規約

- 仕様の追加・変更は `docs/spec.md` を先に更新してから実装する
- keymapper構文で不明な点は推測で書かない。参照元設定ファイルとkeymapper READMEで確認し、根拠を `docs/spec.md` に残す
- keymapperは大文字小文字を区別する（`Slash` であって `slash` ではない）。キー名は `keys.ts` のリストに一致させる
- コミットメッセージ・PR名は変更内容が一目でわかる具体的な名前にする
- コメント・ドキュメントは日本語、識別子は英語

## 12. GitHub Pages 公開

### 12.1 デプロイ方式

GitHub Actions でビルドしてデプロイする（`gh-pages` ブランチ方式は使わない）。

- リポジトリ設定：Settings → Pages → Source を「GitHub Actions」にする（初回のみ手動。README に手順を書く）
- `deploy.yml`
  - トリガー：`main` への push、`workflow_dispatch`
  - permissions：`contents: read` / `pages: write` / `id-token: write`
  - concurrency：`group: pages`、`cancel-in-progress: false`
  - 手順：checkout → setup-node（`.nvmrc` のバージョン、npmキャッシュ）→ `npm ci` → `npm test` → `npm run build` → `actions/configure-pages` → `actions/upload-pages-artifact`（`dist/`）→ `actions/deploy-pages`
  - テストが落ちたらデプロイしない
- `ci.yml`：PR と main 以外のブランチへの push で lint / test / build のみ
- 各アクションはメジャーバージョンを固定する。実装時に最新のメジャーバージョンを公式リポジトリで確認すること

### 12.2 公開物の確認

- `dist/` に出るのは `index.html` 1枚（＋必要なら favicon）だけであること
- `dist/` に `.nojekyll` を置く（Jekyll処理を無効化）
- 公開URL `https://<user>.github.io/<repo>/` で、サブパス配下でも動くこと（`base: './'` で担保）

### 12.3 クレジットとライセンス

公開物なので出典を明示する。

- ページのフッターと README に以下を記載
  - 薙刀式：大岡俊彦（公式ページへのリンク）
  - 既定値の出典：中野藤右衛門氏の keymapper 設定（Linux版 v17、記事へのリンク）
  - keymapper：houmain/keymapper
- 本ツール自体のライセンスは Unlicense（リポジトリ初回コミットの LICENSE）とし、README に「既定カタログは上記出典に基づく」と明記する
- `tests/fixtures/` に参照元設定の抜粋を置く件は、公開リポジトリになるため**編集モード範囲の最小限**に留め、ファイル先頭に出典コメントを入れる
