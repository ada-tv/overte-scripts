// WorldUI button.js
// Created by Ada <ada@thingvellir.net> 2026-05-22
// SPDX-License-Identifier: CC0-1.0
// Usage: Client script on Empty entity
(class {
	/**
	 * @typedef {object} UserData
	 * @property {string} [name]
	 * @property {string} text
	 * @property {boolean} [unlit=true]
	 * @property {number} [lineHeight=0.08]
	 * @property {Array<number>} [textColor=[0, 0, 0, 1]]
	 * @property {Array<number>} [backgroundColor=[0.93, 0.93, 0.93, 1]]
	 */
	/** @type {Uuid} */ id;
	/** @type {string} */ name;
	/** @type {Uuid} */ control;
	/** @type {UserData} */ data = {};
	/** @type {number} */ animTime = 1.0;
	/** @type {number} */ lineHeight = 0.08;
	/** @type {Array<number>} */ textColor = [0, 0, 0, 1];
	/** @type {Array<number>} */ backgroundColor = [0.93, 0.93, 0.93, 1];

	preload(id) {
		this.id = id;

		try {
			this.data = JSON.parse(Entities.getEntityProperties(this.id, "userData").userData);
		} catch (_e) {}

		if (typeof(this.data.name) === "string") {
			this.name = this.data.name;
		}

		if (typeof(this.data.lineHeight) === "number") {
			this.lineHeight = this.data.lineHeight;
		}

		if (this.data.textColor) {
			this.textColor = this.data.textColor;
			if (this.textColor.length < 4) { this.textColor.push(1); }
		}

		if (this.data.backgroundColor) {
			this.backgroundColor = this.data.backgroundColor;
			if (this.backgroundColor.length < 4) { this.backgroundColor.push(1); }
		}

		this.control = Entities.addEntity({
			type: "Text",
			parentID: this.id,
			text: this.data.text ?? "Button",
			localDimensions: this.data.dimensions ?? [0.5, 0.1, 0],
			localPosition: [0, 0, 0],
			backgroundAlpha: this.backgroundColor[3],
			backgroundColor: this.backgroundColor.slice(0, 3).map(c => c * 255),
			textAlpha: this.textColor[3],
			textColor: this.textColor.slice(0, 3).map(c => c * 255),
			grab: { grabbable: false },
			lineHeight: this.lineHeight,
			unlit: this.data.unlit ?? true,
			textEffect: this.textColor[3] < 1.0 ? undefined : "outline fill",
			textEffectColor: this.textColor[3] < 1.0 ? undefined : this.backgroundColor.slice(0, 3).map(c => c * 255),
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
			this.lineHeight = props.lineHeight;
			diff.lineHeight = props.lineHeight;
			dirty = true;
		}

		if (Object.hasOwn(props, "backgroundColor")) {
			this.backgroundColor = props.backgroundColor;
			diff.backgroundColor = props.backgroundColor.slice(0, 3).map(c => c * 255);
			diff.backgroundAlpha = (props.backgroundColor[3] ?? 1.0);
			diff.textEffectColor = diff.backgroundColor;
			dirty = true;
		}

		if (Object.hasOwn(props, "textColor")) {
			this.textColor = props.textColor;
			diff.textColor = props.textColor.slice(0, 3).map(c => c * 255);
			diff.textAlpha = (props.textColor[3] ?? 1.0);
			dirty = true;
		}

		if (dirty) {
			Entities.editEntity(this.control, diff);
		}
	}

	#updateCallback = (dt) => {
		if (this.animTime >= 1.0) {
			Script.update.disconnect(this.#updateCallback);
			return;
		}

		this.animTime = Math.min(1.0, this.animTime + (dt * 4));

		const t = this.animTime;

		const lerp = (a, b, t) => a + t * (b - a);
		const ftob = n => Math.floor(Math.min(1.0, Math.max(0.0, n)) * 255);

		const idleColor = this.backgroundColor;
		const animColor = this.backgroundColor.map(c => c * 0.5);
		const color = [
			ftob(lerp(animColor[0], idleColor[0], t)),
			ftob(lerp(animColor[1], idleColor[1], t)),
			ftob(lerp(animColor[2], idleColor[2], t)),
			ftob(lerp(animColor[3], idleColor[3], t)),
		];

		Entities.editEntity(this.control, {
			backgroundColor: color.slice(0, 3),
			backgroundAlpha: color[3],
			textEffectColor: color.slice(0, 3),
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
			Script.update.connect(this.#updateCallback);
		}
	};
})
