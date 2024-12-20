export class Player {
    id: string;
    name: string;
    connected: boolean;
    constructor({ id, name, connected }: { id: string; name: string, connected: boolean }) {
        this.id = id;
        this.name = name;
        this.connected = connected;
    }
}