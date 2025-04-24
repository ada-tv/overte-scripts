// SPDX-License-Identifier: CC0-1.0
"use strict";

let sessionTime = 0;

Script.update.connect(delta => {
	sessionTime += delta;
});

module.exports = {
	sessionTime: () => sessionTime,
}
