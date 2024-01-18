const socket = io();

let currentRoomId = ''; // Variable pour stocker l'ID de la room actuelle
let keyDownInterval = null;
let playerRole = ''; // 'left' ou 'right'

document.getElementById('createRoomBtn').addEventListener('click', () => {
    socket.emit('createRoom');
});

socket.on('roomCreated', handleRoomEntry);
socket.on('joinedRoom', handleRoomEntry);

socket.on('updateRoomsList', (rooms) => {
    const roomsList = document.getElementById('roomsList');
    roomsList.innerHTML = ''; // Effacez la liste existante

    rooms.forEach(room => {
        let roomElement = document.createElement('li');
        roomElement.innerText = `Room ${room.id}`;
        if (room.isFull) {
            roomElement.style.backgroundColor = 'red';
            roomElement.addEventListener('click', () => {
                alert("Cette room est pleine.");
            });
        } else {
            roomElement.addEventListener('click', () => {
                socket.emit('joinRoom', room.id);
            });
        }
        roomsList.appendChild(roomElement);
    });
});

socket.on('assignRole', (role) => {
    playerRole = role;
});

// Ajout d'un gestionnaire pour la déconnexion d'un joueur
socket.on('playerDisconnected', () => {
    isGameStarted = false; // Arrête le jeu
    alert("L'autre joueur s'est déconnecté. La partie est terminée.");

    // Réinitialiser l'état du jeu et afficher l'interface pour rejoindre/créer une room
    document.getElementById('roomContainer').style.display = 'block';
    document.getElementById('pongCanvas').style.display = 'none';
    currentRoomId = '';
    playerRole = '';
});

document.addEventListener('keydown', (event) => {
    if ((event.key === 'w' || event.key === 's') && playerRole && currentRoomId) {
        const newPosition = event.key === 'w' ? -10 : 10;
        updatePaddlePosition(playerRole, newPosition);
        socket.emit('movePaddle', { role: playerRole, position: newPosition, roomId: currentRoomId });
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'w' || event.key === 's') {
        clearInterval(keyDownInterval);
        keyDownInterval = null;
    }
});

socket.on('paddleMoved', (data) => {
    if (data.role !== playerRole) {
        updatePaddlePosition(data.role, data.position);
    }
});

// Gestion du score
socket.on('scoreUpdated', (data) => {
    scoreLeft = data.scoreLeft;
    scoreRight = data.scoreRight;
});

socket.on('playerLeft', () => {
    alert("L'autre joueur a quitté la partie.");
    // Réinitialiser l'état du jeu et revenir à l'écran des rooms
    document.getElementById('roomContainer').style.display = 'block';
    document.getElementById('pongCanvas').style.display = 'none';
    currentRoomId = '';
    playerRole = '';
    removeQuitButton();
    isGameStarted = false; // Assurez-vous d'arrêter le jeu
});

function removeQuitButton() {
    const quitBtn = document.getElementById('quitBtn');
    if (quitBtn) {
        quitBtn.parentNode.removeChild(quitBtn);
    }
}

// Fonction pour gérer l'affichage lorsqu'un joueur rejoint ou crée une room
function handleRoomEntry(roomId) {
    currentRoomId = roomId;
    document.getElementById('roomContainer').style.display = 'none';
    document.getElementById('pongCanvas').style.display = 'block';
    removeQuitButton();
    drawWaitingMessage();
}

function drawWaitingMessage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText("En attente de J2...", canvas.width / 2 - 100, canvas.height / 2);
}