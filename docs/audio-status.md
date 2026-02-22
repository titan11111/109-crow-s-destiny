# CROW'S DESTINY — 内部音声API・ボス関連 実装状況

---

## 1. 内部音声APIの実装状況

### 1.1 初期化・ポリシー

| 項目 | 状態 | 実装箇所 |
|------|------|----------|
| AudioContext 初期化 | ✅ 実装済み | `sound.js` — `init()`（ユーザー操作後に呼ぶ） |
| suspended 時の resume | ✅ 実装済み | `ensureResumed()` — SE/BGM 再生前に呼出 |
| iOS/自動再生ポリシー対策 | ✅ 対応 | キー/タッチで `init()`、タイトルで BGM 開始 |

### 1.2 効果音（SE）

| 方式 | 内容 |
|------|------|
| **ファイルSE** | `config.js` の `AUDIO_ASSETS` に `seItem: null` のみ。**ファイルSEは未使用**。 |
| **手続きSE（Procedural）** | **全SEを Web Audio API で生成**（Oscillator + Gain）。`playSEProcedural(type)`。 |

**実装済み SE 一覧**

| type | メソッド | 発生タイミング |
|------|----------|----------------|
| shoot | playShoot() | 弾発射（重なり制限あり） |
| hit | playHit() | 被弾 / **ボスに命中** / ミミックコピー撃破 |
| item | playItem() | 聖遺物取得 |
| dash | playDash() | ダッシュ発動 |
| bluePurify | playBluePurify() | 蒼穢撃破 |
| stageClear | playStageClear() | ボス撃破〜STAGE CLEAR |
| gameOver | playGameOver() | ゲームオーバー |
| titleStart | playTitleStart() | START で開始 |
| stageTransition | playStageTransition() | ステージ移行時 |

### 1.3 BGM

| 項目 | 状態 | 備考 |
|------|------|------|
| 再生方式 | HTML `<Audio>` 要素 | `new Audio(src)`, `el.loop = true` |
| 音量・ループ | ✅ | `bgmVolume`, `el.loop = true` |
| 切り替え | ✅ | `stopBGM()` 後に `playBGM(key)` |
| 設定の永続化 | ✅ | `localStorage` で BGM/SE の on/off を保存・復元 |

---

## 2. ボス戦・ボス攻撃まわりの設定

### 2.1 BGM 割り当て（ボス戦）

| 状況 | BGM キー | ファイル | 再生タイミング |
|------|----------|----------|----------------|
| 1〜6面 ボス戦 | `boss` | audio/boss.mp3 | BOSS_FIGHT 開始時（stageIdx ≤ 5） |
| 7面 ボス 第1形態 | `boss7` | audio/boss7.mp3 | BOSS_FIGHT 開始時（stageIdx === 6）、形態0 |
| 7面 ボス 第2形態 | `lastboss1` | audio/lastboss.mp3 | 形態1へ移行時 |
| 7面 ボス 第3形態 | `lastboss2` | audio/lastboss2.mp3 | 形態2へ移行時 |

**コード上の流れ**

- `game.js` — `triggerBoss()`: ボス登場時に `stopBGM()`。
- BOSS_INTRO 終了後: `stageIdx <= 5` → `playBGM('boss')`、`stageIdx === 6` → `playBGM('boss7')`。
- BOSS_FIGHT 中（`stageIdx === 6`）: `this.boss.form` の変化を検知し、0→boss7、1→lastboss1、2→lastboss2 を再生。

→ **ボス戦 BGM の切り替えは設計どおり実装済み。**

### 2.2 ボス「攻撃」に紐づくSE

| 内容 | 状態 | 備考 |
|------|------|------|
| ボスが弾を撃つ音 | ✅ 実装済み | `playBossShot()` — 手続きSE。連続時は間引き（_bossShotCD） |
| ボス大技のSE | ✅ 実装済み | `playBossBig()` — 紫炎噴射・雷・ヒートビーム・デスロール・オーバードライブ等 |
| ボス予兆・溜めのSE | ✅ 実装済み | `playBossCharge()` — 紫炎前兆・プラズマリング・ドームシールド・ダイブボム等 |
| 自機弾がボスに命中 | ✅ 実装済み | `checkCollisions` で `this.sound.playHit()` |
| 自機がボスに接触ダメージ | ✅ 実装済み | `cr.takeDamage()` 内で被弾SE（crow 側で playHit） |
| ミミックのコピー撃破 | ✅ 実装済み | `this.sound.playHit()` |
| ボス撃破 | ✅ 実装済み | `playStageClear()` |

**結論**: ボス戦では BGM に加え、**ボス攻撃用SE（shot / big / charge）** を全7面ボスの攻撃タイミングで再生。`game.js` から `opts.sound` で `boss.update` に渡し、各 `updateBoss*` 内で `_playBossSE(opts, kind)` を呼ぶ。

---

## 3. 設定ファイルとの対応

| ファイル | 役割 |
|----------|------|
| `js/core/config.js` | `AUDIO_ASSETS`（SE用・現状 seItem のみ）, `BGM_ASSETS`（BGM キー → パス） |
| `js/audio/sound.js` | SoundManager — init, playSE, playSEProcedural, playBGM, stopBGM, loadSettings, toggleSE |
| `docs/bgm-list.md` | BGM キー・ファイル・用途一覧 |
| `docs/se-list.md` | SE 一覧・内部Web音声方針 |

---

## 4. チェック結果サマリ

- **内部音声API**: 初期化・resume・手続きSE・BGM 再生・設定保存まで実装済み。
- **ボス BGM**: 1〜6面は `boss`、7面は形態ごとに `boss7` / `lastboss1` / `lastboss2` に分岐済み。
- **ボス攻撃まわり**: ヒット/撃破に加え、**ボス弾発射（bossShot）・大技（bossBig）・予兆（bossCharge）** の手続きSEを実装済み。詳細は `docs/se-list.md`。
