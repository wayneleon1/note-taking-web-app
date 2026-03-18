/**
 * Notes App — script.js
 * Handles notes CRUD, routing, settings (color theme, font, password).
 */

// ══════════════════════════════════════════════════
//  APP STATE
// ══════════════════════════════════════════════════

let notes = [];
let currentView = "all"; // 'all' | 'archived' | 'tag:<n>' | 'settings'
let activeNoteId = null;
let isNewNote = false;
let searchQuery = "";

// Settings state (persisted to localStorage)
let appSettings = {
  colorTheme: localStorage.getItem("colorTheme") || "light",
  fontTheme: localStorage.getItem("fontTheme") || "sans-serif",
};

// Which settings sub-panel is open
let activeSettingPanel = "color-theme";

// ══════════════════════════════════════════════════
//  DOM REFS — NOTES
// ══════════════════════════════════════════════════

const notesList = document.getElementById("notes-list");
const detailEmpty = document.getElementById("detail-empty");
const detailBody = document.getElementById("detail-body");
const detailFooter = document.getElementById("detail-footer");
const detailTitleInput = document.getElementById("detail-title");
const detailTagsInput = document.getElementById("detail-tags");
const detailContentArea = document.getElementById("detail-content");
const detailDateSpan = document.getElementById("detail-date");
const detailStatusSpan = document.getElementById("detail-status");
const detailStatusRow = document.getElementById("detail-status-row");
const actionsPanel = document.getElementById("actions-panel");
const topbarTitle = document.getElementById("topbar-title");
const sidebarTagsNav = document.getElementById("sidebar-tags");
const searchInput = document.getElementById("search-input");
const detailPanel = document.getElementById("detail-panel");
const panelPageTitle = document.getElementById("panel-page-title");
const panelPageSubtitle = document.getElementById("panel-page-subtitle");
const mobileDeleteBtn = document.getElementById("mobile-delete-btn");
const mobileArchiveBtn = document.getElementById("mobile-archive-btn");
const modalOverlay = document.getElementById("modal-overlay");
const notesView = document.getElementById("notes-view");
const settingsView = document.getElementById("settings-view");
const toast = document.getElementById("toast");

// ══════════════════════════════════════════════════
//  DATA LOADING
// ══════════════════════════════════════════════════

async function loadNotes() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    notes = data.notes.map((n, i) => ({ ...n, id: i + 1 }));
  } catch {
    notes = getFallbackNotes();
  }
  applySettings();
  renderAll();
}

function getFallbackNotes() {
  return [
    {
      id: 1,
      title: "React Performance Optimization",
      tags: ["Dev", "React"],
      content:
        "Key performance optimization techniques:\n\n1. Code Splitting\n- Use React.lazy() for route-based splitting\n- Implement dynamic imports for heavy components\n\n2. Memoization\n- useMemo for expensive calculations\n- useCallback for function props\n- React.memo for component optimization\n\n3. Virtual List Implementation\n- Use react-window for long lists\n- Implement infinite scrolling\n\nTODO: Benchmark current application and identify bottlenecks",
      lastEdited: "2024-10-29T10:15:00Z",
      isArchived: false,
    },
    {
      id: 2,
      title: "Japan Travel Planning",
      tags: ["Travel", "Personal"],
      content:
        "Japan Trip Planning - Spring 2025\n\nItinerary Draft:\nWeek 1: Tokyo\n- Shibuya and Harajuku\n- TeamLab Digital Art Museum\n- Day trip to Mount Fuji\n\nWeek 2: Kyoto & Osaka\n- Traditional temples\n- Cherry blossom viewing\n- Food tour in Osaka\n\nBudget: $3000\nAccommodation: Mix of hotels and traditional ryokans\nJR Pass: 14 days\n\nTODO: Book flights 6 months in advance",
      lastEdited: "2024-10-28T16:45:00Z",
      isArchived: false,
    },
    {
      id: 3,
      title: "Favorite Pasta Recipes",
      tags: ["Cooking", "Recipes"],
      content:
        "Classic Italian Recipes:\n\n1. Carbonara\n- Eggs, pecorino, guanciale\n- No cream ever!\n- Save pasta water\n\n2. Cacio e Pepe\n- Pecorino Romano\n- Fresh black pepper\n- Technique is crucial\n\n3. Arrabbiata\n- San Marzano tomatoes\n- Fresh garlic\n- Red pepper flakes\n\nNote: Always use high-quality ingredients",
      lastEdited: "2024-10-27T14:30:00Z",
      isArchived: false,
    },
    {
      id: 4,
      title: "TypeScript Migration Guide",
      tags: ["Dev", "React", "TypeScript"],
      content:
        "Project migration steps:\n\n1. Initial Setup\n- Install TypeScript dependencies\n- Configure tsconfig.json\n- Set up build pipeline\n\n2. Migration Strategy\n- Start with newer modules\n- Add type definitions gradually\n- Use 'any' temporarily for complex cases\n\n3. Testing Approach\n- Update test configuration\n- Add type testing\n- Validate build process\n\nDeadline: End of Q4 2024",
      lastEdited: "2024-10-26T09:20:00Z",
      isArchived: true,
    },
    {
      id: 5,
      title: "Weekly Workout Plan",
      tags: ["Fitness", "Health"],
      content:
        "Monday: Upper Body\n- Bench Press 4x8\n- Rows 4x10\n- Shoulder Press 3x12\n- Pull-ups 3 sets\n\nWednesday: Lower Body\n- Squats 4x8\n- Romanian Deadlifts 3x10\n- Lunges 3x12 each\n- Calf Raises 4x15\n\nFriday: Full Body\n- Deadlifts 3x5\n- Push-ups 3x12\n- Leg Press 3x12\n- Core Work\n\nCardio: Tuesday/Thursday - 30 min run",
      lastEdited: "2024-10-25T18:10:00Z",
      isArchived: false,
    },
    {
      id: 6,
      title: "Gift Ideas",
      tags: ["Personal", "Shopping"],
      content:
        "Birthday and Holiday Gift List:\n\nMom:\n- Cooking class subscription\n- Kindle Paperwhite\n- Spa day package\n\nDad:\n- Golf lessons\n- Wireless earbuds\n- BBQ accessories\n\nSister:\n- Art supplies set\n- Yoga mat kit\n- Coffee subscription\n\nBudget per person: $150-200",
      lastEdited: "2024-10-20T11:30:15Z",
      isArchived: true,
    },
    {
      id: 7,
      title: "React Component Library",
      tags: ["Dev", "React"],
      content:
        "Custom Component Library Structure:\n\n1. Basic Components\n- Button\n- Input\n- Card\n- Modal\n\n2. Form Components\n- FormField\n- Select\n- Checkbox\n- RadioGroup\n\n3. Layout Components\n- Container\n- Grid\n- Flex\n\nAll components need:\n- TypeScript definitions\n- Unit tests\n- Storybook documentation\n- Accessibility support",
      lastEdited: "2024-10-15T14:23:45Z",
      isArchived: true,
    },
    {
      id: 8,
      title: "Meal Prep Ideas",
      tags: ["Cooking", "Health", "Recipes"],
      content:
        "Weekly Meal Prep Plan:\n\nBreakfast Options:\n- Overnight oats\n- Egg muffins\n- Smoothie packs\n\nLunch Containers:\n- Greek chicken bowl\n- Buddha bowls\n- Tuna pasta salad\n\nSnacks:\n- Cut vegetables\n- Mixed nuts\n- Greek yogurt parfait\n\nPrep Time: Sunday 2-4pm\nStorage: Glass containers\nLasts: 4-5 days",
      lastEdited: "2024-10-12T09:45:15Z",
      isArchived: false,
    },
    {
      id: 9,
      title: "Reading List",
      tags: ["Personal", "Dev"],
      content:
        "Current Reading Queue:\n\n1. Technical Books\n- Clean Architecture by Robert Martin\n- Designing Data-Intensive Applications\n- TypeScript Design Patterns\n\n2. Personal Development\n- Deep Work by Cal Newport\n- Atomic Habits\n- The Psychology of Money\n\nCurrently Reading: Clean Architecture\nNext Up: Deep Work\n\nGoal: One book per month",
      lastEdited: "2024-10-05T12:20:30Z",
      isArchived: false,
    },
    {
      id: 10,
      title: "Fitness Goals 2025",
      tags: ["Fitness", "Health", "Personal"],
      content:
        "2025 Fitness Objectives:\n\n1. Strength Goals\n- Bench press: 225 lbs\n- Squat: 315 lbs\n- Deadlift: 405 lbs\n\n2. Cardio Goals\n- Run half marathon\n- 5k under 25 minutes\n\n3. Habits\n- Gym 4x per week\n- Daily 10k steps\n- Sleep 7+ hours\n\nTrack all workouts in Strong app",
      lastEdited: "2024-09-22T07:30:00Z",
      isArchived: false,
    },
  ];
}

// ══════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════

function formatDate(iso) {
  if (!iso) return "Not yet saved";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAllTags() {
  return [...new Set(notes.flatMap((n) => n.tags))].sort();
}

function getFilteredNotes() {
  let list = notes.filter((n) => {
    if (currentView === "all") return !n.isArchived;
    if (currentView === "archived") return n.isArchived;
    if (currentView.startsWith("tag:"))
      return n.tags.includes(currentView.slice(4)) && !n.isArchived;
    return true;
  });
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  return list;
}

function nextId() {
  return notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
}

/** Show a brief toast notification */
function showToast(msg, type = "success") {
  toast.textContent = msg;
  toast.className = `toast toast--${type} toast--visible`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(
    () => toast.classList.remove("toast--visible"),
    3000,
  );
}

// ══════════════════════════════════════════════════
//  SETTINGS — apply / persist
// ══════════════════════════════════════════════════

const FONT_MAP = {
  "sans-serif": "'Manrope', 'Arial', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  monospace: "'Courier New', 'Lucida Console', monospace",
};

function applySettings() {
  const { colorTheme, fontTheme } = appSettings;

  // ── Color theme ──
  document.documentElement.setAttribute(
    "data-theme",
    colorTheme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : colorTheme,
  );

  // ── Font theme ──
  document.documentElement.style.setProperty(
    "--app-font",
    FONT_MAP[fontTheme] || FONT_MAP["sans-serif"],
  );
  document.body.style.fontFamily = `var(--app-font)`;

  // Sync radio buttons to current state
  const colorRadio = document.querySelector(
    `input[name="color-theme"][value="${colorTheme}"]`,
  );
  if (colorRadio) colorRadio.checked = true;

  const fontRadio = document.querySelector(
    `input[name="font-theme"][value="${fontTheme}"]`,
  );
  if (fontRadio) fontRadio.checked = true;

  // Sync option highlight classes
  syncOptionHighlights("color-theme", colorTheme);
  syncOptionHighlights("font-theme", fontTheme);
}

/** Highlight the selected option row */
function syncOptionHighlights(radioName, value) {
  document.querySelectorAll(`input[name="${radioName}"]`).forEach((radio) => {
    radio
      .closest(".settings-option")
      ?.classList.toggle("active", radio.value === value);
  });
}

function saveColorTheme() {
  const selected = document.querySelector('input[name="color-theme"]:checked');
  if (!selected) return;
  appSettings.colorTheme = selected.value;
  localStorage.setItem("colorTheme", selected.value);
  applySettings();
  showToast("Color theme updated.");
}

function saveFontTheme() {
  const selected = document.querySelector('input[name="font-theme"]:checked');
  if (!selected) return;
  appSettings.fontTheme = selected.value;
  localStorage.setItem("fontTheme", selected.value);
  applySettings();
  showToast("Font theme updated.");
}

function savePassword() {
  const oldPw = document.getElementById("pw-old").value;
  const newPw = document.getElementById("pw-new").value;
  const confPw = document.getElementById("pw-confirm").value;

  // Clear previous error states
  ["pw-old", "pw-new", "pw-confirm"].forEach((id) => {
    document
      .getElementById(id)
      .closest(".settings-field-input-wrap")
      .classList.remove("input-error");
  });

  if (!oldPw) {
    document
      .getElementById("pw-old")
      .closest(".settings-field-input-wrap")
      .classList.add("input-error");
    showToast("Please enter your current password.", "error");
    return;
  }
  if (newPw.length < 8) {
    document
      .getElementById("pw-new")
      .closest(".settings-field-input-wrap")
      .classList.add("input-error");
    showToast("New password must be at least 8 characters.", "error");
    return;
  }
  if (newPw !== confPw) {
    document
      .getElementById("pw-confirm")
      .closest(".settings-field-input-wrap")
      .classList.add("input-error");
    showToast("Passwords do not match.", "error");
    return;
  }

  // Clear fields on success
  ["pw-old", "pw-new", "pw-confirm"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  showToast("Password changed successfully.");
}

// ══════════════════════════════════════════════════
//  SETTINGS VIEW ROUTING
// ══════════════════════════════════════════════════

function openSettings(panel) {
  currentView = "settings";
  notesView.style.display = "none";
  settingsView.style.display = "flex";
  topbarTitle.textContent = "Settings";

  // Sync bottom nav
  document
    .querySelectorAll(".bottom-nav-item")
    .forEach((i) =>
      i.classList.toggle("active", i.dataset.view === "settings"),
    );
  // Sync sidebar (no item matches 'settings' — deselect all)
  document
    .querySelectorAll(".sidebar-nav-item[data-view]")
    .forEach((i) => i.classList.remove("active"));

  switchSettingsPanel(panel || activeSettingPanel);
}

function closeSettings() {
  settingsView.style.display = "none";
  notesView.style.display = "flex";
  setView(currentView === "settings" ? "all" : currentView);
}

function switchSettingsPanel(panelId) {
  activeSettingPanel = panelId;

  // Highlight correct sub-nav item
  document
    .querySelectorAll(".settings-nav-item[data-setting]")
    .forEach((item) => {
      const isActive = item.dataset.setting === panelId;
      item.classList.toggle("active", isActive);
      const chevron = item.querySelector(".settings-nav-chevron");
      if (chevron) chevron.style.display = isActive ? "block" : "none";
    });

  // Show correct panel
  document
    .querySelectorAll(".settings-panel")
    .forEach((p) => p.classList.toggle("active", p.id === `panel-${panelId}`));
}

// ══════════════════════════════════════════════════
//  RENDER — NOTES
// ══════════════════════════════════════════════════

function renderAll() {
  renderSidebarTags();
  renderNotesList();
  updateTitles();
}

function renderSidebarTags() {
  sidebarTagsNav.innerHTML = getAllTags()
    .map(
      (tag) => `
    <a href="#" class="sidebar-nav-item${currentView === "tag:" + tag ? " active" : ""}" data-tag="${esc(tag)}">
      <span class="nav-left">
        <img src="./assets/images/icon-tag.svg" alt="" class="nav-icon" />
        ${esc(tag)}
      </span>
    </a>
  `,
    )
    .join("");
  sidebarTagsNav.querySelectorAll("[data-tag]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      setView("tag:" + el.dataset.tag);
    }),
  );
}

function renderNotesList() {
  const filtered = getFilteredNotes();
  notesList.innerHTML = "";
  if (filtered.length === 0) {
    notesList.innerHTML = `<div class="notes-empty-state"><p>${esc(
      currentView === "archived"
        ? "No archived notes found."
        : searchQuery
          ? "No notes match your search."
          : "You don't have any notes yet. Start a new note to capture your thoughts and ideas.",
    )}</p></div>`;
    return;
  }
  filtered.forEach((note) => {
    const card = document.createElement("article");
    card.className = "note-card" + (note.id === activeNoteId ? " active" : "");
    card.setAttribute("role", "listitem");
    card.dataset.noteId = note.id;
    card.innerHTML = `
      <div class="note-card-inner">
        <h3 class="note-card-title">${esc(note.title)}</h3>
        <div class="note-card-tags">${note.tags.map((t) => `<span class="tag-badge">${esc(t)}</span>`).join("")}</div>
        <p class="note-card-date">${formatDate(note.lastEdited)}</p>
      </div>`;
    card.addEventListener("click", () => openNote(note.id));
    notesList.appendChild(card);
  });
}

function updateTitles() {
  let label = "All Notes";
  if (currentView === "archived") label = "Archived Notes";
  else if (currentView.startsWith("tag:")) label = currentView.slice(4);
  topbarTitle.textContent = label;
  panelPageTitle.textContent = label;
  panelPageSubtitle.style.display =
    currentView === "archived" ? "block" : "none";

  document
    .querySelectorAll(".sidebar-nav-item[data-view]")
    .forEach((i) =>
      i.classList.toggle("active", i.dataset.view === currentView),
    );
}

// ══════════════════════════════════════════════════
//  DETAIL PANEL
// ══════════════════════════════════════════════════

function openNote(noteId) {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  activeNoteId = noteId;
  isNewNote = false;

  detailTitleInput.value = note.title;
  detailTagsInput.value = note.tags.join(", ");
  detailContentArea.value = note.content;
  detailDateSpan.textContent = formatDate(note.lastEdited);

  detailStatusRow.style.display = note.isArchived ? "flex" : "none";
  if (note.isArchived) detailStatusSpan.textContent = "Archived";

  updateMobileActionIcons(true, note.isArchived);
  showDetailPanel();
  renderNotesList();
  renderActionsPanel(note);
}

function openNewNote() {
  isNewNote = true;
  activeNoteId = null;
  detailTitleInput.value = "";
  detailTagsInput.value = "";
  detailContentArea.value = "";
  detailDateSpan.textContent = "Not yet saved";
  detailStatusRow.style.display = "none";
  updateMobileActionIcons(false, false);
  actionsPanel.innerHTML = "";
  showDetailPanel();
  document
    .querySelectorAll(".note-card")
    .forEach((c) => c.classList.remove("active"));
}

function updateMobileActionIcons(show, isArchived) {
  mobileDeleteBtn.style.display = show ? "inline-flex" : "none";
  mobileArchiveBtn.style.display = show ? "inline-flex" : "none";
  const img = mobileArchiveBtn.querySelector("img");
  if (img) {
    img.src = isArchived
      ? "./assets/images/icon-restore.svg"
      : "./assets/images/icon-archive.svg";
    mobileArchiveBtn.setAttribute(
      "aria-label",
      isArchived ? "Restore note" : "Archive note",
    );
  }
}

function showDetailPanel() {
  detailEmpty.style.display = "none";
  detailBody.style.display = "flex";
  detailFooter.style.display = "flex";
  if (window.innerWidth < 1024) detailPanel.classList.add("mobile-visible");
}

function hideDetailPanel() {
  detailEmpty.style.display = "flex";
  detailBody.style.display = "none";
  detailFooter.style.display = "none";
  actionsPanel.innerHTML = "";
  detailPanel.classList.remove("mobile-visible");
}

function renderActionsPanel(note) {
  if (!note) {
    actionsPanel.innerHTML = "";
    return;
  }
  if (note.isArchived) {
    actionsPanel.innerHTML = `
      <button class="action-card" id="btn-restore">
        <img src="./assets/images/icon-restore.svg" alt="" />Restore Note
      </button>
      <button class="action-card action-card--danger" id="btn-delete">
        <img src="./assets/images/icon-delete.svg" alt="" />Delete Note
      </button>`;
    document
      .getElementById("btn-restore")
      .addEventListener("click", () => restoreNote(note.id));
    document
      .getElementById("btn-delete")
      .addEventListener("click", () => confirmDelete(note.id));
  } else {
    actionsPanel.innerHTML = `
      <button class="action-card" id="btn-archive">
        <img src="./assets/images/icon-archive.svg" alt="" />Archive Note
      </button>
      <button class="action-card action-card--danger" id="btn-delete">
        <img src="./assets/images/icon-delete.svg" alt="" />Delete Note
      </button>`;
    document
      .getElementById("btn-archive")
      .addEventListener("click", () => archiveNote(note.id));
    document
      .getElementById("btn-delete")
      .addEventListener("click", () => confirmDelete(note.id));
  }
}

// ══════════════════════════════════════════════════
//  VIEW SWITCHING
// ══════════════════════════════════════════════════

function setView(view) {
  currentView = view;
  activeNoteId = null;
  isNewNote = false;

  // Ensure notes view is visible
  notesView.style.display = "flex";
  settingsView.style.display = "none";

  document
    .querySelectorAll(".bottom-nav-item")
    .forEach((i) =>
      i.classList.toggle(
        "active",
        i.dataset.view === view ||
          (view === "archived" && i.dataset.view === "archived"),
      ),
    );

  hideDetailPanel();
  renderAll();
}

// ══════════════════════════════════════════════════
//  CRUD
// ══════════════════════════════════════════════════

function saveNote() {
  const title = detailTitleInput.value.trim();
  const tagsRaw = detailTagsInput.value.trim();
  const content = detailContentArea.value.trim();

  if (!title) {
    detailTitleInput.focus();
    detailTitleInput.classList.add("input-error");
    setTimeout(() => detailTitleInput.classList.remove("input-error"), 2000);
    return;
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const now = new Date().toISOString();

  if (isNewNote) {
    const newNote = {
      id: nextId(),
      title,
      tags,
      content,
      lastEdited: now,
      isArchived: false,
    };
    notes.unshift(newNote);
    activeNoteId = newNote.id;
    isNewNote = false;
  } else {
    const idx = notes.findIndex((n) => n.id === activeNoteId);
    if (idx !== -1)
      notes[idx] = { ...notes[idx], title, tags, content, lastEdited: now };
  }

  detailDateSpan.textContent = formatDate(now);
  renderAll();
  const saved = notes.find((n) => n.id === activeNoteId);
  if (saved) renderActionsPanel(saved);
  showToast("Note saved.");
}

function cancelEdit() {
  if (isNewNote) {
    isNewNote = false;
    activeNoteId = null;
    hideDetailPanel();
  } else if (activeNoteId !== null) openNote(activeNoteId);
  renderNotesList();
}

function archiveNote(noteId) {
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx !== -1) {
    notes[idx].isArchived = true;
    notes[idx].lastEdited = new Date().toISOString();
  }
  activeNoteId = null;
  hideDetailPanel();
  renderAll();
  showToast("Note archived.");
}

function restoreNote(noteId) {
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx !== -1) {
    notes[idx].isArchived = false;
    notes[idx].lastEdited = new Date().toISOString();
  }
  activeNoteId = null;
  hideDetailPanel();
  renderAll();
  showToast("Note restored.");
}

let pendingDeleteId = null;
function confirmDelete(noteId) {
  pendingDeleteId = noteId;
  modalOverlay.style.display = "flex";
}

function deleteNote(noteId) {
  notes = notes.filter((n) => n.id !== noteId);
  activeNoteId = null;
  hideDetailPanel();
  renderAll();
  showToast("Note deleted.");
}

// ══════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════

/* ── Sidebar nav ── */
document.querySelectorAll(".sidebar-nav-item[data-view]").forEach((item) =>
  item.addEventListener("click", (e) => {
    e.preventDefault();
    setView(item.dataset.view);
  }),
);

/* ── Bottom nav ── */
document.querySelectorAll(".bottom-nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    const view = item.dataset.view;
    if (view === "settings") {
      openSettings();
      return;
    }
    if (view === "search" || view === "tags") return;
    setView(view);
  });
});

/* ── Topbar settings button ── */
document
  .getElementById("btn-open-settings")
  .addEventListener("click", () => openSettings());

/* ── Settings sub-nav ── */
document.querySelectorAll(".settings-nav-item[data-setting]").forEach((item) =>
  item.addEventListener("click", (e) => {
    e.preventDefault();
    switchSettingsPanel(item.dataset.setting);
  }),
);

/* ── Settings option radio click → highlight row ── */
document.querySelectorAll(".settings-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    const radio = opt.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.checked = true;
    const name = radio.name;
    document
      .querySelectorAll(`input[name="${name}"]`)
      .forEach((r) =>
        r.closest(".settings-option")?.classList.toggle("active", r === radio),
      );
  });
});

/* ── Apply / Save buttons ── */
document
  .getElementById("btn-apply-color")
  .addEventListener("click", saveColorTheme);
document
  .getElementById("btn-apply-font")
  .addEventListener("click", saveFontTheme);
document
  .getElementById("btn-save-password")
  .addEventListener("click", savePassword);

/* ── Logout ── */
document.getElementById("btn-logout").addEventListener("click", (e) => {
  e.preventDefault();
  showToast("Logged out successfully.");
});

/* ── Password show/hide toggles ── */
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const isHide = input.type === "password";
    input.type = isHide ? "text" : "password";
    btn.querySelector(".pw-eye-show").style.display = isHide ? "none" : "block";
    btn.querySelector(".pw-eye-hide").style.display = isHide ? "block" : "none";
  });
});

/* ── Notes CRUD buttons ── */
document
  .getElementById("btn-create-note")
  .addEventListener("click", openNewNote);
document.getElementById("fab-create").addEventListener("click", openNewNote);
document.getElementById("btn-save-note").addEventListener("click", saveNote);
document.getElementById("mobile-save-btn").addEventListener("click", saveNote);
document.getElementById("btn-cancel").addEventListener("click", cancelEdit);
document
  .getElementById("mobile-cancel-btn")
  .addEventListener("click", cancelEdit);

document.getElementById("btn-back").addEventListener("click", () => {
  if (isNewNote && !detailTitleInput.value.trim()) {
    isNewNote = false;
    activeNoteId = null;
  }
  detailPanel.classList.remove("mobile-visible");
  renderNotesList();
});

mobileDeleteBtn.addEventListener("click", () => {
  if (activeNoteId) confirmDelete(activeNoteId);
});
mobileArchiveBtn.addEventListener("click", () => {
  if (!activeNoteId) return;
  const note = notes.find((n) => n.id === activeNoteId);
  if (note)
    note.isArchived ? restoreNote(activeNoteId) : archiveNote(activeNoteId);
});

/* ── Search ── */
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  renderNotesList();
});

/* ── Modal ── */
document.getElementById("modal-cancel").addEventListener("click", () => {
  modalOverlay.style.display = "none";
  pendingDeleteId = null;
});
document.getElementById("modal-confirm").addEventListener("click", () => {
  if (pendingDeleteId !== null) {
    deleteNote(pendingDeleteId);
    pendingDeleteId = null;
  }
  modalOverlay.style.display = "none";
});
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.style.display = "none";
    pendingDeleteId = null;
  }
});

/* ── Keyboard ── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modalOverlay.style.display !== "none") {
      modalOverlay.style.display = "none";
      pendingDeleteId = null;
    } else if (detailPanel.classList.contains("mobile-visible"))
      detailPanel.classList.remove("mobile-visible");
  }
});

/* ── System theme change listener ── */
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (appSettings.colorTheme === "system") applySettings();
  });

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
loadNotes();
