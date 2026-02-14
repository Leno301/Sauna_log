document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('saunaForm');
    const ratingInput = document.getElementById('rating');
    const ratingValue = document.getElementById('ratingValue');
    const overallRatingInput = document.getElementById('overallRating');
    const overallRatingValue = document.getElementById('overallRatingValue');
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const previewArea = document.getElementById('previewArea');
    const saunaList = document.getElementById('saunaList');
    const visitDateInput = document.getElementById('visitDate');
    const setsContainer = document.getElementById('setsContainer');
    const addSetBtn = document.getElementById('addSetBtn');

    // Backup Elements
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // Tab Elements
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const statsViewBtn = document.getElementById('statsViewBtn');
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');
    const statsView = document.getElementById('statsView');
    const statsContainer = document.getElementById('statsContainer');
    const searchInput = document.getElementById('searchInput'); // Search Input
    let calendar = null; // FullCalendar instance

    // Modal Elements
    const imageModal = document.getElementById('imageModal');
    const fullImage = document.getElementById('fullImage');
    const closeModal = document.querySelector('.close-modal');

    // Dynamic Sets Handling
    let setCounter = 0;

    function addSetRow(defaultTime = '', defaultRating = '', defaultAufguss = false, defaultMaster = '') {
        setCounter++;
        const row = document.createElement('div');
        row.className = 'set-row';
        row.dataset.setId = setCounter;

        row.innerHTML = `
            <div class="set-row-top">
                <span class="set-number">${setCounter}セット目</span>
                <button type="button" class="remove-set-btn" aria-label="削除">
                    <i data-lucide="trash-2" class="icon-xs"></i>
                </button>
            </div>
            <div class="set-row-main">
                <div class="set-inputs-row">
                    <div class="input-wrapper time-wrapper">
                        <label>時間(分)</label>
                        <input type="number" name="saunaTime[]" placeholder="-" min="0" value="${defaultTime}" class="set-time-input">
                    </div>
                    <div class="input-wrapper rating-wrapper">
                        <label>ととのい</label>
                        <input type="number" name="saunaRating[]" placeholder="1-10" min="1" max="10" value="${defaultRating}" required class="set-rating-val">
                    </div>
                </div>
                <div class="set-extras-row">
                    <label class="aufguss-label">
                        <input type="checkbox" name="aufguss[]" class="aufguss-check" ${defaultAufguss ? 'checked' : ''}>
                        <i data-lucide="wind" class="icon-xs"></i> アウフグース
                    </label>
                    <input type="text" name="heatWaveMaster[]" placeholder="熱波師名 (任意)" value="${defaultMaster}" class="master-name-input">
                </div>
            </div>
        `;

        setsContainer.appendChild(row);

        // Re-init icon for this row
        if (window.lucide) {
            lucide.createIcons();
        }

        // Add remove listener
        row.querySelector('.remove-set-btn').addEventListener('click', () => {
            row.remove();
            updateSetNumbers();
        });
    }

    function updateSetNumbers() {
        const rows = setsContainer.querySelectorAll('.set-row');
        rows.forEach((row, index) => {
            row.querySelector('.set-number').textContent = `${index + 1}セット目`;
        });
        setCounter = rows.length;
    }

    // Add initial sets (default 3 empty sets)
    addSetRow();
    addSetRow();
    addSetRow();

    addSetBtn.addEventListener('click', () => {
        addSetRow();
    });

    // Overall Rating Slider Logic
    overallRatingInput.addEventListener('input', () => {
        overallRatingValue.textContent = overallRatingInput.value;
    });

    // Image Upload Handling
    let currentImages = [];

    dropZone.addEventListener('click', (e) => {
        imageInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent-color)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        const files = e.dataTransfer.files;
        handleImages(files);
    });

    imageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleImages(files);
    });

    function handleImages(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                currentImages.push(e.target.result);
                updatePreview();
            };
            reader.readAsDataURL(file);
        });
    }

    function updatePreview() {
        previewArea.innerHTML = '';
        if (currentImages.length === 0) {
            previewArea.classList.add('hidden');
            return;
        }

        previewArea.classList.remove('hidden');
        currentImages.forEach((imgSrc, index) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${imgSrc}" alt="Preview ${index + 1}">
                <button type="button" class="preview-remove-btn" onclick="removeImage(${index})">
                    <i data-lucide="x"></i>
                </button>
            `;
            previewArea.appendChild(div);
        });

        if (window.lucide) lucide.createIcons();
    }

    window.removeImage = function (index) {
        currentImages.splice(index, 1);
        updatePreview();
    };

    function clearImage() {
        currentImages = [];
        updatePreview();
        imageInput.value = '';
    }

    // Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect set times and ratings
        const setsData = [];
        let totalRating = 0;
        let setWithRatingCount = 0;

        const timeInputs = setsContainer.querySelectorAll('input[name="saunaTime[]"]');
        const ratingInputs = setsContainer.querySelectorAll('input[name="saunaRating[]"]');
        const aufgussInputs = setsContainer.querySelectorAll('input[name="aufguss[]"]');
        const masterInputs = setsContainer.querySelectorAll('input[name="heatWaveMaster[]"]');

        timeInputs.forEach((input, index) => {
            const ratingVal = ratingInputs[index] ? parseInt(ratingInputs[index].value) : 0;
            const timeVal = input.value;
            const isAufguss = aufgussInputs[index] ? aufgussInputs[index].checked : false;
            const masterName = masterInputs[index] ? masterInputs[index].value.trim() : '';

            // Require at least a rating or time or aufguss info to save the set
            if (ratingVal > 0 || timeVal || isAufguss || masterName) {
                setsData.push({
                    time: timeVal,
                    rating: ratingVal,
                    aufguss: isAufguss,
                    heatWaveMaster: masterName
                });

                if (ratingVal > 0) {
                    totalRating += ratingVal;
                    setWithRatingCount++;
                }
            }
        });

        // Calculate Average
        const avgRating = setWithRatingCount > 0 ? (totalRating / setWithRatingCount).toFixed(1) : 0;

        // Check if editing
        const editId = form.dataset.editId;

        const recordData = {
            id: editId || Date.now().toString(),
            facilityName: document.getElementById('facilityName').value,
            visitDate: document.getElementById('visitDate').value,
            rating: avgRating, // Calculated average
            overallRating: document.getElementById('overallRating').value,
            sets: setsData, // Array of objects {time, rating}
            memo: document.getElementById('memo').value,
            images: currentImages,
            createdAt: editId ? (getRecords().find(r => r.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editId) {
            updateRecord(recordData);
            delete form.dataset.editId;
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.innerHTML = '<i data-lucide="save"></i> 記録する';
        } else {
            saveRecord(recordData);
        }
        form.reset();
        clearImage();

        // Reset defaults
        visitDateInput.valueAsDate = new Date();
        ratingValue.textContent = "-";
        overallRatingValue.textContent = "5";
        document.getElementById('rating').value = "";
        document.getElementById('overallRating').value = 5;

        // Reset Sets to 3
        setsContainer.innerHTML = '';
        setCounter = 0;
        addSetRow();
        addSetRow();
        addSetRow();

        loadRecords();
        saunaList.scrollIntoView({ behavior: 'smooth' });
    });

    // Data Management
    function saveRecord(record) {
        const records = getRecords();
        records.unshift(record);
        localStorage.setItem('sauna-log-data', JSON.stringify(records));
    }

    function updateRecord(updatedRecord) {
        const records = getRecords();
        const index = records.findIndex(r => r.id === updatedRecord.id);
        if (index !== -1) {
            records[index] = updatedRecord;
            localStorage.setItem('sauna-log-data', JSON.stringify(records));
        }
    }

    function getRecords() {
        const data = localStorage.getItem('sauna-log-data');
        return data ? JSON.parse(data) : [];
    }

    function deleteRecord(id) {
        if (!confirm('この記録を削除してもよろしいですか？')) return;

        const records = getRecords().filter(r => r.id !== id);
        localStorage.setItem('sauna-log-data', JSON.stringify(records));
        loadRecords();
        updateCalendarEvents();
    }

    // Backup Functions
    exportBtn.addEventListener('click', () => {
        const records = getRecords();
        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        const a = document.createElement('a');
        a.href = url;
        a.download = `sauna_log_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('現在のデータが上書きされますがよろしいですか？\n(必要であれば先に「保存」を行ってください)')) {
            e.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Simple validation check (should be an array)
                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid data format');
                }

                localStorage.setItem('sauna-log-data', JSON.stringify(importedData));
                loadRecords();
                updateCalendarEvents();
                alert('データの復元が完了しました。');
            } catch (err) {
                console.error('Import Error:', err);
                alert('ファイルの読み込みに失敗しました。\n正しいJSONファイルか確認してください。');
            } finally {
                importFile.value = ''; // Reset input so same file can be selected again if needed
            }
        };
        reader.readAsText(file);
    });

    // Search Input Logic
    searchInput.addEventListener('input', () => {
        loadRecords();
    });

    // UI Rendering
    function loadRecords() {
        const records = getRecords();
        const filterText = searchInput.value.trim().toLowerCase();

        saunaList.innerHTML = '';

        let displayRecords = records;
        if (filterText) {
            displayRecords = records.filter(r => r.facilityName.toLowerCase().includes(filterText));
        }

        if (displayRecords.length === 0) {
            if (filterText) {
                saunaList.innerHTML = `
                <div class="empty-state">
                    <p>「${escapeHtml(filterText)}」に一致する記録は見つかりませんでした。</p>
                </div>`;
            } else {
                saunaList.innerHTML = `
                <div class="empty-state">
                    <p>まだ記録がありません。<br>今日のととのいを記録しましょう！</p>
                </div>`;
            }
            return;
        }

        displayRecords.forEach(record => {
            const card = createRecordCard(record);
            saunaList.appendChild(card);
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function createRecordCard(record) {
        const div = document.createElement('div');
        div.className = 'log-card';

        let imageHtml = '';
        if (record.images && record.images.length > 0) {
            const count = record.images.length;
            let gridClass = 'grid-1';
            if (count === 2) gridClass = 'grid-2';
            else if (count === 3) gridClass = 'grid-3';
            else if (count >= 4) gridClass = 'grid-4';

            imageHtml = `
                <div class="log-image-grid ${gridClass}">
                    ${record.images.map((img, index) => `
                        <div class="log-image-item" onclick="openImageModal('${img}')">
                            <img src="${img}" alt="サウナ写真" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (record.image) {
            // Backward compatibility
            imageHtml = `
                <div class="log-image-grid grid-1">
                    <div class="log-image-item" onclick="openImageModal('${record.image}')">
                        <img src="${record.image}" alt="サウナ写真" loading="lazy">
                    </div>
                </div>
            `;
        }

        // Handle old data format compatibility if necessary
        const overallRating = record.overallRating || '-';

        // Sets display
        let setsHtml = '';
        if (Array.isArray(record.sets) && record.sets.length > 0) {
            setsHtml = `
                <div class="log-sets-display">
                    <span class="sets-label"><i data-lucide="flame" class="icon-xs"></i> サウナ時間記録</span>
                    <div class="sets-pills">
                        ${record.sets.map((set, idx) => {
                // Handle both old string format and new object format
                const time = typeof set === 'object' ? set.time : set;
                const rating = typeof set === 'object' && set.rating ? `<span class="pill-rating">★${set.rating}</span>` : '';
                const aufguss = (typeof set === 'object' && set.aufguss) ? `<i data-lucide="wind" class="icon-inline" title="アウフグース"></i>` : '';
                const master = (typeof set === 'object' && set.heatWaveMaster) ? `<span class="pill-master">(${set.heatWaveMaster})</span>` : '';
                const timeDisplay = time ? `<strong>${time}分</strong>` : '';

                return `
                            <div class="set-pill">
                                <span>${idx + 1}.</span> ${timeDisplay} ${aufguss} ${master} ${rating}
                            </div>
                        `}).join('')}
                    </div>
                </div>
            `;
        } else if (record.stats) {
            // Backward compatibility for old format
            setsHtml = `
                <div class="log-stats">
                     <div class="stat-item"><i data-lucide="thermometer-sun" class="icon-xs"></i> 旧形式データ</div>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="log-header">
                <div class="log-title-row">
                    <div class="log-title">
                        <h3>
                            ${escapeHtml(record.facilityName)}
                            <a href="https://sauna-ikitai.com/search?keyword=${encodeURIComponent(record.facilityName)}" 
                               target="_blank" 
                               class="external-link" 
                               title="サウナイキタイで見る"
                               onclick="event.stopPropagation()">
                                <i data-lucide="external-link" class="icon-xs"></i>
                            </a>
                        </h3>
                        <div class="log-date">${formatDate(record.visitDate)}</div>
                    </div>
                </div>
                
                <div class="log-ratings-row">
                    <div class="log-rating-chip" title="ととのい度">
                        <i data-lucide="sparkles" class="icon-xs"></i>
                        ととのい: <span class="rating-value">${record.rating}</span>
                    </div>
                    <div class="log-rating-chip" title="総合評価">
                        <i data-lucide="award" class="icon-xs"></i>
                        総合: <span class="rating-value">${overallRating}</span>
                    </div>
                </div>
            </div>

            ${setsHtml}

            ${record.memo ? `<div class="log-memo">${escapeHtml(record.memo)}</div>` : ''}
            
            ${imageHtml}
            
            <div class="card-actions" style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
                 <button class="edit-btn" style="background: transparent; border: none; color: var(--secondary-accent); font-size: 0.8rem; cursor: pointer; opacity: 0.8;" onclick="editRecord('${record.id}')">
                    編集
                </button>
                <button class="delete-btn" style="margin-top:0;" onclick="document.dispatchEvent(new CustomEvent('delete-record', {detail: '${record.id}'}))">
                    削除
                </button>
            </div>
        `;

        return div;
    }

    // Modal Logic
    window.openImageModal = function (src) {
        fullImage.src = src;
        imageModal.classList.remove('hidden');
        imageModal.classList.add('active');
    };

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            imageModal.classList.add('hidden');
            imageModal.classList.remove('active');
        });
    }

    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                imageModal.classList.add('hidden');
                imageModal.classList.remove('active');
            }
        });
    }

    // Helper functions
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }

    // Wiring up delete
    document.addEventListener('delete-record', (e) => {
        deleteRecord(e.detail);
    });

    // Tab Switching Logic
    listViewBtn.addEventListener('click', () => {
        switchView('list');
    });

    calendarViewBtn.addEventListener('click', () => {
        switchView('calendar');
    });

    statsViewBtn.addEventListener('click', () => {
        switchView('stats');
    });

    function switchView(viewName) {
        // Reset all active classes
        listViewBtn.classList.remove('active');
        calendarViewBtn.classList.remove('active');
        statsViewBtn.classList.remove('active');

        listView.classList.add('hidden');
        listView.classList.remove('active');
        calendarView.classList.add('hidden');
        calendarView.classList.remove('active');
        statsView.classList.add('hidden');
        statsView.classList.remove('active');

        if (viewName === 'list') {
            listViewBtn.classList.add('active');
            listView.classList.remove('hidden');
            listView.classList.add('active');
        } else if (viewName === 'calendar') {
            calendarViewBtn.classList.add('active');
            calendarView.classList.remove('hidden');
            calendarView.classList.add('active');

            // Initialize or render calendar
            if (!calendar) {
                initCalendar();
            } else {
                calendar.render();
                updateCalendarEvents(); // Refresh data
            }
        } else if (viewName === 'stats') {
            statsViewBtn.classList.add('active');
            statsView.classList.remove('hidden');
            statsView.classList.add('active');
            renderStats();
        }
    }

    function initCalendar() {
        const calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ja',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'today'
            },
            height: 'auto',
            events: getCalendarEvents(),
            eventClick: function (info) {
                switchView('list');
            },
            eventContent: function (arg) {
                return {
                    html: `<div class="fc-content">
                            <span class="fc-title" style="font-weight:600;">${arg.event.title}</span>
                           </div>`
                };
            }
        });
        calendar.render();
    }

    // Statistics Logic
    function renderStats() {
        const records = getRecords();
        statsContainer.innerHTML = '';

        if (records.length === 0) {
            statsContainer.innerHTML = `
                <div class="empty-state">
                    <p>まだ記録がありません。<br>今日のととのいを記録しましょう！</p>
                </div>`;
            return;
        }

        // Aggregate by facility name
        const stats = {};
        records.forEach(record => {
            const name = record.facilityName;
            if (!stats[name]) {
                stats[name] = {
                    count: 0,
                    lastVisit: null
                };
            }
            stats[name].count++;

            // Assuming records are sorted by date desc or taking the latest
            const visitDate = new Date(record.visitDate);
            if (!stats[name].lastVisit || visitDate > new Date(stats[name].lastVisit)) {
                stats[name].lastVisit = record.visitDate;
            }
        });

        // Convert to array and sort by count desc
        const sortedStats = Object.entries(stats)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);

        // Render
        sortedStats.forEach((item, index) => {
            const rank = index + 1;
            let rankClass = 'rank-other';
            if (rank === 1) rankClass = 'rank-1';
            if (rank === 2) rankClass = 'rank-2';
            if (rank === 3) rankClass = 'rank-3';

            const div = document.createElement('div');
            div.className = 'stat-item';
            div.innerHTML = `
                <div class="rank-badge ${rankClass}">${rank}</div>
                <div class="stat-info">
                    <div class="stat-name">${escapeHtml(item.name)}</div>
                    <div class="stat-details">
                        <span>最終訪問: ${formatDate(item.lastVisit)}</span>
                    </div>
                </div>
                <div class="stat-count-badge">${item.count}回</div>
            `;
            div.innerHTML = `
                <div class="rank-badge ${rankClass}">${rank}</div>
                <div class="stat-info">
                    <div class="stat-name">${escapeHtml(item.name)}</div>
                    <div class="stat-details">
                        <span>最終訪問: ${formatDate(item.lastVisit)}</span>
                    </div>
                </div>
                <div class="stat-count-badge">${item.count}回</div>
            `;
            // Add click filtering
            div.style.cursor = 'pointer';
            div.onclick = () => {
                searchInput.value = item.name;
                switchView('list');
                loadRecords();
            };
            statsContainer.appendChild(div);
        });
    }

    // Expose editRecord to window
    window.editRecord = function (id) {
        // ... (existing editRecord implementation) ...
        const records = getRecords();
        const record = records.find(r => r.id === id);
        if (!record) return;

        // Populate Form
        document.getElementById('facilityName').value = record.facilityName;
        document.getElementById('visitDate').value = record.visitDate;
        document.getElementById('overallRating').value = record.overallRating || 5;
        document.getElementById('overallRatingValue').textContent = record.overallRating || 5;
        document.getElementById('memo').value = record.memo || '';

        // Handle Images
        if (record.images && record.images.length > 0) {
            currentImages = [...record.images];
            updatePreview();
        } else if (record.image) {
            // Backward compatibility
            currentImages = [record.image];
            updatePreview();
        } else {
            clearImage();
        }

        // Handle Sets
        setsContainer.innerHTML = ''; // Clear existing
        if (record.sets && record.sets.length > 0) {
            setCounter = 0; // Reset counter 
            record.sets.forEach(set => {
                // Handle object vs string format
                const time = typeof set === 'object' ? set.time : set;
                const rating = typeof set === 'object' ? set.rating : '';
                const aufguss = typeof set === 'object' ? set.aufguss : false;
                const master = typeof set === 'object' ? set.heatWaveMaster : '';

                addSetRow(time, rating, aufguss, master); // This creates the row
            });
            updateSetNumbers();
        } else {
            // Default 3 sets if none
            setCounter = 0;
            addSetRow();
            addSetRow();
            addSetRow();
        }

        // Set Edit Mode
        form.dataset.editId = id;
        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.innerHTML = '<i data-lucide="save"></i> 記録を更新';

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    };

    function getCalendarEvents() {
        // ... (existing implementation)
        const records = getRecords();
        return records.map(record => {
            // Determine color based on rating
            let color = 'var(--accent-color)';
            if (record.rating >= 8) color = '#ec4899'; // Pink for high rating
            else if (record.rating >= 5) color = '#f59e0b'; // Amber for mid
            else color = '#3b82f6'; // Blue for low

            return {
                id: record.id,
                title: record.facilityName,
                start: record.visitDate,
                backgroundColor: color,
                borderColor: color
            };
        });
    }

    function updateCalendarEvents() {
        if (!calendar) return;
        calendar.removeAllEvents();
        calendar.addEventSource(getCalendarEvents());
    }

    loadRecords();
});
