const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('start-btn');

context.scale(30, 30);
nextContext.scale(20, 20);
holdContext.scale(20, 20);

const colors = [null, '#9b59b6', '#f1c40f', '#e67e22', '#2980b9', '#1abc9c', '#2ecc71', '#e74c3c'];

// IndexedDB 초기화
let db;
const dbRequest = indexedDB.open("gameDB", 1);

dbRequest.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("tetris")) {
        db.createObjectStore("tetris", { keyPath: "id", autoIncrement: true });
    }
};

dbRequest.onsuccess = function(event) {
    db = event.target.result;
    window.tetrisDB = db; // 개발자 도구 콘솔에서 접근 가능하도록 노출
    renderRankings();
};

function saveScore(name, score) {
    const transaction = db.transaction(["tetris"], "readwrite");
    const store = transaction.objectStore("tetris");
    const date = new Date().toLocaleDateString();
    store.add({ name, score, date });

    transaction.oncomplete = function() {
        renderRankings();
    };
}

function renderRankings() {
    const transaction = db.transaction(["tetris"], "readonly");
    const store = transaction.objectStore("tetris");
    const request = store.getAll();

    request.onsuccess = function() {
        const rankings = request.result;
        rankings.sort((a, b) => b.score - a.score);
        
        const top3 = rankings.slice(0, 3);
        const list = document.getElementById('ranking-list');
        list.innerHTML = '';

        if (top3.length === 0) {
            list.innerHTML = '<tr><td colspan="3" class="text-secondary py-3">기록이 없습니다. 첫 랭커가 되어보세요!</td></tr>';
            return;
        }

        top3.forEach((rank, index) => {
            const tr = document.createElement('tr');
            tr.classList.add('top-rank');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${rank.name}</td>
                <td>${rank.score.toLocaleString()}</td>
            `;
            list.appendChild(tr);
        });
    };
}

async function checkTop3(score) {
    return new Promise((resolve) => {
        const transaction = db.transaction(["tetris"], "readonly");
        const store = transaction.objectStore("tetris");
        const request = store.getAll();

        request.onsuccess = function() {
            const rankings = request.result;
            rankings.sort((a, b) => b.score - a.score);
            if (rankings.length < 3 || score > rankings[2].score) {
                resolve(true);
            } else {
                resolve(false);
            }
        };
    });
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function createPiece(type) {
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    if (type === 'O') return [[2, 2], [2, 2]];
    if (type === 'L') return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
    if (type === 'J') return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
    if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context);
}

function drawSideCanvas() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawMatrix(player.next, {x: 0.5, y: 0.5}, nextContext);

    holdContext.fillStyle = '#000';
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (player.hold) {
        drawMatrix(player.hold, {x: 0.5, y: 0.5}, holdContext);
    }
}

function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                ctx.lineWidth = 0.05;
                ctx.strokeStyle = 'white';
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;
    }
    updateScore();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (!player.next) {
        player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    }
    
    player.matrix = player.next;
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    player.canHold = true;

    if (collide(arena, player)) {
        gameRunning = false;
        arena.forEach(row => row.fill(0));
        updateScore();
        
        const finalScore = player.score;
        checkTop3(finalScore).then(isTop3 => {
            if (isTop3 && finalScore > 0) {
                const name = prompt(`축하합니다! TOP 3 기록을 달성했습니다!\n\n점수: ${finalScore}\n이름을 입력해주세요 (취소 시 저장되지 않습니다):`);
                if (name && name.trim() !== "") {
                    saveScore(name.trim(), finalScore);
                } else {
                    alert(`게임 오버!\n\n점수: ${finalScore}`);
                }
            } else {
                alert(`게임 오버!\n\n점수: ${finalScore}`);
            }
            
            startBtn.disabled = false;
            startBtn.innerText = "다시 시작";
        });
    }
    drawSideCanvas();
}

function playerHold() {
    if (!player.canHold) return;
    
    if (!player.hold) {
        player.hold = player.matrix;
        playerReset();
    } else {
        const temp = player.matrix;
        player.matrix = player.hold;
        player.hold = temp;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    }
    
    player.canHold = false;
    drawSideCanvas();
}

function updateScore() {
    scoreElement.innerText = player.score;
}

let dropCounter = 0;
let dropInterval = 1200;
let lastTime = 0;
let gameRunning = false;

function update(time = 0) {
    if (!gameRunning) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) playerDrop();
    if (dropInterval > 200) dropInterval = dropInterval - 0.05;
    draw();
    requestAnimationFrame(update);
}

const arena = createMatrix(12, 20);
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    next: null,
    hold: null,
    canHold: true,
    score: 0
};

document.addEventListener('keydown', event => {
    if (!gameRunning) return;
    if (event.keyCode === 37) playerMove(-1);       // ←
    else if (event.keyCode === 39) playerMove(1);   // →
    else if (event.keyCode === 40) playerDrop();    // ↓
    else if (event.keyCode === 38) playerRotate(1); // ↑
    else if (event.keyCode === 67) playerHold();    // C
    else if (event.keyCode === 32) {                // space
        while (!collide(arena, player)) player.pos.y++;
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
});

startBtn.addEventListener('click', () => {
    arena.forEach(row => row.fill(0));
    player.hold = null;
    player.next = null;
    player.score = 0;
    gameRunning = true;
    playerReset();
    updateScore();
    update();
    startBtn.disabled = true;
    startBtn.innerText = "게임 진행 중";
});
