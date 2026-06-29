const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const previewBox  = document.getElementById('previewBox');
const previewImg  = document.getElementById('previewImg');
const clearBtn    = document.getElementById('clearBtn');
const detectBtn   = document.getElementById('detectBtn');
const btnText     = document.getElementById('btnText');
const btnSpinner  = document.getElementById('btnSpinner');
const confSlider  = document.getElementById('confSlider');
const confVal     = document.getElementById('confVal');
const uploadSection  = document.getElementById('uploadSection');
const resultsSection = document.getElementById('resultsSection');
const noDetectSection= document.getElementById('noDetectSection');
const resultImg   = document.getElementById('resultImg');
const countBadge  = document.getElementById('countBadge');
const detectionsList = document.getElementById('detectionsList');

let selectedFile = null;

// ── Confidence Slider ──────────────────────────────
confSlider.addEventListener('input', () => {
  confVal.textContent = confSlider.value + '%';
});

// ── Drop Zone Click ────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

// ── Drag & Drop ────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// ── File Input Change ──────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

function loadFile(file) {
  const allowed = ['image/jpeg','image/png','image/webp'];
  if (!allowed.includes(file.type)) {
    alert('Please upload a JPG, PNG, or WEBP image.');
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    dropZone.classList.add('hidden');
    previewBox.classList.remove('hidden');
    detectBtn.disabled = false;
    btnText.textContent = 'Detect Potholes';
  };
  reader.readAsDataURL(file);
}

// ── Clear ──────────────────────────────────────────
clearBtn.addEventListener('click', resetUpload);

function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewBox.classList.add('hidden');
  dropZone.classList.remove('hidden');
  detectBtn.disabled = true;
  btnText.textContent = 'Select an image first';
  resultsSection.classList.add('hidden');
  noDetectSection.classList.add('hidden');
}

// ── Detect ─────────────────────────────────────────
detectBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Loading state
  detectBtn.disabled = true;
  btnText.textContent = 'Analysing...';
  btnSpinner.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  noDetectSection.classList.add('hidden');

  const formData = new FormData();
  formData.append('image', selectedFile);
  formData.append('conf', confSlider.value / 100);

  try {
    const res = await fetch('/predict', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      alert('Error: ' + (data.error || 'Something went wrong'));
      return;
    }

    if (data.count === 0) {
      noDetectSection.classList.remove('hidden');
    } else {
      showResults(data);
    }

  } catch (err) {
    alert('Network error. Make sure Flask is running.');
    console.error(err);
  } finally {
    detectBtn.disabled = false;
    btnText.textContent = 'Detect Potholes';
    btnSpinner.classList.add('hidden');
  }
});

function showResults(data) {
  // Result image (cache-bust)
  resultImg.src = data.result_image + '?t=' + Date.now();
  countBadge.textContent = data.count + (data.count === 1 ? ' pothole' : ' potholes');

  // Detection list
  detectionsList.innerHTML = '';
  data.detections.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'detection-item';
    item.innerHTML = `
      <div>
        <div class="det-label">🕳 ${d.label}</div>
        <div class="det-index">Detection #${i + 1}</div>
      </div>
      <div class="det-conf">${d.confidence}%</div>
    `;
    detectionsList.appendChild(item);
  });

  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Try Again Buttons ──────────────────────────────
document.getElementById('tryAgainBtn').addEventListener('click', resetUpload);
document.getElementById('tryAgainBtn2').addEventListener('click', resetUpload);
