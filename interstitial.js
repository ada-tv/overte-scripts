const SOUND_CLICK = SoundCache.getSound(Script.resourcesPath() + "sounds/Button06.wav");
const SOUND_HOVER = SoundCache.getSound(Script.resourcesPath() + "sounds/Button04.wav");

const CAMERA_MATRIX_INDEX = 65529;
const SENSOR_TO_WORLD_MATRIX_INDEX = 65534;

let tickInterval;

let fadeOut = false;
let alpha = 1.0;

let hasDescription = false;
let descriptionAlpha = 1.0;

let bgEntity, bgMaterialEntity;
let newDomainNameEntity;
let newDomainDescEntity;
let newDomainThumbEntity;
let cancelButton, skipButton;

function bgMaterialData(alpha = 0) {
	return {
		materialVersion: 1,
		materials: {
			model: "hifi_pbr",
			unlit: true,
			albedo: [0, 0, 0],
			cullFaceMode: "CULL_FRONT",
			opacity: alpha,
		}
	};
}

function interstitialHoverStart(entityID, _event) {
	if (entityID === cancelButton) {
		Audio.playSystemSound(SOUND_HOVER);

		Entities.editEntity(cancelButton, {
			backgroundAlpha: 1,
			backgroundColor: [72, 32, 64],
			textColor: [255, 255, 255],
			text: "<<  Go back",
		});
	} else if (entityID === skipButton) {
		Audio.playSystemSound(SOUND_HOVER);

		Entities.editEntity(skipButton, {
			backgroundAlpha: 1,
			backgroundColor: [72, 32, 64],
			textColor: [255, 255, 255],
			text: "Skip  >>",
		});
	}
}

function interstitialHoverStop(entityID, _event) {
	if (entityID === cancelButton) {
		Entities.editEntity(cancelButton, {
			backgroundAlpha: 0,
			backgroundColor: [0, 0, 0],
			textColor: [240, 240, 240],
			text: "<<",
		});
	} else if (entityID === skipButton) {
		Entities.editEntity(skipButton, {
			backgroundAlpha: 0,
			backgroundColor: [0, 0, 0],
			textColor: [240, 240, 240],
			text: ">>",
		});
	}
}

function interstitialClick(entityID, event) {
	if (event.button !== "Primary") { return; }

	if (entityID === cancelButton) {
		location.goBack();
	} else if (entityID === skipButton) {
		fadeOut = true;
	}
}

function interstitialUpdate(delta) {
	if (fadeOut) {
		alpha = Math.max(0.0, alpha - delta);
		descriptionAlpha = Math.max(0.0, descriptionAlpha - delta);

		if (alpha === 0) {
			deleteInterstitial();
		}
	} else {
		alpha = Math.min(1.0, alpha + delta);

		if (hasDescription) {
			descriptionAlpha = Math.min(1.0, descriptionAlpha + delta * 2);
		}
	}

	if (Window.isPhysicsEnabled()) { fadeOut = true; }

	Entities.editEntity(bgMaterialEntity, {materialData: JSON.stringify(
		bgMaterialData(Math.max(0.0, (alpha - 0.6) * 2.5) * 0.8)
	)});
	Entities.editEntity(newDomainNameEntity, {textAlpha: Math.min(1.0, alpha * 1.3)});
	Entities.editEntity(newDomainDescEntity, {textAlpha: descriptionAlpha});
	Entities.editEntity(newDomainThumbEntity, {alpha: descriptionAlpha});
	Entities.editEntity(skipButton, {textAlpha: alpha});
	Entities.editEntity(cancelButton, {textAlpha: alpha});
}

function loadPlaceData(place_name) {
	const url = `${AccountServices.metaverseServerURL}/api/v1/places/${place_name}`;

	let req = new XMLHttpRequest();
	req.open("GET", url, true);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.timeout = 10 * 1000;
	req.ontimeout = () => "";
	req.onreadystatechange = () => {
		// XMLHttpRequest.DONE, for some reason the named constant doesnt work
		if (req.readyState !== 4) { return; }

		try {
			let place = JSON.parse(req.responseText).data.place;
			Entities.editEntity(newDomainDescEntity, { text: place?.description ?? "" });
			Entities.editEntity(newDomainThumbEntity, { imageURL: place?.thumbnail ?? "" });

			hasDescription = true;
		} catch (e) {
			console.error(e);
		}
	};
	req.send(null);
}

function updateInterstitial(place_name) {
	if (!tickInterval || place_name === "") { return; }

	Entities.editEntity(newDomainNameEntity, {text: place_name});
	Entities.editEntity(newDomainDescEntity, {text: "", textColor: [255, 255, 255]});
	Entities.editEntity(newDomainThumbEntity, {imageURL: ""});

	loadPlaceData(place_name);
}

function openInterstitial(place_name) {
	if (tickInterval) {
		updateInterstitial(place_name);
		return;
	}

	const parentJoint = HMD.active ? SENSOR_TO_WORLD_MATRIX_INDEX : CAMERA_MATRIX_INDEX;
	const jointOffsetY = HMD.active ? 0 : -1.6;

	const extraProps = {
		renderLayer: "front",
		isVisibleInSecondaryCamera: false,
		canCastShadow: false,
		grab: {grabbable: false},
	};

	bgEntity = Entities.addEntity({
		type: "Sphere",
		parentID: MyAvatar.sessionUUID,
		parentJointIndex: parentJoint,
		dimensions: [20, 20, 20],
		ignorePickIntersection: true,
		...extraProps
	}, "local");

	bgMaterialEntity = Entities.addEntity({
		type: "Material",
		ignorePickIntersection: true,
		parentID: bgEntity,
		materialURL: "materialData",
		priority: 1,
		materialData: JSON.stringify(bgMaterialData(0.0)),
		...extraProps
	}, "local");

	newDomainNameEntity = Entities.addEntity({
		type: "Text",
		parentID: MyAvatar.sessionUUID,
		parentJointIndex: parentJoint,
		ignorePickIntersection: true,
		text: place_name,
		localPosition: [0, jointOffsetY + 1.4, -2],
		dimensions: [2.5, 0.2, 0.1],
		lineHeight: 0.2,
		backgroundAlpha: 0,
		textAlpha: alpha,
		unlit: true,
		alignment: "center",
		verticalAlignment: "top",
		textEffect: "outline fill",
		textEffectColor: [0, 0, 0],
		textEffectThickness: 0.4,
		...extraProps
	}, "local");

	newDomainDescEntity = Entities.addEntity({
		type: "Text",
		parentID: MyAvatar.sessionUUID,
		parentJointIndex: parentJoint,
		ignorePickIntersection: true,
		text: "",
		localPosition: [0, jointOffsetY + 0.9, -2],
		dimensions: [2, 0.5, 0.1],
		lineHeight: 0.1,
		backgroundAlpha: 0,
		textAlpha: alpha,
		unlit: true,
		alignment: "center",
		verticalAlignment: "top",
		textEffect: "outline fill",
		textEffectColor: [0, 0, 0],
		textEffectThickness: 0.4,
		...extraProps
	}, "local");

	newDomainThumbEntity = Entities.addEntity({
		type: "Image",
		parentID: MyAvatar.sessionUUID,
		parentJointIndex: parentJoint,
		ignorePickIntersection: true,
		imageURL: "",
		dimensions: [2, 1, 0.1],
		localPosition: [0, jointOffsetY + 2, -2],
		emissive: true,
		alpha: alpha,
		...extraProps
	}, "local");

	cancelButton = Entities.addEntity({
		type: "Text",
		parentID: MyAvatar.sessionUUID,
		parentJointIndex: parentJoint,
		ignorePickIntersection: false,
		text: "<<",
		localPosition: [-0.5, jointOffsetY + 2.6, -2],
		dimensions: [1, 0.1, 0.1],
		lineHeight: 0.08,
		textAlpha: alpha,
		unlit: true,
		alignment: "left",
		verticalAlignment: "top",
		backgroundAlpha: 0,
		backgroundColor: [0, 0, 0],
		textColor: [240, 240, 240],
		leftMargin: 0.03,
		topMargin: 0.01,
		textEffect: "outline fill",
		textEffectColor: [0, 0, 0],
		textEffectThickness: 0.4,
		...extraProps
	}, "local");

	skipButton = Entities.addEntity({
		type: "Text",
		parentID: MyAvatar.sessionUUID,
		parentJointIndex: parentJoint,
		ignorePickIntersection: false,
		text: ">>",
		localPosition: [0.5, jointOffsetY + 2.6, -2],
		dimensions: [1, 0.1, 0.1],
		lineHeight: 0.08,
		textAlpha: alpha,
		unlit: true,
		alignment: "right",
		verticalAlignment: "top",
		backgroundAlpha: 0,
		backgroundColor: [0, 0, 0],
		textColor: [240, 240, 240],
		rightMargin: 0.03,
		topMargin: 0.01,
		textEffect: "outline fill",
		textEffectColor: [0, 0, 0],
		textEffectThickness: 0.4,
		...extraProps
	}, "local");

	tickInterval = Script.setInterval(() => interstitialUpdate(1 / 30), 1000 / 30);

	Entities.hoverEnterEntity.connect(interstitialHoverStart);
	Entities.hoverLeaveEntity.connect(interstitialHoverStop);
	Entities.mousePressOnEntity.connect(interstitialClick);

	loadPlaceData(place_name);
}

function deleteInterstitial() {
	if (tickInterval) {
		Script.clearInterval(tickInterval);
		tickInterval = undefined;
	}

	Entities.hoverEnterEntity.disconnect(interstitialHoverStart);
	Entities.hoverLeaveEntity.disconnect(interstitialHoverStop);
	Entities.mousePressOnEntity.disconnect(interstitialClick);

	Entities.deleteEntity(bgEntity);
	Entities.deleteEntity(bgMaterialEntity);
	Entities.deleteEntity(newDomainNameEntity);
	Entities.deleteEntity(newDomainDescEntity);
	Entities.deleteEntity(newDomainThumbEntity);
	Entities.deleteEntity(cancelButton);
	Entities.deleteEntity(skipButton);

	fadeOut = false;
	alpha = 1;

	hasDescription = false;
	descriptionAlpha = 1;
}

Window.domainChanged.connect(domain => {
	if (domain !== "") { return; }

	if (tickInterval) {
		updateInterstitial(domain);
	} else {
		openInterstitial(domain);
	}
});

// why isn't this getting triggered??
Window.domainConnectionRefused.connect((reason, code, info) => {
	Entities.editEntity(newDomainDescEntity, {
		text: `Failed to connect!\nCode ${code}: ${reason}\n${info}`,
		textColor: [255, 64, 64]
	});
});

let prevPlacename = location.placename;
let checkerInterval = Script.setInterval(() => {
	let placename = location.placename;

	if (placename !== prevPlacename) {
		if (tickInterval) {
			updateInterstitial(placename);
		} else {
			openInterstitial(placename);
		}
	}

	prevPlacename = placename;
}, 1000 / 10);

Script.scriptEnding.connect(() => {
	deleteInterstitial();
	Script.clearInterval(checkerInterval);
});

/*{
	Script.clearInterval(checkerInterval);

	openInterstitial("overte_hub");

	Script.setTimeout(() => {
		fadeOut = true;
	}, 15 * 1000);
}*/
