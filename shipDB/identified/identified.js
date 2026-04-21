const TARGET_STORE_NAME = "identified_ships";

const defaultShipData = {
    id: "SHIP-001",
    name: "Unknown Vessel",
    type: "Cargo",
    lastSeen: new Date().toISOString(),
    status: "Identified"
};

async function initIdentifiedShips() {
    try {
        await window.ensureStore(TARGET_STORE_NAME, "id");
        
        let ships = await window.getDBData(TARGET_STORE_NAME);
        
        if (ships.length === 0) {
            console.log("초기 데이터가 없어 기본 양식을 생성합니다.");
            await window.putDBData(TARGET_STORE_NAME, defaultShipData);
            ships = [defaultShipData];
        }
        
        console.log("로드된 선박 데이터:", ships);
        renderShips(ships);
    } catch (err) {
        console.error("초기화 중 오류 발생:", err);
    }
}

function renderShips(ships) {
    const listContainer = document.getElementById('ship-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = ships.map(ship => `
        <div class="ship-item">
            <strong>${ship.name}</strong> (${ship.id}) - ${ship.type}
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', initIdentifiedShips);
