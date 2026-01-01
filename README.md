# 年末ジャンボ 当落チェッカー

組と番号を入力して当落を確認できる、静的な Web アプリです（手入力特化）。

## 使い方

- `index.html` をブラウザで開きます

### ローカルでの起動例（推奨）

任意のローカルサーバーで OK です。

- Node.js がある場合:
  - `npx serve .`
  - 表示された `http://localhost:xxxx` を開く

## 仕様

- 手入力: 組（1〜999）と番号（6 桁）を入力して判定

## 注意

- 結果は画面下に履歴として追加されます。

## GitHub Pages で公開する（誰でも使えるようにする）

このリポジトリはビルド不要の静的サイトなので、GitHub Actions で GitHub Pages にそのままデプロイできます。

1. このフォルダを GitHub に push（既定ブランチは `main` を想定）
2. GitHub のリポジトリ設定 → Settings → Pages
3. Source を **GitHub Actions** に設定
4. `main` に push すると、自動で Pages にデプロイされます（Actions タブで進捗確認）

補足:

- 静的サイトなのでビルド不要です。
