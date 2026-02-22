# CROW'S DESTINY — BGM 割り当て一覧

意図している BGM の割り当ては `scene-list.md` および `suno-prompts.md` に記載のとおりです。  
実際の再生で使用するキーとファイルの対応は `js/core/config.js` の `BGM_ASSETS` で定義されています。

| キー | ファイル | 用途 |
|------|----------|------|
| opening | opening.mp3 | タイトル画面（ユーザー操作後に再生） |
| stage1 〜 stage7 | stage1.mp3 … stage7.mp3 | 通常プレイ・各面 |
| boss | boss.mp3 | 通常ボス戦（1〜6面） |
| boss7 | boss7.mp3 | ラスボス第1形態 |
| lastboss1 | lastboss.mp3 | ラスボス第2形態 |
| lastboss2 | lastboss2.mp3 | ラスボス第3形態 |
| ending | endding.mp3 | エンディング（※ファイル名は endding のまま） |
| gameover | gameover.mp3 | ゲームオーバー |

SUNO 等で BGM を生成する際の雰囲気・世界観は `suno-prompts.md` を参照してください。
