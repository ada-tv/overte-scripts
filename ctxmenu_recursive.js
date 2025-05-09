// SPDX-License-Identifier: CC0-1.0
const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

ContextMenu.registerActionSet("top",    [{text: "Go Deeper", textColor: [255, 0, 0], submenu: "bottom"}]);
ContextMenu.registerActionSet("bottom", [{text: "Too deep!", textColor: [255, 64, 0]}], "top");

Script.scriptEnding.connect(() => {
	ContextMenu.unregisterActionSet("top");
	ContextMenu.unregisterActionSet("bottom");
});
