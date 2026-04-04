/**
 * CCSS Menu System v2.5 (Final Production)
 */
async function updateMenu() {
    const mealTypeEl = document.getElementById('meal-type');
    const menuDisplayEl = document.getElementById('menu-display');
    const searchDateInput = document.getElementById('search-date');
    const searchMealSelect = document.getElementById('search-meal');

    // [Helper] IndexedDB에서 모든 데이터를 가져와 날짜로 찾기
    function getMenuFromDB(dateStr) {
        return new Promise((resolve) => {
            const request = indexedDB.open("menu");
            request.onsuccess = (e) => {
                const db = e.target.result;
                try {
                    const tx = db.transaction("menu", "readonly");
                    const store = tx.objectStore("menu");
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = () => {
                        const allData = getAllReq.result || [];
                        const found = allData.find(item => item.date === dateStr);
                        resolve(found || null);
                    };
                } catch (err) { resolve(null); }
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

    // 자동 식단 설정 함수
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

        // 시간별 로직 (네 원래 로직 그대로!)
        if (isSunday) {
            if (timeVal < 1130) { displayLabel = "오늘 브런치"; mealKey = "brunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { displayLabel = "내일 아침"; mealKey = "breakfast"; targetDateStr = tomorrowStr; }
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

        // [핵심] JSON 형태가 아니라 실제 메뉴 텍스트만 추출
        if (menuData && menuData.meals) {
            mealTypeEl.innerText = displayLabel;
            menuDisplayEl.innerText = menuData.meals[mealKey] || "식단 정보가 없습니다.";
        } else {
            mealTypeEl.innerText = "정보 없음";
            menuDisplayEl.innerText = "해당 날짜의 식단 데이터가 DB에 없습니다.";
        }

        if (searchDateInput) searchDateInput.value = targetDateStr;
        if (searchMealSelect) searchMealSelect.value = mealKey;
    }

    // 수동 검색 함수
    async function searchMenu() {
        const dateStr = searchDateInput.value;
        const mealKey = searchMealSelect.value;
        const menuData = await getMenuFromDB(dateStr);
        
        const mealNames = { breakfast: "아침", lunch: "점심", dinner: "저녁", brunch: "브런치" };
        mealTypeEl.innerText = `${dateStr} ${mealNames[mealKey]}`;
        menuDisplayEl.innerText = menuData?.meals?.[mealKey] || "식단 정보가 없습니다.";
    }

    // 이벤트 리스너 설정
    if (document.getElementById('meal-type')) {
        document.getElementById('meal-type').addEventListener('click', () => {
            const ui = document.getElementById('menu-search-ui');
            if (ui) ui.classList.toggle('hidden');
        });
    }

    if (searchDateInput) searchDateInput.addEventListener('change', searchMenu);
    if (searchMealSelect) searchMealSelect.addEventListener('change', searchMenu);

    // 초기 실행
    setAutoMenu();
}

// 안전한 실행을 위한 즉시 실행 로직
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateMenu();
} else {
    document.addEventListener('DOMContentLoaded', updateMenu);
}
