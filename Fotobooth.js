/* APP STATE */
let webcamStream = null;
let selectedFilter = 'filter-normal';
let countdownTime = 3;
let activeLayout = 'strip3'; // options: strip3, grid4, single
let targetShots = 3;
let capturedPhotos = [];
let isAudioMuted = false;
let audioCtx = null;
let activeStickers = [];

// DOM Elements Reference
const webcamVideo = document.getElementById('webcamVideo');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const flashOverlay = document.getElementById('flashOverlay');
const photosGrid = document.getElementById('photosGrid');
const emptyPlaceholder = document.getElementById('emptyPlaceholder');
const photoStripCard = document.getElementById('photoStripCard');
const customizationControls = document.getElementById('customizationControls');
const stickersLayer = document.getElementById('stickersLayer');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    initHeartsAnimation();
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('previewDateText').innerText = today;
});

/* FLOATING HEARTS BACKGROUND ANIMATION */
function initHeartsAnimation() {
    const container = document.getElementById('heartsBgContainer');
    const heartIcons = ['❤️', '💖', '💕', '🌸', '✨'];
    for (let i = 0; i < 15; i++) {
        const li = document.createElement('li');
        li.className = 'heart-particle';
        li.innerText = heartIcons[Math.floor(Math.random() * heartIcons.length)];
        li.style.left = `${Math.random() * 100}%`;
        li.style.animationDelay = `${Math.random() * 8}s`;
        li.style.animationDuration = `${8 + Math.random() * 10}s`;
        li.style.fontSize = `${16 + Math.random() * 16}px`;
        container.appendChild(li);
    }
}

/* WEBCAM CAMERA ACCESS */
async function startCamera() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
            audio: false
        });
        webcamVideo.srcObject = webcamStream;
        cameraPlaceholder.classList.add('hidden');
    } catch (err) {
        alert("Gagal mengakses kamera webcam. Pastikan izin kamera telah diberikan di browser Anda.");
        console.error("Camera access error:", err);
    }
}

/* FILTERS & TOOLBAR CONTROLS */
function applyFilter(filterClass, evt) {
    selectedFilter = filterClass;
    webcamVideo.className = `${filterClass}`;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
}

function setTimer(sec) {
    countdownTime = sec;
    document.getElementById('timer3Btn').classList.toggle('active', sec === 3);
    document.getElementById('timer5Btn').classList.toggle('active', sec === 5);
}

function changeLayout(mode) {
    activeLayout = mode;
    if (mode === 'strip3') targetShots = 3;
    else if (mode === 'grid4') targetShots = 4;
    else if (mode === 'single') targetShots = 1;

    document.getElementById('captureBtnText').innerText = `Ambil Foto (${targetShots} Shot)`;
    resetCaptures();
}

/* AUDIO SYNTHESIZER FOR SOUND EFFECTS */
function toggleAudio() {
    isAudioMuted = !isAudioMuted;
    document.getElementById('soundToggleBtn').innerText = isAudioMuted ? '🔇' : '🔊';
}

function playBeep(freq = 600, duration = 0.1) {
    if (isAudioMuted) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log('Audio error:', e);
    }
}

/* PHOTO CAPTURE SEQUENCE & COUNTDOWN */
async function startCaptureSequence() {
    if (!webcamStream) {
        await startCamera();
        if (!webcamStream) return;
    }

    resetCaptures();
    const captureBtn = document.getElementById('captureBtn');
    captureBtn.disabled = true;

    for (let i = 0; i < targetShots; i++) {
        await runCountdown(countdownTime);
        takeSnapshot();
        if (i < targetShots - 1) {
            await new Promise(res => setTimeout(res, 1000));
        }
    }

    captureBtn.disabled = false;
}

function runCountdown(seconds) {
    return new Promise((resolve) => {
        countdownOverlay.classList.remove('hidden');
        let current = seconds;
        countdownNumber.innerText = current;
        playBeep(520, 0.1);

        const timer = setInterval(() => {
            current--;
            if (current > 0) {
                countdownNumber.innerText = current;
                playBeep(520, 0.1);
            } else {
                clearInterval(timer);
                countdownOverlay.classList.add('hidden');
                resolve();
            }
        }, 1000);
    });
}

function takeSnapshot() {
    // Sound & Flash Animation Effect
    playBeep(880, 0.2);
    flashOverlay.classList.add('active');
    setTimeout(() => flashOverlay.classList.remove('active'), 150);

    // Canvas Snapshot Rendering
    const canvas = document.createElement('canvas');
    canvas.width = webcamVideo.videoWidth || 640;
    canvas.height = webcamVideo.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Horizontal mirror flip
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Apply Filter String
    ctx.filter = getCanvasFilterString(selectedFilter);
    ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/png');
    capturedPhotos.push(imageDataUrl);

    updatePhotoStripUI();
}

function getCanvasFilterString(filterClass) {
    switch(filterClass) {
        case 'filter-warm': return 'sepia(0.35) contrast(1.08) brightness(1.05) saturate(1.3)';
        case 'filter-pink': return 'hue-rotate(-25deg) saturate(1.6) contrast(1.05) brightness(1.08)';
        case 'filter-vintage': return 'sepia(0.5) hue-rotate(-15deg) contrast(0.9) brightness(1.1) saturate(0.9)';
        case 'filter-bw': return 'grayscale(1) contrast(1.2) brightness(0.95)';
        case 'filter-glow': return 'contrast(1.1) brightness(1.15) saturate(1.2)';
        default: return 'none';
    }
}

/* PHOTO STRIP RENDER & UI UPDATES */
function updatePhotoStripUI() {
    if (capturedPhotos.length > 0) {
        emptyPlaceholder.classList.add('hidden');
        photoStripCard.classList.remove('hidden');
        customizationControls.classList.remove('hidden');
    }

    photosGrid.innerHTML = '';
    if (activeLayout === 'grid4') {
        photosGrid.className = 'photos-grid grid-4';
    } else {
        photosGrid.className = 'photos-grid';
    }

    capturedPhotos.forEach((src) => {
        const slot = document.createElement('div');
        slot.className = 'photo-slot';
        const img = document.createElement('img');
        img.src = src;
        slot.appendChild(img);
        photosGrid.appendChild(slot);
    });
}

function resetCaptures() {
    capturedPhotos = [];
    photosGrid.innerHTML = '';
    emptyPlaceholder.classList.remove('hidden');
    photoStripCard.classList.add('hidden');
    customizationControls.classList.add('hidden');
    clearStickers();
}

/* CUSTOMIZATION HANDLERS */
function updateFrameTitle(text) {
    document.getElementById('stripTitleText').innerText = text || "Love Story";
}

function updateLoveNote(text) {
    document.getElementById('previewNoteText').innerText = text || "Momen Manis Bersamamu";
}

function setFrameTheme(themeClass, element) {
    photoStripCard.className = `photo-strip-card ${themeClass}`;
    document.querySelectorAll('.color-circle').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

/* STICKER HANDLERS & DRAG-AND-DROP */
function addSticker(emoji) {
    if (capturedPhotos.length === 0) return;

    const sticker = document.createElement('div');
    sticker.className = 'draggable-sticker';
    sticker.innerText = emoji;
    sticker.style.left = '40%';
    sticker.style.top = '40%';

    stickersLayer.appendChild(sticker);
    makeDraggable(sticker);
    activeStickers.push({ emoji, el: sticker });
}

function clearStickers() {
    stickersLayer.innerHTML = '';
    activeStickers = [];
}

function makeDraggable(element) {
    let posX = 0, posY = 0, initialX = 0, initialY = 0;

    element.onmousedown = dragMouseDown;
    element.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        e.preventDefault();
        initialX = e.clientX;
        initialY = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        posX = initialX - e.clientX;
        posY = initialY - e.clientY;
        initialX = e.clientX;
        initialY = e.clientY;
        element.style.top = (element.offsetTop - posY) + "px";
        element.style.left = (element.offsetLeft - posX) + "px";
    }

    function dragTouchStart(e) {
        const touch = e.touches[0];
        initialX = touch.clientX;
        initialY = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchMove;
    }

    function elementTouchMove(e) {
        const touch = e.touches[0];
        posX = initialX - touch.clientX;
        posY = initialY - touch.clientY;
        initialX = touch.clientX;
        initialY = touch.clientY;
        element.style.top = (element.offsetTop - posY) + "px";
        element.style.left = (element.offsetLeft - posX) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

/* HIGH-RESOLUTION CANVAS EXPORT (DOWNLOAD PNG) */
async function downloadPhotoStripHD() {
    if (capturedPhotos.length === 0) return;

    const canvas = document.getElementById('exportCanvas');
    const ctx = canvas.getContext('2d');

    const width = 600;
    let height = 1200;
    if (activeLayout === 'grid4') height = 900;
    if (activeLayout === 'single') height = 750;

    canvas.width = width;
    canvas.height = height;

    // Background Fill
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Frame Border
    ctx.strokeStyle = "#f472b6";
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Header Title
    ctx.fillStyle = "#e11d48";
    ctx.font = "bold 32px 'Playfair Display', serif";
    ctx.textAlign = "center";
    const titleText = document.getElementById('titleInput').value || "Love Story";
    ctx.fillText(titleText.toUpperCase(), width / 2, 60);

    ctx.fillStyle = "#f472b6";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("SWEET MEMORIES", width / 2, 82);

    // Load Photos
    const images = await Promise.all(capturedPhotos.map(src => {
        return new Promise(res => {
            const img = new Image();
            img.onload = () => res(img);
            img.src = src;
        });
    }));

    const pad = 30;
    const topOffset = 110;

    if (activeLayout === 'grid4') {
        const w = (width - (pad * 3)) / 2;
        const h = w * 0.75;
        images.forEach((img, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = pad + col * (w + pad);
            const y = topOffset + row * (h + pad);
            ctx.drawImage(img, x, y, w, h);
            ctx.strokeStyle = "#ffe4e6";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);
        });
    } else {
        const w = width - (pad * 2);
        const h = (activeLayout === 'single') ? 450 : 260;
        images.forEach((img, i) => {
            const x = pad;
            const y = topOffset + i * (h + 20);
            ctx.drawImage(img, x, y, w, h);
            ctx.strokeStyle = "#ffe4e6";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);
        });
    }

    // Footer Note & Date
    const footerY = height - 70;
    const noteText = document.getElementById('noteInput').value || "Momen Manis Bersamamu";
    const dateText = document.getElementById('previewDateText').innerText;

    ctx.fillStyle = "#e11d48";
    ctx.font = "bold 36px 'Caveat', cursive";
    ctx.textAlign = "center";
    ctx.fillText(noteText, width / 2, footerY);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(dateText, width / 2, footerY + 28);

    // Draw Stickers on Canvas Export
    const cardRect = photoStripCard.getBoundingClientRect();
    activeStickers.forEach(s => {
        const sRect = s.el.getBoundingClientRect();
        const relX = (sRect.left - cardRect.left) / cardRect.width;
        const relY = (sRect.top - cardRect.top) / cardRect.height;
        ctx.font = "40px sans-serif";
        ctx.fillText(s.emoji, relX * width + 20, relY * height + 35);
    });

    // Download Trigger
    const a = document.createElement('a');
    a.download = `Photobooth-Cinta-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
}
