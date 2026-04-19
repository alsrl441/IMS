function initDatabase() {
    const DB_NAME = "IMS_database";

    // 1. 우선 버전을 명시하지 않고 열어서 현재 버전을 확인함
    const request = indexedDB.open(DB_NAME);

    request.onsuccess = (e) => {
        const db = e.target.result;
        const currentVersion = db.version;
        
        // 필요한 스토어 목록
        const requiredStores = ["menu", "workSchedule", "members", "identified_ships", "unidentified_ships"];
        const missingStores = requiredStores.filter(s => !db.objectStoreNames.contains(s));

        // 마이그레이션 대상 확인 (기존 'ship' 스토어)
        const needsMigration = db.objectStoreNames.contains("ship");

        // 만약 스토어가 하나라도 없거나 마이그레이션이 필요하면 버전을 올려서 다시 열기
        if (missingStores.length > 0 || needsMigration) {
            console.log(`Database update needed. Missing: ${missingStores.join(", ")}, Migration: ${needsMigration}`);
            db.close();
            upgradeDatabase(DB_NAME, currentVersion + 1);
        } else {
            console.log(`Database is up to date (Version: ${currentVersion}).`);
            db.close();
        }
    };

    request.onerror = (e) => {
        console.error("Database open error:", e.target.error);
    };
}

function upgradeDatabase(name, version) {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        const tx = e.target.transaction;
        
        // 1. menu 스토어 및 초기 양식
        if (!db.objectStoreNames.contains("menu")) {
            const store = db.createObjectStore("menu", { keyPath: "date" });
            const initialMenuTemplate = {
                "date": "0000-00-00", // 예시: "2026-04-18"
                "breakfast": "",      // 예시: "메뉴1, 메뉴2"
                "lunch": "",          
                "dinner": "",         
                "brunch": ""          
            };
            store.put(initialMenuTemplate);
        }

        // 2. workSchedule 스토어 및 초기 양식
        if (!db.objectStoreNames.contains("workSchedule")) {
            const store = db.createObjectStore("workSchedule", { keyPath: "date" });
            const initialWorkTemplate = {
                "date": "0000-00-00", // 예시: "2026-03-31"
                "isHoliday": false,
                "cctv": [
                    { "shift": "06-14", "p1": "", "p2": "" }, // p1, p2 예시: "홍길동"
                    { "shift": "14-22", "p1": "", "p2": "" },
                    { "shift": "22-06", "p1": "", "p2": "" }
                ],
                "tod": [
                    { "location": "고하도", "p1": "", "p2": "" },
                    { "location": "외기 평시", "p1": "", "p2": "" },
                    { "location": "외기 핵취", "p1": "", "p2": "" }
                ]
            };
            store.put(initialWorkTemplate);
        }

        // 3. members 스토어 및 초기 양식
        if (!db.objectStoreNames.contains("members")) {
            const store = db.createObjectStore("members", { keyPath: "id" });
            const initialMemberTemplate = {
                "id": "0",
                "name": "",        // 예시: "홍길동"
                "nickName": "",    // 예시: "길동이"
                "start": "0000-00-00", // 입대일
                "end": "0000-00-00",   // 전역일
                "vacation": "0000-00-00", // 다음 휴가일
                "promotion": { "pfc2cpl": 0, "cpl2sgt": 0 } // 진급 점수 등
            };
            store.put(initialMemberTemplate);
        }

        // 4. identified_ships 스토어 및 초기 양식
        if (!db.objectStoreNames.contains("identified_ships")) {
            const store = db.createObjectStore("identified_ships");
            const initialShipTemplate = {
                "name": "",     // 예시: "아라호"
                "tonnage": "",  // 예시: "2톤"
                "type": "",     // 예시: "어선"
                "number": "",   // 예시: "1234567-1234567"
                "tel": "",      // 예시: "010-1234-5678 (홍길동)"
                "tags": [],     // 예시: ["흰색 선체", "그물 적재"]
                "history": [
                    {
                        "date": "0000-00-00",
                        "firstTime": "00:00",
                        "firstPos": "",
                        "lastTime": "00:00",
                        "lastPos": "",
                        "crewCount": 0,
                        "handover": "",
                        "worker": "",
                        "telephonee": "",
                        "shipImage": "Images/no-image.jpg",
                        "pathImage": "Images/no-image.jpg"
                    }
                ]
            };
            store.put(initialShipTemplate, "template_key");
        }

        // 5. unidentified_ships 스토어
        if (!db.objectStoreNames.contains("unidentified_ships")) {
            db.createObjectStore("unidentified_ships");
        }

        // 마이그레이션 로직
        if (db.objectStoreNames.contains("ship")) {
            console.log("Migrating data from 'ship' to new stores...");
            const oldStore = tx.objectStore("ship");
            const identifiedStore = tx.objectStore("identified_ships");
            const unidentifiedStore = tx.objectStore("unidentified_ships");

            oldStore.openCursor().onsuccess = (ev) => {
                const cursor = ev.target.result;
                if (cursor) {
                    const data = cursor.value;
                    const targetStore = (data.name === "식별불가") ? unidentifiedStore : identifiedStore;
                    targetStore.put(data, cursor.key);
                    cursor.continue();
                } else {
                    console.log("Migration complete. Deleting old 'ship' store.");
                    db.deleteObjectStore("ship");
                }
            };
        }
        
        console.log(`Database upgraded to version ${version}.`);
    };

    request.onsuccess = (e) => {
        e.target.result.close();
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
