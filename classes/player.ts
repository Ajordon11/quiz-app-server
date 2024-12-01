export class Player {
    id: string;
    name: string;
    ready: boolean;
    constructor({ id, name, ready }: { id: string; name: string, ready: boolean }) {
        this.id = id;
        this.name = name;
        this.ready = ready;
    }
}