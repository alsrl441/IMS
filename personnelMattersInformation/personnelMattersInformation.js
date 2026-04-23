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
                    "name": "홍길동",
                    "nickName": "ㅎㄱㄷ",
                    "start": "2024-03-15",
                    "transfer": "2024-05-10",
                    "end": "2025-09-14",
                    "pfc2cpl": 0, "cpl2sgt": 0,
                    "photo": "",
                    "affiliation": "1소대",
                    "position": "운전병",
                    "vacation": ["2024-12-01", "2024-12-05"]
                };
                await window.putDBData(STORE_NAME, sampleMember);
                data = [sampleMember];
            }
            return data;
        } catch (err) {
            console.error("인원 정보 로딩 실패:", err);
            return [];
        }
    }

    function refreshUI() {
        selectEl.innerHTML = '<option value="">인원 선택</option>';
        members.forEach((m, idx) => {
            let opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = m.name;
            selectEl.appendChild(opt);
        });
        handleMemberSelect("");
    }

    selectEl.addEventListener('change', (e) => {
        handleMemberSelect(e.target.value);
    });

    function handleMemberSelect(val) {
        if (timerId) clearInterval(timerId);
        toggleEditMode(false);

        if (val === "") {
            displayEl.classList.add('hidden');
            noDataEl.classList.remove('hidden');
            previewEl.classList.remove('hidden');
            renderPreview();
            timerId = setInterval(updateAllPreviews, 10);
        } else {
            const user = members[val];
            displayEl.classList.remove('hidden');
            noDataEl.classList.add('hidden');
            previewEl.classList.add('hidden');
            
            updateStaticProfile(user);
            calculateMilitary(user);
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
                    <div class="preview-progress-container">
                        <div id="preview-bar-${idx}" class="preview-progress-fill" style="width: 0%"></div>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => {
                selectEl.value = idx;
                handleMemberSelect(idx);
            });
            previewEl.appendChild(card);
        });

        const addCard = document.createElement('div');
        addCard.className = 'preview-card preview-card-add';
        addCard.innerHTML = `
            <i class="fas fa-plus"></i>
            <span>추가</span>
        `;
        addCard.addEventListener('click', () => {
            startAddMember();
        });
        previewEl.appendChild(addCard);

        updateAllPreviews();
    }

    function toggleEditMode(isEdit) {
        const viewElements = document.querySelectorAll('.view-mode');
        const editElements = document.querySelectorAll('.edit-mode');
        
        if (isEdit) {
            viewElements.forEach(el => el.classList.add('hidden'));
            editElements.forEach(el => el.classList.remove('hidden'));
            photoOverlay.classList.remove('hidden');
        } else {
            viewElements.forEach(el => el.classList.remove('hidden'));
            editElements.forEach(el => el.classList.add('hidden'));
            photoOverlay.classList.add('hidden');
            isAdding = false;
        }
    }

    function updateStaticProfile(user) {
        // View Mode UI Fill
        document.getElementById('resName').textContent = user.name;
        document.getElementById('resAffiliation').textContent = user.affiliation || "-";
        document.getElementById('resPosition').textContent = user.position || "-";
        document.getElementById('resStartDate').textContent = user.start;
        document.getElementById('resTransferDate').textContent = user.transfer || "-";
        document.getElementById('resEndDate').textContent = user.end;
        
        resPhoto.src = user.photo || "../img/default-profile.png";
        currentPhotoBase64 = user.photo || "";

        // Edit Mode Inputs Fill
        document.getElementById('editName').value = user.name;
        document.getElementById('editAffiliation').value = user.affiliation || "";
        document.getElementById('editPosition').value = user.position || "";
        document.getElementById('editStartDate').value = user.start;
        document.getElementById('editTransferDate').value = user.transfer || "";
        document.getElementById('editEndDate').value = user.end;
        document.getElementById('editPfc2cpl').value = user.pfc2cpl || 0;
        document.getElementById('editCpl2sgt').value = user.cpl2sgt || 0;
    }

    function startAddMember() {
        isAdding = true;
        selectEl.value = "";
        handleMemberSelect("");
        
        displayEl.classList.remove('hidden');
        noDataEl.classList.add('hidden');
        previewEl.classList.add('hidden');
        
        document.querySelectorAll('.edit-mode input').forEach(input => {
            if (input.type === 'number') input.value = 0;
            else input.value = "";
        });
        resPhoto.src = "../img/default-profile.png";
        currentPhotoBase64 = "";
        
        toggleEditMode(true);
        document.getElementById('editName').focus();
    }

    // Drag and Drop
    photoEditArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoEditArea.style.borderColor = "#212529";
    });
    photoEditArea.addEventListener('dragleave', () => {
        photoEditArea.style.borderColor = "#eee";
    });
    photoEditArea.addEventListener('drop', (e) => {
        e.preventDefault();
        photoEditArea.style.borderColor = "#eee";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handlePhoto(file);
    });

    photoOverlay.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handlePhoto(file);
    });

    function handlePhoto(file) {
        const reader = new FileReader();
        reader.onload = (rev) => {
            currentPhotoBase64 = rev.target.result;
            resPhoto.src = currentPhotoBase64;
        };
        reader.readAsDataURL(file);
    }

    editBtn.addEventListener('click', () => toggleEditMode(true));
    cancelBtn.addEventListener('click', () => isAdding ? handleMemberSelect("") : toggleEditMode(false));

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('editName').value.trim();
        if (!name) return alert("이름을 입력하세요.");

        const id = isAdding ? Date.now().toString() : members[selectEl.value].id;
        const updatedUser = {
            id,
            name,
            affiliation: document.getElementById('editAffiliation').value.trim(),
            position: document.getElementById('editPosition').value.trim(),
            start: document.getElementById('editStartDate').value,
            transfer: document.getElementById('editTransferDate').value,
            end: document.getElementById('editEndDate').value,
            pfc2cpl: parseInt(document.getElementById('editPfc2cpl').value) || 0,
            cpl2sgt: parseInt(document.getElementById('editCpl2sgt').value) || 0,
            photo: currentPhotoBase64,
            vacation: isAdding ? [] : (members[selectEl.value].vacation || [])
        };

        try {
            await window.putDBData(STORE_NAME, updatedUser);
            members = await loadMembersFromDB();
            refreshUI();
            const newIdx = members.findIndex(m => m.id === id);
            selectEl.value = newIdx;
            handleMemberSelect(newIdx);
        } catch (err) { alert("저장 실패"); }
    });

    deleteBtn.addEventListener('click', async () => {
        const idx = selectEl.value;
        if (idx === "" || !confirm("정말 삭제하시겠습니까?")) return;
        try {
            const db = await window.getDB();
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(members[idx].id);
            tx.oncomplete = async () => {
                db.close();
                members = await loadMembersFromDB();
                refreshUI();
            };
        } catch (err) { alert("삭제 실패"); }
    });

    function getPromotionDate(startDateStr, plusMonths, adj) {
        if (!startDateStr) return null;
        let date = new Date(startDateStr);
        date.setMonth(date.getMonth() + plusMonths + 1);
        date.setDate(1);
        if (adj) date.setMonth(date.getMonth() - adj);
        return date;
    }

    function calculateMilitary(user) {
        if (!user.start || !user.end) return;
        const now = new Date();
        const start = new Date(user.start);
        const end = new Date(user.end);

        // 복무율
        const totalMs = end - start;
        const elapsedMs = now - start;
        let percent = (elapsedMs / totalMs) * 100;
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        document.getElementById('resPercent').textContent = percent.toFixed(8) + "%";
        document.getElementById('progressBarFill').style.width = percent + "%";

        // 전역 D-day
        const dday = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        document.getElementById('resDday').textContent = dday > 0 ? `D-${dday}` : (dday === 0 ? "D-Day" : `전역 후 ${Math.abs(dday)}일`);

        // 진급일 계산
        const pfcDate = getPromotionDate(user.start, 2, 0); 
        const cplDate = getPromotionDate(user.start, 8, user.pfc2cpl);
        const sgtDate = getPromotionDate(user.start, 14, user.cpl2sgt);
        const promoDates = [
            { name: "일병", date: pfcDate },
            { name: "상병", date: cplDate },
            { name: "병장", date: sgtDate },
            { name: "전역", date: end }
        ];
        let nextPromo = promoDates.find(p => p.date > now) || promoDates[3];
        document.getElementById('resNextPromoDate').textContent = nextPromo.date.toISOString().split('T')[0];
        const pDday = Math.ceil((nextPromo.date - now) / (1000 * 60 * 60 * 24));
        document.getElementById('resNextPromoDday').textContent = pDday > 0 ? `D-${pDday}` : "D-Day";

        // 휴가 계산
        const vacRangeEl = document.getElementById('resVacationRange');
        const vacDdayEl = document.getElementById('resVacDday');
        if (user.vacation && user.vacation.length === 2) {
            const vStart = new Date(user.vacation[0]);
            const vEnd = new Date(user.vacation[1]);
            const vDays = Math.round((vEnd - vStart) / (1000 * 60 * 60 * 24)) + 1;
            vacRangeEl.textContent = `${user.vacation[0]} ~ ${user.vacation[1]} (${vDays}일)`;
            
            const vDday = Math.ceil((vStart - now) / (1000 * 60 * 60 * 24));
            if (vDday > 0) vacDdayEl.textContent = `D-${vDday}`;
            else if (now >= vStart && now <= new Date(vEnd.getTime() + 86400000)) vacDdayEl.textContent = "휴가 중";
            else vacDdayEl.textContent = "종료";
        } else {
            vacRangeEl.textContent = "-";
            vacDdayEl.textContent = "-";
        }
    }

    function updateAllPreviews() {
        members.forEach((user, idx) => {
            if (!user.start || !user.end) return;
            const start = new Date(user.start);
            const end = new Date(user.end);
            const now = new Date();
            let p = ((now - start) / (end - start)) * 100;
            if (p < 0) p = 0; if (p > 100) p = 100;
            const pText = document.getElementById(`preview-percent-${idx}`);
            const pBar = document.getElementById(`preview-bar-${idx}`);
            if (pText) pText.textContent = p.toFixed(8) + "%";
            if (pBar) pBar.style.width = p + "%";
        });
    }

    init();
});
