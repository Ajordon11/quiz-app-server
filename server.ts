import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { Game } from "./classes/game";
import { Player } from "./classes/player";
import { GameStatus } from "./models";

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
    console.log(socket.id + " disconnecting from room " + socket.rooms);
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
        questionSet: string;
      },
      callback: Function
    ) => {
      console.log("Create new game: " + data.name + " with questions from " + data.questionSet);
      const game = new Game(data.name, data.rounds, data.password, data.questionSet, socket.id);
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

  socket.on("game-start", ({ gameId }, callback: Function) => {
    console.log("Start game " + gameId);
    const game = games.get(gameId);
    if (!game) {
      console.log("Game " + gameId + " not found");
      callback({
        message: "Game not found",
        success: false,
      })
      return;
    }
    if (game.status !== GameStatus.NOT_STARTED) {
      console.log("Game " + gameId + " is already started or finished");
      callback({
        message: "Game is already started or finished",
        success: false,
      })
      return;
    }
    if (game.players.length < 2) {
      console.log("Game " + gameId + " needs at least 2 players");
      callback({
        message: "Game needs at least 2 players",
        success: false,
      })
      return;
    }
    game.start().then(() => {
      callback({
        message: "Game started",
        success: true
      })
      socket.to(gameId).emit("game-started", gameId);
    });
  });

  socket.on("next-round", (gameId: string) => {
    const game = games.get(gameId);
    if (!game) {
      console.log("Game " + gameId + " not found");
      return;
    }
    const Question = game.getNextRound();
    socket.to(gameId).emit("next-question", Question);
  });

  socket.on(
    "player-create",
    (data: { name: string }, callback: Function) => {
      if (players.has(socket.id)) {
        console.log("User " + socket.id + " is already logged in");
        callback({
          message: "User is already logged in as " + players.get(socket.id)!.name,
          success: false,
        });
        return;
      }
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
