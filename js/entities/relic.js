/**
 * CROW'S DESTINY — 聖遺物（アイテム）
 */
(function (global) {
'use strict';

const IMG = global.CrowDestiny.IMG;
const ri = global.CrowDestiny.ri;

const RELIC_TYPES = [
    { id: "CHALICE", name: "聖杯", color: "#44ff44", effect: "HEAL", icon: "cross", iconIndex: 0, desc: "体力を30回復する。" },
    { id: "CROSS", name: "聖十字架", color: "#aaeeff", effect: "BARRIER", icon: "shield", iconIndex: 1, desc: "1発だけ被弾を防ぐ障壁（約8秒）。" },
    { id: "TOME", name: "予言書", color: "#cc88ff", effect: "SLOW", icon: "hourglass", iconIndex: 2, desc: "時間が緩む演出（約6秒）。" },
    { id: "FLAME", name: "聖火", color: "#ff4400", effect: "BOMB", icon: "explosion", iconIndex: 3, desc: "画面上の敵に大ダメージを与える。" }
];

class Relic {
    constructor(x, y) {
        this.x = x; this.y = y; this.vy = 0; this.active = true;
        this.type = RELIC_TYPES[ri(0, RELIC_TYPES.length)]; this.timer = 0;
    }
    update(spd) {
        this.timer++; this.x -= spd; this.y += Math.sin(this.timer * 0.06) * 0.5;
        if (this.x < -50 || this.timer > 600) this.active = false;
    }
    draw(c) {
        c.save(); c.translate(this.x, this.y); const p = 1 + Math.sin(this.timer * 0.1) * 0.12; c.scale(p * 0.383, p * 0.383);
        if (IMG.items && this.type.iconIndex !== undefined) {
            const sh = IMG.items, sw = sh.naturalWidth || 400, shh = sh.naturalHeight || 100, sliceW = sw / 4, sx = this.type.iconIndex * sliceW;
            c.globalAlpha = 0.9 + Math.sin(this.timer * 0.08) * 0.1; c.drawImage(sh, sx, 0, sliceW, shh, -sliceW / 3, -shh / 3, sliceW * 2 / 3, shh * 2 / 3);
        } else {
            c.globalAlpha = 0.25 + Math.sin(this.timer * 0.08) * 0.1; c.fillStyle = this.type.color; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
            c.globalAlpha = 1; c.strokeStyle = this.type.color; c.lineWidth = 2.5;
            if (this.type.icon === "cross") { c.fillStyle = this.type.color; c.fillRect(-2.5, -10, 5, 20); c.fillRect(-10, -2.5, 20, 5); }
            else if (this.type.icon === "shield") { c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(12, -6, 10, 4); c.quadraticCurveTo(6, 12, 0, 14); c.quadraticCurveTo(-6, 12, -10, 4); c.quadraticCurveTo(-12, -6, 0, -10); c.closePath(); c.stroke(); }
            else if (this.type.icon === "hourglass") { c.beginPath(); c.moveTo(-7, -10); c.lineTo(7, -10); c.lineTo(0, 0); c.lineTo(7, 10); c.lineTo(-7, 10); c.lineTo(0, 0); c.closePath(); c.stroke(); }
            else if (this.type.icon === "explosion") { c.beginPath(); for (let i = 0; i < 8; i++) { const a = (Math.PI * 2 / 8) * i, r = i % 2 === 0 ? 10 : 5, px = Math.cos(a) * r, py = Math.sin(a) * r; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.closePath(); c.stroke(); c.fillStyle = this.type.color; c.globalAlpha = 0.4; c.fill(); }
        }
        c.restore();
    }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.RELIC_TYPES = RELIC_TYPES;
global.CrowDestiny.Relic = Relic;

})(typeof window !== 'undefined' ? window : this);
