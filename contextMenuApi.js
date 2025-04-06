// SPDX-License-Identifier: CC0-1.0

const CLICK_FUNC_CHANNEL = "net.thingvellir.context-menu.click";
const ACTIONS_CHANNEL = "net.thingvellir.context-menu.actions";
const MAIN_CHANNEL = "net.thingvellir.context-menu";

let registeredActionSets = {};
let registeredActionSetParents = {};

function ContextMenu_registerActionSet(name, itemData, parent = "") {
	registeredActionSets[name] = itemData;
	registeredActionSetParents[name] = parent;

	Messages.sendLocalMessage(ACTIONS_CHANNEL, JSON.stringify({
		func: "register",
		name: name,
		parent: parent ? parent : undefined,
		actionSet: itemData,
	}));
}

function ContextMenu_unregisterActionSet(name) {
	delete registeredActionSets[name];
	delete registeredActionSetParents[name];
	Messages.sendLocalMessage(ACTIONS_CHANNEL, JSON.stringify({func: "unregister", name: name}));
}

function ContextMenu_messageReceived(channel, msg, senderID, localOnly) {
	if (channel !== MAIN_CHANNEL) { return; }
	if (senderID !== MyAvatar.sessionUUID) { return; }

	const data = JSON.parse(msg);

	// re-register anything the context menu might have missed
	if (data.func === "startup") {
		for (const [name, set] of Object.entries(registeredActionSets)) {
			Messages.sendLocalMessage(ACTIONS_CHANNEL, JSON.stringify({
				func: "register",
				name: name,
				parent: registeredActionSetParents[name],
				actionSet: set,
			}));
		}
	}
}

Messages.messageReceived.connect(ContextMenu_messageReceived);

Script.scriptEnding.connect(() => {
	Messages.messageReceived.disconnect(ContextMenu_messageReceived);
});

module.exports = {
	CLICK_FUNC_CHANNEL: CLICK_FUNC_CHANNEL,
	ACTIONS_CHANNEL: ACTIONS_CHANNEL,
	MAIN_CHANNEL: MAIN_CHANNEL,
	
	registerActionSet: ContextMenu_registerActionSet,
	unregisterActionSet: ContextMenu_unregisterActionSet,
};
