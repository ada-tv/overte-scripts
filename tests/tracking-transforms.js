"use strict";

const INPUT_HEAD = Controller.Standard.Head;
const INPUT_LEFT_HAND = Controller.Standard.LeftHand;
const INPUT_RIGHT_HAND = Controller.Standard.RightHand;

const displayText = Entities.addEntity({
	type: "Text",
	position: Vec3.sum(MyAvatar.getHeadPosition(), Vec3.multiplyQbyV(MyAvatar.headOrientation, [1, 0, -1])),
	dimensions: [2, 1, 0.1],
	text: "Clicks: 0",
	unlit: true,
	alignment: "left",
	verticalAlignment: "top",
	backgroundAlpha: 0.9,
	lineHeight: 0.1,
	font: "Inconsolata",
}, "local");

const closeButton = Entities.addEntity({
	type: "Text",
	parentID: displayText,
	localPosition: [1.45, 0.3, 0],
	dimensions: [0.1, 0.1, 0.1],
	text: "X",
	unlit: true,
	alignment: "center",
	verticalAlignment: "center",
	backgroundColor: "#7f0000",
}, "local");

function toThreeDigits(n) {
	return Math.round(n * 1000) / 1000;
}

function vec3String(v) {
	return `(${toThreeDigits(v.x)}, ${toThreeDigits(v.y)}, ${toThreeDigits(v.z)})`;
}

Script.update.connect(() => {
	const scaleInv = 1.0 / MyAvatar.getSensorToWorldScale();
	const poses = {
		headRot: Controller.getPoseValue(INPUT_HEAD).rotation,
		head: Vec3.multiply(Controller.getPoseValue(INPUT_HEAD).translation, scaleInv),
		left: Vec3.multiply(Controller.getPoseValue(INPUT_LEFT_HAND).translation, scaleInv),
		right: Vec3.multiply(Controller.getPoseValue(INPUT_RIGHT_HAND).translation, scaleInv),
	};

	const headRotInv = Quat.inverse(poses.headRot);
	const relativePos = [
		Vec3.multiplyQbyV(
			headRotInv,
			Vec3.sum(
				Vec3.multiply(poses.head, -1),
				poses.left
			)
		),
		Vec3.multiplyQbyV(
			headRotInv,
			Vec3.sum(
				Vec3.multiply(poses.head, -1),
				poses.right
			)
		),
	];

	const text = `Head : ${vec3String(poses.head)}
Left : ${vec3String(poses.left)}
Right: ${vec3String(poses.right)}

LRel : ${vec3String(relativePos[0])}
RRel : ${vec3String(relativePos[1])}`;

	Entities.editEntity(displayText, { text: text });
});

Entities.mousePressOnEntity.connect((entity, _event) => {
	if (entity === closeButton) {
		Script.stop();
	}
});

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(displayText);
	Entities.deleteEntity(closeButton);
});
