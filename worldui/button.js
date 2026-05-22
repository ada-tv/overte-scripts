// WorldUI button.js
// Created by Ada <ada@thingvellir.net> 2026-05-22
// SPDX-License-Identifier: CC0-1.0
// Usage: Client script on Empty entity
(class {
	/** @type {Uuid} */ id;
	/** @type {string} */ name;
	/** @type {Uuid} */ control;
	/** @type {object} */ data = {};
	/** @type {number} */ animTime = 1.0;

	preload(id) {
		this.id = id;

		try {
			this.data = JSON.parse(Entities.getEntityProperties(this.id, "userData").userData);
		} catch (_e) {}

		if (typeof(this.data.name) === "string") {
			this.name = this.data.name;
		}

		this.control = Entities.addEntity({
			type: "Text",
			parentID: this.id,
			text: this.data.text ?? "Button",
			localDimensions: [0.5, 0.1, 0],
			localPosition: [0, 0, 0],
			backgroundAlpha: 1,
			backgroundColor: [238, 238, 238],
			textColor: "black",
			grab: { grabbable: false },
			lineHeight: 0.08,
			unlit: true,
			textEffect: "outline fill",
			textEffectColor: [238, 238, 238],
			textEffectThickness: 0.3,
			alignment: "center",
			verticalAlignment: "center",
			fadeInMode: "disabled",
			fadeOutMode: "disabled",
		}, "local");

		Messages.subscribe("WorldUI");
		Messages.messageReceived.connect(this.#messageCallback);
		Entities.mousePressOnEntity.connect(this.#pressCallback);
		Entities.mouseDoublePressOnEntity.connect(this.#pressCallback);
		Script.update.connect(this.#updateCallback);
	}

	unload() {
		Entities.deleteEntity(this.control);

		Script.update.disconnect(this.#updateCallback);
		Entities.mouseDoublePressOnEntity.disconnect(this.#pressCallback);
		Entities.mousePressOnEntity.disconnect(this.#pressCallback);
		Messages.messageReceived.disconnect(this.#messageCallback);
	}

	setProperties(props) {
		let diff = {};
		let dirty = false;

		if (Object.hasOwn(props, "text")) {
			diff.text = props.text;
			dirty = true;
		}

		if (Object.hasOwn(props, "lineHeight")) {
			diff.lineHeight = props.lineHeight;
			dirty = true;
		}

		if (dirty) {
			Entities.editEntity(this.control, diff);
		}
	}

	#updateCallback = (dt) => {
		if (this.animTime >= 1.0) { return; }

		this.animTime = Math.min(1.0, this.animTime + (dt * 4));

		const a = 1.0 - this.animTime;

		const idleBrightness = 234;
		const animBrightness = 160;
		const i = idleBrightness + a * (animBrightness - idleBrightness);

		Entities.editEntity(this.control, {
			backgroundColor: [i, i, i],
			textEffectColor: [i, i, i],
		});
	};

	#pressCallback = (id, event) => {
		if (id == this.control && event.isPrimaryButton) {
			Messages.sendMessage("WorldUI", JSON.stringify({
				target_id: this.id,
				target_name: this.name,
				click: {},
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

		if (Object.hasOwn(msg, "click")) {
			this.animTime = 0.0;
		}
	};
})
