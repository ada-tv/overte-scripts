// WorldUI screenSwitcher.js
// Created by Ada <ada@thingvellir.net> 2026-06-04
// SPDX-License-Identifier: CC0-1.0
// Usage: Server script on Empty entity
(class {
	/** @type {boolean} */ setupValid = false;
	/** @type {object} */ userData = {};
	/** @type {Uuid} */ id;
	/** @type {Uuid} */ screen;
	/** @type {Map<Uuid, object>} */ buttons = new Map();
	/** @type {Uuid?} */ prevClickedButton = null;

	BUTTON_INACTIVE_COLOR = [0.25, 0.22, 0.28];
	BUTTON_ACTIVE_COLOR = [0.25, 0.55, 0.24];

	#spawnScreen(url) {
		const size = this.userData.screen?.size ?? [2, 1];
		const pos = this.userData.screen?.position ?? [0, 0, 0];

		this.screen = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			grab: { grabbable: false },
			ignorePickIntersection: true,
			localPosition: pos,
			script: Script.resolvePath("./localScreen.js"),
			userData: JSON.stringify({
				size: size,
				url,
				dpi: this.userData.screen?.dpi,
			}),
		});
	}

	#showError(msg) {
		if (this.screen) {
			Entities.deleteEntity(this.screen);
		}

		const size = this.userData.screen?.size ?? [2, 1];

		this.screen = Entities.addEntity({
			type: "Text",
			parentID: this.id,
			unlit: true,
			localPosition: this.userData.screen?.position ?? [0, 0, 0.1],
			localDimensions: [...size, 0],
			lineHeight: 0.07,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textColor: [255, 144, 128],
			text: msg,
			font: "Courier",
			grab: { grabbable: false },
			collisionless: true,
		});
	}

	#turnOffScreen() {
		if (!this.screen) {
			this.#spawnScreen(null);
			return;
		}

		Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.screen,
				set_properties: { url: null },
		}));

		Entities.editEntity(this.screen, {
			userData: JSON.stringify({
				size: this.userData.screen?.size,
				url: null,
				dpi: this.userData.screen?.dpi,
			}),
		});
	}

	#setScreenURL(url) {
		if (!this.screen) {
			this.#spawnScreen(url);
			return;
		}

		Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.screen,
				set_properties: { url },
		}));

		Entities.editEntity(this.screen, {
			userData: JSON.stringify({
				size: this.userData.screen?.size,
				url: url,
				dpi: this.userData.screen?.dpi,
			}),
		});
	}

	preload(id) {
		this.id = id;

		try {
			this.userData = JSON.parse(Entities.getEntityProperties(this.id, "userData").userData);
		} catch (_e) {
			this.#showError("Error: No config userdata\n{\n  screen: {\n    size: [number, number],\n    position: [number, number, number]?,\n    dpi: number?\n  },\n  buttons: Array<{text: string, url: string}>\n}");
			return;
		}

		console.log(this.userData);

		if (this.userData.screen?.size?.length !== 2) {
			this.#showError("Error: userData must have field 'screen.size: [number, number]'");
			return;
		}

		if (!this.userData.buttons || !(this.userData.buttons instanceof Array)) {
			this.#showError("Error: userData must have field 'buttons: Array<{text: string, url: string}>'");
			return;
		}

		this.userData.buttons.unshift({
			text: "Turn off",
			func: () => this.#turnOffScreen(),
		});

		const w = 0.35;
		const h = 0.1;
		const pad = 0.01;

		const startPos = Vec3.sum(
			this.userData.screen.position ?? [0, 0, 0],
			[
				(this.userData.screen.size[0] / 2) + (w / 2) + 0.2,
				-(h / 2),
				0,
			]
		);

		for (let i = 0; i < this.userData.buttons.length; i++) {
			const button = this.userData.buttons[i];

			const column = Math.floor(i / 6);
			const row = i % 6;

			const entity = Entities.addEntity({
				type: "Empty",
				parentID: this.id,
				localPosition: [
					startPos.x + (column * (w + pad)),
					startPos.y - (row * (h + pad)),
					0.0,
				],
				ignorePickIntersection: true,
				grab: { grabbable: false },
				script: Script.resolvePath("./button.js"),
				userData: JSON.stringify({
					text: button.text,
					lineHeight: 0.05,
					textColor: [0.93, 0.93, 0.93],
					backgroundColor: i == 0 ? this.BUTTON_ACTIVE_COLOR : this.BUTTON_INACTIVE_COLOR,
					dimensions: [w, h, 0],
				}),
			});

			if (i == 0) { this.prevClickedButton = entity; }

			this.buttons.set(entity, button);
		}

		Messages.subscribe("WorldUI");
		Messages.messageReceived.connect(this.#messageCallback);

		this.#turnOffScreen();
		this.setupValid = true;
	}

	unload() {
		Entities.deleteEntity(this.screen);

		for (const button of this.buttons.keys()) {
			Entities.deleteEntity(button);
		}

		Messages.messageReceived.disconnect(this.#messageCallback);
	}

	#messageCallback = (channel, rawMsg, _sender, _local) => {
		if (channel !== "WorldUI") { return; }
		if (!this.setupValid) { return; }

		let msg;
		try {
			msg = JSON.parse(rawMsg);
		} catch (_e) {
			return;
		}

		if (!msg.click) { return; }

		const button = this.buttons.get(msg.target_id);

		if (!button) { return; }

		if (button.func) {
			button.func();
		} else if (button.url) {
			this.#setScreenURL(button.url);
		}

		Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.prevClickedButton,
				set_properties: {
					backgroundColor: this.BUTTON_INACTIVE_COLOR,
				},
		}));

		Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: msg.target_id,
				set_properties: {
					backgroundColor: this.BUTTON_ACTIVE_COLOR,
				},
		}));

		this.prevClickedButton = msg.target_id;
	};
})
