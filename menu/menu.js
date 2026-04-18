async function updateMenu() {
    const mealTypeEl = document.getElementById('meal-type');
    const menuDisplayEl = document.getElementById('menu-display');
    const searchDateInput = document.getElementById('search-date');
    const searchMealSelect = document.getElementById('search-meal');

    const DB_NAME = "myDB";
    const STORE_NAME = "menu";

    function getMenuFromDB(dateStr) {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "date" });
                }
            };

            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    resolve(null);
                    return;
                }
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);
                const getReq = store.get(dateStr);
                getReq.onsuccess = () => resolve(getReq.result || null);
                getReq.onerror = () => resolve(null);
            };
            request.onerror = () => resolve(null);
        });
    }

    const getFormattedDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    async function setAutoMenu() {
        const now = new Date();
        const timeVal = now.getHours() * 100 + now.getMinutes();
        const todayStr = getFormattedDate(now);
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = getFormattedDate(tomorrowObj);

        let targetDateStr = todayStr;
        let mealKey = "";
        let displayLabel = "";
        const isSunday = now.getDay() === 0;

        if (isSunday) {
            if (timeVal < 1130) { displayLabel = "오늘 브런치"; mealKey = "brunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { 
                const nextIsSunday = tomorrowObj.getDay() === 0;
                displayLabel = "내일 " + (nextIsSunday ? "브런치" : "아침");
                mealKey = nextIsSunday ? "brunch" : "breakfast";
                targetDateStr = tomorrowStr;
            }
        } else {
            if (timeVal < 800) { displayLabel = "오늘 아침"; mealKey = "breakfast"; }
            else if (timeVal < 1230) { displayLabel = "오늘 점심"; mealKey = "lunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { 
                const nextIsSunday = tomorrowObj.getDay() === 0;
                displayLabel = "내일 " + (nextIsSunday ? "브런치" : "아침");
                mealKey = nextIsSunday ? "brunch" : "breakfast";
                targetDateStr = tomorrowStr;
            }
        }

        const menuData = await getMenuFromDB(targetDateStr);

        if (menuData) {
            mealTypeEl.innerText = displayLabel;
            menuDisplayEl.innerText = menuData[mealKey] || "식단 정보가 없습니다.";
        } else {
            mealTypeEl.innerText = "정보 없음";
            menuDisplayEl.innerText = "식단 정보가 없습니다.";
        }

        if (searchDateInput) searchDateInput.value = targetDateStr;
        if (searchMealSelect) searchMealSelect.value = mealKey;
    }

    async function searchMenu() {
        const dateStr = searchDateInput.value;
        const mealKey = searchMealSelect.value;
        const menuData = await getMenuFromDB(dateStr);
        
        const mealNames = { breakfast: "아침", lunch: "점심", dinner: "저녁", brunch: "브런치" };
        mealTypeEl.innerText = `${dateStr} ${mealNames[mealKey]}`;
        menuDisplayEl.innerText = menuData?.[mealKey] || "식단 정보가 없습니다.";
    }

    if (mealTypeEl) {
        mealTypeEl.addEventListener('click', () => {
            const ui = document.getElementById('menu-search-ui');
            if (ui) ui.classList.toggle('hidden');
        });
    }

    if (searchDateInput) searchDateInput.addEventListener('change', searchMenu);
    if (searchMealSelect) searchMealSelect.addEventListener('change', searchMenu);

    await setAutoMenu();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateMenu();
} else {
    document.addEventListener('DOMContentLoaded', updateMenu);
}
