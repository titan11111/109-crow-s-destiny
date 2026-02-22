# CROW'S DESTINY: THE RITUAL OF TWILIGHT — 仕様書

横スクロールアクション。七つの穢れし地を浄化するダークファンタジー。蒼光の穢者3体撃破でボス出現。

## 役割分解（リファクタリング後）

| ファイル | 役割 |
|----------|------|
| index.html | 構造（メタ、キャンバス、コンテナ、スクリプト参照） |
| style.css | スタイル、レスポンシブ、タッチ対応 |
| script.js | ゲームロジック（Engine / Player / Enemy / Boss / FX / UI） |
| SPEC.md | 本仕様書 |

## ステートマシン

```
TITLE → NARRATION → PLAYING → BOSS_INTRO → BOSS_FIGHT → STAGE_CLEAR → (次面 or VICTORY)
GAME_OVER / VICTORY → TITLE（リスタート）
```
