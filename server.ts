import express from "express";
import cors from "cors";
import { createServer, get } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { Game } from "./classes/game";
import { Player } from "./classes/player";
import { GameStatus, QuestionType } from "./models";
import { createDecipheriv } from "node:crypto";
// import { router } from "./classes/router";

const TEST_GAME_ID = "12345";

const app = express();
app.use(cors());
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_REMOTE_URL, process.env.CLIENT_LOCAL_URL, process.env.CLIENT_LOCAL_URL_EXTRA],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// app.use('/api', router);
app.get("/api/games/available", (req, res) => {
  const availableGames = Array.from(games.values())
    .filter((g) => g.status === GameStatus.NOT_STARTED)
    .map(getGameResponse);
  res.json(availableGames);
});

app.get("/api/games", (req, res) => {
  const allGames = Array.from(games.values())
    .filter((g) => g.status !== GameStatus.ENDED)
    .map(getGameResponse);
  res.json(allGames);
});

app.get("/api/score/:id", (req, res) => {
  const game = games.get(req.params.gameId);
  if (game) {
    res.json(game.score);
  }
});

const getGameResponse = (g: Game) => {
  return {
    name: g.name,
    id: g.id,
    rounds: g.rounds,
    players: g.players.length,
    status: g.status,
    createdAt: g.createdAt,
    questionSet: g.questionSetId,
    currentRound: g.currentRound,
  };
};

const games = new Map<string, Game>();
const players = new Map<string, Player>();

io.on("connection", (socket) => {
  const count = io.engine.clientsCount;
  console.log(socket.id + " connected c:" + count);

  socket.on("disconnecting", () => {
    console.log(socket.id + " disconnecting from room " + socket.rooms.size);
    for (let room of socket.rooms) {
      if (games.has(room)) {
        const game = games.get(room);
        if (game) {
          console.log('Player "' + socket.id + '" left game "' + game.id + '"');
          game.leave(socket.id);
          socket.to(game.id).emit("player-left", socket.id);
        }
      }
    }
    const player = players.get(socket.id);
    if (player) {
      player.connected = false;
    }
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
        code: string;
        questionSet: string;
      },
      callback: Function
    ) => {
      console.log("Create new game: " + data.name + " with questions from " + data.questionSet);
      const existingGame = Array.from(games.values()).find((g) => g.name === data.name);
      if (existingGame) {
        callback({
          message: "Game with name " + data.name + " already exists",
          success: false,
        });
        return;
      }
      const game = new Game(data.name, data.rounds, data.password, data.code, data.questionSet, socket.id);
      const gameId = game.id;
      games.set(gameId, game);
      socket.broadcast.emit("game-created", gameId);
      socket.join(gameId);
      callback({
        game,
        success: true,
      });
    }
  );

  socket.on("game-join-host", (data: { gameId: string; password: string }, callback: Function) => {
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
    if (!!game.hostId) {
      console.log("Game " + data.gameId + " already has a host");
      callback({
        message: "Game already has a host",
        success: false,
      });
      return;
    }
    game.setNewHost(socket.id);
    socket.join(data.gameId);
    callback({
      message: "Joined game " + data.gameId,
      game: game,
      success: true,
    });
  });

  socket.on("game-join-display", (data: { gameId: string }, callback: Function) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      callback({
        message: "Game not found",
        success: false,
      });
      return;
    }
    socket.join(data.gameId);
    callback({
      message: "Joined game " + data.gameId,
      data: game,
      success: true,
    });
  });

  socket.on("game-join", (data: { gameId: string; code: string }, callback: Function) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      callback({
        message: "Game not found",
        success: false,
      });
      return;
    }
    if (game.code !== data.code) {
      console.log("Wrong code for game " + data.gameId);
      callback({
        message: "Wrong code",
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
      player.gameId = data.gameId;
      socket.to(game.id).emit("game-joined", { players: game.players });
      callback({
        message: "Joined game " + data.gameId,
        data: getGameResponse(game),
        success: true,
      });
    } else {
      callback({
        message: "Game " + data.gameId + " is already started or finished",
        success: false,
      });
    }
  });

  socket.on("game-start", ({ gameId }, callback: Function) => {
    console.log("Start game " + gameId);
    const game = games.get(gameId);
    if (!game) {
      console.log("Game " + gameId + " not found");
      callback({
        message: "Game not found",
        success: false,
      });
      return;
    }
    if (game.status !== GameStatus.NOT_STARTED) {
      console.log("Game " + gameId + " is already started or finished");
      callback({
        message: "Game is already started or finished",
        success: false,
      });
      return;
    }
    if (game.players.length < 2) {
      console.log("Game " + gameId + " needs at least 2 players");
      callback({
        message: "Game needs at least 2 players",
        success: false,
      });
      return;
    }
    if (socket.id !== game.hostId) {
      game.hostId = socket.id;
      socket.join(gameId);
    }
    game.start().then(() => {
      const nextRound = game.getNextRound();
      if (!nextRound) return;
      socket.to(gameId).emit("game-started", nextRound.question);
      callback({
        message: "Game started",
        success: true,
        question: nextRound.full,
        game: game,
      });
    });
  });

  socket.on("remove-player", async (data: { playerId: string; gameId: string }, callback: Function) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      callback({
        message: "Game not found",
        success: false,
      });
      return;
    }
    game.removePlayer(data.playerId);
    console.log("Player " + data.playerId + " removed from game " + game.name + " " + data.gameId);

    const userSockets = await io.in(data.playerId).fetchSockets();
    const userSocket = userSockets.find((socket) => socket.id.toString() === data.playerId);
    if (!userSocket) {
      console.log("Player " + data.playerId + " not found in any game");
      callback({
        message: "Player not found",
        success: true,
        data: game!.players,
      });
      return;
    }
    userSocket.leave(data.gameId);
    socket.to(data.playerId).emit("player-removed");
    callback({
      message: "Player removed",
      success: true,
      data: game!.players,
    });
  });

  socket.on("player-create", (data: { name: string, song: string }, callback: Function) => {
    console.log("Create player ", data);
    // Re-logging on the same device with the same id (should only happen during testing)
    if (players.has(socket.id)) {
      const player = players.get(socket.id);
      if (!player) return;
      console.log("User " + socket.id + " is already logged in");
      if (player.gameId === "") {
        callback({
          success: true,
          message: "User " + socket.id + " is already logged in",
          data: { player },
        });
        return;
      }
      if (player.gameId !== "") {
        const game = games.get(player.gameId);
        if (!game) return;
        socket.join(player.gameId);
        const question = game.currentRound === 0 ? null : game.questionSet?.questions[game.currentRound - 1];
        callback({
          success: true,
          message: "Logging back into game " + player.gameId,
          data: { player, game: getGameResponse(game), question },
        });
        return;
      }
    }

    // Re-logging on the same device with a different id (after refresh)
    for (let player of players.values()) {
      if (player.name === data.name) {
        if (player.connected) {
          console.log("Player " + data.name + " is already connected on other device");
          callback({
            message: "Player " + data.name + " is already connected on other device",
            success: false,
          });
          return;
        } else {
          const game = games.get(player.gameId);
          if (!game) return;
          players.delete(player.id);
          player.id = socket.id;
          player.connected = true;
          players.set(socket.id, player);
          socket.join(player.gameId);
          socket.emit("player-created", player);
          console.log("Player " + data.name + " re-joined with id " + player.id);
          const question = game.currentRound === 0 ? null : game.questionSet?.questions[game.currentRound - 1];
          callback({
            message: "Player " + data.name + " re-joined with id " + player.id,
            data: { player, game: getGameResponse(game), question },
            success: true,
          });
          return;
        }
      }
    }

    // New player
    const player = new Player({ id: socket.id, name: data.name, connected: true, song: data.song });
    players.set(socket.id, player);
    socket.emit("player-created", player);
    callback({
      message: "Player created with id " + player.id,
      data: { player },
      success: true,
    });
  });

  socket.on("test", () => {
    console.log("test: ", games, players);
  });

  socket.on("next-round", (data: { gameId: string }, callback: Function) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      callback({
        message: "Game not found",
        success: false,
      });
      return;
    }
    const nextRound = game.getNextRound();
    if (!nextRound) {
      callback({
        message: "No more questions, show score instead",
        success: true,
        data: null,
      });
      return;
    }
    socket.to(data.gameId).emit("next-question", { question: nextRound.question, round: game.currentRound });
    callback({
      success: true,
      data: { question: nextRound.full, round: game.currentRound },
    });
  });

  socket.on("start-countdown", (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      return;
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      console.log("Game " + data.gameId + " is not in progress");
      return;
    }
    console.log("Sending countdown for round " + game.currentRound + " of game " + data.gameId);
    socket.nsp.to(data.gameId).emit("countdown");
    setTimeout(() => {
      console.log("Answers closed for round " + game.currentRound + " of game " + data.gameId);
      game.answersOpen = false;
    }, 5500); // 500ms grace period compared to 5s on client
  });

  socket.on("answer", (data: { answer: string; gameId: string }, callback: Function) => {
    console.log("Answer received: ", data, socket.id);
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      return;
    }
    const saved = game.saveAnswer(socket.id, data.answer);
    if (!saved) {
      console.log("Answer not saved for player " + socket.id + " in game " + data.gameId);
      callback({
        success: false,
      });
      return;
    }
    console.log("Answer saved for player " + socket.id + " in game " + data.gameId);
    callback({
      success: true,
    });
    socket.to(game.hostId).emit("answers-updated", game.players);
  });

  socket.on("show-answer", (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      return;
    }
    socket.nsp.to(data.gameId).emit("correct-answer", game.getCorrectAnswer());
  });

  socket.on("show-score", (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      return;
    }
    socket.nsp.to(data.gameId).emit("show-score", game.players);
  });

  socket.on("delete-game", (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      return;
    }
    games.delete(data.gameId);
    console.log("Game " + data.gameId + " deleted");
    socket.nsp.to(data.gameId).emit("game-deleted");
  });

  socket.on("end-game", (data: { gameId: string }) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      return;
    }
    console.log("Game " + data.gameId + " ended");
    socket.nsp.to(data.gameId).emit("game-ended", game);
    games.delete(data.gameId);
  });

  socket.on("show-first", (data: { gameId: string }, callback: Function) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log("Game " + data.gameId + " not found");
      callback({ success: false, message: "Game not found" });
      return;
    }
    const firstPlayerId = game.getFirstPlayerId();
    if (!firstPlayerId) {
      console.log("Game " + data.gameId + " has no first player for question " + game.currentRound);
      callback({ success: false, message: "Game has no first player for question " + game.currentRound });
      return;
    }
    const player = players.get(firstPlayerId);
    if (!player) {
      console.log("Player " + firstPlayerId + " not found");
      callback({ success: false, message: "Player not found" });
      return;
    }
    socket.nsp.to(data.gameId).emit("show-first", player);
    callback({ success: true, data: player });
  })
});

server.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});

io.engine.on("connection_error", (err) => {
  console.log("CONNECTION_ERROR!!");
  // console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});
