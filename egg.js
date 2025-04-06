// SPDX-License-Identifier: CC0-1.0

const eggColors = [
	[255, 255, 255],
	[244, 190, 137],
	[181, 133, 85],
	[111, 181, 206],
];
let sounds = [
	"https://thingvellir.net/share/overte/chicken1.wav",
	"https://thingvellir.net/share/overte/chicken2.wav",
];

for (let i = 0; i < sounds.length; i++) {
	sounds[i] = SoundCache.getSound(sounds[i]);
}

Controller.keyPressEvent.connect(function(e) {
	if (e.text !== "{") { return; }

	let pos = MyAvatar.getJointPosition("Hips");

	let egg = Entities.addEntity({
		type: "Sphere",
		color: eggColors[Math.floor(Math.random() * eggColors.length)],
		dimensions: [0.15, 0.2, 0.15],
		position: pos,
		lifetime: 30,
		dynamic: true,
		collidesWith: "static,dynamic,kinematic",
		gravity: [0, -9.81, 0],
		velocity: [0, -1, 0],
	});

	Audio.playSound(sounds[Math.floor(Math.random() * sounds.length)], {
		position: MyAvatar.position,
		volume: 0.3,
	});
});
