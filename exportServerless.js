function Exporter_KeyEvent(event) {
	if (!(event.text === "s" && event.isControl)) { return; }

	const file = Window.save("Export world JSON", "", "*.json");

	if (file) {
		Clipboard.exportEntities(file, 0, 0, 0, 3e38, {
			domainOnly: true,
			globalPositions: true,
			paths: {
				"/": {position: MyAvatar.position, orientation: MyAvatar.orientation}
			}
		});
	}
}

Controller.keyPressEvent.connect(Exporter_KeyEvent);

Script.scriptEnding.connect(() => {
	Controller.keyPressEvent.disconnect(Exporter_KeyEvent);
});
