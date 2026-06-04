// WorldUI checkbox.js
// Created by Ada <ada@thingvellir.net> 2026-05-22
// SPDX-License-Identifier: CC0-1.0
// Usage: Client script on Empty entity
(class {
	/** @type {Uuid} */ id;
	/** @type {string} */ name;
	/** @type {Uuid} */ control;
	/** @type {Uuid} */ check;
	/** @type {Uuid} */ text;
	/** @type {object} */ data = {};
	/** @type {boolean} */ checked = false;
	/** @type {number} */ animTime = 1.0;

	preload(id) {
		this.id = id;

		try {
			this.data = JSON.parse(Entities.getEntityProperties(this.id, "userData").userData);
		} catch (_e) {}

		if (typeof(this.data.checked) === "boolean") {
			this.checked = this.data.checked;
		}

		if (typeof(this.data.name) === "string") {
			this.name = this.data.name;
		}

		this.control = Entities.addEntity({
			type: "Box",
			parentID: this.id,
			localDimensions: [0.1, 0.1, -0.01],
			localPosition: [0.0, 0.0, 0.005],
			grab: { grabbable: false },
			unlit: this.data.unlit ?? true,
			color: "#eeeeee",
			fadeInMode: "disabled",
			fadeOutMode: "disabled",
		}, "local");

		this.check = Entities.addEntity({
			type: "PolyLine",
			visible: this.checked,
			parentID: this.id,
			localDimensions: [0.1, 0.1, 0.1],
			localPosition: [0, 0, 0.01],
			color: [0, 0, 0],
			strokeWidths: Array(4).fill(0.01),
			normals: Array(4).fill([0, 0, 1]),
			linePoints: [
				[-0.03, -0.01, 0],
				[-0.011, -0.03, 0],
				[-0.009, -0.03, 0],
				[0.03, 0.03, 0],
			],
			grab: { grabbable: false },
			ignorePickIntersection: true,
			fadeInMode: "disabled",
			fadeOutMode: "disabled",
		}, "local");

		if (typeof(this.data.text) === "string") {
			this.text = Entities.addEntity({
				type: "Text",
				parentID: this.id,
				text: this.data.text ?? "Checkbox",
				localDimensions: [0.5, 0.1, 0],
				localPosition: [0.3, 0, 0],
				backgroundAlpha: 0,
				grab: { grabbable: false },
				lineHeight: 0.08,
				unlit: this.data.unlit ?? true,
				leftMargin: 0.025,
				textEffect: "outline fill",
				textEffectColor: [0, 0, 0],
				textEffectThickness: 0.4,
				alignment: "left",
				verticalAlignment: "center",
				fadeInMode: "disabled",
				fadeOutMode: "disabled",
			}, "local");
		}

		Messages.subscribe("WorldUI");
		Messages.messageReceived.connect(this.#messageCallback);
		Entities.mousePressOnEntity.connect(this.#pressCallback);
		Entities.mouseDoublePressOnEntity.connect(this.#pressCallback);
		Script.update.connect(this.#updateCallback);
	}

	setProperties(props) {
		if (Object.hasOwn(props, "checked")) {
			this.animTime = 0.0;
			this.checked = props.checked;
			Entities.editEntity(this.check, { visible: this.checked });
		}

		if (Object.hasOwn(props, "text")) {
			Entities.editEntity(this.text, { text: props.text });
		}
	}

	unload() {
		Entities.deleteEntity(this.control);
		Entities.deleteEntity(this.check);
		Entities.deleteEntity(this.text);

		Script.update.disconnect(this.#updateCallback);
		Entities.mouseDoublePressOnEntity.disconnect(this.#pressCallback);
		Entities.mousePressOnEntity.disconnect(this.#pressCallback);
		Messages.messageReceived.disconnect(this.#messageCallback);
	}

	#updateCallback = (dt) => {
		if (this.animTime >= 1.0) { return; }

		this.animTime = Math.min(1.0, this.animTime + (dt * 4));

		const a = 1.0 - this.animTime;

		const idleBrightness = 234;
		const animBrightness = 160;
		const i = idleBrightness + a * (animBrightness - idleBrightness);

		Entities.editEntity(this.control, { color: [i, i, i] });
	};

	#pressCallback = (id, event) => {
		if ((id == this.control || id == this.text) && event.isPrimaryButton) {
			Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.id,
				target_name: this.name,
				set_properties: { checked: !this.checked },
			}));
		}
	};

	#messageCallback = (channel, rawMsg, _sender, _local) => {
		if (channel !== "WorldUI") { return; }

		let msg;
		try {
			msg = JSON.parse(rawMsg);
		} catch (_e) {
			return;
		}

		if (msg.target_id !== this.id) { return; }

		if (Object.hasOwn(msg, "set_properties")) {
			this.setProperties(msg.set_properties);
		}
	};
})
