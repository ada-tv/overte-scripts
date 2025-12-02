(function() { "use strict"; try {
	const PLACES_API = "https://mv.overte.org/server";
	const PLATTER_RADIUS = 2;
	let self;
	let visual;
	let loadingVisual;
	let worlds = [];

	function createWorldOrb(name, url, userCount) {
		const randRange = (min, max) => Math.random() * (max - min) + min;
		const color = userCount > 0 ? [192, 0, 255] : [255, 0, 192];

		const halfRadius = (PLATTER_RADIUS / 2) - 0.3;
		const pos = [
			randRange(-halfRadius, halfRadius),
			randRange(0.3, 1.2),
			randRange(-halfRadius, halfRadius),
		];

		const entity = Entities.addEntity({
			type: "Sphere",
			name: `WorldOrb: ${name}`,
			parentID: self,
			color: color,
			alpha: 0.9,
			dimensions: [0.2, 0.2, 0.2],
			localPosition: pos,
			collisionless: true,
			grab: { grabbable: true },
			lifetime: 3 * 60,
			script: `(function(){ this.mousePressOnEntity = () => location.handleLookupString(${JSON.stringify(url)}); })`,
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
			textEffectThickness: 0.3,
		});

		worlds.push(entity);
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
		});

		let xhr = new XMLHttpRequest();

		xhr.timeout = 10 * 1000;
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== 4 /* DONE */) { return; }

			try {
				console.debug(`Parsing places list: ${xhr.status} ${xhr.statusText} ${xhr.errorCode}`);
				const protocol = "ViLohxhZMTalcuUKwgs63g=="; // Window.protocolSignature();
				const places = JSON.parse(xhr.responseText).data.places;

				for (const place of places) {
					if (place.domain.protocol_version !== protocol) { continue; }
					createWorldOrb(place.name, `hifi://${place.name}${place.path}`, place.current_attendance);
				}

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

		for (const world of worlds) {
			Entities.deleteEntity(world);
		}
	};

} catch(e) { console.error(e); this.unload(); }})
