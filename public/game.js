const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const ballImage = new Image();
ballImage.src = '/images/macon.png';

// Définition des propriétés de base pour les raquettes et la balle
const paddleWidth = 10, paddleHeight = 60;
const scoreMax = 2;
let leftPaddleY = 170, rightPaddleY = 170;
let ballX = canvas.width / 2, ballY = canvas.height / 2;
let ballSpeedX = 2, ballSpeedY = 2;
let isGameStarted = false;

let scoreLeft = 0;
let scoreRight = 0;

socket.on('startGame', () => {
    isGameStarted = true;
    draw();
});

socket.on('ballMoved', (data) => {
    // Mise à jour de la position de la balle
    ballX = data.x;
    ballY = data.y;
});

function sendBallPosition() {
    socket.emit('updateBallPosition', { x: ballX, y: ballY, roomId: currentRoomId });
}

function updatePaddlePosition(player, posY) {
    if (player === 'left') {
        const newPosY = leftPaddleY + posY;
        if (newPosY > -10 && newPosY + paddleHeight < canvas.height + 10) {
            leftPaddleY = newPosY;
        }
    } else if (player === 'right') {
        const newPosY = rightPaddleY + posY;
        if (newPosY > -10 && newPosY + paddleHeight < canvas.height + 10) {
            rightPaddleY = newPosY;
        }
    }
}

function drawPaddles() {
    // Ajout d'un gradient aux raquettes
    const paddleGradient = ctx.createLinearGradient(0, 0, 0, paddleHeight);
    paddleGradient.addColorStop(0, '#12c2e9');
    paddleGradient.addColorStop(1, '#c471ed');
    ctx.fillStyle = paddleGradient;

    ctx.fillRect(0, leftPaddleY, paddleWidth, paddleHeight); // Raquette gauche
    ctx.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight); // Raquette droite
}

function drawBall() {
    // Dessinez la balle avec une ombre portée pour un effet lumineux
    const ballWidth = 40; // Largeur de la balle
    const ballHeight = 40; // Hauteur de la balle
    // if (ballImage.complete) {
    //     ctx.drawImage(ballImage, ballX - ballWidth / 2, ballY - ballHeight / 2, ballWidth, ballHeight);
    // } else {
    //     ballImage.onload = () => {
    //         ctx.drawImage(ballImage, ballX - ballWidth / 2, ballY - ballHeight / 2, ballWidth, ballHeight);
    //     };
    // }
    ctx.beginPath();
    ctx.arc(ballX, ballY, 10, 0, Math.PI * 2, true); // Dessiner un cercle pour la balle
    // Créer un dégradé pour la balle
    let gradient = ctx.createRadialGradient(ballX, ballY, 1, ballX, ballY, 10);
    gradient.addColorStop(0, '#FFD700'); // Doré au centre
    gradient.addColorStop(1, '#FF8C00');
    ctx.fillStyle = gradient;
    ctx.fill();
}

function drawScore() {
    ctx.font = '28px "Courier New", Courier, monospace';
    ctx.fillStyle = '#ffffff'; // Couleur dorée stylisée

    const scoreLeftText = `Joueur Gauche: ${scoreLeft}`;
    const scoreRightText = `Joueur Droit: ${scoreRight}`;

    // Calculer la largeur du texte pour le positionner
    const scoreLeftWidth = ctx.measureText(scoreLeftText).width;
    const scoreRightWidth = ctx.measureText(scoreRightText).width;

    // Dessiner le score centré sur le canvas
    ctx.fillText(scoreLeftText, (canvas.width / 4) - (scoreLeftWidth / 2), 30);
    ctx.fillText(scoreRightText, (3 * canvas.width / 4) - (scoreRightWidth / 2), 30);
}

function endGame() {
    // Si la balle touche le bord droit, le joueur gauche marque un point
    if (ballX >= canvas.width) {
        scoreLeft++;
    }
    // Si la balle touche le bord gauche, le joueur droit marque un point
    else if (ballX <= 0) {
        scoreRight++;
    }

    // Envoyer le score mis à jour au serveur
    socket.emit('updateScore', { scoreLeft, scoreRight, roomId: currentRoomId });

    if (scoreLeft >= scoreMax || scoreRight >= scoreMax) {
        isGameStarted = false
        displayGameOver();
    } else {
        resetBall();
    }
}

function displayGameOver() {
    const winnerText = scoreLeft >= scoreMax ? 'Joueur Gauche gagne!' : 'Joueur Droit gagne!';
    ctx.font = '28px "Courier New", Courier, monospace';
    ctx.fillStyle = '#FFD700';
    const textWidth = ctx.measureText(winnerText).width;

    // Centrer le texte sur le canvas
    ctx.fillText(winnerText, (canvas.width / 2) - (textWidth / 2), canvas.height / 2);

    createQuitButton();
}

function createQuitButton() {
    if (!document.getElementById('quitBtn')) {
        const quitBtn = document.createElement('button');
        quitBtn.id = 'quitBtn';
        quitBtn.textContent = 'Quitter le jeu';
        quitBtn.style.cssText = 'padding: 10px 20px; font-size: 16px; color: #fff; background-color: #FF8C00; border: 2px solid #FFD700; border-radius: 5px; cursor: pointer; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); position: absolute; top: 65%; left: 50%; transform: translate(-50%, -50%);';
        quitBtn.onclick = () => window.location.href = '/';
        document.body.appendChild(quitBtn);
    }
}

function checkBallBounds() {
    // Rebond sur les bords supérieur et inférieur
    if (ballY <= 0 || ballY >= canvas.height) {
        ballSpeedY = -ballSpeedY;
    }

    // Rebond sur les bords gauche et droit
    if (ballX <= 0 || ballX >= canvas.width) {
        endGame(); // Gérer la fin du jeu
        resetBall(); // Réinitialiser la position de la balle
    }
}

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    // Choisissez de réinitialiser ou d'inverser la direction de la balle
    ballSpeedX = -ballSpeedX;
    ballSpeedY = -ballSpeedY;
}

function checkPaddleCollision() {
    if ((ballX <= paddleWidth && ballY >= leftPaddleY && ballY <= leftPaddleY + paddleHeight) ||
        (ballX >= canvas.width - paddleWidth && ballY >= rightPaddleY && ballY <= rightPaddleY + paddleHeight)) {
        ballSpeedX = -ballSpeedX;
    }
}

function draw() {
    if (!isGameStarted) {
        return; // Arrête la boucle de dessin si le jeu est terminé
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaddles();
    drawBall();
    drawScore();

    ballX += ballSpeedX;
    ballY += ballSpeedY;
    checkBallBounds();
    checkPaddleCollision();
    sendBallPosition();

    requestAnimationFrame(draw);
}

draw();