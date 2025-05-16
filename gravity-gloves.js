// SPDX-License-Identifier: CC0-1.0
const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));
const ctxAction = {text: "Gravity Gloves", textColor: [255, 192, 0], localClickFunc: "gravityGloves.toggle"};
ContextMenu.registerActionSet("gravityGloves", [ctxAction], "_SELF");

let enabled = true;

let grabTarget = [,,];
let grabConstraint = [,,];
let prevPoses = [
		Controller.getPoseValue(Controller.Standard.LeftHand),
		Controller.getPoseValue(Controller.Standard.RightHand),
];

let grabPointer = [
	// left hand
	Pointers.createRayPointer({
		enabled: true,
		maxDistance: 8,
		lockEnd: true,
		scaleWithParent: true,
		filter: 679, // domain | avatar | local | visible | collidable | precise
		joint: "_CAMERA_RELATIVE_CONTROLLER_LEFTHAND",
	}),

	// right hand
	Pointers.createRayPointer({
		enabled: true,
		maxDistance: 8,
		lockEnd: true,
		scaleWithParent: true,
		filter: 679, // domain | avatar | local | visible | collidable | precise
		joint: "_CAMERA_RELATIVE_CONTROLLER_RIGHTHAND",
	}),
];

Script.update.connect(_dt => {
	if (Controller.getValue(Controller.Standard.LT) < 0.2) { delete grabTarget[0]; }
	if (Controller.getValue(Controller.Standard.RT) < 0.2) { delete grabTarget[1]; }

	if (!enabled) { return; }
		
	for (let i = 0; i < grabPointer.length; i++) {		
		const hit = Pointers.getPrevPickResult(grabPointer[i]);
		const props = Entities.getEntityProperties(hit.objectID, "dynamic");
		if (props?.dynamic) { grabTarget[i] = hit.objectID; }

		const pose = Controller.getPoseValue(i == 0 ? Controller.Standard.LeftHand : Controller.Standard.RightHand);
		const velocity = Vec3.distance(pose.translation, prevPoses[i].translation);
		prevPoses[i] = pose;

		if (velocity > 0.013) {
			if (grabConstraint[i]) { Entities.deleteAction(grabTarget[i], grabConstraint[i]); }
			grabConstraint[i] = Entities.addAction("tractor", grabTarget[i], {
				ttl: 2,
				linearTimeScale: 1,
				angularTimeScale: 1,
				// bugged?
				//otherID: MyAvatar.sessionUUID,
				//otherJointIndex: MyAvatar.getJointIndex(i == 0 ? "LeftHand" : "RightHand"),
				//targetPosition: [0, 0, 0],
				targetPosition: MyAvatar.position,
				targetRotation: Quat.IDENTITY,
			});
		}
	}
});

Messages.messageReceived.connect((channel, msg, senderID, _localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (data.funcName === "gravityGloves.toggle") {
		enabled = !enabled;
		ctxAction.textColor = enabled ? [0, 0, 0] : [255, 192, 0];
		ctxAction.backgroundColor = enabled ? [255, 192, 0] : [0, 0, 0];
		ContextMenu.editActionSet("gravityGloves", [ctxAction]);
	}
});

Script.scriptEnding.connect(() => {
	ContextMenu.unregisterActionSet("gravityGloves");
	Pointers.removePointer(grabPointer[0]);
	Pointers.removePointer(grabPointer[1]);
});
