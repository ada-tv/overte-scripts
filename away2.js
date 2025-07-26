// SPDX-License-Identifier: Apache-2.0
const SENSOR_TO_ROOM_MATRIX = -2; // body-relative, VR
const CAMERA_MATRIX = -7;         // camera-relative, desktop
const KEY_BREAK = 0x01000008;

const AFK_ANIMATION = {
	url: "qrc:/avatar/animations/afk_texting.fbx",
	fps: 30,
	loop: true,
	startFrame: 1,
	endFrame: 489,
};
AnimationCache.prefetch(AFK_ANIMATION.url);

const overlayProperties = {
	name: "AFK Button",
	type: "Text",
	text: "AFK\nClick to go active",
	dimensions: [0.8, 0.4, 0.1],
	alignment: "center",
	verticalAlignment: "center",
	unlit: true,
	backgroundAlpha: 0.9,
	textEffect: "outline fill",
	textEffectColor: [0, 0, 0],
	textEffectThickness: 0.4,
	grab: {grabbable: false},
};

const iconProperties = {
	name: "AFK Indicator",
	type: "Text",
	text: "AFK",
	dimensions: [0.3, 0.2, 0.1],
	billboardMode: "full",
	alignment: "center",
	verticalAlignment: "center",
	textEffect: "outline fill",
	textEffectColor: [0, 0, 0],
	textEffectThickness: 0.4,
	backgroundAlpha: 0,
	unlit: true,
	grab: {grabbable: false},
};

let overlayEntity, iconEntity;
let mouseWasCaptured = false;

function setAFK(enabled) {
	if (enabled) {
		let localPosition;

		if (HMD.active) {
			localPosition = [0, MyAvatar.getHeight() / 2, -1];
		} else {
			localPosition = [0, 0, -1];
		}

		overlayEntity = Entities.addEntity({
			parentID: MyAvatar.sessionUUID,
			parentJointIndex: HMD.active ? SENSOR_TO_ROOM_MATRIX : CAMERA_MATRIX,
			localPosition: localPosition,
			...overlayProperties,
		}, "local");

		iconEntity = Entities.addEntity({
			parentID: MyAvatar.sessionUUID,
			localPosition: [0, 0.2 + (MyAvatar.getHeight() * 2) / 3, 0],
			...iconProperties,
		}, "avatar");

		MyAvatar.overrideAnimation(
			AFK_ANIMATION.url,
			AFK_ANIMATION.fps,
			AFK_ANIMATION.loop,
			AFK_ANIMATION.startFrame,
			AFK_ANIMATION.endFrame
		);

		Camera.captureMouse = false;
	} else {
		Entities.deleteEntity(iconEntity);
		Entities.deleteEntity(overlayEntity);
		delete overlayEntity;
		delete iconEntity;

		MyAvatar.restoreAnimation();
		Camera.captureMouse = mouseWasCaptured;
	}

	mouseWasCaptured = Camera.captureMouse;
}

let isAFK = false;

function onMousePress(entity, event) {
	if (isAFK && entity === overlayEntity && event.button === "Primary") {
		isAFK = false;
		setAFK(false);
	}
}

function onKeyPress(event) {
	if (
		event.key === KEY_BREAK &&
		!(event.isShifted || event.isMeta || event.isControl || event.isAlt || event.isAutoRepeat)
	) {
		isAFK = !isAFK;
		setAFK(isAFK);
	}
}

Controller.keyPressEvent.connect(onKeyPress);
Entities.mousePressOnEntity.connect(onMousePress);

Script.scriptEnding.connect(() => {
	setAFK(false);
	Controller.keyPressEvent.disconnect(onKeyPress);
	Entities.mousePressOnEntity.disconnect(onMousePress);
});
