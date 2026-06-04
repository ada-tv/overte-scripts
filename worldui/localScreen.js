// WorldUI localScreen.js
// Created by Ada <ada@thingvellir.net> 2026-06-04
// SPDX-License-Identifier: CC0-1.0
// Usage: Client script on Empty entity
(class {
	/** @type {Uuid} */ id;
	/** @type {Uuid} */ screen;
	/** @type {Uuid} */ checkbox;
	/** @type {Uuid} */ copyButton;
	/** @type {object} */ userData;
	/** @type {Array<number>} */ size = [2, 1];
	/** @type {string?} */ url = "";
	/** @type {number} */ dpi = 10;
	/** @type {boolean} */ screenIsWeb = false;

	#spawnPlaceholder() {
		this.screenIsWeb = false;

		Entities.deleteEntity(this.screen);

		this.screen = Entities.addEntity({
			type: "Text",
			parentID: this.id,
			text: this.url ? `${this.url}\n\nCheck "show screen" in the top-right` : "No content",
			localDimensions: [...this.size, 0],
			unlit: true,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textColor: "#aaaaaa",
			grab: { grabbable: false },
			alignment: "center",
			verticalAlignment: "center",
		}, "local");
	}

	#spawnScreen() {
		Entities.deleteEntity(this.screen);

		this.screen = Entities.addEntity({
			type: "Web",
			parentID: this.id,
			sourceUrl: this.url,
			dpi: this.dpi,
			localDimensions: [...this.size, 0],
			grab: { grabbable: false },
		}, "local");

		this.screenIsWeb = true;
	}

	preload(id) {
		this.id = id;

		this.userData = JSON.parse(Entities.getEntityProperties(this.id, "userData").userData);

		if (this.userData.dpi) { this.dpi = this.userData.dpi; }
		if (this.userData.url) { this.url = this.userData.url; }
		if (this.userData.size) { this.size = this.userData.size; }

		this.checkbox = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [
				(this.size[0] / 2) + 0.25,
				(this.size[1] / 2) - 0.05,
				0,
			],
			userData: JSON.stringify({
				text: "Show screen (local)",
				localOnly: true,
				lineHeight: 0.08,
				width: 1,
			}),
			grab: { grabbable: false },
			ignorePickIntersection: true,
			script: Script.resolvePath("./checkbox.js"),
		}, "local");

		this.copyButton = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [
				(this.size[0] / 2) + 0.25,
				(this.size[1] / 2) - 0.16,
				0,
			],
			userData: JSON.stringify({
				text: "Copy URL",
				localOnly: true,
				lineHeight: 0.05,
				backgroundColor: [0.25, 0.22, 0.28],
				textColor: [0.93, 0.93, 0.93],
			}),
			grab: { grabbable: false },
			ignorePickIntersection: true,
			script: Script.resolvePath("./button.js"),
		}, "local");

		this.#spawnPlaceholder();

		Messages.subscribe("WorldUI");
		Messages.messageReceived.connect(this.#messageCallback);
	}

	unload() {
		Entities.deleteEntity(this.checkbox);
		Entities.deleteEntity(this.copyButton);
		Messages.messageReceived.disconnect(this.#messageCallback);
	}

	#messageCallback = (channel, rawMsg, _sender, _local) => {
		if (channel !== "WorldUI") { return; }

		let msg;
		try {
			msg = JSON.parse(rawMsg);
		} catch (_e) {
			return;
		}

		if (msg.target_id === this.copyButton && msg.click) {
			Window.copyToClipboard(this.url);
		} else if (msg.target_id === this.checkbox && this.url) {
			if (msg.set_properties.checked) {
				this.#spawnScreen();
			} else {
				this.#spawnPlaceholder();
			}
		} else if (msg.target_id == this.id) {
			const props = msg.set_properties;

			if (Object.hasOwn(props, "url")) {
				this.url = msg.set_properties.url;

				if (!this.url) {
					this.#spawnPlaceholder();
				} else if (this.screenIsWeb) {
					Entities.editEntity(this.screen, { sourceUrl: this.url });
				} else {
					Entities.editEntity(this.screen, { text: this.url });
				}
			}

			if (Object.hasOwn(props, "size")) {
				this.size = props.size;
				Entities.editEntity(this.screen, { localDimensions: [...this.size, 0] });
			}
		}
	};
})
