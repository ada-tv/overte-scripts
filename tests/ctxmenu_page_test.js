// SPDX-License-Identifier: CC0-1.0
const ContextMenu = Script.require(Script.resolvePath("contextMenuApi.js"));

const actionSet = [
	{text: "Action 1"},
	{text: "Action 2"},
	{text: "Action 3"},
	{text: "Action 4"},
	{text: "Action 5"},
	{text: "Action 6"},
	{text: "Action 7"},
	{text: "Action 8"},
	{text: "Action 9"},
	{text: "Action 10"},
];

ContextMenu.registerActionSet("pageTest", actionSet);

Script.scriptEnding.connect(() => {
	ContextMenu.unregisterActionSet("pageTest");
});
