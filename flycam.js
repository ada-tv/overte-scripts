// flycam.js
// Created by Ada <ada@thingvellir.net> on 2026-01-14
// SPDX-License-Identifier: CC0-1.0
"use strict";
const VersionFeatures = require(Script.resolvePath("versionFeatures.js"));
const { vec3, quat, euler, clamp } = require(
	VersionFeatures.utilMath ?
	"utilMath" :
	"https://raw.githubusercontent.com/ada-tv/overte/refs/heads/feature/utilMath-module/scripts/modules/utilMath.js"
);

const CAM_FRICTION = 0.75;
const CAM_ACCELERATION = 50;

let camState = {
	enabled: false,
	position: vec3(0, 0, 0),
	velocity: vec3(0, 0, 0),
	rotation: vec3(0, 0, 0),
	wishdir: vec3(0, 0, 0),
	previousMode: Camera.mode,
};

let mouseState = {
	x: 0,
	y: 0,
	previousX: 0,
	previousY: 0,
	dx: 0,
	dy: 0,
	skipFirst: true,
};

let keyState = {
	forward: false,
	backward: false,
	left: false,
	right: false,
	up: false,
	down: false,
	sprint: false,
	sneak: false,
};

function startCamera() {
	camState.enabled = true;
	camState.previousMode = Camera.mode;

	camState.position = Camera.position;
	camState.rotation = quat(Camera.orientation).toEulerDegrees();
	camState.velocity = vec3(0, 0, 0);

	Camera.mode = "independent";
}

function stopCamera() {
	camState.enabled = false;
	Camera.mode = camState.previousMode;
}

function setWishdir() {
	camState.wishdir = vec3(0, 0, 0);
	camState.wishdir.z -= Number(keyState.forward);
	camState.wishdir.z += Number(keyState.backward);
	camState.wishdir.x -= Number(keyState.left);
	camState.wishdir.x += Number(keyState.right);
	camState.wishdir.y += Number(keyState.up);
	camState.wishdir.y -= Number(keyState.down);

	let speed = 1;
	speed *= keyState.sprint ? 4 : 1;
	speed *= keyState.sneak ? 0.25 : 1;

	camState.wishdir = camState.wishdir.multiply(speed);
}

Controller.keyPressEvent.connect(e => {
	if (e.isAutoRepeat) { return; }

	switch (e.key) {
		case /* Qt::Key_F */ 0x46: {
			if (!camState.enabled) {
				startCamera();
			} else {
				stopCamera();
			}
		} break;

		case /* Qt::Key_W */ 0x57: keyState.forward = true; break;
		case /* Qt::Key_S */ 0x53: keyState.backward = true; break;
		case /* Qt::Key_A */ 0x41: keyState.left = true; break;
		case /* Qt::Key_D */ 0x44: keyState.right = true; break;
		case /* Qt::Key_Q */ 0x51: keyState.down = true; break;
		case /* Qt::Key_E */ 0x45: keyState.up = true; break;
		case /* Qt::Key_Shift */ 0x01000020: keyState.sprint = true; break;
		case /* Qt::Key_Control */ 0x01000021: keyState.sneak = true; break;
	}
});

Controller.keyReleaseEvent.connect(e => {
	if (e.isAutoRepeat) { return; }

	switch (e.key) {
		case /* Qt::Key_W */ 0x57: keyState.forward = false; break;
		case /* Qt::Key_S */ 0x53: keyState.backward = false; break;
		case /* Qt::Key_A */ 0x41: keyState.left = false; break;
		case /* Qt::Key_D */ 0x44: keyState.right = false; break;
		case /* Qt::Key_Q */ 0x51: keyState.down = false; break;
		case /* Qt::Key_E */ 0x45: keyState.up = false; break;
		case /* Qt::Key_Shift */ 0x01000020: keyState.sprint = false; break;
		case /* Qt::Key_Control */ 0x01000021: keyState.sneak = false; break;
	}
});

Controller.mouseMoveEvent.connect(e => {
	if (!camState.enabled) { return; }
	if (!e.isRightButton) { return; }

	mouseState.previousX = mouseState.x;
	mouseState.previousY = mouseState.y;
	mouseState.x = e.x;
	mouseState.y = e.y;
	mouseState.dx = mouseState.x - mouseState.previousX;
	mouseState.dy = mouseState.y - mouseState.previousY;

	if (mouseState.skipFirst) {
		mouseState.skipFirst = false;
		return;
	}

	camState.rotation.y += -mouseState.dx / 8;
	camState.rotation.x += -mouseState.dy / 8;
	camState.rotation.x = clamp(camState.rotation.x, -89.9, 89.9);
});

Controller.mouseReleaseEvent.connect(e => {
	if (e.isRightButton) { mouseState.skipFirst = true; }
});

Script.update.connect(dt => {
	if (!camState.enabled) { return; }
	setWishdir();

	let rotQuat = euler(camState.rotation.x, camState.rotation.y, camState.rotation.z);

	camState.velocity = camState.velocity
		.multiply(CAM_FRICTION)
		.add(rotQuat.multiply(camState.wishdir).multiply(dt * CAM_ACCELERATION));
	camState.position = camState.velocity.multiply(dt).add(camState.position);

	Camera.position = camState.position;
	Camera.orientation = rotQuat;
});
