const ignoredProperties = [
	"queryAACube",
	"age", "created", "lastEdited", "lastEditedBy",
	"avatarEntity", "localEntity", "clientOnly",
	"faceCamera", "facingCamera", "isFacingAvatar",
];

function Exporter_KeyEvent(event) {
	if (!(event.text === "s" && event.isControl)) { return; }

	const file = Window.save("Export world JSON", "", "*.json");

	if (file) {
		if (!Clipboard.exportWorldEntities(file, ignoredProperties)) {
			Window.displayAnnouncement("You do not have the required permissions to save. You must have permissions to change locks, edit private userdata, and view asset URLs.");
		}
	}
}

Controller.keyPressEvent.connect(Exporter_KeyEvent);

Script.scriptEnding.connect(() => {
	Controller.keyPressEvent.disconnect(Exporter_KeyEvent);
});
