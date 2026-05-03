document.addEventListener('DOMContentLoaded', async () => {
    
    const selectEl = document.getElementById('memberSelect');
    const displayEl = document.getElementById('resultDisplay');
    const noDataEl = document.getElementById('noDataMessage');
    const previewEl = document.getElementById('previewDisplay');
    
    const editBtn = document.getElementById('editMemberBtn');
    const deleteBtn = document.getElementById('deleteMemberBtn');
    const saveBtn = document.getElementById('saveMemberBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    const photoInput = document.getElementById('photoInput');
    const resPhoto = document.getElementById('resPhoto');
    const photoOverlay = document.getElementById('photoOverlay');
    const photoEditArea = document.getElementById('photoEditArea');

    const addFieldBtn = document.getElementById('addCustomFieldBtn');
    const fieldEditContainer = document.getElementById('customFieldsEditContainer');
    const basicInfoGrid = document.getElementById('basicInfoGrid');

    const addScheduleBtn = document.getElementById('addCustomScheduleBtn');
    const scheduleEditContainer = document.getElementById('customSchedulesEditContainer');
    const scheduleInfoGrid = document.getElementById('scheduleInfoGrid');

    let timerId = null; 
    let members = [];
    let currentPhotoBase64 = "";
    let isAdding = false;
    const STORE_NAME = "members";

    async function init() {
        members = await loadMembersFromDB();
        refreshUI();
    }

    async function loadMembersFromDB() {
        try {
            await window.ensureStore(STORE_NAME, "id");
            let data = await window.getDBData(STORE_NAME);
            if (!data || data.length === 0) {
                const sampleMember = {
                    "id": Date.now().toString(),
                    "name": "이름",
                    "nickname": "별명",
                    "affiliation": "소속",
                    "position": "보직",
                    "start": "2026-01-01",
                    "transfer": "2026-02-01",
                    "end": "2027-05-31",
                    "pfc2cpl": 0,
                    "cpl2sgt": 0,
                    "photo": "",
                    "vacationStart": "",
                    "vacationEnd": "",
                    "customFields": [],
                    "customSchedules": []
                };
                await window.putDBData(STORE_NAME, sampleMember);
                data = [sampleMember];
            }
            // 입대일(start) 기준 오름차순 정렬
            data.sort((a, b) => {
                const dateA = a.start || "9999-12-31";
                const dateB = b.start || "9999-12-31";
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                return (a.name || "").localeCompare(b.name || "");
            });
            return data;
        } catch (err) { return []; }
    }

    function refreshUI() {
        selectEl.innerHTML = '<option value="">선택</option>';
        members.forEach((m, idx) => {
            let opt = document.createElement('option');
            opt.value = idx; opt.textContent = m.name;
            selectEl.appendChild(opt);
        });
        handleMemberSelect("");
    }

    selectEl.addEventListener('change', (e) => handleMemberSelect(e.target.value));

    function handleMemberSelect(val) {
        if (timerId) clearInterval(timerId);
        toggleEditMode(false);
        if (val === "") {
            displayEl.classList.add('hidden'); noDataEl.classList.remove('hidden'); previewEl.classList.remove('hidden');
            renderPreview(); timerId = setInterval(updateAllPreviews, 1);
        } else {
            const user = members[val];
            displayEl.classList.remove('hidden'); noDataEl.classList.add('hidden'); previewEl.classList.add('hidden');
            updateStaticProfile(user); calculateMilitary(user);
            timerId = setInterval(() => calculateMilitary(user), 10);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function renderPreview() {
        previewEl.innerHTML = '';
        members.forEach((user, idx) => {
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
                <div class="preview-text">
                    <div class="preview-header-row">
                        <div class="preview-name">${user.name}</div>
                        <div id="preview-percent-${idx}" class="preview-percent-text">0.00%</div>
                    </div>
                    <div class="preview-progress-container"><div id="preview-bar-${idx}" class="preview-progress-fill" style="width: 0%"></div></div>
                </div>`;
            card.addEventListener('click', () => { selectEl.value = idx; handleMemberSelect(idx); });
            previewEl.appendChild(card);
        });
        const addCard = document.createElement('div');
        addCard.className = 'preview-card preview-card-add';
        addCard.innerHTML = `<span>추가</span>`;
        addCard.addEventListener('click', startAddMember);
        previewEl.appendChild(addCard);
        updateAllPreviews();
    }

    function toggleEditMode(isEdit) {
        const viewElements = document.querySelectorAll('.view-mode');
        const editElements = document.querySelectorAll('.edit-mode');
        if (isEdit) {
            viewElements.forEach(el => el.classList.add('hidden')); editElements.forEach(el => el.classList.remove('hidden'));
            photoOverlay.classList.remove('hidden');
        } else {
            viewElements.forEach(el => el.classList.remove('hidden')); editElements.forEach(el => el.classList.add('hidden'));
            photoOverlay.classList.add('hidden'); isAdding = false;
        }
    }

    function updateStaticProfile(user) {
        document.getElementById('resNickName').textContent = user.nickname || user.name;
        document.getElementById('resSubInfo').textContent = `${user.affiliation || "-"} · ${user.position || "-"}`;
        resPhoto.src = user.photo || "../img/default-profile.png";
        currentPhotoBase64 = user.photo || "";

        document.querySelectorAll('.custom-field-item').forEach(el => el.remove());
        fieldEditContainer.innerHTML = '';
        (user.customFields || []).forEach(f => {
            addCustomFieldRow(f.key, f.value);
            const item = document.createElement('div');
            item.className = 'info-item custom-field-item view-mode';
            item.innerHTML = `<label>${f.key}</label><span class="value">${f.value}</span>`;
            basicInfoGrid.appendChild(item);
        });

        document.querySelectorAll('.custom-schedule-item').forEach(el => el.remove());
        scheduleEditContainer.innerHTML = '';
        (user.customSchedules || []).forEach(s => {
            addCustomScheduleRow(s.label, s.date, s.showDday, s.period);
            const itemDate = document.createElement('div');
            itemDate.className = 'info-item custom-schedule-item view-mode';
            itemDate.innerHTML = `<label>${s.label}</label><span class="value" id="val-cust-date-${s.label.replace(/\s/g, '')}">${s.date}</span>`;
            scheduleInfoGrid.appendChild(itemDate);
            
            if (s.showDday !== false) {
                const itemDday = document.createElement('div');
                itemDday.className = 'info-item custom-schedule-item view-mode highlight';
                itemDday.innerHTML = `<label>${s.label}</label><span class="value" id="val-cust-dday-${s.label.replace(/\s/g, '')}">-</span>`;
                scheduleInfoGrid.appendChild(itemDday);
            }
        });

        // 입력 채우기
        document.getElementById('editName').value = user.name;
        document.getElementById('editNickName').value = user.nickname || "";
        document.getElementById('editAffiliation').value = user.affiliation || "";
        document.getElementById('editPosition').value = user.position || "";
        document.getElementById('editStartDate').value = user.start;
        document.getElementById('editTransferDate').value = user.transfer || "";
        document.getElementById('editEndDate').value = user.end;
        document.getElementById('editPfc2cpl').value = user.pfc2cpl || 0;
        document.getElementById('editCpl2sgt').value = user.cpl2sgt || 0;
        document.getElementById('editVacStart').value = user.vacationStart || "";
        document.getElementById('editVacEnd').value = user.vacationEnd || "";
    }

    function addCustomFieldRow(key = "", value = "") {
        const row = document.createElement('div'); row.className = 'custom-edit-row';
        row.innerHTML = `<input type="text" class="form-control-custom custom-key" placeholder="항목명" value="${key}" style="width: 100px;">
            <input type="text" class="form-control-custom custom-value" placeholder="내용" value="${value}" style="flex: 1;">
            <button class="btn-remove-custom" style="border:none; background:none; color:#fa5252; cursor:pointer;">➖</button>`;
        row.querySelector('.btn-remove-custom').onclick = () => row.remove();
        fieldEditContainer.appendChild(row);
    }

    function addCustomScheduleRow(label = "", date = "", showDday = true, period = "none") {
        const row = document.createElement('div'); row.className = 'custom-edit-row';
        row.innerHTML = `
            <input type="text" class="form-control-custom custom-label" placeholder="일정명" value="${label}" style="width: 80px;">
            <input type="date" class="form-control-custom custom-date" value="${date}" style="flex: 1;">
            <select class="form-control-custom custom-period" style="width: 80px;">
                <option value="none" ${period === 'none' ? 'selected' : ''}>주기없음</option>
                <option value="month" ${period === 'month' ? 'selected' : ''}>매달</option>
                <option value="year" ${period === 'year' ? 'selected' : ''}>매년</option>
            </select>
            <div style="display:flex; align-items:center; gap:3px; min-width:60px;">
                <input type="checkbox" class="custom-show-dday" ${showDday !== false ? 'checked' : ''} style="width:14px; height:14px; cursor:pointer;">
                <label style="font-size:0.7rem; color:#666; margin-bottom:0; cursor:pointer;">D-Day</label>
            </div>
            <button class="btn-remove-custom" style="border:none; background:none; color:#fa5252; cursor:pointer;">➖</button>`;
        row.querySelector('.btn-remove-custom').onclick = () => row.remove();
        scheduleEditContainer.appendChild(row);
    }

    addFieldBtn.addEventListener('click', () => addCustomFieldRow());
    addScheduleBtn.addEventListener('click', () => addCustomScheduleRow());

    function startAddMember() {
        selectEl.value = ""; handleMemberSelect("");
        isAdding = true;
        displayEl.classList.remove('hidden'); noDataEl.classList.add('hidden'); previewEl.classList.add('hidden');
        document.querySelectorAll('.edit-mode input').forEach(input => { 
            if (input.type === 'number') input.value = 0; 
            else if (input.type === 'checkbox') input.checked = true;
            else input.value = ""; 
        });
        fieldEditContainer.innerHTML = ''; scheduleEditContainer.innerHTML = '';
        resPhoto.src = "../img/default-profile.png"; currentPhotoBase64 = "";
        toggleEditMode(true); document.getElementById('editName').focus();
    }

    photoEditArea.addEventListener('dragover', (e) => { e.preventDefault(); photoEditArea.style.borderColor = "#212529"; });
    photoEditArea.addEventListener('dragleave', () => { photoEditArea.style.borderColor = "#f1f3f5"; });
    photoEditArea.addEventListener('drop', (e) => {
        e.preventDefault(); photoEditArea.style.borderColor = "#f1f3f5";
        const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) handlePhoto(file);
    });
    photoOverlay.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => { if (e.target.files[0]) handlePhoto(e.target.files[0]); });
    function handlePhoto(file) {
        const reader = new FileReader(); reader.onload = (rev) => { currentPhotoBase64 = rev.target.result; resPhoto.src = currentPhotoBase64; };
        reader.readAsDataURL(file);
    }

    editBtn.addEventListener('click', () => toggleEditMode(true));
    cancelBtn.addEventListener('click', () => isAdding ? handleMemberSelect("") : toggleEditMode(false));

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('editName').value.trim(); if (!name) return alert("이름 필수");
        const nickname = document.getElementById('editNickName').value.trim();
        const customFields = [];
        fieldEditContainer.querySelectorAll('.custom-edit-row').forEach(row => {
            const k = row.querySelector('.custom-key').value.trim(); const v = row.querySelector('.custom-value').value.trim();
            if (k) customFields.push({ key: k, value: v });
        });
        const customSchedules = [];
        scheduleEditContainer.querySelectorAll('.custom-edit-row').forEach(row => {
            const l = row.querySelector('.custom-label').value.trim(); 
            const d = row.querySelector('.custom-date').value;
            const sd = row.querySelector('.custom-show-dday').checked;
            const p = row.querySelector('.custom-period').value;
            if (l && d) customSchedules.push({ label: l, date: d, showDday: sd, period: p });
        });

        const id = isAdding ? Date.now().toString() : members[selectEl.value].id;
        const updatedUser = {
            id, name, nickname,
            affiliation: document.getElementById('editAffiliation').value.trim(),
            position: document.getElementById('editPosition').value.trim(),
            start: document.getElementById('editStartDate').value, transfer: document.getElementById('editTransferDate').value,
            end: document.getElementById('editEndDate').value,
            pfc2cpl: parseInt(document.getElementById('editPfc2cpl').value) || 0,
            cpl2sgt: parseInt(document.getElementById('editCpl2sgt').value) || 0,
            photo: currentPhotoBase64, 
            vacationStart: document.getElementById('editVacStart').value,
            vacationEnd: document.getElementById('editVacEnd').value,
            customFields, customSchedules
        };
        try {
            await window.putDBData(STORE_NAME, updatedUser); members = await loadMembersFromDB();
            refreshUI(); const nIdx = members.findIndex(m => m.id === id);
            selectEl.value = nIdx; handleMemberSelect(nIdx);
        } catch (err) { alert("저장 실패"); }
    });

    deleteBtn.addEventListener('click', async () => {
        const idx = selectEl.value; if (idx === "" || !confirm("삭제?")) return;
        try {
            const db = await window.getDB(); const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(members[idx].id);
            tx.oncomplete = async () => { db.close(); members = await loadMembersFromDB(); refreshUI(); };
        } catch (err) { alert("삭제 실패"); }
    });

    function getDday(dateStr) {
        if (!dateStr) return "-";
        const target = new Date(dateStr); target.setHours(0,0,0,0);
        const today = new Date(); today.setHours(0,0,0,0);
        const diff = Math.ceil((target - today) / 86400000);
        if (diff > 0) return `D-${diff}`;
        if (diff === 0) return "D-Day";
        return `D+${Math.abs(diff)}`;
    }

    function calculateMilitary(user) {
        if (!user.start || !user.end) return;
        const now = new Date(); const start = new Date(user.start); const end = new Date(user.end);
        let p = ((now - start) / (end - start)) * 100;
        if (p < 0) p = 0; if (p > 100) p = 100;
        document.getElementById('progressBarFill').style.width = p + "%";
        document.getElementById('resPercent').textContent = p.toFixed(8) + "%";

        document.getElementById('resStartDate').textContent = user.start;
        document.getElementById('resTransferDate').textContent = user.transfer || "-";
        document.getElementById('resEndDateDate').textContent = user.end;
        
        const endDay = new Date(user.end); endDay.setHours(0,0,0,0);
        const todayObj = new Date(); todayObj.setHours(0,0,0,0);
        let dischargeDday = getDday(user.end);
        if (todayObj > endDay) {
            dischargeDday = "전역 완료";
        }
        
        const dischargeSuffix = dischargeDday.startsWith('D-') ? "까지" : (dischargeDday === "전역 완료" ? "" : (dischargeDday.startsWith('D+') ? "부터" : ""));
        document.getElementById('resDday').previousElementSibling.textContent = "전역" + dischargeSuffix;
        document.getElementById('resDday').textContent = dischargeDday;

        const pfc = getPromotionDate(user.start, 2, 0); const cpl = getPromotionDate(user.start, 8, user.pfc2cpl);
        const sgt = getPromotionDate(user.start, 14, user.cpl2sgt);
        const pDates = [{n:"일병",d:pfc},{n:"상병",d:cpl},{n:"병장",d:sgt},{n:"전역",d:end}];
        const nextP = pDates.find(x => x.d > now) || pDates[3];

        if (nextP.n === "전역") {
            document.getElementById('resPromoLabel').textContent = "다음 진급일";
            document.getElementById('resPromoDate').textContent = "-";
            document.getElementById('resPromoDday').previousElementSibling.textContent = "진급";
            document.getElementById('resPromoDday').textContent = "-";
        } else {
            document.getElementById('resPromoLabel').textContent = `${nextP.n} 진급일`;
            document.getElementById('resPromoDate').textContent = nextP.d.toISOString().split('T')[0];
            
            const promoDday = getDday(nextP.d.toISOString().split('T')[0]);
            const promoSuffix = promoDday.startsWith('D-') ? "까지" : (promoDday.startsWith('D+') ? "부터" : "");
            document.getElementById('resPromoDday').previousElementSibling.textContent = `${nextP.n} 진급` + promoSuffix;
            document.getElementById('resPromoDday').textContent = promoDday;
        }

        if (user.vacationStart && user.vacationEnd) {
            const today = new Date(); today.setHours(0,0,0,0);
            const vS = new Date(user.vacationStart); vS.setHours(0,0,0,0);
            const vE = new Date(user.vacationEnd); vE.setHours(23,59,59,999);
            const days = Math.round((vE - vS) / 86400000);
            
            document.getElementById('resVacRange').textContent = `${user.vacationStart} ~ ${user.vacationEnd.substring(5)} (${days}일)`;
            
            if (today < vS) {
                const vacDday = getDday(user.vacationStart);
                const vacSuffix = vacDday.startsWith('D-') ? "까지" : (vacDday.startsWith('D+') ? "부터" : "");
                document.getElementById('resVacDday').previousElementSibling.textContent = "휴가" + vacSuffix;
                document.getElementById('resVacDday').textContent = vacDday;
            } else if (today <= vE) {
                document.getElementById('resVacDday').previousElementSibling.textContent = "휴가";
                document.getElementById('resVacDday').textContent = "휴가 중";
            } else {
                document.getElementById('resVacRange').textContent = "-";
                document.getElementById('resVacDday').textContent = "-";
            }
        } else {
            document.getElementById('resVacRange').textContent = "-";
            document.getElementById('resVacDday').textContent = "-";
        }

        (user.customSchedules || []).forEach(s => {
            const dateEl = document.getElementById(`val-cust-date-${s.label.replace(/\s/g, '')}`);
            const vDy = document.getElementById(`val-cust-dday-${s.label.replace(/\s/g, '')}`);
            
            let targetDate = new Date(s.date);
            const today = new Date(); today.setHours(0,0,0,0);

            if (s.period === 'month') {
                while (targetDate < today) {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                }
            } else if (s.period === 'year') {
                while (targetDate < today) {
                    targetDate.setFullYear(targetDate.getFullYear() + 1);
                }
            }

            const targetStr = targetDate.toISOString().split('T')[0];
            if (dateEl) dateEl.textContent = s.date;
            if (vDy && s.showDday !== false) { 
                const custDday = getDday(targetStr);
                let labelText = s.label;
                if (s.period && s.period !== 'none') {
                    labelText = "다음 " + s.label + (custDday === "D-Day" ? "" : "까지");
                } else {
                    const custSuffix = custDday.startsWith('D-') ? "까지" : (custDday.startsWith('D+') ? "부터" : "");
                    labelText += custSuffix;
                }
                vDy.previousElementSibling.textContent = labelText;
                vDy.textContent = custDday; 
            }
        });
    }

    function getPromotionDate(s, m, a) {
        if (!s) return null; let d = new Date(s); d.setMonth(d.getMonth() + m + 1); d.setDate(1);
        if (a) d.setMonth(d.getMonth() - a); return d;
    }

    function updateAllPreviews() {
        members.forEach((user, idx) => {
            if (!user.start || !user.end) return;
            const s = new Date(user.start); const e = new Date(user.end); const n = new Date();
            let p = ((n - s) / (e - s)) * 100; if (p < 0) p = 0; if (p > 100) p = 100;
            const pt = document.getElementById(`preview-percent-${idx}`);
            const pb = document.getElementById(`preview-bar-${idx}`);
            if (pt) pt.textContent = p.toFixed(8) + "%"; if (pb) pb.style.width = p + "%";
        });
    }
    init();
});
