function initDatabase() {
    const DB_NAME = "IMS_database";
    const DB_VERSION = 1;

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // 필요한 모든 스토어 생성
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
...
document.addEventListener('DOMContentLoaded', () => {
    initDatabase();
    setInterval(updateClock, 1000);
    updateClock();
});
