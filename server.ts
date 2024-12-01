import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { Game } from "./game";
import { Player } from "./player";

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_REMOTE_URL, process.env.CLIENT_LOCAL_URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});
const games = new Map<string, Game>();
const players = new Map<string, Player>();

io.on("connection", (socket) => {
  const count = io.engine.clientsCount;
  console.log(socket.id + " connected c:" + count);

  socket.on("disconnecting", () => {
    // game.leave(socket.id);
    console.log(socket.id + " disconnecting");
  });
  socket.on("disconnect", () => {
    console.log(socket.id + "user disconnected");
  });

  socket.on(
    "game-create",
    (
      data: {
        name: string;
        rounds: number;
        password: string;
        questions: string;
      },
      callback: Function
    ) => {
      console.log("Create new game: " + data.name);
      const game = new Game(data.name, data.rounds, data.password, data.questions, socket.id);
      // socket ID in this case is ID of main client, not user
      const gameId = game.id;
      games.set(gameId, game);
      socket.join(gameId);
      socket.emit("game-created", gameId);
      callback({
        id: gameId,
        success: true,
      });
    }
  );

  socket.on(
    "game-join",
    (data: { gameId: string; password: string }, callback: Function) => {
      const game = games.get(data.gameId);
      if (!game) {
        console.log("Game " + data.gameId + " not found");
        callback({
          message: "Game not found",
          success: false,
        });
        return;
      }
      if (game.password !== data.password) {
        console.log("Wrong password for game " + data.gameId);
        callback({
          message: "Wrong password",
          success: false,
        });
        return;
      }
      const player = players.get(socket.id);
      if (!player) {
        console.log("Player " + socket.id + " not found");
        callback({
          message: "Player not found",
          success: false,
        });
        return;
      }
      if (game.join(player)) {
        socket.join(data.gameId);
        socket.emit("game-joined", data.gameId);
        callback({
          message: "Joined game " + data.gameId,
          id: data.gameId,
          success: true,
        });
      } else {
        callback({
          message: "Game " + data.gameId + " is already started or finished",
          success: false,
        });
      }
    }
  );

  socket.on(
    "player-create",
    (data: { name: string }, callback: Function) => {
      const player = new Player({ id: socket.id, name: data.name, ready: false });
      players.set(socket.id, player);
      socket.emit("player-created", player);
      callback({
        message: "Player created with id " + player.id,
        id: player.id,
        success: true,
      });
    })

  socket.on("test", () => {
    console.log("test: ", games, players);
  });
});

server.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});

io.engine.on("connection_error", (err) => {
  console.log("CONNECTION_ERROR!!");
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});
