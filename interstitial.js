let fadeOut = false;
let alpha = 0;

let hasDescription = false;
let descriptionAlpha = 0;

let bgEntity;
let bgMaterialEntity;
let bgGridEntity;
let newDomainNameEntity;
let newDomainDescEntity;
let newDomainThumbEntity;
let bgParticlesEntity;
let loadingBar;

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

function interstitialUpdate(delta) {
	if (fadeOut) {
		alpha = Math.max(0.0, alpha - delta);
		descriptionAlpha = Math.max(0.0, descriptionAlpha - delta);

		Entities.editEntity(bgGridEntity, {visible: false});

		if (alpha == 0) {
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

	// domainLoadingProgress always returns zero, and scripts can't run during safe landing :(
	const loading = Window.domainLoadingProgress();
	if (loading >= 1.0) { fadeOut = true; }

	Entities.editEntity(bgMaterialEntity, {materialData: JSON.stringify(bgMaterialData(Math.max(0.0, (alpha - 0.6) * 2.5)))});
	Entities.editEntity(newDomainNameEntity, {textAlpha: Math.min(1.0, alpha * 1.3)});
	Entities.editEntity(newDomainDescEntity, {textAlpha: descriptionAlpha});
	Entities.editEntity(newDomainThumbEntity, {alpha: descriptionAlpha});
	Entities.editEntity(loadingBar, {
		dimensions: [loading * 2, 0.03, 0.03],
		localPosition: [loading - 1, 0.25, -2],
		alpha: alpha,
	});
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
			Entities.editEntity(newDomainDescEntity, { text: place.description });
			Entities.editEntity(newDomainThumbEntity, { imageURL: place.thumbnail });

			hasDescription = true;
		} catch (e) {
			console.error(e);
		}
	};
	req.send(null);
}

function openInterstitial(place_name) {
	bgEntity = Entities.addEntity({
		type: "Sphere",
		position: Vec3.sum(Camera.position, [0, MyAvatar.userHeight, 0]),
		rotation: Quat.cancelOutRollAndPitch(Camera.orientation),
		parentID: MyAvatar.SELF_ID,
		dimensions: [30, 30, 30],
		color: [0, 0, 0],
		alpha: alpha,
		unlit: true,
		renderLayer: "front",
	}, "local");

	bgMaterialEntity = Entities.addEntity({
		type: "Material",
		parentID: bgEntity,
		materialURL: "materialData",
		priority: 1,
		materialData: JSON.stringify(bgMaterialData(0)),
	}, "local");

	bgGridEntity = Entities.addEntity({
		type: "Grid",
		parentID: bgEntity,
		position: MyAvatar.getWorldFeetPosition(),
		renderLayer: "front",
		localRotation: Quat.fromPitchYawRollDegrees(90, 0, 0),
		dimensions: [30, 30, 1],
		color: "#472e82",
		followCamera: false,
		visible: false,
	}, "local");

	newDomainNameEntity = Entities.addEntity({
		type: "Text",
		text: place_name,
		parentID: bgEntity,
		localPosition: [0, 0.4, -2],
		dimensions: [2, 0.2, 0.1],
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
		text: "",
		parentID: bgEntity,
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

	loadingBar = Entities.addEntity({
		type: "Box",
		parentID: bgEntity,
		renderLayer: "front",
		dimensions: [2, 0.03, 0.03],
		localPosition: [0, 0.25, -2],
		unlit: true,
		color: [64, 255, 32],
		alpha: alpha,
	}, "local");

	Script.update.connect(interstitialUpdate);

	loadPlaceData(place_name);
}

function deleteInterstitial() {
	Script.update.disconnect(interstitialUpdate);

	Entities.deleteEntity(bgEntity);
	Entities.deleteEntity(bgMaterialEntity);
	Entities.deleteEntity(newDomainNameEntity);
	Entities.deleteEntity(bgGridEntity);
	Entities.deleteEntity(bgParticlesEntity);
	Entities.deleteEntity(newDomainThumbEntity);
	Entities.deleteEntity(loadingBar);

	Script.stop();
}

Script.scriptEnding.connect(() => deleteInterstitial());

openInterstitial("Overte_Hub");
Script.setTimeout(() => fadeOut = true, 5000);

/*Window.domainChanged.connect(domain => {
	if (domain.startsWith("file://") || domain.startsWith("http://") || domain.startsWith("https://")) { return; }
	openInterstitial(domain);
	Script.setTimeout(() => fadeOut = true, 5000);
});*/

/*let prevPlacename = location.placename;

Script.update.connect(_dt => {
	let placename = location.placename;

	if (placename !== prevPlacename && placename === "") {
		closeInterstitial();
	} else if (placename !== prevPlacename && !bgEntity) {
		openInterstitial(placename);
	}

	prevPlacename = placename;
});*/
