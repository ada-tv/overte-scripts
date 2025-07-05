const QUERY_REGEX = /[a-z]+:\/\/[^\?]+(?:\?([^\?#]+)(?:&([^/?#]+)+)?)?(?:#.+)?/;
const url = Script.fileName;
const queryParts = (url.match(QUERY_REGEX)[1] ?? "").split("&");

let options = {};

for (const part of queryParts) {
	let [key, value] = part.split("=");
	key = decodeURIComponent(key);
	value = decodeURIComponent(value);
	options[key] = value;
}

module.exports = options;
