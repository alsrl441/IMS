const STORE_NAME = "mealSchedule";

// 하위 로직에서 관리하는 데이터 양식
const initialMealTemplate = {
    "date": "0000-00-00",
    "breakfast": "정보 없음",
    "lunch": "정보 없음",
    "dinner": "정보 없음",
    "brunch": "정보 없음"
};

const mealTypeEl = document.getElementById('meal-type');
const mealDisplayEl = document.getElementById('meal-display');
const searchDateInput = document.getElementById('search-date');
const searchMealSelect = document.getElementById('search-meal');

// 날짜 포맷 헬퍼
const getFormattedDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

async function getMealData(dateStr) {
    try {
        const allMeals = await window.getDBData(STORE_NAME);
        return allMeals.find(m => m.date === dateStr) || null;
    } catch (err) {
        console.error("Meal fetch error:", err);
        return null;
    }
}

function updateMealOptions(dateStr) {
    if (!searchMealSelect) return;
    const date = new Date(dateStr);
    const isSunday = date.getDay() === 0;
    const currentVal = searchMealSelect.value;
    
    searchMealSelect.innerHTML = '';
    
    if (isSunday) {
        searchMealSelect.add(new Option("브런치", "brunch"));
        searchMealSelect.add(new Option("저녁", "dinner"));
    } else {
        searchMealSelect.add(new Option("아침", "breakfast"));
        searchMealSelect.add(new Option("점심", "lunch"));
        searchMealSelect.add(new Option("저녁", "dinner"));
    }

    const hasValue = Array.from(searchMealSelect.options).some(opt => opt.value === currentVal);
    if (hasValue) searchMealSelect.value = currentVal;
}

function formatMealText(text) {
    if (!text || text === "정보 없음") return "식단 정보가 없습니다.";
    // 콤마 뒤 공백 제거 후 콤마를 줄바꿈으로 변경
    return text.split(',').map(item => item.trim()).join('\n');
}

async function setAutoMeal() {
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
    
    const mealData = await getMealData(targetDateStr);
    if (mealData) {
        if (mealTypeEl) mealTypeEl.innerText = displayLabel;
        if (mealDisplayEl) mealDisplayEl.innerText = formatMealText(mealData[mealKey]);
    } else {
        if (mealTypeEl) mealTypeEl.innerText = "정보 없음";
        if (mealDisplayEl) mealDisplayEl.innerText = "식단 정보가 없습니다.";
    }

    if (searchMealSelect) searchMealSelect.value = mealKey;
}

async function searchMeal() {
    if (!searchDateInput || !searchMealSelect) return;
    const dateStr = searchDateInput.value;
    updateMealOptions(dateStr);
    
    const mealKey = searchMealSelect.value;
    const mealData = await getMealData(dateStr);
    
    const mealNames = { breakfast: "아침", lunch: "점심", dinner: "저녁", brunch: "브런치" };
    if (mealTypeEl) mealTypeEl.innerText = `${dateStr} ${mealNames[mealKey] || ""}`;
    
    if (mealDisplayEl) mealDisplayEl.innerText = formatMealText(mealData?.[mealKey]);
}

async function initMeal() {
    await window.ensureStore(STORE_NAME, "date");
    
    // 초기 템플릿 확인 및 삽입 로직 (데이터가 아예 없을 때만)
    const currentData = await window.getDBData(STORE_NAME);
    if (currentData.length === 0) {
        await window.putDBData(STORE_NAME, initialMealTemplate);
        console.log("초기 식단 템플릿 삽입됨.");
    }

    if (mealTypeEl) {
        mealTypeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const ui = document.getElementById('meal-search-ui');
            if (ui) ui.classList.toggle('hidden');
        });
    }

    // 다른 곳 클릭하면 검색창 닫기
    document.addEventListener('click', (e) => {
        const ui = document.getElementById('meal-search-ui');
        if (ui && !ui.contains(e.target) && e.target !== mealTypeEl) {
            ui.classList.add('hidden');
        }
    });

    if (searchDateInput) searchDateInput.addEventListener('change', searchMeal);
    if (searchMealSelect) searchMealSelect.addEventListener('change', searchMeal);

    await setAutoMeal();
}

document.addEventListener('DOMContentLoaded', initMeal);
