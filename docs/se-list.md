# CROW'S DESTINY — 効果音（SE）一覧

**方針**: 効果音は全て**内部Web音声のみ**（Web Audio API の Oscillator / Gain 等で生成。外部ファイルは使わない）。

---

## 一覧表（実装すべき項目・実装済み有無）

| # | 効果音 | 発生タイミング | 実装 | 方式 | 備考 |
|:--:|--------|----------------|:----:|------|------|
| 1 | **発射** | 弾（羽）を発射した時 | ✅ 済 | 内部Web | playShoot() → playSEProcedural('shoot') |
| 2 | **被弾** | プレイヤーがダメージを受けた時 | ✅ 済 | 内部Web | playHit() → playSEProcedural('hit') |
| 3 | **アイテム取得** | レリックを取得した時 | ✅ 済 | 内部Web | playItem() → playSEProcedural('item') |
| 4 | **ダッシュ** | ダッシュを発動した時 | ✅ 済 | 内部Web | playDash() → playSEProcedural('dash') |
| 5 | **蒼穢浄化** | 蒼穢（青い敵）を撃破した時 | ✅ 済 | 内部Web | playBluePurify() → playSEProcedural('bluePurify') |
| 6 | **ステージクリア** | ボス撃破〜STAGE CLEAR 表示時 | ✅ 済 | 内部Web | playStageClear() → playSEProcedural('stageClear') |
| 7 | **ゲームオーバー** | 体力0で GAME_OVER になった瞬間 | ✅ 済 | 内部Web | playGameOver() → playSEProcedural('gameOver') |
| 8 | **タイトル決定** | START で儀式開始した時 | ✅ 済 | 内部Web | playTitleStart() → playSEProcedural('titleStart') |
| 9 | **ボス弾発射** | ボスが弾・子機・波動などを放った時 | ✅ 済 | 内部Web | playBossShot() → playSEProcedural('bossShot')（間引きあり） |
| 10 | **ボス大技** | ボスが大技を発動した時（紫炎・雷・ヒートビーム・デスロール等） | ✅ 済 | 内部Web | playBossBig() → playSEProcedural('bossBig') |
| 11 | **ボス予兆** | ボスが溜め・シールド・リング等の予兆を出した時 | ✅ 済 | 内部Web | playBossCharge() → playSEProcedural('bossCharge') |
| 12 | **レベルアップ** | スコア10000ごとに覚醒Lvが上がった時 | ✅ 済 | 内部Web | playLevelUp() → playSEProcedural('levelUp') |

---

## 実装詳細（内部Web音声）

- **発射 (shoot)**: ノコギリ波、高→低の短い音。連射時は重なり制限（最大4）。
- **被弾 (hit)**: 矩形波、中→低の短い音。
- **アイテム取得 (item)**: 内部Web音声の短い「取得」音（例: 上昇するトーン）。
- **ダッシュ (dash)**: 内部Web音声の短い「シュッ」系。
- **蒼穢浄化 (bluePurify)**: 正弦波の上昇トーン（浄化の清らかな音）。
- **ステージクリア (stageClear)**: 短い3音ファンファーレ（ド→ミ→ソ相当）。
- **ゲームオーバー (gameOver)**: ノコギリ波の下降トーン（重い終了感）。
- **タイトル決定 (titleStart)**: 短い2音の決定音。
- **ボス弾発射 (bossShot)**: 低めのノコギリ波で威圧感。連続発射時は間引き（CD約12フレーム）。
- **ボス大技 (bossBig)**: 充電〜解放の重い矩形波。
- **ボス予兆 (bossCharge)**: 短い正弦波の警告音。
- **レベルアップ (levelUp)**: 上昇する短いファンファーレ（ド→ミ→ソ→ド）。

外部ファイル（mp3 等）は使用しない。

---

## 参照コード

| ファイル | 内容 |
|----------|------|
| `js/audio/sound.js` | playSEProcedural(type), playShoot, playHit, playItem, playDash, playBluePurify, playStageClear, playGameOver, playTitleStart |
| `js/entities/crow.js` | 発射時 playShoot、被弾時 playHit、ダッシュ発動時 playDash |
| `js/game.js` | アイテム取得時 playItem（applyRelic 内）。蒼穢撃破時 playBluePurify。ボス撃破時 playStageClear。GAME_OVER 時 playGameOver。TITLE で START 時 playTitleStart。ボス戦では opts.sound を boss.update に渡し、各ボスが攻撃時に playBossShot / playBossBig / playBossCharge を呼ぶ。 |
| `js/entities/boss.js` | 各 updateBoss* 内で _playBossSE(opts, 'shot'|'big'|'charge') を攻撃タイミングに合わせて呼出。 |
