/**
 * CROW'S DESTINY — 敵（穢れし者・難易度スケール）
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const Anim = global.CrowDestiny.Anim;
const ri = global.CrowDestiny.ri;
const rr = global.CrowDestiny.rr;

const STAGE_SPRITE_KEYS = { 1: 'enemy2', 2: 'enemy3', 3: 'enemy4', 4: 'enemy5', 5: 'enemy6', 6: 'enemy7' };
    // 各スプライトのレイアウト（画像サイズに応じて cols/rows でセル分割）
    // inset: 0 = フレーム全体を使用（enemy6 は6コマ横並び・隙間なしに合わせる）
const SPRITE_LAYOUTS = {
    enemy2: { cols: 4, rows: 2 },
    enemy3: { cols: 6, rows: 1 },
    enemy4: { cols: 6, rows: 1 },
    enemy5: { cols: 6, rows: 1 },  /* Dark Noel / Cryo 系: 6フレーム横並び浮遊 */
    enemy6: { cols: 6, rows: 1, inset: 0, fallbackW: 480, fallbackH: 80 },  /* 蒼穢の女王・ブルーコア系: 6フレーム横並び・等幅・隙間なし */
    enemy7: { cols: 3, rows: 2 }
};
/* 参照: 120ms/フレーム ≒ 8ゲームフレームで1コマ。enemy5/enemy6 はこの等間隔で 0→5 ループ（回転しない） */
const FLOAT_FRAME_INTERVAL = 8;
const HORIZONTAL_FLOAT_6 = { enemy5: true, enemy6: true };
const FLOAT_SYNC_SPRITES = { enemy4: true };

class Enemy {
    constructor(x, y, sd, isBlue = false, stageIdx = undefined) {
        this.x = x; this.y = y; this.isBlue = isBlue;
        this.color = isBlue ? sd.blueColor : sd.eColor;
        const mul = sd.enemyHpMul || 1;
        this.hp = Math.round((isBlue ? 45 : 16) * mul); this.maxHp = this.hp;
        this.active = true; this.w = 56; this.h = 48; this.vx = -1.5 - Math.random() * 1; this.vy = 0;
        this.timer = 0; this.hitFlash = 0;
        this.shootCD = ri(sd.enemyShootMin || 60, sd.enemyShootMax || 130);
        this.bulletSpd = sd.enemyBulletSpd || 3.0; this.sd = sd;
        // 130参考: 150ms/フレーム・4列2行8コマのスプライトに合わせた速度
        this.anim = new Anim({ FLOAT: { frames: 4, loop: true, speed: 0.55 }, ATTACK: { frames: 4, loop: false, speed: 0.55 }, HIT: { frames: 3, loop: false, speed: 1 }, DEATH: { frames: 4, loop: false, speed: 1 } });
        this.baseY = y; this.glow = Math.random() * 6.28;
        this.spriteKey = (stageIdx !== undefined && STAGE_SPRITE_KEYS[stageIdx]) ? STAGE_SPRITE_KEYS[stageIdx] : null;
    }
    update(px, py, bullets, scrollSpd) {
        if (this.anim.state === 'DEATH') { this.anim.update(); if (this.anim.done) this.active = false; return; }
        this.timer++; this.anim.update();
        this.x += this.vx; this.y = this.baseY + Math.sin(this.timer * 0.04) * 25; this.x -= scrollSpd;
        this.shootCD--;
        if (this.shootCD <= 0) {
            this.shootCD = ri(this.sd.enemyShootMin || 60, this.sd.enemyShootMax || 130);
            this.anim.set('ATTACK');
            const dx = px - this.x, dy = py - this.y, d = Math.hypot(dx, dy) || 1, spd = this.bulletSpd;
            bullets.push({ x: this.x, y: this.y, vx: dx / d * spd, vy: dy / d * spd, active: true, color: this.isBlue ? "#44aaff" : "#ff4d00", r: 4 });
            if (this.isBlue && (this.sd.id || 1) >= 5) {
                const ang = Math.atan2(dy, dx) + rr(-0.2, 0.2);
                bullets.push({ x: this.x, y: this.y, vx: Math.cos(ang) * spd * 0.9, vy: Math.sin(ang) * spd * 0.9, active: true, color: "#44aaff", r: 3 });
            }
        }
        if (this.anim.state === 'ATTACK' && this.anim.done) this.anim.set('FLOAT');
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.x < -80) this.active = false;
    }
    takeDamage(amt, fx) {
        this.hp -= amt; this.hitFlash = 4;
        if (this.hp <= 0) { this.anim.set('DEATH'); fx.burst(this.x, this.y, this.color, this.isBlue ? 30 : 15, this.isBlue ? 6 : 4); }
    }
    draw(c) {
        if (!this.active) return;
        const IMG = global.CrowDestiny && global.CrowDestiny.IMG;
        const f = this.anim.frame;
        const s = this.anim.state;
        const t = this.timer;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        // スプライト: 画像ごとのレイアウトでセル切り出し・25%縮小・ずれ対策で中央を優先
        if (this.spriteKey && IMG && IMG[this.spriteKey]) {
            const layout = SPRITE_LAYOUTS[this.spriteKey];
            if (!layout) return;
            const sh = IMG[this.spriteKey];
            const sw = sh.naturalWidth || layout.fallbackW || 1584;
            const shh = sh.naturalHeight || layout.fallbackH || 672;
            const COLS = layout.cols;
            const ROWS = layout.rows;
            const fw = sw / COLS;
            const fh = shh / ROWS;
            const scale = 0.25;
            const dispW = fw * scale;
            const dispH = fh * scale;
            const totalFrames = COLS * ROWS;
            let frameIndex;
            if (this.anim.state === 'DEATH') {
                frameIndex = 0;
            } else if (HORIZONTAL_FLOAT_6[this.spriteKey]) {
                frameIndex = Math.floor(this.timer / FLOAT_FRAME_INTERVAL) % totalFrames;
            } else if (FLOAT_SYNC_SPRITES[this.spriteKey]) {
                frameIndex = this.anim.frame % Math.min(4, totalFrames);
            } else {
                frameIndex = Math.floor(this.timer / 9) % totalFrames;
            }
            const row = ROWS > 1 && s === 'ATTACK' ? 1 : Math.floor(frameIndex / COLS);
            const col = frameIndex % COLS;
            const sx = col * fw;
            const sy = row * fh;
            const inset = layout.inset !== undefined ? layout.inset : 0.06;
            const cropW = fw * (1 - inset * 2);
            const cropH = fh * (1 - inset * 2);
            const srcX = sx + fw * inset;
            const srcY = sy + fh * inset;
            c.save();
            c.translate(cx, cy);
            if (this.anim.state === 'DEATH') {
                const ds = 1 - f / 4;
                c.globalAlpha = ds;
                c.scale(-ds * scale, ds * scale);
            } else {
                if (this.hitFlash > 0) c.globalAlpha = 0.5 + 0.5 * (this.hitFlash / 4);
                c.scale(-scale, scale);
            }
            c.drawImage(sh, srcX, srcY, cropW, cropH, -fw / 2, -fh / 2, fw, fh);
            if (this.anim.state !== 'DEATH') {
                c.globalCompositeOperation = 'screen';
                c.shadowColor = '#4488ff';
                c.shadowBlur = 6;
                c.globalAlpha = 0.08;
                c.drawImage(sh, srcX, srcY, cropW, cropH, -fw / 2, -fh / 2, fw, fh);
                c.globalAlpha = 1;
                c.shadowBlur = 0;
                c.globalCompositeOperation = 'source-over';
            }
            if (this.isBlue) {
                this.glow += 0.08;
                c.globalAlpha = 0.25 + Math.sin(this.glow) * 0.15;
                c.strokeStyle = this.color;
                c.lineWidth = 2;
                const r = Math.max(dispW, dispH) / 2 + Math.sin(this.glow * 2) * 3;
                c.beginPath();
                c.arc(0, 0, r, 0, Math.PI * 2);
                c.stroke();
            }
            c.restore();
            return;
        }

        c.save();
        c.translate(this.x, this.y);
        if (this.isBlue) { this.glow += 0.08; c.save(); c.globalAlpha = 0.2 + Math.sin(this.glow) * 0.15; c.fillStyle = this.color; c.beginPath(); c.arc(0, 0, 14 + Math.sin(this.glow * 2) * 2, 0, Math.PI * 2); c.fill(); c.restore(); }
        const cl = this.hitFlash > 0 ? "#fff" : this.color;
        c.fillStyle = cl; c.strokeStyle = cl; c.lineWidth = 1.5;
        if (this.anim.state === 'DEATH') { const ds = 1 - f / 4; c.scale(ds, ds); c.globalAlpha = ds; }
        c.scale(2.16, 1.24);
        const wb = Math.sin(t * 0.1 + f) * 2;
        c.beginPath(); c.ellipse(0, -2 + wb, 13, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(0, -12 + wb * 0.5, 9, 7, 0, Math.PI, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = this.isBlue ? "#fff" : "#ffcc00"; c.beginPath(); c.arc(-4, -12, 2.5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(4, -12, 2.5, 0, Math.PI * 2); c.fill();
        if (f % 2 === 0) { c.beginPath(); c.arc(0, -15, 2, 0, Math.PI * 2); c.fill(); }
        c.strokeStyle = cl; c.lineWidth = 2;
        const ta = [[0.3, 0.6, -0.3, -0.6], [0.5, 0.3, -0.5, -0.3], [0.2, 0.7, -0.2, -0.7], [0.6, 0.4, -0.6, -0.4]][f];
        for (let i = 0; i < 4; i++) { const bx = (i < 2 ? -8 : 8) + (i % 2 === 0 ? -3 : 3); c.beginPath(); c.moveTo(bx, 6); c.quadraticCurveTo(bx + ta[i] * 12, 16 + Math.sin(t * 0.1 + i) * 3, bx + ta[i] * 8, 24); c.stroke(); }
        c.restore();
    }
    get cx() { return this.x; }
    get cy() { return this.y; }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Enemy = Enemy;

})(typeof window !== 'undefined' ? window : this);
