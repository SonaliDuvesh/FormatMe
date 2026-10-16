let fileQueue = [];
let activeFileIndex = -1;
let pendingPasswordCallback = null;
let isConvertingQueue = false;

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    if (!response.ok) {
      const cleanMsg = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      throw new Error(`Server error (${response.status}): ${cleanMsg.slice(0, 100) || response.statusText}`);
    }
    throw new Error("Invalid response format received from server.");
  }
}

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const headerAddBtn = document.getElementById("header-add-btn");
const queueSection = document.getElementById("queue-section");
const queueList = document.getElementById("queue-list");
const queueCount = document.getElementById("queue-count");
const queueConvertAllBtn = document.getElementById("queue-convert-all-btn");
const queueConvertAllText = document.getElementById("queue-convert-all-text");
const autoConvertToggle = document.getElementById("auto-convert-toggle");
const inspectorCard = document.getElementById("inspector-card");
const inspectorBadge = document.getElementById("inspector-badge");
const fileInfoContainer = document.getElementById("file-info-container");
const detectedFormatBadge = document.getElementById("detected-format-badge");
const detectedMime = document.getElementById("detected-mime");
const detectedSize = document.getElementById("detected-size");
const targetFormatsContainer = document.getElementById("target-formats-container");
const settingsPanel = document.getElementById("settings-panel");
const dynamicSettingsControls = document.getElementById("dynamic-settings-controls");
const convertMainBtn = document.getElementById("convert-main-btn");
const convertBtnText = document.getElementById("convert-btn-text");
const convertSelectedOnlyBtn = document.getElementById("convert-selected-only-btn");
const progressCard = document.getElementById("progress-card");
const progressStatus = document.getElementById("progress-status");
const progressPercentage = document.getElementById("progress-percentage");
const progressBarFill = document.getElementById("progress-bar-fill");
const resultsSection = document.getElementById("results-section");
const resultsList = document.getElementById("results-list");
const downloadAllZipBtn = document.getElementById("download-all-zip-btn");
const notificationBanner = document.getElementById("notification-banner");
const notifTitle = document.getElementById("notif-title");
const notifMessage = document.getElementById("notif-message");
const notifIcon = document.getElementById("notif-icon");
const notifIconBox = document.getElementById("notif-icon-box");
const multiFileActions = document.getElementById("multi-file-actions");
const combineImagesBtn = document.getElementById("combine-images-btn");
const mergePdfsBtn = document.getElementById("merge-pdfs-btn");
const passwordModal = document.getElementById("password-modal");
const modalPasswordInput = document.getElementById("modal-password-input");
const batchTargetContainer = document.getElementById("batch-target-container");
const batchTargetSelect = document.getElementById("batch-target-select");
const applyToAllBtn = document.getElementById("apply-to-all-btn");
const applyToAllCount = document.getElementById("apply-to-all-count");

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  fileInput.addEventListener("change", (e) => handleFilesSelected(e.target.files));
  headerAddBtn.addEventListener("click", () => fileInput.click());

  if (localStorage.getItem("formatme_auto_convert") === "true") {
    if (autoConvertToggle) autoConvertToggle.checked = true;
  }
  if (autoConvertToggle) {
    autoConvertToggle.addEventListener("change", (e) => {
      localStorage.setItem("formatme_auto_convert", e.target.checked);
    });
  }
});

function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-active");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFilesSelected(dt.files);
    }
  });
}

async function handleFilesSelected(files) {
  if (!files || files.length === 0) return;

  const startIndex = fileQueue.length;
  const newItemsCount = files.length;

  for (let file of files) {
    const queueItem = {
      file: file,
      filename: file.name,
      size: file.size,
      temp_file_id: null,
      detection: null,
      available_targets: [],
      selected_target: null,
      options: {},
      status: "analyzing"
    };

    fileQueue.push(queueItem);
  }

  renderQueue();

  for (let i = startIndex; i < fileQueue.length; i++) {
    await detectItemFormat(i);
  }

  if (activeFileIndex === -1 && fileQueue.length > 0) {
    selectActiveFile(0);
  }

  updateMultiFileControls();

  if (autoConvertToggle && autoConvertToggle.checked && !isConvertingQueue) {
    startConvertAllQueue();
  }
}

async function detectItemFormat(index) {
  const item = fileQueue[index];
  if (!item) return;

  const formData = new FormData();
  formData.append("file", item.file);

  try {
    const response = await fetch("/api/detect", {
      method: "POST",
      body: formData
    });

    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to analyze file");
    }

    item.temp_file_id = data.temp_file_id;
    item.detection = data.detection;
    item.available_targets = data.available_targets;
    item.status = "ready";

    if (item.available_targets.length > 0) {
      const inheritedTarget = fileQueue.find(q => q !== item && q.selected_target && item.available_targets.some(t => t.target.toLowerCase() === q.selected_target.toLowerCase()))?.selected_target;
      if (inheritedTarget) {
        item.selected_target = inheritedTarget;
      } else {
        item.selected_target = item.available_targets[0].target;
      }
      initItemDefaultOptions(item);
    }

    renderQueue();
    if (activeFileIndex === index) {
      renderInspector(index);
    }
    updateMultiFileControls();
  } catch (err) {
    item.status = "error";
    item.error = err.message;
    renderQueue();
    showNotification("Error", `Failed to detect format for ${item.filename}: ${err.message}`, "error");
  }
}

function initItemDefaultOptions(item) {
  item.options = {};
  const currentTargetObj = item.available_targets.find(t => t.target === item.selected_target);
  if (currentTargetObj && currentTargetObj.settings) {
    currentTargetObj.settings.forEach(s => {
      item.options[s.id] = s.default;
    });
  }
}

function renderQueue() {
  const expandedDropzone = document.getElementById("expanded-dropzone");
  const compactDropzone = document.getElementById("compact-dropzone");
  if (expandedDropzone && compactDropzone) {
    if (fileQueue.length > 0) {
      expandedDropzone.classList.add("hidden");
      compactDropzone.classList.remove("hidden");
      dropzone.className = "border-2 border-dashed border-outline-border hover:border-brand-indigo bg-surface-low/50 hover:bg-surface-container/50 transition-all rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-center flex items-center justify-between cursor-pointer relative group flex-shrink-0";
    } else {
      expandedDropzone.classList.remove("hidden");
      compactDropzone.classList.add("hidden");
      dropzone.className = "border-2 border-dashed border-outline-border hover:border-brand-indigo bg-surface-low/50 hover:bg-surface-container/50 transition-all rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer relative group flex-shrink-0";
    }
  }

  if (fileQueue.length === 0) {
    queueSection.classList.add("hidden");
    if (batchTargetContainer) batchTargetContainer.classList.add("hidden");
    queueList.innerHTML = "";
    resetInspector();
    return;
  }

  queueSection.classList.remove("hidden");
  queueCount.innerText = fileQueue.length;

  const convertibleItems = fileQueue.filter(i => i.status !== "analyzing" && i.status !== "converting");
  if (queueConvertAllBtn) {
    const hasPending = fileQueue.some(i => i.status === "ready" || i.status === "error");
    queueConvertAllText.innerText = hasPending 
      ? `Convert All (${convertibleItems.length})` 
      : `Re-convert All (${convertibleItems.length})`;
    queueConvertAllBtn.disabled = convertibleItems.length === 0 || isConvertingQueue;
    queueConvertAllBtn.classList.toggle("opacity-50", queueConvertAllBtn.disabled);
  }

  queueList.innerHTML = "";

  fileQueue.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `queue-card bg-surface-low border border-outline-border rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${activeFileIndex === idx ? 'selected' : ''}`;

    const iconName = getCategoryIcon(item.detection ? item.detection.category : "other");
    const formatBadge = item.detection ? item.detection.format.toUpperCase() : "DETECTING";
    const sizeStr = formatFileSize(item.size);

    let statusHtml = "";
    if (item.status === "analyzing") {
      statusHtml = `<span class="text-xs text-brand-cyan font-mono animate-pulse flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span> Analyzing...</span>`;
    } else if (item.status === "ready") {
      statusHtml = `<span class="text-xs text-text-secondary font-mono">${sizeStr} • Ready</span>`;
    } else if (item.status === "converting") {
      statusHtml = `<span class="text-xs text-brand-indigo font-mono animate-pulse flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-brand-indigo"></span> Converting...</span>`;
    } else if (item.status === "done") {
      statusHtml = `<span class="text-xs text-brand-emerald font-mono flex items-center gap-1 font-semibold"><span class="material-symbols-outlined text-sm">check_circle</span> Converted</span>`;
    } else if (item.status === "error") {
      statusHtml = `<span class="text-xs text-brand-rose font-mono">Failed: ${escapeHtml(item.error || 'Error')}</span>`;
    }

    let targetSelectHtml = "";
    if (item.available_targets && item.available_targets.length > 0) {
      const optionsHtml = item.available_targets.map(t => {
        const selected = t.target === item.selected_target ? "selected" : "";
        return `<option value="${t.target}" ${selected}>To: ${t.extension.toUpperCase()}</option>`;
      }).join("");

      targetSelectHtml = `
        <select onchange="handleQueueItemTargetChange(event, ${idx}, this.value)" class="queue-target-select px-2.5 py-1.5 rounded-lg bg-surface-high border border-outline-border text-white text-xs font-mono font-bold focus:border-brand-indigo focus:outline-none">
          ${optionsHtml}
        </select>
      `;
    }

    let convertBtnHtml = "";
    if (item.status === "ready") {
      convertBtnHtml = `
        <button onclick="convertSingleQueueItem(event, ${idx})" class="bg-brand-indigo/90 hover:bg-brand-indigo text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 transition-all">
          <span class="material-symbols-outlined text-sm">bolt</span>
          <span>Convert</span>
        </button>
      `;
    } else if (item.status === "done") {
      convertBtnHtml = `
        ${item.output_download_url ? `
          <a href="${item.output_download_url}" download="${escapeHtml(item.output_filename || 'download')}" class="bg-brand-emerald hover:bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1" title="Download converted file">
            <span class="material-symbols-outlined text-sm">download</span>
            <span>Download</span>
          </a>
        ` : ''}
        <button onclick="convertSingleQueueItem(event, ${idx})" class="bg-surface-high hover:bg-brand-indigo text-text-secondary hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 transition-all border border-outline-subtle" title="Convert Again">
          <span class="material-symbols-outlined text-sm text-brand-emerald">refresh</span>
          <span>Re-convert</span>
        </button>
      `;
    } else if (item.status === "error") {
      convertBtnHtml = `
        <button onclick="convertSingleQueueItem(event, ${idx})" class="bg-brand-rose/20 hover:bg-brand-rose text-brand-rose hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 transition-all" title="Retry Conversion">
          <span class="material-symbols-outlined text-sm">replay</span>
          <span>Retry</span>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-grow" onclick="selectActiveFile(${idx})">
        <div class="w-10 h-10 rounded-lg bg-surface-high flex-shrink-0 flex items-center justify-center text-brand-indigo border border-outline-subtle">
          <span class="material-symbols-outlined text-xl">${iconName}</span>
        </div>
        <div class="truncate">
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-white text-sm truncate max-w-[200px] sm:max-w-xs md:max-w-sm">${escapeHtml(item.filename)}</h4>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-highest text-brand-cyan uppercase">${formatBadge}</span>
          </div>
          ${statusHtml}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start border-t border-outline-subtle sm:border-0 pt-2.5 sm:pt-0 mt-1 sm:mt-0">
        ${targetSelectHtml}
        ${convertBtnHtml}
        <button onclick="selectActiveFile(${idx})" class="w-8 h-8 rounded-lg hover:bg-surface-highest text-text-muted hover:text-white flex items-center justify-center transition-all" title="Inspect Settings">
          <span class="material-symbols-outlined text-base">tune</span>
        </button>
        <button onclick="removeQueueItem(event, ${idx})" class="w-8 h-8 rounded-lg hover:bg-brand-rose/20 text-text-muted hover:text-brand-rose flex items-center justify-center transition-all" title="Remove">
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    `;

    queueList.appendChild(card);
  });

  updateBatchTargetOptions();
}

function updateBatchTargetOptions() {
  if (!batchTargetContainer || !batchTargetSelect) return;

  const readyItems = fileQueue.filter(i => i.available_targets && i.available_targets.length > 0);
  if (fileQueue.length < 2 || readyItems.length === 0) {
    batchTargetContainer.classList.add("hidden");
    return;
  }

  const targetCounts = {};
  readyItems.forEach(item => {
    item.available_targets.forEach(t => {
      const target = t.target;
      targetCounts[target] = (targetCounts[target] || 0) + 1;
    });
  });

  const totalReady = readyItems.length;
  const sortedTargets = Object.keys(targetCounts).sort((a, b) => {
    const isAllA = targetCounts[a] === totalReady ? 1 : 0;
    const isAllB = targetCounts[b] === totalReady ? 1 : 0;
    if (isAllA !== isAllB) return isAllB - isAllA;
    if (targetCounts[b] !== targetCounts[a]) return targetCounts[b] - targetCounts[a];
    return a.localeCompare(b);
  });

  if (sortedTargets.length === 0) {
    batchTargetContainer.classList.add("hidden");
    return;
  }

  const currentSelections = new Set(readyItems.map(i => i.selected_target).filter(Boolean));
  const commonSelected = currentSelections.size === 1 ? Array.from(currentSelections)[0] : null;

  let optionsHtml = `<option value="" disabled ${!commonSelected ? 'selected' : ''}>Batch Convert to...</option>`;
  sortedTargets.forEach(target => {
    const count = targetCounts[target];
    const isSelected = commonSelected === target;
    const label = count === fileQueue.length 
      ? `${target.toUpperCase()} (All ${count} files)` 
      : `${target.toUpperCase()} (${count}/${fileQueue.length} files)`;
    optionsHtml += `<option value="${target}" ${isSelected ? 'selected' : ''}>${label}</option>`;
  });

  batchTargetSelect.innerHTML = optionsHtml;
  batchTargetContainer.classList.remove("hidden");
}

function applyBatchTargetToAll(newTarget) {
  if (!newTarget) return;
  const targetLower = newTarget.toLowerCase();

  let appliedCount = 0;
  fileQueue.forEach(item => {
    if (item.available_targets && item.available_targets.some(t => t.target.toLowerCase() === targetLower)) {
      item.selected_target = targetLower;
      initItemDefaultOptions(item);
      appliedCount++;
    }
  });

  renderQueue();
  if (activeFileIndex >= 0 && activeFileIndex < fileQueue.length) {
    renderInspector(activeFileIndex);
  }

  if (appliedCount > 0) {
    showNotification(
      "1-Click Target Updated",
      `All ${appliedCount} compatible file(s) are set to convert to ${newTarget.toUpperCase()}`,
      "success"
    );
  }
}

function applyCurrentTargetToAll() {
  if (activeFileIndex < 0 || activeFileIndex >= fileQueue.length) return;
  const item = fileQueue[activeFileIndex];
  if (!item || !item.selected_target) return;
  applyBatchTargetToAll(item.selected_target);
}

function handleQueueItemTargetChange(e, idx, newTarget) {
  e.stopPropagation();
  const item = fileQueue[idx];
  if (!item) return;
  item.selected_target = newTarget;
  initItemDefaultOptions(item);

  fileQueue.forEach((otherItem, otherIdx) => {
    if (otherIdx !== idx && otherItem.available_targets && otherItem.available_targets.some(t => t.target.toLowerCase() === newTarget.toLowerCase())) {
      otherItem.selected_target = newTarget;
      initItemDefaultOptions(otherItem);
    }
  });

  renderQueue();
  if (activeFileIndex === idx) {
    renderInspector(idx);
  }
}

function selectActiveFile(index) {
  if (index < 0 || index >= fileQueue.length) return;
  activeFileIndex = index;
  renderQueue();
  renderInspector(index);
  if (window.innerWidth < 1024) {
    setTimeout(() => {
      document.getElementById("inspector-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}

function removeQueueItem(e, index) {
  e.stopPropagation();
  fileQueue.splice(index, 1);
  if (activeFileIndex >= fileQueue.length) {
    activeFileIndex = fileQueue.length - 1;
  }
  renderQueue();
  if (activeFileIndex >= 0) {
    renderInspector(activeFileIndex);
  } else {
    resetInspector();
  }
  updateMultiFileControls();
}

function clearQueue() {
  fileQueue = [];
  activeFileIndex = -1;
  renderQueue();
  resetInspector();
  updateMultiFileControls();
  if (downloadAllZipBtn) downloadAllZipBtn.classList.add("hidden");
}

function renderInspector(index) {
  const item = fileQueue[index];
  if (!item || !item.detection) {
    resetInspector();
    return;
  }

  if (inspectorCard) {
    inspectorCard.scrollTop = 0;
  }

  inspectorBadge.innerText = item.filename;
  fileInfoContainer.classList.remove("hidden");
  detectedFormatBadge.innerText = item.detection.format;
  detectedMime.innerText = item.detection.mime;
  detectedSize.innerText = formatFileSize(item.size);

  targetFormatsContainer.innerHTML = "";
  if (!item.available_targets || item.available_targets.length === 0) {
    targetFormatsContainer.innerHTML = `<div class="col-span-3 text-center py-4 text-xs text-brand-rose">No direct conversions available</div>`;
    convertMainBtn.disabled = true;
    settingsPanel.classList.add("hidden");
    return;
  }

  item.available_targets.forEach(t => {
    const btn = document.createElement("button");
    const isActive = item.selected_target === t.target;
    btn.className = `target-format-btn p-2 rounded-xl border text-xs font-semibold uppercase font-mono flex flex-col items-center justify-center gap-1 ${isActive ? 'active' : 'bg-surface border-outline-border text-text-secondary hover:border-brand-indigo hover:text-white'}`;
    btn.innerHTML = `
      <span>${t.extension.toUpperCase()}</span>
      <span class="text-[9px] font-normal normal-case opacity-70">${t.lossless ? 'Lossless' : 'Lossy'}</span>
    `;
    btn.onclick = () => {
      const chosenTarget = t.target;
      item.selected_target = chosenTarget;
      initItemDefaultOptions(item);

      if (fileQueue.length > 1) {
        fileQueue.forEach(otherItem => {
          if (otherItem !== item && otherItem.available_targets && otherItem.available_targets.some(x => x.target.toLowerCase() === chosenTarget.toLowerCase())) {
            otherItem.selected_target = chosenTarget;
            initItemDefaultOptions(otherItem);
          }
        });
      }

      renderQueue();
      renderInspector(index);
    };
    targetFormatsContainer.appendChild(btn);
  });

  const currentTargetObj = item.available_targets.find(t => t.target === item.selected_target);
  renderSettingsControls(item, currentTargetObj);

  const readyItems = fileQueue.filter(i => i.status === "ready");
  convertMainBtn.disabled = false;

  if (applyToAllBtn && applyToAllCount) {
    const compatibleCount = fileQueue.filter(i => 
      i.available_targets && i.available_targets.some(t => t.target === item.selected_target)
    ).length;

    if (fileQueue.length > 1 && compatibleCount > 1) {
      applyToAllBtn.classList.remove("hidden");
      applyToAllCount.innerText = compatibleCount;
    } else {
      applyToAllBtn.classList.add("hidden");
    }
  }

  if (fileQueue.length > 1) {
    const hasPending = fileQueue.some(i => i.status === "ready" || i.status === "error");
    convertBtnText.innerText = hasPending ? `Convert All Files (${fileQueue.length})` : `Re-convert All Files (${fileQueue.length})`;
    convertSelectedOnlyBtn.classList.remove("hidden");
    const selectedBtnSpan = convertSelectedOnlyBtn.querySelector("span:last-child");
    if (selectedBtnSpan) {
      selectedBtnSpan.innerText = item.status === "done" ? "Convert Selected Again" : "Convert Selected Only";
    }
  } else {
    convertBtnText.innerText = item.status === "done" ? "Convert File Again" : "Convert File Now";
    convertSelectedOnlyBtn.classList.add("hidden");
  }
}

function handleInspectorConvertClick() {
  if (fileQueue.length > 1) {
    startConvertAllQueue();
  } else {
    startActiveConversion();
  }
}

function renderSettingsControls(item, targetObj) {
  dynamicSettingsControls.innerHTML = "";
  if (!targetObj || !targetObj.settings || targetObj.settings.length === 0) {
    settingsPanel.classList.add("hidden");
    return;
  }

  settingsPanel.classList.remove("hidden");

  targetObj.settings.forEach(setting => {
    const row = document.createElement("div");
    row.className = "flex flex-col gap-1.5";

    if (setting.type === "slider") {
      const currentVal = item.options[setting.id] !== undefined ? item.options[setting.id] : setting.default;
      row.innerHTML = `
        <div class="flex justify-between items-center text-xs">
          <span class="text-text-secondary font-medium">${setting.label}</span>
          <span id="slider-val-${setting.id}" class="font-mono text-brand-cyan">${currentVal}${setting.unit || ''}</span>
        </div>
        <input type="range" min="${setting.min}" max="${setting.max}" value="${currentVal}" class="w-full cursor-pointer" oninput="updateSettingValue('${setting.id}', this.value, '${setting.unit || ''}')"/>
      `;
    } else if (setting.type === "select") {
      const currentVal = item.options[setting.id] !== undefined ? item.options[setting.id] : setting.default;
      let optionsHtml = setting.options.map(o => `<option value="${o.value}" ${o.value == currentVal ? 'selected' : ''}>${o.label}</option>`).join("");
      row.innerHTML = `
        <label class="text-xs text-text-secondary font-medium">${setting.label}</label>
        <select class="w-full px-3 py-2 rounded-xl bg-surface border border-outline-border text-white text-xs focus:border-brand-indigo focus:outline-none" onchange="updateSettingValue('${setting.id}', this.value)">
          ${optionsHtml}
        </select>
        ${setting.help ? `<span class="text-[10px] text-text-muted">${setting.help}</span>` : ''}
      `;
    } else if (setting.type === "boolean") {
      const isChecked = item.options[setting.id] !== undefined ? item.options[setting.id] : setting.default;
      row.className = "flex items-center justify-between";
      row.innerHTML = `
        <span class="text-xs text-text-secondary font-medium">${setting.label}</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" ${isChecked ? 'checked' : ''} class="sr-only peer" onchange="updateSettingValue('${setting.id}', this.checked)"/>
          <div class="w-9 h-5 bg-surface-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-indigo"></div>
        </label>
      `;
    } else if (setting.type === "password") {
      row.innerHTML = `
        <label class="text-xs text-text-secondary font-medium">${setting.label}</label>
        <input type="password" placeholder="Document password" value="${item.options[setting.id] || ''}" class="w-full px-3 py-2 rounded-xl bg-surface border border-outline-border text-white text-xs focus:border-brand-indigo focus:outline-none" oninput="updateSettingValue('${setting.id}', this.value)"/>
      `;
    }

    dynamicSettingsControls.appendChild(row);
  });
}

function updateSettingValue(settingId, val, unit = "") {
  if (activeFileIndex === -1) return;
  const item = fileQueue[activeFileIndex];
  item.options[settingId] = val;
  if (item.status === "done") {
    item.status = "ready";
    renderQueue();
  }
  const labelElem = document.getElementById(`slider-val-${settingId}`);
  if (labelElem) {
    labelElem.innerText = `${val}${unit}`;
  }
}

function resetInspector() {
  if (inspectorCard) {
    inspectorCard.scrollTop = 0;
  }
  inspectorBadge.innerText = "No File Selected";
  fileInfoContainer.classList.add("hidden");
  targetFormatsContainer.innerHTML = `<div class="col-span-3 text-center py-6 text-xs text-text-muted border border-dashed border-outline-subtle rounded-xl">Upload or select a file to see compatible formats</div>`;
  settingsPanel.classList.add("hidden");
  if (applyToAllBtn) applyToAllBtn.classList.add("hidden");
  convertMainBtn.disabled = true;
  convertBtnText.innerText = "Convert File";
  convertSelectedOnlyBtn.classList.add("hidden");
}

function updateMultiFileControls() {
  const images = fileQueue.filter(i => i.detection && i.detection.category === "image");
  const pdfs = fileQueue.filter(i => i.detection && i.detection.format === "pdf");

  let showAny = false;
  if (images.length > 1) {
    combineImagesBtn.classList.remove("hidden");
    combineImagesBtn.querySelector("span:last-child").innerText = `Combine ${images.length} Images to One PDF`;
    showAny = true;
  } else {
    combineImagesBtn.classList.add("hidden");
  }

  if (pdfs.length > 1) {
    mergePdfsBtn.classList.remove("hidden");
    mergePdfsBtn.querySelector("span:last-child").innerText = `Merge ${pdfs.length} PDFs in Sequence`;
    showAny = true;
  } else {
    mergePdfsBtn.classList.add("hidden");
  }

  if (showAny) {
    multiFileActions.classList.remove("hidden");
  } else {
    multiFileActions.classList.add("hidden");
  }
}

async function executeCombineImagesToPdf() {
  const images = fileQueue.filter(i => i.detection && i.detection.category === "image");
  if (images.length < 2) return;

  const formData = new FormData();
  images.forEach(img => formData.append("file_ids", img.temp_file_id));
  formData.append("title", "combined_images.pdf");

  showProgress("Stitching images into PDF document...", 20);

  try {
    const res = await fetch("/api/combine-images-to-pdf", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to combine images");

    showProgress("Finalized PDF!", 100);
    setTimeout(() => hideProgress(), 600);

    addResultItem({
      filename: "Combined Images (" + images.length + " pages)",
      output_filename: data.output_filename,
      download_url: data.download_url,
      target_format: "pdf",
      output_size: data.output_size,
      time_taken: 0.5
    });

    showNotification("Success", "Images successfully combined into one multi-page PDF!", "success");
  } catch (err) {
    hideProgress();
    showNotification("Error", err.message, "error");
  }
}

async function executeMergePdfs() {
  const pdfs = fileQueue.filter(i => i.detection && i.detection.format === "pdf");
  if (pdfs.length < 2) return;

  const formData = new FormData();
  pdfs.forEach(p => formData.append("file_ids", p.temp_file_id));
  formData.append("output_name", "merged_document.pdf");

  showProgress("Merging PDF documents...", 30);

  try {
    const res = await fetch("/api/merge-pdfs", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to merge PDFs");

    showProgress("Merged successfully!", 100);
    setTimeout(() => hideProgress(), 600);

    addResultItem({
      filename: "Merged PDF (" + pdfs.length + " documents)",
      output_filename: data.output_filename,
      download_url: data.download_url,
      target_format: "pdf",
      output_size: data.output_size,
      time_taken: 0.4
    });

    showNotification("Success", "PDFs merged successfully in exact sequence!", "success");
  } catch (err) {
    hideProgress();
    showNotification("Error", err.message, "error");
  }
}

async function convertSingleQueueItem(e, index) {
  if (e) e.stopPropagation();
  const item = fileQueue[index];
  if (!item || !item.selected_target) return;

  item.status = "converting";
  renderQueue();

  showProgress(`Converting ${item.filename} to ${item.selected_target.toUpperCase()}...`, 30);

  const formData = new FormData();
  formData.append("temp_file_id", item.temp_file_id);
  formData.append("target_format", item.selected_target);
  formData.append("options", JSON.stringify(item.options));

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData
    });

    const data = await parseJsonResponse(response);

    if (response.status === 403 && data.code === "PASSWORD_REQUIRED") {
      hideProgress();
      item.status = "ready";
      renderQueue();
      promptPassword((pw) => {
        item.options.password = pw;
        convertSingleQueueItem(null, index);
      });
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Conversion failed");
    }

    showProgress("Done!", 100);
    setTimeout(() => hideProgress(), 500);

    item.status = "done";
    item.output_download_url = data.download_url;
    item.output_filename = data.output_filename;
    renderQueue();

    addResultItem({
      filename: item.filename,
      output_filename: data.output_filename,
      download_url: data.download_url,
      target_format: data.target_format,
      output_size: data.output_size,
      time_taken: data.time_taken
    });

    showNotification("Conversion Complete", `Successfully converted ${item.filename}`, "success");
  } catch (err) {
    hideProgress();
    item.status = "error";
    item.error = err.message;
    renderQueue();
    showNotification("Conversion Failed", err.message, "error");
  }
}

async function startActiveConversion() {
  if (activeFileIndex === -1) return;
  await convertSingleQueueItem(null, activeFileIndex);
}

async function startConvertAllQueue() {
  const convertibleItems = fileQueue.filter(i => i.status !== "analyzing" && i.status !== "converting");
  if (convertibleItems.length === 0) {
    showNotification("Info", "No files in the queue ready to convert.", "info");
    return;
  }

  isConvertingQueue = true;
  if (queueConvertAllBtn) queueConvertAllBtn.disabled = true;
  if (convertMainBtn) convertMainBtn.disabled = true;

  let convertedCount = 0;
  const totalCount = convertibleItems.length;
  const outputUrls = [];

  for (let i = 0; i < fileQueue.length; i++) {
    const item = fileQueue[i];
    if (item.status === "analyzing" || item.status === "converting") continue;

    const progressPct = Math.round(((convertedCount) / totalCount) * 100);
    showProgress(`Converting ${convertedCount + 1} of ${totalCount}: ${item.filename} → ${item.selected_target.toUpperCase()}...`, progressPct);

    item.status = "converting";
    renderQueue();

    const formData = new FormData();
    formData.append("temp_file_id", item.temp_file_id);
    formData.append("target_format", item.selected_target);
    formData.append("options", JSON.stringify(item.options));

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData
      });

      const data = await parseJsonResponse(response);

      if (response.status === 403 && data.code === "PASSWORD_REQUIRED") {
        item.status = "ready";
        renderQueue();
        continue;
      }

      if (!response.ok) {
        throw new Error(data.error || "Conversion failed");
      }

      item.status = "done";
      item.output_download_url = data.download_url;
      item.output_filename = data.output_filename;
      convertedCount++;
      outputUrls.push(data.download_url);

      addResultItem({
        filename: item.filename,
        output_filename: data.output_filename,
        download_url: data.download_url,
        target_format: data.target_format,
        output_size: data.output_size,
        time_taken: data.time_taken
      });
    } catch (err) {
      item.status = "error";
      item.error = err.message;
    }

    renderQueue();
  }

  showProgress(`Finished converting ${convertedCount} of ${totalCount} files!`, 100);
  setTimeout(() => hideProgress(), 800);

  isConvertingQueue = false;
  if (queueConvertAllBtn) queueConvertAllBtn.disabled = false;
  if (convertMainBtn) convertMainBtn.disabled = false;

  renderQueue();

  if (convertedCount > 0) {
    showNotification("Batch Conversion Complete", `Successfully converted ${convertedCount} file(s)!`, "success");
  }

  if (outputUrls.length > 1 && downloadAllZipBtn) {
    try {
      const zipRes = await fetch("/api/bundle-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ download_urls: outputUrls })
      });
      const zipData = await zipRes.json();
      if (zipRes.ok && zipData.zip_url) {
        downloadAllZipBtn.onclick = () => {
          const a = document.createElement("a");
          a.href = zipData.zip_url;
          a.download = "batch_converted_files.zip";
          a.click();
        };
        downloadAllZipBtn.classList.remove("hidden");
      }
    } catch (e) {
      console.warn("Could not generate batch ZIP", e);
    }
  }
}

function addResultItem(result) {
  resultsSection.classList.remove("hidden");

  const card = document.createElement("div");
  card.className = "result-card bg-surface-low border border-brand-emerald/40 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg bg-gradient-to-r from-surface-low to-brand-emerald/5 animate-fade-in flex-shrink-0";

  const sizeStr = formatFileSize(result.output_size);
  const timeStr = result.time_taken ? ` • ${result.time_taken}s` : "";

  card.innerHTML = `
    <div class="flex items-center gap-3 overflow-hidden min-w-0">
      <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-brand-emerald/20 text-brand-emerald flex-shrink-0 flex items-center justify-center border border-brand-emerald/30">
        <span class="material-symbols-outlined text-xl">check_circle</span>
      </div>
      <div class="truncate min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-white text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">${escapeHtml(result.output_filename)}</h4>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-emerald/20 text-brand-emerald uppercase flex-shrink-0">${result.target_format}</span>
        </div>
        <p class="text-[11px] sm:text-xs text-text-secondary font-mono">${sizeStr}${timeStr} • Verified Output</p>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t border-outline-subtle sm:border-0 pt-2 sm:pt-0">
      <a href="${result.download_url}" download="${escapeHtml(result.output_filename)}" class="flex-1 sm:flex-initial justify-center bg-brand-emerald hover:bg-emerald-500 text-black px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0">
        <span class="material-symbols-outlined text-sm">download</span>
        <span>Download</span>
      </a>
      <button onclick="removeResultCard(this)" class="w-8 h-8 rounded-lg hover:bg-brand-rose/20 text-text-muted hover:text-brand-rose flex items-center justify-center transition-all flex-shrink-0" title="Dismiss result">
        <span class="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  `;

  resultsList.prepend(card);
  try {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {}
}

function clearResults() {
  resultsList.innerHTML = "";
  resultsSection.classList.add("hidden");
  if (downloadAllZipBtn) downloadAllZipBtn.classList.add("hidden");
}

function removeResultCard(btn) {
  const card = btn.closest(".result-card");
  if (card) {
    card.remove();
  }
  if (!resultsList.children || resultsList.children.length === 0) {
    clearResults();
  }
}

function promptPassword(callback) {
  pendingPasswordCallback = callback;
  modalPasswordInput.value = "";
  passwordModal.classList.remove("hidden");
  modalPasswordInput.focus();
}

function closePasswordModal(confirmed) {
  passwordModal.classList.add("hidden");
  if (confirmed && pendingPasswordCallback) {
    const pw = modalPasswordInput.value;
    pendingPasswordCallback(pw);
  }
  pendingPasswordCallback = null;
}

function showProgress(statusText, percentage) {
  progressCard.classList.remove("hidden");
  progressStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-brand-cyan animate-ping"></span> ${statusText}`;
  progressPercentage.innerText = `${percentage}%`;
  progressBarFill.style.width = `${percentage}%`;
}

function hideProgress() {
  progressCard.classList.add("hidden");
  progressBarFill.style.width = "0%";
}

function showNotification(title, message, type = "info") {
  notificationBanner.classList.remove("hidden");
  notifTitle.innerText = title;
  notifMessage.innerText = message;

  if (type === "success") {
    notificationBanner.className = "rounded-xl border p-4 flex items-center justify-between shadow-lg bg-brand-emerald/10 border-brand-emerald/40 text-brand-emerald";
    notifIconBox.className = "w-9 h-9 rounded-lg bg-brand-emerald/20 text-brand-emerald flex items-center justify-center";
    notifIcon.innerText = "check";
  } else if (type === "error") {
    notificationBanner.className = "rounded-xl border p-4 flex items-center justify-between shadow-lg bg-brand-rose/10 border-brand-rose/40 text-brand-rose";
    notifIconBox.className = "w-9 h-9 rounded-lg bg-brand-rose/20 text-brand-rose flex items-center justify-center";
    notifIcon.innerText = "error";
  } else {
    notificationBanner.className = "rounded-xl border p-4 flex items-center justify-between shadow-lg bg-brand-indigo/10 border-brand-indigo/40 text-brand-cyan";
    notifIconBox.className = "w-9 h-9 rounded-lg bg-brand-indigo/20 text-brand-cyan flex items-center justify-center";
    notifIcon.innerText = "info";
  }
}

function hideNotification() {
  notificationBanner.classList.add("hidden");
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getCategoryIcon(cat) {
  switch (cat) {
    case "image": return "image";
    case "pdf": return "picture_as_pdf";
    case "video": return "videocam";
    case "audio": return "music_note";
    case "document": return "article";
    case "data": return "table_chart";
    case "archive": return "folder_zip";
    default: return "insert_drive_file";
  }
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
