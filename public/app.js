const nav = document.getElementById('report-nav');
const main = document.getElementById('report-main');
const versionEl = document.getElementById('app-version');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const reportsContainer = document.getElementById('reports-container');
const fileChipsContainer = document.getElementById('file-chips');
const fullscreenOverlay = document.getElementById('fullscreen-overlay');
const fullscreenContent = document.getElementById('fullscreen-content');
const tradeDetailOverlay = document.getElementById('trade-detail-overlay');
const tradeDetailContent = document.getElementById('trade-detail-content');
let reports = [];
let appVersion = '1.0.0';
let uploadedFilesData = [];
let activeReportId = null;

async function loadReports() {
  try {
    const [metaRes, reportsRes] = await Promise.all([
      fetch('/api/version'),
      fetch('/api/reports'),
    ]);
    if (!metaRes.ok) throw new Error('Failed to load version');
    if (!reportsRes.ok) throw new Error('Failed to load reports');
    const meta = await metaRes.json();
    const data = await reportsRes.json();
    appVersion = data.version || meta.version || appVersion;
    versionEl.textContent = `v${appVersion}`;
    reports = data.reports || [];
    renderSidebar();
  } catch (err) {
    reportsContainer.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function renderSidebar() {
  nav.innerHTML = '';
  const groups = {};
  reports.forEach((report) => {
    const cat = report.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(report);
  });
  const sortedCats = Object.keys(groups).sort();
  sortedCats.forEach((cat) => {
    const header = document.createElement('div');
    header.className = 'nav-category-header';
    header.textContent = cat;
    nav.appendChild(header);
    groups[cat].forEach((report) => {
      const btn = document.createElement('button');
      btn.className = 'report-btn';
      btn.innerHTML = `<div class="title">${escapeHtml(report.title)}</div><div class="desc">${escapeHtml(report.description)}</div>`;
      btn.addEventListener('click', () => selectReport(report.id, btn));
      nav.appendChild(btn);
    });
  });
}

async function selectReport(id, btn) {
  document.querySelectorAll('.report-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  activeReportId = id;
  if (uploadedFilesData.length === 0) {
    reportsContainer.innerHTML = `<div class="empty-state">Please upload a JSON file to view reports.</div>`;
    return;
  }
  reportsContainer.innerHTML = `<div class="empty-state">Loading...</div>`;
  renderUploadedReport(id);
}

function renderReport(data) {
  reportsContainer.innerHTML = `
    <div class="report-view">
      <div class="report-header">
        <h2>${escapeHtml(data.title)}</h2>
        <p>${escapeHtml(data.description)}</p>
      </div>
      <div class="report-body">${data.html || '<p style="color:var(--muted)">No content.</p>'}</div>
    </div>
  `;
}

function renderUploadedReport(id) {
  reportsContainer.innerHTML = '';
  dropZone.classList.add('has-reports');
  const shouldCollapse = uploadedFilesData.length > 3;
  uploadedFilesData.forEach((file, index) => {
    const col = document.createElement('div');
    col.className = 'report-column' + (shouldCollapse ? ' collapsed' : '');
    col.dataset.index = index;

    const header = document.createElement('div');
    header.className = 'report-column-header';
    header.innerHTML = `
      <span>${escapeHtml(file.fileName)} (${file.eventsCount} events)</span>
      <div class="report-column-actions">
        <button class="icon-btn toggle-btn" title="Expand/Collapse">${shouldCollapse ? '+' : '−'}</button>
        <button class="icon-btn zoom-btn" title="Fullscreen">⛶</button>
      </div>
    `;
    col.appendChild(header);

    const report = file.reports && file.reports[id];
    if (!report) {
      const card = document.createElement('div');
      card.className = 'report-item';
      card.innerHTML = `<p>No data</p>`;
      col.appendChild(card);
    } else {
      const card = document.createElement('div');
      card.className = 'report-item';
      card.innerHTML = `
        <h4>${escapeHtml(report.title || id)}</h4>
        ${report.description ? `<p class="report-desc">${escapeHtml(report.description)}</p>` : ''}
        <div class="report-body">${report.html || '<p style="color:var(--muted)">No content.</p>'}</div>
      `;
      col.appendChild(card);
    }

    header.querySelector('.toggle-btn').addEventListener('click', () => {
      col.classList.toggle('collapsed');
      const btn = header.querySelector('.toggle-btn');
      btn.textContent = col.classList.contains('collapsed') ? '+' : '−';
    });

    header.querySelector('.zoom-btn').addEventListener('click', () => {
      openFullscreen(file, id);
    });

    reportsContainer.appendChild(col);
  });
}

function setDropMessage(text, type = '') {
  let msg = dropZone.querySelector('.drop-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'drop-message';
    dropZone.querySelector('.drop-content').appendChild(msg);
  }
  msg.textContent = text;
  msg.className = 'drop-message ' + type;
}

function clearDropMessage() {
  const msg = dropZone.querySelector('.drop-message');
  if (msg) msg.remove();
}

function renderFileChips() {
  fileChipsContainer.innerHTML = '';
  uploadedFilesData.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.innerHTML = `
      <span>${escapeHtml(file.fileName)}</span>
      <button class="remove" data-index="${index}" title="Remove file">&times;</button>
    `;
    chip.querySelector('.remove').addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      removeFile(idx);
    });
    fileChipsContainer.appendChild(chip);
  });
}

function removeFile(index) {
  uploadedFilesData.splice(index, 1);
  renderFileChips();
  if (uploadedFilesData.length === 0) {
    reportsContainer.innerHTML = '';
    dropZone.classList.remove('has-reports');
    activeReportId = null;
    document.querySelectorAll('.report-btn').forEach((b) => b.classList.remove('active'));
  } else if (activeReportId) {
    renderUploadedReport(activeReportId);
  }
}

function openFullscreen(file, reportId) {
  const report = file.reports && file.reports[reportId];
  if (!report) {
    fullscreenContent.innerHTML = '<p>No data</p>';
  } else {
    fullscreenContent.innerHTML = `
      <h2>${escapeHtml(report.title || reportId)}</h2>
      ${report.description ? `<p>${escapeHtml(report.description)}</p>` : ''}
      <div class="report-body">${report.html || '<p style="color:var(--muted)">No content.</p>'}</div>
    `;
  }
  fullscreenOverlay.classList.add('open');
}

function closeFullscreen() {
  fullscreenOverlay.classList.remove('open');
}

function openTradeDetail(positionId) {
  tradeDetailContent.innerHTML = '<div class="empty-state">Loading trade details...</div>';
  tradeDetailOverlay.classList.add('open');
  fetch(`/api/trades/${encodeURIComponent(positionId)}`)
    .then((res) => {
      if (!res.ok) throw new Error('Trade not found');
      return res.json();
    })
    .then((data) => {
      const events = data.events || [];
      const timeline = events
        .map((ev) => {
          const fields = Object.entries(ev)
            .filter(([k]) => !['serial', 'orderId'].includes(k))
            .map(([k, v]) => {
              const display = v === null || v === undefined ? '<span style="color:#64748b">null</span>' : escapeHtml(String(v));
              return `<div class="event-field"><div class="event-field-label">${escapeHtml(k)}</div><div class="event-field-value">${display}</div></div>`;
            })
            .join('');
          const date = new Date(Number(ev.time));
          const timeStr = date.toISOString().replace('T', ' ').slice(0, 19);
          return `<div class="event-card">
            <div class="event-card-header">
              <div class="event-type">${escapeHtml(ev.event)}</div>
              <div class="event-time">${timeStr}</div>
            </div>
            <div class="event-grid">${fields}</div>
          </div>`;
        })
        .join('');
      tradeDetailContent.innerHTML = `
        <h2 style="margin-top:0">Position #${escapeHtml(String(data.positionId))}</h2>
        <p style="color:var(--muted);font-size:13px;margin-bottom:12px;">${events.length} event(s) in lifecycle</p>
        <div class="event-timeline">${timeline}</div>
      `;
    })
    .catch((err) => {
      tradeDetailContent.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    });
}

function closeTradeDetail() {
  tradeDetailOverlay.classList.remove('open');
}

tradeDetailOverlay.querySelector('.trade-detail-close').addEventListener('click', closeTradeDetail);
tradeDetailOverlay.addEventListener('click', (e) => {
  if (e.target === tradeDetailOverlay) closeTradeDetail();
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('trade-link')) {
    const pid = e.target.dataset.positionId;
    if (pid != null) openTradeDetail(pid);
  }
  if (e.target.classList.contains('wd-cell')) {
    const cell = e.target;
    const w = cell.dataset.w;
    const l = cell.dataset.l;
    if (cell.dataset.showingWl === 'true') {
      cell.textContent = cell.dataset.avg;
      cell.dataset.showingWl = 'false';
      cell.style.opacity = '1';
    } else {
      cell.dataset.avg = cell.textContent;
      cell.textContent = `${w}W / ${l}L`;
      cell.dataset.showingWl = 'true';
      cell.style.opacity = '0.85';
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (tradeDetailOverlay.classList.contains('open')) closeTradeDetail();
    else if (fullscreenOverlay.classList.contains('open')) closeFullscreen();
  }
});

async function handleFile(fileList) {
  if (!fileList || fileList.length === 0) return;
  const files = Array.isArray(fileList) ? fileList : [fileList];
  const jsonFiles = files.filter(f => f.type === 'application/json' || f.name.endsWith('.json'));
  if (jsonFiles.length === 0) {
    setDropMessage('Please upload JSON file(s).', 'error');
    return;
  }
  clearDropMessage();
  dropZone.classList.add('processing');
  setDropMessage('Processing...', '');
  try {
    const formData = new FormData();
    jsonFiles.forEach(f => formData.append('files', f));
    formData.append('filename', jsonFiles[0].name);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    uploadedFilesData = Array.isArray(data.files) ? data.files : [];
    const filesLoaded = uploadedFilesData.length;
    setDropMessage(`Loaded ${filesLoaded} file(s).`, 'success');
    reportsContainer.innerHTML = '';
    dropZone.classList.add('has-reports');
    if (activeReportId) {
      renderUploadedReport(activeReportId);
    }
    renderFileChips();
  } catch (err) {
    setDropMessage(err.message, 'error');
  } finally {
    dropZone.classList.remove('processing');
  }
}

['dragenter', 'dragover'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files);
  if (files.length === 0) return;
  handleFile(files);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  handleFile(files);
});

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

fullscreenOverlay.querySelector('.fullscreen-close').addEventListener('click', closeFullscreen);

loadReports();
