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
	const poses = {
		head: Controller.getPoseValue(INPUT_HEAD),
		left: Controller.getPoseValue(INPUT_LEFT_HAND),
		right: Controller.getPoseValue(INPUT_RIGHT_HAND),
	};

	const text = `Head : ${vec3String(poses.head.velocity)}
       ${vec3String(poses.head.angularVelocity)}
Left : ${vec3String(poses.left.velocity)}
       ${vec3String(poses.left.angularVelocity)}
Right: ${vec3String(poses.right.velocity)}
       ${vec3String(poses.right.angularVelocity)}`;

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
