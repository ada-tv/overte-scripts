// voting2Interface.js
// Created by Ada <ada@thingvellir.net> 2026-11-15
// SPDX-License-Identifier: CC0-1.0
"use strict";

const System = require("./voting2.js");

const entity = Entities.addEntity({
	type: "Empty",
	position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, [0, 0, -2])),
	rotation: MyAvatar.orientation,
});

const state = new System();
state.managerID = MyAvatar.sessionUUID;
state.preload(entity);

Script.scriptEnding.connect(() => {
	state.unload(entity);
	Entities.deleteEntity(entity);
});
