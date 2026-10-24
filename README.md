# 薙刀式 編集モード エディタ（nagi-edit）

薙刀式（v18トップ版）の**編集モード**の配置を、ブラウザ上のドラッグ&ドロップで並べ替え、[houmain/keymapper](https://github.com/houmain/keymapper) 用の設定テキストとして出力するツールです。

**公開URL：** https://kabeuchi-bird.github.io/nagi-edit-editor/

## 使い方

1. 公開URLを開く（または `dist/index.html` をダウンロードしてローカルで開く。オフラインでも動きます）
2. 6つの面（左1面 `J K`・右1面 `D F`・左2面 `M Comma`・右2面 `C V`・固有名詞 `U I` / `E R`）のキーを並べ替える
   - キー同士のドラッグ、またはクリック→別のキーをクリックで入れ替え
   - アクションパレットからドラッグで上書き、パレットへドラッグ（または Delete）で空にする
   - 詳細パネルで expr などを編集、カスタムアクション（固有名詞のテキスト挿入など）を追加
   - Ctrl+Z / Ctrl+Shift+Z で元に戻す／やり直す
3. 「keymapper 出力」の「コピー」を押す
4. keymapper.conf の `#固有名詞１` の行から `(C V Slash) >> ^ Control{Y}` の行までを、コピーした内容で置き換える
5. keymapper を再起動して設定を読み直す（詳しい手順は [docs/manual-test.md](docs/manual-test.md)）

配置はブラウザ（localStorage）に自動保存されます。別の端末へ移す・バックアップするにはエクスポート／インポート（JSON）を使ってください。

### 出力について

- 既定配置の出力は、中野藤右衛門氏の Linux版 v17 設定の該当範囲と同じ並び・同じ書式です（差異は [docs/spec.md](docs/spec.md) 1章）
- Linux で文字列を直接出力できないアクション（「……」「《」など）や挙動未検証のマクロは、行頭 `#` でコメントアウトして出力します。Windows 等へ流用する場合は「未対応・未検証も有効行で出す」をオンにしてください
- 左1面の E は `(E J K)`＝「でぃ」と衝突するため配置できません

## 開発

```sh
npm ci
npm run dev     # 開発サーバー
npm run lint    # 型チェック
npm test        # Vitest（出力生成・レイアウト操作・保存形式）
npm run build   # dist/index.html を1枚生成し、中身を検査
```

- 仕様：[CLAUDE.md](CLAUDE.md)（基本仕様）、[docs/spec.md](docs/spec.md)（詳細・決定事項・keymapper構文の根拠）
- 手動確認：[docs/manual-test.md](docs/manual-test.md)

### GitHub Pages の初回設定

1. リポジトリの Settings → Pages → Build and deployment の Source を「GitHub Actions」にする
2. `main` に push すると `.github/workflows/deploy.yml` がテスト・ビルドしてデプロイする（Actions タブの「Deploy」から手動実行も可）

`main` 以外のブランチへの push と Pull Request では `.github/workflows/ci.yml` が lint・テスト・ビルドを行います。

## クレジット

- 薙刀式：大岡俊彦（[公式解説](https://oookaworks.seesaa.net/article/456099128.html)）
- 既定値の出典：中野藤右衛門氏の keymapper 設定（[Win/Mac/Linuxで薙刀式v17（設定ファイル更新）](https://tohwemon.com/2026/06/25/win-mac-linux%e3%81%a7%e8%96%99%e5%88%80%e5%bc%8fv17%ef%bc%88%e8%a8%ad%e5%ae%9a%e3%83%95%e3%82%a1%e3%82%a4%e3%83%ab%e6%9b%b4%e6%96%b0%ef%bc%89/) の Linux版）
- keymapper：[houmain/keymapper](https://github.com/houmain/keymapper)

## ライセンス

本ツールのコードは [Unlicense](LICENSE)（パブリックドメイン）です。

ただし、既定カタログ（`src/catalog.ts`・`src/defaultLayout.ts`）と `tests/fixtures/` の設定抜粋は上記出典に基づくもので、その権利は各出典の著作者に帰属します。
