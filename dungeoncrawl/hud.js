// SPDX-License-Identifier: CC0-1.0
"use strict";
const require = path => Script.require(Script.resolvePath(`${path}.js`));
const frontend = HMD.active ? require("hud_vr") : require("hud_desktop");
const Common = require("common");

let timerHidden = false;
let timerBase = 0;

function HUD_MessageRecv(channel, msg, localOnly) {
	if (!localOnly || channel !== Common.CHANNEL_HUD) { return; }

	const data = JSON.parse(msg);

	if (data.health) { frontend.setHealth(data.health); }
	if (data.gold) { frontend.setGold(data.gold); }

	if (data.timerHidden) { timerHidden = data.timerHidden; }
	if (data.timer === "reset") { timerBase = Common.sessionTime(); }
}

Messages.messageReceived.connect(HUD_MessageRecv);
Messages.subscribe(Common.CHANNEL_HUD);

Script.scriptEnding.connect(() => {
	Messages.messageReceived.disconnect(HUD_MessageRecv);
});

Script.update.connect(_ => {
	let time = Common.sessionTime();
	frontend.setHealth(Math.sin(time) * 3);
	frontend.setGold(Math.cos(time) * 1000);
	frontend.setTime(time - timerBase);
});
