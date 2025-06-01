// SPDX-License-Identifier: CC0-1.0

const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

let dummyEntity = Entities.addEntity({
	type: "Box",
	position: Vec3.sum(MyAvatar.position, Quat.getForward(MyAvatar.orientation)),
	userData: JSON.stringify({
		contextMenu: {
			noObjectMenu: true,
			actions: [
				{
					text: "Userdata action",
					textColor: [0, 255, 0],
					localClickFunc: "targetTest.click",
				}
			]
		}
	}),
}, "local");

const actionFuncs = {
	"targetTest.click": (target) => {
		let rot = Entities.getEntityProperties(target, "localRotation").localRotation;
		rot = Quat.multiply(rot, Quat.fromPitchYawRollDegrees(15, 0, 0));
		Entities.editEntity(target, {localRotation: rot});
	},
};

Messages.messageReceived.connect((channel, msg, senderID, localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	if (!(data.funcName in actionFuncs)) { return; }

	actionFuncs[data.funcName](data.targetEntity);
});

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(dummyEntity);
});
