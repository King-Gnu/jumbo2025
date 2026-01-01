# 年末ジャンボ 当落チェッカー

組と番号を入力して当落を確認できる、静的な Web アプリです。Web カメラから撮影して OCR で入力欄へ反映することもできます。

## 使い方

- `index.html` をブラウザで開きます
  - **カメラ機能（getUserMedia）を使う場合は、https もしくは localhost で開く必要があります**

### ローカルでの起動例（推奨）

任意のローカルサーバーで OK です。

- Node.js がある場合:
  - `npx serve .`
  - 表示された `http://localhost:xxxx` を開く

## 仕様

- 手入力: 組（1〜999）と番号（6 桁）を入力して判定
- カメラ入力: 撮影 →OCR（Tesseract.js）で、テキストから「○○ 組」「□□□□□□ 番」を抽出して入力欄へ反映

## 注意

- OCR は撮影条件に大きく依存します（明るさ・ピント・反射など）。抽出できない場合は手入力してください。

## GitHub Pages で公開する（誰でも使えるようにする）

このリポジトリはビルド不要の静的サイトなので、GitHub Actions で GitHub Pages にそのままデプロイできます。

1. このフォルダを GitHub に push（既定ブランチは `main` を想定）
2. GitHub のリポジトリ設定 → Settings → Pages
3. Source を **GitHub Actions** に設定
4. `main` に push すると、自動で Pages にデプロイされます（Actions タブで進捗確認）

補足:

- カメラ機能は `https` または `localhost` が必要ですが、GitHub Pages は `https` なので利用可能です。
