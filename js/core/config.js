/**
 * CROW'S DESTINY — ゲーム設定・定数
 */
(function (global) {
'use strict';

const CFG = {
    W: 960,
    H: 540,
    SCROLL: 2.5,
    PLAYER_SPD: 5.5,
    DASH_SPD: 21,  /* 1.5倍（14*1.5）でダッシュ距離を延長 */
    MARGIN: 30
};

const ANIM_FPS = 12;
const FRAME_DUR = Math.floor(60 / ANIM_FPS);

const ASSETS = {
    title: 'images/Bauhaus-inspired_ending_illustration_with_hopeful_-1771383063897.png',
    bg: 'images/Remove_background_from_this_image_to_create_transp-1771383320321.png',
    crowSheet: 'images/Remove_background_from_this_image_to_create_transp-1771383241042.png',
    enemySheet: 'images/Remove_background_from_this_image_to_create_transp-1771383257114.png',
    /* 敵スプライト（ステージ2・3・4・5・6・7で30%出現。左向き） */
    enemy2: 'images/enemy2.png',
    enemy3: 'images/enemy3.png',
    enemy4: 'images/enemy4.png',
    enemy5: 'images/enemy5.png',
    enemy6: 'images/enemy6.png',
    enemy7: 'images/enemy7.png',
    /* ボスの画像（ステージ1〜7に対応） */
    boss1: 'images/Remove_background-1771410952847.png',
    boss2: 'images/Remove_background-1771411006185.png',
    boss3: 'images/Remove_background-1771411158305.png',
    boss4: 'images/Remove_background-1771411258101.png',
    boss5: 'images/Remove_background-1771411296506.png',
    boss6: 'images/Remove_background-1771411489839.png',
    boss7: 'images/Remove_background_from_the_neon_geometric_sculptur-1771411908618.png',
    lastboss2: 'images/lastboss2.png',
    lastboss3: 'images/lastboss3.png',
    /** ラスボス 第二形態→第三形態（猫神）移行演出用・左から右に変化する5段階画像 */
    lastbossadvance2to3: 'images/lastbossadvance2to3.png',
    items: 'images/Remove_background_from_this_image_to_create_transp-1771383091874.png'
};

const AUDIO_ASSETS = {
    seItem: null
};

/** BGM: ステージ1-7、通常ボス(1-6用1本)、ラスボス3形態(boss7→lastboss→lastboss2)、オープニング、エンディング。ゲームオーバーは別用意。 */
const BGM_ASSETS = {
    opening: 'audio/opening.mp3',
    stage1: 'audio/stage1.mp3', stage2: 'audio/stage2.mp3', stage3: 'audio/stage3.mp3',
    stage4: 'audio/stage4.mp3', stage5: 'audio/stage5.mp3', stage6: 'audio/stage6.mp3', stage7: 'audio/stage7.mp3',
    boss: 'audio/boss.mp3',
    boss7: 'audio/boss7.mp3',
    lastboss1: 'audio/lastboss.mp3',
    lastboss2: 'audio/lastboss2.mp3',
    ending: 'audio/endding.mp3',
    gameover: 'audio/gameover.mp3'
};

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.CFG = CFG;
global.CrowDestiny.ANIM_FPS = ANIM_FPS;
global.CrowDestiny.FRAME_DUR = FRAME_DUR;
global.CrowDestiny.ASSETS = ASSETS;
global.CrowDestiny.AUDIO_ASSETS = AUDIO_ASSETS;
global.CrowDestiny.BGM_ASSETS = BGM_ASSETS;

})(typeof window !== 'undefined' ? window : this);
