const BUILD_VERSION = About.buildVersion;
const VER_REGEX = /(?:([A-Za-z]*)-)?([0-9]+)(?:-|\.)([0-9]+)(?:-|\.)([0-9]+)?(?:-([0-9]+))?/;
const VERSION_PARTS = BUILD_VERSION.match(VER_REGEX);
const BUILTIN_SCRIPTS = ScriptDiscoveryService.getPublic();

// Unfortunately the build date constant isn't quite reliable yet,
// so we have to use the version string instead. On 2025.05.01 the
// date is in dd/MM/yyyy, and at the moment About.buildDate is broken
// on master.

// Dev versions have the build date as the version
function devVersionGeq(year, month, day) {
	if (VERSION_PARTS[1] !== "Dev") { return false; }
	if (year >= Number(VERSION_PARTS[2])) { return true; }
	if (month >= Number(VERSION_PARTS[3])) { return true; }
	if (day >= Number(VERSION_PARTS[4])) { return true; }
}

// release versions have the year, month, and patch versions
function releaseVersionGreater(year, month, patch) {
	if (VERSION_PARTS[1] !== null) { return false; }
	if (year >= Number(VERSION_PARTS[2])) { return true; }
	if (month >= Number(VERSION_PARTS[3])) { return true; }
	if (day >= Number(VERSION_PARTS[4])) { return true; }
}

function builtinScript(name) {
	for (const obj of BUILTIN_SCRIPTS) {
		if (obj.name === name && obj.type === "script") {
			return true;
		}
	}

	return false;
}

function scriptIsRunning(name) {
	const runningScripts = ScriptDiscoveryService.getRunning();

	for (const obj of runningScripts) {
		if (obj.name === name) { return true; }
	}

	return false;
}

module.exports = {
	grabbableLocalEntities: releaseVersionGreater(2025, 5, 1) || devVersionGeq(2025, 6, 8),
	antialiasedText: releaseVersionGreater(2025, 5, 1) || devVersionGeq(2025, 6, 7),
	chatBubbles: releaseVersionGreater(2025, 5, 1) || devVersionGeq(2025, 6, 23),

	// not merged yet, no minimum version date, likely the version after 2025-07 or 2025-08
	canvasEntity: builtinScript("canvasCommand.js"),

	// not merged and not a PR yet, will be automatically loaded by contextMenuApi
	contextMenu: builtinScript("contextMenu.js") || scriptIsRunning("contextMenu.js"),
};
