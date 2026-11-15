document.addEventListener('DOMContentLoaded', async () => {
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
    // Outdoor Temp
    const outdoorTempInput = document.getElementById('outdoorTemp');

    // Backup Elements
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // Tab Elements
    const recordViewBtn = document.getElementById('recordViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const calendarViewBtn = document.getElementById('calendarViewBtn');
    const statsViewBtn = document.getElementById('statsViewBtn');
    const recordView = document.getElementById('recordView');
    const historySection = document.getElementById('historySection');
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
                        <input type="number" name="saunaRating[]" placeholder="1-10" min="1" max="10" value="${defaultRating}" class="set-rating-val">
                    </div>
                </div>
                <div class="set-extras-row">
                    <label class="aufguss-label">
                        <input type="checkbox" name="aufguss[]" class="aufguss-check" ${defaultAufguss ? 'checked' : ''}>
                        <i data-lucide="wind" class="icon-xs"></i> アウフグース
                    </label>
                    <input type="text" name="heatWaveMaster[]" placeholder="熱波師名 (任意)" value="${defaultMaster}" class="master-name-input" style="display: ${defaultAufguss ? 'block' : 'none'}; margin-top: 8px;">
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

        // Add aufguss toggle listener
        const aufgussCheck = row.querySelector('.aufguss-check');
        const masterInput = row.querySelector('.master-name-input');
        aufgussCheck.addEventListener('change', (e) => {
            if (e.target.checked) {
                masterInput.style.display = 'block';
                masterInput.focus();
            } else {
                masterInput.style.display = 'none';
                masterInput.value = ''; // Clear value if unchecked
            }
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

        // Try each uploaded image in order until one provides a usable
        // shooting time + GPS position. The first image alone may be a
        // screenshot / edited copy without EXIF, while a later one has it.
        let exifDateHandled = false;
        let weatherHandled = false;

        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) return;

            // EXIF extraction (from the original file object, before compression)
            if (typeof EXIF !== 'undefined' && EXIF.getData) {
                EXIF.getData(file, function () {
                    if (weatherHandled) return;
                    const dateOriginal = EXIF.getTag(this, "DateTimeOriginal")
                        || EXIF.getTag(this, "DateTimeDigitized")
                        || EXIF.getTag(this, "DateTime");
                    const lat = EXIF.getTag(this, "GPSLatitude");
                    const lon = EXIF.getTag(this, "GPSLongitude");
                    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                    const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

                    if (!dateOriginal || typeof dateOriginal !== 'string') {
                        return;
                    }
                    // Format: "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DD"
                    const datePart = dateOriginal.split(' ')[0];
                    if (!datePart) return;
                    const [y, m, d] = datePart.split(':');
                    if (!y || !m || !d) return;
                    const formattedDate = `${y}-${m}-${d}`;

                    if (lat && lon && latRef && lonRef) {
                        const decimalLat = convertDMSToDD(lat, latRef);
                        const decimalLon = convertDMSToDD(lon, lonRef);
                        if (Number.isFinite(decimalLat) && Number.isFinite(decimalLon)) {
                            exifDateHandled = true;
                            weatherHandled = true;
                            visitDateInput.value = formattedDate;
                            fetchWeather(decimalLat, decimalLon, dateOriginal);
                            fetchFacilityName(decimalLat, decimalLon);
                        } else {
                            console.log("Invalid GPS data found");
                            outdoorTempInput.placeholder = "位置情報が無効です";
                            document.getElementById('outdoorHumidity').placeholder = "位置情報が無効です";
                        }
                    } else {
                        console.log("No GPS data found");
                        if (!exifDateHandled) {
                            exifDateHandled = true;
                            visitDateInput.value = formattedDate;
                        }
                        outdoorTempInput.placeholder = "位置情報なし";
                        document.getElementById('outdoorHumidity').placeholder = "位置情報なし";
                    }
                });
            }

            // Compress and process image
            compressImage(file, (compressedDataUrl) => {
                currentImages.push(compressedDataUrl);
                updatePreview();
            });
        });
    }

    async function fetchFacilityName(lat, lon) {
        // Nominatim Reverse Geocoding API
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const facilityInput = document.getElementById('facilityName');

        try {
            // Only fetch if input is empty
            if (facilityInput.value.trim() !== "") {
                return;
            }

            facilityInput.placeholder = "施設名を取得中...";

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'SaunaLogApp/1.0' // Required by Nominatim policy
                }
            });
            const data = await response.json();

            if (data && data.address) {
                // Priority of names to use
                const nameCandidates = [
                    data.address.leisure,
                    data.address.amenity,
                    data.address.building,
                    data.address.shop,
                    data.address.tourism,
                    data.address.office,
                    data.address.name // Generic name if available (often not in address object directly but checked here conceptually)
                ];

                // If 'name' property exists on root object and matches one of the address fields or is better
                if (data.name) {
                    // Sometimes data.name is the best option
                    nameCandidates.unshift(data.name);
                }

                let detectedName = nameCandidates.find(n => n); // Find first truthy value

                // Fallback to address parts if no specific name found
                if (!detectedName) {
                    detectedName = [
                        data.address.road,
                        data.address.neighbourhood,
                        data.address.suburb,
                        data.address.city,
                        data.address.town,
                        data.address.village
                    ].find(n => n);
                }

                if (detectedName) {
                    facilityInput.value = detectedName;
                } else {
                    facilityInput.placeholder = "施設名 (自動取得不可)";
                }
            } else {
                facilityInput.placeholder = "施設名 (取得失敗)";
            }

        } catch (e) {
            console.error("Facility name fetch failed", e);
            facilityInput.placeholder = "施設名";
        }
    }



    function compressImage(file, callback) {
        const maxWidth = 1024;
        const maxHeight = 1024;
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function convertDMSToDD(dms, ref) {
        if (!Array.isArray(dms) || dms.length < 3) return NaN;
        const toNumber = (v) => {
            if (typeof v === 'number') return v;
            if (v && typeof v === 'object' && Number.isFinite(v.numerator) && Number.isFinite(v.denominator) && v.denominator !== 0) {
                return v.numerator / v.denominator;
            }
            return Number(v);
        };
        const deg = toNumber(dms[0]);
        const min = toNumber(dms[1]);
        const sec = toNumber(dms[2]);
        if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return NaN;
        let dd = deg + min / 60 + sec / (60 * 60);
        if (ref === "S" || ref === "W") {
            dd = dd * -1;
        }
        return dd;
    }

    // Parse an Asia/Tokyo wall-clock time ("YYYY-MM-DDTHH:mm" or with seconds)
    // to epoch ms, independent of the browser's timezone.
    function parseJstDateTime(dateTimeStr) {
        const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(dateTimeStr);
        if (!m) return NaN;
        return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - 9 * 60 * 60 * 1000;
    }

    function formatJstDate(epochMs) {
        const d = new Date(epochMs + 9 * 60 * 60 * 1000);
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${mo}-${day}`;
    }

    async function fetchHourlyFromEndpoint(baseUrl, lat, lon, startDate, endDate) {
        const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&start_date=${startDate}&end_date=${endDate}&timezone=Asia%2FTokyo`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} from ${baseUrl}`);
        }
        const data = await response.json();
        if (!data.hourly || !Array.isArray(data.hourly.time) || !Array.isArray(data.hourly.temperature_2m) || !Array.isArray(data.hourly.relative_humidity_2m)) {
            throw new Error("Invalid API response");
        }
        return data.hourly;
    }

    async function fetchWeather(lat, lon, dateOriginal) {
        // dateOriginal format: "YYYY:MM:DD HH:MM:SS" (camera local time, treated as JST).
        // Window: [photoTime - 3h, photoTime] = from 3 hours before the photo
        // to 3 hours after that retraced time. The min-max over this window
        // is shown as the outdoor temperature / humidity trend.
        const humidityInput = document.getElementById('outdoorHumidity');
        const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(dateOriginal || '');
        if (!match) {
            console.error("Invalid DateTimeOriginal:", dateOriginal);
            outdoorTempInput.placeholder = "取得失敗";
            humidityInput.placeholder = "取得失敗";
            return;
        }
        const photoTimeMs = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]) - 9 * 60 * 60 * 1000;
        const windowStartMs = photoTimeMs - 3 * 60 * 60 * 1000;
        const windowEndMs = photoTimeMs;
        const startDateFormatted = formatJstDate(windowStartMs);
        const endDateFormatted = formatJstDate(windowEndMs);

        // Endpoint choice: the Forecast API only covers the recent past
        // (it returns 400 for dates months ago), the Historical Forecast API
        // covers the past few years, and the Archive API (ERA5) covers back
        // to 1940 but lags a few days. Try them in order and fall through
        // to the next one when an endpoint fails or has no usable data
        // in the 3-hour window.
        const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
        const HISTORICAL_FORECAST_URL = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
        const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
        const isRecent = (Date.now() - photoTimeMs) < 5 * 24 * 60 * 60 * 1000;
        const endpoints = isRecent
            ? [FORECAST_URL, HISTORICAL_FORECAST_URL, ARCHIVE_URL]
            : [HISTORICAL_FORECAST_URL, ARCHIVE_URL, FORECAST_URL];

        try {
            outdoorTempInput.placeholder = "取得中...";
            humidityInput.placeholder = "取得中...";

            let found = null;
            let lastError = null;
            for (const baseUrl of endpoints) {
                try {
                    const hourly = await fetchHourlyFromEndpoint(baseUrl, lat, lon, startDateFormatted, endDateFormatted);
                    const tempCandidates = [];
                    const humidCandidates = [];
                    hourly.time.forEach((tStr, i) => {
                        const tMs = parseJstDateTime(tStr);
                        if (Number.isFinite(tMs) && tMs >= windowStartMs && tMs <= windowEndMs) {
                            if (Number.isFinite(hourly.temperature_2m[i])) tempCandidates.push(hourly.temperature_2m[i]);
                            if (Number.isFinite(hourly.relative_humidity_2m[i])) humidCandidates.push(hourly.relative_humidity_2m[i]);
                        }
                    });
                    if (tempCandidates.length > 0 || humidCandidates.length > 0) {
                        found = { tempCandidates, humidCandidates };
                        break;
                    }
                } catch (err) {
                    lastError = err;
                    console.warn("Weather endpoint failed, trying next:", baseUrl, err);
                }
            }

            if (!found) {
                if (lastError) console.error("Weather fetch failed on all endpoints", lastError);
                outdoorTempInput.placeholder = "データなし";
                humidityInput.placeholder = "データなし";
                return;
            }

            const formatRange = (values) => {
                const max = Math.max(...values);
                const min = Math.min(...values);
                return max === min ? `${max}` : `${min}-${max}`;
            };

            if (found.tempCandidates.length > 0) {
                outdoorTempInput.value = formatRange(found.tempCandidates);
            } else {
                outdoorTempInput.placeholder = "データなし";
            }

            if (found.humidCandidates.length > 0) {
                humidityInput.value = formatRange(found.humidCandidates);
            } else {
                humidityInput.placeholder = "データなし";
            }

        } catch (e) {
            console.error("Weather fetch failed", e);
            outdoorTempInput.placeholder = "取得失敗";
            humidityInput.placeholder = "取得失敗";
        }
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
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            // Collect set times and ratings
            const setsData = [];
            let totalRating = 0;
            let setWithRatingCount = 0;

            const timeInputs = setsContainer.querySelectorAll('input[name="saunaTime[]"]');
            const ratingInputs = setsContainer.querySelectorAll('input[name="saunaRating[]"]');
            const aufgussInputs = setsContainer.querySelectorAll('input[name="aufguss[]"]');
            const masterInputs = setsContainer.querySelectorAll('input[name="heatWaveMaster[]"]');

            timeInputs.forEach((input, index) => {
                const ratingStr = ratingInputs[index] ? ratingInputs[index].value : '';
                const ratingVal = ratingStr ? parseInt(ratingStr) : 0;
                const timeVal = input.value;
                const isAufguss = aufgussInputs[index] ? aufgussInputs[index].checked : false;
                const masterName = masterInputs[index] ? masterInputs[index].value.trim() : '';

                // Require at least a rating or time or aufguss info to save the set
                if (ratingVal > 0 || timeVal || isAufguss || masterName) {
                    setsData.push({
                        time: timeVal,
                        rating: ratingStr ? ratingVal : '',
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

            const editId = form.dataset.editId;
            let existingCreatedAt = null;
            if (editId) {
                const records = await getRecords();
                const existingRecord = records.find(r => r.id === editId);
                if (existingRecord) {
                    existingCreatedAt = existingRecord.createdAt;
                }
            }

            const recordData = {
                id: editId || Date.now().toString(),
                facilityName: document.getElementById('facilityName').value,
                visitDate: document.getElementById('visitDate').value,
                outdoorTemp: document.getElementById('outdoorTemp').value, // Added Outdoor Temp
                outdoorHumidity: document.getElementById('outdoorHumidity').value, // Added Outdoor Humidity
                rating: avgRating, // Calculated average
                overallRating: document.getElementById('overallRating').value,
                sets: setsData, // Array of objects {time, rating}
                memo: document.getElementById('memo').value,
                images: currentImages,
                createdAt: existingCreatedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editId) {
                await updateRecord(recordData);
            } else {
                await saveRecord(recordData);
            }

            resetFormState();

            await loadRecords();
            switchView('list');
            saunaList.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error('Submit Error:', err);
            alert('保存中にエラーが発生しました: ' + err.message);
        }
    });

    // Data Management
    // Migration: localStorage -> localForage
    const STORAGE_KEY = 'sauna-log-data';
    localforage.config({
        name: 'SaunaLogApp',
        storeName: 'records'
    });

    try {
        const oldData = localStorage.getItem(STORAGE_KEY);
        if (oldData) {
            const parsedOldData = JSON.parse(oldData);
            await localforage.setItem(STORAGE_KEY, parsedOldData);
            localStorage.removeItem(STORAGE_KEY);
            console.log('Data migrated to localForage successfully.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
    }

    async function saveRecord(record) {
        const records = await getRecords();
        records.unshift(record);
        await localforage.setItem(STORAGE_KEY, records);
    }

    async function updateRecord(updatedRecord) {
        const records = await getRecords();
        const index = records.findIndex(r => r.id === updatedRecord.id);
        if (index !== -1) {
            records[index] = updatedRecord;
            await localforage.setItem(STORAGE_KEY, records);
        }
    }

    async function getRecords() {
        const data = await localforage.getItem(STORAGE_KEY);
        return data ? data : [];
    }

    async function deleteRecord(id) {
        if (!confirm('この記録を削除してもよろしいですか？')) return;

        let records = await getRecords();
        records = records.filter(r => r.id !== id);
        await localforage.setItem(STORAGE_KEY, records);
        await loadRecords();
        updateCalendarEvents();
    }

    // Backup Functions
    exportBtn.addEventListener('click', async () => {
        const records = await getRecords();
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
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Simple validation check (should be an array)
                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid data format');
                }

                await localforage.setItem(STORAGE_KEY, importedData);
                await loadRecords();
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
    searchInput.addEventListener('input', async () => {
        await loadRecords();
    });

    // UI Rendering
    async function loadRecords() {
        const records = await getRecords();
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
                               class="ikitai-btn" 
                               title="サウナイキタイで見る"
                               onclick="event.stopPropagation()">
                                <i data-lucide="search" class="icon-xs" style="width: 14px; height: 14px;"></i> サウナイキタイで検索
                            </a>
                        </h3>
                        <div class="log-date">
                            ${formatDate(record.visitDate)} 
                            ${record.outdoorTemp ? `<span class="temp-badge"><i data-lucide="thermometer" class="icon-xs"></i> 外気: ${escapeHtml(record.outdoorTemp)}℃</span>` : ''}
                            ${record.outdoorHumidity ? `<span class="temp-badge"><i data-lucide="droplets" class="icon-xs"></i> 湿度: ${escapeHtml(record.outdoorHumidity)}%</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="log-ratings-row">
                    <div class="log-rating-chip" title="ととのい度">
                        <i data-lucide="sparkles" class="icon-xs"></i>
                        ととのい: <span class="rating-value">${record.rating == 0 ? '-' : record.rating}</span>
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
    document.addEventListener('delete-record', async (e) => {
        await deleteRecord(e.detail);
    });

    // Tab Switching Logic
    recordViewBtn.addEventListener('click', () => {
        switchView('record');
    });

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
        recordViewBtn.classList.remove('active');
        listViewBtn.classList.remove('active');
        calendarViewBtn.classList.remove('active');
        statsViewBtn.classList.remove('active');

        recordView.classList.add('hidden');
        recordView.classList.remove('active');
        historySection.classList.add('hidden');
        listView.classList.add('hidden');
        listView.classList.remove('active');
        calendarView.classList.add('hidden');
        calendarView.classList.remove('active');
        statsView.classList.add('hidden');
        statsView.classList.remove('active');

        if (viewName === 'record') {
            recordViewBtn.classList.add('active');
            recordView.classList.remove('hidden');
            recordView.classList.add('active');
        } else {
            historySection.classList.remove('hidden');
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
            events: async function (info, successCallback, failureCallback) {
                try {
                    const events = await getCalendarEvents();
                    successCallback(events);
                } catch (e) {
                    failureCallback(e);
                }
            },
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
    async function renderStats() {
        const records = await getRecords();
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
    window.editRecord = async function (id) {
        // ... (existing editRecord implementation) ...
        const records = await getRecords();
        const record = records.find(r => r.id === id);
        if (!record) return;

        // Populate Form
        document.getElementById('facilityName').value = record.facilityName;
        document.getElementById('visitDate').value = record.visitDate;
        document.getElementById('outdoorTemp').value = record.outdoorTemp || ''; // Populate Outdoor Temp
        document.getElementById('outdoorHumidity').value = record.outdoorHumidity || ''; // Populate Outdoor Humidity
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
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        // Scroll to form
        switchView('record');
        form.scrollIntoView({ behavior: 'smooth' });
    };

    async function getCalendarEvents() {
        // ... (existing implementation)
        const records = await getRecords();
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
        calendar.refetchEvents();
    }

    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            resetFormState();
            switchView('list');
            saunaList.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // "入力をクリア" button: delete everything entered for the record
    // being edited (text, sets, photos, ratings) and return the form
    // to its initial state. Saved records are not affected.
    const clearFormBtn = document.getElementById('clearFormBtn');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', () => {
            if (hasFormInput() && !confirm('入力中の内容をすべてクリアしますか？\n（保存済みの記録には影響しません）')) {
                return;
            }
            resetFormState();
        });
    }

    function hasFormInput() {
        if (currentImages.length > 0) return true;
        if (form.dataset.editId) return true;
        const textIds = ['facilityName', 'outdoorTemp', 'outdoorHumidity', 'memo'];
        for (const id of textIds) {
            const el = document.getElementById(id);
            if (el && el.value.trim() !== '') return true;
        }
        if (overallRatingInput && overallRatingInput.value !== '5') return true;
        const setInputs = setsContainer.querySelectorAll('input');
        for (const input of setInputs) {
            if (input.type === 'checkbox') {
                if (input.checked) return true;
            } else if (input.value.trim() !== '') {
                return true;
            }
        }
        return false;
    }

    function resetFormState() {
        delete form.dataset.editId;
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) submitBtn.innerHTML = '<i data-lucide="save"></i> 記録する';

        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        form.reset();
        clearImage();

        const facilityInput = document.getElementById('facilityName');
        if (facilityInput) facilityInput.placeholder = "例: かるまる池袋";
        visitDateInput.valueAsDate = new Date();
        document.getElementById('outdoorTemp').value = "";
        document.getElementById('outdoorHumidity').value = "";
        document.getElementById('outdoorTemp').placeholder = "自動取得または入力";
        document.getElementById('outdoorHumidity').placeholder = "自動取得または入力";
        ratingValue.textContent = "-";
        overallRatingValue.textContent = "5";
        document.getElementById('rating').value = "";
        document.getElementById('overallRating').value = 5;

        setsContainer.innerHTML = '';
        setCounter = 0;
        addSetRow();
        addSetRow();
        addSetRow();

        if (window.lucide) lucide.createIcons();
    }

    loadRecords();
});
