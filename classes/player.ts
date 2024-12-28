export class Player {
    id: string;
    name: string;
    connected: boolean;
    score: number = 0;
    lastAnswer: string = "";
    gameId: string = "";
    song: string = "";
    constructor({ id, name, connected, song }: { id: string; name: string, connected: boolean, song: string }) {
        this.id = id;
        this.name = name;
        this.connected = connected;
        this.song = song;
    }
    
    clearAnswer() {
        this.lastAnswer = "";
    }

    addScore(score: number) {
        this.score += score;
    }
}