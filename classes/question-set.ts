import { Question } from "./question";
import { readFile } from 'node:fs/promises';
// import { v6 as uuidv6 } from 'uuid';

export class QuestionSet {
    id: string;
    name: string;
    questions: Question[];
    rounds: number;
    loaded: boolean;
    constructor({ name, rounds }: { name: string; rounds: number }) {
        this.id = "0";
        // todo use this instead
        // this.id = uuidv6();
        this.name = name;
        this.rounds = rounds;
        this.loaded = false;
        this.questions = [];
    }

    async loadQuestions(name: string): Promise<Question[]> {
        try {
            const data = await readFile(name + ".json", { encoding: "utf-8" });
            console.log('loaded questions: ', data);
            this.loaded = true;
            return JSON.parse(data);
        } catch (e) {
            console.log(e);
            this.loaded = true;
            return [];
        }
    }

}