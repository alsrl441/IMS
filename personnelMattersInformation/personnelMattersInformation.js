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
                    "id": Date.now().toString(), "name": "홍길동", "affiliation": "1소대", "position": "운전병",
                    "start": "2024-03-15", "transfer": "2024-05-10", "end": "2025-09-14",
                    "pfc2cpl": 0, "cpl2sgt": 0, "photo": "",
                    "vacation": ["2024-12-01", "2024-12-05"], "customFields": [], "customSchedules": []
                };
                await window.putDBData(STORE_NAME, sampleMember);
                data = [sampleMember];
            }
            return data;
        } catch (err) { return []; }
    }

    function refreshUI() {
        selectEl.innerHTML = '<option value="">인원 선택</option>';
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
            renderPreview(); timerId = setInterval(updateAllPreviews, 10);
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
                        <div id="preview-percent-${idx}" class="preview-percent-text">0.00000000%</div>
                    </div>
                    <div class="preview-progress-container"><div id="preview-bar-${idx}" class="preview-progress-fill" style="width: 0%"></div></div>
                </div>`;
            card.addEventListener('click', () => { selectEl.value = idx; handleMemberSelect(idx); });
            previewEl.appendChild(card);
        });
        const addCard = document.createElement('div');
        addCard.className = 'preview-card preview-card-add';
        addCard.innerHTML = `<i class="fas fa-plus"></i><span>추가</span>`;
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
        document.getElementById('resName').textContent = user.name;
        document.getElementById('resAffiliation').textContent = user.affiliation || "-";
        document.getElementById('resPosition').textContent = user.position || "-";
        resPhoto.src = user.photo || "../img/default-profile.png";
        currentPhotoBase64 = user.photo || "";

        // 커스텀 항목 렌더링
        document.querySelectorAll('.custom-field-row').forEach(el => el.remove());
        fieldEditContainer.innerHTML = '';
        (user.customFields || []).forEach(f => {
            addCustomFieldRow(f.key, f.value);
            const row = document.createElement('div');
            row.className = 'info-row-minimal custom-field-row view-mode';
            row.innerHTML = `<label>${f.key}</label><span>${f.value}</span>`;
            basicInfoGrid.appendChild(row);
        });

        // 커스텀 일정 렌더링 (2열 구조용 공간 확보)
        document.querySelectorAll('.custom-schedule-row').forEach(el => el.remove());
        scheduleEditContainer.innerHTML = '';
        (user.customSchedules || []).forEach(s => {
            addCustomScheduleRow(s.label, s.date);
            const rowL = document.createElement('div');
            rowL.className = 'info-row-minimal custom-schedule-row view-mode';
            rowL.innerHTML = `<label id="label-cust-${s.label.replace(/\s/g, '')}">${s.label}일</label><span id="val-cust-date-${s.label.replace(/\s/g, '')}">${s.date}</span>`;
            const rowR = document.createElement('div');
            rowR.className = 'info-row-minimal custom-schedule-row view-mode';
            rowR.innerHTML = `<label>${s.label}</label><span id="val-cust-dday-${s.label.replace(/\s/g, '')}">-</span>`;
            scheduleInfoGrid.appendChild(rowL);
            scheduleInfoGrid.appendChild(rowR);
        });

        // 입력창 채우기
        document.getElementById('editName').value = user.name;
        document.getElementById('editAffiliation').value = user.affiliation || "";
        document.getElementById('editPosition').value = user.position || "";
        document.getElementById('editStartDate').value = user.start;
        document.getElementById('editTransferDate').value = user.transfer || "";
        document.getElementById('editEndDate').value = user.end;
        document.getElementById('editPfc2cpl').value = user.pfc2cpl || 0;
        document.getElementById('editCpl2sgt').value = user.cpl2sgt || 0;
    }

    function addCustomFieldRow(key = "", value = "") {
        const row = document.createElement('div');
        row.className = 'custom-edit-row';
        row.innerHTML = `
            <input type="text" class="form-control-minimal custom-key" placeholder="항목명" value="${key}">
            <input type="text" class="form-control-minimal custom-value" placeholder="내용" value="${value}">
            <button class="btn-remove-custom"><i class="fas fa-trash"></i></button>`;
        row.querySelector('.btn-remove-custom').onclick = () => row.remove();
        fieldEditContainer.appendChild(row);
    }

    function addCustomScheduleRow(label = "", date = "") {
        const row = document.createElement('div');
        row.className = 'custom-edit-row';
        row.innerHTML = `
            <input type="text" class="form-control-minimal custom-label" placeholder="일정명" value="${label}">
            <input type="date" class="form-control-minimal custom-date" value="${date}">
            <button class="btn-remove-custom"><i class="fas fa-trash"></i></button>`;
        row.querySelector('.btn-remove-custom').onclick = () => row.remove();
        scheduleEditContainer.appendChild(row);
    }

    addFieldBtn.addEventListener('click', () => addCustomFieldRow());
    addScheduleBtn.addEventListener('click', () => addCustomScheduleRow());

    function startAddMember() {
        isAdding = true; selectEl.value = ""; handleMemberSelect("");
        displayEl.classList.remove('hidden'); noDataEl.classList.add('hidden'); previewEl.classList.add('hidden');
        document.querySelectorAll('.edit-mode input').forEach(input => {
            if (input.type === 'number') input.value = 0; else input.value = "";
        });
        fieldEditContainer.innerHTML = ''; scheduleEditContainer.innerHTML = '';
        resPhoto.src = "../img/default-profile.png"; currentPhotoBase64 = "";
        toggleEditMode(true); document.getElementById('editName').focus();
    }

    // Photo & Drag Drop
    photoEditArea.addEventListener('dragover', (e) => { e.preventDefault(); photoEditArea.style.borderColor = "#212529"; });
    photoEditArea.addEventListener('dragleave', () => { photoEditArea.style.borderColor = "#eee"; });
    photoEditArea.addEventListener('drop', (e) => {
        e.preventDefault(); photoEditArea.style.borderColor = "#eee";
        const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) handlePhoto(file);
    });
    photoOverlay.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => { if (e.target.files[0]) handlePhoto(e.target.files[0]); });
    function handlePhoto(file) {
        const reader = new FileReader();
        reader.onload = (rev) => { currentPhotoBase64 = rev.target.result; resPhoto.src = currentPhotoBase64; };
        reader.readAsDataURL(file);
    }

    editBtn.addEventListener('click', () => toggleEditMode(true));
    cancelBtn.addEventListener('click', () => isAdding ? handleMemberSelect("") : toggleEditMode(false));

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('editName').value.trim();
        if (!name) return alert("이름을 입력하세요.");
        const customFields = [];
        fieldEditContainer.querySelectorAll('.custom-edit-row').forEach(row => {
            const k = row.querySelector('.custom-key').value.trim();
            const v = row.querySelector('.custom-value').value.trim();
            if (k) customFields.push({ key: k, value: v });
        });
        const customSchedules = [];
        scheduleEditContainer.querySelectorAll('.custom-edit-row').forEach(row => {
            const l = row.querySelector('.custom-label').value.trim();
            const d = row.querySelector('.custom-date').value;
            if (l && d) customSchedules.push({ label: l, date: d });
        });
        const id = isAdding ? Date.now().toString() : members[selectEl.value].id;
        const updatedUser = {
            id, name, affiliation: document.getElementById('editAffiliation').value.trim(),
            position: document.getElementById('editPosition').value.trim(),
            start: document.getElementById('editStartDate').value, transfer: document.getElementById('editTransferDate').value,
            end: document.getElementById('editEndDate').value,
            pfc2cpl: parseInt(document.getElementById('editPfc2cpl').value) || 0,
            cpl2sgt: parseInt(document.getElementById('editCpl2sgt').value) || 0,
            photo: currentPhotoBase64, vacation: isAdding ? [] : (members[selectEl.value].vacation || []),
            customFields, customSchedules
        };
        try {
            await window.putDBData(STORE_NAME, updatedUser); members = await loadMembersFromDB();
            refreshUI(); const nIdx = members.findIndex(m => m.id === id);
            selectEl.value = nIdx; handleMemberSelect(nIdx);
        } catch (err) { alert("저장 실패"); }
    });

    deleteBtn.addEventListener('click', async () => {
        const idx = selectEl.value; if (idx === "" || !confirm("삭제하시겠습니까?")) return;
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
        const now = new Date();
        const start = new Date(user.start); const end = new Date(user.end);
        
        let p = ((now - start) / (end - start)) * 100;
        if (p < 0) p = 0; if (p > 100) p = 100;
        document.getElementById('resPercent').textContent = p.toFixed(8) + "%";
        document.getElementById('progressBarFill').style.width = p + "%";

        // 1행
        document.getElementById('resStartDate').textContent = user.start;
        document.getElementById('resTransferDate').textContent = user.transfer || "-";
        
        // 2행
        document.getElementById('resEndDate').textContent = user.end;
        document.getElementById('resDday').textContent = getDday(user.end);

        // 3행
        const pfc = getPromotionDate(user.start, 2, 0);
        const cpl = getPromotionDate(user.start, 8, user.pfc2cpl);
        const sgt = getPromotionDate(user.start, 14, user.cpl2sgt);
        const promoDates = [{n:"일병",d:pfc},{n:"상병",d:cpl},{n:"병장",d:sgt},{n:"전역",d:end}];
        const nextP = promoDates.find(x => x.d > now) || promoDates[3];
        document.getElementById('resPromoLabel').textContent = `${nextP.n} 진급일`;
        document.getElementById('resPromoDate').textContent = nextP.d.toISOString().split('T')[0];
        document.getElementById('resPromoDday').textContent = getDday(nextP.d.toISOString().split('T')[0]);

        // 4행
        const vRange = document.getElementById('resVacRange');
        const vDday = document.getElementById('resVacDday');
        if (user.vacation && user.vacation.length === 2) {
            const vS = new Date(user.vacation[0]); const vE = new Date(user.vacation[1]);
            const days = Math.round((vE - vS) / 86400000) + 1;
            vRange.textContent = `${user.vacation[0]} ~ ${user.vacation[1]} (${days}일)`;
            const vD = Math.ceil((vS - now) / 86400000);
            vDday.textContent = vD > 0 ? `D-${vD}` : (now <= new Date(vE.getTime() + 86400000) ? "휴가 중" : "종료");
        } else {
            vRange.textContent = "-"; vDday.textContent = "-";
        }

        // 커스텀 일정
        (user.customSchedules || []).forEach(s => {
            const vDate = document.getElementById(`val-cust-date-${s.label.replace(/\s/g, '')}`);
            const vDday = document.getElementById(`val-cust-dday-${s.label.replace(/\s/g, '')}`);
            if (vDate && vDday) {
                vDate.textContent = s.date;
                vDday.textContent = getDday(s.date);
            }
        });
    }

    function getPromotionDate(s, m, a) {
        if (!s) return null;
        let d = new Date(s); d.setMonth(d.getMonth() + m + 1); d.setDate(1);
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
