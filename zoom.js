// SPDX-License-Identifier: CC0-1.0
// unfortunately the default FOV has to be hardcoded,
// calling Render.setVerticalFieldOfView clobbers the setting :(
const DEFAULT_FOV = 75; // Math.ceil(Settings.getValue("fieldOfView", 75));
const ZOOMING_FOV = 30;
const ZOOM_SPEED = 8;

let zoomToggled = false;
let zoomTime = 1;

Render.setVerticalFieldOfView(DEFAULT_FOV);

const lerp = (a, b, d) => (1 - d) * a + d * b;

Script.update.connect(delta => {
	if (zoomTime <= 1 / ZOOM_SPEED) {
		zoomTime += delta;

		const t = Math.min(1, zoomTime * ZOOM_SPEED);
		const from = zoomToggled ? DEFAULT_FOV : ZOOMING_FOV;
		const to = zoomToggled ? ZOOMING_FOV : DEFAULT_FOV;
		const fov = lerp(from, to, t);

		Render.setVerticalFieldOfView(fov);
	}
});

Controller.keyPressEvent.connect(e => {
	if (e.text !== "z" || e.isAutoRepeat) { return; }
	zoomTime = 0;
	zoomToggled = !zoomToggled;
});
