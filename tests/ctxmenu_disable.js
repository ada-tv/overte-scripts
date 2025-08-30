const ContextMenu = Script.require("contextMenu");

Controller.keyPressEvent.connect(event => {
	if (event.text === "y" && !event.isAutoRepeat) {
		Window.displayAnnouncement("ContextMenu.disable");
		ContextMenu.disable();
	} else if (event.text === "h" && !event.isAutoRepeat) {
		Window.displayAnnouncement("ContextMenu.enable");
		ContextMenu.enable();
	}
});
