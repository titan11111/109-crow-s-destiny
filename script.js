(function () {
'use strict';

/* ==========================================================
   [1] CONFIG
   ========================================================== */
const CFG = {
    W: 960, H: 540,
    SCROLL: 2.5,          // 横スクロール速度
    PLAYER_SPD: 5.5,      // プレイヤー移動速度
    DASH_SPD: 14,
    MARGIN: 30            // 画面端余白
};
const ANIM_FPS = 12;
const FRAME_DUR = Math.floor(60 / ANIM_FPS);

/* 画像アセット（index.html からの相対パス）
   - タイトル/エンディング、背景、プレイヤー・敵・ボス・アイテムスプライト */
const ASSETS = {
    title: 'images/Bauhaus-inspired_ending_illustration_with_hopeful_-1771383063897.png',
    bg: 'images/Remove_background_from_this_image_to_create_transp-1771383320321.png',
    crowSheet: 'images/Remove_background_from_this_image_to_create_transp-1771383241042.png',
    enemySheet: 'images/Remove_background_from_this_image_to_create_transp-1771383257114.png',
    enemy2: 'images/enemy2.png', enemy3: 'images/enemy3.png', enemy5: 'images/enemy5.png', enemy7: 'images/enemy7.png',
    boss: 'images/Remove_background_from_this_image_to_create_transp-1771383113450.png',
    items: 'images/Remove_background_from_this_image_to_create_transp-1771383091874.png'
};

/* オーディオアセット（SE用） */
const AUDIO_ASSETS = {
    seItem: null,
    seShoot: null,
    seHit: null,
    seDash: null
};

/* BGM: ステージ1-7、通常ボス(1-6用)、ラスボス3形態(boss7→lastboss1→lastboss2)、オープニング、エンディング */
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

let IMG = {}; // 読み込み済み画像（loadAssets 後に代入）

function loadAssets(){
    const imgEntries = Object.entries(ASSETS);
    const imgPromises = imgEntries.map(([key, src]) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { IMG[key] = img; resolve(); };
            img.onerror = () => { console.warn('Asset failed:', src); resolve(); };
            img.src = src;
        });
    });
    return Promise.all(imgPromises);
}

/* ==========================================================
   [AUDIO] SOUND MANAGER — iOS Safari対応の音声システム
   ========================================================== */
class SoundManager {
    constructor(){
        this.audioContext = null;
        this.initialized = false;
        this.seEnabled = true;
        this.seVolume = 0.7;
        this.audioCache = {};
        this.bgmEnabled = true;
        this.bgmVolume = 0.6;
        this._bgmEl = null;
        this._currentBGM = null;
    }

    /* ユーザージェスチャー内で必ず呼ぶ（iOS Safari必須） */
    init(){
        if(this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            this.initialized = true;
        } catch(e){
            console.warn('AudioContext init failed:', e);
        }
    }

    async ensureResumed(){
        if(this.audioContext && this.audioContext.state === 'suspended'){
            try { await this.audioContext.resume(); } catch(e){ console.warn('AudioContext resume failed:', e); }
        }
    }

    async loadAudio(src, key){
        if(!src || this.audioCache[key]) return Promise.resolve();
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = this.seVolume;
            audio.oncanplaythrough = () => { this.audioCache[key] = audio; resolve(); };
            audio.onerror = () => { console.warn('Audio load failed:', src); resolve(); };
            audio.src = src;
        });
    }

    playSE(key){
        if(!this.seEnabled) return;
        const src = AUDIO_ASSETS[key];
        if(!src) return;
        if(this.audioCache[key]){
            const se = this.audioCache[key].cloneNode();
            se.volume = this.seVolume;
            se.play().catch(e => console.warn('SE play failed:', e));
        } else {
            this.loadAudio(src, key).then(() => this.playSE(key));
        }
    }

    playSEProcedural(type){
        if(!this.seEnabled) return;
        if(!this.audioContext) this.init();
        if(!this.audioContext) return;
        this.ensureResumed().then(()=>{
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        gain.gain.setValueAtTime(0, now);
        if(type==='shoot'){
            this._shootCount = (this._shootCount||0)+1;
            if(this._shootCount>4) return;
            osc.type='sawtooth';
            osc.frequency.setValueAtTime(280,now);
            osc.frequency.exponentialRampToValueAtTime(120,now+0.06);
            gain.gain.setValueAtTime(0.18*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.06);
            osc.start(now); osc.stop(now+0.07);
            osc.onended=()=>{ this._shootCount=Math.max(0,(this._shootCount||1)-1); };
        } else if(type==='hit'){
            osc.type='square';
            osc.frequency.setValueAtTime(120,now);
            osc.frequency.exponentialRampToValueAtTime(50,now+0.1);
            gain.gain.setValueAtTime(0.35*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.1);
            osc.start(now); osc.stop(now+0.12);
        } else if(type==='item'){
            osc.type='sine';
            osc.frequency.setValueAtTime(440,now);
            osc.frequency.exponentialRampToValueAtTime(880,now+0.08);
            gain.gain.setValueAtTime(0.2*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.1);
            osc.start(now); osc.stop(now+0.12);
        } else if(type==='dash'){
            osc.type='sawtooth';
            osc.frequency.setValueAtTime(180,now);
            osc.frequency.exponentialRampToValueAtTime(80,now+0.05);
            gain.gain.setValueAtTime(0.12*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.06);
            osc.start(now); osc.stop(now+0.07);
        } else if(type==='bluePurify'){
            osc.type='sine';
            osc.frequency.setValueAtTime(523,now);
            osc.frequency.exponentialRampToValueAtTime(1047,now+0.12);
            gain.gain.setValueAtTime(0.22*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.18);
            osc.start(now); osc.stop(now+0.2);
        } else if(type==='stageClear'){
            osc.type='sine';
            osc.frequency.setValueAtTime(523,now);
            osc.frequency.setValueAtTime(659,now+0.08);
            osc.frequency.setValueAtTime(784,now+0.16);
            gain.gain.setValueAtTime(0.2*this.seVolume,now);
            gain.gain.setValueAtTime(0.2*this.seVolume,now+0.08);
            gain.gain.setValueAtTime(0.25*this.seVolume,now+0.16);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.4);
            osc.start(now); osc.stop(now+0.45);
        } else if(type==='gameOver'){
            osc.type='sawtooth';
            osc.frequency.setValueAtTime(150,now);
            osc.frequency.exponentialRampToValueAtTime(55,now+0.25);
            gain.gain.setValueAtTime(0.3*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.3);
            osc.start(now); osc.stop(now+0.35);
        } else if(type==='titleStart'){
            osc.type='sine';
            osc.frequency.setValueAtTime(440,now);
            osc.frequency.setValueAtTime(554,now+0.06);
            gain.gain.setValueAtTime(0.18*this.seVolume,now);
            gain.gain.exponentialRampToValueAtTime(0.001,now+0.12);
            osc.start(now); osc.stop(now+0.14);
        }
        });
    }

    playShoot(){ this.playSEProcedural('shoot'); }
    playHit(){ this.playSEProcedural('hit'); }
    playItem(){ this.playSEProcedural('item'); }
    playDash(){ this.playSEProcedural('dash'); }
    playBluePurify(){ this.playSEProcedural('bluePurify'); }
    playStageClear(){ this.playSEProcedural('stageClear'); }
    playGameOver(){ this.playSEProcedural('gameOver'); }
    playTitleStart(){ this.playSEProcedural('titleStart'); }

    toggleSE(){
        this.seEnabled = !this.seEnabled;
        localStorage.setItem('crowDestiny_se', this.seEnabled);
    }

    loadSettings(){
        const se = localStorage.getItem('crowDestiny_se');
        if(se !== null) this.seEnabled = se === 'true';
        const bgm = localStorage.getItem('crowDestiny_bgm');
        if(bgm !== null) this.bgmEnabled = bgm === 'true';
    }

    stopBGM(){
        if(this._bgmEl){ try{ this._bgmEl.pause(); this._bgmEl.currentTime = 0; }catch(_){} this._bgmEl = null; }
        this._currentBGM = null;
    }

    playBGM(key){
        if(!this.bgmEnabled || !BGM_ASSETS) return;
        const src = BGM_ASSETS[key];
        if(!src) return;
        if(this._currentBGM === key && this._bgmEl && !this._bgmEl.paused) return;
        this.stopBGM();
        try{
            const el = new Audio(src);
            el.volume = this.bgmVolume;
            el.loop = true;
            el.play().catch(e => console.warn('BGM play failed:', key, e));
            this._bgmEl = el;
            this._currentBGM = key;
        }catch(e){ console.warn('BGM init failed:', key, e); }
    }
}

/* ==========================================================
   [2] UTILITIES
   ========================================================== */
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const dist  = (a, b, c, d) => Math.hypot(c - a, d - b);
const rr    = (a, b) => Math.random() * (b - a) + a;
const ri    = (a, b) => Math.floor(rr(a, b));
const lerp  = (a, b, t) => a + (b - a) * t;
const hex2rgb = h => [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)];
const rgb    = r => `rgb(${r[0]|0},${r[1]|0},${r[2]|0})`;
const lerpC  = (a, b, t) => [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];

/* ==========================================================
   [3] ANIM STATE
   ========================================================== */
class Anim {
    constructor(st){ this.st=st; this.cur=Object.keys(st)[0]; this.f=0; this.t=0; this.done=false; }
    set(n){ if(this.cur===n||!this.st[n])return; this.cur=n; this.f=0; this.t=0; this.done=false; }
    update(){
        const s=this.st[this.cur], spd=s.speed||1;
        if(++this.t>=Math.max(1,Math.floor(FRAME_DUR/spd))){
            this.t=0; this.f++;
            if(this.f>=(s.frames||4)){
                if(s.loop!==false) this.f=0;
                else{ this.f=(s.frames||4)-1; this.done=true; }
            }
        }
    }
    get frame(){ return this.f; }
    get state(){ return this.cur; }
}

/* ==========================================================
   [4] STAGE DATA — 7ステージ
   obsColor: 障害物を背景から浮かせる対比色（補色系）
   obsGlow:  障害物の縁取りグロー色
   ========================================================== */
const STAGES = [
    { id:1, name:"灰燼の街道",
      desc:"異界の侵食が始まった地。\n灰に覆われた街道に穢れし者が蠢く。",
      skyTop:"#1b0423", skyBot:"#3a2040", ground:"#2a1a2e", gLine:"#4a3050",
      eColor:"#8888cc", blueColor:"#44aaff",
      bossName:"穢れの先兵 — 彷徨う巨骸", bossColor:"#aa88ff",
      bgType:"ROAD",
      obsColor:"#7a9e50", obsGlow:"#a0cc66",
      /* 難易度スケール（初心者向け調整） */
      enemyHpMul:1.0, enemyBulletSpd:3.0, enemyShootMin:110, enemyShootMax:190,
      spawnMin:65, spawnMax:105, bossHpBase:180, bossAtkSpd:0.9
    },
    { id:2, name:"汚染された地下水路",
      desc:"毒に侵された水路。\n壁を這う穢者が闇から迫る。",
      skyTop:"#0a0f18", skyBot:"#1a2530", ground:"#151f25", gLine:"#2a3a40",
      eColor:"#55bb88", blueColor:"#22ddff",
      bossName:"粘体の母胎 — ハイヴコア", bossColor:"#00ffaa",
      bgType:"SEWER",
      obsColor:"#b85540", obsGlow:"#e07055",
      enemyHpMul:1.2, enemyBulletSpd:3.3, enemyShootMin:80, enemyShootMax:155,
      spawnMin:45, spawnMax:82, bossHpBase:280, bossAtkSpd:1.1
    },
    { id:3, name:"封印研究所",
      desc:"人が穢れを解き明かそうとした場所。\n今は穢れに飲まれた廃墟。",
      skyTop:"#10101a", skyBot:"#202035", ground:"#1a1a28", gLine:"#3a3a50",
      eColor:"#aa77cc", blueColor:"#88ccff",
      bossName:"擬態する知性 — ミミック", bossColor:"#cc88ff",
      bgType:"LAB",
      obsColor:"#c4a840", obsGlow:"#e0c860",
      enemyHpMul:1.4, enemyBulletSpd:3.5, enemyShootMin:70, enemyShootMax:140,
      spawnMin:40, spawnMax:75, bossHpBase:340, bossAtkSpd:1.2
    },
    { id:4, name:"崩落の高架",
      desc:"空は異界の門に覆われ、\n風が刃のように吹き荒ぶ。",
      skyTop:"#1a0520", skyBot:"#351540", ground:"#2a1525", gLine:"#4a2a40",
      eColor:"#dd6644", blueColor:"#44bbff",
      bossName:"蒼穹の守護者 — 鉄翼", bossColor:"#ff6644",
      bgType:"BRIDGE",
      obsColor:"#40a0a8", obsGlow:"#5cc8d0",
      enemyHpMul:1.6, enemyBulletSpd:3.8, enemyShootMin:65, enemyShootMax:130,
      spawnMin:35, spawnMax:68, bossHpBase:400, bossAtkSpd:1.3
    },
    { id:5, name:"墜ちた方舟の内部",
      desc:"異界から落ちた巨大な残骸。\n有機と無機が融合した迷宮。",
      skyTop:"#050810", skyBot:"#0a1520", ground:"#0f1a20", gLine:"#1a2a35",
      eColor:"#66aaaa", blueColor:"#00eeff",
      bossName:"門番 — 多脚のガーディアン", bossColor:"#44dddd",
      bgType:"ARK",
      obsColor:"#c06838", obsGlow:"#e08850",
      enemyHpMul:1.9, enemyBulletSpd:4.0, enemyShootMin:55, enemyShootMax:120,
      spawnMin:30, spawnMax:62, bossHpBase:480, bossAtkSpd:1.4
    },
    { id:6, name:"培養層・蒼の深淵",
      desc:"無数の蒼光が脈打つ培養の間。\n穢れの源が近い。",
      skyTop:"#000815", skyBot:"#001530", ground:"#001020", gLine:"#002040",
      eColor:"#ff6699", blueColor:"#ffaa00", bossName:"蒼穢の女王 — ブルーコア", bossColor:"#ff4466",
      bgType:"HIVE",
      obsColor:"#c88030", obsGlow:"#e8a848",
      enemyHpMul:2.2, enemyBulletSpd:4.3, enemyShootMin:48, enemyShootMax:110,
      spawnMin:26, spawnMax:55, bossHpBase:560, bossAtkSpd:1.5
    },
    { id:7, name:"次元の裂け目",
      desc:"現実が軋む。世界の境界が消える。\n全ての根源がここにある。",
      skyTop:"#100010", skyBot:"#200020", ground:"#180018", gLine:"#300030",
      eColor:"#ff44ff", blueColor:"#aaaaff",
      bossName:"裂け目そのもの — ヴォイド", bossColor:"#ff00ff",
      bgType:"VOID",
      obsColor:"#50c050", obsGlow:"#70e870",
      enemyHpMul:2.6, enemyBulletSpd:4.6, enemyShootMin:50, enemyShootMax:110,
      spawnMin:22, spawnMax:48, bossHpBase:480, bossAtkSpd:1.7
    }
];

/* ==========================================================
   [5] PARTICLE / FX
   ========================================================== */
class Particle {
    constructor(x,y,vx,vy,col,life,sz){
        this.x=x;this.y=y;this.vx=vx;this.vy=vy;
        this.col=col;this.life=life;this.ml=life;
        this.sz=sz||rr(3,7);this.on=true;
    }
    update(){ this.x+=this.vx; this.y+=this.vy; this.vy+=0.015; if(--this.life<=0)this.on=false; }
    draw(c){
        c.save(); c.globalAlpha=this.life/this.ml; c.fillStyle=this.col;
        c.fillRect(this.x-this.sz/2,this.y-this.sz/2,this.sz,this.sz); c.restore();
    }
}

class FX {
    constructor(){ this.p=[]; this.shake=0; this.flash=0; this.fCol="#fff"; }
    burst(x,y,col,n=15,spd=4,life=25){
        for(let i=0;i<n;i++){
            const a=Math.random()*Math.PI*2, s=Math.random()*spd;
            this.p.push(new Particle(x,y,Math.cos(a)*s,Math.sin(a)*s,col,life+ri(0,15)));
        }
    }
    big(x,y,col){ this.burst(x,y,col,50,7,40); this.shake=25; this.flash=12; this.fCol=col; }
    update(){
        for(let i=this.p.length-1;i>=0;i--){ this.p[i].update(); if(!this.p[i].on)this.p.splice(i,1); }
        if(this.shake>0)this.shake*=0.9; if(this.flash>0)this.flash--;
    }
    draw(c){ this.p.forEach(p=>p.draw(c)); }
    applyShake(c){ if(this.shake>0.5)c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake); }
    drawFlash(c){
        if(this.flash>0){ c.save(); c.globalAlpha=this.flash/15; c.fillStyle=this.fCol; c.fillRect(0,0,CFG.W,CFG.H); c.restore(); }
    }
}

/* ==========================================================
   [6] TEXT OVERLAY
   ========================================================== */
class TextOverlay {
    constructor(){ this.m=[]; }
    show(t,col,dur,sz,x,y){ this.m.push({t,col:col||"#e0cda7",dur,md:dur,sz:sz||28,x:x??CFG.W/2,y:y||CFG.H/2}); }
    update(){ for(let i=this.m.length-1;i>=0;i--){ if(--this.m[i].dur<=0)this.m.splice(i,1); } }
    draw(c){
        this.m.forEach(m=>{
            const a=Math.min(1,m.dur/30,(m.md-m.dur+1)/30);
            c.save(); c.globalAlpha=a; c.fillStyle=m.col;
            c.font=`${m.sz}px serif`; c.textAlign="center";
            c.fillText(m.t,m.x,m.y); c.restore();
        });
    }
}

/* ==========================================================
   [7] EFFECT OVERLAY — アイテム取得時の視覚フィードバック
   ========================================================== */
class EffectOverlay {
    constructor(){ this.fx=[]; }
    add(type,col,dur){ this.fx.push({type,col,dur,md:dur,t:0}); }
    update(){ for(let i=this.fx.length-1;i>=0;i--){ if(++this.fx[i].t>=this.fx[i].md)this.fx.splice(i,1); } }
    draw(c, crow){
        this.fx.forEach(e=>{
            const p=e.t/e.md, a=1-p;
            c.save();
            if(e.type==="HEAL"){
                c.globalAlpha=a*0.7;
                for(let i=0;i<6;i++){
                    const px=crow.cx+Math.sin(e.t*0.12+i*1.05)*55;
                    const py=crow.cy-e.t*1.8+i*22;
                    c.fillStyle="#44ff44";
                    c.fillRect(px-2,py-8,4,16);
                    c.fillRect(px-8,py-2,16,4);
                }
                c.globalAlpha=a*0.15;
                c.strokeStyle="#44ff44"; c.lineWidth=8;
                c.strokeRect(0,0,CFG.W,CFG.H);
            } else if(e.type==="BARRIER"){
                c.globalAlpha=a*0.6;
                c.strokeStyle="#aaeeff"; c.lineWidth=3;
                c.beginPath(); c.arc(crow.cx,crow.cy,30+p*25,0,Math.PI*2); c.stroke();
                c.strokeStyle="rgba(170,238,255,0.2)"; c.lineWidth=10;
                c.beginPath(); c.arc(crow.cx,crow.cy,30+p*40,0,Math.PI*2); c.stroke();
            } else if(e.type==="SLOW"){
                c.globalAlpha=a*0.2; c.fillStyle="#cc88ff"; c.fillRect(0,0,CFG.W,CFG.H);
                c.globalAlpha=a*0.8;
                c.translate(CFG.W/2,CFG.H/2); c.scale(2.5-p*1.5,2.5-p*1.5);
                c.strokeStyle="#cc88ff"; c.lineWidth=3;
                c.beginPath();
                c.moveTo(-12,-18);c.lineTo(12,-18);c.lineTo(0,0);
                c.lineTo(12,18);c.lineTo(-12,18);c.lineTo(0,0);c.closePath();c.stroke();
            } else if(e.type==="BOMB"){
                const r=p*450;
                c.globalAlpha=a*0.5; c.strokeStyle="#ff4400"; c.lineWidth=8*a;
                c.beginPath(); c.arc(crow.cx,crow.cy,r,0,Math.PI*2); c.stroke();
                c.globalAlpha=a*0.08; c.fillStyle="#ff4400";
                c.beginPath(); c.arc(crow.cx,crow.cy,r,0,Math.PI*2); c.fill();
            }
            c.restore();
        });
    }
}

/* ==========================================================
   [8] BACKGROUND — ステージ固有の背景描画
   ========================================================== */
class Background {
    constructor(){
        this.scrollX=0; this.speed=CFG.SCROLL; this.scrolling=true;
        this.topC=hex2rgb(STAGES[0].skyTop);  this.tTopC=this.topC.slice();
        this.botC=hex2rgb(STAGES[0].skyBot);   this.tBotC=this.botC.slice();
        this.gndC=hex2rgb(STAGES[0].ground);   this.tGndC=this.gndC.slice();
        this.lnC =hex2rgb(STAGES[0].gLine);    this.tLnC=this.lnC.slice();
        this.bgType="ROAD";
        this.far=[]; this.mid=[];
        this.gradientCache = null;
        this.lastColorSignature = '';
        for(let i=0;i<25;i++) this.far.push({x:rr(0,1400),y:rr(40,400),s:rr(.3,.6),t:ri(0,4)});
        for(let i=0;i<12;i++) this.mid.push({x:rr(0,1400),y:rr(250,460),s:rr(.5,.9),t:ri(0,3)});
    }
    setStage(sd){
        this.tTopC=hex2rgb(sd.skyTop); this.tBotC=hex2rgb(sd.skyBot);
        this.tGndC=hex2rgb(sd.ground); this.tLnC=hex2rgb(sd.gLine);
        this.bgType=sd.bgType;
    }
    update(){
        const s=this.scrolling?this.speed:0;
        this.scrollX+=s;
        this.topC=lerpC(this.topC,this.tTopC,0.02);
        this.botC=lerpC(this.botC,this.tBotC,0.02);
        this.gndC=lerpC(this.gndC,this.tGndC,0.02);
        this.lnC =lerpC(this.lnC,this.tLnC,0.02);
        this.far.forEach(o=>{ o.x-=s*0.3; if(o.x<-120){o.x=CFG.W+ri(50,250);o.y=rr(40,400);} });
        this.mid.forEach(o=>{ o.x-=s*0.65; if(o.x<-120){o.x=CFG.W+ri(50,250);o.y=rr(250,460);} });
    }
    draw(c){
        const colorSig = `${rgb(this.topC)}-${rgb(this.botC)}-${rgb(this.gndC)}`;
        if(this.lastColorSignature !== colorSig){
            const g = c.createLinearGradient(0,0,0,CFG.H);
            g.addColorStop(0,rgb(this.topC)); g.addColorStop(0.75,rgb(this.botC)); g.addColorStop(1,rgb(this.gndC));
            this.gradientCache = g;
            this.lastColorSignature = colorSig;
        }
        c.fillStyle = this.gradientCache; c.fillRect(0,0,CFG.W,CFG.H);
        if(IMG.bg){
            c.save();
            c.globalAlpha=0.35;
            const bw=IMG.bg.naturalWidth||800, bh=IMG.bg.naturalHeight||400;
            const scale=Math.max(CFG.W/bw,CFG.H/bh)*1.2;
            const ww=bw*scale;
            let par=(-this.scrollX*0.2)%ww;
            if(par>0) par-=ww;
            c.drawImage(IMG.bg,0,0,bw,bh, par,0, ww,bh*scale);
            c.drawImage(IMG.bg,0,0,bw,bh, par+ww,0, ww,bh*scale);
            c.restore();
        }
        c.fillStyle=rgb(this.gndC); c.fillRect(0,CFG.H-50,CFG.W,50);
        c.strokeStyle=rgb(this.lnC); c.lineWidth=2;
        c.beginPath(); c.moveTo(0,CFG.H-50); c.lineTo(CFG.W,CFG.H-50); c.stroke();
        this.drawStageSpecific(c);
    }
    drawStageSpecific(c){
        const t=this.scrollX;
        const bt=this.bgType;
        c.save();

        if(bt==="ROAD"){
            c.fillStyle="rgba(0,0,0,0.12)";
            this.far.forEach(o=>{ c.save(); c.translate(o.x,o.y); c.scale(o.s,o.s);
                c.fillRect(-15,-40,30,55); c.fillRect(-20,-30,10,45); c.restore(); });
            c.fillStyle="rgba(200,180,160,0.08)";
            for(let i=0;i<30;i++){
                const x=((i*73+t*0.4)%1100)-70, y=((i*47+t*0.2)%500);
                c.fillRect(x,y,rr(2,4),rr(2,4));
            }
        } else if(bt==="SEWER"){
            c.strokeStyle="rgba(0,80,60,0.25)"; c.lineWidth=8;
            for(let i=0;i<4;i++){
                const y=60+i*130;
                c.beginPath(); c.moveTo(0,y); c.lineTo(CFG.W,y); c.stroke();
                for(let x=((-t*0.3)%200)-50;x<CFG.W+50;x+=200){
                    c.fillStyle="rgba(0,80,60,0.3)";
                    c.beginPath(); c.arc(x,y,12,0,Math.PI*2); c.fill();
                }
            }
            c.fillStyle="rgba(0,200,150,0.15)";
            for(let i=0;i<20;i++){
                const x=((i*89+t*0.5)%1050)-40;
                const y=((i*53+t*1.2)%540);
                c.beginPath(); c.arc(x,y,3,0,Math.PI*2); c.fill();
            }
        } else if(bt==="LAB"){
            c.fillStyle="rgba(60,40,80,0.1)";
            this.far.forEach(o=>{ c.save(); c.translate(o.x,o.y); c.scale(o.s,o.s);
                c.fillRect(-20,-25,40,50); c.fillRect(-8,-35,16,10);
                c.restore(); });
            c.strokeStyle="rgba(170,120,220,0.2)"; c.lineWidth=1;
            for(let i=0;i<8;i++){
                const x=((i*131+t*0.6)%1000), y=((i*97)%440)+50;
                const dx=Math.sin(t*0.02+i)*20;
                c.beginPath(); c.moveTo(x,y); c.lineTo(x+dx,y+15); c.lineTo(x-dx*0.5,y+30); c.stroke();
            }
        } else if(bt==="BRIDGE"){
            c.strokeStyle="rgba(100,40,60,0.2)"; c.lineWidth=4;
            for(let x=((-t*0.4)%300)-50;x<CFG.W+50;x+=300){
                c.beginPath(); c.moveTo(x,0); c.lineTo(x,CFG.H); c.stroke();
                c.beginPath(); c.moveTo(x,0); c.lineTo(x+150,CFG.H); c.stroke();
                c.beginPath(); c.moveTo(x+300,0); c.lineTo(x+150,CFG.H); c.stroke();
            }
            c.fillStyle="rgba(80,20,60,0.15)";
            c.beginPath(); c.ellipse(CFG.W/2-t*0.05%200+100,120,180,120,0,Math.PI,0); c.fill();
        } else if(bt==="ARK"){
            c.strokeStyle="rgba(0,100,100,0.15)"; c.lineWidth=6;
            for(let i=0;i<6;i++){
                const y=50+i*90;
                c.beginPath(); c.moveTo(0,y);
                for(let x=0;x<CFG.W;x+=60){
                    c.quadraticCurveTo(x+30,y+Math.sin((x+t)*0.01+i)*25,x+60,y);
                }
                c.stroke();
            }
            c.fillStyle="rgba(0,220,220,0.1)";
            this.far.forEach(o=>{
                const pulse=Math.sin(t*0.003+o.x)*0.5+0.5;
                c.globalAlpha=pulse*0.2;
                c.beginPath(); c.arc(o.x,o.y,8*o.s,0,Math.PI*2); c.fill();
            });
            c.globalAlpha=1;
        } else if(bt==="HIVE"){
            c.strokeStyle="rgba(0,80,200,0.15)"; c.lineWidth=3;
            for(let i=0;i<10;i++){
                const y=30+i*55;
                c.beginPath(); c.moveTo(0,y);
                for(let x=0;x<CFG.W;x+=80){
                    c.lineTo(x+40,y+Math.sin((x+t)*0.008+i)*18);
                    c.lineTo(x+80,y);
                }
                c.stroke();
            }
            this.far.forEach(o=>{
                const pulse=Math.sin(t*0.004+o.x*0.01)*0.5+0.5;
                c.save(); c.globalAlpha=pulse*0.3; c.fillStyle="#0066ff";
                c.beginPath(); c.ellipse(o.x,o.y,12*o.s,18*o.s,0,0,Math.PI*2); c.fill();
                c.restore();
            });
        } else if(bt==="VOID"){
            c.strokeStyle="rgba(200,0,200,0.08)"; c.lineWidth=1;
            for(let x=((-t*0.5)%100)-50;x<CFG.W+50;x+=100){
                c.beginPath(); c.moveTo(x+Math.sin(t*0.01+x*0.01)*20,0);
                c.lineTo(x+Math.sin(t*0.01+x*0.01+3)*20,CFG.H); c.stroke();
            }
            for(let y=0;y<CFG.H;y+=100){
                c.beginPath(); c.moveTo(0,y+Math.cos(t*0.01+y*0.01)*15);
                c.lineTo(CFG.W,y+Math.cos(t*0.01+y*0.01+3)*15); c.stroke();
            }
            c.fillStyle="rgba(255,0,255,0.12)";
            for(let i=0;i<8;i++){
                const ex=((i*127+t*0.3)%1050)-40;
                const ey=((i*89)%480)+30;
                const blink=Math.sin(t*0.005+i*2)>0.3?1:0;
                if(blink){
                    c.beginPath(); c.ellipse(ex,ey,10,6,0,0,Math.PI*2); c.fill();
                    c.fillStyle="rgba(255,255,255,0.2)";
                    c.beginPath(); c.arc(ex,ey,3,0,Math.PI*2); c.fill();
                    c.fillStyle="rgba(255,0,255,0.12)";
                }
            }
        }
        c.restore();
    }
}

/* ==========================================================
   [9] OBSTACLE SYSTEM — 視認性強化：対比色＋グロー縁取り
   ========================================================== */
class Obstacle {
    constructor(x,y,w,h,type,color,glowColor,stageIdx){
        this.x=x; this.y=y; this.w=w; this.h=h;
        this.type=type; this.color=color; this.glowColor=glowColor;
        this.active=true; this.timer=0;
        this.stageIdx=stageIdx;
        this.dangerous=true;
    }
    update(spd){
        this.x-=spd; this.timer++;
        if(this.x<-this.w-60) this.active=false;
        /* レーザー: 判定と視覚を同期（120フレーム＝2秒サイクル） */
        if(this.type==="LASER"){
            const cycle = 120;
            const phase = (this.timer % cycle) / cycle;
            this.dangerous = phase < 0.5;
        } else this.dangerous = true;
    }
    /* 軽量グロー（shadowBlur 不使用で描画負荷軽減） */
    _drawLightweightGlow(c, drawFn){
        c.save();
        c.globalAlpha = 0.2;
        c.scale(1.1, 1.1);
        c.translate(-this.w * 0.05, -this.h * 0.05);
        drawFn(c, this.glowColor);
        c.restore();
        drawFn(c, this.color);
        c.save();
        c.globalAlpha = 0.4;
        c.strokeStyle = this.glowColor;
        c.lineWidth = 1.5;
        drawFn(c, null, true);
        c.restore();
    }
    draw(c){
        c.save(); c.translate(this.x,this.y);
        const t=this.timer;

        if(this.type==="PILLAR"){
            this._drawLightweightGlow(c, (ctx, col, strokeOnly)=>{
                if(strokeOnly){ ctx.strokeRect(0,0,this.w,this.h); return; }
                ctx.fillStyle=col; ctx.fillRect(0,0,this.w,this.h);
                ctx.strokeStyle=this.glowColor; ctx.lineWidth=1.5; ctx.strokeRect(0,0,this.w,this.h);
                ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1;
                ctx.beginPath();
                ctx.moveTo(this.w*.3,0); ctx.lineTo(this.w*.5,this.h*.4); ctx.lineTo(this.w*.2,this.h); ctx.stroke();
            });
        } else if(this.type==="RUBBLE"){
            this._drawLightweightGlow(c, (ctx, col, strokeOnly)=>{
                ctx.beginPath(); ctx.moveTo(0,this.h); ctx.lineTo(this.w*.3,0);
                ctx.lineTo(this.w*.7,this.h*.2); ctx.lineTo(this.w,this.h*.8); ctx.closePath();
                if(strokeOnly){ ctx.stroke(); return; }
                ctx.fillStyle=col; ctx.fill();
                ctx.strokeStyle=this.glowColor; ctx.lineWidth=1.5; ctx.stroke();
            });
        } else if(this.type==="PIPE_H"){
            this._drawLightweightGlow(c, (ctx, col, strokeOnly)=>{
                if(strokeOnly){
                    ctx.strokeRect(0,0,this.w,this.h);
                    return;
                }
                ctx.fillStyle=col; ctx.fillRect(0,0,this.w,this.h);
                ctx.strokeStyle=this.glowColor; ctx.lineWidth=1.5; ctx.strokeRect(0,0,this.w,this.h);
                ctx.beginPath(); ctx.ellipse(0,this.h/2,5,this.h/2,0,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(this.w,this.h/2,5,this.h/2,0,0,Math.PI*2); ctx.fill();
            });
            /* 水滴 */
            c.fillStyle=this.glowColor; c.globalAlpha=0.4;
            const dy=(t*2)%35;
            c.beginPath(); c.arc(this.w/2,this.h+dy,3,0,Math.PI*2); c.fill();
        } else if(this.type==="TANK"){
            this._drawLightweightGlow(c, (ctx, col, strokeOnly)=>{
                ctx.beginPath(); ctx.ellipse(this.w/2,this.h/2,this.w/2,this.h/2,0,0,Math.PI*2);
                if(strokeOnly){ ctx.stroke(); return; }
                ctx.fillStyle=col; ctx.fill();
                ctx.strokeStyle=this.glowColor; ctx.lineWidth=1.5; ctx.stroke();
                ctx.fillStyle=this.glowColor; ctx.globalAlpha=0.2;
                ctx.beginPath(); ctx.ellipse(this.w/2,this.h/2,this.w/3,this.h/3,0,0,Math.PI*2); ctx.fill();
            });
        } else if(this.type==="LASER"){
            const cycle = 120;
            const phase = (t % cycle) / cycle;
            if(this.dangerous){
                const pulse = 0.7 + Math.sin(phase * Math.PI * 8) * 0.3;
                c.globalAlpha = pulse;
                c.fillStyle = "#ff3366"; c.fillRect(0,0,this.w,this.h);
                c.globalAlpha = pulse * 0.3;
                c.fillStyle = "rgba(255,51,102,0.6)";
                c.fillRect(-2,-2,this.w+4,this.h+4);
            } else {
                c.globalAlpha = 0.2;
                c.strokeStyle = "#ff6688"; c.setLineDash([6,6]); c.lineWidth = 1;
                c.strokeRect(0,0,this.w,this.h);
                c.setLineDash([]);
            }
        } else if(this.type==="GIRDER"){
            this._drawLightweightGlow(c, (ctx, col, strokeOnly)=>{
                if(strokeOnly){ ctx.strokeRect(0,0,this.w,this.h); return; }
                ctx.fillStyle=col; ctx.fillRect(0,0,this.w,this.h);
                ctx.strokeStyle=this.glowColor; ctx.lineWidth=1.5; ctx.strokeRect(0,0,this.w,this.h);
                ctx.strokeStyle="rgba(255,255,255,0.1)"; ctx.lineWidth=2;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(this.w,this.h);
                ctx.moveTo(this.w,0); ctx.lineTo(0,this.h); ctx.stroke();
            });
        } else if(this.type==="TENDRIL"){
            c.save();
            c.globalAlpha = 0.35;
            c.strokeStyle = this.glowColor; c.lineWidth = this.w * 0.6 + 2;
            c.beginPath(); c.moveTo(this.w/2,0);
            c.quadraticCurveTo(this.w/2+Math.sin(t*0.04)*18,this.h/2,this.w/2,this.h); c.stroke();
            c.restore();
            c.strokeStyle = this.color; c.lineWidth = this.w*0.6;
            c.beginPath(); c.moveTo(this.w/2,0);
            c.quadraticCurveTo(this.w/2+Math.sin(t*0.04)*18,this.h/2,this.w/2,this.h); c.stroke();
            const pulse = Math.sin(t*0.08)*.5+.5;
            c.globalAlpha = pulse*0.5;
            c.strokeStyle = this.glowColor; c.lineWidth = this.w*0.25;
            c.beginPath(); c.moveTo(this.w/2,0);
            c.quadraticCurveTo(this.w/2+Math.sin(t*0.04)*18,this.h/2,this.w/2,this.h); c.stroke();
        } else if(this.type==="POD"){
            c.save();
            c.globalAlpha = 0.25;
            c.fillStyle = this.glowColor;
            c.beginPath(); c.ellipse(this.w/2,this.h/2,this.w/2+2,this.h/2+2,0,0,Math.PI*2); c.fill();
            c.restore();
            c.fillStyle = this.color;
            c.beginPath(); c.ellipse(this.w/2,this.h/2,this.w/2,this.h/2,0,0,Math.PI*2); c.fill();
            c.strokeStyle = this.glowColor; c.lineWidth = 1.5;
            c.beginPath(); c.ellipse(this.w/2,this.h/2,this.w/2,this.h/2,0,0,Math.PI*2); c.stroke();
            const glow = Math.sin(t*0.06)*.3+.3;
            c.globalAlpha = glow; c.fillStyle = this.glowColor;
            c.beginPath(); c.ellipse(this.w/2,this.h/2,this.w/3,this.h/3,0,0,Math.PI*2); c.fill();
        } else if(this.type==="RIFT"){
            c.save();
            c.globalAlpha = 0.2;
            c.strokeStyle = this.glowColor; c.lineWidth = 4;
            c.beginPath();
            for(let i=0;i<5;i++){
                const px=this.w/2+Math.sin(t*0.03+i*1.3)*this.w*0.4;
                const py=i*(this.h/4);
                if(i===0) c.moveTo(px,py); else c.lineTo(px,py);
            }
            c.stroke();
            c.restore();
            c.globalAlpha = 0.18; c.fillStyle = this.glowColor;
            c.fillRect(0,0,this.w,this.h);
        } else {
            /* フォールバック */
            c.fillStyle=this.color; c.fillRect(0,0,this.w,this.h);
            c.strokeStyle=this.glowColor; c.lineWidth=1.5; c.strokeRect(0,0,this.w,this.h);
        }
        c.restore();
    }
    hits(px,py,pw,ph){
        if(!this.dangerous) return false;
        return px<this.x+this.w && px+pw>this.x && py<this.y+this.h && py+ph>this.y;
    }
}

function spawnObstacle(stageIdx){
    const sd=STAGES[stageIdx];
    const types={
        0:["PILLAR","RUBBLE"],
        1:["PIPE_H","TANK"],
        2:["TANK","LASER"],
        3:["GIRDER","RUBBLE"],
        4:["TENDRIL","PILLAR"],
        5:["POD","LASER"],
        6:["RIFT","PILLAR"]
    };
    const pool=types[stageIdx]||["PILLAR"];
    const type=pool[ri(0,pool.length)];
    let x=CFG.W+50, y, w, h;
    const zone=ri(0,3);
    if(type==="LASER"){
        w=8; h=ri(80,200);
        y=zone===0?ri(20,120):zone===1?ri(160,300):ri(340,460);
    } else if(type==="TENDRIL"){
        w=ri(20,35); h=ri(100,220);
        y=zone===0?ri(10,100):zone===1?ri(150,280):ri(320,440);
    } else if(type==="RIFT"){
        w=ri(40,70); h=ri(60,160);
        y=ri(40,CFG.H-200);
    } else if(type==="PIPE_H"){
        w=ri(100,200); h=ri(18,30);
        y=zone===0?ri(40,140):zone===1?ri(200,320):ri(380,480);
    } else {
        w=ri(30,60); h=ri(30,80);
        y=zone===0?ri(30,150):zone===1?ri(200,340):ri(380,470);
    }
    return new Obstacle(x,y,w,h,type,sd.obsColor,sd.obsGlow,stageIdx);
}

/* ==========================================================
   [10] CROW — プレイヤー（常時浮遊STG仕様 / 描画2倍）
   ========================================================== */
class Crow {
    constructor(soundManager=null){
        this.soundManager=soundManager;
        this.x=120; this.y=CFG.H/2-4;
        this.vx=0; this.vy=0;
        this.w=9; this.h=8;
        this.hp=100; this.maxHp=100;
        this.inv=0;
        this.facing=1;
        this.weaponLevel=1;
        this.barrier=0;
        this.dashCD=0; this.dashing=false; this.dashT=0;
        this.anim=new Anim({
            'FLY':{frames:4,loop:true,speed:1},
            'DASH':{frames:4,loop:false,speed:2},
            'HIT':{frames:4,loop:false,speed:1},
            'KO':{frames:4,loop:false,speed:.5}
        });
        this.shootT=0;
        this.feathers=[];
    }
    update(keys){
        if(this.anim.state==='KO') return;
        if(this.anim.state==='HIT'&&!this.anim.done){ this.anim.update(); return; }

        let mx=0, my=0;
        if(keys['ArrowLeft']||keys['KeyA']||keys['TouchLeft']) mx=-1;
        if(keys['ArrowRight']||keys['KeyD']||keys['TouchRight']) mx=1;
        if(keys['ArrowUp']||keys['KeyW']||keys['TouchUp']) my=-1;
        if(keys['ArrowDown']||keys['KeyS']||keys['TouchDown']) my=1;

        if((keys['ShiftLeft']||keys['ShiftRight']||keys['TouchDash'])&&this.dashCD<=0&&!this.dashing){
            this.dashing=true; this.dashT=12; this.dashCD=45;
            this.anim.set('DASH'); this.inv=Math.max(this.inv,30);
            if(this.soundManager&&this.soundManager.playDash) this.soundManager.playDash();
        }
        if(this.dashing){
            this.dashT--;
            this.vx=this.facing*CFG.DASH_SPD;
            this.vy=my*CFG.DASH_SPD*0.5;
            if(this.dashT<=0) this.dashing=false;
        } else {
            this.vx=mx*CFG.PLAYER_SPD;
            this.vy=my*CFG.PLAYER_SPD;
        }
        if(this.dashCD>0) this.dashCD--;
        if(mx!==0) this.facing=mx>0?1:-1;

        this.x+=this.vx; this.y+=this.vy;
        this.x=clamp(this.x,CFG.MARGIN,CFG.W-this.w-CFG.MARGIN);
        this.y=clamp(this.y,CFG.MARGIN,CFG.H-this.h-CFG.MARGIN);

        if(this.inv>0) this.inv--;
        if(this.barrier>0) this.barrier--;
        if(!this.dashing) this.anim.set('FLY');
        this.anim.update();

        this.shootT++;
        const intv=Math.max(5,14-this.weaponLevel*2);
        if(this.shootT>=intv){ this.shootT=0; this.shoot(); if(this.soundManager&&this.soundManager.playShoot) this.soundManager.playShoot(); }
        if(this.hp<this.maxHp) this.hp=Math.min(this.maxHp,this.hp+0.005);
    }
    shoot(){
        const lvl=Math.min(this.weaponLevel,5);
        for(let i=0;i<lvl;i++){
            const spread=(i-(lvl-1)/2)*0.18;
            this.feathers.push({
                x:this.x+this.w/2+this.facing*12,
                y:this.y+this.h/2-3+i*3-((lvl-1)/2)*3,
                vx:this.facing*14,vy:spread*2.8,
                active:true,life:0
            });
        }
    }
    takeDamage(amt,fx){
        if(this.inv>0) return false;
        if(this.barrier>0){
            this.barrier=0;
            fx.burst(this.cx,this.cy,"#aaeeff",20,5);
            this.inv=30; return false;
        }
        this.hp-=amt; this.inv=90;
        this.anim.set('HIT');
        if(this.soundManager&&this.soundManager.playHit) this.soundManager.playHit();
        fx.burst(this.cx,this.cy,"#ff3333",18,5);
        fx.shake=10;
        if(this.hp<=0){ this.anim.set('KO'); return true; }
        return false;
    }
    draw(c){
        c.save();
        const cx=this.x+this.w/2, cy=this.y+this.h/2;
        c.translate(cx,cy);
        if(this.inv>0){
            if(this.inv%6>2) c.globalAlpha=0.4;
            const auraAlpha = 0.4 + Math.sin(this.inv*0.3)*0.2;
            c.save();
            c.globalAlpha = auraAlpha;
            c.strokeStyle = this.dashing ? "#00ffff" : "#ffff00";
            c.lineWidth = 3;
            c.beginPath();
            c.arc(0,0, 18+Math.sin(this.inv*0.4)*4, 0, Math.PI*2);
            c.stroke();
            c.restore();
        }
        if(this.inv>0&&this.inv%4>1) c.globalAlpha=0.35;
        c.scale(this.facing/3,1/3);

        const f=this.anim.frame, s=this.anim.state;

        if(IMG.crowSheet){
            const sh=IMG.crowSheet, sw=sh.naturalWidth||128, shh=sh.naturalHeight||96;
            const cw=sw/4, ch=shh/4;
            const rowMap={ FLY:2, DASH:3, HIT:2, KO:3 };
            const row=rowMap[s]!==undefined?rowMap[s]:2;
            const col=Math.min(f,3);
            const sx=col*cw, sy=row*ch;
            c.drawImage(sh, sx,sy,cw,ch, -cw/2,-ch/2,cw,ch);
        } else {
            const wingA={'FLY':[-0.5,-0.1,0.3,0.5],'DASH':[0.5,0.5,0.4,0.3],'HIT':[-0.3,0,0.1,0],'KO':[0.6,0.6,0.6,0.6]};
            const wa=(wingA[s]||wingA['FLY'])[f];
            c.fillStyle="#111"; c.strokeStyle="#333"; c.lineWidth=1.5;
            c.save(); c.rotate(-wa);
            c.beginPath(); c.moveTo(-2,-5); c.lineTo(-24,-16+f*2); c.lineTo(-19,-9); c.closePath(); c.fill(); c.stroke();
            c.restore();
            c.save(); c.rotate(wa*0.6);
            c.beginPath(); c.moveTo(-2,5); c.lineTo(-22,14-f*1.5); c.lineTo(-17,8); c.closePath(); c.fill(); c.stroke();
            c.restore();
            c.beginPath(); c.ellipse(0,0,13,10,0,0,Math.PI*2); c.fill(); c.stroke();
            c.beginPath(); c.ellipse(9,-5,8,7,0.2,0,Math.PI*2); c.fill(); c.stroke();
            c.fillStyle="#554422";
            c.beginPath(); c.moveTo(15,-6); c.lineTo(22,-3); c.lineTo(15,-2); c.closePath(); c.fill();
            c.fillStyle="#ff0000";
            c.beginPath(); c.arc(12,-7,2.5,0,Math.PI*2); c.fill();
            c.fillStyle="rgba(255,0,0,0.35)";
            c.beginPath(); c.arc(12,-7,5,0,Math.PI*2); c.fill();
            c.fillStyle="#111";
            const tOff=s==='DASH'?8:f*1.5;
            c.beginPath(); c.moveTo(-11,3); c.lineTo(-24+tOff,7); c.lineTo(-20+tOff,2); c.closePath(); c.fill();
            c.beginPath(); c.moveTo(-11,5); c.lineTo(-26+tOff,11); c.lineTo(-22+tOff,6); c.closePath(); c.fill();
        }

        if(this.barrier>0){
            c.globalAlpha=0.18+Math.sin(this.barrier*0.15)*0.1;
            c.strokeStyle="#aaeeff"; c.lineWidth=2;
            c.beginPath(); c.arc(0,0,22,0,Math.PI*2); c.stroke();
        }
        c.restore();
    }
    drawFeathers(c){
        c.fillStyle="#e0cda7";
        for(let i=this.feathers.length-1;i>=0;i--){
            const f=this.feathers[i];
            f.x+=f.vx; f.y+=f.vy; f.life++;
            if(f.x<-30||f.x>CFG.W+30||f.y<-30||f.y>CFG.H+30) f.active=false;
            if(!f.active){ this.feathers.splice(i,1); continue; }
            c.save(); c.translate(f.x,f.y);
            c.rotate(Math.atan2(f.vy,f.vx));
            c.scale(0.55,0.55);
            c.globalAlpha=0.9;
            c.beginPath(); c.moveTo(12,0); c.lineTo(-7,-4); c.lineTo(-7,4); c.closePath(); c.fill();
            c.restore();
        }
    }
    get cx(){ return this.x+this.w/2; }
    get cy(){ return this.y+this.h/2; }
}

/* ==========================================================
   [11] ENEMY — 穢れし者（描画2倍）
   ========================================================== */
const STAGE_SPRITE_KEYS = { 1: 'enemy2', 2: 'enemy3', 4: 'enemy5', 6: 'enemy7' };
class Enemy {
    constructor(x,y,sd,isBlue=false,stageIdx=undefined){
        this.x=x; this.y=y;
        this.isBlue=isBlue;
        this.color=isBlue?sd.blueColor:sd.eColor;
        const mul=sd.enemyHpMul||1;
        this.hp=Math.round((isBlue?45:16)*mul);
        this.maxHp=this.hp;
        this.active=true;
        this.w=56; this.h=48;
        this.vx=-1.5-Math.random()*1;
        this.vy=0;
        this.timer=0; this.hitFlash=0;
        this.shootCD=ri(sd.enemyShootMin||60,sd.enemyShootMax||130);
        this.bulletSpd=sd.enemyBulletSpd||3.0;
        this.sd=sd;
        this.anim=new Anim({
            'FLOAT':{frames:4,loop:true,speed:.8},
            'ATTACK':{frames:4,loop:false,speed:1.5},
            'HIT':{frames:3,loop:false,speed:1},
            'DEATH':{frames:4,loop:false,speed:1}
        });
        this.baseY=y;
        this.glow=Math.random()*6.28;
        this.spriteKey=(stageIdx!==undefined&&STAGE_SPRITE_KEYS[stageIdx])?STAGE_SPRITE_KEYS[stageIdx]:null;
    }
    update(px,py,bullets,scrollSpd){
        if(this.anim.state==='DEATH'){ this.anim.update(); if(this.anim.done) this.active=false; return; }
        this.timer++; this.anim.update();
        this.x+=this.vx; this.y=this.baseY+Math.sin(this.timer*0.04)*25;
        this.x-=scrollSpd;
        this.shootCD--;
        if(this.shootCD<=0){
            this.shootCD=ri(this.sd.enemyShootMin||60,this.sd.enemyShootMax||130);
            this.anim.set('ATTACK');
            const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy)||1;
            const spd=this.bulletSpd;
            bullets.push({x:this.x,y:this.y,vx:dx/d*spd,vy:dy/d*spd,active:true,color:this.color,r:4});
            /* ステージ5以降：蒼穢が2連射 */
            if(this.isBlue && (this.sd.id||1)>=5){
                const ang=Math.atan2(dy,dx)+rr(-0.2,0.2);
                bullets.push({x:this.x,y:this.y,vx:Math.cos(ang)*spd*0.9,vy:Math.sin(ang)*spd*0.9,active:true,color:this.color,r:3});
            }
        }
        if(this.anim.state==='ATTACK'&&this.anim.done) this.anim.set('FLOAT');
        if(this.hitFlash>0) this.hitFlash--;
        if(this.x<-80) this.active=false;
    }
    takeDamage(amt,fx){
        this.hp-=amt; this.hitFlash=4;
        if(this.hp<=0){
            this.anim.set('DEATH');
            fx.burst(this.x,this.y,this.color,this.isBlue?30:15,this.isBlue?6:4);
        }
    }
    draw(c){
        if(!this.active) return;
        const f=this.anim.frame, s=this.anim.state, t=this.timer;
        const cx=this.x+this.w/2, cy=this.y+this.h/2;
        if(this.spriteKey&&IMG[this.spriteKey]){
            const sh=IMG[this.spriteKey];
            const sw=sh.naturalWidth||128, shh=sh.naturalHeight||96;
            const cw=sw/4, ch=shh/4;
            const ALIEN_W=56, ALIEN_H=48;
            const isPortrait=ch>cw;
            const scale=isPortrait?ALIEN_W/cw:ALIEN_H/ch;
            const rowMap={FLOAT:0,ATTACK:1,HIT:2,DEATH:3};
            const row=rowMap[s]!==undefined?rowMap[s]:0;
            const col=Math.min(f,3);
            c.save(); c.translate(cx,cy);
            if(this.anim.state==='DEATH'){ const ds=1-f/4; c.globalAlpha=ds; c.scale(-ds*scale,ds*scale); }
            else{ if(this.hitFlash>0) c.globalAlpha=0.5+0.5*(this.hitFlash/4); c.scale(-scale,scale); }
            c.drawImage(sh,col*cw,row*ch,cw,ch,-cw/2,-ch/2,cw,ch);
            if(this.isBlue){ this.glow+=0.08; c.globalAlpha=0.25+Math.sin(this.glow)*0.15; c.strokeStyle=this.color; c.lineWidth=2; c.beginPath(); c.arc(0,0,Math.max(cw,ch)*scale/2+Math.sin(this.glow*2)*3,0,Math.PI*2); c.stroke(); }
            c.restore();
            return;
        }
        c.save(); c.translate(this.x,this.y);
        if(this.isBlue){
            this.glow+=0.08;
            c.save(); c.globalAlpha=0.2+Math.sin(this.glow)*0.15;
            c.fillStyle=this.color;
            c.beginPath(); c.arc(0,0,14+Math.sin(this.glow*2)*2,0,Math.PI*2); c.fill();
            c.restore();
        }
        const cl=this.hitFlash>0?"#fff":this.color;
        c.fillStyle=cl; c.strokeStyle=cl; c.lineWidth=1.5;
        if(this.anim.state==='DEATH'){ const ds=1-f/4; c.scale(ds,ds); c.globalAlpha=ds; }
        c.scale(2.16,1.24);
        const wb=Math.sin(t*0.1+f)*2;
        c.beginPath(); c.ellipse(0,-2+wb,13,10,0,0,Math.PI*2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(0,-12+wb*.5,9,7,0,Math.PI,Math.PI*2); c.fill(); c.stroke();
        c.fillStyle=this.isBlue?"#fff":"#ffcc00";
        c.beginPath(); c.arc(-4,-12,2.5,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(4,-12,2.5,0,Math.PI*2); c.fill();
        if(f%2===0){ c.beginPath(); c.arc(0,-15,2,0,Math.PI*2); c.fill(); }
        c.strokeStyle=cl; c.lineWidth=2;
        const ta=[[.3,.6,-.3,-.6],[.5,.3,-.5,-.3],[.2,.7,-.2,-.7],[.6,.4,-.6,-.4]][f];
        for(let i=0;i<4;i++){
            const bx=(i<2?-8:8)+(i%2===0?-3:3);
            c.beginPath(); c.moveTo(bx,6);
            c.quadraticCurveTo(bx+ta[i]*12,16+Math.sin(t*0.1+i)*3,bx+ta[i]*8,24);
            c.stroke();
        }
        c.restore();
    }
    get cx(){ return this.x; }
    get cy(){ return this.y; }
}

/* ==========================================================
   [12] BOSS（描画2倍 → 元のscale2.5×2 = 実質5倍）
   ========================================================== */
class Boss {
    constructor(sd,idx){
        this.x=CFG.W+80; this.y=200;
        this.tx=CFG.W*0.68; this.ty=CFG.H/2-30;
        this.sd=sd; this.idx=idx;
        this.hp=sd.bossHpBase||220; this.maxHp=this.hp;
        this.active=true; this.arrived=false;
        this.timer=0; this.phaseT=0; this.phase=0; this.maxPhases=3+Math.min(idx,2);
        this.name=sd.bossName; this.color=sd.bossColor;
        this.hitFlash=0;
        this.anim=new Anim({
            'IDLE':{frames:4,loop:true,speed:.7},
            'CHARGE':{frames:4,loop:false,speed:1.5},
            'ATTACK':{frames:4,loop:false,speed:1.2},
            'HIT':{frames:3,loop:false,speed:1},
            'DEATH':{frames:4,loop:false,speed:.6}
        });
        this.atkCD=0; this.chargeTarget=null;
        this.atkSpd=sd.bossAtkSpd||1.0;
        /* レーザー予告線 */
        this.laserWarn=0; this.laserAngle=0;
        /* 分身用 */
        this.clones=[]; this.cloneCD=0;
    }
    update(px,py,bullets,enemies,fx,sd){
        if(this.anim.state==='DEATH'){ this.anim.update(); if(this.anim.done) this.active=false; return; }
        this.timer++; this.anim.update();
        if(!this.arrived){
            this.x+=(this.tx-this.x)*0.03; this.y+=(this.ty-this.y)*0.03;
            if(Math.abs(this.x-this.tx)<5) this.arrived=true;
            return;
        }
        this.phaseT++;
        const phaseDur=Math.max(180,300-this.idx*15);
        if(this.phaseT>phaseDur){
            this.phase=(this.phase+1)%this.maxPhases;
            this.phaseT=0; this.chargeTarget=null; this.laserWarn=0;
        }
        this.y=this.ty+Math.sin(this.timer*0.02)*20;
        this.x=this.tx+Math.sin(this.timer*0.015)*45;

        /* === フェーズ別攻撃 === */
        if(this.phase===0){
            /* 放射弾 */
            this.atkCD--;
            const intv=Math.max(10,Math.round(25/this.atkSpd));
            if(this.atkCD<=0){
                this.atkCD=intv; this.anim.set('ATTACK');
                const n=4+this.idx;
                const baseAngle=this.timer*0.02;
                for(let i=0;i<n;i++){
                    const a=(Math.PI*2/n)*i+baseAngle;
                    const spd=2.4+this.idx*0.2;
                    bullets.push({x:this.x,y:this.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,active:true,color:this.color,r:5});
                }
            }
        } else if(this.phase===1){
            /* 突進 */
            if(!this.chargeTarget) this.chargeTarget={x:px,y:py};
            const dx=this.chargeTarget.x-this.x, dy=this.chargeTarget.y-this.y, d=Math.hypot(dx,dy)||1;
            const cSpd=6.5+this.idx*0.5;
            if(d>20){ this.x+=dx/d*cSpd; this.y+=dy/d*cSpd; this.anim.set('CHARGE'); }
            else{
                this.chargeTarget=null;
                fx.burst(this.x,this.y,this.color,14,5);
                const burst=8+this.idx*2;
                for(let i=0;i<burst;i++){
                    const a=(Math.PI*2/burst)*i;
                    bullets.push({x:this.x,y:this.y,vx:Math.cos(a)*2.4,vy:Math.sin(a)*2.4,active:true,color:this.color,r:4});
                }
            }
        } else if(this.phase===2){
            /* 召喚＋狙撃 */
            if(this.phaseT%Math.max(60,120-this.idx*10)===0){
                enemies.push(new Enemy(CFG.W+30,rr(60,CFG.H-80),sd,false,this.idx));
            }
            this.atkCD--;
            const intv2=Math.max(20,Math.round(50/this.atkSpd));
            if(this.atkCD<=0){
                this.atkCD=intv2;
                const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy)||1;
                const spd=3+this.idx*0.3;
                bullets.push({x:this.x,y:this.y,vx:dx/d*spd,vy:dy/d*spd,active:true,color:this.color,r:5});
            }
        } else if(this.phase===3){
            /* ★ 渦巻き弾（ステージ4以降解放） */
            this.atkCD--;
            if(this.atkCD<=0){
                this.atkCD=4;
                const a=this.timer*0.08;
                const spd=2.0+this.idx*0.15;
                bullets.push({x:this.x,y:this.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,active:true,color:this.color,r:4});
            }
        } else if(this.phase===4){
            /* ★ レーザー予告→一斉掃射（ステージ6以降解放） */
            if(this.laserWarn<60){
                this.laserWarn++;
                this.laserAngle=Math.atan2(py-this.y,px-this.x);
            } else if(this.laserWarn===60){
                this.laserWarn++;
                const la=this.laserAngle;
                const spd=5;
                for(let i=-3;i<=3;i++){
                    const a=la+i*0.06;
                    bullets.push({x:this.x,y:this.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,active:true,color:"#ff2200",r:6});
                }
                fx.burst(this.x,this.y,"#ff2200",20,6);
                this.laserWarn=0;
            }
        }

        if(this.anim.state!=='IDLE'&&this.anim.done) this.anim.set('IDLE');
        if(this.hitFlash>0) this.hitFlash--;
    }
    takeDamage(amt,fx){
        this.hp-=amt; this.hitFlash=4;
        if(this.anim.state!=='DEATH') this.anim.set('HIT');
        if(this.hp<=0){ this.anim.set('DEATH'); fx.big(this.x,this.y,this.color); }
    }
    draw(c){
        if(!this.active&&this.anim.state!=='DEATH') return;
        const f=this.anim.frame, t=this.timer;
        const sc=0.44+Math.sin(t*0.04)*0.03;
        const deathScale=this.anim.state==='DEATH'?1-f/5:1;

        /* レーザー予告線描画 */
        if(this.phase===4 && this.laserWarn>0 && this.laserWarn<=60 && this.arrived){
            c.save();
            const warn=this.laserWarn/60;
            c.globalAlpha=warn*0.6;
            c.strokeStyle="#ff2200"; c.lineWidth=2+warn*4;
            c.setLineDash([8,8]);
            c.beginPath();
            c.moveTo(this.x,this.y);
            c.lineTo(this.x+Math.cos(this.laserAngle)*CFG.W,this.y+Math.sin(this.laserAngle)*CFG.W);
            c.stroke();
            c.setLineDash([]);
            c.restore();
        }

        c.save(); c.translate(this.x,this.y);
        if(this.anim.state==='DEATH') c.globalAlpha=deathScale;
        c.scale(sc*deathScale,sc*deathScale);

        if(IMG.boss){
            const img=IMG.boss, iw=img.naturalWidth||64, ih=img.naturalHeight||64;
            c.drawImage(img,0,0,iw,ih, -iw/2,-ih/2,iw,ih);
            c.globalCompositeOperation='multiply';
            c.fillStyle=this.hitFlash>0?'#ffffff':this.color;
            c.fillRect(-iw/2,-ih/2,iw,ih);
            c.globalCompositeOperation='source-over';
        } else {
            const cl=this.hitFlash>0?"#fff":this.color;
            c.fillStyle=cl; c.strokeStyle=cl; c.lineWidth=1;
            const wb=Math.sin(t*0.08+f)*2;
            c.beginPath(); c.ellipse(0,wb,16,12,0,0,Math.PI*2); c.fill(); c.stroke();
            c.beginPath(); c.moveTo(-12,-12); c.lineTo(0,-24+f*2); c.lineTo(12,-12); c.closePath(); c.fill();
            const ca=0.4+Math.sin(t*0.1)*0.3;
            c.save(); c.globalAlpha=ca; c.fillStyle="#fff";
            c.beginPath(); c.arc(0,0,5+Math.sin(t*0.15)*2,0,Math.PI*2); c.fill(); c.restore();
            c.fillStyle="#ff0000";
            c.beginPath(); c.arc(-6,-8,3,0,Math.PI*2); c.fill();
            c.beginPath(); c.arc(6,-8,3,0,Math.PI*2); c.fill();
            c.strokeStyle=cl; c.lineWidth=1.5;
            for(let i=0;i<6;i++){
                const angle=((i/6)*Math.PI*.8)+Math.PI*.1;
                const len=14+Math.sin(t*0.06+i)*4;
                const tx2=Math.cos(angle+Math.PI/2)*len;
                const ty2=12+Math.sin(angle)*len*.5+Math.sin(t*0.08+i*2)*3;
                c.beginPath(); c.moveTo((i<3?-8:8),8); c.quadraticCurveTo(tx2*.5,ty2*.8,tx2,ty2); c.stroke();
            }
        }
        c.restore();

        if(this.arrived){
            const bw=320, bx=CFG.W/2-bw/2;
            c.fillStyle="rgba(0,0,0,0.6)"; c.fillRect(bx-2,16,bw+4,18);
            c.fillStyle="#330000"; c.fillRect(bx,18,bw,14);
            const ratio=clamp(this.hp/this.maxHp,0,1);
            c.fillStyle=this.color; c.fillRect(bx,18,bw*ratio,14);
            c.fillStyle="#e0cda7"; c.font="14px serif"; c.textAlign="center";
            c.fillText(this.name,CFG.W/2,14); c.textAlign="left";
        }
    }
    get cx(){ return this.x; }
    get cy(){ return this.y; }
}

/* ==========================================================
   [13] RELIC — 聖遺物（視覚フィードバック強化）
   ========================================================== */
const RELIC_TYPES=[
    {id:"CHALICE",name:"聖杯",   color:"#44ff44", effect:"HEAL",    icon:"cross",   iconIndex:0},
    {id:"CROSS",  name:"聖十字架",color:"#aaeeff", effect:"BARRIER", icon:"shield",  iconIndex:1},
    {id:"TOME",   name:"予言書",  color:"#cc88ff", effect:"SLOW",    icon:"hourglass",iconIndex:2},
    {id:"FLAME",  name:"聖火",   color:"#ff4400", effect:"BOMB",    icon:"explosion",iconIndex:3}
];

class Relic {
    constructor(x,y){
        this.x=x; this.y=y; this.vy=0; this.active=true;
        this.type=RELIC_TYPES[ri(0,RELIC_TYPES.length)];
        this.timer=0;
    }
    update(spd){
        this.timer++; this.x-=spd;
        this.y+=Math.sin(this.timer*0.06)*0.5;
        if(this.x<-50||this.timer>600) this.active=false;
    }
    draw(c){
        c.save(); c.translate(this.x,this.y);
        const p=1+Math.sin(this.timer*0.1)*0.12;
        c.scale(p*0.383,p*0.383);

        if(IMG.items&&this.type.iconIndex!==undefined){
            const sh=IMG.items, sw=sh.naturalWidth||400, shh=sh.naturalHeight||100;
            const sliceW=sw/4;
            const sx=this.type.iconIndex*sliceW, sy=0;
            c.globalAlpha=0.9+Math.sin(this.timer*0.08)*0.1;
            c.drawImage(sh, sx,sy,sliceW,shh, -sliceW/3, -shh/3, sliceW*2/3, shh*2/3);
        } else {
            c.globalAlpha=0.25+Math.sin(this.timer*0.08)*0.1;
            c.fillStyle=this.type.color;
            c.beginPath(); c.arc(0,0,18,0,Math.PI*2); c.fill();
            c.globalAlpha=1; c.strokeStyle=this.type.color; c.lineWidth=2.5;
            if(this.type.icon==="cross"){
                c.fillStyle=this.type.color;
                c.fillRect(-2.5,-10,5,20); c.fillRect(-10,-2.5,20,5);
            } else if(this.type.icon==="shield"){
                c.beginPath();
                c.moveTo(0,-10); c.quadraticCurveTo(12,-6,10,4);
                c.quadraticCurveTo(6,12,0,14);
                c.quadraticCurveTo(-6,12,-10,4);
                c.quadraticCurveTo(-12,-6,0,-10);
                c.closePath(); c.stroke();
            } else if(this.type.icon==="hourglass"){
                c.beginPath();
                c.moveTo(-7,-10); c.lineTo(7,-10); c.lineTo(0,0);
                c.lineTo(7,10); c.lineTo(-7,10); c.lineTo(0,0); c.closePath(); c.stroke();
            } else if(this.type.icon==="explosion"){
                c.beginPath();
                for(let i=0;i<8;i++){
                    const a=(Math.PI*2/8)*i, r=i%2===0?10:5;
                    const px=Math.cos(a)*r, py=Math.sin(a)*r;
                    if(i===0) c.moveTo(px,py); else c.lineTo(px,py);
                }
                c.closePath(); c.stroke();
                c.fillStyle=this.type.color; c.globalAlpha=0.4;
                c.fill();
            }
        }
        c.restore();
    }
}

/* ==========================================================
   [14] HUD
   ========================================================== */
function drawHUD(c, crow, score, stIdx, blueK){
    const sd=STAGES[stIdx];
    c.fillStyle="#e0cda7"; c.font="22px serif";
    c.fillText(`SCORE: ${score}`,20,32);
    c.font="15px serif"; c.fillStyle="#aa8866";
    c.fillText(`— ${sd.name} —`,20,54);
    /* HP バー */
    c.fillStyle="rgba(0,0,0,0.5)"; c.fillRect(18,60,164,12);
    const hpR=clamp(crow.hp/crow.maxHp,0,1);
    c.fillStyle=hpR>0.5?"#cc2222":hpR>0.25?"#cc6600":"#ff0000";
    c.fillRect(20,62,160*hpR,8);
    /* ダッシュCD */
    if(crow.dashCD>0){
        c.fillStyle="rgba(0,0,0,0.5)"; c.fillRect(18,76,164,6);
        c.fillStyle="#6688cc";
        c.fillRect(20,77,160*(1-crow.dashCD/45),4);
    }
    c.fillStyle="#e0cda7"; c.font="13px serif";
    c.fillText(`覚醒: Lv.${crow.weaponLevel}`,20,100);
    if(crow.barrier>0){
        c.fillStyle="#aaeeff"; c.fillText(`障壁: ${Math.ceil(crow.barrier/60)}s`,20,116);
    }
    if(crow.inv>0){
        c.fillStyle="#ffff00"; c.font="14px serif";
        c.fillText(`無敵: ${Math.ceil(crow.inv/60)}s`,20,130);
    }
    /* 蒼穢カウント（形状でも判別可能・アクセシビリティ） */
    c.fillStyle="#44aaff"; c.font="18px serif";
    c.fillText(`蒼穢:`,CFG.W-140,32);
    for(let i=0;i<3;i++){
        const x=CFG.W-90+i*25, y=26;
        if(i<blueK){
            c.fillStyle="#44aaff";
            c.beginPath(); c.arc(x,y,8,0,Math.PI*2); c.fill();
            c.strokeStyle="#ffffff"; c.lineWidth=2;
            c.beginPath(); c.moveTo(x-4,y); c.lineTo(x-1,y+3); c.lineTo(x+4,y-3); c.stroke();
        } else {
            c.strokeStyle="#44aaff"; c.lineWidth=2;
            c.beginPath(); c.arc(x,y,8,0,Math.PI*2); c.stroke();
        }
    }
    c.fillStyle="#aa8866"; c.font="13px serif";
    c.fillText(`STAGE ${stIdx+1} / ${STAGES.length}`,CFG.W-140,52);
}

/* ==========================================================
   [15] MAIN GAME
   ========================================================== */
class Game {
    constructor(){
        this.cvs=document.getElementById('gameCanvas');
        this.c=this.cvs.getContext('2d');
        this.cvs.width=CFG.W; this.cvs.height=CFG.H;
        this.keys={};
        this.state="TITLE";
        this.crow=new Crow(this.sound);
        this.bg=new Background();
        this.fx=new FX();
        this.txt=new TextOverlay();
        this.efx=new EffectOverlay();
        this.enemies=[]; this.eBullets=[]; this.relics=[]; this.obstacles=[];
        this.boss=null;
        this.score=0; this.frame=0;
        this.stageIdx=0; this.blueK=0; this.blueCD=0; this.eCD=0;
        this.stateT=0; this.fadeA=0; this.fadeD=0;
        this.slowT=0; this.arena=false; this.obsCD=0;
        this._lastBossBGMForm=-1;
        this.sound=new SoundManager();
        this.sound.loadSettings();

        window.addEventListener('keydown',e=>{
            this.keys[e.code]=true;
            if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
            /* ユーザージェスチャーでAudioContext初期化 */
            if(!this.sound.initialized) this.sound.init();
            if(this.state==='TITLE') this.sound.playBGM('opening');
        });
        window.addEventListener('keyup',e=>{ this.keys[e.code]=false; });
        this.setupTouch();

        /* ===== iOS UX 強化 ===== */
        /* ダブルタップズーム完全防止 */
        document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
        let lastTap=0;
        document.addEventListener('touchend',e=>{
            const now=Date.now();
            if(now-lastTap<=300) e.preventDefault();
            lastTap=now;
            /* ユーザージェスチャーでAudioContext初期化 */
            if(!this.sound.initialized) this.sound.init();
            if(this.state==='TITLE') this.sound.playBGM('opening');
        },false);
        /* iOS Safari のバウンスとズームを完全遮断 */
        document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
        document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
        document.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});

        Promise.all([
            loadAssets(),
            ...Object.entries(AUDIO_ASSETS).map(([key, src]) => src ? this.sound.loadAudio(src, key) : Promise.resolve())
        ]).then(()=>{
            const ls=document.getElementById('loading-screen');
            if(ls){ ls.style.opacity='0'; ls.style.pointerEvents='none'; }
            setTimeout(()=>{ if(ls) ls.style.display='none'; }, 1500);
        });
        this.loop();
    }

    setupTouch(){
        const k=(a,v)=>{ this.keys[a]=v; };
        const bind=(id,a)=>{
            const b=document.getElementById(id); if(!b) return;
            /* pointerdown/up + touchstart/touchend の二重バインドで確実なレスポンス */
            const down=e=>{ e.preventDefault(); e.stopPropagation(); k(a,true); };
            const up=()=>k(a,false);
            b.addEventListener('pointerdown',down,{passive:false});
            b.addEventListener('pointerup',up);
            b.addEventListener('pointerleave',up);
            b.addEventListener('pointercancel',up);
            b.addEventListener('touchstart',down,{passive:false});
            b.addEventListener('touchend',e=>{ e.preventDefault(); up(); },{passive:false});
            b.addEventListener('touchcancel',up);
            b.addEventListener('contextmenu',e=>e.preventDefault());
        };
        bind('btn-left','TouchLeft');
        bind('btn-right','TouchRight');
        bind('btn-up','TouchUp');
        bind('btn-down','TouchDown');
        bind('btn-dash','TouchDash');
        bind('btn-start','TouchStart');
    }

    get sd(){ return STAGES[this.stageIdx]; }
    get scrollSpd(){ return this.bg.scrolling?this.bg.speed:0; }

    startStage(){
        this.sound.stopBGM();
        this.state="NARRATION"; this.stateT=0;
        this.enemies=[]; this.eBullets=[]; this.relics=[]; this.obstacles=[];
        this.boss=null; this.blueK=0; this.blueCD=ri(300,500);
        this.eCD=0; this.arena=false; this.obsCD=ri(60,120);
        this.bg.scrolling=true; this.bg.setStage(this.sd);
        this.fadeA=0; this.fadeD=0; this.slowT=0;
    }

    restart(){
        this.sound.stopBGM();
        this.crow=new Crow(this.sound); this.enemies=[]; this.eBullets=[];
        this.relics=[]; this.obstacles=[]; this.boss=null;
        this.score=0; this.frame=0; this.stageIdx=0;
        this.fx=new FX(); this.txt=new TextOverlay(); this.efx=new EffectOverlay();
        this.bg=new Background(); this.state="TITLE"; this.stateT=0;
        this.fadeA=0; this.slowT=0; this._lastBossBGMForm=-1;
    }

    applyRelic(r){
        const e=r.type.effect;
        this.sound.playItem();
        if(e==="HEAL"){
            this.crow.hp=Math.min(this.crow.maxHp,this.crow.hp+30);
            this.efx.add("HEAL","#44ff44",50);
        } else if(e==="BARRIER"){
            this.crow.barrier=480;
            this.efx.add("BARRIER","#aaeeff",50);
        } else if(e==="SLOW"){
            this.slowT=360;
            this.efx.add("SLOW","#cc88ff",50);
        } else if(e==="BOMB"){
            this.efx.add("BOMB","#ff4400",50);
            this.enemies.forEach(en=>{
                if(en.active){ en.hp=0; en.anim.set('DEATH');
                    this.fx.burst(en.x,en.y,en.color,12); this.score+=100; }
            });
            this.eBullets=[];
            if(this.boss&&this.boss.active&&this.boss.arrived) this.boss.takeDamage(40,this.fx);
            this.fx.big(this.crow.cx,this.crow.cy,"#ff4400");
        }
        this.fx.burst(r.x,r.y,r.type.color,18,4);
    }

    spawnEnemies(){
        if(this.arena) return;
        this.eCD--;
        if(this.eCD<=0){
            this.eCD = ri(this.sd.spawnMin || 40, this.sd.spawnMax || 80);
            const y = rr(60, CFG.H - 80);
            const useSprite = [1, 2, 4, 6].indexOf(this.stageIdx) >= 0 && Math.random() < 0.3;
            this.enemies.push(new Enemy(CFG.W + 40, y, this.sd, false, useSprite ? this.stageIdx : undefined));
        }
        /* 蒼穢出現保証：25秒（1500フレーム）経過で強制出現 */
        if(this.blueK < 3){
            this.blueCD--;
            const forceSpawnTime = 1500;
            const isForceSpawn = this.blueCD <= -forceSpawnTime;
            if(this.blueCD <= 0 || isForceSpawn){
                if(isForceSpawn){
                    this.txt.show("蒼穢が強制出現！", "#44aaff", 120, 28, CFG.W / 2, 100);
                    this.blueCD = 400;
                } else this.blueCD = ri(300, 600);
                const y = rr(80, CFG.H - 100);
                const useSprite = [1, 2, 4, 6].indexOf(this.stageIdx) >= 0 && Math.random() < 0.3;
                this.enemies.push(new Enemy(CFG.W + 40, y, this.sd, true, useSprite ? this.stageIdx : undefined));
            }
        }
    }

    spawnObstacles(){
        if(this.arena) return;
        this.obsCD--;
        if(this.obsCD<=0){
            this.obsCD=ri(80,180);
            this.obstacles.push(spawnObstacle(this.stageIdx));
        }
    }

    checkCollisions(){
        const cr=this.crow;
        for(let fi=cr.feathers.length-1;fi>=0;fi--){
            const f=cr.feathers[fi]; if(!f.active) continue;
            for(const en of this.enemies){
                if(!en.active||en.anim.state==='DEATH') continue;
                if(dist(f.x,f.y,en.x,en.y)<48){
                    en.takeDamage(8+(cr.weaponLevel-1)*2,this.fx);
                    f.active=false;
                    if(en.hp<=0){
                        this.score+=en.isBlue?500:100;
                        if(en.isBlue){
                            this.blueK++;
                            this.fx.burst(en.x,en.y,"#44aaff",30,7);
                            this.sound.playBluePurify();
                            this.txt.show(`蒼穢 浄化 (${this.blueK}/3)`,"#44aaff",80,24,CFG.W/2,100);
                        }
                        const dropRate = en.isBlue ? 0.75 : 0.28;
                        if(Math.random() < dropRate) this.relics.push(new Relic(en.x, en.y));
                    }
                    break;
                }
            }
            if(this.boss&&this.boss.active&&this.boss.arrived&&f.active){
                if(dist(f.x,f.y,this.boss.x,this.boss.y)<15){
                    this.boss.takeDamage(6+cr.weaponLevel,this.fx);
                    f.active=false;
                }
            }
        }
        for(const b of this.eBullets){
            if(!b.active) continue;
            if(dist(b.x,b.y,cr.cx,cr.cy)<11){
                cr.takeDamage(8,this.fx); b.active=false;
            }
        }
        for(const en of this.enemies){
            if(!en.active||en.anim.state==='DEATH') continue;
            if(dist(en.x,en.y,cr.cx,cr.cy)<33){
                cr.takeDamage(10,this.fx);
            }
        }
        if(this.boss&&this.boss.active&&this.boss.arrived){
            if(dist(this.boss.x,this.boss.y,cr.cx,cr.cy)<20){
                cr.takeDamage(15,this.fx);
            }
        }
        for(const ob of this.obstacles){
            if(!ob.active) continue;
            if(ob.hits(cr.x,cr.y,cr.w,cr.h)){
                cr.takeDamage(6,this.fx);
            }
        }
        for(const r of this.relics){
            if(!r.active) continue;
            if(dist(r.x,r.y,cr.cx,cr.cy)<12){
                r.active=false; this.applyRelic(r);
            }
        }
    }

    triggerBoss(){
        this.sound.stopBGM();
        this.state="BOSS_INTRO"; this.stateT=0;
        this.bg.scrolling=false; this.arena=true;
        this.enemies.forEach(e=>{ if(e.active&&e.anim.state!=='DEATH') e.active=false; });
        this.eBullets=[]; this.obstacles=[];
        this.txt.show(`「${this.sd.bossName}」が現れた…`,"#ff0000",150,36,CFG.W/2,CFG.H/2);
    }

    update(){
        this.frame++; this.stateT++;
        this.fx.update(); this.txt.update(); this.efx.update(); this.bg.update();
        if(this.slowT>0) this.slowT--;
        if(this.fadeD!==0) this.fadeA=clamp(this.fadeA+this.fadeD*0.02,0,1);

        const start=this.keys['Space']||this.keys['Enter']||this.keys['KeyZ']||this.keys['TouchStart'];
        if(start){
            this.keys['Space']=false; this.keys['Enter']=false;
            this.keys['KeyZ']=false; this.keys['TouchStart']=false;
        }
        if(this.state==="TITLE"&&start) this.sound.init();

        if(this.state==="TITLE"){
            if(start){ this.sound.playTitleStart(); this.startStage(); }
            return;
        }
        if(this.state==="NARRATION"){
            if(this.stateT===1){
                const lines=this.sd.desc.split('\n');
                this.txt.show(`— 第${this.stageIdx+1}章 : ${this.sd.name} —`,"#ff4d00",200,38,CFG.W/2,CFG.H/2-60);
                lines.forEach((l,i)=>this.txt.show(l,"#e0cda7",200,26,CFG.W/2,CFG.H/2+i*40));
            }
            if(this.stateT>220||(this.stateT>40&&start)){
                this.state="PLAYING"; this.stateT=0;
                this.sound.playBGM('stage'+(this.stageIdx+1));
            }
            return;
        }
        if(this.state==="PLAYING"){
            this.crow.update(this.keys);
            this.spawnEnemies();
            this.spawnObstacles();
            const ss=this.scrollSpd;
            this.enemies.forEach(e=>e.update(this.crow.cx,this.crow.cy,this.eBullets,ss));
            this.eBullets.forEach(b=>{
                b.x+=b.vx; b.y+=b.vy;
                if(b.x<-30||b.x>CFG.W+30||b.y<-30||b.y>CFG.H+30) b.active=false;
            });
            this.relics.forEach(r=>r.update(ss));
            this.obstacles.forEach(o=>o.update(ss));
            this.checkCollisions();
            this.enemies=this.enemies.filter(e=>e.active);
            this.crow.feathers=this.crow.feathers.filter(f=>f.active);
            this.eBullets=this.eBullets.filter(b=>b.active);
            this.relics=this.relics.filter(r=>r.active);
            this.obstacles=this.obstacles.filter(o=>o.active);
            if(this.crow.hp<=0){ this.state="GAME_OVER"; this.stateT=0; this.sound.stopBGM(); this.sound.playGameOver(); this.sound.playBGM('gameover'); return; }
            if(this.blueK>=3) this.triggerBoss();
            return;
        }
        if(this.state==="BOSS_INTRO"){
            this.crow.update(this.keys);
            this.crow.feathers.forEach(f=>{
                f.x+=f.vx; f.y+=f.vy; f.life++;
                if(f.x<-30||f.x>CFG.W+30) f.active=false;
            });
            this.crow.feathers=this.crow.feathers.filter(f=>f.active);
            if(this.stateT>120){
                this.boss=new Boss(this.sd,this.stageIdx);
                this.state="BOSS_FIGHT"; this.stateT=0;
                if(this.stageIdx<=5) this.sound.playBGM('boss');
                else{ this._lastBossBGMForm=0; this.sound.playBGM('boss7'); }
            }
            return;
        }
        if(this.state==="BOSS_FIGHT"){
            if(this.stageIdx===6&&this.boss&&this.boss.active){
                const ph=this.boss.phase;
                const form=ph<=1?0:ph<=3?1:2;
                if(form!==this._lastBossBGMForm){
                    this._lastBossBGMForm=form;
                    if(form===0) this.sound.playBGM('boss7');
                    else if(form===1) this.sound.playBGM('lastboss1');
                    else this.sound.playBGM('lastboss2');
                }
            }
            this.crow.update(this.keys);
            this.boss.update(this.crow.cx,this.crow.cy,this.eBullets,this.enemies,this.fx,this.sd);
            this.enemies.forEach(e=>e.update(this.crow.cx,this.crow.cy,this.eBullets,0));
            this.eBullets.forEach(b=>{
                b.x+=b.vx; b.y+=b.vy;
                if(b.x<-30||b.x>CFG.W+30||b.y<-30||b.y>CFG.H+30) b.active=false;
            });
            this.relics.forEach(r=>r.update(0));
            this.checkCollisions();
            this.enemies=this.enemies.filter(e=>e.active);
            this.crow.feathers=this.crow.feathers.filter(f=>f.active);
            this.eBullets=this.eBullets.filter(b=>b.active);
            this.relics=this.relics.filter(r=>r.active);
            if(this.crow.hp<=0){ this.state="GAME_OVER"; this.stateT=0; this.sound.stopBGM(); this.sound.playGameOver(); this.sound.playBGM('gameover'); return; }
            if(this.boss&&!this.boss.active&&this.anim_done_safe()){
                this.score+=1000*(this.stageIdx+1);
                for(let i=0;i<3;i++) this.relics.push(new Relic(this.boss.x+rr(-40,40),this.boss.y+rr(-20,20)));
                this.state="STAGE_CLEAR"; this.stateT=0; this.sound.stopBGM(); this.sound.playStageClear();
                this.txt.show("STAGE CLEAR","#ffcc00",180,48,CFG.W/2,CFG.H/2-40);
                this.txt.show(`— ${this.sd.name} 浄化完了 —`,"#e0cda7",180,24,CFG.W/2,CFG.H/2+10);
            }
            return;
        }
        if(this.state==="STAGE_CLEAR"){
            this.crow.update(this.keys);
            this.relics.forEach(r=>r.update(0));
            this.relics.forEach(r=>{
                if(r.active&&dist(r.x,r.y,this.crow.cx,this.crow.cy)<12){ r.active=false; this.applyRelic(r); }
            });
            this.relics=this.relics.filter(r=>r.active);
            if(this.stateT>150){ this.crow.x+=8; this.crow.anim.set('DASH'); }
            if(this.stateT>180) this.fadeD=1;
            if(this.stateT>230){
                if(this.stageIdx<STAGES.length-1){
                    this.stageIdx++;
                    this.crow.weaponLevel=Math.min(5,this.crow.weaponLevel+1);
                    this.crow.x=100; this.crow.y=CFG.H/2-4;
                    this.fadeD=-1;
                    this.startStage();
                } else {
                    this.state="VICTORY"; this.stateT=0; this.fadeD=-1;
                    this.sound.playBGM('ending');
                }
            }
            return;
        }
        if(this.state==="GAME_OVER"){
            if(this.stateT>90&&start) this.restart();
            return;
        }
        if(this.state==="VICTORY"){
            if(this.stateT>150&&start) this.restart();
            return;
        }
    }

    anim_done_safe(){
        return this.boss && this.boss.anim && this.boss.anim.done;
    }

    draw(){
        const c=this.c;
        c.save();
        this.fx.applyShake(c);
        this.bg.draw(c);

        if(this.state==="TITLE"){ this.drawTitle(c); c.restore(); return; }

        this.obstacles.forEach(o=>o.draw(c));
        this.relics.forEach(r=>r.draw(c));
        this.enemies.forEach(e=>e.draw(c));
        this.eBullets.forEach(b=>{
            if(!b.active) return;
            c.save(); c.globalAlpha=0.85; c.fillStyle=b.color;
            c.beginPath(); c.arc(b.x,b.y,b.r||5,0,Math.PI*2); c.fill();
            c.globalAlpha=0.3; c.beginPath(); c.arc(b.x,b.y,(b.r||5)+4,0,Math.PI*2); c.fill();
            c.restore();
        });
        this.crow.drawFeathers(c);
        this.crow.draw(c);
        if(this.boss) this.boss.draw(c);
        this.fx.draw(c);
        this.fx.drawFlash(c);
        this.efx.draw(c, this.crow);
        if(this.slowT>0){
            c.save(); c.globalAlpha=0.05; c.fillStyle="#cc88ff"; c.fillRect(0,0,CFG.W,CFG.H); c.restore();
        }
        if(this.state!=="NARRATION") drawHUD(c,this.crow,this.score,this.stageIdx,this.blueK);
        this.txt.draw(c);

        if(this.state==="GAME_OVER"){
            c.fillStyle="rgba(0,0,0,0.75)"; c.fillRect(0,0,CFG.W,CFG.H);
            c.textAlign="center"; c.fillStyle="#ff0000"; c.font="60px serif";
            c.fillText("THE NIGHT ENDURES",CFG.W/2,CFG.H/2-20);
            c.fillStyle="#e0cda7"; c.font="22px serif";
            c.fillText(`浄化された魂: ${this.score}`,CFG.W/2,CFG.H/2+20);
            if(this.stateT>90){
                c.globalAlpha=0.5+Math.sin(this.frame*0.05)*0.3;
                c.font="18px serif"; c.fillText("— SPACE / START で再挑戦 —",CFG.W/2,CFG.H/2+60);
            }
            c.textAlign="left";
        }
        if(this.state==="VICTORY"){
            if(IMG.title){
                const img=IMG.title, iw=img.naturalWidth||800, ih=img.naturalHeight||600;
                const scale=Math.max(CFG.W/iw,CFG.H/ih);
                c.drawImage(img,0,0,iw,ih, 0,0, iw*scale, ih*scale);
                c.fillStyle="rgba(0,0,0,0.5)";
                c.fillRect(0,0,CFG.W,CFG.H);
            } else {
                c.fillStyle="rgba(0,0,0,0.7)"; c.fillRect(0,0,CFG.W,CFG.H);
            }
            c.textAlign="center"; c.fillStyle="#ffcc00"; c.font="50px serif";
            c.fillText("浄化の儀式、完遂せり",CFG.W/2,CFG.H/2-50);
            c.fillStyle="#e0cda7"; c.font="24px serif";
            c.fillText("全ての穢れは祓われた。",CFG.W/2,CFG.H/2);
            c.fillText("黒きカラスは夜明けの空へ還る。",CFG.W/2,CFG.H/2+35);
            c.font="20px serif"; c.fillText(`最終スコア: ${this.score}`,CFG.W/2,CFG.H/2+75);
            if(this.stateT>150){
                c.globalAlpha=0.5+Math.sin(this.frame*0.05)*0.3;
                c.font="18px serif"; c.fillText("— SPACE / START で再び —",CFG.W/2,CFG.H/2+120);
            }
            c.textAlign="left";
        }
        if(this.fadeA>0){
            c.fillStyle=`rgba(0,0,0,${this.fadeA})`;
            c.fillRect(0,0,CFG.W,CFG.H);
        }
        c.restore();
    }

    drawTitle(c){
        if(IMG.title){
            const img=IMG.title, iw=img.naturalWidth||800, ih=img.naturalHeight||600;
            const scale=Math.max(CFG.W/iw,CFG.H/ih);
            c.drawImage(img,0,0,iw,ih, 0,0, iw*scale, ih*scale);
            c.fillStyle="rgba(0,0,0,0.45)";
            c.fillRect(0,0,CFG.W,CFG.H);
        } else {
            c.fillStyle="rgba(0,0,0,0.5)"; c.fillRect(0,0,CFG.W,CFG.H);
        }
        c.textAlign="center";
        const titleFont="Cinzel, Georgia, serif";
        c.font=`bold 58px ${titleFont}`;
        c.fillStyle="rgba(0,0,0,0.6)";
        c.fillText("CROW'S DESTINY",CFG.W/2+3,173);
        c.fillStyle="#ff4d00";
        c.fillText("CROW'S DESTINY",CFG.W/2,170);
        c.font=`600 22px ${titleFont}`;
        c.fillStyle="#c9b896";
        c.fillText("THE RITUAL OF TWILIGHT",CFG.W/2,218);

        if(!IMG.crowSheet){
            c.save(); c.translate(CFG.W/2,300);
            const s=2.8+Math.sin(this.frame*0.03)*0.3;
            c.scale(s,s);
            c.fillStyle="#111"; c.strokeStyle="#ff4d00"; c.lineWidth=1;
            c.beginPath(); c.ellipse(0,0,13,10,0,0,Math.PI*2); c.fill(); c.stroke();
            c.beginPath(); c.ellipse(9,-5,8,7,0.2,0,Math.PI*2); c.fill(); c.stroke();
            c.fillStyle="#ff0000"; c.beginPath(); c.arc(12,-7,2.5,0,Math.PI*2); c.fill();
            const wa=Math.sin(this.frame*0.08)*0.5;
            c.save(); c.rotate(-wa); c.fillStyle="#111";
            c.beginPath(); c.moveTo(-2,-5); c.lineTo(-24,-16); c.lineTo(-19,-9); c.closePath(); c.fill(); c.stroke();
            c.restore();
            c.save(); c.rotate(wa*0.6); c.fillStyle="#111";
            c.beginPath(); c.moveTo(-2,5); c.lineTo(-22,14); c.lineTo(-17,8); c.closePath(); c.fill(); c.stroke();
            c.restore();
            c.restore();
        }

        c.font=`16px ${titleFont}`;
        c.fillStyle="#8a7a5c";
        c.fillText("七つの穢れし地を浄化せよ。黒きカラスよ、翼を広げよ。",CFG.W/2,400);
        c.globalAlpha=0.6+Math.sin(this.frame*0.06)*0.35;
        c.fillStyle="#e0cda7";
        c.font=`bold 18px ${titleFont}`;
        c.fillText("— SPACE / START で儀式を開始 —",CFG.W/2,455);
        c.globalAlpha=1;
        c.textAlign="left";
    }

    loop(){
        this.update(); this.draw();
        requestAnimationFrame(()=>this.loop());
    }
}

window.addEventListener('load',()=>new Game());

})();
