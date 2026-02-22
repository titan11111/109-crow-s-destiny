/**
 * CROW'S DESTINY — ゲームループ・状態・当たり判定・描画
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const STAGES = global.CrowDestiny.STAGES;
const IMG = global.CrowDestiny.IMG;
const clamp = global.CrowDestiny.clamp;
const dist = global.CrowDestiny.dist;
const rr = global.CrowDestiny.rr;
const ri = global.CrowDestiny.ri;
const Crow = global.CrowDestiny.Crow;
const Enemy = global.CrowDestiny.Enemy;
const Boss = global.CrowDestiny.Boss;
const Relic = global.CrowDestiny.Relic;
const RELIC_TYPES = global.CrowDestiny.RELIC_TYPES || [];
const Obstacle = global.CrowDestiny.Obstacle;
const spawnObstacle = global.CrowDestiny.spawnObstacle;
const Background = global.CrowDestiny.Background;
const FX = global.CrowDestiny.FX;
const TextOverlay = global.CrowDestiny.TextOverlay;
const EffectOverlay = global.CrowDestiny.EffectOverlay;
const SoundManager = global.CrowDestiny.SoundManager;
const loadAssets = global.CrowDestiny.loadAssets;
const drawHUD = global.CrowDestiny.drawHUD;
const VirtualJoystick = global.CrowDestiny.VirtualJoystick;
const saveJoystickSettings = global.CrowDestiny.saveJoystickSettings;
const applyDeadZoneAndSensitivity = global.CrowDestiny.applyDeadZoneAndSensitivity;

class Game {
    constructor() {
        this.cvs = document.getElementById('gameCanvas');
        this.c = this.cvs.getContext('2d');
        this.cvs.width = CFG.W; this.cvs.height = CFG.H;
        this.keys = {};
        this.state = "INSTRUCTIONS";
        this.sound = new SoundManager();
        this.sound.loadSettings();
        this.crow = new Crow(this.sound);
        this.bg = new Background();
        this.fx = new FX();
        this.txt = new TextOverlay();
        this.efx = new EffectOverlay();
        this.enemies = []; this.eBullets = []; this.relics = []; this.obstacles = [];
        this.boss = null; this.score = 0; this.frame = 0;
        this.stageIdx = 0; this.blueK = 0; this.blueCD = 0; this.eCD = 0;
        this.stateT = 0; this.fadeA = 0; this.fadeD = 0; this.slowT = 0; this.arena = false; this.obsCD = 0;
        this.paused = false;
        this._lastBossBGMForm = -1;
        /** ボス3 MIRROR WALK 用: 直近3秒のプレイヤー座標（約180フレーム） */
        this.playerPathHistory = [];
        /** フローティングジョイスティック（画面左半分タッチで移動） */
        this.joystick = new VirtualJoystick(this.cvs, (fx, fy) => {
            this.keys['JoystickX'] = fx;
            this.keys['JoystickY'] = fy;
        });
        this.joystick.setup();
        this.setupJoystickSettingsUI();

        window.addEventListener('keydown', e => {
            if (e.code === 'Escape') {
                this.togglePauseIfAllowed();
                e.preventDefault();
                return;
            }
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
            if (!this.sound.initialized) this.sound.init();
            if (this.state === 'TITLE') this.sound.playBGM('opening');
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });
        this.setupTouch();

        document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        let lastTap = 0;
        document.addEventListener('touchend', e => {
            const now = Date.now(); if (now - lastTap <= 300) e.preventDefault(); lastTap = now;
            if (!this.sound.initialized) this.sound.init();
            if (this.state === 'TITLE') this.sound.playBGM('opening');
        }, false);
        document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
        document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

        loadAssets().then(() => {
            const ls = document.getElementById('loading-screen');
            if (ls) { ls.style.opacity = '0'; ls.style.pointerEvents = 'none'; }
            setTimeout(() => { if (ls) ls.style.display = 'none'; }, 1500);
        });
        this.loop();
    }

    setupTouch() {
        const k = (a, v) => { this.keys[a] = v; };
        const bind = (id, a) => {
            const b = document.getElementById(id); if (!b) return;
            const down = e => {
                e.preventDefault(); e.stopPropagation();
                try { navigator.vibrate?.(15); } catch (_) {}
                k(a, true);
            };
            const up = () => k(a, false);
            /* pointerdown と touchstart の両方でバインド（iOS 14以前では touchstart の方が応答が早い） */
            b.addEventListener('pointerdown', down, { passive: false }); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
            b.addEventListener('touchstart', down, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); up(); }, { passive: false }); b.addEventListener('touchcancel', up);
            b.addEventListener('contextmenu', e => e.preventDefault());
        };
        bind('btn-left', 'TouchLeft'); bind('btn-right', 'TouchRight'); bind('btn-up', 'TouchUp'); bind('btn-down', 'TouchDown');
        bind('btn-dash', 'TouchDash'); bind('btn-start', 'TouchStart');
        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) {
            const openSettings = (e) => {
                e.preventDefault();
                e.stopPropagation();
                try { navigator.vibrate?.(15); } catch (_) {}
                this.paused = true;
                const ov = document.getElementById('joystick-settings-overlay');
                if (ov) { ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false'); }
            };
            btnSettings.addEventListener('pointerdown', openSettings, { passive: false });
            btnSettings.addEventListener('touchstart', openSettings, { passive: false });
        }
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            const toggle = (e) => { e.preventDefault(); e.stopPropagation(); try { navigator.vibrate?.(15); } catch (_) {} this.togglePauseIfAllowed(); };
            btnPause.addEventListener('pointerdown', toggle, { passive: false });
            btnPause.addEventListener('touchstart', toggle, { passive: false });
        }
    }

    togglePauseIfAllowed() {
        const canPause = ['PLAYING', 'BOSS_INTRO', 'BOSS_FIGHT', 'STAGE_CLEAR', 'LAST_BOSS_2TO3_CUTSCENE'].includes(this.state);
        if (!canPause) return;
        this.paused = !this.paused;
    }

    get sd() { return STAGES[this.stageIdx]; }
    get scrollSpd() { return this.bg.scrolling ? this.bg.speed : 0; }

    startStage() {
        this.sound.stopBGM();
        this.state = "NARRATION"; this.stateT = 0;
        this.enemies = []; this.eBullets = []; this.relics = []; this.obstacles = [];
        this.boss = null; this.blueK = 0; this.blueCD = ri(300, 500); this.eCD = 0; this.arena = false; this.obsCD = ri(60, 120);
        this.bg.scrolling = true; this.bg.setStage(this.sd); this.fadeA = 0; this.fadeD = 0; this.slowT = 0;
    }

    restart() {
        this.sound.stopBGM();
        this.crow = new Crow(this.sound); this.enemies = []; this.eBullets = []; this.relics = []; this.obstacles = []; this.boss = null;
        this.score = 0; this.frame = 0; this.stageIdx = 0; this.fx = new FX(); this.txt = new TextOverlay(); this.efx = new EffectOverlay();
        this.bg = new Background();         this.state = "TITLE"; this.stateT = 0; this.fadeA = 0; this.slowT = 0; this._lastBossBGMForm = -1; this.lastBossForm = undefined;
    }

    applyRelic(r) {
        this.sound.playItem();
        const e = r.type.effect;
        if (e === "HEAL") { this.crow.hp = Math.min(this.crow.maxHp, this.crow.hp + 30); this.efx.add("HEAL", "#44ff44", 50); }
        else if (e === "BARRIER") { this.crow.barrier = 480; this.efx.add("BARRIER", "#aaeeff", 50); }
        else if (e === "SLOW") { this.slowT = 360; this.efx.add("SLOW", "#cc88ff", 50); }
        else if (e === "BOMB") {
            this.efx.add("BOMB", "#ff4400", 50);
            this.enemies.forEach(en => { if (en.active) { en.hp = 0; en.anim.set('DEATH'); this.fx.burst(en.x, en.y, en.color, 12); this.score += 100; } });
            this.eBullets = []; if (this.boss && this.boss.active && this.boss.arrived && !(this.boss.idx === 4 && this.boss.domeShieldT > 0)) this.boss.takeDamage(40, this.fx); this.fx.big(this.crow.cx, this.crow.cy, "#ff4400");
        }
        this.fx.burst(r.x, r.y, r.type.color, 18, 4);
    }

    spawnEnemies() {
        if (this.arena) return;
        this.eCD--;
        if (this.eCD <= 0) {
            this.eCD = ri(this.sd.spawnMin || 40, this.sd.spawnMax || 80);
            const y = rr(60, CFG.H - 80);
            const useSprite = [1, 2, 3, 4, 5, 6].indexOf(this.stageIdx) >= 0 && Math.random() < 0.3;
            this.enemies.push(new Enemy(CFG.W + 40, y, this.sd, false, useSprite ? this.stageIdx : undefined));
        }
        if (this.blueK < 3) {
            this.blueCD--;
            if (this.blueCD <= 0) {
                this.blueCD = ri(400, 700);
                const useSprite = [1, 2, 3, 4, 5, 6].indexOf(this.stageIdx) >= 0 && Math.random() < 0.3;
                this.enemies.push(new Enemy(CFG.W + 40, rr(80, CFG.H - 100), this.sd, true, useSprite ? this.stageIdx : undefined));
            }
        }
    }

    spawnObstacles() {
        if (this.arena) return;
        this.obsCD--; if (this.obsCD <= 0) { this.obsCD = ri(80, 180); this.obstacles.push(spawnObstacle(this.stageIdx)); }
    }

    checkCollisions() {
        const cr = this.crow;
        for (let fi = cr.feathers.length - 1; fi >= 0; fi--) {
            const f = cr.feathers[fi]; if (!f.active) continue;
            for (const en of this.enemies) {
                if (!en.active || en.anim.state === 'DEATH') continue;
                const bulletR = (f.isBeam || f.isGalaxy) ? (f.isGalaxy ? 64 : 56) : 48;
                if (dist(f.x, f.y, en.x, en.y) < bulletR) {
                    en.takeDamage((f.isBeam || f.isGalaxy) ? 14 + (cr.weaponLevel - 1) * 2 : 8 + (cr.weaponLevel - 1) * 2, this.fx); this.sound.playHit(); f.active = false;
                    if (en.hp <= 0) { this.score += en.isBlue ? 500 : 100; if (en.isBlue) { this.blueK++; this.fx.burst(en.x, en.y, "#44aaff", 30, 7); this.sound.playBluePurify(); this.txt.show(`蒼穢 浄化 (${this.blueK}/3)`, "#44aaff", 80, 24, CFG.W / 2, 100); } if (Math.random() < (en.isBlue ? 0.5 : 0.15)) this.relics.push(new Relic(en.x, en.y)); } break;
                }
            }
            if (this.boss && this.boss.active && this.boss.arrived && f.active && dist(f.x, f.y, this.boss.x, this.boss.y) < this.boss.hitRadius) {
                if (this.boss.idx === 4 && this.boss.domeShieldT > 0) { f.active = false; } else {
                    this.boss.takeDamage((f.isBeam || f.isGalaxy) ? 10 + cr.weaponLevel : 6 + cr.weaponLevel, this.fx); this.sound.playHit(); f.active = false;
                }
            }
            if (this.boss && this.boss.idx === 2 && this.boss.mirrorClones && f.active) {
                const bulletR = (f.isBeam || f.isGalaxy) ? (f.isGalaxy ? 64 : 56) : 48;
                for (const clone of this.boss.mirrorClones) {
                    if (clone.hp <= 0) continue;
                    if (dist(f.x, f.y, clone.x, clone.y) < bulletR) {
                        clone.hp = 0; this.sound.playHit(); f.active = false; this.fx.burst(clone.x, clone.y, '#7B00FF', 12, 4);
                        break;
                    }
                }
            }
        }
        for (const b of this.eBullets) { if (!b.active || b.noDamage) continue; if (dist(b.x, b.y, cr.cx, cr.cy) < (b.satellite ? 18 : 11)) { cr.takeDamage(b.satellite ? 12 : 8, this.fx); if (b.satellite) this.fx.burst(b.x, b.y, '#00FFAA', 14, 5); b.active = false; } }
        for (const en of this.enemies) { if (!en.active || en.anim.state === 'DEATH') continue; if (dist(en.x, en.y, cr.cx, cr.cy) < 33) cr.takeDamage(10, this.fx); }
        if (this.boss && this.boss.active && this.boss.arrived && dist(this.boss.x, this.boss.y, cr.cx, cr.cy) < this.boss.playerHitRadius) {
            if (this.boss.idx === 0 && this.boss.dashT > 0) this.fx.shake = Math.max(this.fx.shake || 0, 25);
            cr.takeDamage(15, this.fx);
        }
        for (const ob of this.obstacles) { if (!ob.active) continue; if (ob.hits(cr.x, cr.y, cr.w, cr.h)) cr.takeDamage(6, this.fx); }
        for (const r of this.relics) { if (!r.active) continue; if (dist(r.x, r.y, cr.cx, cr.cy) < 12) { r.active = false; this.applyRelic(r); } }
    }

    triggerBoss() {
        this.sound.stopBGM();
        if (this.stageIdx === 6) this.lastBossForm = 0;
        this.state = "BOSS_INTRO"; this.stateT = 0; this.bg.scrolling = false; this.arena = true;
        this.enemies.forEach(e => { if (e.active && e.anim.state !== 'DEATH') e.active = false; });
        this.eBullets = []; this.obstacles = []; this.txt.show(`「${this.sd.bossName}」が現れた…`, "#ff0000", 150, 36, CFG.W / 2, CFG.H / 2);
    }

    update() {
        if (this.paused) return;
        this.frame++; this.stateT++;
        /* ジョイスティック: 左パネルDOMジョイスティックがあれば優先、なければキャンバス左半分の仮想ジョイスティック */
        delete this.keys['JoystickX'];
        delete this.keys['JoystickY'];
        const domJoy = typeof window !== 'undefined' && window.crowDestinyJoystick;
        if (domJoy && (domJoy.x !== 0 || domJoy.y !== 0)) {
            this.keys['JoystickX'] = domJoy.x;
            this.keys['JoystickY'] = domJoy.y;
        } else {
            this.joystick.update();
        }
        this.fx.update(); this.txt.update(); this.efx.update(); this.bg.update();
        /** 覚醒レベル: Lv.2=10000, Lv.3=25000, Lv.4=55000, Lv.5=80000, Lv.6=100000。レベルアップ時は「LEVEL UP!」表示＋SE */
        if (this.crow) {
            const oldLv = this.crow.weaponLevel;
            const LEVEL_THRESHOLDS = [0, 10000, 25000, 55000, 80000, 100000];
            let newLv = 1;
            for (let i = LEVEL_THRESHOLDS.length - 1; i >= 1; i--) {
                if (this.score >= LEVEL_THRESHOLDS[i]) { newLv = i + 1; break; }
            }
            this.crow.weaponLevel = newLv;
            if (newLv > oldLv) {
                this.txt.show("LEVEL UP!", "#ffcc00", 100, 64, CFG.W / 2, CFG.H / 2);
                this.sound.playLevelUp();
            }
        }
        if (this.slowT > 0) this.slowT--;
        if (this.fadeD !== 0) this.fadeA = clamp(this.fadeA + this.fadeD * 0.02, 0, 1);

        const start = this.keys['Space'] || this.keys['Enter'] || this.keys['KeyZ'] || this.keys['TouchStart'];
        if (start) { this.keys['Space'] = false; this.keys['Enter'] = false; this.keys['KeyZ'] = false; this.keys['TouchStart'] = false; }

        if (this.state === "INSTRUCTIONS") {
            if (start) {
                if (!this.sound.initialized) this.sound.init();
                this.state = "TITLE";
                this.stateT = 0;
                this.sound.playBGM('opening');
            }
            return;
        }
        if (this.state === "TITLE") {
            if (start) { this.sound.playTitleStart(); this.startStage(); }
            return;
        }
        if (this.state === "NARRATION") {
            if (this.stateT === 1) { this.txt.show(`— 第${this.stageIdx + 1}章 : ${this.sd.name} —`, "#ff4d00", 200, 38, CFG.W / 2, CFG.H / 2 - 60); this.sd.desc.split('\n').forEach((l, i) => this.txt.show(l, "#e0cda7", 200, 26, CFG.W / 2, CFG.H / 2 + i * 40)); }
            if (this.stateT > 220 || (this.stateT > 40 && start)) {
                this.state = "PLAYING"; this.stateT = 0;
                this.sound.playBGM('stage' + (this.stageIdx + 1));
            }
            return;
        }
        if (this.state === "PLAYING") {
            this.crow.update(this.keys); this.spawnEnemies(); this.spawnObstacles();
            const ss = this.scrollSpd; this.enemies.forEach(e => e.update(this.crow.cx, this.crow.cy, this.eBullets, ss));
            this.eBullets.forEach(b => { b.x += b.vx; b.y += b.vy; if (b.x < -30 || b.x > CFG.W + 30 || b.y < -30 || b.y > CFG.H + 30) b.active = false; });
            this.relics.forEach(r => r.update(ss)); this.obstacles.forEach(o => o.update(ss)); this.checkCollisions();
            this.enemies = this.enemies.filter(e => e.active); this.crow.feathers = this.crow.feathers.filter(f => f.active); this.eBullets = this.eBullets.filter(b => b.active); this.relics = this.relics.filter(r => r.active); this.obstacles = this.obstacles.filter(o => o.active);
            if (this.crow.hp <= 0) { this.state = "GAME_OVER"; this.stateT = 0; this.sound.stopBGM(); this.sound.playGameOver(); this.sound.playBGM('gameover'); return; } if (this.blueK >= 3) this.triggerBoss(); return;
        }
        if (this.state === "BOSS_INTRO") {
            this.crow.update(this.keys); this.crow.feathers.forEach(f => { f.x += f.vx; f.y += f.vy; f.life++; if (f.x < -30 || f.x > CFG.W + 30) f.active = false; }); this.crow.feathers = this.crow.feathers.filter(f => f.active);
            if (this.stateT > 120) {
                const form = this.stageIdx === 6 ? (this.lastBossForm ?? 0) : undefined;
                this.boss = new Boss(this.sd, this.stageIdx, form);
                this.state = "BOSS_FIGHT"; this.stateT = 0;
                if (this.stageIdx <= 5) this.sound.playBGM('boss');
                else { this._lastBossBGMForm = 0; this.sound.playBGM('boss7'); }
            }
            return;
        }
        /** ラスボス 第二形態→第三形態（猫神）移行カットシーン：画像の左→右ワイプ＋コメント、終了後に第三形態スポーン */
        if (this.state === "LAST_BOSS_2TO3_CUTSCENE") {
            const CUTSCENE_DUR = 360;
            if (this.stateT >= CUTSCENE_DUR) {
                this.boss = new Boss(this.sd, 6, 2);
                this._lastBossBGMForm = 2;
                this.sound.playBGM('lastboss2');
                this.state = "BOSS_FIGHT";
                this.stateT = 0;
                this.txt.show("第3形態 — 猫神", "#ff4466", 120, 32, CFG.W / 2, CFG.H / 2 - 30);
            }
            return;
        }
        if (this.state === "BOSS_FIGHT") {
            /* ラスボスBGM: 第1形態=boss7, 第2形態=lastboss1(lastboss.mp3), 第3形態=lastboss2(lastboss2.mp3) */
            if (this.stageIdx === 6 && this.boss && this.boss.active) {
                const form = this.boss.form;
                if (form !== this._lastBossBGMForm) {
                    this._lastBossBGMForm = form;
                    if (form === 0) this.sound.playBGM('boss7');
                    else if (form === 1) this.sound.playBGM('lastboss1');
                    else this.sound.playBGM('lastboss2');
                }
            }
            let keys = this.keys;
            if (this.boss && this.boss.idx === 3 && this.boss.mirrorActiveT > 0) {
                keys = { ...this.keys, ArrowLeft: this.keys['ArrowRight'], ArrowRight: this.keys['ArrowLeft'], KeyA: this.keys['KeyD'], KeyD: this.keys['KeyA'], TouchLeft: this.keys['TouchRight'], TouchRight: this.keys['TouchLeft'] };
            }
            this.crow.update(keys);
            if (this.boss && this.boss.idx === 3) {
                this.playerPathHistory.push({ x: this.crow.cx, y: this.crow.cy });
                if (this.playerPathHistory.length > 180) this.playerPathHistory.shift();
            }
            const bossOpts = { sound: this.sound };
            if (this.boss && this.boss.idx === 3) bossOpts.playerPath = this.playerPathHistory;
            this.boss.update(this.crow.cx, this.crow.cy, this.eBullets, this.enemies, this.fx, this.sd, bossOpts);
            if (this.boss && this.boss.idx === 3) {
                this.crow.aimOffset = 0;
                if (this.boss.glitchFieldRect) {
                    const r = this.boss.glitchFieldRect;
                    if (this.crow.cx >= r.x && this.crow.cx <= r.x + r.w && this.crow.cy >= r.y && this.crow.cy <= r.y + r.h)
                        this.crow.aimOffset = this.boss.aimOffsetRad;
                }
            }
            this.enemies.forEach(e => e.update(this.crow.cx, this.crow.cy, this.eBullets, 0));
            this.eBullets.forEach(b => {
                if (b.homing) {
                    const dx = this.crow.cx - b.x; const dy = this.crow.cy - b.y; const d = Math.hypot(dx, dy) || 1;
                    const wantA = Math.atan2(dy, dx); const curA = Math.atan2(b.vy, b.vx);
                    let da = wantA - curA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
                    const turn = (15 * Math.PI / 180) / 60; const newA = curA + Math.max(-turn, Math.min(turn, da));
                    const spd = Math.hypot(b.vx, b.vy);
                    b.vx = Math.cos(newA) * spd; b.vy = Math.sin(newA) * spd;
                }
                b.x += b.vx; b.y += b.vy;
                if (b.x < -30 || b.x > CFG.W + 30 || b.y < -30 || b.y > CFG.H + 30) b.active = false;
            });
            this.relics.forEach(r => r.update(0)); this.checkCollisions(); this.enemies = this.enemies.filter(e => e.active); this.crow.feathers = this.crow.feathers.filter(f => f.active); this.eBullets = this.eBullets.filter(b => b.active); this.relics = this.relics.filter(r => r.active);
            if (this.crow.hp <= 0) { this.state = "GAME_OVER"; this.stateT = 0; this.sound.stopBGM(); this.sound.playGameOver(); this.sound.playBGM('gameover'); return; }
            if (this.boss && !this.boss.active && this.boss.anim && this.boss.anim.done) {
                if (this.stageIdx === 6 && this.lastBossForm !== undefined && this.lastBossForm < 2) {
                    this.lastBossForm++;
                    // 第二形態→第三形態（猫神）への移行時は専用カットシーンを挟む
                    if (this.lastBossForm === 2) {
                        this.state = "LAST_BOSS_2TO3_CUTSCENE";
                        this.stateT = 0;
                        this.boss = null; // カットシーン終了後に第三形態をスポーンする
                    } else {
                        this.boss = new Boss(this.sd, 6, this.lastBossForm);
                        this.txt.show(`第${this.lastBossForm + 1}形態 —`, "#ff4466", 120, 32, CFG.W / 2, CFG.H / 2 - 30);
                    }
                } else {
                    this.score += 1000 * (this.stageIdx + 1); for (let i = 0; i < 3; i++) this.relics.push(new Relic(this.boss.x + rr(-40, 40), this.boss.y + rr(-20, 20)));
                    this.state = "STAGE_CLEAR"; this.stateT = 0; this.sound.stopBGM(); this.sound.playStageClear();
                    this.txt.show("STAGE CLEAR", "#ffcc00", 180, 48, CFG.W / 2, CFG.H / 2 - 40); this.txt.show(`— ${this.sd.name} 浄化完了 —`, "#e0cda7", 180, 24, CFG.W / 2, CFG.H / 2 + 10);
                }
            } return;
        }
        if (this.state === "STAGE_CLEAR") {
            this.crow.update(this.keys); this.relics.forEach(r => r.update(0)); this.relics.forEach(r => { if (r.active && dist(r.x, r.y, this.crow.cx, this.crow.cy) < 12) { r.active = false; this.applyRelic(r); } }); this.relics = this.relics.filter(r => r.active);
            if (this.stateT > 150) { this.crow.x += 8; this.crow.anim.set('DASH'); } if (this.stateT > 180) this.fadeD = 1;
            if (this.stateT > 230) {
                if (this.stageIdx < STAGES.length - 1) {
                    this.sound.playStageTransition();
                    this.stageIdx++; this.crow.x = 100; this.crow.y = CFG.H / 2 - 4; this.fadeD = -1; this.startStage();
                } else { this.state = "VICTORY"; this.stateT = 0; this.fadeD = -1; this.sound.playBGM('ending'); }
            } return;
        }
        if (this.state === "GAME_OVER") { if (this.stateT > 90 && start) this.restart(); return; }
        if (this.state === "VICTORY") { if (this.stateT > 150 && start) this.restart(); return; }
    }

    draw() {
        const c = this.c; c.save(); this.fx.applyShake(c); this.bg.draw(c);
        if (this.state === "INSTRUCTIONS") { this.drawInstructions(c); c.restore(); return; }
        if (this.state === "TITLE") { this.drawTitle(c); c.restore(); return; }
        if (this.state === "LAST_BOSS_2TO3_CUTSCENE") {
            this.drawLastBoss2To3Cutscene(c);
            this.txt.draw(c);
            c.restore();
            return;
        }
        const mirror = this.state === 'BOSS_FIGHT' && this.boss && this.boss.idx === 3 && this.boss.mirrorActiveT > 0;
        if (mirror) { c.save(); c.translate(CFG.W, 0); c.scale(-1, 1); c.translate(-CFG.W, 0); }
        this.obstacles.forEach(o => o.draw(c)); this.relics.forEach(r => r.draw(c)); this.enemies.forEach(e => e.draw(c));
        this.eBullets.forEach(b => { if (!b.active) return; c.save(); c.globalAlpha = 0.85; c.fillStyle = b.color; c.beginPath(); c.arc(b.x, b.y, b.r || 5, 0, Math.PI * 2); c.fill(); c.globalAlpha = 0.3; c.beginPath(); c.arc(b.x, b.y, (b.r || 5) + 4, 0, Math.PI * 2); c.fill(); c.restore(); });
        this.crow.drawFeathers(c); this.crow.drawTrail(c); this.crow.draw(c); if (this.boss) this.boss.draw(c); this.fx.draw(c); this.fx.drawArenaEffects(c); this.fx.drawFlash(c); this.efx.draw(c, this.crow);
        if (mirror) c.restore();
        if (this.boss && this.boss.idx === 3 && this.boss.berserk) {
            c.save(); c.globalAlpha = 0.6 + Math.sin(this.frame * 0.3) * 0.2; c.fillStyle = '#FF00FF'; c.font = 'bold 28px monospace'; c.textAlign = 'center';
            c.fillText('ＳＹＳＴＥＭ　ＢＲＥＡＫ', CFG.W / 2 + (this.frame % 3 - 1) * 2, 60); c.restore();
        }
        if (mirror) {
            c.save(); c.fillStyle = 'rgba(61,0,128,0.8)'; c.fillRect(0, 0, CFG.W, 32);
            c.fillStyle = '#FF00FF'; c.font = 'bold 18px monospace'; c.textAlign = 'center'; c.fillText('MIRROR ACTIVE', CFG.W / 2, 22);
            c.globalAlpha = 0.6; c.fillStyle = '#fff'; c.fillRect(0, (this.frame % 60) * (CFG.H / 60) % 32, CFG.W, 2); c.restore();
        }
        if (this.slowT > 0) { c.save(); c.globalAlpha = 0.05; c.fillStyle = "#cc88ff"; c.fillRect(0, 0, CFG.W, CFG.H); c.restore(); }
        if (this.state !== "NARRATION") drawHUD(c, this.crow, this.score, this.stageIdx, this.blueK); this.txt.draw(c);
        if (['PLAYING', 'BOSS_FIGHT', 'BOSS_INTRO', 'STAGE_CLEAR'].includes(this.state)) this.joystick.draw(c);
        if (this.state === "GAME_OVER") {
            c.fillStyle = "rgba(0,0,0,0.75)"; c.fillRect(0, 0, CFG.W, CFG.H); c.textAlign = "center"; c.fillStyle = "#ff0000"; c.font = "60px serif"; c.fillText("THE NIGHT ENDURES", CFG.W / 2, CFG.H / 2 - 20);
            c.fillStyle = "#e0cda7"; c.font = "22px serif"; c.fillText(`浄化された魂: ${this.score}`, CFG.W / 2, CFG.H / 2 + 20);
            if (this.stateT > 90) { c.globalAlpha = 0.5 + Math.sin(this.frame * 0.05) * 0.3; c.font = "18px serif"; c.fillText("— SPACE / START で再挑戦 —", CFG.W / 2, CFG.H / 2 + 60); } c.textAlign = "left";
        }
        if (this.state === "VICTORY") {
            if (IMG.title) { const img = IMG.title, iw = img.naturalWidth || 800, ih = img.naturalHeight || 600, scale = Math.max(CFG.W / iw, CFG.H / ih); c.drawImage(img, 0, 0, iw, ih, 0, 0, iw * scale, ih * scale); c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(0, 0, CFG.W, CFG.H); } else { c.fillStyle = "rgba(0,0,0,0.7)"; c.fillRect(0, 0, CFG.W, CFG.H); }
            c.textAlign = "center"; c.fillStyle = "#ffcc00"; c.font = "50px serif"; c.fillText("浄化の儀式、完遂せり", CFG.W / 2, CFG.H / 2 - 50);
            c.fillStyle = "#e0cda7"; c.font = "24px serif"; c.fillText("全ての穢れは祓われた。", CFG.W / 2, CFG.H / 2); c.fillText("黒きカラスは夜明けの空へ還る。", CFG.W / 2, CFG.H / 2 + 35); c.font = "20px serif"; c.fillText(`最終スコア: ${this.score}`, CFG.W / 2, CFG.H / 2 + 75);
            if (this.stateT > 150) { c.globalAlpha = 0.5 + Math.sin(this.frame * 0.05) * 0.3; c.font = "18px serif"; c.fillText("— SPACE / START で再び —", CFG.W / 2, CFG.H / 2 + 120); } c.textAlign = "left";
        }
        if (this.fadeA > 0) { c.fillStyle = `rgba(0,0,0,${this.fadeA})`; c.fillRect(0, 0, CFG.W, CFG.H); }
        if (this.paused) {
            c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, CFG.W, CFG.H);
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = '#e0cda7'; c.font = 'bold 36px Cinzel, Georgia, serif';
            c.fillText('PAUSED', CFG.W / 2, CFG.H / 2 - 20);
            c.font = '18px serif'; c.fillStyle = 'rgba(224,205,167,0.9)';
            c.fillText('— ESC / Ⅱ で再開 —', CFG.W / 2, CFG.H / 2 + 20);
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        }
        c.restore();
    }

    setupJoystickSettingsUI() {
        const overlay = document.getElementById('joystick-settings-overlay');
        const backBtn = document.getElementById('btn-settings-back');
        const sensInput = document.getElementById('joystick-sensitivity');
        const deadInput = document.getElementById('joystick-deadzone');
        const outSens = document.getElementById('out-sensitivity');
        const outDead = document.getElementById('out-deadzone');
        const testArea = document.getElementById('joystick-test-area');
        const outTest = document.getElementById('out-test-xy');
        if (backBtn && overlay) {
            const close = (e) => {
                e.preventDefault();
                try { navigator.vibrate?.(15); } catch (_) {}
                overlay.classList.remove('is-open');
                overlay.setAttribute('aria-hidden', 'true');
                this.paused = false;
            };
            backBtn.addEventListener('pointerdown', close, { passive: false });
            backBtn.addEventListener('touchstart', close, { passive: false });
        }
        if (sensInput && outSens) {
            sensInput.value = this.joystick.settings.sensitivity;
            outSens.textContent = sensInput.value;
            sensInput.addEventListener('input', () => {
                const v = parseFloat(sensInput.value);
                this.joystick.settings.sensitivity = v;
                outSens.textContent = v.toFixed(1);
                saveJoystickSettings(this.joystick.settings);
            });
        }
        if (deadInput && outDead) {
            deadInput.value = this.joystick.settings.deadZone;
            outDead.textContent = deadInput.value;
            deadInput.addEventListener('input', () => {
                const v = parseFloat(deadInput.value);
                this.joystick.settings.deadZone = v;
                outDead.textContent = v.toFixed(2);
                saveJoystickSettings(this.joystick.settings);
            });
        }
        if (testArea && outTest) {
            const TEST_MAX_R = 80;
            let testTouchId = null, testOriginX = 0, testOriginY = 0;
            const show = (x, y) => { outTest.textContent = `X: ${x.toFixed(2)}  Y: ${y.toFixed(2)}`; };
            const end = () => {
                testTouchId = null;
                show(0, 0);
            };
            testArea.addEventListener('touchstart', (e) => {
                for (const t of e.changedTouches) {
                    if (testTouchId === null) {
                        testTouchId = t.identifier;
                        testOriginX = t.clientX;
                        testOriginY = t.clientY;
                        e.preventDefault();
                    }
                }
            }, { passive: false });
            testArea.addEventListener('touchmove', (e) => {
                for (const t of e.changedTouches) {
                    if (t.identifier !== testTouchId) continue;
                    e.preventDefault();
                    const dx = t.clientX - testOriginX;
                    const dy = t.clientY - testOriginY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const r = dist > 0 ? Math.min(dist, TEST_MAX_R) / TEST_MAX_R : 0;
                    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
                    let rawX = r * Math.cos(angle);
                    let rawY = r * Math.sin(angle);
                    const { deadZone, sensitivity } = this.joystick.settings;
                    const fx = applyDeadZoneAndSensitivity(rawX, deadZone, sensitivity);
                    const fy = applyDeadZoneAndSensitivity(rawY, deadZone, sensitivity);
                    const mag = Math.sqrt(fx * fx + fy * fy);
                    const outX = mag > 1 && mag > 0 ? fx / mag : fx;
                    const outY = mag > 1 && mag > 0 ? fy / mag : fy;
                    show(outX, outY);
                }
            }, { passive: false });
            testArea.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === testTouchId) end(); });
            testArea.addEventListener('touchcancel', (e) => { for (const t of e.changedTouches) if (t.identifier === testTouchId) end(); });
        }
    }

    /** ラスボス 第二形態撃破→第三形態（猫神）移行演出：lastbossadvance2to3.png を左から右へワイプ表示＋コメント */
    drawLastBoss2To3Cutscene(c) {
        const CUTSCENE_DUR = 360;
        const t = this.stateT;
        c.fillStyle = "rgba(0,0,0,0.92)";
        c.fillRect(0, 0, CFG.W, CFG.H);
        const img = IMG.lastbossadvance2to3;
        if (img && img.naturalWidth) {
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            // 左→右に変化：最初の70%の時間で画像を左から右へワイプ表示（0.1〜1.0）
            const wipeEnd = Math.floor(CUTSCENE_DUR * 0.7);
            const progress = t < 30 ? 0 : Math.min(1, (t - 30) / (wipeEnd - 30));
            const srcW = progress * iw;
            if (srcW > 0) {
                const scale = CFG.H / ih;
                const drawW = iw * scale;
                const drawH = CFG.H;
                const dx = CFG.W / 2 - (progress * drawW) / 2;
                c.save();
                c.beginPath();
                c.rect(0, 0, CFG.W, CFG.H);
                c.clip();
                c.drawImage(img, 0, 0, srcW, ih, dx, 0, progress * drawW, drawH);
                c.restore();
            }
        }
        // コメント：第二形態撃破→猫神覚醒の流れに合わせた一文（少し遅れて表示・フェードイン）
        if (t >= 50) {
            const line1 = "第二形態を打ち破った！だが…これは終わりではない。";
            const line2 = "残骸から生まれし、真の支配者が君臨する——猫神、覚醒。";
            const fade = Math.min(1, (t - 50) / 40);
            c.save();
            c.globalAlpha = fade * (t > CUTSCENE_DUR - 50 ? Math.max(0, (CUTSCENE_DUR - t) / 50) : 1);
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillStyle = "#e8c8ff";
            c.font = "bold 26px Cinzel, Georgia, serif";
            c.fillText(line1, CFG.W / 2, CFG.H / 2 + 180);
            c.fillStyle = "#ff4466";
            c.font = "bold 28px Cinzel, Georgia, serif";
            c.fillText(line2, CFG.W / 2, CFG.H / 2 + 218);
            c.restore();
        }
    }

    drawInstructions(c) {
        c.fillStyle = "rgba(0,0,0,0.82)";
        c.fillRect(0, 0, CFG.W, CFG.H);
        const titleFont = "Cinzel, Georgia, serif";
        c.textAlign = "center";
        c.font = `bold 32px ${titleFont}`;
        c.fillStyle = "#e0cda7";
        c.fillText("取り扱い説明 — アイテム", CFG.W / 2, 72);
        c.font = `16px ${titleFont}`;
        c.fillStyle = "#8a7a5c";
        c.fillText("敵を倒すと聖遺物が落ちることがあります。取得すると以下の効果が発動します。", CFG.W / 2, 108);
        /* アイコンは60%サイズ・行間を広げて重なりを防ぎすっきり表示 */
        const iconScale = 0.6;
        const baseIconSize = 44;
        const iconSize = Math.round(baseIconSize * iconScale);
        const rowH = 92;
        const startY = 142;
        const iconX = 100;
        const textX = 175;
        for (let i = 0; i < RELIC_TYPES.length; i++) {
            const t = RELIC_TYPES[i];
            const cy = startY + i * rowH + rowH / 2;
            c.save();
            c.translate(iconX, cy);
            const scale = (iconSize / 80);
            c.scale(scale, scale);
            if (IMG.items && t.iconIndex !== undefined) {
                const sh = IMG.items, sw = sh.naturalWidth || 400, shh = sh.naturalHeight || 100, sliceW = sw / 4, sx = t.iconIndex * sliceW;
                c.globalAlpha = 0.95;
                c.drawImage(sh, sx, 0, sliceW, shh, -sliceW / 2, -shh / 2, sliceW, shh);
                c.globalAlpha = 1;
            } else {
                c.globalAlpha = 0.9;
                c.fillStyle = t.color;
                c.beginPath();
                c.arc(0, 0, 18, 0, Math.PI * 2);
                c.fill();
                c.globalAlpha = 1;
                c.strokeStyle = t.color;
                c.lineWidth = 2.5;
                if (t.icon === "cross") { c.fillStyle = t.color; c.fillRect(-2.5, -10, 5, 20); c.fillRect(-10, -2.5, 20, 5); }
                else if (t.icon === "shield") { c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(12, -6, 10, 4); c.quadraticCurveTo(6, 12, 0, 14); c.quadraticCurveTo(-6, 12, -10, 4); c.quadraticCurveTo(-12, -6, 0, -10); c.closePath(); c.stroke(); }
                else if (t.icon === "hourglass") { c.beginPath(); c.moveTo(-7, -10); c.lineTo(7, -10); c.lineTo(0, 0); c.lineTo(7, 10); c.lineTo(-7, 10); c.lineTo(0, 0); c.closePath(); c.stroke(); }
                else if (t.icon === "explosion") { c.beginPath(); for (let k = 0; k < 8; k++) { const a = (Math.PI * 2 / 8) * k, r = k % 2 === 0 ? 10 : 5, px = Math.cos(a) * r, py = Math.sin(a) * r; if (k === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.closePath(); c.stroke(); c.fillStyle = t.color; c.globalAlpha = 0.4; c.fill(); }
            }
            c.restore();
            c.textAlign = "left";
            c.font = `bold 17px ${titleFont}`;
            c.fillStyle = t.color;
            c.fillText(t.name, textX, cy - 4);
            c.font = "14px serif";
            c.fillStyle = "#b8a88a";
            c.fillText(t.desc || "", textX, cy + 16);
            c.textAlign = "center";
        }
        const subY = CFG.H - 52;
        c.font = `bold 18px ${titleFont}`;
        c.globalAlpha = 0.88 + Math.sin(this.frame * 0.06) * 0.12;
        c.strokeStyle = "rgba(0,0,0,0.8)";
        c.lineWidth = 3;
        c.lineJoin = "round";
        c.strokeText("— 下の START でオープニングへ —", CFG.W / 2, subY);
        c.fillStyle = "#f2e6d0";
        c.fillText("— 下の START でオープニングへ —", CFG.W / 2, subY);
        c.globalAlpha = 1;
        c.textAlign = "left";
    }

    drawTitle(c) {
        if (IMG.title) { const img = IMG.title, iw = img.naturalWidth || 800, ih = img.naturalHeight || 600, scale = Math.max(CFG.W / iw, CFG.H / ih); c.drawImage(img, 0, 0, iw, ih, 0, 0, iw * scale, ih * scale); c.fillStyle = "rgba(0,0,0,0.45)"; c.fillRect(0, 0, CFG.W, CFG.H); } else { c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(0, 0, CFG.W, CFG.H); }
        c.textAlign = "center"; const titleFont = "Cinzel, Georgia, serif";
        c.font = `bold 58px ${titleFont}`; c.fillStyle = "rgba(0,0,0,0.6)"; c.fillText("CROW'S DESTINY", CFG.W / 2 + 3, 173); c.fillStyle = "#ff4d00"; c.fillText("CROW'S DESTINY", CFG.W / 2, 170);
        c.font = `600 22px ${titleFont}`; c.fillStyle = "#c9b896"; c.fillText("THE RITUAL OF TWILIGHT", CFG.W / 2, 218);
        if (!IMG.crowSheet) {
            c.save(); c.translate(CFG.W / 2, 300); const s = 2.8 + Math.sin(this.frame * 0.03) * 0.3; c.scale(s, s);
            c.fillStyle = "#111"; c.strokeStyle = "#ff4d00"; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(9, -5, 8, 7, 0.2, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = "#ff0000"; c.beginPath(); c.arc(12, -7, 2.5, 0, Math.PI * 2); c.fill();
            const wa = Math.sin(this.frame * 0.08) * 0.5; c.save(); c.rotate(-wa); c.fillStyle = "#111"; c.beginPath(); c.moveTo(-2, -5); c.lineTo(-24, -16); c.lineTo(-19, -9); c.closePath(); c.fill(); c.stroke(); c.restore();
            c.save(); c.rotate(wa * 0.6); c.fillStyle = "#111"; c.beginPath(); c.moveTo(-2, 5); c.lineTo(-22, 14); c.lineTo(-17, 8); c.closePath(); c.fill(); c.stroke(); c.restore(); c.restore();
        }
        c.font = `16px ${titleFont}`; c.fillStyle = "#8a7a5c"; c.fillText("七つの穢れし地を浄化せよ。黒きカラスよ、翼を広げよ。", CFG.W / 2, 400);
        /* サブタイトル: 雰囲気を保ちつつ読みやすく（縁取り・最低輝度） */
        const subY = 455;
        c.font = `bold 20px ${titleFont}`;
        c.globalAlpha = 0.85 + Math.sin(this.frame * 0.06) * 0.15;
        c.strokeStyle = "rgba(0,0,0,0.9)"; c.lineWidth = 4; c.lineJoin = "round";
        c.strokeText("— SPACE / START で儀式を開始 —", CFG.W / 2, subY);
        c.fillStyle = "#f2e6d0";
        c.fillText("— SPACE / START で儀式を開始 —", CFG.W / 2, subY);
        c.globalAlpha = 1; c.textAlign = "left";
    }

    loop() { this.update(); this.draw(); requestAnimationFrame(() => this.loop()); }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Game = Game;

})(typeof window !== 'undefined' ? window : this);
