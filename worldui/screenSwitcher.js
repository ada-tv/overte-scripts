// WorldUI screenSwitcher.js
// Created by Ada <ada@thingvellir.net> 2026-06-04
// SPDX-License-Identifier: CC0-1.0
// Usage: Server script on Empty entity
(class {
	/** @type {boolean} */ setupValid = false;
	/** @type {object} */ userData;
	/** @type {Uuid} */ id;
	/** @type {Uuid} */ screen;
	/** @type {boolean} */ screenIsWeb = false;
	/** @type {Map<Uuid, object>} */ buttons;

	#showError(msg) {
		this.screenIsWeb = false;

		if (this.screen) {
			Entities.deleteEntity(this.screen);
		}

		const size = this.userData.screen.size ?? [2, 1];

		this.screen = Entities.addEntity({
			type: "Text",
			unlit: true,
			localPosition: this.userData.screen.position ?? [0, 0, -0.1],
			localDimensions: [...size, 0],
			lineHeight: 0.07,
			textAlpha: 0.999,
			textColor: [255, 144, 128],
			text: msg,
			font: "Courier",
			grab: { grabbable: false },
		});
	}

	#turnOffScreen() {
		this.screenIsWeb = false;

		if (this.screen) {
			Entities.deleteEntity(this.screen);
		}

		this.screen = Entities.addEntity({
			type: "Box",
			localPosition: this.userData.screen.position,
			localDimensions: [...this.userData.screen.size, 0],
			color: [0, 0, 0],
			grab: { grabbable: false },
		});
	}

	#setScreenURL(url) {
		if (this.screenIsWeb && this.screen) {
			Entities.editEntity(this.screen, { sourceUrl: url });
			return;
		}

		if (this.screen) { Entities.deleteEntity(this.screen); }

		this.screen = Entities.addEntity({
			type: "Web",
			parentID: this.id,
			localPosition: this.userData.screen.position ?? [0, 0, 0],
			localDimensions: [...this.userData.screen.size, 0],
			dpi: this.userData.screen?.dpi ?? 10,
			sourceUrl: url,
			maxFPS: 60,
		});

		this.screenIsWeb = true;
	}

	preload(id) {
		this.id = id;

		try {
			this.userData = Entities.getEntityProperties(this.id, "userData").userData;
		} catch (_e) {
			this.#showError("Error: No config userdata\n{\n  screen: {\n    size: [number, number],\n    position: [number, number, number]?,\n    dpi: number?\n  },\nbuttons: Array<{text: string, url: string}>\n}");
			return;
		}

		if (!this.userData.screen?.size) {
			this.#showError("Error: userData must have field 'screen.size: [number, number]'");
			return;
		}

		if (!this.userData.buttons || !(this.userData.buttons instanceof Array)) {
			this.#showError("Error: userData must have field 'buttons: Array<{text: string, url: string}>'");
			return;
		}

		this.userData.buttons.push({
			text: "Turn off",
			func: () => this.#turnOffScreen(),
		});

		const startPos = Vec3.add(
			this.userData.screen.position,
			[
				(this.userData.screen.size[0] / 2) + 0.2,
				+this.userData.screen.size[1] / 2,
				0,
			]
		);

		for (let i = 0; i < this.userData.buttons.length; i++) {
			const button = this.userData.buttons[i];

			const row = Math.floor(i / 6);
			const column = i % 6;

			const w = 0.35;
			const h = 0.1;
			const pad = 0.03;

			const entity = Entities.addEntity({
				type: "Empty",
				parentID: this.id,
				localPosition: [
					startPos.x + (column * (w + pad)),
					startPos.y + (row * (h + pad)),
					0.0,
				],
				ignorePickIntersection: true,
				grab: { grabbable: false },
				script: Script.resolvePath("./button.js"),
				userData: JSON.stringify({
					text: button.text,
					lineHeight: 0.05,
					textColor: [0.93, 0.93, 0.93, 1],
					backgroundColor: [0.25, 0.22, 0.28, 0.98],
					dimensions: [w, h, 0],
				}),
			});

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

		const button = this.buttons.get(msg.target_id);

		if (!button) { return; }

		if (button.func) {
			button.func();
		} else if (button.url) {
			this.#setScreenURL(button.url);
		}
	};
})

