/**
 * CROW'S DESTINY — HUD（スコア・HP・ダッシュCD・ステージ表示）
 */
(function (global) {
'use strict';

const CFG = global.CrowDestiny.CFG;
const STAGES = global.CrowDestiny.STAGES;
const clamp = global.CrowDestiny.clamp;

function drawHUD(c, crow, score, stIdx, blueK) {
    const sd = STAGES[stIdx];
    c.fillStyle = "#e0cda7"; c.font = "22px serif"; c.fillText(`SCORE: ${score}`, 20, 32);
    c.font = "15px serif"; c.fillStyle = "#aa8866"; c.fillText(`— ${sd.name} —`, 20, 54);
    c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(18, 60, 164, 12);
    const hpR = clamp(crow.hp / crow.maxHp, 0, 1); c.fillStyle = hpR > 0.5 ? "#cc2222" : hpR > 0.25 ? "#cc6600" : "#ff0000"; c.fillRect(20, 62, 160 * hpR, 8);
    if (crow.dashCD > 0) { c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(18, 76, 164, 6); c.fillStyle = "#6688cc"; c.fillRect(20, 77, 160 * (1 - crow.dashCD / 45), 4); }
    c.fillStyle = "#e0cda7"; c.font = "13px serif"; c.fillText(`覚醒: Lv.${crow.weaponLevel}`, 20, 100);
    if (crow.barrier > 0) { c.fillStyle = "#aaeeff"; c.fillText(`障壁: ${Math.ceil(crow.barrier / 60)}s`, 20, 116); }
    c.fillStyle = "#44aaff"; c.font = "18px serif"; c.fillText(`蒼穢: ${blueK} / 3`, CFG.W - 140, 32);
    c.fillStyle = "#aa8866"; c.font = "13px serif"; c.fillText(`STAGE ${stIdx + 1} / ${STAGES.length}`, CFG.W - 140, 52);
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.drawHUD = drawHUD;

})(typeof window !== 'undefined' ? window : this);
