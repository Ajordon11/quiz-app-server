import { v6 as uuidv6 } from "uuid";
import { GameStatus } from "../models";
import { Player } from "./player";
import { QuestionSet } from "./question-set";

export class Game {
    id: string;
    name: string;
    players: Player[];
    status: GameStatus;
    rounds: number;
    currentRound: number;
    password: string;
    questionSetId: string; // identificator for questions from DB
    mainClientId: string;
    createdAt: Date;
    startedAt: Date | null;
    questionSet: QuestionSet | null;
    constructor(name: string, rounds: number, password: string, questionSetId: string, mainClientId: string) {
        this.id = uuidv6();
        this.name = name;
        this.players = [];
        this.status = GameStatus.NOT_STARTED;
        this.rounds = rounds;
        this.currentRound = 0;
        this.password = password;
        this.questionSetId = questionSetId;
        this.mainClientId = mainClientId;
        this.createdAt = new Date();
        this.startedAt = null;
        this.questionSet = null;
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
        this.players = this.players.filter(player => player.id !== playerId);
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

    getNextRound() {
        if (this.status !== GameStatus.IN_PROGRESS) {
            console.log("Game " + this.name + " is not in progress");
            return;
        } 
        if (this.questionSet == null) {
            console.log("Questions not loaded");
            return;
        }
        this.currentRound++;
        return this.questionSet!.getNextQuestion(this.currentRound);

    }

}

