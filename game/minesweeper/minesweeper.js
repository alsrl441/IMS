const BOARD_SIZE = 16;
const MINE_COUNT = 40; 
let board = [];
let mines = [];
let revealedCount = 0;
let gameOver = false;
let timer = 0;
let timerInterval = null;

const boardEl = document.getElementById('board');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

function initGame() {
    board = [];
    mines = [];
    revealedCount = 0;
    gameOver = false;
    timer = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    timerEl.innerText = '0';
    mineCountEl.innerText = MINE_COUNT;
    statusEl.innerText = "\u{1F60A}";
    boardEl.innerHTML = '';

    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`; 
    boardEl.style.width = `${BOARD_SIZE * 30}px`; 

    // 보드 생성
    for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            cell.style.width = '30px';
            cell.style.height = '30px';
            cell.style.fontSize = '18px';

            cell.addEventListener('click', () => handleClick(r, c));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(r, c);
            });
            
            boardEl.appendChild(cell);
            board[r][c] = {
                el: cell,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            };
        }
    }

    // 지뢰 배치
    let placedMines = 0;
    while (placedMines < MINE_COUNT) {
        let r = Math.floor(Math.random() * BOARD_SIZE);
        let c = Math.floor(Math.random() * BOARD_SIZE);
        if (!board[r][c].isMine) {
            board[r][c].isMine = true;
            mines.push([r, c]);
            placedMines++;
        }
    }

    // 인접 지뢰 개수 계산
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc].isMine) {
                        count++;
                    }
                }
            }
            board[r][c].neighborMines = count;
        }
    }
}

function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timer++;
            timerEl.innerText = timer;
        }, 1000);
    }
}

function handleClick(r, c) {
    if (gameOver || board[r][c].isRevealed || board[r][c].isFlagged) return;

    startTimer();

    if (board[r][c].isMine) {
        endGame(false);
        return;
    }

    reveal(r, c);

    if (revealedCount === BOARD_SIZE * BOARD_SIZE - MINE_COUNT) {
        endGame(true);
    }
}

function handleRightClick(r, c) {
    if (gameOver || board[r][c].isRevealed) return;
    startTimer();
    
    board[r][c].isFlagged = !board[r][c].isFlagged;
    board[r][c].el.classList.toggle('flag');
    board[r][c].el.innerText = board[r][c].isFlagged ? "\u{1F6A9}" : '';
    
    let flags = document.querySelectorAll('.flag').length;
    mineCountEl.innerText = MINE_COUNT - flags;
}

function reveal(r, c) {
    let cell = board[r][c];
    if (cell.isRevealed) return;

    cell.isRevealed = true;
    cell.el.classList.add('revealed');
    revealedCount++;

    if (cell.neighborMines > 0) {
        cell.el.innerText = cell.neighborMines;
        cell.el.classList.add('n' + cell.neighborMines);
    } else {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                    reveal(nr, nc);
                }
            }
        }
    }
}

function endGame(isWin) {
    gameOver = true;
    clearInterval(timerInterval);
    statusEl.innerText = isWin ? "\u{1F60E}" : "\u{1F635}";
    
    mines.forEach(([r, c]) => {
        board[r][c].el.classList.add('revealed', 'mine');
        board[r][c].el.innerText = "\u{1F4A3}";
    });

    //if (isWin) alert("축하합니다! 모든 지뢰를 찾았습니다.");
}

resetBtn.addEventListener('click', initGame);
statusEl.addEventListener('click', initGame);

initGame();