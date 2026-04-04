function updateMenu() {
    if (typeof menuData === 'undefined') return;

    const mealTypeEl = document.getElementById('meal-type');
    const menuDisplayEl = document.getElementById('menu-display');
    const searchUi = document.getElementById('menu-search-ui');
    const searchDateInput = document.getElementById('search-date');
    const searchMealSelect = document.getElementById('search-meal');

    const getFormattedDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 1. 자동 모드 (현재 시간 기준)
    function setAutoMenu() {
        const now = new Date();
        const timeVal = now.getHours() * 100 + now.getMinutes();
        const todayStr = getFormattedDate(now);
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = getFormattedDate(tomorrowObj);

        const todayMenu = menuData.find(m => m.date === todayStr);
        const tomorrowMenu = menuData.find(m => m.date === tomorrowStr);

        let displayLabel = "";
        let mealKey = "";
        let targetMenu = todayMenu;
        const isSunday = now.getDay() === 0;

        if (isSunday) {
            if (timeVal < 1130) { displayLabel = "오늘 브런치"; mealKey = "brunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { displayLabel = "내일 아침"; mealKey = "breakfast"; targetMenu = tomorrowMenu; }
        } else {
            if (timeVal < 800) { displayLabel = "오늘 아침"; mealKey = "breakfast"; }
            else if (timeVal < 1230) { displayLabel = "오늘 점심"; mealKey = "lunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { 
                const nextIsSunday = tomorrowObj.getDay() === 0;
                displayLabel = "내일 " + (nextIsSunday ? "브런치" : "아침");
                mealKey = nextIsSunday ? "brunch" : "breakfast";
                targetMenu = tomorrowMenu;
            }
        }

        mealTypeEl.innerText = displayLabel;
        menuDisplayEl.innerText = targetMenu?.meals[mealKey] || "식단 정보가 없습니다.";
        
        // 검색창 초기값 설정
        searchDateInput.value = targetMenu?.date || todayStr;
        searchMealSelect.value = mealKey;
    }

    // 2. 수동 검색 모드
    function searchMenu() {
        const dateStr = searchDateInput.value;
        const mealKey = searchMealSelect.value;
        const found = menuData.find(m => m.date === dateStr);
        
        const mealNames = { breakfast: "아침", lunch: "점심", dinner: "저녁", brunch: "브런치" };
        mealTypeEl.innerText = `${dateStr} ${mealNames[mealKey]}`;
        menuDisplayEl.innerText = found?.meals[mealKey] || "식단 정보가 없습니다.";
    }

    // 이벤트 리스너
    mealTypeEl.addEventListener('click', () => {
        searchUi.classList.toggle('hidden');
    });

    searchDateInput.addEventListener('change', searchMenu);
    searchMealSelect.addEventListener('change', searchMenu);

    // 초기 실행
    setAutoMenu();
}

document.addEventListener('DOMContentLoaded', updateMenu);
