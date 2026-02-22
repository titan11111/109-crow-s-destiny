/**
 * CROW'S DESTINY — アニメーション状態
 */
(function (global) {
'use strict';

const FRAME_DUR = global.CrowDestiny.FRAME_DUR;

class Anim {
    constructor(st) {
        this.st = st;
        this.cur = Object.keys(st)[0];
        this.f = 0;
        this.t = 0;
        this.done = false;
    }
    set(n) {
        if (this.cur === n || !this.st[n]) return;
        this.cur = n;
        this.f = 0;
        this.t = 0;
        this.done = false;
    }
    update() {
        const s = this.st[this.cur];
        const spd = s.speed || 1;
        if (++this.t >= Math.max(1, Math.floor(FRAME_DUR / spd))) {
            this.t = 0;
            this.f++;
            if (this.f >= (s.frames || 4)) {
                if (s.loop !== false) this.f = 0;
                else {
                    this.f = (s.frames || 4) - 1;
                    this.done = true;
                }
            }
        }
    }
    get frame() { return this.f; }
    get state() { return this.cur; }
}

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.Anim = Anim;

})(typeof window !== 'undefined' ? window : this);
