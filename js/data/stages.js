/**
 * CROW'S DESTINY — ステージデータ（難易度・障害物色含む）
 */
(function (global) {
'use strict';

const STAGES = [
    { id: 1, name: "灰燼の街道",
      desc: "異界の侵食が始まった地。\n灰に覆われた街道に穢れし者が蠢く。",
      skyTop: "#1b0423", skyBot: "#3a2040", ground: "#2a1a2e", gLine: "#4a3050",
      eColor: "#8888cc", blueColor: "#44aaff",
      bossName: "穢れの先兵 — 彷徨う巨骸", bossColor: "#aa88ff",
      bgType: "ROAD", obsColor: "#7a9e50", obsGlow: "#a0cc66",
      enemyHpMul: 1.0, enemyBulletSpd: 3.0, enemyShootMin: 90, enemyShootMax: 170,
      spawnMin: 50, spawnMax: 90, bossHpBase: 220, bossAtkSpd: 1.0 },
    { id: 2, name: "汚染された地下水路",
      desc: "毒に侵された水路。\n壁を這う穢者が闇から迫る。",
      skyTop: "#0a0f18", skyBot: "#1a2530", ground: "#151f25", gLine: "#2a3a40",
      eColor: "#55bb88", blueColor: "#22ddff",
      bossName: "粘体の母胎 — ハイヴコア", bossColor: "#00ffaa",
      bgType: "SEWER", obsColor: "#b85540", obsGlow: "#e07055",
      enemyHpMul: 1.2, enemyBulletSpd: 3.3, enemyShootMin: 80, enemyShootMax: 155,
      spawnMin: 45, spawnMax: 82, bossHpBase: 280, bossAtkSpd: 1.1 },
    { id: 3, name: "封印研究所",
      desc: "人が穢れを解き明かそうとした場所。\n今は穢れに飲まれた廃墟。",
      skyTop: "#10101a", skyBot: "#202035", ground: "#1a1a28", gLine: "#3a3a50",
      eColor: "#aa77cc", blueColor: "#88ccff",
      bossName: "擬態する知性 — ミミック", bossColor: "#cc88ff",
      bgType: "LAB", obsColor: "#c4a840", obsGlow: "#e0c860",
      enemyHpMul: 1.4, enemyBulletSpd: 3.5, enemyShootMin: 70, enemyShootMax: 140,
      spawnMin: 40, spawnMax: 75, bossHpBase: 340, bossAtkSpd: 1.2 },
    { id: 4, name: "崩落の高架",
      desc: "空は異界の門に覆われ、\n風が刃のように吹き荒ぶ。",
      skyTop: "#1a0520", skyBot: "#351540", ground: "#2a1525", gLine: "#4a2a40",
      eColor: "#dd6644", blueColor: "#44bbff",
      bossName: "蒼穹の守護者 — 鉄翼", bossColor: "#ff6644",
      bgType: "BRIDGE", obsColor: "#40a0a8", obsGlow: "#5cc8d0",
      enemyHpMul: 1.6, enemyBulletSpd: 3.8, enemyShootMin: 65, enemyShootMax: 130,
      spawnMin: 35, spawnMax: 68, bossHpBase: 400, bossAtkSpd: 1.3 },
    { id: 5, name: "墜ちた方舟の内部",
      desc: "異界から落ちた巨大な残骸。\n有機と無機が融合した迷宮。",
      skyTop: "#050810", skyBot: "#0a1520", ground: "#0f1a20", gLine: "#1a2a35",
      eColor: "#66aaaa", blueColor: "#00eeff",
      bossName: "門番 — 多脚のガーディアン", bossColor: "#44dddd",
      bgType: "ARK", obsColor: "#c06838", obsGlow: "#e08850",
      enemyHpMul: 1.9, enemyBulletSpd: 4.0, enemyShootMin: 55, enemyShootMax: 120,
      spawnMin: 30, spawnMax: 62, bossHpBase: 480, bossAtkSpd: 1.4 },
    { id: 6, name: "培養層・蒼の深淵",
      desc: "無数の蒼光が脈打つ培養の間。\n穢れの源が近い。",
      skyTop: "#000815", skyBot: "#001530", ground: "#001020", gLine: "#002040",
      eColor: "#4488ff", blueColor: "#00ccff",
      bossName: "蒼穢の女王 — ブルーコア", bossColor: "#2288ff",
      bgType: "HIVE", obsColor: "#c88030", obsGlow: "#e8a848",
      enemyHpMul: 2.2, enemyBulletSpd: 4.3, enemyShootMin: 48, enemyShootMax: 110,
      spawnMin: 26, spawnMax: 55, bossHpBase: 560, bossAtkSpd: 1.5 },
    { id: 7, name: "次元の裂け目",
      desc: "現実が軋む。世界の境界が消える。\n全ての根源がここにある。",
      skyTop: "#100010", skyBot: "#200020", ground: "#180018", gLine: "#300030",
      eColor: "#ff44ff", blueColor: "#aaaaff",
      bossName: "裂け目そのもの — ヴォイド", bossColor: "#ff00ff",
      bgType: "VOID", obsColor: "#50c050", obsGlow: "#70e870",
      enemyHpMul: 2.6, enemyBulletSpd: 4.6, enemyShootMin: 40, enemyShootMax: 100,
      spawnMin: 22, spawnMax: 48, bossHpBase: 660, bossAtkSpd: 1.7 }
];

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.STAGES = STAGES;

})(typeof window !== 'undefined' ? window : this);
