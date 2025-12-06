"use strict";
const INPUT_LT = Controller.Standard.LT;
const INPUT_RT = Controller.Standard.RT;
const INPUT_LS = Controller.Standard.LS;
const INPUT_RS = Controller.Standard.RS;
const INPUT_RY = Controller.Standard.RY;
const INPUT_LEFT_GRIP = Controller.Standard.LeftGrip;

let targetState = {
	jawOpen: 0,
	tongueOut: 0,
	squint: 0,
	earPitch: 0,
	tailYaw: 0,
	angry: 0,
	happy: 0,
};

let currentState = {...targetState};

Script.update.connect(() => {
	const lerp = (from, to, delta) => from + delta * (to - from);

	for (const [k, v] of Object.entries(targetState)) {
		// very wrong, but who cares
		currentState[k] = lerp(currentState[k], v, 0.1);
	}

	MyAvatar.hasProceduralBlinkFaceMovement = targetState.squint <= 0.01;

	MyAvatar.setBlendshape("JawOpen", currentState.jawOpen);
	MyAvatar.setBlendshape("TongueOut", currentState.tongueOut);
	MyAvatar.setBlendshape("EyeSquint_L", currentState.squint);
	MyAvatar.setBlendshape("MouthFrown_L", currentState.angry);
	MyAvatar.setBlendshape("MouthSmile_L", currentState.happy);

	const earAngle = Quat.fromPitchYawRollDegrees(currentState.earPitch, 0, 0);
	MyAvatar.setJointRotation("EarL_Root", earAngle);
	MyAvatar.setJointRotation("EarR_Root", earAngle);

	const tailAngle = Quat.fromPitchYawRollDegrees(0, currentState.tailYaw, 0);
	MyAvatar.setJointRotation("Tail_Root", tailAngle);
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
		targetState.tailYaw = value * 60;
	}

	if (action === INPUT_LEFT_GRIP) {
		targetState.angry = Math.min(1.0, value * 4);
	}
});

let keyStates = {
	earUp: false,
	earDown: false,
	tailLeft: false,
	tailRight: false,
};

function keyPress(e, pressed) {
	const key = e.key;
	targetState.earPitch = 0;
	targetState.tailYaw = 0;

	if (key === 0x49 /* Qt::Key_I */ || text === "i" ) { keyStates.earUp = pressed; }
	if (keyStates.earUp) { targetState.earPitch += 45; }

	if (key === 0x4b /* Qt::Key_K */ || text === "k") { keyStates.earDown = pressed; }
	if (keyStates.earDown) { targetState.earPitch -= 45; }

	if (key === 0x4a /* Qt::Key_J */ || text === "j") { keyStates.tailLeft = pressed; }
	if (keyStates.tailLeft) { targetState.tailYaw -= 60; }

	if (key === 0x4c /* Qt::Key_L */ || text === "l") { keyStates.tailRight = pressed; }
	if (keyStates.tailRight) { targetState.tailYaw += 60; }

	if (key === 0x2c /* Qt::Key_Comma */ || text === ",") {
		targetState.tongueOut = pressed ? 1 : 0;
	}

	if (key === 0x2e /* Qt::Key_Period */ || text === ".") {
		targetState.squint = pressed ? 1 : 0;
	}

	if (key === 0x3b /* Qt::Key_Semicolon */ || text === ";") {
		targetState.jawOpen = pressed ? 1 : 0;
	}

	if (key === 0x5b /* Qt::Key_BracketLeft */ || test === "[") {
		targetState.happy = pressed ? 1 : 0;
	}

	if (key === 0x5d /* Qt::Key_BracketRight */ || test === "]") {
		targetState.angry = pressed ? 1 : 0;
	}
}

Controller.keyPressEvent.connect(e => keyPress(e, true));
Controller.keyReleaseEvent.connect(e => keyPress(e, false));
