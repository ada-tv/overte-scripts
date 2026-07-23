// anchor.js - Ada <ada@thingvellir.net> 2026-06-05
// SPDX-License-Identifier: CC0-1.0
(class {
	mousePressOnEntity(id, e) {
		if (e.isPrimaryButton) {
			const url = Entities.getEntityProperties(id, "userData").userData;

			if (url) {
				Window.openWebBrowser(url);
			}
		}
	}
})
