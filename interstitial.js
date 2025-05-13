const SOUND_CLICK = SoundCache.getSound(Script.resourcesPath() + "sounds/Button06.wav");
const SOUND_HOVER = SoundCache.getSound(Script.resourcesPath() + "sounds/Button04.wav");

let tickInterval;

let fadeOut = false;
let alpha = 1.0;

let hasDescription = false;
let descriptionAlpha = 1.0;

let bgEntity;
let bgMaterialEntity;
let bgGridEntity;
let newDomainNameEntity;
let newDomainDescEntity;
let newDomainThumbEntity;
let bgParticlesEntity;
//let loadingBar;
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
		});
	} else if (entityID === skipButton) {
		Audio.playSystemSound(SOUND_HOVER);

		Entities.editEntity(skipButton, {
			backgroundAlpha: 1,
			backgroundColor: [72, 32, 64],
			textColor: [255, 255, 255],
			text: "Skip loading screen >>",
		});
	}
}

function interstitialHoverStop(entityID, _event) {
	if (entityID === cancelButton) {
		Entities.editEntity(cancelButton, {
			backgroundAlpha: 0,
			backgroundColor: [0, 0, 0],
			textColor: [240, 240, 240],
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

		Entities.editEntity(bgGridEntity, {visible: false});

		if (alpha === 0) {
			deleteInterstitial();
		}
	} else {
		alpha = Math.min(1.0, alpha + delta);

		if (hasDescription) {
			descriptionAlpha = Math.min(1.0, descriptionAlpha + delta * 2);
		}

		if (alpha > 0.8) {
			Entities.editEntity(bgGridEntity, {visible: true});
		}
	}

	if (Window.isPhysicsEnabled()) { fadeOut = true; }

	Entities.editEntity(bgMaterialEntity, {materialData: JSON.stringify(bgMaterialData(Math.max(0.0, (alpha - 0.6) * 2.5)))});
	Entities.editEntity(newDomainNameEntity, {textAlpha: Math.min(1.0, alpha * 1.3)});
	Entities.editEntity(newDomainDescEntity, {textAlpha: descriptionAlpha});
	Entities.editEntity(newDomainThumbEntity, {alpha: descriptionAlpha});
	/*Entities.editEntity(loadingBar, {
		dimensions: [fakeLoading * 2, 0.03, 0.03],
		localPosition: [fakeLoading - 1, 0.25, -2],
		alpha: alpha,
	});*/
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

	bgEntity = Entities.addEntity({
		type: "Sphere",
		renderLayer: "front",
		parentID: MyAvatar.sessionUUID,
		ignorePickIntersection: true,
		localPosition: [0, 0, 0],
		rotation: Quat.cancelOutRollAndPitch(Camera.orientation),
		dimensions: [30, 30, 30],
		color: [0, 0, 0],
		alpha: alpha,
		unlit: true,
	}, "local");

	bgMaterialEntity = Entities.addEntity({
		type: "Material",
		ignorePickIntersection: true,
		parentID: bgEntity,
		materialURL: "materialData",
		priority: 1,
		materialData: JSON.stringify(bgMaterialData(alpha)),
	}, "local");

	bgGridEntity = Entities.addEntity({
		type: "Grid",
		renderLayer: "front",
		parentID: bgEntity,
		ignorePickIntersection: true,
		localPosition: [0, -MyAvatar.userHeight / 2, 0],
		localRotation: Quat.fromPitchYawRollDegrees(90, 0, 0),
		dimensions: [30, 30, 1],
		//color: "#472e82",
		color: "#2e214f",
		followCamera: false,
		visible: false,
	}, "local");

	newDomainNameEntity = Entities.addEntity({
		type: "Text",
		parentID: bgEntity,
		ignorePickIntersection: true,
		text: place_name,
		localPosition: [0, 0.4, -2],
		dimensions: [2.5, 0.2, 0.1],
		lineHeight: 0.2,
		renderLayer: "front",
		backgroundAlpha: 0,
		textAlpha: alpha,
		unlit: true,
		alignment: "center",
		verticalAlignment: "top",
	}, "local");

	newDomainDescEntity = Entities.addEntity({
		type: "Text",
		parentID: bgEntity,
		ignorePickIntersection: true,
		text: "",
		localPosition: [0, -0.1, -2],
		dimensions: [2, 0.5, 0.1],
		lineHeight: 0.1,
		renderLayer: "front",
		backgroundAlpha: 0,
		textAlpha: alpha,
		unlit: true,
		alignment: "center",
		verticalAlignment: "top",
	}, "local");

	newDomainThumbEntity = Entities.addEntity({
		type: "Image",
		parentID: bgEntity,
		ignorePickIntersection: true,
		renderLayer: "front",
		imageURL: "",
		dimensions: [2, 1, 0.1],
		localPosition: [0, 1, -2],
		emissive: true,
		alpha: alpha,
	}, "local");

	bgParticlesEntity = Entities.addEntity({
		type: "ParticleEffect",
		parentID: bgEntity,
		ignorePickIntersection: true,
		localPosition: [0, 0, 5],
		textures: "https://content.overte.org/Bazaar/Assets/Textures/Defaults/Interface/default_particle.png",
		renderLayer: "front",
		lifespan: 10,
		maxParticles: 50,
		emitRate: 15,
		shapeType: "circle",
		emitDimensions: [15, 15, 15],
		emitRadiusStart: 1,
		particleRadius: [0, 3, 2],
		alphaStart: 0.25,
		alpha: 0.0,
		alphaFinish: 0.0,
		colorStart: "#751f8f",
		color: "#751f8f",
		colorFinish: "#751f8f",
		spinSpread: 100,
		emitAcceleration: [0, 0, 0],
		accelerationSpread: [0.1, 0.1, 0.1],
		radiusStart: 0,
		radiusStart: 0,
		particleRadius: 2,
		radiusFinish: 2,
	}, "local");

	/*loadingBar = Entities.addEntity({
		type: "Box",
		parentID: bgEntity,
		ignorePickIntersection: true,
		renderLayer: "front",
		dimensions: [2, 0.03, 0.03],
		localPosition: [0, 0.25, -2],
		unlit: true,
		color: [64, 255, 32],
		alpha: alpha,
	}, "local");*/

	cancelButton = Entities.addEntity({
		type: "Text",
		parentID: bgEntity,
		ignorePickIntersection: false,
		text: "<  Go back",
		localPosition: [-1.5, 0.3, -2],
		localRotation: Quat.fromPitchYawRollDegrees(0, 30, 0),
		dimensions: [0.5, 0.15, 0.1],
		lineHeight: 0.1,
		renderLayer: "front",
		textAlpha: alpha,
		unlit: true,
		alignment: "center",
		verticalAlignment: "center",
		backgroundAlpha: 0,
		backgroundColor: [0, 0, 0],
		textColor: [240, 240, 240],
		bottomMargin: 0.015,
	}, "local");

	skipButton = Entities.addEntity({
		type: "Text",
		parentID: bgEntity,
		ignorePickIntersection: false,
		text: ">>",
		localPosition: [0.5, 1.5, -2],
		dimensions: [1, 0.1, 0.1],
		lineHeight: 0.08,
		renderLayer: "front",
		textAlpha: alpha,
		unlit: true,
		alignment: "right",
		verticalAlignment: "top",
		backgroundAlpha: 0,
		backgroundColor: [0, 0, 0],
		textColor: [240, 240, 240],
		rightMargin: 0.02,
		topMargin: 0.01,
	}, "local");

	//Script.update.connect(interstitialUpdate);
	tickInterval = Script.setInterval(() => interstitialUpdate(1 / 30), 1000 / 30);

	Entities.hoverEnterEntity.connect(interstitialHoverStart);
	Entities.hoverLeaveEntity.connect(interstitialHoverStop);
	Entities.mousePressOnEntity.connect(interstitialClick);

	loadPlaceData(place_name);
}

function deleteInterstitial() {
	//Script.update.disconnect(interstitialUpdate);
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
	Entities.deleteEntity(bgGridEntity);
	Entities.deleteEntity(bgParticlesEntity);
	Entities.deleteEntity(newDomainThumbEntity);
	//Entities.deleteEntity(loadingBar);
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
