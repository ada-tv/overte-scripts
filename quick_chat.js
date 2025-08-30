"use strict";
const VersionFeatures = Script.require(Script.resolvePath("versionFeatures.js"));
const ContextMenu = Script.require(
	VersionFeatures.contextMenu ?
		"contextMenu" :
		Script.resolvePath("contextMenuApi.js")
);

const defaultProperties = {
	type: "Web",
	dimensions: [1.2, 0.1, 0],
	sourceUrl: Script.resolvePath("QuickChat.qml"),
	renderLayer: "front",
	alpha: 0.95,
	dpi: 10,
	maxFPS: 20,
	showKeyboardFocusHighlight: false,
	grab: {grabbable: false},
};

let guiEntity, guiEntityObject;
let wasTyping = false;

function webEventHandler(msg_raw) {
	const data = JSON.parse(msg_raw);

	switch (data.action) {
		case "start_typing":
			if (!wasTyping) {
				wasTyping = true;
				Messages.sendMessage("Chat-Typing", JSON.stringify({
					action: "typing_start",
					position: MyAvatar.position,
				}));
			}
			break;

		case "stop_typing":
			if (wasTyping) {
				wasTyping = false;
				Messages.sendMessage("Chat-Typing", JSON.stringify({ action: "typing_stop" }));
			}
			break;

		case "close":
			Messages.sendMessage("Chat-Typing", JSON.stringify({ action: "typing_stop" }));
			Entities.deleteEntity(guiEntity);
			Entities.keyboardFocusEntity = null;
			guiEntity = undefined;
			guiEntityObject = undefined;
			Keyboard.raised = false;
			break;

		case "send":
			Messages.sendMessage("chat", JSON.stringify({
				message: data.text,
				position: MyAvatar.position,
				displayName: MyAvatar.sessionDisplayName,
				channel: "local",
				action: "send_chat_message",
			}));
			Messages.sendMessage("Chat-Typing", JSON.stringify({ action: "typing_stop" }));
			Entities.deleteEntity(guiEntity);
			Entities.keyboardFocusEntity = null;
			guiEntity = undefined;
			guiEntityObject = undefined;
			Keyboard.raised = false;
			break;
	}
}

function spawnQuickChat() {
	const pos = Vec3.sum(Camera.position, Vec3.multiplyQbyV(Camera.orientation, [0, -0.2, -1]));

	guiEntity = Entities.addEntity({
		position: pos,
		rotation: Quat.cancelOutRollAndPitch(Camera.orientation),
		...defaultProperties,
	}, "local");

	Script.setTimeout(() => {
		guiEntityObject = Entities.getEntityObject(guiEntity)
		guiEntityObject.webEventReceived.connect(webEventHandler);
	}, 500);
}

Messages.messageReceived.connect((channel, msg, senderID, localOnly) => {
	if (
		channel === ContextMenu.CLICK_FUNC_CHANNEL &&
		senderID === MyAvatar.sessionUUID &&
		localOnly
	) {
		const data = JSON.parse(msg);
		if (data.func === "quickChat.toggle") {
			if (guiEntity) {
				webEventHandler(JSON.stringify({ action: "close" }));
			} else {
				spawnQuickChat();
			}
		}
	}
});

ContextMenu.registerActionSet("quickChat", [{
	text: "Quick Chat",
	textColor: "#dfa7f9",
	localClickFunc: "quickChat.toggle",
	priority: -1000,
}], ContextMenu.ROOT_SET);

Script.scriptEnding.connect(() => {
	Entities.deleteEntity(guiEntity);
	ContextMenu.unregisterActionSet("quickChat");
	Keyboard.raised = false;
});
