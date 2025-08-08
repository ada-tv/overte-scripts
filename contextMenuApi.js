// SPDX-License-Identifier: CC0-1.0
"use strict";

// start the context menu if it's not installed yet,
// makes life a little easier for new users
{
	let hasContextMenu = false;
	const runningScripts = ScriptDiscoveryService.getRunning();

	for (const script of runningScripts) {
		if (script.name === "contextMenu.js") { hasContextMenu = true; break; }
	}

	if (!hasContextMenu) {
		ScriptDiscoveryService.loadScript(Script.resolvePath("contextMenu.js"));
		Window.displayAnnouncement("Press B on desktop or the A/X button in VR to open the context menu. Hold down the left mouse button or the trigger to open the context menu on a targeted object.");
	}
}

const CLICK_FUNC_CHANNEL = "net.thingvellir.context-menu.click";
const ACTIONS_CHANNEL = "net.thingvellir.context-menu.actions";
const MAIN_CHANNEL = "net.thingvellir.context-menu";

let registeredActionSets = {};
let registeredActionSetParents = {};
let registeredActionSetTitles = {};

function ContextMenu_registerActionSet(name, itemData, parent, title, desc) {
	registeredActionSets[name] = itemData;
	registeredActionSetParents[name] = parent;
	registeredActionSetTitles[name] = { title: title, description: desc };

	Messages.sendLocalMessage(ACTIONS_CHANNEL, JSON.stringify({
		func: "register",
		name: name,
		parent: parent,
		actionSet: itemData,
		title: title,
		description: desc,
	}));
}

function ContextMenu_unregisterActionSet(name) {
	delete registeredActionSets[name];
	delete registeredActionSetParents[name];
	Messages.sendLocalMessage(ACTIONS_CHANNEL, JSON.stringify({func: "unregister", name: name}));
}

function ContextMenu_messageReceived(channel, msg, senderID, _localOnly) {
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
				title: registeredActionSetTitles[name].title,
				description: registeredActionSetTitles[name].description,
			}));
		}
	}
}

function ContextMenu_editActionSet(name, itemData) {
	if (!(name in registeredActionSets)) {
		console.error(`ContextMenu_editActionSet: Attempted to edit unregistered action set "${name}"`);
		return;
	}

	Messages.sendLocalMessage(ACTIONS_CHANNEL, JSON.stringify({
		func: "edit",
		name: name,
		actionSet: itemData,
	}));
}

Messages.messageReceived.connect(ContextMenu_messageReceived);

Script.scriptEnding.connect(() => {
	Messages.messageReceived.disconnect(ContextMenu_messageReceived);
});

/**
 * @module ContextMenu
 */
module.exports = {
	CLICK_FUNC_CHANNEL: CLICK_FUNC_CHANNEL,
	ACTIONS_CHANNEL: ACTIONS_CHANNEL,
	MAIN_CHANNEL: MAIN_CHANNEL,

	/**
	 * The top-level set first opened if not overridden by the target.
	 */
	ROOT_SET: "_ROOT",

	/**
	 * The "My Avatar" submenu in the context menu root.
	 */
	SELF_SET: "_SELF",

	/**
	 * The "Object" submenu in the context menu root when an object is targeted.
	 */
	OBJECT_SET: "_OBJECT",

	/**
	 * The "Avatar" submenu in the context menu root when an avatar is targeted.
	 */
	AVATAR_SET: "_AVATAR",

	/**
	 * Registers a new action set for the context menu.
	 * @param {string} name - The name of the action set
	 * @param {(Object|Object[])} actions - The action information
	 * @param {string} [parent] - The parent of the action set. If no parent is set, the action set will only be accessible through another action's "submenu" property. See @link{ROOT_SET}, @link{SELF_SET}, @link{OBJECT_SET}, and @link{AVATAR_SET}.
	 * @param {string} [title] - The name of this action set, if used as a submenu.
	 * @param {string} [desc] - The description of this action set, if used as a submenu.
	 */
	registerActionSet: ContextMenu_registerActionSet,

	/**
	 * Unregisters an action set from the context menu.
	 * @param {string} name - The name of the action set to unregister
	 */
	unregisterActionSet: ContextMenu_unregisterActionSet,

	/**
	 * Edits a previously registered context menu action set. An action set can only be edited by the script that registered it.
	 * @param {string} name - The name of the action set
	 * @param {(Object|Object[])} actions - The action information, present object keys or array indices will replace the registered ones
	 */
	editActionSet: ContextMenu_editActionSet,
};
