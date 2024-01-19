const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(join(__dirname, 'public')));

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public/index.html'));
});

// Stockage des informations sur les rooms
let rooms = {};

// Gestionnaire de connexion pour les nouveaux clients WebSocket
io.on('connection', (socket) => {
    // Envoie la liste actuelle des rooms à chaque nouveau client
    io.emit('updateRoomsList', Object.values(rooms).map(room => {
        return {
            id: room.id,
            isFull: room.players.length >= 2 // Indique si la room est pleine
        };
    }));

    // Gestion des événements de création et de jonction de room
    socket.on('createRoom', () => createRoom(socket));
    socket.on('joinRoom', (roomId) => joinRoom(socket, roomId));

    // Mise à jour de la position de la balle et transmission aux joueurs de la room
    socket.on('updateBallPosition', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            io.in(roomId).emit('ballMoved', { x: data.x, y: data.y });
        }
    });

    // Gestion du mouvement des raquettes et transmission aux joueurs de la room
    socket.on('movePaddle', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            io.in(roomId).emit('paddleMoved', data);
        }
    });

    // Gestion de la déconnexion d'un client
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

    // Mise à jour des scores et transmission aux joueurs de la room
    socket.on('updateScore', (data) => {
        const { scoreLeft, scoreRight, roomId } = data;
        if (rooms[roomId]) {
            io.in(roomId).emit('scoreUpdated', { scoreLeft, scoreRight });
        }
    });

});

// Fonction pour créer une nouvelle room
function createRoom(socket) {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 5);
    rooms[roomId] = { id: roomId, players: [socket.id], isGameStarted: false };
    rooms[roomId].score = { left: 0, right: 0 };
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    socket.emit('assignRole', 'left'); // Assigner le rôle de joueur gauche au créateur de la room
    io.emit('updateRoomsList', Object.values(rooms)); // Mettre à jour la liste des rooms
}

// Fonction pour rejoindre une room existante
function joinRoom(socket, roomId) {
    if (rooms[roomId] && rooms[roomId].players.length < 2) {
        rooms[roomId].players.push(socket.id);
        socket.join(roomId);
        socket.emit('joinedRoom', roomId);
        socket.emit('assignRole', 'right'); // Assigner le rôle de joueur droit au joueur qui rejoint
        if (rooms[roomId].players.length === 2) {
            rooms[roomId].isGameStarted = true; // Commencer le jeu lorsque deux joueurs sont présents
            io.in(roomId).emit('startGame', roomId);
        }
    }
}

server.listen(3000, () => {
    console.log('Listening on port 3000');
});
