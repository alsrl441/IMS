const DB_NAME = "IMS_database";

/**
 * 특정 스토어가 존재하는지 확인하고, 없으면 버전을 올려서 생성한다.
 * @param {string} storeName - 생성할 스토어 이름
 * @param {string|null} keyPath - 키 경로 (필요한 경우)
 * @returns {Promise} - 스토어 준비 완료 시 resolve
 */
window.ensureStore = function(storeName, keyPath = null) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains(storeName)) {
                db.close();
                resolve();
                return;
            }
            
            const version = db.version;
            db.close();
            
            // 버전을 올려서 다시 열기 (onupgradeneeded 호출 유도)
            const upgradeReq = indexedDB.open(DB_NAME, version + 1);
            upgradeReq.onupgradeneeded = (ev) => {
                const upDb = ev.target.result;
                if (!upDb.objectStoreNames.contains(storeName)) {
                    const options = keyPath ? { keyPath } : {};
                    upDb.createObjectStore(storeName, options);
                    console.log(`[Database] Store '${storeName}' created.`);
                }
            };
            upgradeReq.onsuccess = (ev) => {
                ev.target.result.close();
                resolve();
            };
            upgradeReq.onerror = (ev) => reject(ev.target.error);
            upgradeReq.onblocked = () => {
                console.warn("Database upgrade blocked. Please close other tabs.");
                reject("blocked");
            };
        };
        request.onerror = (e) => reject(e.target.error);
    });
};

function updateClock() {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const day = days[now.getDay()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        clockEl.innerText = `${year}-${month}-${date}(${day}) ${hours}:${minutes}:${seconds}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 이제 initDatabase() 같은 하드코딩된 호출은 하지 않음.
    // 각 페이지(JS)에서 본인이 필요한 store를 ensureStore()로 요청함.
    setInterval(updateClock, 1000);
    updateClock();
});
