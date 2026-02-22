/**
 * CROW'S DESTINY — ボス（多様な攻撃パターン）
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const Anim = global.CrowDestiny.Anim;
const IMG = global.CrowDestiny.IMG;
const rr = global.CrowDestiny.rr;
const Enemy = global.CrowDestiny.Enemy;
const clamp = global.CrowDestiny.clamp;
/** 全ボス共通: 表示・当たり判定を60%に縮小（その代わり画面内を動き回る） */
const BOSS_SIZE_SCALE = 0.6;

class Boss {
    constructor(sd, idx, form) {
        this.x = CFG.W + 80; this.y = 200; this.tx = CFG.W * 0.68; this.ty = CFG.H / 2 - 30;
        this.sd = sd; this.idx = idx; this.form = (idx === 6 && form != null) ? form : 0;
        /** 体力：全ボス2倍 ＋ ステージが上がるごとに10%増（1面=2.0倍、2面=2.2倍、3面=2.42倍…） */
        const hpScale = 2 * Math.pow(1.1, idx);
        if (idx === 6) {
            const baseHp = Math.floor((sd.bossHpBase || 660) / 3);
            const formMul = this.form === 0 ? 1 : (this.form === 1 ? 2 : 3);
            this.maxHp = Math.floor(baseHp * formMul * hpScale);
            this.hp = this.maxHp;
        } else {
            const base = sd.bossHpBase || 220;
            this.maxHp = Math.floor(base * hpScale);
            this.hp = this.maxHp;
        }
        this.active = true; this.arrived = false; this.timer = 0; this.phaseT = 0; this.phase = 0; this.maxPhases = 3 + Math.min(idx, 2);
        this.name = sd.bossName; this.color = sd.bossColor; this.hitFlash = 0;
        this.anim = new Anim({ IDLE: { frames: 4, loop: true, speed: 0.7 }, CHARGE: { frames: 4, loop: false, speed: 1.5 }, ATTACK: { frames: 4, loop: false, speed: 1.2 }, HIT: { frames: 3, loop: false, speed: 1 }, DEATH: { frames: 4, loop: false, speed: 0.6 } });
        this.atkCD = 0; this.chargeTarget = null;
        this.atkSpd = (sd.bossAtkSpd || 1.0) * (idx === 6 && this.form === 1 ? 2 : idx === 6 && this.form === 2 ? 3 : 1);
        this.laserWarn = 0; this.laserAngle = 0; this.clones = []; this.cloneCD = 0;
        this._drawW = 80; this._drawH = 80;
        /** 登場演出: 0〜INTRO_DUR でピクセルから明確に。輪郭明確後に当たり判定有効 */
        this.introT = 0; this.introDone = false; this.INTRO_DUR = 60;
        /** 撃破演出: DEATH 時にピクセル荒くして消える（残像なし） */
        this.deathT = 0;
        this._pixBuf = null;
        /** HP30%以下で狂乱モード（動き・弾・色変化） */
        this.berserk = false;
        /** 全ボス共通: 断末魔フェーズ（HP10%で一度完全停止→嵐の前の静けさ） */
        this.lastStandTriggered = false;
        this.lastStandFreezeT = 0;
        /** ボス1（穢れの先兵・彷徨う巨骸）専用 */
        if (idx === 0) {
            this.moveDir = 1; this._prevMoveDir = 1; this.telegraphT = 0; this.pendingAttack = null;
            this.boneBulletCD = 0; this.fingerBulletCD = 0; this.fingerBulletCount = 0;
            this.tailSwingCD = 0; this.purpleBeamCD = 0; this.purpleBeamTelegraph = 0; this.purpleBeamActive = 0; this.purpleBeamAngle = 0;
            this.scatterBurstCD = 0; this.grenadeLandings = [];
        }
        /** ボス2（粘体の母胎・ハイヴコア）専用 */
        if (idx === 1) {
            this.phase = 0; this.phaseT = 0;
            this.subUnitAngle = 0; this.satelliteCD = 0; this.laserWarnT = 0; this.laserRow = 0;
            this.plasmaRingCD = 0; this.plasmaRingPhase = 0; this.plasmaRingDelay = 0;
            this.drillCD = 0; this.drillT = 0; this.drillBack = false; this.drillY0 = 0;
            this.junkShowerCD = 0; this.junkShowerT = 0;
            this.coreRampageT = 0; this.coreRampageTargetX = 0; this.coreRampageTargetY = 0;
            this.rampTrail = [];
        }
        /** ボス3面（擬態する知性・ミミック）専用: テレポート・ノイズバレット・サンダーボルト・ミラーダブル・データ侵食波 */
        if (idx === 2) {
            this.teleportCD = 0; this.afterimages = [];
            this.noiseCD = 0; this.thunderCD = 0; this.thunderWarnT = 0; this.thunderActive = 0;
            this.mirrorClones = []; this.mirrorCD = 0;
            this.dataWaveCD = 0; this.paranoiaT = 0;
            this.portalResidue = null;
        }
        /** ボス4面（蒼穹の守護者・鉄翼）専用 */
        if (idx === 3) {
            this.flyDir = 1; this.flareCD = 0; this.heatBeamCD = 0; this.heatBeamWarn = 0; this.heatBeamActive = 0;
            this.scrapCD = 0; this.scrapT = 0; this.diveBombCD = 0; this.diveBombT = 0; this.diveTargetX = 0;
            this.deathRollT = 0; this.deathRollPath = [];
            this.outOfControlT = 0;
        }
        /** ボス5面（門番・多脚のガーディアン）専用 */
        if (idx === 4) {
            this.gatlingCD = 0; this.gatlingBurst = 0; this.legStabCD = 0; this.legStabT = 0;
            this.domeShieldT = 0; this.domeShieldCD = 0; this.pierceCD = 0;
            this.overdriveT = 0;
            this.energyTrail = [];
            this.armorPeelLevel = 0;
        }
        /** ボス6面（蒼穢の女王・ブルーコア）専用 */
        if (idx === 5) {
            this.frostNeedleCD = 0; this.glacialRingCD = 0; this.glacialRingPhase = 0;
            this.icicleRainT = 0; this.icicleRainCD = 0; this.crystalLaserCD = 0; this.crystalLaserWarn = 0; this.crystalLaserActive = 0;
            this.blizzardT = 0;
            this.iceTrail = [];
            this.angularPhase = 0;
        }
        /** ラスボス第3形態：瞬間移動＋残像（数秒残る） */
        if (idx === 6) {
            this.voidTeleportCD = 0;
            this.voidAfterimages = [];
            this.VOID_AFTERIMAGE_LIFE = 180;
        }
    }
    get hitRadius() {
        if (!this.introDone) return 0;
        let r = Math.max(this._drawW, this._drawH) / 2 * 0.95;
        if (this.idx === 3 && this.deathRollT > 0) r *= 1.3;
        return r;
    }
    get playerHitRadius() {
        if (!this.introDone) return 0;
        return Math.max(this._drawW, this._drawH) / 2 * 0.95;
    }
    /** ボス攻撃SE（opts.sound が渡されているときのみ）。shot は間引き用に CD あり */
    _playBossSE(opts, kind) {
        if (!opts || !opts.sound) return;
        if (kind === 'shot') {
            if ((this._bossShotCD || 0) > 0) return;
            this._bossShotCD = 12;
            opts.sound.playBossShot();
        } else if (kind === 'big') {
            opts.sound.playBossBig();
        } else if (kind === 'charge') {
            opts.sound.playBossCharge();
        }
    }
    update(px, py, bullets, enemies, fx, sd) {
        if (this.anim.state === 'DEATH') { this.deathT++; this.anim.update(); if (this.anim.done) this.active = false; return; }
        this.berserk = this.hp <= this.maxHp * 0.3;
        this.timer++; this.anim.update();
        if (!this.arrived) {
            this.x += (this.tx - this.x) * 0.03; this.y += (this.ty - this.y) * 0.03;
            if (Math.abs(this.x - this.tx) < 5) { this.arrived = true; }
            return;
        }
        if (!this.introDone) {
            this.introT++;
            if (this.introT >= this.INTRO_DUR) this.introDone = true;
            return;
        }
        if (this.lastStandFreezeT > 0) {
            this.lastStandFreezeT--;
            return;
        }
        this._bossShotCD = Math.max(0, (this._bossShotCD || 0) - 1);
        const opts = arguments[6] || {};
        if (this.idx === 0) { this.updateBoss1(px, py, bullets, fx, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        if (this.idx === 1) { this.updateBoss2(px, py, bullets, enemies, fx, sd, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        if (this.idx === 2) { this.updateBossMimic(px, py, bullets, fx, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        if (this.idx === 3) { this.updateBossIronWing(px, py, bullets, fx, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        if (this.idx === 4) { this.updateBossGuardian(px, py, bullets, fx, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        if (this.idx === 5) { this.updateBossBluecore(px, py, bullets, fx, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        if (this.idx === 6) { this.updateBossVoid(px, py, bullets, fx, opts); if (this.hitFlash > 0) this.hitFlash--; return; }
        const formStatMul = (this.idx === 6 && this.form === 1) ? 2 : (this.idx === 6 && this.form === 2) ? 3 : 1;
        this.phaseT++;
        const phaseDurBase = Math.max(160, 280 - this.idx * 18);
        let phaseDur = this.berserk ? Math.floor(phaseDurBase * 0.6) : phaseDurBase;
        if (this.idx === 6 && formStatMul > 1) phaseDur = Math.max(40, Math.floor(phaseDur / formStatMul));
        if (this.phaseT > phaseDur) { this.phase = (this.phase + 1) % this.maxPhases; this.phaseT = 0; this.chargeTarget = null; this.laserWarn = 0; }
        const ampX = 45 + this.idx * 14, ampY = 22 + this.idx * 10;
        const moveMul = this.berserk ? 1.55 : 1;
        this.x = this.tx + (Math.sin(this.timer * 0.015) * ampX + Math.cos(this.timer * 0.023) * (ampX * 0.45)) * moveMul;
        this.y = this.ty + (Math.sin(this.timer * 0.02) * ampY + Math.sin(this.timer * 0.031) * (ampY * 0.55)) * moveMul;
        const bulletMul = (1 + this.idx * 0.15) * (this.berserk ? 1.35 : 1) * formStatMul;
        const bulletColor = this.berserk ? "#ff4466" : this.color;
        if (this.phase === 0) {
            this.atkCD--; const intv = Math.max(6, Math.round((22 - this.idx * 2) / this.atkSpd));
            if (this.atkCD <= 0) {
                this.atkCD = intv; this.anim.set('ATTACK');
                const n = 6 + this.idx * 2, baseAngle = this.timer * 0.025;
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i + baseAngle, spd = (2.6 + this.idx * 0.25) * bulletMul;
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: bulletColor, r: 5 });
                }
                if (this.idx >= 3) for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i + baseAngle + 0.15, spd = (2.2 + this.idx * 0.2) * bulletMul;
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: bulletColor, r: 4 });
                }
            }
        } else if (this.phase === 1) {
            if (!this.chargeTarget) this.chargeTarget = { x: px, y: py };
            const dx = this.chargeTarget.x - this.x, dy = this.chargeTarget.y - this.y, d = Math.hypot(dx, dy) || 1, cSpd = 7 + this.idx * 0.6;
            if (d > 30) { this.x += dx / d * cSpd; this.y += dy / d * cSpd; this.anim.set('CHARGE'); }
            else {
                this.chargeTarget = null; fx.burst(this.x, this.y, this.color, 18 + this.idx * 2, 5);
                const burst = 10 + this.idx * 3, spd = (2.6 + this.idx * 0.2) * bulletMul;
                for (let i = 0; i < burst; i++) { const a = (Math.PI * 2 / burst) * i; bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: bulletColor, r: 4 }); }
                if (this.idx >= 4) for (let i = 0; i < burst; i++) { const a = (Math.PI * 2 / burst) * i + 0.2; bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd * 0.85, vy: Math.sin(a) * spd * 0.85, active: true, color: bulletColor, r: 3 }); }
            }
        } else if (this.phase === 2) {
            if (this.phaseT % Math.max(50, 110 - this.idx * 12) === 0) { enemies.push(new Enemy(CFG.W + 30, rr(60, CFG.H - 80), sd, false, this.idx)); if (this.idx >= 5) enemies.push(new Enemy(CFG.W + 40, rr(80, CFG.H - 100), sd, false, this.idx)); }
            this.atkCD--; const intv2 = Math.max(12, Math.round((45 - this.idx * 4) / this.atkSpd));
            if (this.atkCD <= 0) {
                this.atkCD = intv2; const dx = px - this.x, dy = py - this.y, d = Math.hypot(dx, dy) || 1, spd = (3.2 + this.idx * 0.35) * bulletMul;
                const rays = 1 + Math.min(this.idx, 3);
                for (let r = 0; r < rays; r++) {
                    const off = (r - (rays - 1) / 2) * 0.12; const ax = Math.atan2(dy, dx) + off;
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(ax) * spd, vy: Math.sin(ax) * spd, active: true, color: bulletColor, r: 5 });
                }
            }
        } else if (this.phase === 3) {
            this.atkCD--; const spiralIntv = Math.max(2, 5 - Math.floor(this.idx / 2));
            if (this.atkCD <= 0) {
                this.atkCD = spiralIntv; const baseSpd = (2.2 + this.idx * 0.18) * bulletMul;
                const spirals = this.idx >= 2 ? 2 : 1;
                for (let s = 0; s < spirals; s++) {
                    const a = this.timer * (0.08 + s * 0.05) + s * Math.PI;
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * baseSpd, vy: Math.sin(a) * baseSpd, active: true, color: bulletColor, r: 4 });
                    if (this.idx >= 5) bullets.push({ x: this.x, y: this.y, vx: Math.cos(a + 0.4) * baseSpd * 0.9, vy: Math.sin(a + 0.4) * baseSpd * 0.9, active: true, color: bulletColor, r: 3 });
                }
            }
        } else if (this.phase === 4) {
            if (this.laserWarn < 55) { this.laserWarn++; this.laserAngle = Math.atan2(py - this.y, px - this.x); }
            else if (this.laserWarn === 55) {
                this.laserWarn++; const la = this.laserAngle, spd = (5 + this.idx * 0.4) * bulletMul;
                const beamCount = 7 + this.idx * 2, spread = 0.055 + this.idx * 0.008;
                for (let i = -Math.floor(beamCount / 2); i <= Math.floor(beamCount / 2); i++) {
                    const a = la + i * spread; bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: "#ff2200", r: 6 });
                }
                fx.burst(this.x, this.y, "#ff2200", 24 + this.idx * 2, 6);
                this.laserWarn = 0;
            }
        }
        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
        if (this.hitFlash > 0) this.hitFlash--;
    }

    /** ボス1: 穢れの先兵・彷徨う巨骸 — 骨弾バースト / 骨の指弾 / テイルスウィング / 紫炎噴射。ピンチで骨格崩壊散弾・ダブル紫炎 */
    updateBoss1(px, py, bullets, fx, opts) {
        const W = CFG.W; const H = CFG.H;
        const purple = '#9B59B6'; const purpleGlow = '#D7BDE2'; const flame = '#F39C12';
        const lrSpeed = (this.berserk ? 1.4 : 1) * (2.2 / 60 * 10);

        // 紫炎噴射の照射中は角度を自機方向にゆっくり振る
        if (this.purpleBeamActive > 0) {
            this.purpleBeamActive--;
            const wantA = Math.atan2(py - this.y, px - this.x);
            this.purpleBeamAngle += (wantA - this.purpleBeamAngle) * 0.08;
            const spd = 6; const r = 8;
            for (let i = 0; i < 3; i++) {
                const a = this.purpleBeamAngle + (i - 1) * (this.berserk ? 0.12 : 0);
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purple, r });
            }
            if (this.purpleBeamActive <= 0) this.purpleBeamCD = this.berserk ? 150 : 240;
            if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
            return;
        }

        // 紫炎の前兆（目が2秒かけて明るくなる＝約120フレーム）
        if (this.purpleBeamTelegraph > 0) {
            this.purpleBeamTelegraph--;
            if (this.purpleBeamTelegraph === 0) {
                this.purpleBeamAngle = Math.atan2(py - this.y, px - this.x);
                this.purpleBeamActive = 60; // 1秒照射
                this._playBossSE(opts, 'big');
                this.anim.set('ATTACK');
            }
            return;
        }

        // 予兆→発動の遅延処理（骨弾・テイル・骨格崩壊のみ予兆使用）
        if (this.telegraphT > 0) {
            this.telegraphT--;
            if (this.telegraphT === 0 && this.pendingAttack) {
                const atk = this.pendingAttack; this.pendingAttack = null;
                if (atk === 'bone') {
                    this._playBossSE(opts, 'shot');
                    const n = this.berserk ? 7 : 5;
                    const spreadHalf = (Math.PI / 180) * (this.berserk ? 50 : 40);
                    const baseAngle = Math.atan2(py - this.y, px - this.x);
                    for (let i = 0; i < n; i++) {
                        const t = (i / (n - 1 || 1)) - 0.5;
                        const a = baseAngle + t * spreadHalf;
                        const spd = 2.2;
                        bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purple, r: 8 });
                    }
                    this.anim.set('ATTACK');
                } else if (atk === 'tail') {
                    this._playBossSE(opts, 'shot');
                    for (let i = 0; i < 10; i++) {
                        const a = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.8;
                        const spd = 3 + Math.random() * 2;
                        bullets.push({ x: this.x, y: this.y + 20, vx: Math.cos(a) * spd * 0.3, vy: Math.sin(a) * spd, active: true, color: purpleGlow, r: 5 });
                    }
                    fx.burst(this.x, this.y, purple, 12, 4);
                    this.anim.set('ATTACK');
                } else if (atk === 'scatter') {
                    this._playBossSE(opts, 'big');
                    for (let i = 0; i < 24; i++) {
                        const a = Math.atan2(H / 2 - this.y, W / 2 - this.x) + (Math.random() - 0.5) * Math.PI * 0.7;
                        const spd = 3 + Math.random() * 3;
                        bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purpleGlow, r: 5 });
                    }
                    fx.burst(this.x, this.y, purple, 16, 5);
                }
            }
            return;
        }

        // 通常移動：画面を幅広く左右スウィング＋縦にゆっくり漂う（巨骸らしい重厚な軌道）
        const centerX = W * 0.5;
        const moveRange = (this.hp <= this.maxHp * 0.5) ? W * 0.52 : W * 0.38;
        this.x += this.moveDir * lrSpeed;
        let didTurn = false;
        if (this.x >= centerX + moveRange) { didTurn = this.moveDir === 1; this.moveDir = -1; this.x = centerX + moveRange; }
        if (this.x <= centerX - moveRange) { didTurn = this.moveDir === -1; this.moveDir = 1; this.x = centerX - moveRange; }
        this.y = this.ty + Math.sin(this.timer * 0.02) * (H * 0.22) + Math.sin(this.timer * 0.013) * (H * 0.08);
        this.y = clamp(this.y, H * 0.12, H * 0.55);
        if (didTurn) {
            fx.shake = Math.max(fx.shake || 0, 35);
            fx.burst(this.x, this.y, purple, 20, 6);
            if (fx.addFloorCrack) fx.addFloorCrack(this.x, H - 5, 45);
            for (let i = 0; i < 8; i++) {
                if (fx.addArenaDebris) fx.addArenaDebris(rr(0, W), -10, rr(-1, 1), 2 + Math.random() * 3, 90, purpleGlow, 6, 4);
            }
            this._playBossSE(opts, 'big');
        }
        this._prevMoveDir = this.moveDir;

        this.boneBulletCD--; this.fingerBulletCD--; this.tailSwingCD--; this.purpleBeamCD--; this.scatterBurstCD--;

        // ピンチ専用：骨格崩壊散弾
        if (this.berserk && this.scatterBurstCD <= 0) {
            this.scatterBurstCD = 200;
            this.telegraphT = 30; this.pendingAttack = 'scatter';
            return;
        }

        // 骨弾バースト — 3秒間隔（通常）/ 2秒（ピンチ）
        if (this.boneBulletCD <= 0) {
            this.boneBulletCD = this.berserk ? 120 : 180;
            this.telegraphT = 20; this.pendingAttack = 'bone';
            return;
        }

        // 骨の指弾 — 5発を連続で緩い追尾弾
        if (this.fingerBulletCD <= 0) {
            if (this.fingerBulletCount < 5) {
                this._playBossSE(opts, 'shot');
                const dx = px - this.x; const dy = py - this.y; const d = Math.hypot(dx, dy) || 1;
                const spd = 2.8;
                bullets.push({ x: this.x - 15, y: this.y, vx: (dx / d) * spd, vy: (dy / d) * spd, active: true, color: purpleGlow, r: 5, homing: true });
                this.fingerBulletCount++; this.fingerBulletCD = 8;
            } else {
                this.fingerBulletCount = 0; this.fingerBulletCD = 220;
            }
        }

        // テイルスウィング — 尾の薙ぎ払い＋骨破片10個
        if (this.tailSwingCD <= 0) {
            this.tailSwingCD = 280;
            this.telegraphT = 25; this.pendingAttack = 'tail';
            return;
        }

        // 紫炎噴射 — 前兆2秒ののち1秒照射
        if (this.purpleBeamCD <= 0 && this.purpleBeamTelegraph <= 0 && this.purpleBeamActive <= 0) {
            this.purpleBeamTelegraph = 120; // 2秒前兆
            this.purpleBeamCD = 360;
            this._playBossSE(opts, 'charge');
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    /** ボス2: 粘体の母胎・ハイヴコア — サテライトスポーン / プラズマリング / 溶岩ドリル / ジャンクシャワー。ピンチでコア暴走 */
    updateBoss2(px, py, bullets, enemies, fx, sd, opts) {
        const W = CFG.W; const H = CFG.H;
        const orange = '#E74C3C'; const ringColor = '#E67E22'; const junkColor = '#888888';

        this.subUnitAngle = (this.subUnitAngle || 0) + 0.02;

        // コア暴走（ピンチ専用・15秒間ランダム高速移動＋接触ダメージ）
        if (this.coreRampageT > 0) {
            this.coreRampageT--;
            if (this.coreRampageT % 12 === 0) {
                this.coreRampageTargetX = rr(80, W - 80); this.coreRampageTargetY = rr(80, H - 80);
            }
            if (this.hp <= this.maxHp * 0.3 && this.coreRampageT % 15 === 0) {
                this.rampTrail = this.rampTrail || [];
                this.rampTrail.push({ x: this.x, y: this.y, t: 70 });
                if (this.rampTrail.length > 3) this.rampTrail.shift();
            }
            const dx = this.coreRampageTargetX - this.x; const dy = this.coreRampageTargetY - this.y; const d = Math.hypot(dx, dy) || 1;
            const spd = 6;
            this.x += (dx / d) * spd; this.y += (dy / d) * spd;
            this.x = clamp(this.x, 60, W - 60); this.y = clamp(this.y, 60, H - 60);
            if (this.coreRampageT <= 0) { this.drillCD = 180; this.plasmaRingCD = 120; }
            if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
            return;
        }
        (this.rampTrail || []).forEach(tr => { tr.t--; });
        this.rampTrail = (this.rampTrail || []).filter(tr => tr.t > 0);

        // 溶岩ドリル：画面下部まで突進→引き戻し、軌跡に炎粒
        if (this.drillT > 0) {
            this.drillT--;
            const spd = 8;
            if (!this.drillBack) {
                this.y += spd;
                bullets.push({ x: this.x + rr(-15, 15), y: this.y, vx: rr(-0.5, 0.5), vy: 1.5, active: true, color: orange, r: 4 });
                if (this.y >= H - 50) { this.drillBack = true; fx.burst(this.x, this.y, orange, 20, 6); }
            } else {
                this.y -= spd * 0.7;
                bullets.push({ x: this.x + rr(-15, 15), y: this.y, vx: rr(-0.5, 0.5), vy: -1, active: true, color: orange, r: 3 });
                if (this.y <= this.drillY0) { this.drillT = 0; this.drillBack = false; this.drillCD = 280; }
            }
            this.anim.set('CHARGE');
            return;
        }

        // 通常位置：画面全体をゆっくりスライド＋上下に浮遊（母胎らしい有機的な動き）
        const slideRange = W * 0.42;
        this.x = this.tx + Math.sin(this.timer * 0.012) * slideRange + Math.cos(this.timer * 0.008) * (W * 0.12);
        this.y = this.ty + Math.sin(this.timer * 0.01) * (CFG.H * 0.2) + Math.sin(this.timer * 0.017) * (CFG.H * 0.08);
        this.x = clamp(this.x, W * 0.12, W - W * 0.12);
        this.y = clamp(this.y, CFG.H * 0.1, CFG.H * 0.5);

        this.satelliteCD--; this.plasmaRingCD--; this.drillCD--; this.junkShowerCD--;
        this.plasmaRingDelay = Math.max(0, (this.plasmaRingDelay || 0) - 1);
        this.junkShowerT = Math.max(0, (this.junkShowerT || 0) - 1);

        // ジャンクシャワー：5秒間ランダムに画面上部から破片
        if (this.junkShowerT > 0) {
            if (this.junkShowerT % 4 === 0) {
                bullets.push({ x: rr(0, W), y: -10, vx: rr(-1, 1), vy: 4 + Math.random() * 2, active: true, color: junkColor, r: 4 });
            }
            if (this.junkShowerT <= 0) this.junkShowerCD = 400;
            if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
            return;
        }

        // プラズマリング：同心円状に広がる炎のリング（3連 or 5連）、間をすり抜ける
        if (this.plasmaRingPhase > 0) {
            if (this.plasmaRingDelay <= 0) {
                const ringCount = this.berserk ? 5 : 3;
                const gap = 35; const spd = 2.5;
                const phaseIdx = ringCount - this.plasmaRingPhase;
                for (let side = 0; side < 2; side++) {
                    const y = this.y + (side === 0 ? -phaseIdx * gap : phaseIdx * gap);
                    bullets.push({ x: this.x, y, vx: -spd, vy: 0, active: true, color: ringColor, r: 6 });
                    bullets.push({ x: this.x, y, vx: spd, vy: 0, active: true, color: ringColor, r: 6 });
                }
                this.plasmaRingPhase--; this.plasmaRingDelay = 18;
            }
            if (this.plasmaRingPhase <= 0) this.plasmaRingCD = this.berserk ? 100 : 160;
            return;
        }

        if (this.plasmaRingCD <= 0) {
            this._playBossSE(opts, 'charge');
            this.plasmaRingPhase = this.berserk ? 5 : 3; this.plasmaRingDelay = 10;
        }

        // サテライトスポーン：翼端から子機（2体ずつ or ピンチで4体ずつ）、旋回しながら自機へ、接触で爆発
        if (this.satelliteCD <= 0) {
            this._playBossSE(opts, 'shot');
            const perSide = this.berserk ? 4 : 2;
            const spd = this.berserk ? 2.2 : 1.8;
            for (let side = 0; side < 2; side++) {
                const baseA = this.subUnitAngle + side * Math.PI;
                for (let i = 0; i < perSide; i++) {
                    const a = baseA + (i - (perSide - 1) / 2) * 0.25;
                    const sx = this.x + Math.cos(a) * 70; const sy = this.y + Math.sin(a) * 40;
                    const dx = px - sx; const dy = py - sy; const d = Math.hypot(dx, dy) || 1;
                    bullets.push({ x: sx, y: sy, vx: (dx / d) * spd, vy: (dy / d) * spd, active: true, color: '#00FFAA', r: 10, homing: true, satellite: true });
                }
            }
            fx.burst(this.x, this.y, '#00FF88', 10, 4);
            this.satelliteCD = this.berserk ? 140 : 220;
        }

        // 溶岩ドリル発動
        if (this.drillCD <= 0 && this.drillT <= 0) {
            this._playBossSE(opts, 'big');
            this.drillY0 = this.y; this.drillT = 120; this.drillBack = false;
        }

        // ジャンクシャワー発動（5秒＝300フレーム）
        if (this.junkShowerCD <= 0 && this.junkShowerT <= 0) {
            this.junkShowerT = 300; this.junkShowerCD = 450;
        }

        // ピンチ：コア暴走
        if (this.berserk && this.coreRampageT <= 0 && this.plasmaRingPhase <= 0 && this.drillT <= 0 && this.junkShowerT <= 0) {
            const roll = Math.random();
            if (roll < 0.008) { this._playBossSE(opts, 'big'); this.coreRampageT = 900; this.coreRampageTargetX = this.x; this.coreRampageTargetY = this.y; }
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    /** ボス3面: 擬態する知性・ミミック — テレポート・ノイズバレット・サンダーボルト・ミラーダブル・データ侵食波。ピンチでパラノイアフィールド */
    updateBossMimic(px, py, bullets, fx, opts) {
        const W = CFG.W; const H = CFG.H;
        const purple = '#7B00FF'; const purpleLight = '#C39BFF';

        this.teleportCD = (this.teleportCD || 0) - 1;
        this.noiseCD--; this.thunderCD--; this.mirrorCD--; this.dataWaveCD--;
        this.thunderWarnT = Math.max(0, (this.thunderWarnT || 0) - 1);
        this.thunderActive = Math.max(0, (this.thunderActive || 0) - 1);
        this.paranoiaT = Math.max(0, (this.paranoiaT || 0) - 1);

        // パラノイアフィールド（ピンチ専用）：画面全体に微細グリッチ弾
        if (this.paranoiaT > 0) {
            if (this.paranoiaT % 3 === 0) {
                for (let i = 0; i < 6; i++) {
                    const x = rr(0, W); const y = rr(0, H);
                    const a = Math.random() * Math.PI * 2; const spd = 1.5 + Math.random() * 1.5;
                    bullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purpleLight, r: 3 });
                }
            }
            if (this.paranoiaT <= 0) this.dataWaveCD = 120;
            this._updateMimicClones(bullets, px, py, purple, purpleLight, true);
            return;
        }

        // テレポート（HP60%以下でCD半減、HP30%以下で20%フェイクテレポート）— 画面内どこへでも
        if (this.teleportCD <= 0) {
            const cdBase = (this.hp <= this.maxHp * 0.6) ? (this.berserk ? 38 : 75) : (this.berserk ? 75 : 150);
            const fakeTeleport = this.hp <= this.maxHp * 0.3 && Math.random() < 0.2;
            if (this.afterimages) this.afterimages.push({ x: this.x, y: this.y, opacity: 0.5, t: 25 });
            if (!fakeTeleport) {
                const nx = rr(80, W - 80); const ny = rr(70, H * 0.6);
                this.portalResidue = { x: nx, y: ny, t: 30, maxT: 30 };
                if (typeof fx.arenaDarkCorners === 'number') fx.arenaDarkCorners = 45;
                this.x = nx; this.y = ny;
            }
            this.teleportCD = cdBase;
            if (this.berserk && this.noiseCD <= 0 && !fakeTeleport) {
                this.noiseCD = 30; this._playBossSE(opts, 'shot');
                for (let i = 0; i < 8; i++) {
                    const a = Math.atan2(py - this.y, px - this.x) + (Math.random() - 0.5) * 1.2;
                    const spd = 2 + Math.random() * 1.5;
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purple, r: 5 });
                }
            }
        }
        if (this.portalResidue) { this.portalResidue.t--; if (this.portalResidue.t <= 0) this.portalResidue = null; }

        // 通常浮遊：画面を不規則に漂う（擬態する知性らしい予測しづらい動き）
        this.x += Math.sin(this.timer * 0.02) * 1.2 + Math.cos(this.timer * 0.011) * 0.6;
        this.y += Math.cos(this.timer * 0.015) * 0.8 + Math.sin(this.timer * 0.019) * 0.4;
        this.x = clamp(this.x, 70, W - 70); this.y = clamp(this.y, 60, H * 0.65);

        // ノイズバレット：不規則軌道の弾8発
        if (this.noiseCD <= 0) {
            this.noiseCD = this.berserk ? 50 : 90; this._playBossSE(opts, 'shot');
            for (let i = 0; i < 8; i++) {
                const a = Math.atan2(py - this.y, px - this.x) + (Math.random() - 0.5) * 1.0;
                const spd = 2.2 + Math.random() * 1.2;
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purple, r: 6 });
            }
            this._mimicShootFromClones(bullets, px, py, purple);
        }

        // サンダーボルト：前兆1.5秒→直下に雷撃3本
        if (this.thunderWarnT > 0 && this.thunderActive <= 0) return;
        if (this.thunderActive > 0) {
            this.thunderActive--;
            const spacing = W / 4; const spd = 10;
            for (let i = -1; i <= 1; i++) {
                const tx = this.x + i * spacing;
                bullets.push({ x: tx, y: 0, vx: 0, vy: spd, active: true, color: '#FFDD00', r: 8 });
            }
            if (this.thunderActive <= 0) this.dataWaveCD = 100;
            return;
        }
        if (this.thunderCD <= 0 && this.thunderWarnT <= 0 && this.thunderActive <= 0) {
            this.thunderWarnT = 90; this.thunderCD = 280;
        }
        if (this.thunderWarnT === 1) {
            this._playBossSE(opts, 'big'); this.thunderActive = 45; fx.burst(this.x, this.y, '#FFDD00', 20, 6);
        }

        // データ侵食波：横一列の波動を上下2段、間に隙間
        if (this.dataWaveCD <= 0 && this.thunderWarnT <= 0) {
            this._playBossSE(opts, 'shot'); this.dataWaveCD = 200;
            const row1 = H * 0.35; const row2 = H * 0.7;
            for (let step = 0; step < W + 40; step += 22) {
                bullets.push({ x: step - 20, y: row1, vx: 8, vy: 0, active: true, color: purpleLight, r: 5 });
                bullets.push({ x: step - 20, y: row2, vx: 8, vy: 0, active: true, color: purpleLight, r: 5 });
            }
        }

        // ミラーダブル：コピー1体（ピンチで2体）、体力1で破壊可能、同じく弾を撃つ
        if (this.mirrorCD <= 0) {
            this.mirrorCD = 350;
            const n = this.berserk ? 2 : 1;
            for (let i = 0; i < n; i++) {
                this.mirrorClones.push({ x: this.x + rr(-60, 60), y: this.y + rr(-30, 30), hp: 1 });
            }
        }
        this._updateMimicClones(bullets, px, py, purple, purpleLight, false);

        // ピンチ：パラノイアフィールド
        if (this.berserk && this.paranoiaT <= 0 && this.dataWaveCD <= 30 && Math.random() < 0.006) {
            this._playBossSE(opts, 'big'); this.paranoiaT = 300;
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    _updateMimicClones(bullets, px, py, purple, purpleLight, paranoia) {
        const W = CFG.W; const H = CFG.H;
        for (let i = this.mirrorClones.length - 1; i >= 0; i--) {
            const c = this.mirrorClones[i];
            if (c.hp <= 0) { this.mirrorClones.splice(i, 1); continue; }
            c.x += (this.x - c.x) * 0.06; c.y += (this.y - c.y) * 0.06;
            if (!paranoia && Math.random() < 0.02) {
                const dx = px - c.x; const dy = py - c.y; const d = Math.hypot(dx, dy) || 1;
                const spd = 2.5;
                bullets.push({ x: c.x, y: c.y, vx: (dx / d) * spd, vy: (dy / d) * spd, active: true, color: purpleLight, r: 4, noDamage: false });
            }
        }
    }

    _mimicShootFromClones(bullets, px, py, purple) {
        (this.mirrorClones || []).forEach(c => {
            if (c.hp <= 0) return;
            for (let i = 0; i < 5; i++) {
                const a = Math.atan2(py - c.y, px - c.x) + (Math.random() - 0.5) * 0.8;
                const spd = 2 + Math.random() * 1;
                bullets.push({ x: c.x, y: c.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purple, r: 4 });
            }
        });
    }

    /** ボス4面: 蒼穹の守護者・鉄翼 — フレアバースト / ヒートコアビーム / スクラップストーム / ダイブボム。ピンチでデスロール */
    updateBossIronWing(px, py, bullets, fx, opts) {
        const W = CFG.W; const H = CFG.H;
        const red = '#E74C3C'; const orange = '#E67E22';

        this.flareCD--; this.heatBeamCD--; this.scrapCD--; this.diveBombCD--;
        this.heatBeamWarn = Math.max(0, (this.heatBeamWarn || 0) - 1);
        this.heatBeamActive = Math.max(0, (this.heatBeamActive || 0) - 1);
        this.deathRollT = Math.max(0, (this.deathRollT || 0) - 1);

        // デスロール（ピンチ専用）：高速で縦横無尽に飛行、軌跡に炎当たり判定
        if (this.deathRollT > 0) {
            if (this.deathRollT === 420) this._playBossSE(opts, 'big');
            const spd = 7; const t = this.deathRollT;
            this.x += Math.sin(t * 0.2) * spd * 2; this.y += Math.cos(t * 0.15) * spd;
            this.x = clamp(this.x, 80, W - 80); this.y = clamp(this.y, 60, H - 60);
            bullets.push({ x: this.x, y: this.y, vx: 0, vy: 0, active: true, color: orange, r: 14, trail: true });
            if (this.deathRollT <= 0) { this.flareCD = 60; this.diveBombCD = 120; }
            return;
        }

        // ダイブボム：画面上部で一瞬止まり、自機方向へ急降下（HP50%以下で曲線追尾）
        if (this.diveBombT > 0) {
            this.diveBombT--;
            if (this.diveBombT > 30) {
                this.x += (this.diveTargetX - this.x) * 0.15; this.y = Math.max(80, this.y - 2);
            } else {
                const curve = this.hp <= this.maxHp * 0.5;
                if (curve) this.x += (px - this.x) * 0.08;
                this.y += 12;
                bullets.push({ x: this.x, y: this.y - 30, vx: 0, vy: 0, active: true, color: red, r: 10, trail: true });
                if (this.y > H + 50) {
                    this.diveBombT = 0; this.y = 60; this.x = rr(100, W - 100); this.diveBombCD = 200;
                }
            }
            if (this.diveBombT === 29) fx.shake = Math.max(fx.shake || 0, 22);
            this.anim.set('CHARGE');
            return;
        }

        // スクラップストーム：急降下しながら翼から金属破片
        if (this.scrapT > 0) {
            this.scrapT--;
            this.y += 5; this.x += this.flyDir * 2;
            for (let i = 0; i < 3; i++) {
                bullets.push({ x: this.x + rr(-40, 40), y: this.y, vx: rr(-2, 2), vy: 4 + Math.random() * 2, active: true, color: '#888888', r: 5 });
            }
            if (this.scrapT <= 0) { this.y = 80; this.x = clamp(this.x, 100, W - 100); this.scrapCD = 220; }
            return;
        }

        // ヒートコアビーム：前兆ののち幅広熱線2秒
        if (this.heatBeamActive > 0) {
            this.heatBeamActive--;
            const spd = 7; const beamCount = 11;
            for (let i = -beamCount / 2; i <= beamCount / 2; i++) {
                const a = Math.atan2(H - this.y, px - this.x) + i * 0.04;
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: '#ff2200', r: 6 });
            }
            if (this.heatBeamActive <= 0) this.heatBeamCD = 280;
            return;
        }
        if (this.heatBeamWarn > 0) return;

        // 通常往復飛行：画面を大きく横断＋上下にバンク（蒼穹の守護者らしい広い空域）
        const ampX = W * 0.38; const ampY = H * 0.22;
        const moveMul = this.berserk ? 1.5 : 1;
        this.x = this.tx + Math.sin(this.timer * 0.012) * ampX * moveMul + Math.cos(this.timer * 0.007) * (W * 0.08);
        this.y = this.ty + Math.sin(this.timer * 0.008) * ampY + Math.sin(this.timer * 0.015) * (H * 0.06);
        this.x = clamp(this.x, 90, W - 90); this.y = clamp(this.y, H * 0.15, H * 0.6);
        this.flyDir = Math.sin(this.timer * 0.012) >= 0 ? 1 : -1;

        if (this.flareCD <= 0) {
            this._playBossSE(opts, 'shot');
            this.flareCD = this.berserk ? 70 : 110;
            const n = this.berserk ? 8 : 5;
            const baseA = Math.atan2(0, this.flyDir) + (this.flyDir > 0 ? -0.4 : 0.4);
            for (let side = 0; side < 2; side++) {
                const sign = side === 0 ? -1 : 1;
                for (let i = 0; i < n; i++) {
                    const a = baseA + sign * (0.15 * i + 0.05);
                    const spd = 4;
                    bullets.push({ x: this.x + sign * 45, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: red, r: 5 });
                }
            }
        }

        if (this.heatBeamCD <= 0) {
            this.heatBeamWarn = 70; this.heatBeamCD = 320;
        }
        if (this.heatBeamWarn === 1) {
            this._playBossSE(opts, 'big'); this.heatBeamActive = 120; fx.burst(this.x, this.y, '#ff2200', 24, 6);
        }

        if (this.scrapCD <= 0 && this.scrapT <= 0) {
            this._playBossSE(opts, 'shot'); this.scrapT = 90; this.scrapCD = 260;
        }

        if (this.diveBombCD <= 0 && this.diveBombT <= 0) {
            this._playBossSE(opts, 'charge'); this.diveTargetX = px; this.diveBombT = 60; this.diveBombCD = 240;
        }
        if (this.hp <= this.maxHp * 0.15) this.outOfControlT = 999;

        if (this.berserk && this.deathRollT <= 0 && this.diveBombT <= 0 && this.scrapT <= 0 && Math.random() < 0.005) {
            this.deathRollT = 420;
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    /** ボス5面: 門番・多脚のガーディアン — サイバーガトリング / レッグスタブ / ドームシールド / ピアスショット。ピンチでオーバードライブ */
    updateBossGuardian(px, py, bullets, fx, opts) {
        const W = CFG.W; const H = CFG.H;
        const cyan = '#00dddd';

        this.gatlingCD--; this.legStabCD--; this.domeShieldCD--; this.pierceCD--;
        this.legStabT = Math.max(0, (this.legStabT || 0) - 1);
        this.domeShieldT = Math.max(0, (this.domeShieldT || 0) - 1);
        this.overdriveT = Math.max(0, (this.overdriveT || 0) - 1);

        const inOverdrive = this.berserk && this.overdriveT > 0;
        const highSpeed = this.hp <= this.maxHp * 0.4;
        const moveMul = highSpeed ? 1.8 : ((this.berserk && this.overdriveT <= 0) ? 1.4 : 1);
        this.energyTrail = this.energyTrail || [];
        if (this.timer % 5 === 0) {
            this.energyTrail.push({ x: this.x, y: this.y, t: 120 });
            if (this.energyTrail.length > 24) this.energyTrail.shift();
        }
        this.energyTrail.forEach(tr => { tr.t--; });
        this.energyTrail = this.energyTrail.filter(tr => tr.t > 0);
        // 門番らしく重厚に画面を巡回（HP40%以下で高速＋予測不能な跳ね）
        let dx = Math.sin(this.timer * 0.01) * (W * 0.36 * moveMul) + Math.cos(this.timer * 0.014) * (W * 0.1);
        let dy = Math.sin(this.timer * 0.012) * (H * 0.2) + Math.sin(this.timer * 0.018) * (H * 0.06);
        if (highSpeed) {
            dx += Math.sin(this.timer * 0.31) * (W * 0.04) + Math.cos(this.timer * 0.07) * (W * 0.02);
            dy += Math.sin(this.timer * 0.023) * (H * 0.03);
        }
        this.x = this.tx + dx; this.y = this.ty + dy;
        this.x = clamp(this.x, 80, W - 80); this.y = clamp(this.y, H * 0.12, H * 0.55);

        if (this.overdriveT > 0) {
            this.gatlingCD = 0; this.legStabCD = 0; this.pierceCD = 0;
        }

        const invul = this.domeShieldT > 0;

        if (this.gatlingCD <= 0 && (!invul || inOverdrive)) {
            const burst = inOverdrive ? 5 : 3; const perBurst = this.berserk ? 12 : 10;
            if (this.gatlingBurst < burst) {
                this._playBossSE(opts, 'shot');
                this.gatlingBurst++;
                const dx = px - this.x; const dy = py - this.y; const d = Math.hypot(dx, dy) || 1;
                for (let i = 0; i < perBurst; i++) {
                    const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
                    const spd = 4;
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: cyan, r: 4, homing: this.berserk });
                }
                this.gatlingCD = 6;
            } else {
                this.gatlingBurst = 0; this.gatlingCD = inOverdrive ? 40 : 120;
            }
        }

        if (this.legStabCD <= 0 && this.legStabT <= 0 && (!invul || inOverdrive)) {
            this._playBossSE(opts, 'shot'); this.legStabT = 90; this.legStabCD = 200;
        }
        if (this.legStabT > 0 && this.legStabT % 4 === 0) {
            const legY = H * (this.berserk ? 0.75 : 0.5);
            const n = this.berserk ? 4 : 2; const half = (n - 1) * 45;
            const slide = Math.sin(this.legStabT * 0.08) * 3;
            for (let i = 0; i < n; i++) {
                const lx = this.x - half + i * 90;
                bullets.push({ x: lx, y: legY, vx: slide, vy: 2, active: true, color: cyan, r: 12 });
            }
        }

        if (this.domeShieldCD <= 0 && this.domeShieldT <= 0 && !inOverdrive) {
            this._playBossSE(opts, 'charge'); this.domeShieldT = 180; this.domeShieldCD = 400;
        }

        if (this.pierceCD <= 0 && (!invul || inOverdrive)) {
            this._playBossSE(opts, 'shot');
            this.pierceCD = inOverdrive ? 50 : 180;
            const baseA = Math.atan2(py - this.y, px - this.x);
            for (let i = -1; i <= 1; i++) {
                const a = baseA + i * 0.2; const spd = 9;
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: cyan, r: 6 });
            }
        }

        if (this.berserk && this.overdriveT <= 0 && this.domeShieldT <= 0 && Math.random() < 0.004) {
            this._playBossSE(opts, 'big'); this.overdriveT = 900;
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    /** ボス6面: 蒼穢の女王・ブルーコア — フロストニードル / グレイシャルリング / アイシクルレイン / クリスタルレーザー。ピンチでブリザードカーテン */
    updateBossBluecore(px, py, bullets, fx, opts) {
        const W = CFG.W; const H = CFG.H;
        const ice = '#AED6F1'; const iceLight = '#EBF5FB';

        this.frostNeedleCD--; this.glacialRingCD--; this.icicleRainCD--; this.crystalLaserCD--;
        this.icicleRainT = Math.max(0, (this.icicleRainT || 0) - 1);
        this.crystalLaserWarn = Math.max(0, (this.crystalLaserWarn || 0) - 1);
        this.crystalLaserActive = Math.max(0, (this.crystalLaserActive || 0) - 1);
        this.blizzardT = Math.max(0, (this.blizzardT || 0) - 1);

        this.iceTrail = this.iceTrail || [];
        if (this.timer % 4 === 0) {
            this.iceTrail.push({ x: this.x, y: this.y, t: 90 });
            if (this.iceTrail.length > 20) this.iceTrail.shift();
        }
        this.iceTrail.forEach(tr => { tr.t--; });
        this.iceTrail = this.iceTrail.filter(tr => tr.t > 0);
        if (this.berserk && typeof fx.arenaFreeze === 'number') fx.arenaFreeze = 60;
        const angular = this.hp <= this.maxHp * 0.5;
        this.angularPhase = (this.angularPhase || 0) + (angular ? 0.08 : 0.02);
        const phase = this.angularPhase || 0;
        let bx = Math.sin(phase) * (W * 0.36 * (this.berserk ? 1.5 : 1)) + Math.cos(phase * 0.7) * (W * 0.1);
        let by = Math.sin(phase * 1.1) * (H * 0.22) + Math.sin(phase * 1.3) * (H * 0.07);
        if (angular) {
            const zig = Math.floor(phase / 0.5) % 2 ? 1 : -1;
            bx += zig * (W * 0.06) * Math.sin(phase * 4);
            by += zig * (H * 0.03) * Math.cos(phase * 3);
        }
        this.x = this.tx + bx; this.y = this.ty + by;
        this.x = clamp(this.x, 75, W - 75); this.y = clamp(this.y, H * 0.1, H * 0.58);

        if (this.blizzardT > 0) {
            if (this.blizzardT % 2 === 0) {
                const left = (this.blizzardT % 4) * 0.25 * W;
                for (let row = 0; row < 8; row++) {
                    const y = (row / 8) * H + (this.blizzardT % 3) * 5;
                    bullets.push({ x: left + (row % 3) * 35, y: y, vx: 5, vy: 0, active: true, color: iceLight, r: 4 });
                }
            }
            if (this.blizzardT <= 0) this.frostNeedleCD = 80;
            return;
        }

        if (this.crystalLaserActive > 0) {
            this.crystalLaserActive--;
            const a = Math.atan2(py - this.y, px - this.x) + (this.crystalLaserActive - 30) * 0.008;
            const spd = 5;
            bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: ice, r: 5 });
            if (this.crystalLaserActive <= 0) this.crystalLaserCD = 250;
            return;
        }
        if (this.crystalLaserWarn > 0) return;

        if (this.frostNeedleCD <= 0) {
            this._playBossSE(opts, 'shot');
            this.frostNeedleCD = this.berserk ? 60 : 100;
            const n = this.berserk ? 18 : 12; const spread = 0.5;
            for (let i = 0; i < n; i++) {
                const t = (i / (n - 1 || 1)) - 0.5;
                const a = Math.atan2(py - this.y, px - this.x) + t * spread;
                const spd = 3.5;
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: ice, r: 4 });
            }
        }

        if (this.glacialRingCD <= 0 && this.glacialRingPhase <= 0) {
            this._playBossSE(opts, 'charge'); this.glacialRingPhase = 3; this.glacialRingDelay = 0; this.glacialRingCD = 160;
        }
        if (this.glacialRingPhase > 0) {
            this.glacialRingDelay = (this.glacialRingDelay || 0) - 1;
            if (this.glacialRingDelay <= 0) {
                this.glacialRingDelay = 22;
                const phaseIdx = 3 - this.glacialRingPhase;
                const radius = 30 + phaseIdx * 35; const n = 12;
                for (let i = 0; i < n; i++) {
                    const a = (Math.PI * 2 / n) * i; const spd = 2.5;
                    bullets.push({ x: this.x + Math.cos(a) * radius, y: this.y + Math.sin(a) * radius, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: iceLight, r: 6 });
                }
                this.glacialRingPhase--;
            }
        }

        if (this.icicleRainT > 0) {
            if (this.icicleRainT % 5 === 0) {
                bullets.push({ x: rr(0, W), y: -10, vx: 0, vy: 6, active: true, color: ice, r: 5 });
            }
            if (this.icicleRainT <= 0) this.icicleRainCD = this.berserk ? 60 : 200;
            return;
        }

        if (this.icicleRainCD <= 0) {
            this.icicleRainT = this.berserk ? 9999 : 300; this.icicleRainCD = 350;
        }

        if (this.crystalLaserCD <= 0) {
            this.crystalLaserWarn = 50; this.crystalLaserCD = 280;
        }
        if (this.crystalLaserWarn === 1) {
            this._playBossSE(opts, 'big'); this.crystalLaserActive = 60; fx.burst(this.x, this.y, ice, 16, 4);
        }

        if (this.berserk && this.blizzardT <= 0 && Math.random() < 0.005) {
            this._playBossSE(opts, 'big'); this.blizzardT = 400;
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    /** ボス7面: 裂け目そのもの・ヴォイド — オムニウスゲイズ / ボイドフラグメント / ネオンクラック / ディメンショナルパルス / アイスパウン。ピンチでヴォイドアポカリプス */
    updateBossVoid(px, py, bullets, fx, opts) {
        const W = CFG.W; const H = CFG.H;
        const voidColor = '#8E44AD'; const neon = '#BB8FCE'; const fragmentColor = '#1A1A2E';

        const formMul = this.form === 0 ? 1 : (this.form === 1 ? 1.3 : 1.6);
        this.berserk = this.hp <= this.maxHp * 0.3;

        this.voidPhaseT = (this.voidPhaseT || 0) + 1;
        const phaseLen = Math.max(80, 140 - this.form * 25);
        if (this.voidPhaseT > phaseLen) { this.voidPhaseT = 0; this.voidPhase = ((this.voidPhase || 0) + 1) % 6; }

        this.omniusCD = (this.omniusCD || 0) - 1; this.fragmentCD = (this.fragmentCD || 0) - 1;
        this.neonCrackCD = (this.neonCrackCD || 0) - 1; this.dimensionalPulseCD = (this.dimensionalPulseCD || 0) - 1;
        this.iceSpawnCD = (this.iceSpawnCD || 0) - 1; this.apocalypseT = Math.max(0, (this.apocalypseT || 0) - 1);

        if (this.form === 2) {
            this.voidTeleportCD = (this.voidTeleportCD || 0) - 1;
            if (this.voidTeleportCD <= 0) {
                this.voidAfterimages = this.voidAfterimages || [];
                const LIFE = this.VOID_AFTERIMAGE_LIFE ?? 180;
                this.voidAfterimages.push({
                    x: this.x, y: this.y, t: LIFE,
                    frame: Math.floor(this.timer / 8) % 6
                });
                if (this.voidAfterimages.length > 5) this.voidAfterimages.shift();
                this.x = rr(90, W - 90);
                this.y = rr(80, H * 0.6);
                this.tx = this.x; this.ty = this.y;
                this.voidTeleportCD = this.berserk ? 45 : 75;
            }
            (this.voidAfterimages || []).forEach(a => { a.t--; });
            this.voidAfterimages = (this.voidAfterimages || []).filter(a => a.t > 0);
        }

        this.x = this.tx + Math.sin(this.timer * 0.01) * (60 * formMul);
        this.y = this.ty + Math.cos(this.timer * 0.012) * (35 * formMul);
        if (this.form === 2) {
            const t = this.timer * 0.01;
            const chaos = (a, b, c) => Math.sin(a * t) * Math.cos(b * t + 1.3) + Math.sin(c * t * 0.7) * 0.5;
            this.x = this.tx + chaos(0.012, 0.017, 0.023) * (W * 0.32) + chaos(0.008, 0.011, 0.013) * (W * 0.1);
            this.y = this.ty + chaos(0.014, 0.019, 0.007) * (H * 0.2) + chaos(0.01, 0.016, 0.022) * (H * 0.08);
            this.x = clamp(this.x, 90, W - 90); this.y = clamp(this.y, 80, H * 0.6);
        }

        if (this.apocalypseT > 0) {
            const n = 12; const centerX = px; const centerY = py;
            for (let i = 0; i < n; i++) {
                const a = (Math.PI * 2 / n) * i + this.timer * 0.02;
                const dist = 20 + (this.apocalypseT % 30) * 2;
                const sx = centerX + Math.cos(a) * (W * 0.6); const sy = centerY + Math.sin(a) * (H * 0.6);
                const dx = centerX - sx; const dy = centerY - sy; const d = Math.hypot(dx, dy) || 1;
                bullets.push({ x: sx, y: sy, vx: (dx / d) * 2, vy: (dy / d) * 2, active: true, color: voidColor, r: 5 });
            }
            if (this.apocalypseT <= 0) { this.omniusCD = 60; this.fragmentCD = 80; }
            return;
        }

        if (this.omniusCD <= 0) {
            this._playBossSE(opts, 'big'); this.omniusCD = 200;
            const beamAngle = Math.atan2(py - this.y, px - this.x);
            const spd = 5 * formMul;
            for (let i = -2; i <= 2; i++) {
                const a = beamAngle + i * 0.06; const count = this.berserk ? 2 : 1;
                for (let c = 0; c < count; c++) {
                    bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: '#ff00ff', r: 6, homing: true });
                }
            }
        }

        if (this.fragmentCD <= 0) {
            this._playBossSE(opts, 'shot'); this.fragmentCD = 180;
            const n = this.berserk ? 20 : 10;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2; const spd = 2 + Math.random() * 2;
                bullets.push({ x: this.x + rr(-30, 30), y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: neon, r: 6 });
            }
        }

        if (this.neonCrackCD <= 0) {
            this._playBossSE(opts, 'shot'); this.neonCrackCD = 150;
            const lines = this.berserk ? 5 : 3;
            for (let L = 0; L < lines; L++) {
                const y = H * (0.2 + (L / (lines + 1)) * 0.6) + rr(-20, 20);
                for (let x = 0; x < W + 20; x += 15) {
                    bullets.push({ x, y, vx: 10, vy: 0, active: true, color: voidColor, r: 4 });
                }
            }
        }

        if (this.dimensionalPulseCD <= 0) {
            this._playBossSE(opts, 'charge'); this.dimensionalPulseCD = 220;
            const holes = 5; const n = 24;
            for (let i = 0; i < n; i++) {
                if (i % Math.ceil(n / holes) === 0) continue;
                const a = (Math.PI * 2 / n) * i + Math.random() * 0.1;
                const spd = 2.5;
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: neon, r: 6 });
            }
        }

        if (this.iceSpawnCD <= 0) {
            this._playBossSE(opts, 'shot'); this.iceSpawnCD = 250;
            const corners = [{ x: 30, y: 30 }, { x: W - 30, y: 30 }, { x: W - 30, y: H - 30 }, { x: 30, y: H - 30 }];
            corners.forEach(c => {
                for (let i = 0; i < 3; i++) {
                    const dx = px - c.x; const dy = py - c.y; const d = Math.hypot(dx, dy) || 1;
                    const spd = 3;
                    bullets.push({ x: c.x, y: c.y, vx: (dx / d) * spd, vy: (dy / d) * spd, active: true, color: '#aaaaff', r: 4, homing: true });
                }
            });
        }

        if (this.berserk && this.apocalypseT <= 0 && Math.random() < 0.003) {
            this._playBossSE(opts, 'big'); this.apocalypseT = 600;
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    /** 旧ボス4面: CHAOS（未使用・idx3は鉄翼に変更済み） */
    updateBoss3(px, py, bullets, fx, sd, opts) {
        const W = CFG.W; const H = CFG.H;
        const purple = '#7B00FF'; const purpleLight = '#C39BFF';
        const teleportCDMax = this.berserk ? 48 : 150;
        const phantomCount = this.berserk ? 5 : 1 + Math.floor(this.timer / 200) % 3;
        if (this.phantoms.length > phantomCount) this.phantoms.length = phantomCount;
        while (this.phantoms.length < phantomCount) {
            this.phantoms.push({ x: this.x + rr(-80, 80), y: this.y + rr(-60, 60), vx: rr(-0.3, 0.3), vy: rr(-0.3, 0.3) });
        }

        this.afterimages.forEach(a => { a.t--; a.opacity = (a.t / 30) * 0.4; });
        this.afterimages = this.afterimages.filter(a => a.t > 0);

        this.phantoms.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.x = clamp(p.x, W * 0.2, W * 0.9); p.y = clamp(p.y, H * 0.15, H * 0.85);
            p.vx += rr(-0.02, 0.02); p.vy += rr(-0.02, 0.02); p.vx = clamp(p.vx, -0.5, 0.5); p.vy = clamp(p.vy, -0.5, 0.5);
        });

        this.teleportCD--;
        if (this.teleportCD <= 0) {
            this.teleportCD = teleportCDMax;
            this.afterimages.push({ x: this.x, y: this.y, opacity: 0.4, t: 30 });
            this.x = rr(W * 0.35, W * 0.85); this.y = rr(H * 0.2, H * 0.8);
            this.trueBodyIndex = rr(0, Math.max(0, this.phantoms.length));
        }

        this.chaosPhaseT = (this.chaosPhaseT || 0) + 1;
        const phaseLen = 100;
        if (this.chaosPhaseT > phaseLen) { this.chaosPhaseT = 0; this.chaosPhase = (this.chaosPhase + 1) % (this.berserk ? 5 : 4); }

        this.glitchFieldT = Math.max(0, (this.glitchFieldT || 0) - 1);
        if (this.glitchFieldT <= 0) this.glitchFieldRect = null;
        this.aimOffsetRad = 0;

        this.mirrorActiveT = Math.max(0, (this.mirrorActiveT || 0) - 1);
        this.bladeRealityT = Math.max(0, (this.bladeRealityT || 0) - 1);

        const playerPath = opts.playerPath || [];

        if (this.chaosPhase === 0 && this.chaosPhaseT === 1) {
            const baseAngle = Math.atan2(py - this.y, px - this.x);
            bullets.push({ x: this.x, y: this.y, vx: Math.cos(baseAngle) * 3.5, vy: Math.sin(baseAngle) * 3.5, active: true, color: purple, r: 7 });
            for (let j = 0; j < 4; j++) {
                const a = baseAngle + (j - 1.5) * 0.15;
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, active: true, color: purple, r: 7 });
            }
            this.phantoms.forEach(p => {
                const pa = Math.atan2(py - p.y, px - p.x);
                for (let j = 0; j < 5; j++) {
                    const a = pa + (j - 2) * 0.12;
                    const spd = 3.5;
                    bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, active: true, color: purple, r: 7, noDamage: true });
                }
            });
        }

        if (this.chaosPhase === 1) {
            const facing = (px > this.x) ? 1 : -1;
            if (this.chaosPhaseT === 1) {
                this.bladeRealityT = 24;
                this.chargeTarget = { x: px + facing * 80, y: py };
            }
            if (this.bladeRealityT > 0) {
                const dx = (this.chargeTarget.x - this.x); const dy = (this.chargeTarget.y - this.y); const d = Math.hypot(dx, dy) || 1;
                this.x += (dx / d) * 6; this.y += (dy / d) * 6;
                if (this.bladeRealityT === 20) {
                    const baseA = Math.atan2(py - this.y, px - this.x);
                    for (let i = 0; i < 5; i++) {
                        const a = baseA - 0.52 + (0.52 * 2 / 4) * i;
                        bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, active: true, color: purpleLight, r: 6 });
                    }
                }
            }
        }

        if (this.chaosPhase === 2) {
            if (this.chaosPhaseT === 1) {
                const fw = this.berserk ? W * 0.5 : W * 0.35; const fh = this.berserk ? H * 0.4 : H * 0.3;
                this.glitchFieldRect = { x: rr(50, W - fw - 50), y: rr(80, H - fh - 80), w: fw, h: fh };
                this.glitchFieldT = 180;
            }
            this.aimOffsetRad = this.berserk ? 0.52 : 0.26;
        }

        if (this.chaosPhase === 3 && this.chaosPhaseT === 1 && playerPath.length >= 30) {
            this.mirrorWalkPath = playerPath.slice(-90);
            this.mirrorWalkT = this.mirrorWalkPath.length + 30;
        }
        if (this.mirrorWalkT > 0) {
            this.mirrorWalkT--;
            const idx = this.mirrorWalkPath.length - this.mirrorWalkT;
            if (idx >= 0 && idx < this.mirrorWalkPath.length) {
                const p = this.mirrorWalkPath[idx];
                this.x += (p.x - this.x) * 0.15; this.y += (p.y - this.y) * 0.15;
            }
        }

        if (this.berserk && this.chaosPhase === 4 && this.chaosPhaseT === 1) {
            this.mirrorActiveT = 300;
        }

        if (this.anim.state !== 'IDLE' && this.anim.done) this.anim.set('IDLE');
    }

    takeDamage(amt, fx) {
        const wasAbove10 = this.hp > this.maxHp * 0.1;
        this.hp -= amt;
        this.hitFlash = 4;
        if (this.anim.state !== 'DEATH') this.anim.set('HIT');
        if (this.hp <= 0) { this.anim.set('DEATH'); this.deathT = 0; fx.big(this.x, this.y, this.color); return; }
        if (wasAbove10 && this.hp <= this.maxHp * 0.1 && !this.lastStandTriggered) {
            this.lastStandTriggered = true;
            this.lastStandFreezeT = 90;
        }
        if (this.idx === 1 && fx.addArenaDebris) {
            for (let i = 0; i < 3; i++)
                fx.addArenaDebris(this.x + rr(-20, 20), this.y, (Math.random() - 0.5) * 4, -1 - Math.random() * 2, 80, '#8B4513', 12, 5);
        }
        if (this.idx === 4) this.armorPeelLevel = Math.min(3, (this.armorPeelLevel || 0) + 0.25);
    }
    draw(c) {
        if (!this.active && this.anim.state !== 'DEATH') return;
        const f = this.anim.frame, t = this.timer, sc = 2.2 + Math.sin(t * 0.04) * 0.15, deathScale = this.anim.state === 'DEATH' ? 1 - f / 5 : 1;
        if (this.phase === 4 && this.laserWarn > 0 && this.laserWarn <= 60 && this.arrived) {
            c.save(); const warn = this.laserWarn / 60; c.globalAlpha = warn * 0.6; c.strokeStyle = "#ff2200"; c.lineWidth = 2 + warn * 4; c.setLineDash([8, 8]);
            c.beginPath(); c.moveTo(this.x, this.y); c.lineTo(this.x + Math.cos(this.laserAngle) * CFG.W, this.y + Math.sin(this.laserAngle) * CFG.W); c.stroke(); c.setLineDash([]); c.restore();
        }
        if (this.idx === 1) {
            (this.rampTrail || []).forEach(tr => {
                c.save();
                c.globalAlpha = (tr.t / 70) * 0.4;
                c.fillStyle = '#E74C3C';
                c.beginPath(); c.ellipse(tr.x, tr.y, 28, 20, 0, 0, Math.PI * 2); c.fill();
                c.restore();
            });
            if (this.coreRampageT > 0) {
                c.save(); c.globalAlpha = 0.5 + (Math.sin(this.timer * 0.4) * 0.3); c.fillStyle = '#E74C3C'; c.beginPath(); c.arc(this.x, this.y, 55, 0, Math.PI * 2); c.fill(); c.restore();
            }
        }
        if (this.idx === 2) {
            if (this.portalResidue && this.portalResidue.t > 0) {
                c.save();
                c.globalAlpha = this.portalResidue.t / (this.portalResidue.maxT || 30);
                c.strokeStyle = '#BB8FCE';
                c.lineWidth = 2;
                c.setLineDash([4, 4]);
                c.beginPath(); c.arc(this.portalResidue.x, this.portalResidue.y, 25 + (1 - this.portalResidue.t / (this.portalResidue.maxT || 30)) * 15, 0, Math.PI * 2); c.stroke();
                c.setLineDash([]); c.restore();
            }
            (this.mirrorClones || []).forEach(cl => {
                if (cl.hp <= 0) return;
                c.save(); c.globalAlpha = 0.7; c.fillStyle = '#7B00FF'; c.strokeStyle = '#C39BFF'; c.lineWidth = 1;
                c.beginPath(); c.ellipse(cl.x, cl.y, 24, 18, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
            });
            if (this.thunderWarnT > 0) {
                c.save(); c.strokeStyle = '#FFDD00'; c.lineWidth = 2; c.globalAlpha = 0.4 + (this.thunderWarnT % 15 < 8 ? 0.3 : 0); c.setLineDash([6, 6]);
                c.beginPath(); c.moveTo(this.x - 60, this.y - 40); c.lineTo(this.x + 60, this.y - 40); c.stroke(); c.restore();
            }
        }
        if (this.idx === 0 && this.purpleBeamTelegraph > 0) {
            c.save();
            const t = 1 - this.purpleBeamTelegraph / 120;
            c.globalAlpha = 0.4 + t * 0.5; c.fillStyle = '#9B59B6'; c.strokeStyle = '#D7BDE2';
            c.beginPath(); c.arc(this.x - 12, this.y - 18, 6 + t * 4, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.arc(this.x + 12, this.y - 18, 6 + t * 4, 0, Math.PI * 2); c.fill(); c.stroke();
            c.restore();
        }
        if (this.idx === 3 && this.heatBeamWarn > 0) {
            c.save(); c.globalAlpha = 0.5 + (this.heatBeamWarn % 12 < 6 ? 0.25 : 0); c.fillStyle = '#ff2200'; c.beginPath(); c.arc(this.x, this.y, 25, 0, Math.PI * 2); c.fill(); c.restore();
        }
        if (this.idx === 5) {
            (this.iceTrail || []).forEach(tr => {
                c.save();
                c.globalAlpha = (tr.t / 90) * 0.4;
                c.strokeStyle = '#AED6F1';
                c.lineWidth = 1.5;
                c.beginPath(); c.arc(tr.x, tr.y, 12, 0, Math.PI * 2); c.stroke();
                c.restore();
            });
        }
        if (this.idx === 3 && this.outOfControlT > 0) {
            c.save();
            c.globalAlpha = 0.6 + Math.sin(this.timer * 0.2) * 0.2;
            for (let i = 0; i < 6; i++) {
                const a = (this.timer * 0.15 + i * 1.1) % (Math.PI * 2);
                const len = 20 + (this.timer + i * 7) % 15;
                c.strokeStyle = '#ffaa00'; c.lineWidth = 1;
                c.beginPath(); c.moveTo(this.x, this.y); c.lineTo(this.x + Math.cos(a) * len, this.y + Math.sin(a) * len); c.stroke();
            }
            c.restore();
        }
        if (this.idx === 6 && this.form === 2 && this.voidAfterimages && this.voidAfterimages.length && IMG.lastboss3) {
            const sheet = IMG.lastboss3;
            const iw = sheet.naturalWidth || 384, ih = sheet.naturalHeight || 64;
            const LASTBOSS3_FRAMES = 6, fw = iw / LASTBOSS3_FRAMES;
            const BOSS_DISPLAY_MAX = 440, maxDim = Math.max(fw, ih, 1);
            const baseScale = (BOSS_DISPLAY_MAX / maxDim) * 1.5 * BOSS_SIZE_SCALE;
            const drawW = fw * baseScale, drawH = ih * baseScale;
            const LIFE = this.VOID_AFTERIMAGE_LIFE ?? 180;
            this.voidAfterimages.forEach(a => {
                c.save();
                c.globalAlpha = (a.t / LIFE) * 0.72;
                c.translate(a.x, a.y); c.scale(-1, 1);
                c.drawImage(sheet, (a.frame || 0) * fw, 0, fw, ih, -drawW / 2, -drawH / 2, drawW, drawH);
                c.restore();
            });
        }
        const jitterX = (this.idx === 3 && this.outOfControlT > 0) ? (this.timer % 5 - 2) * 2 : 0;
        const jitterY = (this.idx === 3 && this.outOfControlT > 0) ? (this.timer % 3 - 1) * 1.5 : 0;
        c.save(); c.translate(this.x + jitterX, this.y + jitterY);
        if (this.idx === 6) c.scale(-1, 1);
        if (this.idx === 1) {
            for (let i = 0; i < 4; i++) {
                const a = this.subUnitAngle + (Math.PI * 2 / 4) * i;
                c.save(); c.translate(Math.cos(a) * 120, Math.sin(a) * 120); c.fillStyle = '#00FFAA'; c.globalAlpha = 0.9; c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill(); c.restore();
            }
        }
        if (this.idx === 4) {
            (this.energyTrail || []).forEach(tr => {
                c.save();
                c.globalAlpha = (tr.t / 120) * 0.35;
                c.strokeStyle = '#00dddd';
                c.lineWidth = 2;
                c.beginPath(); c.arc(tr.x, tr.y, 18, 0, Math.PI * 2); c.stroke();
                c.restore();
            });
            if (this.domeShieldT > 0) {
                c.strokeStyle = '#00dddd'; c.lineWidth = 2; c.fillStyle = 'rgba(0,200,200,0.12)'; c.globalAlpha = 0.9;
                c.beginPath(); for (let i = 0; i < 8; i++) { const a = (Math.PI * 2 / 8) * i; const rx = 55; const ry = 55; if (i === 0) c.moveTo(Math.cos(a) * rx, Math.sin(a) * ry); else c.lineTo(Math.cos(a) * rx, Math.sin(a) * ry); } c.closePath(); c.fill(); c.stroke(); c.globalAlpha = 1;
            }
        }
        if (this.anim.state === 'DEATH') c.globalAlpha = deathScale;
        const isLastBossForm2 = this.idx === 6 && this.form === 2;
        const isLastBossForm1 = this.idx === 6 && this.form === 1;
        const bossImgSheet = isLastBossForm2 && IMG.lastboss3 ? IMG.lastboss3 : null;
        const bossImg = !bossImgSheet && isLastBossForm1 && IMG.lastboss2 ? IMG.lastboss2 : (!bossImgSheet ? IMG['boss' + (this.idx + 1)] : null);
        const useIntroPixel = !this.introDone && this.introT < this.INTRO_DUR;
        const useDeathPixel = this.anim.state === 'DEATH' && this.deathT < 80;
        const deathPixelScale = useDeathPixel ? 1 + Math.min(1, this.deathT / 60) * 7 : 1;
        const pixelScale = useIntroPixel ? Math.max(1, 8 - 7 * this.introT / this.INTRO_DUR) : (useDeathPixel ? deathPixelScale : 1);
        if (bossImgSheet) {
            const iw = bossImgSheet.naturalWidth || 384, ih = bossImgSheet.naturalHeight || 64;
            const LASTBOSS3_FRAMES = 6;
            const fw = iw / LASTBOSS3_FRAMES;
            const frameIndex = this.anim.state === 'DEATH' ? 0 : Math.floor(this.timer / 8) % LASTBOSS3_FRAMES;
            const sx = frameIndex * fw;
            const BOSS_DISPLAY_MAX = 440;
            const maxDim = Math.max(fw, ih, 1);
            let baseScale = (BOSS_DISPLAY_MAX / maxDim) * (1 + Math.sin(t * 0.04) * 0.03) * deathScale * BOSS_SIZE_SCALE;
            if (this.idx === 3) baseScale *= 1.3;
            if (this.idx === 6) baseScale *= 1.5;
            const drawW = fw * baseScale; const drawH = ih * baseScale;
            this._drawW = drawW; this._drawH = drawH;
            if (useIntroPixel || useDeathPixel) {
                const smallW = Math.max(4, Math.floor(drawW / pixelScale)); const smallH = Math.max(4, Math.floor(drawH / pixelScale));
                if (!this._pixBuf || this._pixBuf.width !== smallW || this._pixBuf.height !== smallH) { this._pixBuf = document.createElement('canvas'); this._pixBuf.width = smallW; this._pixBuf.height = smallH; }
                const buf = this._pixBuf.getContext('2d'); buf.drawImage(bossImgSheet, sx, 0, fw, ih, 0, 0, smallW, smallH);
                if (!useDeathPixel) { buf.globalCompositeOperation = 'multiply'; buf.globalAlpha = 0.35; buf.fillStyle = this.color; buf.fillRect(0, 0, smallW, smallH); buf.globalAlpha = 1; buf.globalCompositeOperation = 'source-over'; }
                c.imageSmoothingEnabled = false; c.drawImage(this._pixBuf, 0, 0, smallW, smallH, -drawW / 2, -drawH / 2, drawW, drawH); c.imageSmoothingEnabled = true;
            } else {
                c.drawImage(bossImgSheet, sx, 0, fw, ih, -drawW / 2, -drawH / 2, drawW, drawH);
            }
            if (!useIntroPixel && !useDeathPixel) {
                if (this.hitFlash > 0) {
                    c.globalCompositeOperation = 'source-over';
                    c.globalAlpha = 0.5; c.fillStyle = '#ffffff'; c.fillRect(-drawW / 2, -drawH / 2, drawW, drawH); c.globalAlpha = 1;
                } else {
                    c.globalCompositeOperation = 'multiply';
                    c.globalAlpha = 0.35; c.fillStyle = this.color; c.fillRect(-drawW / 2, -drawH / 2, drawW, drawH); c.globalAlpha = 1;
                    c.globalCompositeOperation = 'source-over';
                }
            }
        } else if (bossImg) {
            const iw = bossImg.naturalWidth || 64, ih = bossImg.naturalHeight || 64;
            const BOSS_DISPLAY_MAX = 440;
            const maxDim = Math.max(iw, ih, 1);
            let baseScale = (BOSS_DISPLAY_MAX / maxDim) * (1 + Math.sin(t * 0.04) * 0.03) * deathScale * BOSS_SIZE_SCALE;
            if (this.idx === 3) baseScale *= 1.3;
            if (this.idx === 6) baseScale *= 1.5;
            const drawW = iw * baseScale, drawH = ih * baseScale;
            this._drawW = drawW; this._drawH = drawH;
            if (useIntroPixel || useDeathPixel) {
                const smallW = Math.max(4, Math.floor(drawW / pixelScale)); const smallH = Math.max(4, Math.floor(drawH / pixelScale));
                if (!this._pixBuf || this._pixBuf.width !== smallW || this._pixBuf.height !== smallH) { this._pixBuf = document.createElement('canvas'); this._pixBuf.width = smallW; this._pixBuf.height = smallH; }
                const buf = this._pixBuf.getContext('2d'); buf.drawImage(bossImg, 0, 0, iw, ih, 0, 0, smallW, smallH);
                if (!useDeathPixel) { buf.globalCompositeOperation = 'multiply'; buf.globalAlpha = 0.35; buf.fillStyle = this.color; buf.fillRect(0, 0, smallW, smallH); buf.globalAlpha = 1; buf.globalCompositeOperation = 'source-over'; }
                c.imageSmoothingEnabled = false; c.drawImage(this._pixBuf, 0, 0, smallW, smallH, -drawW / 2, -drawH / 2, drawW, drawH); c.imageSmoothingEnabled = true;
            } else {
                c.drawImage(bossImg, 0, 0, iw, ih, -drawW / 2, -drawH / 2, drawW, drawH);
            }
            if (!useIntroPixel && !useDeathPixel) {
                if (this.hitFlash > 0) {
                    c.globalCompositeOperation = 'source-over';
                    c.globalAlpha = 0.5; c.fillStyle = '#ffffff'; c.fillRect(-drawW / 2, -drawH / 2, drawW, drawH); c.globalAlpha = 1;
                } else {
                    c.globalCompositeOperation = 'multiply';
                    c.globalAlpha = 0.35; c.fillStyle = this.color; c.fillRect(-drawW / 2, -drawH / 2, drawW, drawH); c.globalAlpha = 1;
                    c.globalCompositeOperation = 'source-over';
                }
            }
        } else {
            const fallbackSize = 32 * sc * deathScale * BOSS_SIZE_SCALE;
            this._drawW = fallbackSize * 2; this._drawH = fallbackSize * 2;
            c.scale(sc * deathScale * BOSS_SIZE_SCALE, sc * deathScale * BOSS_SIZE_SCALE);
            const cl = this.hitFlash > 0 ? "#fff" : this.color; c.fillStyle = cl; c.strokeStyle = cl; c.lineWidth = 1; const wb = Math.sin(t * 0.08 + f) * 2;
            c.beginPath(); c.ellipse(0, wb, 16, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-12, -12); c.lineTo(0, -24 + f * 2); c.lineTo(12, -12); c.closePath(); c.fill();
            const ca = 0.4 + Math.sin(t * 0.1) * 0.3; c.save(); c.globalAlpha = ca; c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, 5 + Math.sin(t * 0.15) * 2, 0, Math.PI * 2); c.fill(); c.restore();
            c.fillStyle = "#ff0000"; c.beginPath(); c.arc(-6, -8, 3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(6, -8, 3, 0, Math.PI * 2); c.fill();
            c.strokeStyle = cl; c.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 0.8 + Math.PI * 0.1, len = 14 + Math.sin(t * 0.06 + i) * 4, tx2 = Math.cos(angle + Math.PI / 2) * len, ty2 = 12 + Math.sin(angle) * len * 0.5 + Math.sin(t * 0.08 + i * 2) * 3; c.beginPath(); c.moveTo(i < 3 ? -8 : 8, 8); c.quadraticCurveTo(tx2 * 0.5, ty2 * 0.8, tx2, ty2); c.stroke(); }
        }
        c.restore();
        if (this.arrived) {
            const bw = 320, bx = CFG.W / 2 - bw / 2; c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(bx - 2, 16, bw + 4, 18); c.fillStyle = "#330000"; c.fillRect(bx, 18, bw, 14);
            const ratio = clamp(this.hp / this.maxHp, 0, 1); c.fillStyle = this.color; c.fillRect(bx, 18, bw * ratio, 14); c.fillStyle = "#e0cda7"; c.font = "14px serif"; c.textAlign = "center"; c.fillText(this.name, CFG.W / 2, 14); c.textAlign = "left";
        }
    }
    get cx() { return this.x; }
    get cy() { return this.y; }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Boss = Boss;

})(typeof window !== 'undefined' ? window : this);
