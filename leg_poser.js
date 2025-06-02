const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

let hasHandles = false;
let enabled = false;
let handlesVisible = true;

let animHandler;
const jointHandleEntities = {};

function LP_AnimHandlerFunc(_dummy) {
	const data = {};
	for (const [name, handle] of Object.entries(jointHandleEntities)) {
		let { localPosition, localRotation } = Entities.getEntityProperties(handle, ["localPosition", "localRotation"]);
		localPosition = Vec3.sum(localPosition, Vec3.multiply(Quat.getForward(localRotation), -0.25));
		const Y_180 = Quat.fromPitchYawRollDegrees(0, 180, 0);
		localRotation = Quat.multiply(Y_180, localRotation);
		localRotation = Quat.multiply(localRotation, Y_180);
		if (name.includes("Foot")) {
			localRotation = Quat.multiply(localRotation, Quat.fromPitchYawRollDegrees(45, 0, 180));
		}
		localPosition = { x: -localPosition.x, y: localPosition.y, z: -localPosition.z };
		data[name] = { position: localPosition, rotation: localRotation };
	}

	return {
		leftFootIKEnabled: true,
		leftFootIKPositionVar: "leftFootPosition",
		leftFootIKRotationVar: "leftFootRotation",
		leftFootPosition: data["LeftFoot"]["position"],
		leftFootRotation: data["LeftFoot"]["rotation"],

		rightFootIKEnabled: true,
		rightFootIKPositionVar: "rightFootPosition",
		rightFootIKRotationVar: "rightFootRotation",
		rightFootPosition: data["RightFoot"]["position"],
		rightFootRotation: data["RightFoot"]["rotation"],

		leftFootPoleVectorEnabled: true,
		leftFootPoleVector: Vec3.multiply(-1, Quat.getForward(data["LeftFoot"]["rotation"])),

		rightFootPoleVectorEnabled: true,
		rightFootPoleVector: Vec3.multiply(-1, Quat.getForward(data["RightFoot"]["rotation"])),

		hipsType: 0,
		hipsPosition: data["Hips"]["position"],
		hipsRotation: data["Hips"]["rotation"],
	};
}

function LP_CreateHandles(jointNames) {
	for (const joint of jointNames) {
		const jointIndex = MyAvatar.getJointIndex(joint);

		let color = [255, 255, 255];

		if (joint.includes("Left")) {
			color = [255, 0, 0];
		} else if (joint.includes("Right")) {
			color = [0, 0, 255];
		}

		jointHandleEntities[joint] = Entities.addEntity({
			type: "Box",
			name: `Body poser handle (${joint})`,
			parentID: MyAvatar.sessionUUID,
			localPosition: Vec3.sum([0, 0, -0.25], MyAvatar.getAbsoluteDefaultJointTranslationInObjectFrame(jointIndex)),
			localDimensions: [0.05, 0.05, 0.5],
			collisionless: true,
			alpha: 0.5,
			color: color,
			unlit: true,
			visible: handlesVisible,
			grab: {grabbable: handlesVisible},
		}, "local");
	}

	animHandler = MyAvatar.addAnimationStateHandler(LP_AnimHandlerFunc, null);
	hasHandles = true;
}

function LP_DeleteHandles() {
	hasHandles = false;
	MyAvatar.removeAnimationStateHandler(animHandler);

	for (const joint in jointHandleEntities) {
		Entities.deleteEntity(jointHandleEntities[joint]);
		delete jointHandleEntities[joint];
	}
}

function LP_HideHandles() {
	if (!hasHandles) { return; }

	for (const handle of Object.values(jointHandleEntities)) {
		Entities.editEntity(handle, {visible: false, grab: {grabbable:false}});
	}
}

function LP_ShowHandles() {
	if (!hasHandles) { return; }

	for (const handle of Object.values(jointHandleEntities)) {
		Entities.editEntity(handle, {visible: true, grab: {grabbable:true}});
	}
}

Script.scriptEnding.connect(() => {
	LP_DeleteHandles();
	ContextMenu.unregisterActionSet("bodyPoser");
});

const actionSet = [
	{
		text: "Hide poser handles",
		localClickFunc: "bodyPoser.toggleHandles",
		priority: -2,
	},
	{
		text: "Enable poser",
		localClickFunc: "bodyPoser.toggle",
		priority: -1,
	},
];

ContextMenu.registerActionSet("bodyPoser", actionSet, "_SELF");

Messages.messageReceived.connect((channel, msg, senderID, _localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (data.funcName === "bodyPoser.toggleHandles") {
		handlesVisible = !handlesVisible;
		actionSet[0].text = handlesVisible ? "Hide poser handles" : "Show poser handles";
		ContextMenu.editActionSet("bodyPoser", actionSet);

		if (handlesVisible) {
			LP_ShowHandles();
		} else {
			LP_HideHandles();
		}
	} else if (data.funcName === "bodyPoser.toggle") {
		enabled = !enabled;

		actionSet[1].text = enabled ? "Disable poser" : "Enable poser";
		ContextMenu.editActionSet("bodyPoser", actionSet);

		if (enabled) {
			LP_CreateHandles(["Hips", "LeftFoot", "RightFoot"]);
		} else {
			LP_DeleteHandles();
		}
	}
});
