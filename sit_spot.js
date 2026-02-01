// SPDX-License-Identifier: CC0-1.0
(function() {
	"use strict";
	const MSG_CHANNEL = "net.thingvellir.sit_spot";
	const EDIT_SETTING = "io.highfidelity.isEditing"; // true if the create app is open

	const actionTranslateY = Controller.findAction("TranslateY");
	let previousAvatarXform = [Vec3.ZERO, Quat.IDENTITY];
	let isSitting = false;
	let disabled = false;
	let visualID;
	let selfID;

	try {
		this.actionEvent = function(actionID, value) {
			if (disabled || !isSitting || actionID != actionTranslateY) { return; }

			if (value > 0.5) {
				MyAvatar.endSit(...previousAvatarXform);
				Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({ seatID: selfID, sitting: false }));
				Entities.editEntity(visualID, { visible: true });
				isSitting = false;
			}
		}

		this.preload = function(_selfID) {
			selfID = _selfID;

			Controller.actionEvent.connect(this.actionEvent);

			const { localDimensions } = Entities.getEntityProperties(selfID, "localDimensions");

			visualID = Entities.addEntity({
				type: "Text",
				parentID: selfID,
				localRotation: Quat.fromPitchYawRollDegrees(-90, 180, 0),
				localDimensions: [localDimensions.x, localDimensions.z, 0.1],
				text: "Sit",
				unlit: true,
				backgroundAlpha: 0.7,
				textEffect: "outline fill",
				textEffectColor: [0, 0, 0],
				textEffectThickness: 0.4,
				alignment: "center",
				verticalAlignment: "center",
				ignorePickIntersection: true,
				lineHeight: 0.1 * (localDimensions.z / 0.3),
			}, "local");
		};

		this.mousePressOnEntity = function(entityID, event) {
			if (
				disabled ||
				entityID !== selfID ||
				isSitting ||
				!event.isPrimaryButton ||
				Settings.getValue(EDIT_SETTING)
			) { return; }

			const { position, rotation } = Entities.getEntityProperties(selfID, ["position", "rotation"]);
			previousAvatarXform = [ MyAvatar.position, MyAvatar.orientation ];

			// TODO: is scale or sensorToWorldScale more appropriate here?
			const scale = MyAvatar.scale;
			MyAvatar.beginSit(Vec3.sum(position, Vec3.multiplyQbyV(rotation, [0, 0.1 * scale, 0])), rotation);
			Messages.sendLocalMessage(MSG_CHANNEL, JSON.stringify({ seatID: selfID, sitting: true }));
			Entities.editEntity(visualID, { visible: false });
			isSitting = true;
		};

		this.messageRecv = function(channel, message, senderID, localOnly) {
			if (channel !== MSG_CHANNEL || !localOnly || senderID != MyAvatar.sessionUUID) { return; }

			try {
				let data = JSON.parse(message);

				if (data.seatID == selfID) { return; }

				if (data.sitting !== undefined) {
					disabled = !!data.sitting;
				}
			} catch(e) {
				console.error(e);
			}
		};

		this.unload = function(_selfID) {
			Messages.messageReceived.disconnect(this.messageRecv);
			Controller.actionEvent.disconnect(this.actionEvent);
			Entities.deleteEntity(visualID);
			if (isSitting) {
				MyAvatar.endSit(MyAvatar.position, MyAvatar.orientation);
			}
		};

		Messages.messageReceived.connect(() => this.messageRecv());
		Window.domainChanged.connect(() => this.unload());
	} catch(e) {
		// put a tag on the message, the game just reports about:Entity
		console.error(`[sit_spot.js] ${e}`);
		this.unload();
	}
})
