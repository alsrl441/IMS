function initDatabase() {
    const DB_NAME = "IMS_database";
    const DB_VERSION = 1;

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        if (!db.objectStoreNames.contains("menu")) {
            db.createObjectStore("menu", { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains("workSchedule")) {
            db.createObjectStore("workSchedule", { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains("members")) {
            db.createObjectStore("members", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("ships")) {
            db.createObjectStore("ships", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("shipTrace")) {
            db.createObjectStore("shipTrace", { keyPath: "id" });
        }
        console.log("Database stores initialized.");
    };

    request.onsuccess = () => {
        console.log("Database opened successfully.");
    };

    request.onerror = (e) => {
        console.error("Database error:", e.target.error);
    };
}

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
    initDatabase();
    setInterval(updateClock, 1000);
    updateClock();
});
