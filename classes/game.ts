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
    if (this.status === GameStatus.NOT_STARTED) {
      console.log(`Player ${player.name}(${player.id}) joined game ${this.name}`);
      this.players.push(player);
      return true;
    }
    console.log("Game " + this.name + " is already started or finished");
    return false;
  }

  leave(playerId: string) {
    if (playerId === this.hostId) {
      this.hostId = "";
      return;
    }
    this.players = this.players.filter((player) => player.id !== playerId);
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
    // return {
    //     id: "1",
    //     question: "Test question okay with long question text, so be aware that this is possibility?",
    //     type: QuestionType.MULTIPLE_CHOICE,
    //     options: ["Abecede", "Besxsesds", "Cccc", "Dasdsadasdasds", "E", "F"],
    //     image: null,
    //   };
    const question = {
      id: "3",
      question: "Order the following words in alphabetical order.",
      type: QuestionType.LETTER,
      options: ["Abeeeeee", "Cecsadasdd", "Dedsafgasg", "Bdddddddddddddd"],
      image: null,
      answer: "Abeeeeee,Bdddddddddddddd,Cecsadasdd,Dedsafgasg",
      full_answer: "It is because it is.",
    };
    return { question: QuestionTrimmed.fromQuestion(question), full: question };
    // return this.questionSet!.getNextQuestion(this.currentRound);
  }

  saveAnswer(playerId: string, answer: string) {
    if (this.status !== GameStatus.IN_PROGRESS) {
      console.log("Game " + this.name + " is not in progress");
      return;
    }
    if (!this.answersOpen) {
      console.log("Answers are not open, playert " + playerId + " can't save answer");
      return;
    }
    this.evaulateAnswer(playerId, answer);
  }

  evaulateAnswer(playerId: string, answer: string) {
    const correct = this.questionSet!.questions[this.currentRound - 1].answer === answer;
    if (!correct) {
      return;
    }
    let score = DEFAULT_SCORE;
    if (!this.firstAnswerReceived) {
      this.firstAnswerReceived = true;
      score += 1;
    }
    if (this.score[playerId]) {
      this.score[playerId] += score;
    } else {
      this.score[playerId] = score;
    }
  }

  getCorrectAnswer(): string {
    return "A,B,C,D";
    // return this.questionSet!.questions[this.currentRound - 1].answer; todo fix me
  }

  setNewHost(id: string) {
    this.hostId = id;
  }

  removePlayer(playerId: string) {
    this.players = this.players.filter((player) => player.id !== playerId);
  }
}
