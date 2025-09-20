"use strict";
const INPUT_LT_CLICK = Controller.Standard.LTClick;
const INPUT_RT_CLICK = Controller.Standard.RTClick;
const INPUT_HEAD = Controller.Standard.Head;
const INPUT_LEFT_HAND = Controller.Standard.LeftHand;
const INPUT_RIGHT_HAND = Controller.Standard.RightHand;

const GESTURE_DOUBLE_TAP_TIME_MS = 500;

let lastClickTime = Date.now();

function triggerGesture(leftHanded) {
	const INPUT_HAND = leftHanded ? INPUT_LEFT_HAND : INPUT_RIGHT_HAND;

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
		Controller.triggerHapticPulse(1, 150, 2);
		Window.takeSnapshot();
	}
}

Controller.inputEvent.connect((action, value) => {
	const leftHanded = MyAvatar.getDominantHand() === "left";
	const INPUT_CLICK = leftHanded ? INPUT_LT_CLICK : INPUT_RT_CLICK;

	if (action === INPUT_CLICK && value > 0.5) {
		const now = Date.now();

		if (now < lastClickTime + GESTURE_DOUBLE_TAP_TIME_MS) {
			triggerGesture(leftHanded);
		}

		lastClickTime = now;
	}
});
