// 좌표 자동 완성 로직
const coordInput = document.getElementById('coord-input');
const fullCoordDisplay = document.getElementById('full-coord');

function updateFullCoord() {
    let val = coordInput.value.trim();
    if (!val) {
        fullCoordDisplay.innerText = "52SBD ----- -----";
        return;
    }
    let parts = val.split(/[\s,]+/);
    let x = parts[0] || "";
    let y = parts[1] || "";
    let fullX = x.padEnd(3, '0').slice(0, 3) + "00";
    let fullY = y.padEnd(3, '0').slice(0, 3) + "00";
    fullCoordDisplay.innerText = `52SBD ${fullX} ${fullY}`;
}
coordInput.addEventListener('input', updateFullCoord);

// 거리 단위 변환 로직
const distValue = document.getElementById('dist-value');
const distUnit = document.getElementById('dist-unit');
const distConv1 = document.getElementById('dist-conv-1');
const distConv2 = document.getElementById('dist-conv-2');

function updateDistance() {
    let val = parseFloat(distValue.value);
    let unit = distUnit.value;
    if (isNaN(val)) {
        distConv1.innerText = "--";
        distConv2.innerText = "--";
        return;
    }
    let km, nm, m;
    if (unit === 'km') { km = val; nm = val * 0.539957; m = val * 0.621371; }
    else if (unit === 'NM') { nm = val; km = val * 1.852; m = val * 1.15078; }
    else if (unit === 'M') { m = val; km = val * 1.60934; nm = val * 0.868976; }

    if (unit === 'km') { distConv1.innerText = `${nm.toFixed(2)} NM`; distConv2.innerText = `${m.toFixed(2)} M`; }
    else if (unit === 'NM') { distConv1.innerText = `${km.toFixed(2)} km`; distConv2.innerText = `${m.toFixed(2)} M`; }
    else if (unit === 'M') { distConv1.innerText = `${nm.toFixed(2)} NM`; distConv2.innerText = `${km.toFixed(2)} km`; }
}
distValue.addEventListener('input', updateDistance);
distUnit.addEventListener('change', updateDistance);

// 현재 시간 입력 함수 (24시간 형식)
function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

// 폼 초기화
function resetForm() {
    if (confirm("입력 중인 내용을 초기화할까요?")) {
        document.getElementById('trace-form').reset();
        updateFullCoord();
        updateDistance();
    }
}

// 로그 저장 및 표시
let traceLogs = [];

function saveTraceLog() {
    const log = {
        idTime: document.getElementById('id-time').value || "-",
        idPos: document.getElementById('az-el-input').value || "-",
        idLoc: document.getElementById('id-location').value || "",
        endTime: document.getElementById('end-time').value || "-",
        endPos: document.getElementById('end-az-el-input').value || "-",
        endLoc: document.getElementById('end-location').value || "",
        coord: fullCoordDisplay.innerText,
        specs: document.getElementById('ship-specs').value || "정보 없음",
        status: document.getElementById('end-reason').value,
        identifier: document.getElementById('identifier').value || "-",
        inquirer: document.getElementById('inquirer').value || "직접 식별"
    };

    traceLogs.unshift(log);
    renderLogs();
    alert("로그가 저장되었습니다.");
}

function renderLogs() {
    const list = document.getElementById('log-list');
    if (traceLogs.length === 0) {
        list.innerHTML = '<tr><td colspan="8" class="text-muted py-4">저장된 로그가 없습니다.</td></tr>';
        return;
    }

    list.innerHTML = traceLogs.map(log => `
        <tr>
            <td style="font-weight: bold;">${log.idTime}</td>
            <td>${log.idPos}${log.idLoc ? '<br>(' + log.idLoc + ')' : ''}</td>
            <td style="font-weight: bold;">${log.endTime}</td>
            <td>${log.endPos}${log.endLoc ? '<br>(' + log.endLoc + ')' : ''}</td>
            <td style="font-family: var(--font-mono); font-size: 0.85rem; color: #0d6efd;">${log.coord}</td>
            <td style="text-align: left; min-width: 200px; white-space: pre-wrap;">${log.specs}\n<span class="badge-status">[${log.status}]</span></td>
            <td>${log.identifier}</td>
            <td>${log.inquirer}</td>
        </tr>
    `).join('');
}

renderLogs();
