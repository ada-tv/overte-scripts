(function() { "use strict"; try {
	const PLACES_API = "https://mv.overte.org/server";
	const PROTOCOL = "ViLohxhZMTalcuUKwgs63g=="; // Window.protocolSignature();
	const FONT = "Roboto";
	const PLATTER_RADIUS = 2;
	const ORB_RADIUS = 0.2;

	let self;
	let visual;
	let loadingVisual;
	let orbs = new Map();

	function createWorldOrb(pos, name, url, thumbnailURL, userCount) {
		const color = userCount > 0 ? [1, 0.25, 1] : [0.25, 0, 1];

		const entity = Entities.addEntity({
			type: "Sphere",
			name: `WorldOrb: ${name}`,
			parentID: self,
			color: color,
			alpha: 0.9,
			dimensions: [ORB_RADIUS, ORB_RADIUS, ORB_RADIUS],
			localPosition: pos,
			collisionless: true,
			grab: { grabbable: true },
			script: `(function() {
	this.mouseDoublePressOnEntity = function(id, ev) {
		console.info("i was double clicked");
		if (!ev.isPrimaryButton) { return; }
		location.handleLookupString(${JSON.stringify(url)});
	}
})`,
		});

		Entities.addEntity({
			type: "Material",
			name: `WorldOrb Material: ${name}`,
			parentID: entity,
			priority: 1,
			materialURL: "materialData",
			materialData: JSON.stringify({
				materialVersion: 1,
				materials: {
					model: "vrm_mtoon",
					albedo: [0, 0, 0],
					shade: [0, 0, 0],
					emissiveMap: thumbnailURL,
					parametricRim: color,
					parametricRimFresnelPower: 2,
					rimLightingMix: 0,
					cullFaceMode: "CULL_FRONT",
				},
			}),
		});

		Entities.addEntity({
			type: "Text",
			name: `WorldOrb Title: ${name}`,
			parentID: entity,
			alignment: "center",
			verticalAlignment: "bottom",
			text: name,
			unlit: true,
			backgroundAlpha: 0,
			lineHeight: 0.07,
			dimensions: [1, 0.2, 0.1],
			localPosition: [0, 0.2, 0],
			billboardMode: "full",
			grab: { grabbable: false },
			ignorePickIntersection: true,
			collisionless: true,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textEffectThickness: 0.45,
			font: FONT,
		});

		orbs.set(entity, { url });
	}

	function spawnOrbs(places) {
		const N = places.length;
		const R = (PLATTER_RADIUS / 2);
		const phi = (1 + Math.sqrt(5)) / 2;
		let points = [];

		// sprinkle the orbs with some fibonacci
		for (let i = 0; i < N; i++) {
			const j = i / N;
			const theta = Math.acos(1 - (2 * j));
			const azimuth = 2 * Math.PI * (i / phi);

			// my brain is too smooth for this shit
			const r = Math.cbrt(Math.random() * R);

			points.push([
				r * Math.sin(theta) * Math.cos(azimuth),
				(r * Math.sin(theta) * Math.sin(azimuth)) + R + (ORB_RADIUS / 2),
				r * Math.cos(theta),
			]);
		}

		for (let i = 0; i < N; i++) {
			const pos = points[i];
			const place = places[i];

			createWorldOrb(
				pos,
				place.name,
				`hifi://${place.name}${place.path}`,
				place.thumbnail,
				place.current_attendance
			);

			// debug
			/*Entities.addEntity({
				type: "Sphere",
				parentID: self,
				localPosition: pos,
				dimensions: [0.05, 0.05, 0.05],
			});*/
		}
	}

	this.preload = function(_self) {
		self = _self;
		visual = Entities.addEntity({
			type: "Shape",
			parentID: self,
			name: "WorldPlatter Visual",
			shape: "Cylinder",
			color: [255, 192, 0],
			alpha: 0.6,
			localPosition: [0, -0.005, 0],
			dimensions: [PLATTER_RADIUS, 0.01, PLATTER_RADIUS],
			grab: { grabbable: false },
			ignorePickIntersection: true,
			collisionless: true,
		});

		Entities.addEntity({
			type: "Material",
			parentID: visual,
			name: "WorldPlatter Visual Material",
			priority: 1,
			materialURL: "materialData",
			materialData: JSON.stringify({
				materialVersion: 1,
				materials: {
					model: "vrm_mtoon",
					albedo: [0.54, 0.32, 0],
					shade: [0, 0, 0],
					opacity: 0.9,
					parametricRim: [1, 0.54, 0],
					parametricRimFresnelPower: 2,
					rimLightingMix: 0,
				},
			}),
		});

		loadingVisual = Entities.addEntity({
			type: "Text",
			parentID: self,
			name: "WorldPlatter Loading",
			text: "Loading...",
			billboardMode: "full",
			dimensions: [1.5, 0.5, 0.1],
			backgroundAlpha: 0,
			unlit: true,
			textEffect: "outline fill",
			textEffectColor: [0, 0, 0],
			textEffectThickness: 0.3,
			alignment: "center",
			verticalAlignment: "center",
			localPosition: [0, 0.3, 0],
			grab: { grabbable: false },
			ignorePickIntersection: true,
			collisionless: true,
			font: FONT,
		});

		// debug
		/*spawnOrbs([]);
		Entities.deleteEntity(loadingVisual);
		loadingVisual = undefined;*/

		let xhr = new XMLHttpRequest();

		xhr.timeout = 10 * 1000;
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== 4) { return; }

			try {
				console.debug(`Parsing places list: ${xhr.status} ${xhr.statusText} ${xhr.errorCode}`);
				const places = JSON.parse(xhr.responseText).data.places;

				spawnOrbs(places.filter(a => a.domain.protocol_version === PROTOCOL));

				Entities.deleteEntity(loadingVisual);
				loadingVisual = undefined;
			} catch (e) {
				console.error(e);
				Entities.editEntity(loadingVisual, { text: `${e}` });
			}
		};

		const url = `${PLACES_API}/api/v1/places?status=online`;
		console.debug(`Fetching places list: ${url}`);
		xhr.open("GET", url);
		xhr.send();
	};

	this.unload = function() {
		Entities.deleteEntity(visual);
		Entities.deleteEntity(loadingVisual);

		for (const orb of orbs.keys()) {
			Entities.deleteEntity(orb);
		}
	};

} catch(e) { console.error(e); this.unload(); }})
