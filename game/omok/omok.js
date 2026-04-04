const canvas = document.getElementById('omokCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');

const MARGIN = 30;
const CELL_SIZE = 30;
const BOARD_SIZE = 19;
let board = Array.from(Array(BOARD_SIZE), () => Array(BOARD_SIZE).fill(0));
let history = [];
let winningStones = [];
let currentPlayer = 1; // 1: 흑, 2: 백
let gameOver = false;

// 초기화 함수
function init() {
    board = Array.from(Array(BOARD_SIZE), () => Array(BOARD_SIZE).fill(0));
    history = [];
    winningStones = [];
    currentPlayer = 1;
    gameOver = false;
    statusEl.innerText = "흑 차례";
    drawBoard();
}

// 판 그리기
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 격자 그리기
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
        // 가로선
        ctx.beginPath();
        ctx.moveTo(MARGIN, MARGIN + i * CELL_SIZE);
        ctx.lineTo(MARGIN + (BOARD_SIZE - 1) * CELL_SIZE, MARGIN + i * CELL_SIZE);
        ctx.stroke();
        // 세로선
        ctx.beginPath();
        ctx.moveTo(MARGIN + i * CELL_SIZE, MARGIN);
        ctx.lineTo(MARGIN + i * CELL_SIZE, MARGIN + (BOARD_SIZE - 1) * CELL_SIZE);
        ctx.stroke();
    }

    // 돌 그리기
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] !== 0) {
                const isWin = winningStones.some(s => s.x === x && s.y === y);
                drawStone(x, y, board[y][x], isWin);
            }
        }
    }
}

// 개별 돌 그리기
function drawStone(x, y, color, isWinningStone = false) {
    ctx.beginPath();
    ctx.arc(MARGIN + x * CELL_SIZE, MARGIN + y * CELL_SIZE, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = color === 1 ? 'black' : 'white';
    ctx.fill();

    // 승리 시 빨간색 테두리, 평소엔 검은색
    ctx.lineWidth = isWinningStone ? 3 : 1;
    ctx.strokeStyle = isWinningStone ? 'red' : '#333';
    ctx.stroke();
}

// 클릭 이벤트
canvas.addEventListener('click', (e) => {
    if (gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - MARGIN) / CELL_SIZE);
    const y = Math.round((e.clientY - rect.top - MARGIN) / CELL_SIZE);

    // 유효성 검사
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && board[y][x] === 0) {
        board[y][x] = currentPlayer;
        history.push({x, y, player: currentPlayer});

        if (checkWin(x, y, currentPlayer)) {
            drawBoard();
            statusEl.innerText = `${currentPlayer === 1 ? '흑' : '백'} 승리!`;
            gameOver = true;
            return;
        }

        currentPlayer = currentPlayer === 1 ? 2 : 1;
        statusEl.innerText = `${currentPlayer === 1 ? '흑' : '백'} 차례`;
        drawBoard();
    }
});

// 승리 조건 체크 및 좌표 추출
function checkWin(x, y, player) {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (let [dx, dy] of directions) {
        let tempWinningStones = [{x, y}];

        // 정방향 탐색
        let tx = x + dx, ty = y + dy;
        while(tx>=0 && tx<BOARD_SIZE && ty>=0 && ty<BOARD_SIZE && board[ty][tx] === player) {
            tempWinningStones.push({x: tx, y: ty});
            tx += dx; ty += dy;
        }
        // 역방향 탐색
        tx = x - dx; ty = y - dy;
        while(tx>=0 && tx<BOARD_SIZE && ty>=0 && ty<BOARD_SIZE && board[ty][tx] === player) {
            tempWinningStones.push({x: tx, y: ty});
            tx -= dx; ty -= dy;
        }

        // 5목 이상이면 승리
        if (tempWinningStones.length >= 5) {
            winningStones = tempWinningStones;
            return true;
        }
    }
    return false;
}

// 무르기
undoBtn.addEventListener('click', () => {
    if (history.length > 0 && !gameOver) {
        const lastMove = history.pop();
        board[lastMove.y][lastMove.x] = 0;
        currentPlayer = lastMove.player;
        statusEl.innerText = `${currentPlayer === 1 ? '흑' : '백'} 차례`;
        winningStones = [];
        drawBoard();
    }
});

// 다시하기
resetBtn.addEventListener('click', () => {
    if (confirm("다시하시겠습니까?")) {
        init();
    }
});

// 게임 시작
init();
