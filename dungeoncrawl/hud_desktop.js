// SPDX-License-Identifier: CC0-1.0
"use strict";

const ORIGIN_X = 32;
const ORIGIN_Y = 96;

let overlayEnts = {
	goldcount: Overlays.addOverlay("text", {
		x: ORIGIN_X + 36,
		y: ORIGIN_Y + 68,
		width: 72,
		height: 26,
		text: "$0",
		topMargin: 2,
		leftMargin: 8,
		color: {red: 255, green: 224, blue: 0},
	}),
	timer: Overlays.addOverlay("text", {
		x: ORIGIN_X + 32,
		y: ORIGIN_Y - 30,
		width: 80,
		height: 26,
		text: "00:00:00",
		topMargin: 2,
		leftMargin: 4,
		color: {red: 255, green: 255, blue: 255},
	}),

	health_bg: Overlays.addOverlay("image", {
		x: ORIGIN_X,
		y: ORIGIN_Y,
		width: 144,
		height: 64,
		imageURL: Script.resolvePath("assets/healthHud_bg.png"),
	}),
	health_1: Overlays.addOverlay("image", {
		x: ORIGIN_X,
		y: ORIGIN_Y,
		width: 144,
		height: 64,
		imageURL: Script.resolvePath("assets/healthHud_1.png"),
	}),
	health_2: Overlays.addOverlay("image", {
		x: ORIGIN_X,
		y: ORIGIN_Y,
		width: 144,
		height: 64,
		imageURL: Script.resolvePath("assets/healthHud_2.png"),
	}),
	health_3: Overlays.addOverlay("image", {
		x: ORIGIN_X,
		y: ORIGIN_Y,
		width: 144,
		height: 64,
		imageURL: Script.resolvePath("assets/healthHud_3.png"),
	}),
};

Script.scriptEnding.connect(() => {
	Overlays.deleteOverlay(overlayEnts.health_bg);
	Overlays.deleteOverlay(overlayEnts.health_1);
	Overlays.deleteOverlay(overlayEnts.health_2);
	Overlays.deleteOverlay(overlayEnts.health_3);
	Overlays.deleteOverlay(overlayEnts.goldcount);
	Overlays.deleteOverlay(overlayEnts.timer);
});

module.exports = {
	setHealth: value => {
		let alphas = [0, 0, 0];
		if (value > 2) { alphas = [1, 1, 1]; }
		else if (value > 1) { alphas = [1, 1, 0]; }
		else if (value > 0) { alphas = [1, 0, 0]; }

		Overlays.editOverlay(overlayEnts.health_1, {alpha: alphas[0]});
		Overlays.editOverlay(overlayEnts.health_2, {alpha: alphas[1]});
		Overlays.editOverlay(overlayEnts.health_3, {alpha: alphas[2]});
	},
	setGold: value => {
		Overlays.editOverlay(overlayEnts.goldcount, {text: `$${Math.floor(value)}`});
	},
	setTime: value => {
		let time = Math.abs(value);
		let text = "".concat(
			String(Math.floor(time / 60 / 60)).padStart(2, "0"),
			":",
			String(Math.floor((time / 60) % 60)).padStart(2, "0"),
			":",
			String(Math.floor(time % 60)).padStart(2, "0")
		);
		Overlays.editOverlay(overlayEnts.timer, {text: text});
	},
};
