const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

let animHandler;
const jointHandleEntities = {};

function LP_AnimHandlerFunc(_dummy) {
	const data = {};
	for (const [name, handle] of Object.entries(jointHandleEntities)) {
		let { localPosition, localRotation } = Entities.getEntityProperties(handle, ["localPosition", "localRotation"]);
		const Y_180 = Quat.fromPitchYawRollDegrees(0, 180, 0);
		localRotation = Quat.multiply(Y_180, localRotation);
		localRotation = Quat.multiply(localRotation, Y_180);
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

		hipsType: 0,
		hipsPosition: data["Hips"]["position"],
		hipsRotation: data["Hips"]["rotation"],
	};
}

function LP_CreateHandles(jointNames) {
	for (const joint of jointNames) {
		const jointIndex = MyAvatar.getJointIndex(joint);

		let color = [255, 255, 255];

		const Y_180 = Quat.fromPitchYawRollDegrees(0, 180, 0);
		let localRotation = MyAvatar.getAbsoluteDefaultJointRotationInObjectFrame(jointIndex);
		localRotation = Quat.multiply(Y_180, localRotation);
		//localRotation = Quat.multiply(localRotation, Y_180);
		if (joint.includes("Foot")) {
			localRotation = Quat.multiply(Quat.fromPitchYawRollDegrees(90, 0, 0), localRotation);
		}

		if (joint.includes("Left")) {
			color = [255, 0, 0];
		} else if (joint.includes("Right")) {
			color = [0, 0, 255];
		}

		jointHandleEntities[joint] = Entities.addEntity({
			type: "Box",
			name: `Body poser handle (${joint})`,
			parentID: MyAvatar.sessionUUID,
			localPosition: MyAvatar.getAbsoluteDefaultJointTranslationInObjectFrame(jointIndex),
			localRotation: localRotation,
			localDimensions: [0.1, 0.1, 1],
			collisionless: true,
			alpha: 0.5,
			color: color,
			visible: true,
			unlit: true,
			grab: {grabbable: true},
		}, "local");
	}

	animHandler = MyAvatar.addAnimationStateHandler(LP_AnimHandlerFunc, null);
}

function LP_DeleteHandles() {
	MyAvatar.removeAnimationStateHandler(animHandler);

	for (const joint in jointHandleEntities) {
		Entities.deleteEntity(jointHandleEntities[joint]);
		delete jointHandleEntities[joint];
	}
}

function LP_HideHandles() {
	for (const handle of jointHandleEntities) {
		Entities.editEntity(handle, {visible: false, grab: {grabbable:false}});
	}
}

function LP_ShowHandles() {
	for (const handle of jointHandleEntities) {
		Entities.editEntity(handle, {visible: true, grab: {grabbable:true}});
	}
}

LP_CreateHandles(["Hips", "LeftFoot", "RightFoot"]);

Script.scriptEnding.connect(() => {
	LP_DeleteHandles();
});

Script.unhandledException.connect(e => {
	LP_DeleteHandles();
	console.error(e);
});
