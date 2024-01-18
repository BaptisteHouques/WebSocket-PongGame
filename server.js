const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public/index.html'));
});

let rooms = {};

io.on('connection', (socket) => {
    // Envoi immédiat la liste actuelle des rooms au nouveau client
    io.emit('updateRoomsList', Object.values(rooms).map(room => {
        return {
            id: room.id,
            isFull: room.players.length >= 2
        };
    }));

    socket.on('createRoom', () => createRoom(socket));
    socket.on('joinRoom', (roomId) => joinRoom(socket, roomId));

    // Ajout d'un gestionnaire d'événements pour mettre à jour la position de la balle
    socket.on('updateBallPosition', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            // Mettre à jour la position de la balle à partir des données reçues
            ballX = data.x;
            ballY = data.y;

            // Diffusez la nouvelle position de la balle à tous les joueurs
            io.in(roomId).emit('ballMoved', { x: ballX, y: ballY });
        }
    });

    socket.on('movePaddle', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            io.in(roomId).emit('paddleMoved', data);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players.includes(socket.id)) {
                room.players = room.players.filter(id => id !== socket.id);
                if (room.players.length === 0) {
                    // Si la room est vide après la déconnexion, supprimez la room
                    delete rooms[roomId];
                }
                // Mettez à jour la liste des rooms pour tous les clients après chaque déconnexion
                io.emit('updateRoomsList', Object.values(rooms));
                break;
            }
        }
    });

    socket.on('updateScore', (data) => {
        const { scoreLeft, scoreRight, roomId } = data;
        if (rooms[roomId]) {
            io.in(roomId).emit('scoreUpdated', { scoreLeft, scoreRight });
        }
    });

});

function createRoom(socket) {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 5);
    rooms[roomId] = { id: roomId, players: [socket.id], isGameStarted: false };
    rooms[roomId].score = { left: 0, right: 0 };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    socket.emit('assignRole', 'left');
    io.emit('updateRoomsList', Object.values(rooms));
}

function joinRoom(socket, roomId) {
    if (rooms[roomId] && rooms[roomId].players.length < 2) {
        rooms[roomId].players.push(socket.id);
        socket.join(roomId);
        socket.emit('joinedRoom', roomId);
        socket.emit('assignRole', 'right');
        if (rooms[roomId].players.length === 2) {
            rooms[roomId].isGameStarted = true;
            io.in(roomId).emit('startGame', roomId);
        }
    }
}

server.listen(3000, () => {
    console.log('Listening on port 3000');
});
