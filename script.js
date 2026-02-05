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
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const saunaList = document.getElementById('saunaList');
    const visitDateInput = document.getElementById('visitDate');
    const setsContainer = document.getElementById('setsContainer');
    const addSetBtn = document.getElementById('addSetBtn');

    // Tab Elements
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');
    let calendar = null; // FullCalendar instance

    // Default Date
    visitDateInput.valueAsDate = new Date();

    // Rating Sliders (Overall only now)
    // ratingInput listener removed as it is now calculated

    overallRatingInput.addEventListener('input', (e) => {
        overallRatingValue.textContent = e.target.value;
    });

    // Dynamic Sets Handling
    let setCounter = 0;

    function addSetRow(defaultTime = '') {
        setCounter++;
        const row = document.createElement('div');
        row.className = 'set-row';
        row.dataset.setId = setCounter;

        row.innerHTML = `
            <span class="set-number">${setCounter}セット目</span>
            <div class="set-inputs">
                <input type="number" name="saunaTime[]" placeholder="分" min="0" value="${defaultTime}" required class="set-time-input">
                <div class="set-rating-input">
                    <label>ととのい:</label>
                    <input type="number" name="saunaRating[]" placeholder="1-10" min="1" max="10" required class="set-rating-val">
                </div>
            </div>
            <button type="button" class="remove-set-btn" aria-label="削除">
                <i data-lucide="trash-2" class="icon-xs"></i>
            </button>
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

    // Image Upload Handling
    let currentImageBase64 = null;

    dropZone.addEventListener('click', (e) => {
        if (e.target !== removeImageBtn && e.target.closest('.remove-btn') !== removeImageBtn) {
            imageInput.click();
        }
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
        const file = e.dataTransfer.files[0];
        handleImage(file);
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleImage(file);
    });

    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
    });

    function handleImage(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            imagePreview.src = currentImageBase64;
            previewArea.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        currentImageBase64 = null;
        imagePreview.src = '';
        imageInput.value = '';
        previewArea.classList.add('hidden');
    }

    // Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect set times
        // Collect set times and ratings
        const setsData = [];
        let totalRating = 0;
        let setWithRatingCount = 0;

        const timeInputs = setsContainer.querySelectorAll('input[name="saunaTime[]"]');
        const ratingInputs = setsContainer.querySelectorAll('input[name="saunaRating[]"]');

        timeInputs.forEach((input, index) => {
            if (input.value) {
                const ratingVal = ratingInputs[index] ? parseInt(ratingInputs[index].value) : 0;
                setsData.push({
                    time: input.value,
                    rating: ratingVal
                });

                if (ratingVal > 0) {
                    totalRating += ratingVal;
                    setWithRatingCount++;
                }
            }
        });

        // Calculate Average
        const avgRating = setWithRatingCount > 0 ? (totalRating / setWithRatingCount).toFixed(1) : 0;

        const newRecord = {
            id: Date.now().toString(),
            facilityName: document.getElementById('facilityName').value,
            visitDate: document.getElementById('visitDate').value,
            rating: avgRating, // Calculated average
            overallRating: document.getElementById('overallRating').value,
            sets: setsData, // Array of objects {time, rating}
            memo: document.getElementById('memo').value,
            image: currentImageBase64,
            createdAt: new Date().toISOString()
        };

        saveRecord(newRecord);
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

    function getRecords() {
        const data = localStorage.getItem('sauna-log-data');
        return data ? JSON.parse(data) : [];
    }

    function deleteRecord(id) {
        if (!confirm('この記録を削除してもよろしいですか？')) return;

        const records = getRecords().filter(r => r.id !== id);
        localStorage.setItem('sauna-log-data', JSON.stringify(records));
        loadRecords();
    }

    // UI Rendering
    function loadRecords() {
        const records = getRecords();
        saunaList.innerHTML = '';

        if (records.length === 0) {
            saunaList.innerHTML = `
                <div class="empty-state">
                    <p>まだ記録がありません。<br>今日のととのいを記録しましょう！</p>
                </div>`;
            return;
        }

        records.forEach(record => {
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
        if (record.image) {
            imageHtml = `
                <div class="log-image">
                    <img src="${record.image}" alt="サウナ写真" loading="lazy">
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
                    <div class="sets-pills">
                        ${record.sets.map((set, idx) => {
                // Handle both old string format and new object format
                const time = typeof set === 'object' ? set.time : set;
                const rating = typeof set === 'object' && set.rating ? `<span class="pill-rating">★${set.rating}</span>` : '';
                return `
                            <div class="set-pill">
                                <span>${idx + 1}.</span> <strong>${time}分</strong> ${rating}
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
                        <h3>${escapeHtml(record.facilityName)}</h3>
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
            
            <button class="delete-btn" onclick="document.dispatchEvent(new CustomEvent('delete-record', {detail: '${record.id}'}))">
                削除
            </button>
        `;

        return div;
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

    function switchView(viewName) {
        if (viewName === 'list') {
            listViewBtn.classList.add('active');
            calendarViewBtn.classList.remove('active');
            listView.classList.remove('hidden');
            listView.classList.add('active');
            calendarView.classList.add('hidden');
            calendarView.classList.remove('active');
        } else {
            listViewBtn.classList.remove('active');
            calendarViewBtn.classList.add('active');
            listView.classList.add('hidden');
            listView.classList.remove('active');
            calendarView.classList.remove('hidden');
            calendarView.classList.add('active');

            // Initialize or render calendar
            if (!calendar) {
                initCalendar();
            } else {
                calendar.render();
                updateCalendarEvents(); // Refresh data
            }
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
                // When an event is clicked, switch to list view and maybe filter?
                // For now, let's just alert the details or switch back to list view
                // Ideally we scroll to the item, but simple switch is a good start.
                switchView('list');
                // Optional: Scroll to specific item if we implemented ID on cards
                // const card = document.getElementById(`record-${info.event.id}`);
                // if(card) card.scrollIntoView();
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

    function getCalendarEvents() {
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
