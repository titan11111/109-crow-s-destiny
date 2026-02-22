# CROW'S DESTINY — iOS対応 UI 確認と課題

UI担当による、標準要件（game-standard-requirements.mdc）に基づく確認結果です。

---

## ✅ 実装済み

| 項目 | 状態 | 備考 |
|------|------|------|
| **ビューポート** | ✅ | `viewport` に `maximum-scale=1.0, user-scalable=no` 設定済み（index.html） |
| **touch-action: manipulation** | ✅ | `*` と `body` に指定（style.css）。ダブルタップズーム抑制 |
| **テキスト選択・コールアウト防止** | ✅ | `user-select: none`, `-webkit-touch-callout: none`（style.css） |
| **スクロール・バウンス防止** | ✅ | `overflow: hidden`, `position: fixed`, `overscroll-behavior: none`（html, body） |
| **touchmove preventDefault** | ✅ | `document.addEventListener('touchmove', ...)`（game.js） |
| **ダブルタップズーム防止（JS）** | ✅ | `touchend` で 300ms 以内の連続タップで `preventDefault`（game.js） |
| **ピンチジェスチャー防止** | ✅ | `gesturestart` / `gesturechange` / `gestureend` で `preventDefault`（game.js） |
| **Safe Area（下・左右）** | ✅ | `#controls` に `env(safe-area-inset-bottom/left/right)` 適用（style.css） |
| **タッチターゲット最小サイズ** | ✅ | 通常 56px、小型画面 46px、大型 62px。標準の 48px は通常時で充足 |
| **ボタン視覚フィードバック** | ✅ | `:active` で `transform: scale(.88)`, `opacity: 1`（style.css） |
| **tap-highlight 無効化** | ✅ | `-webkit-tap-highlight-color: transparent`（style.css） |
| **音声のユーザージェスチャー** | ✅ | キーまたはタップで `sound.init()` と BGM 開始（game.js）。iOS の自動再生制約に対応 |
| **レスポンシブコントロール** | ✅ | 高さ 600px 以下 / 800px 以上 / 横持ちでメディアクエリ（style.css） |
| **100dvh / 100vw** | ✅ | `#game-container` に `max-width: 100vw`, `max-height: 100dvh`（style.css） |
| **viewport-fit=cover** | ✅ | index.html の viewport に指定済み（Safe Area 有効化） |
| **Safe Area 上部** | ✅ | `#game-container` に `padding-top: env(safe-area-inset-top,0)`（style.css） |
| **触覚フィードバック** | ✅ | ボタン押下時に `navigator.vibrate(15)`（game.js） |
| **ランドスケープ 48px** | ✅ | 横向き時も min-width/height 48px（style.css） |
| **コンテナ高さ・Safe Area 整合** | ✅ | `#game-container` に `height:100dvh` + `box-sizing` + `padding-bottom`。canvas に `max-height: calc(100dvh - inset-top - inset-bottom)`（style.css） |
| **BGM playsInline** | ✅ | `Audio` 要素に `playsInline` / `playsinline` / `webkit-playsinline`（sound.js） |
| **AudioContext resume** | ✅ | `playBGM()` 冒頭で `ensureResumed()` を呼び、ユーザージェスチャー内で resume を保証（sound.js） |
| **vibrate 堅牢化** | ✅ | `try { navigator.vibrate?.(15); } catch (_) {}`（game.js） |
| **constant() レガシー** | ✅ | `padding-top/bottom` と canvas `max-height` に `constant(safe-area-inset-*)` を併記（style.css） |

---

## レビュー指摘への対応（抜け漏れ調査レポート）

以下は「iOS対応 UI 実装レビュー — 抜け漏れ調査レポート」の指摘に対する対応です。

| 指摘 | 対応内容 |
|------|----------|
| **1. Safe Area とキャンバス高さの関係** | `#game-container` に `height: 100dvh`・`box-sizing: border-box`・`overflow: hidden` を設定。`padding-bottom: env(safe-area-inset-bottom, 0)` を追加し、canvas に `max-height: calc(100dvh - inset-top - inset-bottom)` を指定して、padding 追加後もキャンバスがはみ出さないようにした。JS 側はキャンバス解像度を 960×540 固定のままとしており、表示サイズは CSS のみで制御。 |
| **2. viewport-fit=cover と下部 Safe Area** | コンテナに `padding-bottom` を追加し、コントロール領域（`#controls` は absolute）とゲーム領域の下端を Safe Area 内に収めた。二重適用にならないよう、コンテナで一括して下部余白を確保。 |
| **3. pointerdown と touchstart の競合** | 従来から **pointerdown と touchstart の両方** に同じハンドラをバインド済み。iOS 14 以前でも touchstart で即応答する。コメントで「iOS 14以前では touchstart の方が応答が早い」旨を明記（game.js）。 |
| **4. navigator.vibrate の呼び出し** | `try { navigator.vibrate?.(15); } catch (_) {}` に変更し、存在しない／常に false を返す実装でも例外が出ないようにした。 |
| **5. audio の playsinline / AudioContext resume** | BGM 用 `Audio` に `el.playsInline = true` および `playsinline` / `webkit-playsinline` 属性を付与。`playBGM()` 冒頭で `ensureResumed()` を呼び、ユーザージェスチャー内で AudioContext の resume を確実に実行（sound.js）。 |
| **6. env() の constant() レガシー** | `padding-top` / `padding-bottom` と canvas の `max-height` に、先に `constant(safe-area-inset-*)`、続けて `env(safe-area-inset-*, 0)` を指定（style.css）。 |
| **7. ランドスケープ時の dvh** | ゲーム内にソフトキーボードを開く画面はないため、現状は対応不要。dvh と vw の混在によるリフローは、キーボード表示時のみ問題になり得る旨を認識済み。 |

---

## ⚠️ 残課題・注意点

- **1. Safe Area 上部** → 対応済み。`#game-container` に `padding-top: env(safe-area-inset-top, 0);` を追加。
- **2. viewport-fit=cover** → 対応済み。viewport に `viewport-fit=cover` を追加。
- **3. 触覚フィードバック** → 対応済み。ボタン押下で `navigator.vibrate(15)` を実行（iOS は非対応のため Android 等で有効）。
- **4. 横向きタッチターゲット** → 対応済み。ランドスケープ時も 48px 以上に統一。
- **5. html の touch-action** → 対応済み。`touch-action: manipulation` に統一。

---

## 📋 リリース前チェック（iOS）

- [ ] iPhone Safari でダブルタップしてもズームしない
- [ ] 画面が意図せずスクロール・バウンスしない
- [ ] 最初のタップ/キー操作で音声が再生される
- [ ] ノッチ機で HUD が隠れない（Safe Area 上部の反映を実機確認）
- [ ] ボタンが 48px 以上で押しやすい（縦・横とも）
- [ ] 縦向き・横向きどちらでも操作可能であること
- [ ] 320px 幅（iPhone SE）〜 430px 幅で表示崩れがないこと
- [ ] 横向きでキャンバスが Safe Area 内に収まり、スクロールしないこと
- [ ] ノッチ機でコンテナの padding により HUD が隠れないこと（実機確認推奨: XS/11/14 Pro）

---

*最終確認: 上記「実装済み」は現行コードに基づく。レビュー指摘対応は「レビュー指摘への対応」節を参照。*
