import { v6 as uuidv6 } from "uuid";
import { GameStatus, QuestionType } from "../models";
import { Player } from "./player";
import { QuestionSet } from "./question-set";
import { Question, QuestionTrimmed } from "./question";

const DEFAULT_SCORE = 4;
export class Game {
  id: string;
  name: string;
  players: Player[];
  status: GameStatus;
  rounds: number;
  currentRound: number;
  password: string;
  code: string;
  questionSetId: string; // identificator for questions from DB
  hostId: string;
  createdAt: Date;
  startedAt: Date | null;
  questionSet: QuestionSet | null;
  answersOpen: boolean;
  score: { [key: string]: number } = {};
  firstAnswerReceived: boolean = true;
  constructor(name: string, rounds: number, password: string, code: string, questionSetId: string, hostId: string) {
    this.id = uuidv6();
    this.name = name;
    this.players = [];
    this.status = GameStatus.NOT_STARTED;
    this.rounds = rounds;
    this.currentRound = 0;
    this.password = password;
    this.code = code;
    this.questionSetId = questionSetId;
    this.hostId = hostId;
    this.createdAt = new Date();
    this.startedAt = null;
    this.questionSet = null;
    this.answersOpen = false;
  }

  join(player: Player) {
    if (this.status === GameStatus.ENDED) {
      console.log("Game " + this.name + " has already ended");
      return false;
    }
    if (this.status === GameStatus.NOT_STARTED) {
      console.log(`Player ${player.name}(${player.id}) joined game ${this.name}`);
      player.gameId = this.id;
      this.players.push(player);
      return true;
    }
    const playerIndex = this.players.findIndex((p) => p.name === player.name);
    console.log("searching for player " + player.name + " in game ", this.players, playerIndex);
    if (playerIndex !== -1 && !this.players[playerIndex].connected) {
      console.log(`Player ${player.name}(${player.id}) re-joined game ${this.name}`);
      player.gameId = this.id;
      this.players[playerIndex] = player;
      return true;
    }
    console.log("Game " + this.name + " is already started");
    return false;
  }

  leave(playerId: string) {
    if (playerId === this.hostId) {
      console.log('Removing host from game "' + this.name + '"');
      this.hostId = "";
      return;
    }
    const index = this.players.findIndex((player) => player.id === playerId);
    if (index === -1) {
      console.log("Player " + playerId + " is not in game " + this.name);
      return;
    }
    this.players[index].connected = false;
  }

  async start() {
    if (this.status !== GameStatus.NOT_STARTED) {
      console.log("Game " + this.name + " is already started or finished");
      return;
    }
    if (this.players.length < 2) {
      console.log("Game " + this.name + " needs at least 2 players");
      return;
    }
    this.questionSet = new QuestionSet(this.questionSetId, this.rounds);
    await this.questionSet.loadQuestions();
    if (this.questionSet.rounds !== this.rounds) {
      this.rounds = this.questionSet.rounds;
    }
    this.players.forEach((player) => {
      player.score = 0;
      player.clearAnswer();
    });
    this.status = GameStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  finish() {
    if (this.status !== GameStatus.IN_PROGRESS) {
      console.log("Game " + this.name + " is not in progress");
      return;
    }
    this.status = GameStatus.ENDED;
  }

  getNextRound(): { question: QuestionTrimmed; full: Question } | null {
    if (this.status !== GameStatus.IN_PROGRESS) {
      console.log("Game " + this.name + " is not in progress");
      return null;
    }
    if (this.questionSet == null) {
      console.log("Questions not loaded");
      return null;
    }
    this.currentRound++;
    this.answersOpen = true;
    this.firstAnswerReceived = false;

    const question = this.questionSet!.getNextQuestion(this.currentRound);
    if (question == null) {
      this.finish();
      return null;
    }
    this.players.forEach((player) => {
      player.clearAnswer();
    });
    return { question: QuestionTrimmed.fromQuestion(question), full: question };
  }

  saveAnswer(playerId: string, answer: string): boolean {
    if (this.status !== GameStatus.IN_PROGRESS) {
      console.log("Game " + this.name + " is not in progress");
      return false;
    }
    if (!this.answersOpen) {
      console.log("Answers are not open, playert " + playerId + " can't save answer");
      return false;
    }
    this.evaulateAnswer(playerId, answer);
    return true;
  }

  evaulateAnswer(playerId: string, answer: string) {
    const player = this.players.find((player) => player.id === playerId);
    if (!player) {
      return;
    }
    if (player.lastAnswer !== "") {
      console.log("Player " + playerId + " already answered");
      return;
    }
    player.lastAnswer = answer;
    const correct = this.isAnswerCorrect(answer, this.currentRound);
    if (!correct) {
      return;
    }
    let score = DEFAULT_SCORE;
    if (!this.firstAnswerReceived) {
      this.firstAnswerReceived = true;
      score += 1;
    }
    player.addScore(score);
  }

  getCorrectAnswer(): { answer: string; full: string | null } {
    return {
      answer: this.questionSet!.questions[this.currentRound - 1].answer,
      full: this.questionSet!.questions[this.currentRound - 1].full_answer,
    };
  }

  setNewHost(id: string) {
    this.hostId = id;
  }

  removePlayer(playerId: string) {
    this.players = this.players.filter((player) => player.id !== playerId);
  }
  isAnswerCorrect(answer: string, currentRound: number): boolean {
    const question = this.questionSet!.questions[currentRound - 1];
    if (QuestionType.NUMBER === question.type) {
      const numAnswer = parseInt(answer);
      const numQuestion = parseInt(question.answer);
      return numAnswer === numQuestion;
    } else if (QuestionType.LETTER === question.type) {
      const correctAnswer = question.answer.length === 1 ? question.answer : question.answer[0];
      const answers = answer.split(" ");
      return answers.includes(correctAnswer);
    } else if (QuestionType.ORDER === question.type) {
      const correctAnswers = typeof question.answer === "string" ? question.answer.split(",") : question.answer;
      correctAnswers.forEach((a) => a.trim());
      const actualAnswers = typeof answer === "string" ? answer.split(",") : answer;
      actualAnswers.forEach((a) => a.trim());
      if (correctAnswers.length !== actualAnswers.length) {
        return false;
      }
      for (let i = 0; i < correctAnswers.length; i++) {
        if (correctAnswers[i] !== actualAnswers[i]) {
          return false;
        }
      } 
      return true;
    } else {
      return answer === question.answer;
    }
  }
}
