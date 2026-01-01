"use strict";
const {
	Vector3,
	Quaternion,
	vec3,
	color,
} = require("utilMath");

const LERP_TIME = 2;
const WAIT_TIME = 0.5;

function randomAngle() {
	return Quaternion.fromPitchYawRollRadians(
		Math.random() * Math.PI * 2,
		Math.random() * Math.PI * 2,
		Math.random() * Math.PI * 2
	);
}

let currentAngle = Quaternion.IDENTITY;
let prevTargetAngle = currentAngle;
let targetAngle = randomAngle();
let lerpT = 0;

const linePoints = [
	vec3(0, 0, 0),
	vec3(0, 0, -1),
	vec3(0.2, 0, -0.7),
	vec3(0, 0, -1),
	vec3(-0.2, 0, -0.7),
	vec3(0, 0, -1),
	vec3(0, 0, 0),
];

// behaves as expected with "domain", bugs out with "avatar"
const hostType = "avatar";

const testEntityRoot = Entities.addEntity({
	type: "Sphere",
	position: vec3(0, 0.5, 0).add(MyAvatar.position),
	dimensions: vec3(2, 2, 2),
	unlit: true,
	alpha: 0.1,
	color: color(192, 192, 192),
	collisionless: true,
}, hostType);

const testEntityArrow = Entities.addEntity({
	type: "PolyLine",
	parentID: testEntityRoot,
	localPosition: Vector3.ZERO,
	rotation: currentAngle,
	linePoints,
	strokeWidths: Array(linePoints.length).fill(0.01),
	normals: Array(linePoints.length).fill(new Vector3(0, 0, 1)),
	color: color(0, 192, 0),
	faceCamera: true,
	ignorePickIntersection: true,
}, hostType);

const testEntityTarget = Entities.addEntity({
	type: "Sphere",
	parentID: testEntityRoot,
	localPosition: targetAngle.multiply(Vector3.FORWARD),
	dimensions: vec3(0.05, 0.05, 0.05),
	unlit: true,
	alpha: 0.7,
	color: color(255, 255, 0),
	collisionless: true,
	ignorePickIntersection: true,
}, hostType);

function update(dt) {
	lerpT += dt / LERP_TIME;

	currentAngle = prevTargetAngle.lerpTo(targetAngle, Math.min(1, lerpT)).normalized();
	Entities.editEntity(testEntityArrow, { rotation: currentAngle });
}

const UPDATE_FPS = 30;
Script.setInterval(() => update(1 / UPDATE_FPS), 1000 / UPDATE_FPS);
//Script.update.connect(dt => update(dt));

Script.setInterval(() => {
	prevTargetAngle = currentAngle;
	targetAngle = randomAngle();
	lerpT = 0;

	let targetPosition = targetAngle.multiply(Vector3.FORWARD);
	Entities.editEntity(testEntityTarget, { localPosition: targetPosition });
}, (LERP_TIME + WAIT_TIME) * 1000);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(testEntityTarget);
	Entities.deleteEntity(testEntityArrow);
	Entities.deleteEntity(testEntityRoot);
});
