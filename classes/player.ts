export class Player {
    id: string;
    name: string;
    connected: boolean;
    score: number = 0;
    lastAnswer: string = "";
    gameId: string = "";
    constructor({ id, name, connected }: { id: string; name: string, connected: boolean }) {
        this.id = id;
        this.name = name;
        this.connected = connected;
    }
    
    clearAnswer() {
        this.lastAnswer = "";
    }

    addScore(score: number) {
        this.score += score;
    }
}