/**
 * CROW'S DESTINY — ユーティリティ
 */
(function (global) {
'use strict';

const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const dist  = (a, b, c, d) => Math.hypot(c - a, d - b);
const rr    = (a, b) => Math.random() * (b - a) + a;
const ri    = (a, b) => Math.floor(rr(a, b));
const lerp  = (a, b, t) => a + (b - a) * t;
const hex2rgb = h => [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
const rgb    = r => `rgb(${r[0] | 0},${r[1] | 0},${r[2] | 0})`;
const lerpC  = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

global.CrowDestiny = global.CrowDestiny || {};
global.CrowDestiny.clamp = clamp;
global.CrowDestiny.dist = dist;
global.CrowDestiny.rr = rr;
global.CrowDestiny.ri = ri;
global.CrowDestiny.lerp = lerp;
global.CrowDestiny.hex2rgb = hex2rgb;
global.CrowDestiny.rgb = rgb;
global.CrowDestiny.lerpC = lerpC;

})(typeof window !== 'undefined' ? window : this);
