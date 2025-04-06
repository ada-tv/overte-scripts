// SPDX-License-Identifier: CC0-1.0
(function() {
	let placeholderChild;
	let webChild;
	let self;
	let userData;
	let clickActivated = false;
	let keepAlive = false;

	this.onClick = (eid, event) => {
		if (webChild) { return; }
		if (eid === placeholderChild && event.isLeftButton) {
			Entities.editEntity(placeholderChild, {visible: false, ignorePickIntersection: true});

			userData.tmpEntity.parentID = self;
			webChild = Entities.addEntity(userData.tmpEntity, "local");
		};
	};

	this.preload = selfID => {
		self = selfID;

		userData = JSON.parse(Entities.getEntityProperties(self, "userData").userData);

		clickActivated = userData.clickActivated ?? false;
		keepAlive = userData.keepAlive ?? false;

		let placeholderText;
		if (userData.description) {
			placeholderText = [userData.description];
		} else {
			placeholderText = [userData.tmpEntity.type];
			if (userData.tmpEntity.type === "Web") {
				placeholderText.push(...["\n", userData.tmpEntity.sourceUrl]);
			}
		}
		placeholderText.push(...["\n\n", (clickActivated ? "Click to activate" : "Approach to activate")]);

		let placeholderStuff = userData.placeholder ?? userData.tmpEntity;

		placeholderChild = Entities.addEntity({
			type: "Text",
			parentID: selfID,
			localPosition: placeholderStuff.localPosition,
			localRotation: placeholderStuff.localPosition,
			position: placeholderStuff.position,
			rotation: placeholderStuff.rotation ? Quat.multiply(Quat.multiply(placeholderStuff.rotation, Quat.fromPitchYawRollDegrees(0, 180, 0)), Quat.fromPitchYawRollDegrees(0, 180, 0)) : undefined,
			dimensions: placeholderStuff.dimensions,
			text: placeholderText.join(""),
			unlit: true,
			backgroundAlpha: 0.9,
			alignment: "center",
			verticalAlignment: "center",
			lineHeight: 0.2,
		}, "local");

		if (clickActivated) {
			Entities.mousePressOnEntity.connect(this.onClick);
		}
	};

	this.unload = () => {
		if (clickActivated) {
			Entities.mousePressOnEntity.disconnect(this.onClick);
		}
		Entities.deleteEntity(placeholderChild);
		Entities.deleteEntity(webChild);
	};

	this.enterEntity = selfID => {
		if (clickActivated) { return; }

		Entities.editEntity(placeholderChild, {visible: false, ignorePickIntersection: true});

		userData.tmpEntity.parentID = selfID;
		webChild = Entities.addEntity(userData.tmpEntity, "local");
	};

	this.leaveEntity = selfID => {
		if (keepAlive) { return; }

		if (webChild) {
			Entities.deleteEntity(webChild);
			webChild = undefined;
		}

		if (placeholderChild) {
			Entities.editEntity(placeholderChild, {visible: true, ignorePickIntersection: false});
		}
	};
})
