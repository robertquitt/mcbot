const fetch = require("node-fetch");
const Tail = require("tail").Tail;
const Filter = require("bad-words");
const filter = new Filter();
require("dotenv").config();

const webhookUrl = process.env.WEBHOOKURL || exit(1);
const token = process.env.TOKEN || exit(1);
const logFile = process.env.LOGFILE || exit(1);

const chatRegex = /^\[.+\] \[.+\]: \<(\w+)\> (.+)$/;
const loginRegex = /^\[.+\] \[.+\]: (\w+)\[.+\] logged in/;
const logoutRegex = /^\[.+\] \[.+\]: (\w+) left/;
const advancementRegex = /^\[.+\] \[.+\]: (\w+) has made the advancement \[(.+)\]/;

tail = new Tail(logFile);

const processLine = line => {
  const res = line.match(chatRegex);
  if (res) {
    let user = res[1];
    let message = res[2].replace(/.\[m$/, "");
    if (filter.isProfane(message)) {
      message = filter.clean(message);
      // TODO: punish dirty mouths
      sendMessage(`<${user}> ${message}`);
    } else {
      sendMessage(`<${user}> ${message}`);
    }
    return;
  }
  const login = line.match(loginRegex);
  if (login) {
    let user = login[1];
    sendMessage(`${user} joined the game`);
    return;
  }
  const logout = line.match(logoutRegex);
  if (logout) {
    let user = logout[1];
    sendMessage(`${user} left the game`);
    return;
  }
  const advancement = line.match(advancementRegex);
  if (advancement) {
    let user = advancement[1];
    let advName = advancement[2];
    sendMessage(`${user} has made the advancement ${advName}`);
    return;
  }
};

tail.on("line", line => {
  processLine(line);
});

const sendMessage = message => {
  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content: `${message}` })
  });
};

// vim: et sw=2
