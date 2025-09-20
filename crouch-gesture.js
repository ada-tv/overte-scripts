// To trigger gesture: Tap non-dominant controller grip twice near your ear
"use strict";
const INPUT_LEFT_GRIP = Controller.Standard.LeftGrip;
const INPUT_RIGHT_GRIP = Controller.Standard.RightGrip;
const INPUT_HEAD = Controller.Standard.Head;
const INPUT_LEFT_HAND = Controller.Standard.LeftHand;
const INPUT_RIGHT_HAND = Controller.Standard.RightHand;

const GESTURE_DOUBLE_TAP_TIME_MS = 500;

let lastClickTime = Date.now();
let alreadyPressed = false;

function triggerGesture(leftHanded) {
	const INPUT_HAND = leftHanded ? INPUT_RIGHT_HAND : INPUT_LEFT_HAND;

	const poses = {
		head: Controller.getPoseValue(INPUT_HEAD),
		hand: Controller.getPoseValue(INPUT_HAND),
	};
	const headRotInv = Quat.inverse(poses.head.rotation);
	const handRel = Vec3.multiplyQbyV(
		headRotInv,
		Vec3.sum(
			Vec3.multiply(poses.head.translation, -1),
			poses.hand.translation
		)
	);

	if (
		Math.abs(handRel.z) < 0.15 &&
		Math.abs(handRel.y) < 0.15 &&
		Math.abs(handRel.x) < 0.25
	) {
		Controller.triggerHapticPulse(1, 50, leftHanded ? 1 : 0);
		MyAvatar.userRecenterModel = (MyAvatar.userRecenterModel === 3) ? 0 : 3;
	}
}

Controller.inputEvent.connect((action, value) => {
	const leftHanded = MyAvatar.getDominantHand() === "left";
	const INPUT_CLICK = leftHanded ? INPUT_RIGHT_GRIP : INPUT_LEFT_GRIP;

	if (action === INPUT_CLICK && value > 0.5 && !alreadyPressed) {
		alreadyPressed = true;

		const now = Date.now();

		if (now < lastClickTime + GESTURE_DOUBLE_TAP_TIME_MS) {
			triggerGesture(leftHanded);
		}

		lastClickTime = now;
	}

	if (action === INPUT_CLICK && value < 0.5) {
		alreadyPressed = false;
	}
});
