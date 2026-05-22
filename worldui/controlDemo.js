// WorldUI controlDemo.js
// Created by Ada <ada@thingvellir.net> 2026-05-22
// SPDX-License-Identifier: CC0-1.0
// Usage: Server script on Empty entity
(class {
	/** @type {Uuid} */ id;
	/** @type {Uuid} */ button;
	/** @type {Uuid} */ checkbox;
	/** @type {number} */ clickCounter = 0;

	preload(id) {
		this.id = id;

		this.button = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [0.0, 0.06, 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./button.js"),
		}, "local");

		this.checkbox = Entities.addEntity({
			type: "Empty",
			parentID: this.id,
			localPosition: [-0.2, -0.06, 0.0],
			ignorePickIntersection: true,
			grab: { grabbable: false },
			script: Script.resolvePath("./checkbox.js"),
			userData: JSON.stringify({ checked: false, text: "Checkbox" }),
		}, "local");

		Messages.subscribe("WorldUI");
		Messages.messageReceived.connect(this.#messageCallback);
	}

	unload() {
		Entities.deleteEntity(this.button);
		Entities.deleteEntity(this.checkbox);

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

		if (msg.target_id === this.button && msg.click) {
			this.clickCounter += 1;

			Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.button,
				set_properties: {
					text: `Clicked ${this.clickCounter} times`,
					lineHeight: 0.06,
				},
			}));
		}

		if (
			msg.target_id === this.checkbox &&
			msg.set_properties?.checked !== undefined
		) {
			Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.checkbox,
				set_properties: { text: msg.set_properties.checked ? "Checked" : "Unchecked" },
			}));
		}
	};
})

