//  AUTH GUARD
if (typeof AuthService !== "undefined" && !AuthService.isLoggedIn()) {
  window.location.href = "auth/login.html";
}

//  STORAGE KEYS
const STORAGE_KEYS = {
  notes: "notes_data",
  colorTheme: "colorTheme",
  fontTheme: "fontTheme",
  draft: "notes_draft",
};

/**
 * Write a value to localStorage.
 * Returns true on success, false on QuotaExceededError.
 */
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22) {
      showToast(
        "Storage full — some data could not be saved. Try deleting old notes.",
        null,
        null,
        "error",
      );
      return false;
    }
    console.error("localStorage write error:", e);
    return false;
  }
}

function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

//  SESSIONSTORAGE DRAFT HELPERS

function saveDraft(title, tags, content) {
  try {
    sessionStorage.setItem(
      STORAGE_KEYS.draft,
      JSON.stringify({ title, tags, content, savedAt: Date.now() }),
    );
  } catch {
    console.error(
      "Failed to save draft. Session storage may be unavailable or full.",
    );
  }
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.draft);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  sessionStorage.removeItem(STORAGE_KEYS.draft);
}

//  APP STATE
let notes = [];
let currentView = "all";
let activeNoteId = null;
let isNewNote = false;
let searchQuery = "";
let draftTimer = null; // debounce timer for auto-saving draft

let appSettings = {
  colorTheme: lsGet(STORAGE_KEYS.colorTheme, "light"),
  fontTheme: lsGet(STORAGE_KEYS.fontTheme, "sans-serif"),
};

let activeSettingPanel = "color-theme";

//  DOM REFS
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
const notesView = document.getElementById("notes-view");
const settingsView = document.getElementById("settings-view");

//  DATA — LOAD / SAVE
async function loadNotes() {
  const stored = lsGet(STORAGE_KEYS.notes, null);

  if (stored && Array.isArray(stored) && stored.length > 0) {
    notes = stored;
  } else {
    // First run — seed from data.json
    try {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error("No data.json");
      const data = await res.json();
      notes = data.notes.map((n, i) => ({ ...n, id: i + 1 }));
    } catch {
      notes = getFallbackNotes();
    }
    persistNotes(); // write seed data to localStorage
  }

  applySettings();
  renderAll();
  restoreDraftIfAny(); // sessionStorage draft check
}

/** Write current notes array to localStorage */
function persistNotes() {
  lsSet(STORAGE_KEYS.notes, notes);
}

/** Check sessionStorage for an unsaved draft and offer to restore it */
function restoreDraftIfAny() {
  const draft = loadDraft();
  if (!draft || !draft.title) return;

  // Show draft banner
  const banner = document.createElement("div");
  banner.className = "draft-banner";
  banner.innerHTML = `
    <span>📝 You have an unsaved draft: <strong>${esc(draft.title)}</strong></span>
    <div class="draft-banner-actions">
      <button class="draft-btn draft-btn--restore" id="btn-restore-draft">Restore</button>
      <button class="draft-btn draft-btn--discard" id="btn-discard-draft">Discard</button>
    </div>`;

  document.querySelector(".notes-panel").prepend(banner);

  document.getElementById("btn-restore-draft").addEventListener("click", () => {
    banner.remove();
    // Open a new note form pre-filled with draft
    isNewNote = true;
    activeNoteId = null;
    detailTitleInput.value = draft.title;
    detailTagsInput.value = draft.tags || "";
    detailContentArea.value = draft.content || "";
    detailDateSpan.textContent = "Not yet saved";
    detailStatusRow.style.display = "none";
    updateMobileActionIcons(false, false);
    actionsPanel.innerHTML = "";
    showDetailPanel();
    document
      .querySelectorAll(".note-card")
      .forEach((c) => c.classList.remove("active"));
    showToast("Draft restored. Remember to save!");
  });

  document.getElementById("btn-discard-draft").addEventListener("click", () => {
    clearDraft();
    banner.remove();
  });
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
        "Custom Component Library:\n\n1. Basic: Button, Input, Card, Modal\n2. Form: FormField, Select, Checkbox, RadioGroup\n3. Layout: Container, Grid, Flex\n\nAll components need TypeScript defs, unit tests, Storybook docs, a11y support.",
      lastEdited: "2024-10-15T14:23:45Z",
      isArchived: true,
    },
    {
      id: 8,
      title: "Meal Prep Ideas",
      tags: ["Cooking", "Health", "Recipes"],
      content:
        "Weekly Meal Prep Plan:\n\nBreakfast: Overnight oats, Egg muffins, Smoothie packs\nLunch: Greek chicken bowl, Buddha bowls, Tuna pasta salad\nSnacks: Cut vegetables, Mixed nuts, Greek yogurt parfait\n\nPrep Time: Sunday 2-4pm. Glass containers. Lasts 4-5 days.",
      lastEdited: "2024-10-12T09:45:15Z",
      isArchived: false,
    },
    {
      id: 9,
      title: "Reading List",
      tags: ["Personal", "Dev"],
      content:
        "Technical:\n- Clean Architecture – Robert Martin\n- Designing Data-Intensive Applications\n- TypeScript Design Patterns\n\nPersonal:\n- Deep Work – Cal Newport\n- Atomic Habits\n- The Psychology of Money\n\nGoal: one book/month.",
      lastEdited: "2024-10-05T12:20:30Z",
      isArchived: false,
    },
    {
      id: 10,
      title: "Fitness Goals 2025",
      tags: ["Fitness", "Health", "Personal"],
      content:
        "Strength: Bench 225 lbs, Squat 315 lbs, Deadlift 405 lbs\nCardio: Half marathon, 5k < 25 min\nHabits: Gym 4×/week, 10k steps/day, 7+ hrs sleep\n\nTrack in Strong app.",
      lastEdited: "2024-09-22T07:30:00Z",
      isArchived: false,
    },
  ];
}

//  UTILITIES

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

//  TOAST
function showToast(msg, link = null, onLink = null, type = "success") {
  const toastEl = document.getElementById("toast");
  const msgEl = document.getElementById("toast-msg");
  const linkEl = document.getElementById("toast-link");

  msgEl.textContent = msg;

  if (link) {
    linkEl.textContent = link;
    linkEl.style.display = "block";
    linkEl.onclick = (e) => {
      e.preventDefault();
      if (onLink) onLink();
      dismissToast();
    };
  } else {
    linkEl.style.display = "none";
    linkEl.onclick = null;
  }

  const iconEl = toastEl.querySelector(".toast-icon");
  if (type === "error") {
    iconEl.src = "./assets/images/icon-cross.svg";
    toastEl.classList.add("toast--error");
  } else {
    iconEl.src = "./assets/images/icon-checkmark.svg";
    toastEl.classList.remove("toast--error");
  }

  toastEl.style.display = "block";
  toastEl.getBoundingClientRect(); // force reflow
  toastEl.classList.add("toast--visible");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(dismissToast, 4000);
}

function dismissToast() {
  const toastEl = document.getElementById("toast");
  toastEl.classList.remove("toast--visible");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.style.display = "none";
  }, 250);
}

//  SETTINGS — apply / persist
const FONT_MAP = {
  "sans-serif": "'Manrope', 'Arial', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  monospace: "'Courier New', 'Lucida Console', monospace",
};

function applySettings() {
  const { colorTheme, fontTheme } = appSettings;

  document.documentElement.setAttribute(
    "data-theme",
    colorTheme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : colorTheme,
  );

  document.documentElement.style.setProperty(
    "--app-font",
    FONT_MAP[fontTheme] || FONT_MAP["sans-serif"],
  );
  document.body.style.fontFamily =
    FONT_MAP[fontTheme] || FONT_MAP["sans-serif"];

  const colorRadio = document.querySelector(
    `input[name="color-theme"][value="${colorTheme}"]`,
  );
  if (colorRadio) colorRadio.checked = true;
  const fontRadio = document.querySelector(
    `input[name="font-theme"][value="${fontTheme}"]`,
  );
  if (fontRadio) fontRadio.checked = true;

  syncOptionHighlights("color-theme", colorTheme);
  syncOptionHighlights("font-theme", fontTheme);
}

function syncOptionHighlights(radioName, value) {
  document
    .querySelectorAll(`input[name="${radioName}"]`)
    .forEach((radio) =>
      radio
        .closest(".settings-option")
        ?.classList.toggle("active", radio.value === value),
    );
}

function saveColorTheme() {
  const selected = document.querySelector('input[name="color-theme"]:checked');
  if (!selected) return;
  appSettings.colorTheme = selected.value;
  lsSet(STORAGE_KEYS.colorTheme, selected.value);
  applySettings();
  showToast("Settings updated successfully!");
}

function saveFontTheme() {
  const selected = document.querySelector('input[name="font-theme"]:checked');
  if (!selected) return;
  appSettings.fontTheme = selected.value;
  lsSet(STORAGE_KEYS.fontTheme, selected.value);
  applySettings();
  showToast("Settings updated successfully!");
}

function savePassword() {
  const oldPw = document.getElementById("pw-old").value;
  const newPw = document.getElementById("pw-new").value;
  const confPw = document.getElementById("pw-confirm").value;

  ["pw-old", "pw-new", "pw-confirm"].forEach((id) =>
    document
      .getElementById(id)
      .closest(".settings-field-input-wrap")
      .classList.remove("input-error"),
  );

  if (!oldPw) {
    document
      .getElementById("pw-old")
      .closest(".settings-field-input-wrap")
      .classList.add("input-error");
    showToast("Please enter your current password.", null, null, "error");
    return;
  }
  if (newPw.length < 8) {
    document
      .getElementById("pw-new")
      .closest(".settings-field-input-wrap")
      .classList.add("input-error");
    showToast(
      "New password must be at least 8 characters.",
      null,
      null,
      "error",
    );
    return;
  }
  if (newPw !== confPw) {
    document
      .getElementById("pw-confirm")
      .closest(".settings-field-input-wrap")
      .classList.add("input-error");
    showToast("Passwords do not match.", null, null, "error");
    return;
  }

  ["pw-old", "pw-new", "pw-confirm"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  showToast("Password changed successfully!");
}

//  SETTINGS VIEW ROUTING
function openSettings(panel) {
  currentView = "settings";
  notesView.style.display = "none";
  settingsView.style.display = "flex";
  topbarTitle.textContent = "Settings";

  document
    .querySelectorAll(".bottom-nav-item")
    .forEach((i) =>
      i.classList.toggle("active", i.dataset.view === "settings"),
    );
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
  document
    .querySelectorAll(".settings-nav-item[data-setting]")
    .forEach((item) => {
      const isActive = item.dataset.setting === panelId;
      item.classList.toggle("active", isActive);
      const chevron = item.querySelector(".settings-nav-chevron");
      if (chevron) chevron.style.display = isActive ? "block" : "none";
    });
  document
    .querySelectorAll(".settings-panel")
    .forEach((p) => p.classList.toggle("active", p.id === `panel-${panelId}`));
}

//  GEOLOCATION — attach location tag to a note
function attachLocationToNote() {
  if (!navigator.geolocation) {
    showToast(
      "Geolocation is not supported by your browser.",
      null,
      null,
      "error",
    );
    return;
  }

  showToast("Requesting location…");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      let locationLabel = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

      // Try to resolve city name via Nominatim (OpenStreetMap)
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { "Accept-Language": "en" } },
        );
        const geo = await resp.json();
        const city =
          geo?.address?.city ||
          geo?.address?.town ||
          geo?.address?.village ||
          geo?.address?.county;
        if (city) locationLabel = city;
      } catch {
        console.error("Failed to reverse geocode location.");
      }

      // Add location as a tag on the active note (or new note in progress)
      const tag = `📍 ${locationLabel}`;

      if (activeNoteId !== null) {
        const idx = notes.findIndex((n) => n.id === activeNoteId);
        if (idx !== -1 && !notes[idx].tags.includes(tag)) {
          notes[idx].tags.push(tag);
          notes[idx].lastEdited = new Date().toISOString();
          // Sync to detail tags input if note is open
          detailTagsInput.value = notes[idx].tags.join(", ");
          persistNotes();
          renderAll();
          showToast(`Location added: ${locationLabel}`, null, null, "success");
        } else {
          showToast("Location already added to this note.");
        }
      } else if (isNewNote) {
        // Add to new-note draft
        const existing = detailTagsInput.value.trim();
        detailTagsInput.value = existing ? `${existing}, ${tag}` : tag;
        showToast(`Location added: ${locationLabel}`);
      } else {
        showToast(
          "Open a note first to attach a location.",
          null,
          null,
          "error",
        );
      }
    },
    (err) => {
      const messages = {
        1: "Location access denied. Please allow location in your browser settings.",
        2: "Location unavailable. Check your connection or device settings.",
        3: "Location request timed out. Please try again.",
      };
      showToast(
        messages[err.code] || "Could not retrieve location.",
        null,
        null,
        "error",
      );
    },
    { timeout: 10000, maximumAge: 60000 },
  );
}

//  RENDER
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

//  DETAIL PANEL
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
  clearDraft(); // opening a saved note clears any orphaned draft
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
      </button>
      <button class="action-card" id="btn-location" title="Attach your current location to this note">
        <img src="./assets/images/icon-tag.svg" alt="" />Add Location
      </button>`;
    document
      .getElementById("btn-archive")
      .addEventListener("click", () => confirmArchive(note.id));
    document
      .getElementById("btn-delete")
      .addEventListener("click", () => confirmDelete(note.id));
    document
      .getElementById("btn-location")
      .addEventListener("click", attachLocationToNote);
  }
}

//  VIEW SWITCHING

function setView(view) {
  currentView = view;
  activeNoteId = null;
  isNewNote = false;

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

//  CRUD

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

  persistNotes();
  clearDraft(); // successfully saved — remove draft
  detailDateSpan.textContent = formatDate(now);
  renderAll();
  const saved = notes.find((n) => n.id === activeNoteId);
  if (saved) renderActionsPanel(saved);
  showToast("Note saved successfully!");
}

function cancelEdit() {
  if (isNewNote) {
    isNewNote = false;
    activeNoteId = null;
    hideDetailPanel();
    clearDraft();
  } else if (activeNoteId !== null) openNote(activeNoteId);
  renderNotesList();
}

function archiveNote(noteId) {
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx !== -1) {
    notes[idx].isArchived = true;
    notes[idx].lastEdited = new Date().toISOString();
  }
  persistNotes();
  activeNoteId = null;
  hideDetailPanel();
  renderAll();
  showToast("Note archived.", "Archived Notes", () => setView("archived"));
}

function restoreNote(noteId) {
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx !== -1) {
    notes[idx].isArchived = false;
    notes[idx].lastEdited = new Date().toISOString();
  }
  persistNotes();
  activeNoteId = null;
  hideDetailPanel();
  renderAll();
  showToast("Note restored to active notes.", "All Notes", () =>
    setView("all"),
  );
}

let pendingDeleteId = null;
let pendingArchiveId = null;

function confirmDelete(noteId) {
  pendingDeleteId = noteId;
  document.getElementById("modal-delete-overlay").style.display = "flex";
}

function confirmArchive(noteId) {
  pendingArchiveId = noteId;
  document.getElementById("modal-archive-overlay").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("modal-delete-overlay").style.display = "none";
  pendingDeleteId = null;
}

function closeArchiveModal() {
  document.getElementById("modal-archive-overlay").style.display = "none";
  pendingArchiveId = null;
}

function deleteNote(noteId) {
  notes = notes.filter((n) => n.id !== noteId);
  persistNotes();
  activeNoteId = null;
  hideDetailPanel();
  renderAll();
  showToast("Note permanently deleted.");
}

//  DRAFT AUTO-SAVE  (sessionStorage, debounced)

function scheduleDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const title = detailTitleInput.value.trim();
    const tags = detailTagsInput.value.trim();
    const content = detailContentArea.value.trim();
    // Only save draft when actively writing a new note or editing
    if (title || content) saveDraft(title, tags, content);
  }, 800); // 800 ms debounce
}

//  EVENT LISTENERS

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

/* ── Settings option radio click ── */
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

/* ── Settings apply/save buttons ── */
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
  if (typeof AuthService !== "undefined") AuthService.logout();
  window.location.href = "/auth/login.html";
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

/* ── Notes CRUD ── */
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
  if (!note) return;
  if (note.isArchived) restoreNote(activeNoteId);
  else confirmArchive(activeNoteId);
});

/* ── Draft auto-save: fire on every keystroke in title/tags/content ── */
[detailTitleInput, detailTagsInput, detailContentArea].forEach((el) =>
  el.addEventListener("input", scheduleDraftSave),
);

/* ── Search ── */
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  renderNotesList();
});

/* ── Delete modal ── */
document
  .getElementById("modal-delete-cancel")
  .addEventListener("click", closeDeleteModal);
document
  .getElementById("modal-delete-confirm")
  .addEventListener("click", () => {
    if (pendingDeleteId !== null) deleteNote(pendingDeleteId);
    closeDeleteModal();
  });
document
  .getElementById("modal-delete-overlay")
  .addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal-delete-overlay"))
      closeDeleteModal();
  });

/* ── Archive modal ── */
document
  .getElementById("modal-archive-cancel")
  .addEventListener("click", closeArchiveModal);
document
  .getElementById("modal-archive-confirm")
  .addEventListener("click", () => {
    if (pendingArchiveId !== null) archiveNote(pendingArchiveId);
    closeArchiveModal();
  });
document
  .getElementById("modal-archive-overlay")
  .addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal-archive-overlay"))
      closeArchiveModal();
  });

/* ── Toast close ── */
document.getElementById("toast-close").addEventListener("click", dismissToast);

/* ── Keyboard ── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const delModal = document.getElementById("modal-delete-overlay");
    const archModal = document.getElementById("modal-archive-overlay");
    if (delModal.style.display !== "none") {
      closeDeleteModal();
      return;
    }
    if (archModal.style.display !== "none") {
      closeArchiveModal();
      return;
    }
    if (detailPanel.classList.contains("mobile-visible"))
      detailPanel.classList.remove("mobile-visible");
  }
});

/* ── System theme change ── */
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (appSettings.colorTheme === "system") applySettings();
  });

//  INIT
loadNotes();
