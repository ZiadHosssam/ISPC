//colyseus + express holy shit thank god.
const colyseus = require("colyseus");
const http = require("http");
const express = require("express");
const port = process.env.port || 3000;
const { createServer } = require("http");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { Room, ServerError } = require("@colyseus/core");
const { GameJolt } = require("joltite.js");
const schema = require('@colyseus/schema');

const privateKey = process.env['apiKey'];
const privateDenpaKey = process.env['denpaKey'];

const gameId = process.env['apiGameId'];

const api = new GameJolt({ gameId: gameId, privateKey: privateKey });

const app = express();
app.use(express.json());

console.log("Listening on port: " + port);

const server = createServer(app); // create the http server manually

const gameServer = new colyseus.Server({
  //...
  gracefullyShutdown: true,
  transport: new WebSocketTransport({ server: server })
});
  
class IntermissionClient extends schema.Schema {
  constructor() {
    super();
    this.ready = false;
    this.gjName = "";
  }
}

schema.defineTypes(IntermissionClient, {
  ready: "boolean",
  gjName: "string"
});

class IntermissionState extends schema.Schema {
  constructor() {
    super();
    this.players = new schema.MapSchema();
  }
}

schema.defineTypes(IntermissionState, {
  players: { map: IntermissionClient }
});

class Player extends schema.Schema {
  constructor() {
    super();
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.loaded = false;
	  this.score = 0;
  }
}

schema.defineTypes(Player, {
  left: "boolean",
  down: "boolean",
  up: "boolean",
  right: "boolean",
  loaded: "boolean",
  score: "number"
});

class ChatState extends schema.Schema {
  constructor() {
    super();
    this.players = new schema.MapSchema();
  }
}

schema.defineTypes(ChatState, {
  players: { map: Player }
});

class ChatRoom extends Room {
  maxClients = 2;
  map = "";
  password = null;
  clientss = [];
  creator = null;
  player = "";
  enemy = "";
  scoreMap = new Map();
  playerMap = new Map();
  ratingMap = new Map([['sick', 350], ['good', 200], ['bad', 100], ['shit', 50]]);

  onCreate(options) {
    this.setState(new ChatState());
    this.onMessage("message", (client, message) => {
      console.log(message);
      this.broadcast("message", { except: client });
    });

    this.onMessage("leave", (client, message) => {
      console.log(message);
      client.leave();
    });

    this.onMessage("setPlayer", (client, message) => {
      this.player = message;
	    this.scoreMap.set(client.sessionId, 0);
    });

    this.onMessage("setEnemy", (client, message) => {
      this.enemy = message;
	    this.scoreMap.set(client.sessionId, 0);
    });

    this.onMessage("notePress", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      let pDirections = [player.left, player.down, player.up, player.right];
      pDirections[data.notedata] = true;
      //update
      player.left = pDirections[0];
      player.down = pDirections[1];
      player.up = pDirections[2];
      player.right = pDirections[3];
	  
	  if (data.goodHit == true){
          this.scoreMap.set(client.sessionId, this.scoreMap.get(client.sessionId) + this.ratingMap.get(data.rating));
		  player.score = this.scoreMap.get(client.sessionId);
		  this.broadcast("syncScore", {plrScore: this.scoreMap.get(this.playerMap.get(0)), enemyScore: this.scoreMap.get(this.playerMap.get(1))});
	  }
	  
      //should resend data to the other clients, handle goodhit from there
      this.broadcast("notePress", {notedata: data.notedata, goodHit: data.goodHit, newScore: this.scoreMap.get(client.sessionId), clientName: data.clientname});
    });

    this.onMessage("noteRaised", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      let pDirections = [player.left, player.down, player.up, player.right];
      pDirections[data.notedata] = false;
      //update
      player.left = pDirections[0];
      player.down = pDirections[1];
      player.up = pDirections[2];
      player.right = pDirections[3];
      this.broadcast("noteRaised", {except: client});
    });

    this.onMessage("*", (client, type, message) => {
      console.log("[[UNKNOWN MESSAGE]]: " + String(message) + " [[TYPE]]: " + String(type) + " [[CLIENT]]: " + String(client))
    });

    this.onMessage("playerHasLoaded", (client, msg) => {
      this.state.players.get(client.sessionId).loaded = true;
    });

    if (options.password == null || options.password == "") {
      this.password = null;
    }
    else {
      this.password = options.password;
    }
  }

  async onAuth(client, options, request) {
    //actually verify player
    if ((options.authorizationKey != null && options.authorizationKey == process.env['authorizationKey']) || (options.authorizationKey != null && options.authroizationKey == process.env['denpaKey'])) {
      if (options.name != null && options.accessToken != null) {
        //make a request to gamejolt:
        const response = await api.login({ username: options.name, token: options.accessToken });
        if (response.success)
        {
          if (options.map != null)
            this.map = options.map;
          return true;
        }
        else return false;
      }
      else return false;
    }
    else return false;
  }

  onJoin(client, options, auth) {
  this.playerMap.set(this.clients.length, client.sessionId);
	
    this.state.players.set(client.sessionId, new Player());
    if (this.password != null) {
      client.send("password", "Password is required.");
    }
    console.log("Client: %s has connected.", client.sessionId);
    if (this.clientss.length == 2)
      this.lock();

    this.clientss.push(client);
    if (this.clientss[0] != null)
      this.creator = this.clientss[0];
    //console.log(this.creator);
    client.send("playerAndEnemy", { "enemy": this.enemy, "player": this.player });
  }

  onLeave(client, consented) {
    if (this.state.players.has(client.sessionId))
      this.state.players.delete(client.sessionId);

    console.log("Client: %s has disconnected.", client.sessionId);
    if (this.clients.length < 2)
      this.unlock();

    if (this.clientss[0] != null)
      this.creator = this.clientss[0];

    if (client.sessionId == this.player)
      this.player = null;
    else if (client.sessionId == this.enemy)
      this.enemy = null;
  }

  onDispose() {
    console.log("Disposing GameState");
    this.disconnect();
  }
}

class IntermissionRoom extends Room {
  maxClients = 2;

  onCreate(options) {
    this.setState(new IntermissionState());
    this.onMessage("readyChange", (client, msg) => {
      this.state.players.get(client.sessionId).ready = msg;
    });

    this.onMessage("setPlayerName", (client, msg) => {
      this.state.players.get(client.sessionId).gjName = msg
    });
  }

  onJoin(client, options) {
    this.state.players.set(client.sessionId, new IntermissionClient());
    console.log('Client: %s has connected.', client.sessionId);
    if (this.state.players.length == 2)
      this.lock();
  }

  async onAuth(client, options, request) {
    //actually verify player
    if ((options.authorizationKey != null && options.authorizationKey == process.env['authorizationKey']) || (options.authorizationKey != null && options.authroizationKey == process.env['denpaKey'])) {
      if (options.name != null && options.accessToken != null) {
        //make a request to gamejolt: 
        const response = await api.login({ username: options.name, token: options.accessToken });
        if (response.success)
          return true;
        else return false;
      }
      else return false;
    }
    else return false;
  }

  onLeave(client, consented) {
    if (this.state.players.has(client.sessionId))
      this.state.players.delete(client.sessionId);
    console.log('Client: %s has disconnected.', client.sessionId);
    if (this.state.players.length < 2)
      this.unlock();
  }

  onDispose() {
    console.log("Disposing IntermissionRoom");
    this.disconnect();
  }
}

gameServer.define("chat", ChatRoom);

gameServer.define("intermission", IntermissionRoom);

gameServer.listen(port);