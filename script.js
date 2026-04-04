// 시계
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    
    const clockEl = document.getElementById('realtime-clock');
    if (clockEl) {
        clockEl.innerText = `${dateStr} ${hours}:${minutes}:${seconds}`;
    }
}

// 페이지 로드
document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateClock, 1000);
    updateClock();
});
