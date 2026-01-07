"use strict";
const INPUT_LT = Controller.Standard.LT;
const INPUT_RT = Controller.Standard.RT;
const INPUT_LS = Controller.Standard.LS;
const INPUT_RS = Controller.Standard.RS;
const INPUT_RY = Controller.Standard.RY;
const TOGGLE_MS = 500;

const useFaceShapes = true;
const boneVariant = false;

let targetState = {
	jawOpen: 0,
	tongueOut: 0,
	squint: 0,
	earPitch: 0,
	tailWag: 0,
	angry: 0,
	happy: 0,
	awooga: false,
};

let currentState = {...targetState};
let runtime = 0;

Script.update.connect(dt => {
	runtime += dt;

	const lerp = (from, to, delta) => from + delta * (to - from);

	for (const target of ["jawOpen", "tongueOut", "squint", "earPitch", "angry", "happy"]) {
		currentState[target] = lerp(currentState[target], targetState[target], dt * 6);
	}

	currentState.tailWag = lerp(currentState.tailWag, targetState.tailWag, dt * 3);

	if (useFaceShapes) {
		MyAvatar.hasProceduralBlinkFaceMovement = targetState.squint <= 0.01;

		MyAvatar.setBlendshape("JawOpen", currentState.jawOpen);
		MyAvatar.setBlendshape("TongueOut", currentState.tongueOut);
		MyAvatar.setBlendshape("EyeSquint_L", currentState.squint);
		MyAvatar.setBlendshape("MouthFrown_L", currentState.angry);
		MyAvatar.setBlendshape("MouthSmile_L", currentState.happy);
	}

	const earAngle = Quat.fromPitchYawRollDegrees(currentState.earPitch, 0, 0);
	MyAvatar.setJointRotation(boneVariant ? "EarL_Root" : "L Ear Rot", earAngle);
	MyAvatar.setJointRotation(boneVariant ? "EarR_Root" : "R Ear Rot", earAngle);

	const tailAngle = Quat.fromPitchYawRollDegrees(
		0,
		Math.sin(runtime * 4) * currentState.tailWag * 45,
		0
	);
	MyAvatar.setJointRotation(boneVariant ? "Tail_Root" : "Tail Rot", tailAngle);
});

Controller.inputEvent.connect((action, value) => {
	if (action === INPUT_LT) {
		targetState.jawOpen = value;
	}

	if (action === INPUT_RT) {
		targetState.tongueOut = value;
	}

	if (action === INPUT_RS) {
		targetState.squint = value;
	}

	if (action === INPUT_RY) {
		// activate on right thumbstick down
		targetState.tailWag = -Math.min(0, -value);
	}
});

let keyStates = {
	earUp: false,
	earDown: false,
};

let keyReleaseTimes = new Map();

function keyPress(e, pressed) {
	const key = e.key;
	const text = e.text;
	targetState.earPitch = 0;

	const tryToggle = target => {
		if (!pressed) {
			const now = Date.now();

			if (keyReleaseTimes.has(key) && now - keyReleaseTimes.get(key) < TOGGLE_MS) {
				targetState[target] = true;
			}

			keyReleaseTimes.set(key, now);
		}
	};

	if (key === 0x49 /* Qt::Key_I */ || text === "i" ) { keyStates.earUp = pressed; }
	if (keyStates.earUp) { targetState.earPitch += 45; }

	if (key === 0x4b /* Qt::Key_K */ || text === "k") { keyStates.earDown = pressed; }
	if (keyStates.earDown) { targetState.earPitch -= 45; }

	if (key === 0x4c /* Qt::Key_L */ || text === "l") {
		targetState.tailWag = pressed ? 1 : 0;
		tryToggle("tailWag");
	}

	if (key === 0x2c /* Qt::Key_Comma */ || text === ",") {
		targetState.tongueOut = pressed ? 1 : 0;
		tryToggle("tongueOut");
	}

	if (key === 0x2e /* Qt::Key_Period */ || text === ".") {
		targetState.squint = pressed ? 1 : 0;
		tryToggle("squint");
	}

	if (key === 0x3b /* Qt::Key_Semicolon */ || text === ";") {
		targetState.jawOpen = pressed ? 1 : 0;
		tryToggle("jawOpen");
	}

	if (key === 0x5b /* Qt::Key_BracketLeft */ || text === "[") {
		targetState.happy = pressed ? 1 : 0;
		tryToggle("happy");
	}

	if (key === 0x5d /* Qt::Key_BracketRight */ || text === "]") {
		targetState.angry = pressed ? 1 : 0;
		tryToggle("angry");
	}

	if ((key === 0x4e /* Qt::Key_N */ || text === "n") && pressed) {
		targetState.awooga = !targetState.awooga;

		const leftEye = MyAvatar.getJointIndex("LeftEye");
		const rightEye = MyAvatar.getJointIndex("RightEye");

		const leftPosDefault = MyAvatar.getDefaultJointTranslation(leftEye);
		const rightPosDefault = MyAvatar.getDefaultJointTranslation(rightEye);

		if (targetState.awooga) {
			targetState.jawOpen = 2;
			MyAvatar.setBlendshape("EyeUp_L", 4);
			MyAvatar.setJointTranslation(leftEye, Vec3.sum(leftPosDefault, [0.05, 0, 0.05]));
			MyAvatar.setJointTranslation(rightEye, Vec3.sum(rightPosDefault, [-0.05, 0, 0.05]));
		} else {
			targetState.jawOpen = 0;
			MyAvatar.setBlendshape("EyeUp_L", 0);
			MyAvatar.setJointTranslation(leftEye, leftPosDefault);
			MyAvatar.setJointTranslation(rightEye, rightPosDefault);
		}
	}
}

Controller.keyPressEvent.connect(e => keyPress(e, true));
Controller.keyReleaseEvent.connect(e => keyPress(e, false));
