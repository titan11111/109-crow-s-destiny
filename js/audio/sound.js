/**
 * CROW'S DESTINY — 音声管理（SE + BGM）
 */
(function (global) {
'use strict';

const AUDIO_ASSETS = global.CrowDestiny && global.CrowDestiny.AUDIO_ASSETS;
const BGM_ASSETS = global.CrowDestiny && global.CrowDestiny.BGM_ASSETS;

class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.seEnabled = true;
        this.seVolume = 0.7;
        this.bufferCache = {};
        this.seGain = null;
        this.bgmEnabled = true;
        this.bgmVolume = 0.6;
        this._bgmEl = null;
        this._currentBGM = null;
    }

    /**
     * AudioContext を初期化する。
     * 必ずユーザー操作（キー入力・タッチ）のあとで呼ぶこと（ブラウザの自動再生ポリシー対策）。
     */
    init() {
        if (this.initialized) return;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new Ctx();
            this.seGain = this.ctx.createGain();
            this.seGain.gain.value = this.seVolume;
            this.seGain.connect(this.ctx.destination);
            const buffer = this.ctx.createBuffer(1, 1, 22050);
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.ctx.destination);
            src.start(0);
            this.initialized = true;
        } catch (e) {
            console.warn('AudioContext init failed:', e);
        }
    }

    async ensureResumed() {
        if (this.ctx && this.ctx.state === 'suspended') {
            try { await this.ctx.resume(); } catch (e) { console.warn('resume failed:', e); }
        }
    }

    async decodeAudio(src, key) {
        if (!src || this.bufferCache[key]) return Promise.resolve();
        if (!this.ctx) this.init();
        if (!this.ctx) return Promise.resolve();
        return fetch(src)
            .then(r => r.arrayBuffer())
            .then(ab => this.ctx.decodeAudioData(ab))
            .then(buf => { this.bufferCache[key] = buf; })
            .catch(e => { console.warn('Audio decode failed:', src, e); });
    }

    playSE(key) {
        if (!this.seEnabled) return;
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (!AUDIO_ASSETS) return;
        const src = AUDIO_ASSETS[key];
        if (src) {
            const playFile = (buf) => {
                if (!buf) return;
                this.ensureResumed().then(() => {
                    const source = this.ctx.createBufferSource();
                    source.buffer = buf;
                    source.connect(this.seGain);
                    source.start(0);
                });
            };
            if (this.bufferCache[key]) {
                playFile(this.bufferCache[key]);
            } else {
                this.decodeAudio(src, key).then(() => playFile(this.bufferCache[key]));
            }
        }
    }

    playSEProcedural(type) {
        if (!this.seEnabled) return;
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (type === 'shoot') {
            this._shootCount = this._shootCount || 0;
            if (this._shootCount >= 4) return;
            this._shootCount++;
        }

        this.ensureResumed().then(() => {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.seGain);
            gain.gain.setValueAtTime(0, now);
            if (type === 'shoot') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
                gain.gain.setValueAtTime(0.18 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.start(now);
                osc.stop(now + 0.07);
                osc.onended = () => {
                    this._shootCount = Math.max(0, (this._shootCount || 1) - 1);
                };
            } else if (type === 'hit') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.35 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'item') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
                gain.gain.setValueAtTime(0.2 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'dash') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
                gain.gain.setValueAtTime(0.12 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.start(now);
                osc.stop(now + 0.07);
            } else if (type === 'bluePurify') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.exponentialRampToValueAtTime(1047, now + 0.12);
                gain.gain.setValueAtTime(0.22 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'stageClear') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.08);
                osc.frequency.setValueAtTime(784, now + 0.16);
                gain.gain.setValueAtTime(0.2 * this.seVolume, now);
                gain.gain.setValueAtTime(0.2 * this.seVolume, now + 0.08);
                gain.gain.setValueAtTime(0.25 * this.seVolume, now + 0.16);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.45);
            } else if (type === 'gameOver') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);
                gain.gain.setValueAtTime(0.3 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'titleStart') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.06);
                gain.gain.setValueAtTime(0.18 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.14);
            } else if (type === 'stageTransition') {
                /* シュッという高速移動感のノイズ（ホワイトノイズ＋高域スイープ） */
                const bufLen = this.ctx.sampleRate * 0.25;
                const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
                const ch = buf.getChannelData(0);
                for (let i = 0; i < bufLen; i++) {
                    const t = i / this.ctx.sampleRate;
                    const sweep = 1 - t / 0.25;
                    ch[i] = (Math.random() * 2 - 1) * Math.max(0, sweep) * 0.25;
                }
                const src = this.ctx.createBufferSource();
                src.buffer = buf;
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.2 * this.seVolume, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                src.connect(g); g.connect(this.seGain);
                src.start(now);
                src.stop(now + 0.25);
            } else if (type === 'bossShot') {
                /* ボスが弾を撃つ音 — 低めのノコギリ波で威圧感 */
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
                gain.gain.setValueAtTime(0.12 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'bossBig') {
                /* ボス大技 — 充電〜解放の重い音 */
                osc.type = 'square';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.2 * this.seVolume, now + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.22);
            } else if (type === 'bossCharge') {
                /* ボス予兆・溜め — 短い警告音 */
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(330, now + 0.06);
                gain.gain.setValueAtTime(0.08 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'levelUp') {
                /* レベルアップ — 上昇する短いファンファーレ（ド→ミ→ソ→ド、祝福感） */
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.08);
                osc.frequency.setValueAtTime(784, now + 0.16);
                osc.frequency.setValueAtTime(1047, now + 0.24);
                gain.gain.setValueAtTime(0.2 * this.seVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            }
        });
    }

    playShoot() { this.playSEProcedural('shoot'); }
    playHit() { this.playSEProcedural('hit'); }
    playItem() { this.playSEProcedural('item'); }
    playDash() { this.playSEProcedural('dash'); }
    playBluePurify() { this.playSEProcedural('bluePurify'); }
    playStageClear() { this.playSEProcedural('stageClear'); }
    playStageTransition() { this.playSEProcedural('stageTransition'); }
    playGameOver() { this.playSEProcedural('gameOver'); }
    playTitleStart() { this.playSEProcedural('titleStart'); }
    /** ボス用SE（攻撃・大技・予兆） */
    playBossShot() { this.playSEProcedural('bossShot'); }
    playBossBig() { this.playSEProcedural('bossBig'); }
    playBossCharge() { this.playSEProcedural('bossCharge'); }
    playLevelUp() { this.playSEProcedural('levelUp'); }

    toggleSE() {
        this.seEnabled = !this.seEnabled;
        try { localStorage.setItem('crowDestiny_se', this.seEnabled); } catch (_) {}
    }

    loadSettings() {
        try {
            const se = localStorage.getItem('crowDestiny_se');
            if (se !== null) this.seEnabled = se === 'true';
            const bgm = localStorage.getItem('crowDestiny_bgm');
            if (bgm !== null) this.bgmEnabled = bgm === 'true';
        } catch (_) {}
    }

    stopBGM() {
        if (this._bgmEl) {
            try { this._bgmEl.pause(); this._bgmEl.currentTime = 0; } catch (_) {}
            this._bgmEl = null;
        }
        this._currentBGM = null;
    }

    playBGM(key) {
        if (!this.bgmEnabled || !BGM_ASSETS) return;
        /* iOS: ユーザージェスチャー内で AudioContext を resume しておく（SE 再生に必要） */
        if (this.ctx) this.ensureResumed();
        const src = BGM_ASSETS[key];
        if (!src) return;
        if (this._currentBGM === key && this._bgmEl && !this._bgmEl.paused) return;
        this.stopBGM();
        try {
            const el = new Audio(src);
            el.volume = this.bgmVolume;
            el.loop = true;
            /* iOS Safari: インライン再生（全画面に遷移しない） */
            el.playsInline = true;
            if (el.setAttribute) { el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', ''); }
            el.play().catch(e => console.warn('BGM play failed:', key, e));
            this._bgmEl = el;
            this._currentBGM = key;
        } catch (e) {
            console.warn('BGM init failed:', key, e);
        }
    }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.SoundManager = SoundManager;

})(typeof window !== 'undefined' ? window : this);
