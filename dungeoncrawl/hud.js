// SPDX-License-Identifier: CC0-1.0
"use strict";
const require = path => Script.require(Script.resolvePath(`${path}.js`));
const frontend = HMD.active ? require("hud_vr") : require("hud_desktop");
const Common = require("common");

Script.update.connect(_ => {
	let time = Common.sessionTime();
	frontend.setHealth(Math.sin(time) * 3);
	frontend.setGold(Math.cos(time) * 1000);
	frontend.setTime(time);
});
