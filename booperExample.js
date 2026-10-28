// booperExample.js - Ada <ada@thingvellir.net> 2026-10-29
// SPDX-License-Identifier: CC0-1.0
"use strict";
const { TouchArea } = require("./avatarTouchApi.js");

const SOUND_OBJ = SoundCache.getSound(Script.resolvePath("./assets/blip1.wav"));

const touchArea = new TouchArea({
    name: "Nose",
    jointName: "Head",
    radius: 0.06,
    offset: [0, -0.02, 0.15],
});

touchArea.touched.connect((_toucher, _speed, position, _hand) => {
    Audio.playSound(SOUND_OBJ, { position, volume: 0.03 });
    console.info("Boop!");
});
