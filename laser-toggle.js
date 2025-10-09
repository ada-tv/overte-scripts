// To trigger gesture: Pull both triggers with the controllers behind your head
"use strict";
const INPUT_LT_CLICK = Controller.Standard.LTClick;
const INPUT_RT_CLICK = Controller.Standard.RTClick;
const INPUT_HEAD = Controller.Standard.Head;
const INPUT_LEFT_HAND = Controller.Standard.LeftHand;
const INPUT_RIGHT_HAND = Controller.Standard.RightHand;

let clicks = [false, false];
let clicked = false;
let lasersDisabled = false;

Script.scriptEnding.connect(() => {
	Messages.sendLocalMessage("Hifi-Hand-Disabler", none);
});

Controller.inputEvent.connect((action, value) => {
	if (action === INPUT_LT_CLICK) { clicks[0] = value > 0.5; }
	else if (action === INPUT_RT_CLICK) { clicks[1] = value > 0.5; }

	if (clicks[0] && clicks[1] && !clicked) {
		clicked = true;

		const poses = {
			head: Controller.getPoseValue(INPUT_HEAD),
			left: Controller.getPoseValue(INPUT_LEFT_HAND),
			right: Controller.getPoseValue(INPUT_RIGHT_HAND),
		};

		const scaleInv = 1.0 / MyAvatar.getSensorToWorldScale();
		poses.head.translation = Vec3.multiply(scaleInv, poses.head.translation);
		poses.left.translation = Vec3.multiply(scaleInv, poses.left.translation);
		poses.right.translation = Vec3.multiply(scaleInv, poses.right.translation);

		const headRotInv = Quat.inverse(poses.head.rotation);
		const leftRel = Vec3.multiplyQbyV(headRotInv, poses.left.translation);
		const rightRel = Vec3.multiplyQbyV(headRotInv, poses.right.translation);

		if (leftRel.z < -0.05 && rightRel.z < -0.05) {
			lasersDisabled = !lasersDisabled;
			Window.displayAnnouncement(lasersDisabled ? "Lasers disabled" : "Lasers enabled");
			Messages.sendLocalMessage("Hifi-Hand-Disabler", lasersDisabled ? "both" : "none");
			Controller.triggerHapticPulse(1, 5, 2);
		}
	} else if (!clicks[0] && !clicks[1] && clicked) {
		clicked = false;
	}
});
