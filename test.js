var fs = require("fs");
var bot = require("./bot.js");

const f = line => {
	return bot.processLine(line, console.log);
}

const lines = fs.readFileSync("latest.log").toString().trimEnd().split("\n");
lines.forEach(f);
