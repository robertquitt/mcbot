const port = 8000;
const fs = require("fs");
const app = require("express")();
const minecraftQuery = require("minecraft-query");

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
  const usercache = getUsercache();
  const diamonds = usercache.map(user => {
    const stats = getStats(user.uuid) || { stats: {} };
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

app.get("/diamonds.json", (req, res) => {
  const diamonds = getDiamonds();
  res.end(JSON.stringify(diamonds));
});

app.listen(port, () => {
  console.log(`Express listening on ${port}`);
});

bot.init();

// vim: et sw=2
