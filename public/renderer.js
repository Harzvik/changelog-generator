const oldDirInput = document.getElementById('oldDir');
const newDirInput = document.getElementById('newDir');
const btnPickOld = document.getElementById('btnPickOld');
const btnPickNew = document.getElementById('btnPickNew');
const btnRun = document.getElementById('btnRun');
const btnSave = document.getElementById('btnSave');
const results = document.getElementById('results');
const leftList = document.getElementById('leftList');
const rightList = document.getElementById('rightList');
const detailsDiv = document.getElementById('details');
const oldEntriesPre = document.getElementById('oldEntries');
const newEntriesPre = document.getElementById('newEntries');
const oldCountSpan = document.getElementById('oldCount');
const newCountSpan = document.getElementById('newCount');
const btnCopyParsed = document.getElementById('btnCopyParsed');
const btnExportParsed = document.getElementById('btnExportParsed');

let lastText = '';

// Load persisted last-used folders
try {
  const lo = localStorage.getItem('moddiff:lastOld');
  const ln = localStorage.getItem('moddiff:lastNew');
  if (lo) oldDirInput.value = lo;
  if (ln) newDirInput.value = ln;
} catch (e) {}

btnPickOld.addEventListener('click', async () => {
  const dir = await window.modDiffAPI.chooseDir();
  if (dir) oldDirInput.value = dir;
  try { localStorage.setItem('moddiff:lastOld', oldDirInput.value); } catch (e) {}
});

btnPickNew.addEventListener('click', async () => {
  const dir = await window.modDiffAPI.chooseDir();
  if (dir) newDirInput.value = dir;
  try { localStorage.setItem('moddiff:lastNew', newDirInput.value); } catch (e) {}
});

btnRun.addEventListener('click', async () => {
  const oldDir = oldDirInput.value.trim();
  const newDir = newDirInput.value.trim();
  if (!oldDir || !newDir) {
    results.textContent = 'Please choose both directories.';
    return;
  }
  try { localStorage.setItem('moddiff:lastOld', oldDir); localStorage.setItem('moddiff:lastNew', newDir); } catch (e) {}
  results.textContent = 'Running...';
  try {
    const { text, diff, oldEntries, newEntries } = await window.modDiffAPI.runDiff(oldDir, newDir);
    results.textContent = text;
    lastText = text;
    btnSave.disabled = false;
    // Show structured side-by-side lists
    renderSideBySide({ oldDir, newDir }, diff);
    // parsing details panel is controlled by Debug menu; populate it if present
    if (detailsDiv) {
      oldEntriesPre.textContent = JSON.stringify(oldEntries, null, 2);
      newEntriesPre.textContent = JSON.stringify(newEntries, null, 2);
      if (oldCountSpan) oldCountSpan.textContent = String(oldEntries.length || 0);
      if (newCountSpan) newCountSpan.textContent = String(newEntries.length || 0);
    }
  } catch (e) {
    results.textContent = 'Error: ' + (e?.message || String(e));
    btnSave.disabled = true;
  }
});

btnSave.addEventListener('click', async () => {
  if (!lastText) return;
  const path = await window.modDiffAPI.saveText(lastText, 'mod-changelog.txt');
  if (path) {
    // Provide quick feedback
    results.textContent += `\n\nSaved to: ${path}`;
  }
});

// Synchronize scrolling between the two folder panes so elements align
if (leftList && rightList) {
  leftList.addEventListener('scroll', () => {
    if (rightList._sync) return;
    rightList._sync = true;
    rightList.scrollTop = leftList.scrollTop;
    rightList._sync = false;
  });
  rightList.addEventListener('scroll', () => {
    if (leftList._sync) return;
    leftList._sync = true;
    leftList.scrollTop = rightList.scrollTop;
    leftList._sync = false;
  });
}

// Make the folder container's scrollbars affect both lists when mouse wheel is used over it
const folders = document.getElementById('folders');
if (folders && leftList && rightList) {
  folders.addEventListener('wheel', (e) => {
    // Scroll both lists by the wheel delta to keep them aligned
    leftList.scrollTop += e.deltaY;
    rightList.scrollTop += e.deltaY;
    // Prevent default to avoid double-handling
    e.preventDefault();
  }, { passive: false });
}

function clearLists() {
  leftList.innerHTML = '';
  rightList.innerHTML = '';
}

function elt(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.assign(el, props);
  for (const c of children) {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c) el.appendChild(c);
  }
  return el;
}

function renderSideBySide(paths, txt) {
  clearLists();
  const diff = txt; // here txt is expected to be diff when called from run
  if (!diff) return;
  // Prepare maps for easier lookup
  const removed = new Map(diff.removed.map((r) => [r.key, r]));
  const added = new Map(diff.added.map((a) => [a.key, a]));
  const updated = new Map(diff.updated.map((u) => [u.key, u]));

  // Collect keys present in either old or new
  const keys = new Set([...removed.keys(), ...added.keys(), ...updated.keys()]);
  const sorted = Array.from(keys).sort();

  // Render lists: left shows old filenames (removed or updated), right shows new filenames (added or updated)
  for (const key of sorted) {
    const r = removed.get(key);
    const a = added.get(key);
    const u = updated.get(key);
    // Left column: either removed or (old side of updated)
      if (r || u) {
        const oldEntry = r ? r.old : (u ? u.old : null);
        const keyCell = elt('div', { className: 'key' }, oldEntry?.key ?? key);
        const verCell = elt('div', { className: 'version' }, oldEntry?.version ?? '');
        const fileCell = elt('div', { className: 'filename' }, oldEntry?.filename ?? '');
        const rowCls = r ? 'folder-row removed' : 'folder-row updated-old';
        const row = elt('div', { className: rowCls }, keyCell, verCell, fileCell);
        leftList.appendChild(row);
      } else {
        leftList.appendChild(elt('div', { className: 'folder-row empty' }, elt('div'), elt('div'), elt('div')));
      }

    // Right column: either added or (new side of updated)
    if (a || u) {
      const newEntry = a ? a.new : (u ? u.new : null);
      const keyCell = elt('div', { className: 'key' }, newEntry?.key ?? key);
      const verCell = elt('div', { className: 'version' }, newEntry?.version ?? '');
      const fileCell = elt('div', { className: 'filename' }, newEntry?.filename ?? '');
      const rowCls = a ? 'folder-row added' : 'folder-row updated-new';
      const row = elt('div', { className: rowCls }, keyCell, verCell, fileCell);
      rightList.appendChild(row);
    } else {
      rightList.appendChild(elt('div', { className: 'folder-row empty' }, elt('div'), elt('div'), elt('div')));
    }
  }
}

// Listen for Debug menu toggle (shows/hides the parsing details panel)
if (window.modDiffAPI && window.modDiffAPI.onToggleDetails) {
  window.modDiffAPI.onToggleDetails(() => {
    if (!detailsDiv) return;
    detailsDiv.style.display = detailsDiv.style.display === 'block' ? 'none' : 'block';
  });
}

// Theme handling: respect user toggle, persist override, and fall back to OS preference
let _userThemeOverride = null; // '1' = dark, '0' = light, null = follow system
try {
  const val = localStorage.getItem('moddiff:dark');
  if (val === '1' || val === '0') _userThemeOverride = val;
} catch (e) {}

function applySystemTheme(prefersDark) {
  if (_userThemeOverride !== null) return; // user override takes precedence
  if (prefersDark) document.body.classList.add('dark');
  else document.body.classList.remove('dark');
}

// Listen for Dark Mode toggle from the View menu (user override)
if (window.modDiffAPI && window.modDiffAPI.onToggleDark) {
  window.modDiffAPI.onToggleDark(() => {
    const now = document.body.classList.toggle('dark');
    try { localStorage.setItem('moddiff:dark', now ? '1' : '0'); _userThemeOverride = now ? '1' : '0'; } catch (e) { /* ignore */ }
  });
}

// Apply persisted override or system preference
const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
if (_userThemeOverride === '1') document.body.classList.add('dark');
else if (_userThemeOverride === '0') document.body.classList.remove('dark');
else if (mql) applySystemTheme(mql.matches);

// If system preference changes and there is no user override, update automatically
if (mql && mql.addEventListener) {
  mql.addEventListener('change', (e) => applySystemTheme(e.matches));
} else if (mql && mql.addListener) {
  mql.addListener((e) => applySystemTheme(e.matches));
}

// Copy/Export parsed entries buttons (only meaningful when details panel is populated)
if (btnCopyParsed) {
  btnCopyParsed.addEventListener('click', async () => {
    const obj = {
      old: oldEntriesPre.textContent ? JSON.parse(oldEntriesPre.textContent) : [],
      new: newEntriesPre.textContent ? JSON.parse(newEntriesPre.textContent) : [],
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      results.textContent = 'Parsed entries copied to clipboard.';
    } catch (e) {
      results.textContent = 'Failed to copy to clipboard: ' + (e?.message || String(e));
    }
  });
}

if (btnExportParsed) {
  btnExportParsed.addEventListener('click', async () => {
    const obj = {
      old: oldEntriesPre.textContent ? JSON.parse(oldEntriesPre.textContent) : [],
      new: newEntriesPre.textContent ? JSON.parse(newEntriesPre.textContent) : [],
    };
    try {
      const path = await window.modDiffAPI.saveText(JSON.stringify(obj, null, 2), 'parsed-entries.json');
      if (path) results.textContent = `Parsed entries exported to: ${path}`;
    } catch (e) {
      results.textContent = 'Failed to export parsed entries: ' + (e?.message || String(e));
    }
  });
}
