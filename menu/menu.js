async function updateMenu() {
    const DB_NAME = "IMS_database";
    const STORE_NAME = "menu";

    // 1. 필요한 스토어가 있는지 확인하고 없으면 생성
    await window.ensureStore(STORE_NAME, "date");

    const mealTypeEl = document.getElementById('meal-type');
    const menuDisplayEl = document.getElementById('menu-display');
...
    function getMenuFromDB(dateStr) {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME);

            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);

                // 데이터가 하나도 없는지 확인 (초기 데이터 주입)
                const countReq = store.count();
                countReq.onsuccess = () => {
...
                        const initialMenuTemplate = {
                            "date": "0000-00-00",
                            "breakfast": "",
                            "lunch": "",
                            "dinner": "",
                            "brunch": ""
                        };
                        store.put(initialMenuTemplate);
                        console.log("Initial menu template inserted.");
                    }
                    
                    const getReq = store.get(dateStr);
                    getReq.onsuccess = () => resolve(getReq.result || null);
                    getReq.onerror = () => resolve(null);
                };
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

    function updateMealOptions(dateStr) {
        const date = new Date(dateStr);
        const isSunday = date.getDay() === 0;
        const currentVal = searchMealSelect.value;
        
        searchMealSelect.innerHTML = '';
        
        if (isSunday) {
            const optBrunch = new Option("브런치", "brunch");
            const optDinner = new Option("저녁", "dinner");
            searchMealSelect.add(optBrunch);
            searchMealSelect.add(optDinner);
        } else {
            const optBreakfast = new Option("아침", "breakfast");
            const optLunch = new Option("점심", "lunch");
            const optDinner = new Option("저녁", "dinner");
            searchMealSelect.add(optBreakfast);
            searchMealSelect.add(optLunch);
            searchMealSelect.add(optDinner);
        }

        // 기존 선택값이 새 목록에도 있으면 유지, 없으면 첫 번째 옵션 선택
        const hasValue = Array.from(searchMealSelect.options).some(opt => opt.value === currentVal);
        if (hasValue) {
            searchMealSelect.value = currentVal;
        }
    }

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

        if (searchDateInput) {
            searchDateInput.value = targetDateStr;
            updateMealOptions(targetDateStr);
        }
        
        const menuData = await getMenuFromDB(targetDateStr);

        if (menuData) {
            mealTypeEl.innerText = displayLabel;
            menuDisplayEl.innerText = menuData[mealKey] || "식단 정보가 없습니다.";
        } else {
            mealTypeEl.innerText = "정보 없음";
            menuDisplayEl.innerText = "식단 정보가 없습니다.";
        }

        if (searchMealSelect) searchMealSelect.value = mealKey;
    }

    async function searchMenu() {
        const dateStr = searchDateInput.value;
        updateMealOptions(dateStr); // 날짜 변경 시 옵션 목록 갱신
        
        const mealKey = searchMealSelect.value;
        const menuData = await getMenuFromDB(dateStr);
        
        const mealNames = { breakfast: "아침", lunch: "점심", dinner: "저녁", brunch: "브런치" };
        mealTypeEl.innerText = `${dateStr} ${mealNames[mealKey] || ""}`;
        const menuText = menuData?.[mealKey] ? menuData[mealKey].replace(/, /g, '\n').replace(/,/g, '\n') : "식단 정보가 없습니다.";
        menuDisplayEl.innerText = menuText;
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
