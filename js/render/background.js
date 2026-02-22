/**
 * CROW'S DESTINY — 背景（パララックス・ステージ別描画）
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const STAGES = global.CrowDestiny.STAGES;
const IMG = global.CrowDestiny.IMG;
const hex2rgb = global.CrowDestiny.hex2rgb;
const rgb = global.CrowDestiny.rgb;
const lerpC = global.CrowDestiny.lerpC;
const rr = global.CrowDestiny.rr;
const ri = global.CrowDestiny.ri;

class Background {
    constructor() {
        this.scrollX = 0; this.speed = CFG.SCROLL; this.scrolling = true;
        this.topC = hex2rgb(STAGES[0].skyTop).slice(); this.tTopC = hex2rgb(STAGES[0].skyTop);
        this.botC = hex2rgb(STAGES[0].skyBot).slice(); this.tBotC = hex2rgb(STAGES[0].skyBot);
        this.gndC = hex2rgb(STAGES[0].ground).slice(); this.tGndC = hex2rgb(STAGES[0].ground);
        this.lnC = hex2rgb(STAGES[0].gLine).slice(); this.tLnC = hex2rgb(STAGES[0].gLine);
        this.bgType = "ROAD";
        this.far = []; this.mid = [];
        for (let i = 0; i < 25; i++) this.far.push({ x: rr(0, 1400), y: rr(40, 400), s: rr(0.3, 0.6), t: ri(0, 4) });
        for (let i = 0; i < 12; i++) this.mid.push({ x: rr(0, 1400), y: rr(250, 460), s: rr(0.5, 0.9), t: ri(0, 3) });
    }
    setStage(sd) {
        this.tTopC = hex2rgb(sd.skyTop); this.tBotC = hex2rgb(sd.skyBot);
        this.tGndC = hex2rgb(sd.ground); this.tLnC = hex2rgb(sd.gLine);
        this.bgType = sd.bgType;
    }
    update() {
        const s = this.scrolling ? this.speed : 0;
        this.scrollX += s;
        this.topC = lerpC(this.topC, this.tTopC, 0.02);
        this.botC = lerpC(this.botC, this.tBotC, 0.02);
        this.gndC = lerpC(this.gndC, this.tGndC, 0.02);
        this.lnC = lerpC(this.lnC, this.tLnC, 0.02);
        this.far.forEach(o => { o.x -= s * 0.3; if (o.x < -120) { o.x = CFG.W + ri(50, 250); o.y = rr(40, 400); } });
        this.mid.forEach(o => { o.x -= s * 0.65; if (o.x < -120) { o.x = CFG.W + ri(50, 250); o.y = rr(250, 460); } });
    }
    draw(c) {
        const g = c.createLinearGradient(0, 0, 0, CFG.H);
        g.addColorStop(0, rgb(this.topC)); g.addColorStop(0.75, rgb(this.botC)); g.addColorStop(1, rgb(this.gndC));
        c.fillStyle = g; c.fillRect(0, 0, CFG.W, CFG.H);
        if (IMG.bg) {
            c.save(); c.globalAlpha = 0.35;
            const bw = IMG.bg.naturalWidth || 800, bh = IMG.bg.naturalHeight || 400;
            const scale = Math.max(CFG.W / bw, CFG.H / bh) * 1.2, ww = bw * scale;
            let par = (-this.scrollX * 0.2) % ww; if (par > 0) par -= ww;
            c.drawImage(IMG.bg, 0, 0, bw, bh, par, 0, ww, bh * scale);
            c.drawImage(IMG.bg, 0, 0, bw, bh, par + ww, 0, ww, bh * scale);
            c.restore();
        }
        c.fillStyle = rgb(this.gndC); c.fillRect(0, CFG.H - 50, CFG.W, 50);
        c.strokeStyle = rgb(this.lnC); c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, CFG.H - 50); c.lineTo(CFG.W, CFG.H - 50); c.stroke();
        this.drawStageSpecific(c);
    }
    drawStageSpecific(c) {
        const t = this.scrollX, bt = this.bgType;
        /* ステージ4(BRIDGE)・5(ARK)・6(HIVE)の動きはすべて this.scrollX に連動 */
        c.save();
        if (bt === "ROAD") {
            c.fillStyle = "rgba(0,0,0,0.12)";
            this.far.forEach(o => { c.save(); c.translate(o.x, o.y); c.scale(o.s, o.s); c.fillRect(-15, -40, 30, 55); c.fillRect(-20, -30, 10, 45); c.restore(); });
            c.fillStyle = "rgba(200,180,160,0.08)";
            for (let i = 0; i < 30; i++) { const x = ((i * 73 + t * 0.4) % 1100) - 70, y = (i * 47 + t * 0.2) % 500; c.fillRect(x, y, rr(2, 4), rr(2, 4)); }
        } else if (bt === "SEWER") {
            c.strokeStyle = "rgba(0,80,60,0.25)"; c.lineWidth = 8;
            for (let i = 0; i < 4; i++) {
                const y = 60 + i * 130; c.beginPath(); c.moveTo(0, y); c.lineTo(CFG.W, y); c.stroke();
                for (let x = ((-t * 0.3) % 200) - 50; x < CFG.W + 50; x += 200) { c.fillStyle = "rgba(0,80,60,0.3)"; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill(); }
            }
            c.fillStyle = "rgba(0,200,150,0.15)";
            for (let i = 0; i < 20; i++) { const x = ((i * 89 + t * 0.5) % 1050) - 40, y2 = (i * 53 + t * 1.2) % 540; c.beginPath(); c.arc(x, y2, 3, 0, Math.PI * 2); c.fill(); }
        } else if (bt === "LAB") {
            c.fillStyle = "rgba(60,40,80,0.1)";
            this.far.forEach(o => { c.save(); c.translate(o.x, o.y); c.scale(o.s, o.s); c.fillRect(-20, -25, 40, 50); c.fillRect(-8, -35, 16, 10); c.restore(); });
            c.strokeStyle = "rgba(170,120,220,0.2)"; c.lineWidth = 1;
            for (let i = 0; i < 8; i++) { const x = (i * 131 + t * 0.6) % 1000, y = (i * 97) % 440 + 50, dx = Math.sin(t * 0.02 + i) * 20; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + 15); c.lineTo(x - dx * 0.5, y + 30); c.stroke(); }
        } else if (bt === "BRIDGE") {
            c.strokeStyle = "rgba(100,40,60,0.2)"; c.lineWidth = 4;
            const bridgeScroll = (t * 0.4) % 300;
            for (let x = -bridgeScroll - 50; x < CFG.W + 50; x += 300) {
                c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CFG.H); c.stroke();
                c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 150, CFG.H); c.stroke();
                c.beginPath(); c.moveTo(x + 300, 0); c.lineTo(x + 150, CFG.H); c.stroke();
            }
            const ellipseOffset = (t * 0.05) % 200;
            c.fillStyle = "rgba(80,20,60,0.15)"; c.beginPath(); c.ellipse(CFG.W / 2 + 100 - ellipseOffset, 120, 180, 120, 0, Math.PI, 0); c.fill();
        } else if (bt === "ARK") {
            c.strokeStyle = "rgba(0,100,100,0.15)"; c.lineWidth = 6;
            for (let i = 0; i < 6; i++) {
                const y = 50 + i * 90; c.beginPath(); c.moveTo(0, y);
                for (let x = 0; x < CFG.W; x += 60) c.quadraticCurveTo(x + 30, y + Math.sin((x + t) * 0.01 + i) * 25, x + 60, y);
                c.stroke();
            }
            c.fillStyle = "rgba(0,220,220,0.1)";
            this.far.forEach(o => { const pulse = Math.sin(t * 0.003 + o.x) * 0.5 + 0.5; c.globalAlpha = pulse * 0.2; c.beginPath(); c.arc(o.x, o.y, 8 * o.s, 0, Math.PI * 2); c.fill(); });
            c.globalAlpha = 1;
        } else if (bt === "HIVE") {
            c.strokeStyle = "rgba(0,80,200,0.15)"; c.lineWidth = 3;
            for (let i = 0; i < 10; i++) {
                const y = 30 + i * 55; c.beginPath(); c.moveTo(0, y);
                for (let x = 0; x < CFG.W; x += 80) { c.lineTo(x + 40, y + Math.sin((x + t) * 0.008 + i) * 18); c.lineTo(x + 80, y); }
                c.stroke();
            }
            this.far.forEach(o => { const pulse = Math.sin(t * 0.004 + o.x * 0.01) * 0.5 + 0.5; c.save(); c.globalAlpha = pulse * 0.3; c.fillStyle = "#0066ff"; c.beginPath(); c.ellipse(o.x, o.y, 12 * o.s, 18 * o.s, 0, 0, Math.PI * 2); c.fill(); c.restore(); });
        } else if (bt === "VOID") {
            c.strokeStyle = "rgba(200,0,200,0.08)"; c.lineWidth = 1;
            for (let x = ((-t * 0.5) % 100) - 50; x < CFG.W + 50; x += 100) { c.beginPath(); c.moveTo(x + Math.sin(t * 0.01 + x * 0.01) * 20, 0); c.lineTo(x + Math.sin(t * 0.01 + x * 0.01 + 3) * 20, CFG.H); c.stroke(); }
            for (let y = 0; y < CFG.H; y += 100) { c.beginPath(); c.moveTo(0, y + Math.cos(t * 0.01 + y * 0.01) * 15); c.lineTo(CFG.W, y + Math.cos(t * 0.01 + y * 0.01 + 3) * 15); c.stroke(); }
            c.fillStyle = "rgba(255,0,255,0.12)";
            for (let i = 0; i < 8; i++) {
                const ex = ((i * 127 + t * 0.3) % 1050) - 40, ey = (i * 89) % 480 + 30, blink = Math.sin(t * 0.005 + i * 2) > 0.3 ? 1 : 0;
                if (blink) { c.beginPath(); c.ellipse(ex, ey, 10, 6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,255,255,0.2)"; c.beginPath(); c.arc(ex, ey, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,0,255,0.12)"; }
            }
        }
        c.restore();
    }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Background = Background;

})(typeof window !== 'undefined' ? window : this);
