const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 600;

// UI 요소
const hpBar = document.getElementById('hp-bar');
const expBar = document.getElementById('exp-bar');
const lvlTxt = document.getElementById('lvl');
const killsTxt = document.getElementById('kills');
const upgradeModal = document.getElementById('upgrade-modal');
const upgradeList = document.getElementById('upgrade-list');
const invWeaponSlots = document.querySelectorAll('#inv-weapons .inv-slot');
const invPassiveSlots = document.querySelectorAll('#inv-passives .inv-slot');

console.log("\u{1F47E}");
console.log("\u{1F9DF}");
console.log("\u{1F480}");
console.log("\u{1F9DB}");
console.log("\u{1F43A}");
console.log("\u{1F47B}");
console.log("\u{1F987}");
console.log("\u{1F479}");
console.log("\u{1F5E1}\u{FE0F}");
console.log("\u{1F52B}");
console.log("\u{1F525}");
console.log("\u{1F9FF}");
console.log("\u{2735}");
console.log("\u{1F52B}");
console.log("\u{2604}");
console.log("\u{1F300}");
console.log("\u{1F3F9}");
console.log("\u{1F531}");
console.log("\u{1F94A}");
console.log("\u2764");
console.log("\u{1F45F}");
console.log("\u{1F393}");
console.log("\u23F3");

// 게임 상태
let gameActive = false;
let isPaused = false;
let lastTimestamp = 0;
let level = 1;
let exp = 0;
let nextLevelExp = 100;
let kills = 0;
let gameTime = 0;

const camera = { x: 0, y: 0 };
const player = {
    worldX: 0, worldY: 0,
    hp: 100, maxHp: 100, speed: 4,
    atkPower: 1, // 공격력 배율
    emoji: '\u{1F9D4}', weapons: [], passives: [] // 🧔
};

const keys = {};
let isMouseDown = false;
let mousePos = { x: 300, y: 300 };

let enemies = [];
let projectiles = [];
let items = [];

// 업그레이드 데이터 및 조합법
const UPGRADES = {
    'DAGGER': { id: 'DAGGER', name: '단검', emoji: '\uD83D\uDDE1', desc: '가까운 적 투척', cooldown: 800, damage: 20 }, // 🗡️
    'GUN': { id: 'GUN', name: '권총', emoji: '\u{1F52B}', desc: '랜덤한 적 발사', cooldown: 1200, damage: 35 }, // 🔫
    'FIELD': { id: 'FIELD', name: '자기장', emoji: '\u{1F9FF}', desc: '주변 지속 피해', cooldown: 500, damage: 5, range: 120 }, // 🧿
    'SPD': { id: 'SPD', name: '신발', emoji: '\u{1F45F}', desc: '이동 속도 +15%', type: 'passive' }, // 👟
    'ATK': { id: 'ATK', name: '장갑', emoji: '\u{1F94A}', desc: '공격력 +20%', type: 'passive' } // 🥊
};

// 조합(진화) 정의
const EVOLUTIONS = [
    { materials: ['DAGGER', 'SPD'], result: { id: 'SHURIKEN', name: '수리검', emoji: '', desc: '관통하는 얼음 수리검', cooldown: 400, damage: 30, pierce: true } }, // ❄️
    { materials: ['GUN', 'ATK'], result: { id: 'MACHINEGUN', name: '기관총', emoji: '', desc: '초고속 연사', cooldown: 150, damage: 15 } } // 🏎️
];

class Enemy {
    constructor(x, y) {
        this.worldX = x; this.worldY = y;
        this.hp = 20 + (level * 5);
        this.speed = 0.8 + (Math.random() * 0.4);
    }
    update() {
        const dx = player.worldX - this.worldX;
        const dy = player.worldY - this.worldY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist > 0) {
            this.worldX += (dx/dist) * this.speed;
            this.worldY += (dy/dist) * this.speed;
        }
    }
    draw() {
        ctx.font = '25px Arial';
        ctx.fillText('\u{1F47E}', this.worldX - camera.x - 12, this.worldY - camera.y + 12); // 👾
    }
}

class Projectile {
    constructor(x, y, tx, ty, wp) {
        this.worldX = x; this.worldY = y;
        const dx = tx - x; const dy = ty - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        this.vx = (dx/dist) * 8; this.vy = (dy/dist) * 8;
        this.active = true;
        this.emoji = wp.emoji;
        this.damage = wp.damage * player.atkPower;
        this.pierce = wp.pierce || false;
    }
    update() {
        this.worldX += this.vx; this.worldY += this.vy;
        if(Math.abs(this.worldX - player.worldX) > 700) this.active = false;
    }
    draw() {
        ctx.font = '20px Arial';
        ctx.fillText(this.emoji, this.worldX - camera.x - 10, this.worldY - camera.y + 10);
    }
}

function update(dt) {
    if(!gameActive || isPaused) return;
    gameTime += dt;

    // 플레이어 이동
    let mx = 0, my = 0;
    if(keys['ArrowUp'] || keys['w'] || keys['W']) my -= 1;
    if(keys['ArrowDown'] || keys['s'] || keys['S']) my += 1;
    if(keys['ArrowLeft'] || keys['a'] || keys['A']) mx -= 1;
    if(keys['ArrowRight'] || keys['d'] || keys['D']) mx += 1;

    if(isMouseDown) {
        const dx = mousePos.x - 300; const dy = mousePos.y - 300;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist > 15) { mx = dx/dist; my = dy/dist; }
    }

    if(mx !== 0 || my !== 0) {
        const mag = Math.sqrt(mx*mx + my*my);
        player.worldX += (mx/mag) * player.speed;
        player.worldY += (my/mag) * player.speed;
    }

    camera.x = player.worldX - 300;
    camera.y = player.worldY - 300;

    // 몬스터 로직
    enemies.forEach((e, i) => {
        e.update();
        if(Math.sqrt((player.worldX-e.worldX)**2 + (player.worldY-e.worldY)**2) < 25) {
            player.hp -= 0.3;
            if(player.hp <= 0) gameOver();
        }
    });

    // 투사체 로직
    projectiles.forEach((p, pi) => {
        p.update();
        enemies.forEach((e, ei) => {
            if(Math.sqrt((p.worldX-e.worldX)**2 + (p.worldY-e.worldY)**2) < 25) {
                e.hp -= p.damage;
                if(!p.pierce) p.active = false; // 관통 무기가 아니면 소멸
                if(e.hp <= 0) { 
                    kills++; 
                    items.push({x: e.worldX, y: e.worldY}); 
                    enemies.splice(ei, 1); 
                }
            }
        });
        if(!p.active) projectiles.splice(pi, 1);
    });

    // 아이템 습득
    items.forEach((it, i) => {
        if(Math.sqrt((player.worldX-it.x)**2 + (player.worldY-it.y)**2) < 30) {
            exp += 35;
            if(exp >= nextLevelExp) levelUp();
            items.splice(i, 1);
        }
    });

    // 스폰
    if(Math.random() < 0.04 && enemies.length < 30) {
        const ang = Math.random()*Math.PI*2;
        enemies.push(new Enemy(player.worldX + Math.cos(ang)*450, player.worldY + Math.sin(ang)*450));
    }

    weaponManager();
    updateUI();
}

function weaponManager() {
    player.weapons.forEach(wp => {
        if(!wp.lastAtk) wp.lastAtk = 0;
        if(gameTime - wp.lastAtk > wp.cooldown) {
            
            if(wp.id === 'FIELD') {
                // 자기장: 주변 적 모두에게 피해
                enemies.forEach(e => {
                    const d = Math.sqrt((player.worldX-e.worldX)**2 + (player.worldY-e.worldY)**2);
                    if(d < wp.range) {
                        e.hp -= wp.damage * player.atkPower;
                        if(e.hp <= 0) { kills++; items.push({x: e.worldX, y: e.worldY}); enemies.splice(enemies.indexOf(e), 1); }
                    }
                });
                wp.lastAtk = gameTime;
            } else if(enemies.length > 0) {
                // 발사형 무기들
                let target = enemies[0];
                if(wp.id === 'DAGGER' || wp.id === 'SHURIKEN') {
                    let minDist = 999;
                    enemies.forEach(e => {
                        let d = Math.sqrt((player.worldX-e.worldX)**2 + (player.worldY-e.worldY)**2);
                        if(d < minDist) { minDist = d; target = e; }
                    });
                } else {
                    target = enemies[Math.floor(Math.random()*enemies.length)];
                }
                projectiles.push(new Projectile(player.worldX, player.worldY, target.worldX, target.worldY, wp));
                wp.lastAtk = gameTime;
            }
        }
    });
}

function updateUI() {
    lvlTxt.innerText = level;
    killsTxt.innerText = kills;
    hpBar.style.width = Math.max(0, player.hp) + '%';
    expBar.style.width = Math.min(100, (exp / nextLevelExp * 100)) + '%';
}

function draw() {
    ctx.clearRect(0, 0, 600, 600);
    
    // 배경 그리드
    ctx.strokeStyle = '#1a1a1a';
    ctx.beginPath();
    for(let x=-camera.x%50; x<600; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,600); }
    for(let y=-camera.y%50; y<600; y+=50) { ctx.moveTo(0,y); ctx.lineTo(600,y); }
    ctx.stroke();

    // 자기장 효과 그리기
    const field = player.weapons.find(w => w.id === 'FIELD');
    if(field) {
        ctx.beginPath();
        ctx.arc(300, 300, field.range, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(77, 184, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    items.forEach(it => { ctx.font = '15px Arial'; ctx.fillText('💎', it.x-camera.x-8, it.y-camera.y+8); });
    enemies.forEach(e => e.draw());
    projectiles.forEach(p => p.draw());
    
    ctx.font = '35px Arial';
    ctx.fillText(player.emoji, 300-17, 300+17);
}

function levelUp() {
    isPaused = true;
    exp -= nextLevelExp;
    nextLevelExp = Math.floor(nextLevelExp * 1.3);
    showUpgrade();
}

function showUpgrade() {
    upgradeModal.style.display = 'flex';
    upgradeList.innerHTML = '';
    
    // 현재 보유한 것들 기반으로 조합 가능한지 체크 포함
    const pool = Object.values(UPGRADES);
    const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 3);

    shuffled.forEach(upg => {
        const d = document.createElement('div');
        d.className = 'upgrade-item';
        d.innerHTML = `
            <span style="font-size:1.5rem">${upg.emoji}</span>
            <div class="upgrade-info">
                <span class="upgrade-name">${upg.name}</span>
                <span class="upgrade-desc">${upg.desc}</span>
            </div>`;
        d.onclick = () => selectUpgrade(upg);
        upgradeList.appendChild(d);
    });
}

function selectUpgrade(upg) {
    if(upg.type === 'passive') {
        const existing = player.passives.find(p => p.id === upg.id);
        if(!existing) player.passives.push({...upg});
        
        if(upg.id === 'SPD') player.speed += 0.6;
        if(upg.id === 'ATK') player.atkPower += 0.2;
    } else {
        const existing = player.weapons.find(w => w.id === upg.id);
        if(existing) {
            existing.damage *= 1.2;
            existing.cooldown *= 0.9;
        } else {
            player.weapons.push({...upg});
        }
    }
    
    checkEvolution(); // 무기를 얻을 때마다 진화 체크
    updateInventoryUI();
    level++;
    isPaused = false;
    upgradeModal.style.display = 'none';
}

function checkEvolution() {
    EVOLUTIONS.forEach(evo => {
        const hasAllMaterials = evo.materials.every(mId => 
            player.weapons.some(w => w.id === mId) || player.passives.some(p => p.id === mId)
        );

        if(hasAllMaterials) {
            // 재료 무기를 결과 무기로 교체
            const mainWpIdx = player.weapons.findIndex(w => w.id === evo.materials[0]);
            if(mainWpIdx !== -1 && player.weapons[mainWpIdx].id !== evo.result.id) {
                player.weapons[mainWpIdx] = {...evo.result};
                alert(`🎊 진화 성공! [${evo.result.name}] 획득!`);
            }
        }
    });
}

function updateInventoryUI() {
    invWeaponSlots.forEach(s => s.innerText = '');
    invPassiveSlots.forEach(s => s.innerText = '');
    
    player.weapons.forEach((wp, i) => { if(invWeaponSlots[i]) invWeaponSlots[i].innerText = wp.emoji; });
    player.passives.forEach((ps, i) => { if(invPassiveSlots[i]) invPassiveSlots[i].innerText = ps.emoji; });
}

function gameOver() { alert("전사함. 처치: " + kills); location.reload(); }

function gameLoop(ts) {
    if(!lastTimestamp) lastTimestamp = ts;
    update(ts - lastTimestamp);
    draw();
    lastTimestamp = ts;
    requestAnimationFrame(gameLoop);
}

// 입력 처리
window.onkeydown = e => keys[e.key] = true;
window.onkeyup = e => keys[e.key] = false;
const setMouse = e => {
    const r = canvas.getBoundingClientRect();
    const c = e.touches ? e.touches[0] : e;
    mousePos = { x: c.clientX - r.left, y: c.clientY - r.top };
};
canvas.onmousedown = e => { isMouseDown = true; setMouse(e); };
window.onmousemove = e => { if(isMouseDown) setMouse(e); };
window.onmouseup = () => isMouseDown = false;

document.getElementById('start-btn').onclick = () => {
    gameActive = true;
    player.weapons.push({...UPGRADES.DAGGER}); // 시작 무기
    updateInventoryUI();
    document.getElementById('start-btn').style.display = 'none';
    requestAnimationFrame(gameLoop);
};