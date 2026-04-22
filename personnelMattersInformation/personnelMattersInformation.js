document.addEventListener('DOMContentLoaded', async () => {
    
    const selectEl = document.getElementById('memberSelect');
    const displayEl = document.getElementById('resultDisplay');
    const noDataEl = document.getElementById('noDataMessage');
    const previewEl = document.getElementById('previewDisplay');
    
    const modal = document.getElementById('memberModal');
    const memberForm = document.getElementById('memberForm');
    const addBtn = document.getElementById('addMemberBtn');
    const editBtn = document.getElementById('editMemberBtn');
    const deleteBtn = document.getElementById('deleteMemberBtn');
    const closeBtn = document.getElementById('closeModal');
    
    // Photo Drop Zone elements
    const photoDropZone = document.getElementById('photoDropZone');
    const modalPhotoPreview = document.getElementById('modalPhotoPreview');
    const mPhotoFile = document.getElementById('mPhotoFile');
    
    let timerId = null; 
    let members = [];
    let currentPhotoBase64 = ""; // 현재 선택된 사진의 Base64 데이터를 저장
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
                    "start": "2025-07-15",
                    "end": "2027-01-14",
                    "vacation": ["2026-06-01", "2026-06-08"],
                    "promotion": { "pfc2cpl": 0, "cpl2sgt": 0 },
                    "photo": "",
                    "affiliation": "해안복합감시반",
                    "position": "항포구 감시병",
                    "hobby": "취미",
                    "specialty": "특기"
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
        selectEl.innerHTML = '<option value="">인원을 선택하세요</option>';
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
        updateAllPreviews();
    }

    function updateAllPreviews() {
        members.forEach((user, idx) => {
            const start = new Date(user.start);
            const end = new Date(user.end);
            const now = new Date();
            const percent = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)).toFixed(8);
            
            const percentEl = document.getElementById(`preview-percent-${idx}`);
            const barEl = document.getElementById(`preview-bar-${idx}`);
            if (percentEl) percentEl.innerText = `${percent}%`;
            if (barEl) barEl.style.width = `${percent}%`;
        });
    }

    // Photo Drop Zone handling
    photoDropZone.onclick = () => mPhotoFile.click();

    photoDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoDropZone.classList.add('dragover');
    });

    photoDropZone.addEventListener('dragleave', () => {
        photoDropZone.classList.remove('dragover');
    });

    photoDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        photoDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handlePhotoSelection(e.dataTransfer.files[0]);
        }
    });

    mPhotoFile.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handlePhotoSelection(e.target.files[0]);
        }
    };

    function handlePhotoSelection(file) {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize and compress the image using canvas
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_size = 400;

                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
                modalPhotoPreview.src = currentPhotoBase64;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Modal Operations
    addBtn.onclick = () => {
        modalTitle.innerText = "인원 추가";
        memberForm.reset();
        document.getElementById('editId').value = "";
        currentPhotoBase64 = "";
        modalPhotoPreview.src = "../img/default-profile.png";
        modal.classList.remove('hidden');
    };

    editBtn.onclick = () => {
        const idx = selectEl.value;
        if (idx === "") return;
        const user = members[idx];
        
        modalTitle.innerText = "인원 수정";
        document.getElementById('editId').value = user.id;
        document.getElementById('mName').value = user.name;
        document.getElementById('mNickName').value = user.nickName || "";
        document.getElementById('mAffiliation').value = user.affiliation || "";
        document.getElementById('mPosition').value = user.position || "";
        document.getElementById('mStart').value = user.start;
        document.getElementById('mEnd').value = user.end;
        document.getElementById('mVacStart').value = (user.vacation && user.vacation[0]) || "";
        document.getElementById('mVacEnd').value = (user.vacation && user.vacation[1]) || "";
        document.getElementById('mPfc2cpl').value = (user.promotion && user.promotion.pfc2cpl) || 0;
        document.getElementById('mCpl2sgt').value = (user.promotion && user.promotion.cpl2sgt) || 0;
        
        currentPhotoBase64 = user.photo || "";
        modalPhotoPreview.src = user.photo || "../img/default-profile.png";
        
        modal.classList.remove('hidden');
    };

    deleteBtn.onclick = async () => {
        const idx = selectEl.value;
        if (idx === "") return;
        if (confirm(`'${members[idx].name}' 인원 정보를 정말 삭제하시겠습니까?`)) {
            await window.deleteDBData(STORE_NAME, members[idx].id);
            await init();
        }
    };

    closeBtn.onclick = () => modal.classList.add('hidden');
    window.onclick = (e) => { if (e.target == modal) modal.classList.add('hidden'); };

    memberForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value || Date.now().toString();
        
        const newMember = {
            id: id,
            name: document.getElementById('mName').value,
            nickName: document.getElementById('mNickName').value,
            affiliation: document.getElementById('mAffiliation').value,
            position: document.getElementById('mPosition').value,
            start: document.getElementById('mStart').value,
            end: document.getElementById('mEnd').value,
            vacation: [document.getElementById('mVacStart').value, document.getElementById('mVacEnd').value],
            promotion: {
                pfc2cpl: parseInt(document.getElementById('mPfc2cpl').value) || 0,
                cpl2sgt: parseInt(document.getElementById('mCpl2sgt').value) || 0
            },
            photo: currentPhotoBase64 // 사진 정보 자체를 저장
        };

        await window.putDBData(STORE_NAME, newMember);
        modal.classList.add('hidden');
        await init();
        
        const newIdx = members.findIndex(m => m.id === id);
        if (newIdx !== -1) {
            selectEl.value = newIdx;
            handleMemberSelect(newIdx);
        }
    };

    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function updateStaticProfile(user) {
        document.getElementById('resPhoto').src = user.photo || '../img/default-profile.png';
        document.getElementById('resNickName').innerText = user.nickName || user.name;
        document.getElementById('resName').innerText = user.name;
        document.getElementById('resAffiliation').innerText = user.affiliation || '-';
        document.getElementById('resPosition').innerText = user.position || '-';
        document.getElementById('resStartDate').innerText = user.start || '-';
        document.getElementById('resEndDate').innerText = user.end || '-';
        
        const vacRangeEl = document.getElementById('resVacationRange');
        if (Array.isArray(user.vacation) && user.vacation[0] && user.vacation[1]) {
            const vStart = new Date(user.vacation[0]);
            const vEnd = new Date(user.vacation[1]);
            const diffTime = Math.abs(vEnd - vStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            vacRangeEl.innerText = `${user.vacation[0]} ~ ${user.vacation[1]} (${diffDays}일)`;
        } else {
            vacRangeEl.innerText = '일정 없음';
        }
    }

    function calculateMilitary(user) {
        const now = new Date();
        const start = new Date(user.start);
        const end = new Date(user.end);
        const vacStartStr = Array.isArray(user.vacation) ? user.vacation[0] : null;
        const vac = vacStartStr ? new Date(vacStartStr) : null;

        const totalTime = end - start;
        const passedTime = now - start;
        const remainTime = end - now;

        const percent = Math.min(100, Math.max(0, (passedTime / totalTime) * 100)).toFixed(8);
        const remainDays = Math.ceil(remainTime / (1000 * 60 * 60 * 24));

        const startFirstDay = new Date(start.getFullYear(), start.getMonth(), 1);
        const currentMonthCount = (now.getFullYear() - startFirstDay.getFullYear()) * 12 + (now.getMonth() - startFirstDay.getMonth()) + 1;
        
        const pfc2cpl = (user.promotion && user.promotion.pfc2cpl) || 0;
        const cpl2sgt = (user.promotion && user.promotion.cpl2sgt) || 0;

        const pfcThreshold = 3;
        const cplThreshold = 9 - pfc2cpl;
        const sgtThreshold = 15 - pfc2cpl - cpl2sgt;

        let rank = "", hobong = 0, promoMonthOffset = 0;

        if (currentMonthCount <= pfcThreshold) {
            rank = "이병"; hobong = currentMonthCount; promoMonthOffset = pfcThreshold;
        } else if (currentMonthCount <= cplThreshold) {
            rank = "일병"; hobong = currentMonthCount - pfcThreshold; promoMonthOffset = cplThreshold;
        } else if (currentMonthCount <= sgtThreshold) {
            rank = "상병"; hobong = currentMonthCount - cplThreshold; promoMonthOffset = sgtThreshold;
        } else {
            rank = "병장"; hobong = currentMonthCount - sgtThreshold; promoMonthOffset = -1;
        }

        document.getElementById('resRankStatus').innerText = remainTime > 0 ? `${rank} ${hobong}호봉` : "병장 (전역)";
        document.getElementById('resPercent').innerText = `${percent}%`;
        document.getElementById('progressBarFill').style.width = `${percent}%`;
        document.getElementById('resDday').innerText = remainTime > 0 ? `D-${remainDays}` : "전역 완료";

        let nextPromoDate = null;
        if (promoMonthOffset !== -1) {
            nextPromoDate = new Date(startFirstDay.getFullYear(), startFirstDay.getMonth() + promoMonthOffset, 1);
        }

        const promoDateEl = document.getElementById('resPromoDate');
        const promoDdayEl = document.getElementById('resPromoDday');
        
        if (rank === "병장" || !nextPromoDate || remainTime <= 0) {
            promoDateEl.innerText = "일정 없음";
            promoDdayEl.innerText = "-";
        } else {
            const promoDday = Math.ceil((nextPromoDate - now) / (1000 * 60 * 60 * 24));
            promoDateEl.innerText = formatDate(nextPromoDate);
            promoDdayEl.innerText = `D-${promoDday}`;
        }

        const vacDdayEl = document.getElementById('resVacDday');
        if (vac && vac > now) {
            const vacDday = Math.ceil((vac - now) / (1000 * 60 * 60 * 24));
            vacDdayEl.innerText = `D-${vacDday}`;
        } else {
            vacDdayEl.innerText = "-";
        }
    }

    init();
});
