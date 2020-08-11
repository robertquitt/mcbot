const port = 8000;
const fs = require("fs");
const app = require("express")();
const minecraftQuery = require("minecraft-query");
const fetch = require("node-fetch");

const bot = require("./bot.js");

app.get("(/query)?/", (req, res) => {
  const q = new minecraftQuery({
    host: "localhost",
    port: 25565,
    timeout: 5000
  });
  q.fullStat()
    .then(success => {
      res.write(JSON.stringify(success));
    })
    .catch(err => {
      res.sendStatus(500);
    })
    .finally(() => {
      q.close();
      res.end();
    });
});

const nameApi = async uuid => {
  const path = `/home/robert/ridgev3/cache/${uuid}.json`;
  if (fs.existsSync(path)) {
    const resp = fs.readFileSync(path);
    return JSON.parse(resp);
  } else {
    const uuidStripped = uuid.replace(/-/g, "");
    const resp = await fetch(
      `https://api.mojang.com/user/profiles/${uuidStripped}/names`
    );
    const usernames = await resp.json();
    fs.writeFileSync(path, JSON.stringify(usernames));
    return usernames;
  }
};

const uuidToUsername = async uuid => {
  const usernames = await nameApi(uuid);
  return usernames.slice(-1)[0].name;
};

const uuidList = () => {
  const files = fs.readdirSync("/home/robert/ridgev3/world/stats");
  const uuids = files.map(filename => filename.substring(0, 36));
  return uuids;
};

const getUsercache = () => {
  const usercacheJson = fs.readFileSync("/home/robert/ridgev3/usercache.json");
  const usercache = JSON.parse(usercacheJson);
  return usercache;
};

const usercacheNameToUUID = usercache => {
  const usercacheMap = usercache.map(e => ({ [e.name]: e.uuid }));
  return Object.assign({}, ...usercacheMap);
};

const getStats = uuid => {
  try {
    const statsJson = fs.readFileSync(
      `/home/robert/ridgev3/world/stats/${uuid}.json`
    );
    return JSON.parse(statsJson);
  } catch (err) {}
};

app.get("/user/:username/", (req, res) => {
  const usercache = getUsercache();
  const nameToUUID = usercacheNameToUUID(usercache);
  const username = req.params.username;
  if (username in nameToUUID) {
    const uuid = nameToUUID[username];
    const stats = getStats(uuid);
    res.end(JSON.stringify(stats));
  } else {
    res.status(404).end(`could not find user: ${username}`);
  }
});

const getDiamonds = () => {
  const uuids = uuidList();
  const diamonds = uuids.map(uuid => {
    const stats = getStats(uuid) || { stats: {} };
    const minedStats = stats.stats["minecraft:mined"] || {};
    const usedStats = stats.stats["minecraft:used"] || {};
    const diamondsMined = minedStats["minecraft:diamond_ore"] || 0;
    const diamondsUsed = usedStats["minecraft:diamond_ore"] || 0;
    return [user.name, diamondsMined - diamondsUsed];
  });
  return diamonds;
};

const getDeaths = () => {
  const usercache = getUsercache();
  const deaths = usercache.map(user => {
    const stats = getStats(user.uuid) || { stats: {} };
    const customStats = stats.stats["minecraft:custom"] || {};
    const deaths = customStats["minecraft:deaths"] || 0;
    return [user.name, deaths];
  });
  return deaths;
};

const getVillagerTrades = () => {
  const usercache = getUsercache();
  const trades = usercache.map(user => {
    const stats = getStats(user.uuid) || { stats: {} };
    const customStats = stats.stats["minecraft:custom"] || {};
    const trades = customStats["minecraft:traded_with_villager"] || 0;
    return [user.name, trades];
  });
  return trades;
};

const getTimePlayed = async () => {
  const uuids = uuidList();
  const times = await Promise.all(
    uuids.map(async uuid => {
      const stats = getStats(uuid) || { stats: {} };
      const customStats = stats.stats["minecraft:custom"] || {};
      const timeTicks = customStats["minecraft:play_one_minute"] || 0;
      const name = await uuidToUsername(uuid);
      return [name, timeTicks];
    })
  );
  return times;
};

app.get("/diamonds/", (req, res) => {
  let diamonds = getDiamonds();
  diamonds.sort((a, b) => {
    return b[1] - a[1];
  });
  diamonds.forEach(e => {
    res.write(`${e[1]}\t${e[0]}\n`);
  });
  res.end();
});

app.get("/deaths/", (req, res) => {
  let deaths = getDeaths();
  deaths.sort((a, b) => {
    return b[1] - a[1];
  });
  deaths.forEach(e => {
    res.write(`${e[1]}\t${e[0]}\n`);
  });
  res.end();
});

app.get("/villagertrades/", (req, res) => {
  let trades = getVillagerTrades();
  trades.sort((a, b) => {
    return b[1] - a[1];
  });
  trades.forEach(e => {
    res.write(`${e[1]}\t${e[0]}\n`);
  });
  res.end();
});

app.get("/timeplayed/", async (req, res) => {
  let times = await getTimePlayed();
  const ticksPerHour = 20 * 60 * 60;
  const ticksPerMinute = 20 * 60;
  const ticksPerSecond = 20;
  times.sort((a, b) => {
    return b[1] - a[1];
  });
  times.forEach(e => {
    const hours = Math.floor(e[1] / ticksPerHour)
      .toString()
      .padStart(5, " ");
    const minutes = (Math.floor(e[1] / ticksPerMinute) % 60)
      .toString()
      .padStart(2, "0");
    const seconds = (Math.floor(e[1] / ticksPerSecond) % 60)
      .toString()
      .padStart(2, "0");
    res.write(`${hours}:${minutes}:${seconds}\t${e[0]}\n`);
  });
  res.end();
});

app.get("/gulag/", (req, res) => {
  const timePlayed = getTimePlayed();
  const diamonds = getDiamonds();
  const ticksPerHour = 20 * 60 * 60;
  const gulag = diamonds.map((e, i) => {
    const time = timePlayed[i][1] / ticksPerHour;
    const percent = time == 0 ? 0 : e[1] / time;
    return [e[0], percent, time, e[1]];
  });
  gulag.sort((a, b) => {
    if (a[1] == b[1]) {
      return b[2] - a[2];
    }
    return b[1] - a[1];
  });
  gulag.forEach(e => {
    const diamondsPerHour = e[1].toFixed(2);
    const hours = e[2].toFixed(2);
    const diamonds = e[3];
    res.write(`${diamondsPerHour}\t${diamonds}\t${hours}\t${e[0]}\n`);
  });
  res.end();
});

app.get("/diamonds.json", (req, res) => {
  const diamonds = getDiamonds();
  res.end(JSON.stringify(diamonds));
});

app.listen(port, () => {
  console.log(`Express listening on ${port}`);
});

bot.init();

// vim: et sw=2
