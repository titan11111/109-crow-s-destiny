# CROW'S DESTINY — ゲームオーバーBGM 制作指示書（SUNO用）

ゲームオーバー画面用BGMをSUNOで生成するための指示・世界観メモです。  
**「パッとゲームオーバーとわかる」＋「世界観に合う」** を両立させることを目標にしています。

---

## 1. ゲームと世界観の要約

- **タイトル**: CROW'S DESTINY（カラスの destiny / 運命）
- **ジャンル**: 横スクロールシューティング。主人公は**カラス**。浄化の儀式を成し遂げる旅。
- **世界観**: 異界の「穢れ」が侵食した世界。灰の街道、汚染された水路、封印研究所、崩落の高架、墜ちた方舟、蒼の深淵、次元の裂け目……といったダークで廃墟的なステージ。ボスは巨骸・粘体・擬態・鉄翼・門番・蒼穢の女王・ヴォイドなど。
- **トーン**: ダークファンタジー、終末感、儀式と浄化、一羽のカラスの使命と挫折。

---

## 2. ゲームオーバーBGMに求めること

| 項目 | 内容 |
|------|------|
| **即座に「ゲームオーバー」とわかる** | 聴いた瞬間に「敗北・終了・やり直し」と伝わること。明るい曲や盛り上がる曲ではない。 |
| **世界観の反映** | カラス・穢れ・廃墟・儀式の失敗・運命が絶たれた感じ。暗く、諦めや静かな絶望がにじむ。 |
| **長さ** | 15〜30秒程度の短いループ、または 30〜60秒の一曲。ゲームオーバー画面でループ再生する想定。 |
| **用途** | `audio/gameover.mp3` として配置。体力0で BGM を止め、ゲームオーバーSE の後にこのBGMを再生。 |

---

## 3. SUNO 用プロンプト案（英語）

SUNO は英語プロンプトが効きやすいため、そのまま貼れる形で書きます。

### 3.1 短いプロンプト（スタイル指定）

```
Instrumental, game over BGM, dark fantasy, short loop, 20 seconds. Sad, defeat, one low piano note then quiet strings, no victory, no hope, crow and ruined world, ritual failed, minimal, somber.
```

### 3.2 やや長いプロンプト（雰囲気を細かく）

```
Instrumental only. Game over screen music for a dark fantasy shoot'em up. Mood: defeat, failure, quiet despair. A single crow's destiny cut short. Ruins, corruption, ritual failed. Start with one deep piano or bell note, then very sparse strings or pad. No drums, no triumph. Melancholic, 25 seconds, loopable. Like the moment the screen fades to "GAME OVER".
```

### 3.3 キーワード集（SUNOのスタイル欄や説明にコピペ用）

- **Style / Genre**: `instrumental`, `dark ambient`, `game over`, `sad piano`, `minimal`, `somber`, `dark fantasy`
- **Mood**: `defeat`, `failure`, `quiet despair`, `melancholic`, `no hope`, `ritual failed`, `ruins`
- **Avoid**: `epic`, `victory`, `triumphant`, `upbeat`, `happy`, `lyrics`, `vocals`

---

## 4. 日本語でのイメージ（制作時のメモ）

- **冒頭**: 一発、低いピアノまたは鐘のような音で「終わり」を告げる。派手にしない。
- **その後**: ごく少ない弦やパッドで、静かに沈んでいく。ループしても違和感が少ないフレーズ。
- **全体**: カラスが落ち、儀式が破れ、世界はまだ穢れたまま——という「やり直しを促す静けさ」。

---

## 5. 技術メモ（ゲーム側）

- ファイル名: `gameover.mp3`
- 配置: `109-crow's destiny/audio/gameover.mp3`
- 再生: `GAME_OVER` 状態で `sound.stopBGM()` のあと `sound.playGameOver()`（SE）→ `sound.playBGM('gameover')` で再生。
- ループ: 実装側で BGM はループ再生される想定。SUNOでループしやすい長さ・終わり方にするとよい。

---

## 6. 出典・参照

- シーン一覧: `docs/scene-list.md`
- BGM割り当て: 同上「BGM 割り当て」表
- レベル・世界観: `docs/level-spec.md`、`js/data/stages.js` のステージ名・説明

以上をSUNOの入力欄（スタイル・説明・歌詞なし）に組み合わせて使用してください。
