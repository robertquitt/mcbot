const port = 8000;
const app = require("express")();
const minecraftQuery = require("minecraft-query");

const bot = require("./bot.js");

app.get("/", (req, res) => {
  const q = new minecraftQuery({
    host: "localhost",
    port: 25565,
    timeout: 5000
  });
  q.fullStat()
    .then(success => {
      res.write(JSON.stringify(success));
      sendMessage(success.players);
    })
    .catch(err => {
      res.sendStatus(500);
    })
    .finally(() => {
      q.close();
      res.end();
    });
});

app.get("/query/", (req, res) => {
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

app.listen(port, () => {
  console.log(`Express listening on ${port}`);
});

// vim: et sw=2
