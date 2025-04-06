// SPDX-License-Identifier: CC0-1.0

const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

let mirrorEntity;

function ToggleMirror() {
	if (mirrorEntity) {
		Entities.deleteEntity(mirrorEntity);
		mirrorEntity = undefined;
	} else {
		const scale = MyAvatar.getAvatarScale();
		let origin = Vec3.sum(
			MyAvatar.position,
			Vec3.multiplyQbyV(
				MyAvatar.orientation,
				[0, 0, -1.5 * scale]
			)
		);
		let angle = Quat.lookAtSimple(MyAvatar.position, origin);
		origin.y += 0.5 * scale;

		mirrorEntity = Entities.addEntity({
			type: "Box",
			dimensions: [3 * scale, 3 * scale, 0.01 * scale],
			position: origin,
			rotation: angle,
			mirrorMode: "mirror",
		}, "local");
	}
}

const actionSet = [
	{
		text: "Local Mirror",
		textColor: [192, 255, 255],
		localClickFunc: "localMirror.toggle",
	},
];
const actionFuncs = {
	"localMirror.toggle": () => ToggleMirror(),
};

ContextMenu.registerActionSet("localMirror", actionSet, "_ROOT");

Messages.messageReceived.connect((channel, msg, senderID, localOnly) => {
	if (channel !== ContextMenu.CLICK_FUNC_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);
	actionFuncs[data.funcName]();
});

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(mirrorEntity);
	ContextMenu.unregisterActionSet("localMirror");
});
