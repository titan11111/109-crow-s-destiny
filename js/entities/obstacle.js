/**
 * CROW'S DESTINY — 障害物（視認性強化・グロー縁取り）
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const STAGES = global.CrowDestiny.STAGES;
const ri = global.CrowDestiny.ri;
const rr = global.CrowDestiny.rr;

class Obstacle {
    constructor(x, y, w, h, type, color, glowColor, stageIdx) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.type = type; this.color = color; this.glowColor = glowColor;
        this.active = true; this.timer = 0; this.stageIdx = stageIdx; this.dangerous = true;
    }
    update(spd) {
        this.x -= spd; this.timer++;
        if (this.x < -this.w - 60) this.active = false;
        this.dangerous = this.type === "LASER" ? Math.sin(this.timer * 0.06) > 0 : true;
    }
    _drawGlow(c, drawFn) {
        c.save(); c.shadowColor = this.glowColor; c.shadowBlur = 12; c.globalAlpha = 0.5; drawFn(c, this.glowColor); c.restore();
        drawFn(c, this.color);
        c.save(); c.globalAlpha = 0.35; c.strokeStyle = this.glowColor; c.lineWidth = 1.5; drawFn(c, null, true); c.restore();
    }
    draw(c) {
        c.save(); c.translate(this.x, this.y); const t = this.timer;
        if (this.type === "PILLAR") {
            this._drawGlow(c, (ctx, col, strokeOnly) => {
                if (strokeOnly) { ctx.strokeRect(0, 0, this.w, this.h); return; }
                ctx.fillStyle = col; ctx.fillRect(0, 0, this.w, this.h);
                ctx.strokeStyle = this.glowColor; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, this.w, this.h);
                ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.w * 0.3, 0); ctx.lineTo(this.w * 0.5, this.h * 0.4); ctx.lineTo(this.w * 0.2, this.h); ctx.stroke();
            });
        } else if (this.type === "RUBBLE") {
            this._drawGlow(c, (ctx, col, strokeOnly) => {
                ctx.beginPath(); ctx.moveTo(0, this.h); ctx.lineTo(this.w * 0.3, 0); ctx.lineTo(this.w * 0.7, this.h * 0.2); ctx.lineTo(this.w, this.h * 0.8); ctx.closePath();
                if (strokeOnly) { ctx.stroke(); return; } ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = this.glowColor; ctx.lineWidth = 1.5; ctx.stroke();
            });
        } else if (this.type === "PIPE_H") {
            this._drawGlow(c, (ctx, col, strokeOnly) => {
                if (strokeOnly) { ctx.strokeRect(0, 0, this.w, this.h); return; }
                ctx.fillStyle = col; ctx.fillRect(0, 0, this.w, this.h); ctx.strokeStyle = this.glowColor; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, this.w, this.h);
                ctx.beginPath(); ctx.ellipse(0, this.h / 2, 5, this.h / 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(this.w, this.h / 2, 5, this.h / 2, 0, 0, Math.PI * 2); ctx.fill();
            });
            c.fillStyle = this.glowColor; c.globalAlpha = 0.4; c.beginPath(); c.arc(this.w / 2, this.h + (t * 2) % 35, 3, 0, Math.PI * 2); c.fill();
        } else if (this.type === "TANK") {
            this._drawGlow(c, (ctx, col, strokeOnly) => {
                ctx.beginPath(); ctx.ellipse(this.w / 2, this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
                if (strokeOnly) { ctx.stroke(); return; } ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = this.glowColor; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = this.glowColor; ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.ellipse(this.w / 2, this.h / 2, this.w / 3, this.h / 3, 0, 0, Math.PI * 2); ctx.fill();
            });
        } else if (this.type === "LASER") {
            if (this.dangerous) {
                const pulse = 0.6 + Math.sin(t * 0.15) * 0.3; c.globalAlpha = pulse;
                c.fillStyle = "#ff3366"; c.fillRect(0, 0, this.w, this.h); c.fillStyle = "rgba(255,180,200,0.4)"; c.fillRect(-4, 0, this.w + 8, this.h);
                c.shadowColor = "#ff3366"; c.shadowBlur = 16; c.fillStyle = "#ff3366"; c.fillRect(0, 0, this.w, this.h); c.shadowBlur = 0;
            } else { c.globalAlpha = 0.25; c.strokeStyle = "#ff6688"; c.setLineDash([4, 6]); c.lineWidth = 1; c.strokeRect(0, 0, this.w, this.h); c.setLineDash([]); }
        } else if (this.type === "GIRDER") {
            this._drawGlow(c, (ctx, col, strokeOnly) => {
                if (strokeOnly) { ctx.strokeRect(0, 0, this.w, this.h); return; }
                ctx.fillStyle = col; ctx.fillRect(0, 0, this.w, this.h); ctx.strokeStyle = this.glowColor; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, this.w, this.h);
                ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(this.w, this.h); ctx.moveTo(this.w, 0); ctx.lineTo(0, this.h); ctx.stroke();
            });
        } else if (this.type === "TENDRIL") {
            c.save(); c.shadowColor = this.glowColor; c.shadowBlur = 10; c.strokeStyle = this.color; c.lineWidth = this.w * 0.6;
            c.beginPath(); c.moveTo(this.w / 2, 0); c.quadraticCurveTo(this.w / 2 + Math.sin(t * 0.04) * 18, this.h / 2, this.w / 2, this.h); c.stroke(); c.restore();
            const pulse = Math.sin(t * 0.08) * 0.5 + 0.5; c.globalAlpha = pulse * 0.5; c.strokeStyle = this.glowColor; c.lineWidth = this.w * 0.25;
            c.beginPath(); c.moveTo(this.w / 2, 0); c.quadraticCurveTo(this.w / 2 + Math.sin(t * 0.04) * 18, this.h / 2, this.w / 2, this.h); c.stroke();
        } else if (this.type === "POD") {
            c.save(); c.shadowColor = this.glowColor; c.shadowBlur = 14; c.fillStyle = this.color; c.beginPath(); c.ellipse(this.w / 2, this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2); c.fill(); c.restore();
            c.strokeStyle = this.glowColor; c.lineWidth = 1.5; c.beginPath(); c.ellipse(this.w / 2, this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2); c.stroke();
            const glow = Math.sin(t * 0.06) * 0.3 + 0.3; c.globalAlpha = glow; c.fillStyle = this.glowColor; c.beginPath(); c.ellipse(this.w / 2, this.h / 2, this.w / 3, this.h / 3, 0, 0, Math.PI * 2); c.fill();
        } else if (this.type === "RIFT") {
            c.save(); c.shadowColor = this.glowColor; c.shadowBlur = 16; c.strokeStyle = this.glowColor; c.lineWidth = 3; c.beginPath();
            for (let i = 0; i < 5; i++) { const px = this.w / 2 + Math.sin(t * 0.03 + i * 1.3) * this.w * 0.4, py = i * (this.h / 4); if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
            c.stroke(); c.restore(); c.globalAlpha = 0.18; c.fillStyle = this.glowColor; c.fillRect(0, 0, this.w, this.h);
        } else { c.fillStyle = this.color; c.fillRect(0, 0, this.w, this.h); c.strokeStyle = this.glowColor; c.lineWidth = 1.5; c.strokeRect(0, 0, this.w, this.h); }
        c.restore();
    }
    hits(px, py, pw, ph) {
        if (!this.dangerous) return false;
        return px < this.x + this.w && px + pw > this.x && py < this.y + this.h && py + ph > this.y;
    }
}

function spawnObstacle(stageIdx) {
    const sd = STAGES[stageIdx];
    const types = { 0: ["PILLAR", "RUBBLE"], 1: ["PIPE_H", "TANK"], 2: ["TANK", "LASER"], 3: ["GIRDER", "RUBBLE"], 4: ["TENDRIL", "PILLAR"], 5: ["POD", "LASER"], 6: ["RIFT", "PILLAR"] };
    const pool = types[stageIdx] || ["PILLAR"];
    const type = pool[ri(0, pool.length)];
    let x = CFG.W + 50, y, w, h;
    const zone = ri(0, 3);
    if (type === "LASER") { w = 8; h = ri(80, 200); y = zone === 0 ? ri(20, 120) : zone === 1 ? ri(160, 300) : ri(340, 460); }
    else if (type === "TENDRIL") { w = ri(20, 35); h = ri(100, 220); y = zone === 0 ? ri(10, 100) : zone === 1 ? ri(150, 280) : ri(320, 440); }
    else if (type === "RIFT") { w = ri(40, 70); h = ri(60, 160); y = ri(40, CFG.H - 200); }
    else if (type === "PIPE_H") { w = ri(100, 200); h = ri(18, 30); y = zone === 0 ? ri(40, 140) : zone === 1 ? ri(200, 320) : ri(380, 480); }
    else { w = ri(30, 60); h = ri(30, 80); y = zone === 0 ? ri(30, 150) : zone === 1 ? ri(200, 340) : ri(380, 470); }
    return new Obstacle(x, y, w, h, type, sd.obsColor, sd.obsGlow, stageIdx);
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Obstacle = Obstacle;
global.CrowDestiny.spawnObstacle = spawnObstacle;

})(typeof window !== 'undefined' ? window : this);
