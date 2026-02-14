"use strict";
const KeyCodes = require("keycodes");

const event = {
	key: KeyCodes.w,
};

console.debug("Pressing W");
Keyboard.emitKeyEvent(event, true);

Script.setTimeout(() => {
	console.debug("Releasing W");
	Keyboard.emitKeyEvent(event, false);
}, 2000);
