/**
 * categories.js
 * Handles all Note Categories / Folders logic:
 *   - CRUD for categories (create, rename, delete)
 *   - Assigning / removing a category from a note
 *   - Persistence via localStorage
 *   - Rendering category sidebar nav, badge, and picker dropdown
 *
 * Public API exposed as window.CategoriesModule
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────
     CONSTANTS
  ───────────────────────────────────────── */
  const STORAGE_KEY = "notes_categories";

  const COLOR_PALETTE = [
    "#335cff", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f97316", // orange
    "#eab308", // yellow
    "#21c16b", // green
    "#06b6d4", // cyan
    "#f93748", // red
    "#525868", // slate
    "#0e1219", // dark
  ];

  /* ─────────────────────────────────────────
     STATE
  ───────────────────────────────────────── */
  let categories = [];

  /* ─────────────────────────────────────────
     STORAGE HELPERS
  ───────────────────────────────────────── */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error("Categories: localStorage write error", e);
    }
  }

  function loadCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      categories = raw ? JSON.parse(raw) : [];
    } catch {
      categories = [];
    }
  }

  /* ─────────────────────────────────────────
     CRUD
  ───────────────────────────────────────── */
  function getCategories() {
    return categories;
  }

  function getCategoryById(id) {
    return categories.find((c) => c.id === id) || null;
  }

  function createCategory(name, color) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (
      categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      return null;
    }
    const cat = {
      id: "cat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name: trimmed,
      color: color || COLOR_PALETTE[0],
      createdAt: new Date().toISOString(),
    };
    categories.push(cat);
    persist();
    return cat;
  }

  function renameCategory(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    categories[idx].name = trimmed;
    persist();
    return true;
  }

  function deleteCategory(id, notes, persistNotesCb) {
    categories = categories.filter((c) => c.id !== id);
    persist();
    let dirty = false;
    notes.forEach((n) => {
      if (n.categoryId === id) {
        n.categoryId = null;
        dirty = true;
      }
    });
    if (dirty && typeof persistNotesCb === "function") persistNotesCb();
  }

  /* ─────────────────────────────────────────
     ASSIGN
  ───────────────────────────────────────── */
  function assignCategory(noteId, categoryId, notes, persistNotesCb) {
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return false;
    notes[idx].categoryId = categoryId || null;
    if (typeof persistNotesCb === "function") persistNotesCb();
    return true;
  }

  /* ─────────────────────────────────────────
     BADGE HTML
  ───────────────────────────────────────── */
  function getCategoryForNote(note) {
    if (!note || !note.categoryId) return null;
    return getCategoryById(note.categoryId);
  }

  function getCategoryBadgeHTML(note) {
    const cat = getCategoryForNote(note);
    if (!cat) return "";
    return (
      '<span class="category-badge" style="--cat-color:' +
      esc(cat.color) +
      '" title="Category: ' +
      esc(cat.name) +
      '">' +
      '<span class="category-badge__dot"></span>' +
      esc(cat.name) +
      "</span>"
    );
  }

  /* ─────────────────────────────────────────
     SIDEBAR CATEGORIES SECTION
  ───────────────────────────────────────── */
  function renderSidebarCategories(currentView, onSelect) {
    const nav = document.getElementById("sidebar-categories-nav");
    if (!nav) return;

    if (categories.length === 0) {
      nav.innerHTML = '<p class="sidebar-no-categories">No categories yet</p>';
      return;
    }

    nav.innerHTML = categories
      .map(function (cat) {
        const viewKey = "cat:" + cat.id;
        const isActive = currentView === viewKey;
        return (
          '<a href="#" class="sidebar-nav-item' +
          (isActive ? " active" : "") +
          '" data-cat-id="' +
          esc(cat.id) +
          '">' +
          '<span class="nav-left">' +
          '<span class="sidebar-cat-dot" style="background:' +
          esc(cat.color) +
          '"></span>' +
          esc(cat.name) +
          "</span>" +
          '<img src="./assets/images/icon-chevron-right.svg" alt="" class="nav-chevron" />' +
          "</a>"
        );
      })
      .join("");

    nav.querySelectorAll("[data-cat-id]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof onSelect === "function") onSelect("cat:" + el.dataset.catId);
      });
    });
  }

  /* ─────────────────────────────────────────
     CATEGORY PICKER  (inside detail panel)
  ───────────────────────────────────────── */
  function renderCategoryPicker(currentCategoryId, onAssign) {
    const wrap = document.getElementById("category-picker-wrap");
    if (!wrap) return;

    const current = currentCategoryId
      ? getCategoryById(currentCategoryId)
      : null;

    const dotHTML = current
      ? '<span class="cat-picker-dot" style="background:' +
        esc(current.color) +
        '"></span>'
      : '<span class="cat-picker-dot cat-picker-dot--none"></span>';

    const labelHTML = current ? esc(current.name) : "None";

    wrap.innerHTML =
      '<div class="cat-picker" id="cat-picker-trigger" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false">' +
      dotHTML +
      '<span class="cat-picker-label">' +
      labelHTML +
      "</span>" +
      '<img src="./assets/images/icon-chevron-right.svg" alt="" class="cat-picker-chevron" />' +
      "</div>" +
      '<div class="cat-picker-dropdown" id="cat-picker-dropdown" role="listbox" style="display:none">' +
      '<div class="cat-picker-option" data-cat-id="" role="option">' +
      '<span class="cat-picker-dot cat-picker-dot--none"></span>' +
      "<span>None</span>" +
      (!current
        ? '<img src="./assets/images/icon-checkmark.svg" alt="" class="cat-picker-check" />'
        : "") +
      "</div>" +
      categories
        .map(function (cat) {
          return (
            '<div class="cat-picker-option" data-cat-id="' +
            esc(cat.id) +
            '" role="option">' +
            '<span class="cat-picker-dot" style="background:' +
            esc(cat.color) +
            '"></span>' +
            "<span>" +
            esc(cat.name) +
            "</span>" +
            (current && current.id === cat.id
              ? '<img src="./assets/images/icon-checkmark.svg" alt="" class="cat-picker-check" />'
              : "") +
            "</div>"
          );
        })
        .join("") +
      '<div class="cat-picker-divider"></div>' +
      '<div class="cat-picker-option cat-picker-option--manage" id="cat-picker-manage">' +
      "<span>+ Manage Categories</span>" +
      "</div>" +
      "</div>";

    const trigger = document.getElementById("cat-picker-trigger");
    const dropdown = document.getElementById("cat-picker-dropdown");

    function toggleDropdown(open) {
      dropdown.style.display = open ? "block" : "none";
      trigger.setAttribute("aria-expanded", String(open));
    }

    // Close on outside click — use a named handler so we can remove it
    function outsideClick(e) {
      if (!wrap.contains(e.target)) toggleDropdown(false);
    }
    document.addEventListener("click", outsideClick);
    // Store so we can clean up if wrap is re-rendered
    wrap._outsideClick = outsideClick;

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = dropdown.style.display !== "none";
      toggleDropdown(!isOpen);
    });

    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const isOpen = dropdown.style.display !== "none";
        toggleDropdown(!isOpen);
      }
    });

    dropdown
      .querySelectorAll(".cat-picker-option[data-cat-id]")
      .forEach(function (opt) {
        opt.addEventListener("click", function (e) {
          e.stopPropagation();
          const catId = opt.dataset.catId || null;
          toggleDropdown(false);
          if (typeof onAssign === "function") onAssign(catId);
        });
      });

    const manageBtn = document.getElementById("cat-picker-manage");
    if (manageBtn) {
      manageBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleDropdown(false);
        openCategoryModal();
      });
    }
  }

  /* ─────────────────────────────────────────
     CREATE / MANAGE MODAL
  ───────────────────────────────────────── */
  let _onModalClose = null;

  function openCategoryModal(onClose) {
    if (typeof onClose === "function") _onModalClose = onClose;
    const overlay = document.getElementById("modal-category-overlay");
    if (!overlay) return;
    renderModalContent();
    overlay.style.display = "flex";
    requestAnimationFrame(function () {
      overlay.classList.add("modal-overlay--visible");
    });
    // Focus trap: focus the name input
    setTimeout(function () {
      const inp = document.getElementById("cat-name-input");
      if (inp) inp.focus();
    }, 120);
  }

  function closeCategoryModal() {
    const overlay = document.getElementById("modal-category-overlay");
    if (!overlay) return;
    overlay.classList.remove("modal-overlay--visible");
    setTimeout(function () {
      overlay.style.display = "none";
    }, 200);
    if (typeof _onModalClose === "function") {
      _onModalClose();
      _onModalClose = null;
    }
  }

  function renderModalContent() {
    const body = document.getElementById("modal-category-body");
    if (!body) return;

    const swatchesHTML = COLOR_PALETTE.map(function (c) {
      return (
        '<button class="cat-swatch" data-color="' +
        esc(c) +
        '" style="background:' +
        esc(c) +
        '" type="button" aria-label="Color ' +
        esc(c) +
        '"></button>'
      );
    }).join("");

    const listHTML =
      categories.length === 0
        ? '<p class="cat-modal-empty">No categories yet. Create one above!</p>'
        : categories
            .map(function (cat) {
              return (
                '<div class="cat-modal-item" data-item-id="' +
                esc(cat.id) +
                '">' +
                '<span class="cat-modal-dot" style="background:' +
                esc(cat.color) +
                '"></span>' +
                '<span class="cat-modal-name">' +
                esc(cat.name) +
                "</span>" +
                '<div class="cat-modal-actions">' +
                '<button class="cat-modal-btn cat-modal-btn--rename" data-rename-id="' +
                esc(cat.id) +
                '" title="Rename">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                "</button>" +
                '<button class="cat-modal-btn cat-modal-btn--delete" data-delete-id="' +
                esc(cat.id) +
                '" title="Delete">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6"/></svg>' +
                "</button>" +
                "</div>" +
                "</div>"
              );
            })
            .join("");

    body.innerHTML =
      '<div class="cat-modal-create">' +
      '<h3 class="cat-modal-section-title">Create New Category</h3>' +
      '<div class="cat-modal-form">' +
      '<div class="cat-modal-swatches" id="cat-swatches">' +
      swatchesHTML +
      "</div>" +
      '<input class="cat-modal-input" type="text" id="cat-name-input" placeholder="Category name…" maxlength="40" autocomplete="off" />' +
      '<button class="btn btn-primary cat-modal-add-btn" id="cat-modal-add-btn" type="button">Add</button>' +
      "</div>" +
      '<p class="cat-modal-error" id="cat-modal-error" style="display:none"></p>' +
      "</div>" +
      '<hr class="cat-modal-divider" />' +
      '<div class="cat-modal-list-section">' +
      '<h3 class="cat-modal-section-title">Your Categories</h3>' +
      '<div class="cat-modal-list" id="cat-modal-list">' +
      listHTML +
      "</div>" +
      "</div>";

    // ── Swatch selection ──
    let selectedColor = COLOR_PALETTE[0];
    const firstSwatch = body.querySelector(".cat-swatch");
    if (firstSwatch) firstSwatch.classList.add("active");

    body.querySelectorAll(".cat-swatch").forEach(function (sw) {
      sw.addEventListener("click", function () {
        body.querySelectorAll(".cat-swatch").forEach(function (s) {
          s.classList.remove("active");
        });
        sw.classList.add("active");
        selectedColor = sw.dataset.color;
      });
    });

    // ── Add button ──
    const addBtn = document.getElementById("cat-modal-add-btn");
    const nameInput = document.getElementById("cat-name-input");
    const errorEl = document.getElementById("cat-modal-error");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
      setTimeout(function () {
        errorEl.style.display = "none";
      }, 3000);
    }

    addBtn.addEventListener("click", function () {
      const name = nameInput.value.trim();
      if (!name) return showError("Please enter a category name.");
      const created = createCategory(name, selectedColor);
      if (!created)
        return showError(
          '"' + name + '" already exists. Try a different name.',
        );
      nameInput.value = "";
      renderModalContent();
    });

    nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") addBtn.click();
    });

    // ── Rename ──
    body.querySelectorAll("[data-rename-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.renameId;
        const cat = getCategoryById(id);
        if (!cat) return;
        const newName = prompt("Rename category:", cat.name);
        if (newName === null) return;
        const ok = renameCategory(id, newName);
        if (!ok) showError("Name already in use or empty.");
        else renderModalContent();
      });
    });

    // ── Delete ──
    body.querySelectorAll("[data-delete-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.deleteId;
        const cat = getCategoryById(id);
        if (!cat) return;
        if (
          !confirm(
            'Delete category "' +
              cat.name +
              '"?\nNotes in this category will become uncategorised.',
          )
        )
          return;
        document.dispatchEvent(
          new CustomEvent("categories:delete", { detail: { id: id } }),
        );
        renderModalContent();
      });
    });
  }

  /* ─────────────────────────────────────────
     UTILITY
  ───────────────────────────────────────── */
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  window.CategoriesModule = {
    loadCategories: loadCategories,
    getCategories: getCategories,
    getCategoryById: getCategoryById,
    createCategory: createCategory,
    renameCategory: renameCategory,
    deleteCategory: deleteCategory,
    assignCategory: assignCategory,
    getCategoryForNote: getCategoryForNote,
    getCategoryBadgeHTML: getCategoryBadgeHTML,
    renderSidebarCategories: renderSidebarCategories,
    renderCategoryPicker: renderCategoryPicker,
    openCategoryModal: openCategoryModal,
    closeCategoryModal: closeCategoryModal,
    COLOR_PALETTE: COLOR_PALETTE,
  };
})();
