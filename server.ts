import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
let dotenv = require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", dotenv.parsed.FRONTEND_URL],
    credentials: true
  }
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected ', socket.id);
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
    socket.on('chat message', (msg: string) => {
        console.log('message: ' + msg);
        io.emit('server info', {
            message: msg
        });
    });
  });

server.listen(3000, () => {
 console.log('Server is running on port 3000');
})
