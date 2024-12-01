import { v6 as uuidv6 } from "uuid";
import { GameStatus } from "./models";
import { Player } from "./player";

export class Game {
    id: string;
    name: string;
    players: Player[];
    status: GameStatus;
    rounds: number;
    currentRound: number;
    password: string;
    questions: string; // identificator for questions from DB
    mainClientId: string;
    constructor(name: string, rounds: number, password: string, questions: string, mainClientId: string) {
        this.id = uuidv6();
        this.name = name;
        this.players = [];
        this.status = GameStatus.NOT_STARTED;
        this.rounds = rounds;
        this.currentRound = 0;
        this.password = password;
        this.questions = questions;
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

}

