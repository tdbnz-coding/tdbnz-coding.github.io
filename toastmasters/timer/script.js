// Mod by Thomas – Avon Toastmasters Timer (million-dollar edition)
// Settings persist long-term; meeting data (names, roles, logs, scanned agenda) kept for 2 days.

let running = false;
let isStopping = false;
let startTime = null;
let startClockDate = null;
let timerInterval = null;
let logs = [];
let speakerCount = 0;
let wakeLock = null;
let currentZoom = 80;
let isDeleteMode = false;

let audioCtx = null;
let greenSoundPlayed = false;
let yellowSoundPlayed = false;
let redSoundPlayed = false;
let lastRedBuzzerTime = 0;

// Cookie keys
const SETTINGS_COOKIE_KEY = "avon_tm_settings_v3";
const MEETING_COOKIE_KEY = "avon_tm_meeting_v3";

// DOM
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const timerDisplay = document.getElementById("timerDisplay");
const deleteModeBtn = document.getElementById("deleteModeBtn");
const logTableContainer = document.getElementById("logTableContainer");
const presetSelect = document.getElementById("presetSelect");
const competitionModeEl = document.getElementById("competitionMode");
const meetingTitleEl = document.getElementById("meetingTitle");
const timerNameEl = document.getElementById("timerName");

// Time pickers
const greenMin = document.getElementById("greenMin");
const greenSec = document.getElementById("greenSec");
const yellowMin = document.getElementById("yellowMin");
const yellowSec = document.getElementById("yellowSec");
const redMin = document.getElementById("redMin");
const redSec = document.getElementById("redSec");

// Blink & sound
const greenBlink = document.getElementById("greenBlink");
const yellowBlink = document.getElementById("yellowBlink");
const redBlink = document.getElementById("redBlink");
const greenSound = document.getElementById("greenSound");
const yellowSound = document.getElementById("yellowSound");
const redSound = document.getElementById("redSound");

// Dialog
const roleDialogBackdrop = document.getElementById("roleDialogBackdrop");
const dialogNameEl = document.getElementById("dialogName");
const dialogRoleEl = document.getElementById("dialogRole");
const dialogIntroducerRow = document.getElementById("dialogIntroducerRow");
const dialogIntroducerEvalEl = document.getElementById("dialogIntroducerEval");
const dialogCancelBtn = document.getElementById("dialogCancelBtn");
const dialogOkBtn = document.getElementById("dialogOkBtn");

// Menu
const menuButtons = document.querySelectorAll(".menu-btn");
const sections = document.querySelectorAll(".app-section");

// Scan Agenda
const agendaImageInput = document.getElementById("agendaImageInput");
const agendaPdfInput = document.getElementById("agendaPdfInput");
const scanImageBtn = document.getElementById("scanImageBtn");
const scanPdfBtn = document.getElementById("scanPdfBtn");
const scanStatusEl = document.getElementById("scanStatus");
const scanRawTextEl = document.getElementById("scanRawText");
const scanFlowContainer = document.getElementById("scanFlowContainer");
const applyAgendaBtn = document.getElementById("applyAgendaBtn");

// Role list
const ROLE_LIST = [
    "Speaker",
    "Table Topics",
    "Evaluator",
    "Introducer",
    "General Evaluator",
    "Toastmaster",
    "Grammarian",
    "Timer",
    "Presentations Officer",
    "Table Topics Master",
    "Table Topics Evaluator",
    "Sergeant-at-Arms",
    "President",
    "VP Education",
    "VP Membership",
    "VP Public Relations",
    "Secretary",
    "Treasurer",
    "Club Coach",
    "Area Director",
    "Division Director",
    "Contest Chair",
    "Judge",
    "Ballot Counter",
    "Guest",
    "Visitor"
];

// Memory of known people
let peopleMemory = [];

// Scanned agenda flow
let scannedAgendaFlow = [];

// Init
setupPickers();
populateRoleDropdown();
attachEvents();
loadSettingsFromCookie();
loadMeetingFromCookie();
applyZoom();

/* ============================
   COOKIE ENGINE
============================ */
function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/`;
}

function setMeetingCookie(name, value, days = 2) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/`;
}

function getCookie(name) {
    const parts = document.cookie.split("; ").reduce((acc, part) => {
        const [key, val] = part.split("=");
        acc[key] = val;
        return acc;
    }, {});
    if (!parts[name]) return null;
    try {
        return JSON.parse(decodeURIComponent(parts[name]));
    } catch {
        return null;
    }
}

function clearMeetingData() {
    logs = [];
    peopleMemory = [];
    speakerCount = 0;
    scannedAgendaFlow = [];
    updateLogDisplay();
    renderScannedFlow();
    setMeetingCookie(MEETING_COOKIE_KEY, { logs: [], peopleMemory: [], scannedAgendaFlow: [] }, 2);
    alert("Meeting data cleared. Settings are still kept.");
}

/* ============================
   PICKERS + PRESETS
============================ */
function setupPickers() {
    const selects = document.querySelectorAll("select");
    selects.forEach(sel => {
        if (sel === dialogRoleEl) return;
        const max = sel.id.includes("Min") ? 60 : 59;
        for (let i = 0; i <= max; i++) {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = i.toString().padStart(2, "0");
            sel.appendChild(opt);
        }
    });

    setPreset("speaker");
}

function setPreset(preset) {
    switch (preset) {
        case "speaker":
            greenMin.value = 5; greenSec.value = 0;
            yellowMin.value = 6; yellowSec.value = 0;
            redMin.value = 7; redSec.value = 0;
            break;
        case "table_topics":
            greenMin.value = 1; greenSec.value = 0;
            yellowMin.value = 1; yellowSec.value = 30;
            redMin.value = 2; redSec.value = 0;
            break;
        case "evaluator":
            greenMin.value = 2; greenSec.value = 0;
            yellowMin.value = 2; yellowSec.value = 30;
            redMin.value = 3; redSec.value = 0;
            break;
    }
    presetSelect.value = preset;
    saveSettingsToCookie();
}

/* ============================
   ROLE DROPDOWN
============================ */
function populateRoleDropdown() {
    dialogRoleEl.innerHTML = "";
    ROLE_LIST.forEach(role => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = role;
        dialogRoleEl.appendChild(opt);
    });
}

/* ============================
   EVENTS
============================ */
function attachEvents() {
    document.getElementById("startBtn").addEventListener("click", openRoleDialog);
    document.getElementById("stopBtn").addEventListener("click", stopTimer);
    document.getElementById("testSoundBtn").addEventListener("click", () => playBeep(1));
    document.getElementById("exportBtn").addEventListener("click", exportPDF);
    deleteModeBtn.addEventListener("click", toggleDeleteMode);
    document.getElementById("clearDataBtn").addEventListener("click", clearMeetingData);

    document.querySelectorAll(".zoom-btn").forEach(btn => {
        btn.addEventListener("click", () => changeZoom(parseInt(btn.dataset.zoom, 10)));
    });
    document.querySelector(".zoom-reset-btn").addEventListener("click", resetZoom);

    presetSelect.addEventListener("change", e => setPreset(e.target.value));
    competitionModeEl.addEventListener("change", saveSettingsToCookie);
    meetingTitleEl.addEventListener("input", saveSettingsToCookie);
    timerNameEl.addEventListener("input", saveSettingsToCookie);

    greenBlink.addEventListener("change", saveSettingsToCookie);
    yellowBlink.addEventListener("change", saveSettingsToCookie);
    redBlink.addEventListener("change", saveSettingsToCookie);
    greenSound.addEventListener("change", saveSettingsToCookie);
    yellowSound.addEventListener("change", saveSettingsToCookie);
    redSound.addEventListener("change", saveSettingsToCookie);

    document.body.addEventListener("click", initAudio, { once: true });
    document.body.addEventListener("touchstart", initAudio, { once: true });

    window.addEventListener("beforeunload", e => {
        if (logs.length === 0 && scannedAgendaFlow.length === 0) return;
        const msg = "Meeting data is kept for 2 days, but export if you need a PDF. Leave page?";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
    });

    dialogRoleEl.addEventListener("change", () => {
        const role = dialogRoleEl.value;
        dialogIntroducerRow.style.display = role === "Introducer" ? "block" : "none";
    });

    dialogCancelBtn.addEventListener("click", closeRoleDialog);
    dialogOkBtn.addEventListener("click", confirmRoleDialog);

    // Menu
    menuButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.section;
            sections.forEach(sec => {
                sec.classList.toggle("active", sec.id === target);
            });
            menuButtons.forEach(b => b.classList.toggle("active", b === btn));
        });
    });

    // Scan Agenda
    scanImageBtn.addEventListener("click", handleScanImage);
    scanPdfBtn.addEventListener("click", handleScanPdf);
    applyAgendaBtn.addEventListener("click", applyScannedAgendaToMeeting);
}

/* ============================
   AUDIO
============================ */
function initAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
}

function playBeep(times) {
    initAudio();
    for (let i = 0; i < times; i++) {
        const t = audioCtx.currentTime + i * 0.4;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
    }
}

/* ============================
   WAKE LOCK
============================ */
async function requestWakeLock() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch {}
}

/* ============================
   ZOOM
============================ */
function changeZoom(step) {
    currentZoom += step * 15;
    currentZoom = Math.max(40, Math.min(250, currentZoom));
    applyZoom();
    saveSettingsToCookie();
}

function resetZoom() {
    currentZoom = 80;
    applyZoom();
    saveSettingsToCookie();
}

function applyZoom() {
    timerDisplay.style.fontSize = currentZoom + "px";
}

/* ============================
   HELPERS
============================ */
function getSeconds(minId, secId) {
    return parseInt(document.getElementById(minId).value, 10) * 60 +
           parseInt(document.getElementById(secId).value, 10);
}

function formatClockTime(dateObj) {
    if (!dateObj) return "--:--";
    let hh = dateObj.getHours();
    const mm = dateObj.getMinutes().toString().padStart(2, "0");
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
    return `${hh}:${mm} ${ampm}`;
}

/* ============================
   NAME + ROLE DIALOG
============================ */
function openRoleDialog() {
    if (running || isStopping) return;

    dialogNameEl.value = "";
    dialogIntroducerEvalEl.checked = false;

    if (peopleMemory.length > 0) {
        const last = peopleMemory[peopleMemory.length - 1];
        dialogRoleEl.value = last.role || "Speaker";
        dialogIntroducerRow.style.display = dialogRoleEl.value === "Introducer" ? "block" : "none";
        dialogIntroducerEvalEl.checked = !!last.introducerAlsoEvaluator;
    } else {
        dialogRoleEl.value = "Speaker";
        dialogIntroducerRow.style.display = "none";
    }

    roleDialogBackdrop.classList.remove("hidden");
    dialogNameEl.focus();
}

function closeRoleDialog() {
    roleDialogBackdrop.classList.add("hidden");
}

function confirmRoleDialog() {
    const name = dialogNameEl.value.trim();
    if (!name) {
        alert("Please enter a name.");
        return;
    }

    let role = dialogRoleEl.value;
    let introducerAlsoEvaluator = false;

    if (role === "Introducer" && dialogIntroducerEvalEl.checked) {
        role = "Introducer & Evaluator";
        introducerAlsoEvaluator = true;
    }

    const existing = peopleMemory.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        existing.role = role;
        existing.introducerAlsoEvaluator = introducerAlsoEvaluator;
    } else {
        peopleMemory.push({ name, role, introducerAlsoEvaluator });
    }

    saveMeetingToCookie();
    closeRoleDialog();
    startTimerWithInfo({ name, role });
}

/* ============================
   START / STOP
============================ */
function startTimerWithInfo(info) {
    initAudio();
    requestWakeLock();

    running = true;
    startTime = Date.now();
    startClockDate = new Date();

    greenSoundPlayed = yellowSoundPlayed = redSoundPlayed = false;
    lastRedBuzzerTime = 0;

    document.body.className = "";
    timerDisplay.classList.add("is-running");

    timerInterval = setInterval(updateTimer, 100);

    const g = `${greenMin.value.padStart(2,"0")}:${greenSec.value.padStart(2,"0")}`;
    const y = `${yellowMin.value.padStart(2,"0")}:${yellowSec.value.padStart(2,"0")}`;
    const r = `${redMin.value.padStart(2,"0")}:${redSec.value.padStart(2,"0")}`;

    speakerCount++;
    logs.unshift({
        number: speakerCount,
        title: info.name,
        role: info.role,
        preset: presetSelect.value,
        startTime: startClockDate,
        endTime: null,
        duration: "-- minutes : -- seconds",
        targetTimes: `G:${g} Y:${y} R:${r}`,
        color: "#BBBBBB",
        dq: false
    });

    updateLogDisplay();
    saveMeetingToCookie();
}

function stopTimer() {
    if (!running || isStopping) return;

    running = false;
    isStopping = true;
    clearInterval(timerInterval);

    // Turn off flashing lights / colours
    document.body.className = "";
    timerDisplay.classList.remove("is-running");

    const endClockDate = new Date();
    const elapsed = (Date.now() - startTime) / 1000;
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);

    const duration = `${m.toString().padStart(2,"0")} minutes : ${s.toString().padStart(2,"0")} seconds`;

    let color = "#BBBBBB";
    const green = getSeconds("greenMin","greenSec");
    const yellow = getSeconds("yellowMin","yellowSec");
    const red = getSeconds("redMin","redSec");

    if (elapsed >= red) color = "#F44336";
    else if (elapsed >= yellow) color = "#FFC107";
    else if (elapsed >= green) color = "#4CAF50";

    const g = `${greenMin.value.padStart(2,"0")}:${greenSec.value.padStart(2,"0")}`;
    const y = `${yellowMin.value.padStart(2,"0")}:${yellowSec.value.padStart(2,"0")}`;
    const r = `${redMin.value.padStart(2,"0")}:${redSec.value.padStart(2,"0")}`;

    const log = logs[0];
    log.endTime = endClockDate;
    log.duration = duration;
    log.color = color;
    log.targetTimes = `G:${g} Y:${y} R:${r}`;

    if (competitionModeEl.checked) {
        if (elapsed < green || elapsed > red) {
            log.dq = true;
            alert("Competition mode: DISQUALIFIED (outside green–red window).");
        } else {
            log.dq = false;
        }
    }

    updateLogDisplay();
    saveMeetingToCookie();

    timerDisplay.classList.add("text-blink");

    setTimeout(() => {
        minutesEl.innerText = "00";
        secondsEl.innerText = "00";
        timerDisplay.classList.remove("text-blink");
        isStopping = false;
    }, 2000);
}

/* ============================
   UPDATE TIMER
============================ */
function updateTimer() {
    const elapsed = (Date.now() - startTime) / 1000;
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);

    minutesEl.innerText = m.toString().padStart(2,"0");
    secondsEl.innerText = s.toString().padStart(2,"0");

    const green = getSeconds("greenMin","greenSec");
    const yellow = getSeconds("yellowMin","yellowSec");
    const red = getSeconds("redMin","redSec");

    document.body.className = "";

    if (elapsed >= red) {
        document.body.classList.add(redBlink.checked ? "blink-red" : "stage-red");

        if (!redSoundPlayed) {
            if (redSound.checked) playBeep(3);
            redSoundPlayed = true;
            lastRedBuzzerTime = Math.floor(elapsed);
        } else if (Math.floor(elapsed) - lastRedBuzzerTime >= 10) {
            if (redSound.checked) playBeep(3);
            lastRedBuzzerTime = Math.floor(elapsed);
        }

    } else if (elapsed >= yellow) {
        document.body.classList.add(yellowBlink.checked ? "blink-yellow" : "stage-yellow");

        if (!yellowSoundPlayed) {
            if (yellowSound.checked) playBeep(2);
            yellowSoundPlayed = true;
        }

    } else if (elapsed >= green) {
        document.body.classList.add(greenBlink.checked ? "blink-green" : "stage-green");

        if (!greenSoundPlayed) {
            if (greenSound.checked) playBeep(1);
            greenSoundPlayed = true;
        }
    }
}

/* ============================
   LOGS
============================ */
function saveEditedName(index, el) {
    logs[index].title = el.innerText.trim();
    saveMeetingToCookie();
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    deleteModeBtn.innerText = isDeleteMode ? "Done Deleting" : "Delete Speaker";
    updateLogDisplay();
}

function confirmDelete(index) {
    const name = logs[index].title;
    if (confirm(`Delete log for "${name}"?`)) {
        logs.splice(index, 1);
        updateLogDisplay();
        saveMeetingToCookie();
    }
}

function updateLogDisplay() {
    if (logs.length === 0) {
        logTableContainer.innerHTML = "";
        return;
    }

    let html = `
        <table class="log-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Preset</th>
                    <th>Time (Start–Finish)</th>
                    <th>Duration</th>
                    <th>Status</th>
                    ${isDeleteMode ? '<th>Del</th>' : ''}
                </tr>
            </thead>
            <tbody>
    `;

    logs.forEach((log, index) => {
        const timeFrame = log.endTime
            ? `${formatClockTime(log.startTime)} - ${formatClockTime(log.endTime)}`
            : `${formatClockTime(log.startTime)} - --:--`;

        const status = log.dq ? "DQ" : "OK";

        html += `
            <tr style="color:${log.color};">
                <td>${log.number}</td>
                <td>
                    <div class="editable-name"
                         contenteditable="true"
                         onblur="saveEditedName(${index}, this)"
                         spellcheck="false">${log.title}</div>
                </td>
                <td>${log.role}</td>
                <td>${log.preset}</td>
                <td>${timeFrame}</td>
                <td>${log.duration}</td>
                <td>${status}</td>
                ${isDeleteMode ? `<td><button onclick="confirmDelete(${index})">X</button></td>` : ""}
            </tr>
        `;
    });

    html += "</tbody></table>";
    logTableContainer.innerHTML = html;
}

/* ============================
   COOKIE SAVE / LOAD
============================ */
function saveSettingsToCookie() {
    const data = {
        meetingTitle: meetingTitleEl.value,
        timerName: timerNameEl.value,
        preset: presetSelect.value,
        competitionMode: competitionModeEl.checked,
        currentZoom,
        settings: {
            greenMin: greenMin.value,
            greenSec: greenSec.value,
            yellowMin: yellowMin.value,
            yellowSec: yellowSec.value,
            redMin: redMin.value,
            redSec: redSec.value,
            greenBlink: greenBlink.checked,
            yellowBlink: yellowBlink.checked,
            redBlink: redBlink.checked,
            greenSound: greenSound.checked,
            yellowSound: yellowSound.checked,
            redSound: redSound.checked
        }
    };

    setCookie(SETTINGS_COOKIE_KEY, data, 365);
}

function loadSettingsFromCookie() {
    const data = getCookie(SETTINGS_COOKIE_KEY);
    if (!data) return;

    meetingTitleEl.value = data.meetingTitle || "";
    timerNameEl.value = data.timerName || "";
    currentZoom = data.currentZoom || 80;

    presetSelect.value = data.preset || "speaker";
    competitionModeEl.checked = !!data.competitionMode;

    if (data.settings) {
        greenMin.value = data.settings.greenMin ?? greenMin.value;
        greenSec.value = data.settings.greenSec ?? greenSec.value;
        yellowMin.value = data.settings.yellowMin ?? yellowMin.value;
        yellowSec.value = data.settings.yellowSec ?? yellowSec.value;
        redMin.value = data.settings.redMin ?? redMin.value;
        redSec.value = data.settings.redSec ?? redSec.value;

        greenBlink.checked = data.settings.greenBlink ?? true;
        yellowBlink.checked = data.settings.yellowBlink ?? true;
        redBlink.checked = data.settings.redBlink ?? true;
        greenSound.checked = !!data.settings.greenSound;
        yellowSound.checked = !!data.settings.yellowSound;
        redSound.checked = !!data.settings.redSound;
    }
}

function saveMeetingToCookie() {
    const data = {
        logs,
        peopleMemory,
        scannedAgendaFlow
    };
    setMeetingCookie(MEETING_COOKIE_KEY, data, 2);
}

function loadMeetingFromCookie() {
    const data = getCookie(MEETING_COOKIE_KEY);
    if (!data) return;

    logs = Array.isArray(data.logs)
        ? data.logs.map(l => ({
            ...l,
            startTime: l.startTime ? new Date(l.startTime) : null,
            endTime: l.endTime ? new Date(l.endTime) : null
        }))
        : [];

    peopleMemory = Array.isArray(data.peopleMemory) ? data.peopleMemory : [];
    scannedAgendaFlow = Array.isArray(data.scannedAgendaFlow) ? data.scannedAgendaFlow : [];

    speakerCount = logs.length ? Math.max(...logs.map(l => l.number)) : 0;

    updateLogDisplay();
    renderScannedFlow();
}

/* ============================
   EXPORT PDF
============================ */
function exportPDF() {
    if (logs.length === 0) {
        alert("No timing logs to export yet!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).replace(/ /g, "-");

    doc.setFontSize(14);
    doc.text(`Avon Toastmasters Timing Logs – ${dateStr}`, 14, 18);

    if (meetingTitleEl.value) {
        doc.setFontSize(11);
        doc.text(`Meeting: ${meetingTitleEl.value}`, 14, 25);
    }
    if (timerNameEl.value) {
        doc.setFontSize(11);
        doc.text(`Timer: ${timerNameEl.value}`, 14, 31);
    }

    const tableData = [...logs].reverse().map(log => {
        const timeFrame = log.endTime
            ? `${formatClockTime(log.startTime)} - ${formatClockTime(log.endTime)}`
            : `${formatClockTime(log.startTime)} - In Progress`;

        return [
            log.number,
            log.title,
            log.role,
            log.preset,
            log.targetTimes || "--",
            timeFrame,
            log.duration,
            log.dq ? "DQ" : "OK"
        ];
    });

    doc.autoTable({
        startY: 38,
        head: [['#', 'Name', 'Role', 'Preset', 'Targets', 'Time Frame', 'Duration', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        didParseCell: function (data) {
            if (data.section !== 'body') return;
            const originalLog = [...logs].reverse()[data.row.index];
            if (originalLog.color === '#4CAF50') {
                data.cell.styles.fillColor = [76, 175, 80];
                data.cell.styles.textColor = [255, 255, 255];
            } else if (originalLog.color === '#FFC107') {
                data.cell.styles.fillColor = [255, 193, 7];
                data.cell.styles.textColor = [0, 0, 0];
            } else if (originalLog.color === '#F44336') {
                data.cell.styles.fillColor = [244, 67, 54];
                data.cell.styles.textColor = [255, 255, 255];
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFontSize(9);
    doc.text("Mod by Thomas for Avon Toastmasters – meeting data kept for 2 days on this device.", 14, finalY + 10);

    doc.save(`Avon_Timing_Logs_${dateStr}.pdf`);
}

// ===== SCAN AGENDA – IMAGE (improved local) =====
async function handleScanImage() {
    const file = agendaImageInput.files && agendaImageInput.files[0];
    if (!file) {
        alert("Please choose an agenda image first.");
        return;
    }

    scanStatusEl.textContent = "Scanning image…";
    scanRawTextEl.value = "";
    scannedAgendaFlow = [];
    renderScannedFlow();

    try {
        const worker = await Tesseract.createWorker({
            logger: m => {
                if (m.status === "recognizing text") {
                    scanStatusEl.textContent = `Scanning image… ${Math.round(m.progress * 100)}%`;
                }
            }
        });

        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        // Preprocess: convert to grayscale & increase contrast
        const imageBitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageBitmap, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            const v = avg > 140 ? 255 : 0; // simple threshold
            data[i] = data[i+1] = data[i+2] = v;
        }
        ctx.putImageData(imgData, 0, 0);

        const { data: ocr } = await worker.recognize(canvas);
        await worker.terminate();

        const text = ocr.text || "";
        scanRawTextEl.value = text;
        scanStatusEl.textContent = "Image scanned. Parsing agenda…";

        parseAgendaText(text);
    } catch (err) {
        console.error(err);
        scanStatusEl.textContent = "Error scanning image.";
    }
}

// ===== SCAN AGENDA – PDF (strong local) =====
async function handleScanPdf() {
    const file = agendaPdfInput.files && agendaPdfInput.files[0];
    if (!file) {
        alert("Please choose an agenda PDF first.");
        return;
    }

    scanStatusEl.textContent = "Scanning PDF…";
    scanRawTextEl.value = "";
    scannedAgendaFlow = [];
    renderScannedFlow();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join("\n") + "\n";
        }

        scanRawTextEl.value = fullText;
        scanStatusEl.textContent = "PDF scanned. Parsing agenda…";

        parseAgendaText(fullText);
    } catch (err) {
        console.error(err);
        scanStatusEl.textContent = "Error scanning PDF.";
    }
}

// ===== PARSE AGENDA TEXT (3-column, mixed durations) =====
function parseAgendaText(text) {
    const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const timeRegex = /^(\d{1,2}:\d{2})\b/;
    const durationRegex = /\b(\d+\s*[-–]\s*\d+\s*(?:min|minutes)?|\d+\s*(?:min|minutes))\b/i;

    const flow = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const timeMatch = line.match(timeRegex);
        if (!timeMatch) continue;

        const timeStr = timeMatch[1];

        // Collect a small window of lines that belong to this row
        const rowLines = [line];
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
            if (timeRegex.test(lines[j])) break;
            rowLines.push(lines[j]);
        }

        const joined = rowLines.join(" | ");

        // Try to split into 3 logical columns: time | role/activity | name
        // Heuristic: last "chunk" is name, middle is role/activity.
        const parts = joined.split("|").map(p => p.trim()).filter(p => p.length > 0);

        let role = "";
        let name = "";
        let duration = "";

        // Duration anywhere in the row
        const durMatch = joined.match(durationRegex);
        if (durMatch) {
            duration = durMatch[1].replace(/\s+/g, " ").trim();
        }

        // If we have at least 3 parts, assume:
        // [0] contains time, [1] role/activity, [2+] name or extra
        if (parts.length >= 3) {
            // Remove time from first part
            const first = parts[0].replace(timeRegex, "").trim();
            const middle = parts[1];
            const last = parts.slice(2).join(" ").trim();

            // Role is usually in first or middle
            const roleCandidate = middle || first;
            role = roleCandidate;

            // Name is usually last
            name = last;

        } else if (parts.length === 2) {
            // [0] time + role, [1] name
            const first = parts[0].replace(timeRegex, "").trim();
            role = first;
            name = parts[1];
        } else {
            // Fallback: everything after time is role, no name
            const rest = joined.replace(timeRegex, "").trim();
            role = rest;
            name = "";
        }

        // Clean role/name a bit
        role = role.replace(/\s+/g, " ").trim();
        name = name.replace(/\s+/g, " ").trim();

        // If name looks like "Name" placeholder, drop it
        if (/^name$/i.test(name)) {
            name = "";
        }

        // Try to map role to known roles if possible
        let mappedRole = role;
        for (const r of ROLE_LIST) {
            const regex = new RegExp(`\\b${r}\\b`, "i");
            if (regex.test(role)) {
                mappedRole = r;
                break;
            }
        }

        flow.push({
            time: timeStr,
            role: mappedRole || "Agenda Item",
            name,
            duration,
            raw: joined
        });
    }

    scannedAgendaFlow = flow;
    renderScannedFlow();

    if (flow.length === 0) {
        scanStatusEl.textContent = "No clear agenda items found. You may need to edit manually.";
    } else {
        const missingDur = flow.filter(item => !item.duration);
        if (missingDur.length > 0) {
            scanStatusEl.textContent = `Agenda parsed with ${flow.length} items. Some items missing durations – preset timings will be used and time alerts shown.`;
        } else {
            scanStatusEl.textContent = `Agenda parsed with ${flow.length} items. All items have durations or times.`;
        }
    }

    saveMeetingToCookie();
}

// ===== RENDER SCANNED FLOW (cleaner) =====
function renderScannedFlow() {
    if (!scannedAgendaFlow || scannedAgendaFlow.length === 0) {
        scanFlowContainer.innerHTML = "<p style='font-size:12px;opacity:0.8;'>No scanned agenda yet.</p>";
        return;
    }

    let html = "";
    scannedAgendaFlow.forEach((item, index) => {
        const durationText = item.duration ? item.duration : "No duration – will use preset timing";
        const alertText = item.duration ? "" : "⚠ Missing time – preset timing + alert";

        html += `
            <div class="scan-flow-item">
                <div class="scan-flow-item-header">
                    <div class="scan-flow-item-main">
                        ${index + 1}. ${item.role}${item.name ? " – " + item.name : ""}
                    </div>
                    <button onclick="startFromAgendaItem(${index})">Start Item</button>
                </div>
                <div class="scan-flow-item-meta">
                    Time: ${item.time || "--:--"} · Duration: ${durationText}<br>
                    ${alertText}
                </div>
            </div>
        `;
    });

    scanFlowContainer.innerHTML = html;
}

// ===== START FROM AGENDA ITEM (uses role + duration) =====
function startFromAgendaItem(index) {
    const item = scannedAgendaFlow[index];
    if (!item) return;

    // Map role to preset
    const roleLower = item.role.toLowerCase();
    if (roleLower.includes("table topics")) {
        setPreset("table_topics");
    } else if (roleLower.includes("evaluat")) {
        setPreset("evaluator");
    } else {
        setPreset("speaker");
    }

    // If duration exists, map to green/yellow/red
    if (item.duration) {
        const rangeMatch = item.duration.match(/(\d+)\s*[-–]\s*(\d+)/);
        const singleMatch = item.duration.match(/(\d+)\s*(?:min|minutes)?/i);

        if (rangeMatch) {
            const minLow = parseInt(rangeMatch[1], 10);
            const minHigh = parseInt(rangeMatch[2], 10);
            greenMin.value = minLow;
            greenSec.value = 0;
            yellowMin.value = minLow + Math.floor((minHigh - minLow) / 2);
            yellowSec.value = 0;
            redMin.value = minHigh;
            redSec.value = 0;
        } else if (singleMatch) {
            const m = parseInt(singleMatch[1], 10);
            greenMin.value = Math.max(m - 1, 0);
            greenSec.value = 0;
            yellowMin.value = m;
            yellowSec.value = 0;
            redMin.value = m + 1;
            redSec.value = 0;
        }
    } else {
        alert("This agenda item has no duration – using preset timing and will show time alerts.");
    }

    saveSettingsToCookie();

    const name = item.name || item.role;
    const role = item.role;

    startTimerWithInfo({ name, role });
}

// ===== APPLY SCANNED AGENDA (keep as-is) =====
function applyScannedAgendaToMeeting() {
    if (!scannedAgendaFlow || scannedAgendaFlow.length === 0) {
        alert("No scanned agenda to apply.");
        return;
    }

    scanStatusEl.textContent = "Scanned agenda applied to this meeting. You can start items from the Scan Agenda tab or use manual Start.";
    saveMeetingToCookie();
}
