import { Question, QuestionTrimmed } from "./question";
import { readFile } from 'node:fs/promises';
// import { v6 as uuidv6 } from 'uuid';

export class QuestionSet {
    id: string;
    name: string;
    questions: Question[];
    rounds: number;
    loaded: boolean;
    constructor(name: string, rounds: number = 1) {
        this.id = "0";
        // todo use this instead
        // this.id = uuidv6();
        this.name = name;
        this.rounds = rounds;
        this.loaded = false;
        this.questions = [];
    }

    async loadQuestions(): Promise<void> {
        try {
            const data = await readFile(this.name + ".json", { encoding: "utf-8" });
            console.log('loaded questions: ', data);
            this.loaded = true;
            this.questions = JSON.parse(data);
        } catch (e) {
            console.log(e);
            this.loaded = true;
        }
    }

    getNextQuestion(round: number): QuestionTrimmed | null {
        if (!this.loaded) {
            console.log("Questions not loaded");
            return null;
        }
        if (round > this.rounds || this.questions.length < round - 1) {
            console.log("Round " + round + " not found");
            return null;
        }
        return QuestionTrimmed.fromQuestion(this.questions[round - 1]);
    }
}