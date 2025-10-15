// To trigger gesture:
// - Double-tap dominant trigger near your ear for a photo
// - Hold dominant trigger near your ear for a GIF
"use strict";
const INPUT_LT_CLICK = Controller.Standard.LTClick;
const INPUT_RT_CLICK = Controller.Standard.RTClick;
const INPUT_HEAD = Controller.Standard.Head;
const INPUT_LEFT_HAND = Controller.Standard.LeftHand;
const INPUT_RIGHT_HAND = Controller.Standard.RightHand;

const GESTURE_DOUBLE_TAP_TIME_MS = 500;
const GESTURE_VIDEO_WAIT_MS = 500;
const PHOTO_ASPECT_RATIO = 16 / 9; // 0 for full framebuffer size

let clicked = false;
let clicks = 0;
let lastClickTime = Date.now();
let makeAnimated = false;
let animatedWaitTimer;

function triggerGesture(leftHanded) {
	const INPUT_HAND = leftHanded ? INPUT_LEFT_HAND : INPUT_RIGHT_HAND;

	const poses = {
		head: Controller.getPoseValue(INPUT_HEAD),
		hand: Controller.getPoseValue(INPUT_HAND),
	};

	const scaleInv = 1.0 / MyAvatar.getSensorToWorldScale();
	poses.head.translation = Vec3.multiply(scaleInv, poses.head.translation);
	poses.hand.translation = Vec3.multiply(scaleInv, poses.hand.translation);

	const headRotInv = Quat.inverse(poses.head.rotation);
	const handRel = Vec3.multiplyQbyV(
		headRotInv,
		Vec3.sum(
			Vec3.multiply(poses.head.translation, -1),
			poses.hand.translation
		)
	);

	if (
		Math.abs(handRel.z) < 0.2 &&
		Math.abs(handRel.y) < 0.3 &&
		Math.abs(handRel.x) < 0.3
	) {
		clicks += 1;

		if (Date.now() > lastClickTime + GESTURE_DOUBLE_TAP_TIME_MS && !makeAnimated) {
			clicks = 0;
		}

		if (clicks == 1) {
			Controller.triggerHapticPulse(1, 150, 2);
			Window.takeSnapshot(true, makeAnimated, PHOTO_ASPECT_RATIO);
		}
	}
}

Controller.inputEvent.connect((action, value) => {
	const leftHanded = MyAvatar.getDominantHand() === "left";
	const INPUT_CLICK = leftHanded ? INPUT_LT_CLICK : INPUT_RT_CLICK;

	if (action === INPUT_CLICK) {
		if (value > 0.5 && !clicked) {
			triggerGesture(leftHanded);
			lastClickTime = Date.now();
			animatedWaitTimer = Script.setTimeout(() => {
				makeAnimated = true;
				triggerGesture(leftHanded);
				makeAnimated = false;
			}, GESTURE_VIDEO_WAIT_MS);
		} else if (value < 0.5 && animatedWaitTimer !== undefined) {
			Script.clearTimeout(animatedWaitTimer);
			animatedWaitTimer = undefined;
		}

		clicked = value > 0.5;
	}
});
