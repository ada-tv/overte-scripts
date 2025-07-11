// SPDX-License-Identifier: CC0-1.0
const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

const actionSet = [
	{
		text: "Violence",
		textColor: [255, 0, 0],
		localClickFunc: "violence.toggle",
	}
];
ContextMenu.registerActionSet("violence", actionSet, "_SELF");

let enabled = false;
let colliderEntities = [];

function spawnColliders() {
	const joints = ["LeftHand", "RightHand", "LeftFoot", "RightFoot", "Head"];

	for (const joint of joints) {
		colliderEntities.push(Entities.addEntity({
			type: "Sphere",
			parentID: MyAvatar.sessionUUID,
			parentJointIndex: MyAvatar.getJointIndex(joint),
			localPosition: joint.endsWith("Hand") ? [0, 0.1, 0] : [0, 0, 0],
			localDimensions: [0.2, 0.2, 0.2],
			ignorePickIntersection: true,
			collidesWith: "otherAvatar",
			alpha: 0,
			grab: {grabbable: false},
		}, "avatar"));
	}
}

Messages.messageReceived.connect((channel, msg, senderID, _localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (data.funcName === "violence.toggle") {
		if (enabled) {
			for (const entity of colliderEntities) {
				Entities.deleteEntity(entity);
			}
			colliderEntities = [];
			actionSet[0].textColor = [255, 0, 0];
			actionSet[0].backgroundColor = [0, 0, 0];
			enabled = false;
		} else {
			spawnColliders();
			actionSet[0].textColor = [0, 0, 0];
			actionSet[0].backgroundColor = [255, 0, 0];
			enabled = true;
		}
		ContextMenu.editActionSet("violence", actionSet);
	}
});

Script.scriptEnding.connect(() => {
	ContextMenu.unregisterActionSet("violence");

	if (enabled) {
		for (const entity of colliderEntities) {
			Entities.deleteEntity(entity);
		}
	}
});
