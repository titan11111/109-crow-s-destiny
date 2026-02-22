# CROW'S DESTINY — SUNO 指示文（世界観準拠）

ゲーム内の世界観に基づいた、オープニング・ラスボス戦・エンディング用の SUNO 用プロンプトです。

---

## 世界観の要点（参照元: stages.js, game.js, SPEC.md）

- **タイトル**: CROW'S DESTINY: THE RITUAL OF TWILIGHT（黒きカラスの運命、黄昏の儀式）
- **ジャンル**: 横スクロールアクション／ダークファンタジー
- **主人公**: 黒きカラス。七つの穢れし地を浄化する儀式を遂行する。
- **敵**: 穢れし者、蒼穢（蒼光の穢者）。異界の侵食、世界の境界の崩壊。
- **最終ステージ**: 次元の裂け目 — 「現実が軋む。世界の境界が消える。全ての根源がここにある。」
- **ラスボス**: 裂け目そのもの — ヴォイド（The Rift Itself — Void）
- **エンディング**: 「浄化の儀式、完遂せり」「全ての穢れは祓われた。」「黒きカラスは夜明けの空へ還る。」

---

## 1. オープニング（タイトル画面用）

**用途**: タイトル画面 BGM。プレイ前の雰囲気づくり。

**SUNO 指示文（日本語）**:
```
ダークファンタジー、ゲームタイトル画面、オープニングBGM。
黄昏と儀式をイメージした、荘厳で少し不気味なオーケストラ。
黒きカラスが七つの穢れし地を浄化する物語の始まり。
異界の侵食、穢れ、浄化の儀式といった世界観。
暗めのストリングスと低いブラス、控えめなコーラス。
テンポはゆったり（70–85 BPM）、ミステリアスで期待感のある導入。
歌詞なし、インストゥルメンタル。
```

**SUNO 指示文（English・短縮）**:
```
Dark fantasy game title screen, orchestral, solemn and slightly ominous,
twilight ritual atmosphere, 70-85 BPM, strings and brass, no vocals, instrumental.
```

---

## 2. ラスボス戦（裂け目そのもの — ヴォイド）

**用途**: 最終ステージ「次元の裂け目」、ラスボス「ヴォイド」戦の BGM。

**SUNO 指示文（日本語）**:
```
ゲームボス戦BGM、ラスボス、最高難度。
次元の裂け目、世界の境界が消える、全ての根源がここにある — という絶望と根源的な恐怖。
裂け目そのもの・ヴォイドとの決戦。現実が軋む緊張感。
激しいオーケストラ、重いドラム、不協和音とグロウ系のシンセで異界感を出す。
テンポは中〜速（120–140 BPM）、クライマックスに向かって盛り上がる。
歌詞なし、インストゥルメンタル。ダークファンタジー、エピックボスバトル。
```

**SUNO 指示文（English・短縮）**:
```
Final boss battle BGM, dimensional rift, void, reality crumbling.
Epic dark fantasy orchestral, intense drums, dissonant synths, 120-140 BPM.
No vocals, instrumental, climax build-up.
```

---

## 3. エンディング（浄化完遂・カラスは夜明けへ）

**用途**: 全7面クリア後のエンディング画面。「浄化の儀式、完遂せり」「黒きカラスは夜明けの空へ還る。」

**SUNO 指示文（日本語）**:
```
ゲームエンディングBGM、ダークファンタジー、浄化の儀式が完遂した後の安らぎ。
全ての穢れは祓われ、黒きカラスが夜明けの空へ還る — 希望と解放感。
穢れのない朝、静かな感動。ストリングスとピアノ中心、優しいコーラス可。
テンポはゆったり（60–75 BPM）、余韻と晴れやかさ。
歌詞なし、インストゥルメンタル。トワイライトから夜明けへの移行をイメージ。
```

**SUNO 指示文（English・短縮）**:
```
Game ending BGM, dark fantasy, ritual complete, hope and release.
Black crow returns to dawn — peaceful, strings and piano, 60-75 BPM.
No vocals, instrumental, twilight to dawn, gentle and uplifting.
```

---

## 参照したファイル

| ファイル | 参照した内容 |
|----------|----------------|
| `js/data/stages.js` | 全ステージ名・説明・ラスボス名（次元の裂け目、ヴォイド） |
| `js/game.js` | エンディング文言（浄化の儀式完遂、穢れ祓われた、夜明けの空へ還る）、タイトル文言 |
| `script.js` | 同上、タイトル「CROW'S DESTINY」「THE RITUAL OF TWILIGHT」、七つの穢れし地を浄化せよ |
| `SPEC.md` | ダークファンタジー、七つの穢れし地、浄化、蒼光の穢者 |
