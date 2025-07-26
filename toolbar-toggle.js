const toolbar = Toolbars.getToolbar("com.highfidelity.interface.toolbar.system")
const tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

AvatarInputs.showAudioTools = false;
AvatarInputs.showBubbleTools = false;
if (Object.hasOwn(Menu, "visible")) { Menu.visible = false; }

let visible = false;
toolbar.writeProperty("visible", visible);

Controller.keyPressEvent.connect(event => {
	switch (event.key) {
		case 0x01000000: // escape
			tablet.gotoMenuScreen();
			break;

		case 0x01000001: // tab
			visible = !visible;
			toolbar.writeProperty("visible", visible);
			break;
	}
});

Script.scriptEnding.connect(() => {
	toolbar.writeProperty("visible", true);
});
