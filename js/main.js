/**
 * CROW'S DESTINY — エントリポイント
 */
(function (global) {
'use strict';

window.addEventListener('load', () => {
    if (global.CrowDestiny && global.CrowDestiny.Game) {
        new global.CrowDestiny.Game();
    } else {
        console.error('CrowDestiny.Game not found. Load script files in order.');
    }
});

})(typeof window !== 'undefined' ? window : this);
