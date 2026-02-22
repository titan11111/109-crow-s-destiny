/**
 * CROW'S DESTINY — プレイヤー（カラス）
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const IMG = global.CrowDestiny.IMG;
const Anim = global.CrowDestiny.Anim;
const clamp = global.CrowDestiny.clamp;

class Crow {
    constructor(soundManager = null) {
        this.soundManager = soundManager;
        this.x = 120; this.y = CFG.H / 2 - 4; this.vx = 0; this.vy = 0;
        this.w = 9; this.h = 8; this.hp = 100; this.maxHp = 100; this.inv = 0; this.facing = 1;
        this.weaponLevel = 1; this.barrier = 0; this.dashCD = 0; this.dashing = false; this.dashT = 0;
        this.anim = new Anim({ FLY: { frames: 4, loop: true, speed: 1 }, DASH: { frames: 4, loop: false, speed: 2 }, HIT: { frames: 4, loop: false, speed: 1 }, KO: { frames: 4, loop: false, speed: 0.5 } });
        this.shootT = 0; this.feathers = [];
        /** ボス3 GLITCH FIELD 用: 照準オフセット（ラジアン、±でランダムにずれる） */
        this.aimOffset = 0;
        /** ダッシュ後の軌跡（約1秒＝60フレームでフェードアウト） */
        this.dashTrail = [];
        this.DASH_TRAIL_LIFE = 60;
    }
    update(keys) {
        if (this.anim.state === 'KO') return;
        if (this.anim.state === 'HIT' && !this.anim.done) { this.anim.update(); return; }
        let mx = 0, my = 0;
        if (keys['JoystickX'] !== undefined && keys['JoystickY'] !== undefined) {
            mx = keys['JoystickX'];
            my = keys['JoystickY'];
        } else {
            if (keys['ArrowLeft'] || keys['KeyA'] || keys['TouchLeft']) mx = -1;
            if (keys['ArrowRight'] || keys['KeyD'] || keys['TouchRight']) mx = 1;
            if (keys['ArrowUp'] || keys['KeyW'] || keys['TouchUp']) my = -1;
            if (keys['ArrowDown'] || keys['KeyS'] || keys['TouchDown']) my = 1;
        }
        if ((keys['ShiftLeft'] || keys['ShiftRight'] || keys['TouchDash']) && this.dashCD <= 0 && !this.dashing) {
            this.dashing = true; this.dashT = 12; this.dashCD = 45; this.anim.set('DASH'); this.inv = Math.max(this.inv, 12);
            if (this.soundManager && this.soundManager.playDash) this.soundManager.playDash();
        }
        if (this.dashing) {
            this.dashT--;
            this.vx = this.facing * CFG.DASH_SPD; this.vy = my * CFG.DASH_SPD * 0.5;
            this.dashTrail.push({ x: this.x + this.w / 2, y: this.y + this.h / 2, life: this.DASH_TRAIL_LIFE });
            if (this.dashT <= 0) this.dashing = false;
        } else {
            this.vx = mx * CFG.PLAYER_SPD; this.vy = my * CFG.PLAYER_SPD;
        }
        this.dashTrail.forEach(p => p.life--);
        this.dashTrail = this.dashTrail.filter(p => p.life > 0);
        if (this.dashCD > 0) this.dashCD--;
        /* 左右どちらの入力でも向きは変えない（常に右向き） */
        this.x += this.vx; this.y += this.vy;
        this.x = clamp(this.x, CFG.MARGIN, CFG.W - this.w - CFG.MARGIN);
        this.y = clamp(this.y, CFG.MARGIN, CFG.H - this.h - CFG.MARGIN);
        if (this.inv > 0) this.inv--; if (this.barrier > 0) this.barrier--;
        if (!this.dashing) this.anim.set('FLY');
        this.anim.update();
        this.shootT++;
        const intv = Math.max(4, 14 - this.weaponLevel * 2);
        if (this.shootT >= intv) { this.shootT = 0; this.shoot(); if (this.soundManager && this.soundManager.playShoot) this.soundManager.playShoot(); }
        /* HP30%以下は赤ビーム攻撃（回復で通常に戻る） */
        if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 0.005);
    }
    shoot() {
        const lowHp = this.hp <= this.maxHp * 0.3;
        if (lowHp) {
            const cx = this.x + this.w / 2 + this.facing * 12; const cy = this.y + this.h / 2 - 3;
            this.feathers.push({ x: cx, y: cy, vx: this.facing * 18, vy: 0, active: true, life: 0, isBeam: true });
        } else {
            const lvl = Math.min(this.weaponLevel, 5);
            for (let i = 0; i < lvl; i++) {
                const spread = (i - (lvl - 1) / 2) * 0.18;
                this.feathers.push({ x: this.x + this.w / 2 + this.facing * 12, y: this.y + this.h / 2 - 3 + i * 3 - (lvl - 1) / 2 * 3, vx: this.facing * 14, vy: spread * 2.8, active: true, life: 0 });
            }
            if (this.aimOffset) {
                const off = (Math.random() - 0.5) * 2 * this.aimOffset;
                for (let i = this.feathers.length - lvl; i < this.feathers.length; i++) {
                    const f = this.feathers[i];
                    const a = Math.atan2(f.vy, f.vx) + off;
                    const s = Math.hypot(f.vx, f.vy);
                    f.vx = Math.cos(a) * s; f.vy = Math.sin(a) * s;
                }
            }
            // Lv.6: ギャラクシー砲（手前に光る球＋一直線レーザー・浄化の青いほむら）
            if (this.weaponLevel >= 6) {
                const cx = this.x + this.w / 2 + this.facing * 12;
                const cy = this.y + this.h / 2 - 3;
                this.feathers.push({ x: cx, y: cy, vx: this.facing * 20, vy: 0, active: true, life: 0, isGalaxy: true });
            }
        }
    }
    takeDamage(amt, fx) {
        if (this.inv > 0) return false;
        if (this.barrier > 0) { this.barrier = 0; fx.burst(this.cx, this.cy, "#aaeeff", 20, 5); this.inv = 30; return false; }
        this.hp -= amt; this.inv = 90; this.anim.set('HIT'); if (this.soundManager && this.soundManager.playHit) this.soundManager.playHit(); fx.burst(this.cx, this.cy, "#ff3333", 18, 5); fx.shake = 10;
        if (this.hp <= 0) { this.anim.set('KO'); return true; }
        return false;
    }
    drawTrail(c) {
        if (this.dashTrail.length === 0) return;
        const maxLife = this.DASH_TRAIL_LIFE;
        for (let i = 0; i < this.dashTrail.length; i++) {
            const p = this.dashTrail[i];
            const a = p.life / maxLife;
            c.save();
            c.globalAlpha = a * 0.6;
            c.fillStyle = "#2a1a1a";
            c.beginPath();
            c.ellipse(p.x, p.y, 6, 5, 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
        }
    }
    draw(c) {
        c.save();
        if (this.inv > 0 && this.inv % 4 > 1) c.globalAlpha = 0.35;
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        c.translate(cx, cy); c.scale(this.facing / 3, 1 / 3);
        const f = this.anim.frame, s = this.anim.state;
        if (IMG.crowSheet) {
            const sh = IMG.crowSheet, sw = sh.naturalWidth || 128, shh = sh.naturalHeight || 96, cw = sw / 4, ch = shh / 4;
            const rowMap = { FLY: 2, DASH: 3, HIT: 2, KO: 3 }; const row = rowMap[s] !== undefined ? rowMap[s] : 2; const col = Math.min(f, 3);
            c.drawImage(sh, col * cw, row * ch, cw, ch, -cw / 2, -ch / 2, cw, ch);
        } else {
            const wingA = { FLY: [-0.5, -0.1, 0.3, 0.5], DASH: [0.5, 0.5, 0.4, 0.3], HIT: [-0.3, 0, 0.1, 0], KO: [0.6, 0.6, 0.6, 0.6] }; const wa = (wingA[s] || wingA['FLY'])[f];
            c.fillStyle = "#111"; c.strokeStyle = "#333"; c.lineWidth = 1.5;
            c.save(); c.rotate(-wa); c.beginPath(); c.moveTo(-2, -5); c.lineTo(-24, -16 + f * 2); c.lineTo(-19, -9); c.closePath(); c.fill(); c.stroke(); c.restore();
            c.save(); c.rotate(wa * 0.6); c.beginPath(); c.moveTo(-2, 5); c.lineTo(-22, 14 - f * 1.5); c.lineTo(-17, 8); c.closePath(); c.fill(); c.stroke(); c.restore();
            c.beginPath(); c.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.ellipse(9, -5, 8, 7, 0.2, 0, Math.PI * 2); c.fill(); c.stroke();
            c.fillStyle = "#554422"; c.beginPath(); c.moveTo(15, -6); c.lineTo(22, -3); c.lineTo(15, -2); c.closePath(); c.fill();
            c.fillStyle = "#ff0000"; c.beginPath(); c.arc(12, -7, 2.5, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,0,0,0.35)"; c.beginPath(); c.arc(12, -7, 5, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#111"; const tOff = s === 'DASH' ? 8 : f * 1.5;
            c.beginPath(); c.moveTo(-11, 3); c.lineTo(-24 + tOff, 7); c.lineTo(-20 + tOff, 2); c.closePath(); c.fill();
            c.beginPath(); c.moveTo(-11, 5); c.lineTo(-26 + tOff, 11); c.lineTo(-22 + tOff, 6); c.closePath(); c.fill();
        }
        if (this.barrier > 0) { c.globalAlpha = 0.18 + Math.sin(this.barrier * 0.15) * 0.1; c.strokeStyle = "#aaeeff"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.stroke(); }
        c.restore();
    }
    drawFeathers(c) {
        for (let i = this.feathers.length - 1; i >= 0; i--) {
            const f = this.feathers[i]; f.x += f.vx; f.y += f.vy; f.life++;
            if (f.x < -30 || f.x > CFG.W + 30 || f.y < -30 || f.y > CFG.H + 30) f.active = false;
            if (!f.active) { this.feathers.splice(i, 1); continue; }
            if (f.isBeam) {
                c.save(); c.translate(f.x, f.y); c.rotate(Math.atan2(f.vy, f.vx));
                c.strokeStyle = "#ff2222"; c.fillStyle = "rgba(255,80,80,0.7)"; c.lineWidth = 2;
                c.beginPath(); c.moveTo(-20, 0); c.lineTo(16, 0); c.stroke();
                c.fillRect(-20, -3, 36, 6); c.restore();
            } else if (f.isGalaxy) {
                // ギャラクシー砲: 手前に光る球＋一直線レーザー（青白・浄化の青いほむら）
                c.save();
                c.translate(f.x, f.y);
                c.rotate(Math.atan2(f.vy, f.vx));
                const beamLen = 90;
                const orbR = 14;
                c.globalAlpha = 0.95;
                c.strokeStyle = "#aaddff";
                c.fillStyle = "rgba(170,220,255,0.85)";
                c.lineWidth = 4;
                c.beginPath(); c.moveTo(-beamLen, 0); c.lineTo(0, 0); c.stroke();
                c.fillRect(-beamLen, -4, beamLen, 8);
                c.fillStyle = "rgba(204,238,255,0.95)";
                c.beginPath(); c.arc(0, 0, orbR, 0, Math.PI * 2); c.fill();
                c.strokeStyle = "#cceeff";
                c.lineWidth = 2;
                c.stroke();
                c.globalAlpha = 0.6 + Math.sin(f.life * 0.2) * 0.25;
                c.fillStyle = "rgba(255,255,255,0.8)";
                c.beginPath(); c.arc(0, 0, orbR * 0.6, 0, Math.PI * 2); c.fill();
                c.globalAlpha = 1;
                c.restore();
            } else {
                c.fillStyle = "#e0cda7";
                c.save(); c.translate(f.x, f.y); c.rotate(Math.atan2(f.vy, f.vx)); c.scale(0.55, 0.55); c.globalAlpha = 0.9;
                c.beginPath(); c.moveTo(12, 0); c.lineTo(-7, -4); c.lineTo(-7, 4); c.closePath(); c.fill(); c.restore();
            }
        }
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Crow = Crow;

})(typeof window !== 'undefined' ? window : this);
