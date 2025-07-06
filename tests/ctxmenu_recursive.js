// SPDX-License-Identifier: CC0-1.0
const ContextMenu = Script.require(Script.resolvePath("../contextMenuApi.js"));

ContextMenu.registerActionSet("top", [{
	text: "Go Deep",
	textColor: [255, 64, 64],
	submenu: "lower0"
}], ContextMenu.ROOT_SET);

for (let i = 0; i < 8; i++) {
	ContextMenu.registerActionSet(`lower${i}`, [{
		text: `Go Deeper (${i})`,
		textColor: [255, 0, 0],
		submenu: `lower${i+1}`,
	}]);
}

ContextMenu.registerActionSet("lower8", [{
	text: "& ash clown",
	textColor: [255, 128, 0]
}]);

Script.scriptEnding.connect(() => {
	ContextMenu.unregisterActionSet("top");
	for (let i = 0; i < 8; i++) {
		ContextMenu.unregisterActionSet(`lower${i}`);
	}
	ContextMenu.unregisterActionSet("lower8");
});
