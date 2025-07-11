const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));
const VersionFeatures = Script.require(Script.resolvePath("versionFeatures.js"));
const QueryOptions = Script.require(Script.resolvePath("queryOptions.js"));

const PUBLIC_HANDLES = Boolean(Number(QueryOptions?.publicHandles ?? 0));
const USE_GRAB_HACK = !VersionFeatures.grabbableLocalEntities;
if (USE_GRAB_HACK) {
	console.warn("Grabbable local entities not supported, using workaround… Other players won't see the handles, but will still be able to grab them!");
}

let hasHandles = false;
let enabled = false;
let handlesVisible = true;

let animHandler;
const jointHandleEntities = {};

function LP_AnimHandlerFunc(_dummy) {
	const data = {};
	for (const [name, handle] of Object.entries(jointHandleEntities)) {
		let { localPosition, localRotation } = Entities.getEntityProperties(handle, ["localPosition", "localRotation"]);
		const Y_180 = Quat.fromPitchYawRollDegrees(0, 180, 0);
		localRotation = Quat.multiply(Y_180, localRotation);
		localRotation = Quat.multiply(localRotation, Y_180);
		if (name.includes("Foot")) {
			localRotation = Quat.multiply(localRotation, Quat.fromPitchYawRollDegrees(45, 0, 180));
		} else if (name.includes("Hand")) {
			localRotation = Quat.multiply(localRotation, Quat.fromPitchYawRollDegrees(90, name.includes("Left") ? 90 : -90, 0));
		}
		localPosition = { x: -localPosition.x, y: localPosition.y, z: -localPosition.z };
		data[name] = { position: localPosition, rotation: localRotation };
	}

	const lowerBody = {
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

	const upperBody = HMD.active ? {} : {
		headType: 0,
		headPosition: data["Head"]["position"],
		headRotation: data["Head"]["rotation"],

		spine2Type: 0,
		spine2Position: data["Spine2"]["position"],
		spine2Rotation: data["Spine2"]["rotation"],

		leftHandType: 0,
		leftHandIKPositionVar: "leftHandPosition",
		leftHandIKRotationVar: "leftHandRotation",
		leftHandPosition: data["LeftHand"]["position"],
		leftHandRotation: data["LeftHand"]["rotation"],

		rightHandType: 0,
		rightHandIKPositionVar: "rightHandPosition",
		rightHandIKRotationVar: "rightHandRotation",
		rightHandPosition: data["RightHand"]["position"],
		rightHandRotation: data["RightHand"]["rotation"],

		// mapping the elbows to the hand rotation looks janky
		/*leftHandPoleVectorEnabled: true,
		leftHandPoleVector: Vec3.multiply(-1, Quat.getForward(data["LeftHand"]["rotation"])),

		rightHandPoleVectorEnabled: true,
		rightHandPoleVector: Vec3.multiply(-1, Quat.getForward(data["RightHand"]["rotation"])),*/
	};

	return { ...lowerBody, ...upperBody };
}

function LP_CreateHandles(jointNames) {
	const avatarScale = MyAvatar.scale;

	for (const joint of jointNames) {
		const jointIndex = MyAvatar.getJointIndex(joint);

		let color = [255, 255, 255];

		if (joint.includes("Left")) {
			color = [255, 0, 0];
		} else if (joint.includes("Right")) {
			color = [0, 0, 255];
		}

		const handleSize = Vec3.multiply(HMD.active ? [0.05, 0.05, 0.8] : [0.15, 0.15, 0.15], avatarScale);

		jointHandleEntities[joint] = Entities.addEntity({
			type: "Box",
			name: `Body poser handle (${joint})`,
			parentID: MyAvatar.sessionUUID,
			localPosition: MyAvatar.getAbsoluteDefaultJointTranslationInObjectFrame(jointIndex),
			localDimensions: handleSize,
			collisionless: true,
			alpha: (USE_GRAB_HACK && !PUBLIC_HANDLES) ? 0.0 : 0.5,
			color: color,
			unlit: true,
			visible: handlesVisible,
			grab: {grabbable: handlesVisible},
			renderLayer: "front",
		}, (USE_GRAB_HACK || PUBLIC_HANDLES) ? "avatar" : "local");

		// local entities aren't properly grabbable on 2025.05.1,
		// so have invisible grabbable avatar entities with local visuals
		if (USE_GRAB_HACK && !PUBLIC_HANDLES) {
			Entities.addEntity({
				parentID: jointHandleEntities[joint],
				type: "Box",
				name: `Body poser handle visual (${joint})`,
				localDimensions: handleSize,
				collisionless: true,
				alpha: 0.5,
				color: color,
				unlit: true,
				visible: handlesVisible,
				grab: {grabbable: false},
				ignorePickIntersection: true,
			}, "local");
		}
	}

	for (const role of MyAvatar.getAnimationRoles()) {
		MyAvatar.overrideRoleAnimation(role, "qrc:/avatar/animations/idle.fbx", 1, true, 1, 1);
	}

	animHandler = MyAvatar.addAnimationStateHandler(LP_AnimHandlerFunc, null);
	hasHandles = true;
}

function LP_DeleteHandles() {
	hasHandles = false;
	MyAvatar.removeAnimationStateHandler(animHandler);

	for (const role of MyAvatar.getAnimationRoles()) {
		MyAvatar.restoreRoleAnimation(role);
	}

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
		text: ">  [X] Poser handles",
		localClickFunc: "bodyPoser.toggleHandles",
		backgroundColor: [0, 0, 0],
		textColor: [128, 128, 128],
		priority: -4.9,
	},
	{
		text: "Poser",
		localClickFunc: "bodyPoser.toggle",
		backgroundColor: [0, 0, 0],
		textColor: [0, 255, 64],
		priority: -5,
	},
];

ContextMenu.registerActionSet("bodyPoser", actionSet, "_SELF");

Messages.messageReceived.connect((channel, msg, senderID, _localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (data.funcName === "bodyPoser.toggleHandles") {
		handlesVisible = !handlesVisible;

		if (handlesVisible) {
			LP_ShowHandles();
		} else {
			LP_HideHandles();
		}
	} else if (data.funcName === "bodyPoser.toggle") {
		enabled = !enabled;

		if (enabled) {
			LP_CreateHandles(
				HMD.active
					? ["Hips", "LeftFoot", "RightFoot"]
					: ["Hips", "Head", "Spine2", "LeftFoot", "LeftHand", "RightFoot", "RightHand"]
				);
		} else {
			LP_DeleteHandles();
		}
	}

	if (data.funcName.startsWith("bodyPoser.toggle")) {
		const fgColor = enabled ? [255, 255, 255] : [0, 255, 96];
		const bgColor = enabled ? [0, 64, 24] : [0, 0, 0];

		actionSet[0].text = handlesVisible ? ">  [X] Show handles" : ">  [  ] Show handles";
		actionSet[0].backgroundColor = bgColor;
		actionSet[0].textColor = enabled ? [255, 255, 255] : [128, 128, 128];

		actionSet[1].backgroundColor = bgColor;
		actionSet[1].textColor = fgColor;

		ContextMenu.editActionSet("bodyPoser", actionSet);
	}
});
