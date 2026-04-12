/* global supabase, SUPABASE_URL, SUPABASE_ANON_KEY */

const listsDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listState = {
  mode: "menage",

  shoppingLists: [],
  shoppingItems: [],
  shoppingPresets: [],
  activeShoppingListId: null,
  activePresetCategory: null,

  checklists: [],
  checklistItems: [],
  activeChecklistId: null,
};

const listEls = {
  modeCards: [...document.querySelectorAll(".mode-card")],
  modeMenage: document.getElementById("modeMenage"),
  modeCourses: document.getElementById("modeCourses"),
  modeChecklists: document.getElementById("modeChecklists"),

  createShoppingListBtn: document.getElementById("createShoppingListBtn"),
  shoppingListsTabs: document.getElementById("shoppingListsTabs"),
  shoppingPresetCategories: document.getElementById("shoppingPresetCategories"),
  shoppingItemForm: document.getElementById("shoppingItemForm"),
  shoppingItemLabel: document.getElementById("shoppingItemLabel"),
  shoppingItemQuantityValue: document.getElementById("shoppingItemQuantityValue"),
  shoppingItemQuantityUnit: document.getElementById("shoppingItemQuantityUnit"),
  shoppingFilter: document.getElementById("shoppingFilter"),
  shoppingItemsContainer: document.getElementById("shoppingItemsContainer"),
  shoppingArchivedLists: document.getElementById("shoppingArchivedLists"),

  shoppingListModal: document.getElementById("shoppingListModal"),
  closeShoppingListModalBtn: document.getElementById("closeShoppingListModalBtn"),
  shoppingListForm: document.getElementById("shoppingListForm"),
  shoppingListTitle: document.getElementById("shoppingListTitle"),

  createChecklistBtn: document.getElementById("createChecklistBtn"),
  checklistTabs: document.getElementById("checklistTabs"),
  checklistItemForm: document.getElementById("checklistItemForm"),
  checklistItemLabel: document.getElementById("checklistItemLabel"),
  checklistFilter: document.getElementById("checklistFilter"),
  checklistItemsContainer: document.getElementById("checklistItemsContainer"),
  checklistArchivedLists: document.getElementById("checklistArchivedLists"),

  checklistModal: document.getElementById("checklistModal"),
  closeChecklistModalBtn: document.getElementById("closeChecklistModalBtn"),
  checklistForm: document.getElementById("checklistForm"),
  checklistTitle: document.getElementById("checklistTitle"),
};

function switchMode(mode) {
  listState.mode = mode;

  listEls.modeCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.mode === mode);
  });

  listEls.modeMenage.classList.toggle("hidden-panel", mode !== "menage");
  listEls.modeCourses.classList.toggle("hidden-panel", mode !== "courses");
  listEls.modeChecklists.classList.toggle("hidden-panel", mode !== "checklists");
}

async function loadShoppingLists() {
  const { data, error } = await listsDb
    .from("shopping_lists")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  listState.shoppingLists = data || [];

  const activeLists = listState.shoppingLists.filter((l) => l.status === "active");
  if (!listState.activeShoppingListId || !activeLists.some((l) => l.id === listState.activeShoppingListId)) {
    listState.activeShoppingListId = activeLists[0]?.id || null;
  }

  renderShoppingTabs();
  renderShoppingArchivedLists();
  await loadShoppingItems();
}

async function loadShoppingItems() {
  if (!listState.activeShoppingListId) {
    listState.shoppingItems = [];
    renderShoppingItems();
    return;
  }

  const { data, error } = await listsDb
    .from("shopping_items")
    .select("*")
    .eq("shopping_list_id", listState.activeShoppingListId)
    .order("position", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  listState.shoppingItems = data || [];
  renderShoppingItems();
}

async function loadShoppingPresets() {
  const { data, error } = await listsDb
    .from("shopping_presets")
    .select("*")
    .order("category", { ascending: true })
    .order("position", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  listState.shoppingPresets = data || [];
  renderPresetCategories();
}

function renderShoppingTabs() {
  const activeLists = listState.shoppingLists.filter((l) => l.status === "active");

  listEls.shoppingListsTabs.innerHTML = activeLists.length
    ? activeLists
        .map(
          (list) => `
            <button class="list-tab ${list.id === listState.activeShoppingListId ? "active" : ""}" data-shopping-list-id="${list.id}">
              ${escapeHtml(list.title)}
            </button>
          `
        )
        .join("")
    : `<div class="empty-state">Aucune liste active.</div>`;

  listEls.createShoppingListBtn.disabled = activeLists.length >= 3;
}

function renderShoppingArchivedLists() {
  const archived = listState.shoppingLists.filter((l) => l.status === "archived");

  listEls.shoppingArchivedLists.innerHTML = archived.length
    ? archived
        .map(
          (list) => `
            <div class="history-card">
              <p class="history-title">${escapeHtml(list.title)}</p>
              <p class="history-meta">Archivée</p>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Pas d’historique.</div>`;
}

function renderPresetCategories() {
  const categories = [...new Set(listState.shoppingPresets.map((p) => p.category))];

  listEls.shoppingPresetCategories.innerHTML = categories
    .map(
      (category) => `
        <button class="preset-category-btn" data-preset-category="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `
    )
    .join("");

  if (!listState.activePresetCategory && categories.length) {
    listState.activePresetCategory = categories[0];
  }

  renderPresetCategoryItems();
}

function renderPresetCategoryItems() {
  const old = document.getElementById("presetCategoryItems");
  if (old) old.remove();

  if (!listState.activePresetCategory) return;

  const items = listState.shoppingPresets.filter((p) => p.category === listState.activePresetCategory);

  const wrapper = document.createElement("div");
  wrapper.id = "presetCategoryItems";
  wrapper.className = "preset-items-grid";

  wrapper.innerHTML = items
    .map(
      (item) => `
        <div class="preset-item">
          <strong>${escapeHtml(item.label)}</strong>
          <input type="number" step="0.01" value="${item.quantity_value ?? ""}" data-preset-value="${item.id}" />
          <select data-preset-unit="${item.id}">
            <option value="piece" ${item.quantity_unit === "piece" ? "selected" : ""}>Nombre</option>
            <option value="kg" ${item.quantity_unit === "kg" ? "selected" : ""}>kg</option>
            <option value="g" ${item.quantity_unit === "g" ? "selected" : ""}>g</option>
            <option value="l" ${item.quantity_unit === "l" ? "selected" : ""}>L</option>
            <option value="ml" ${item.quantity_unit === "ml" ? "selected" : ""}>ml</option>
          </select>
          <button class="primary-btn" type="button" data-add-preset-item="${item.id}">Ajouter</button>
        </div>
      `
    )
    .join("");

  listEls.shoppingPresetCategories.insertAdjacentElement("afterend", wrapper);
}

function renderShoppingItems() {
  const filter = listEls.shoppingFilter.value;
  let items = [...listState.shoppingItems];

  if (filter === "unchecked") {
    items = items.filter((i) => !i.is_checked);
  } else if (filter === "checked") {
    items = items.filter((i) => i.is_checked);
  }

  listEls.shoppingItemsContainer.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <div class="sortable-item ${item.is_checked ? "checked" : ""}" draggable="true" data-shopping-item-id="${item.id}">
              <div class="sort-handle">⋮⋮</div>

              <div class="sortable-main">
                <p class="sortable-title">${escapeHtml(item.label)}</p>
                <p class="sortable-meta">
                  ${item.quantity_value ?? ""} ${formatUnit(item.quantity_unit)}
                </p>
              </div>

              <button class="item-check-btn ${item.is_checked ? "checked" : ""}" data-shopping-toggle="${item.id}">
                ${item.is_checked ? "✓" : ""}
              </button>

              <div class="item-side-actions">
                <button class="small-pill-btn" data-shopping-edit="${item.id}">Modifier</button>
                <button class="small-pill-btn" data-shopping-delete="${item.id}">Supprimer</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Aucun article.</div>`;
}

async function createShoppingList(title) {
  const activeCount = listState.shoppingLists.filter((l) => l.status === "active").length;
  if (activeCount >= 3) {
    alert("Maximum 3 listes de courses actives.");
    return;
  }

  const { error } = await listsDb.from("shopping_lists").insert({
    title,
    status: "active",
  });

  if (error) {
    console.error(error);
    return;
  }

  await loadShoppingLists();
}

async function addShoppingItem(item) {
  if (!listState.activeShoppingListId) {
    alert("Crée d'abord une liste de courses.");
    return;
  }

  const maxPosition = listState.shoppingItems.length
    ? Math.max(...listState.shoppingItems.map((i) => i.position))
    : 0;

  const { error } = await listsDb.from("shopping_items").insert({
    shopping_list_id: listState.activeShoppingListId,
    label: item.label,
    quantity_value: item.quantity_value,
    quantity_unit: item.quantity_unit,
    category: item.category || null,
    position: maxPosition + 1,
  });

  if (error) {
    console.error(error);
    return;
  }

  await loadShoppingItems();
}

async function toggleShoppingItem(id, checked) {
  const { error } = await listsDb
    .from("shopping_items")
    .update({ is_checked: !checked })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await loadShoppingItems();
}

async function deleteShoppingItem(id) {
  const { error } = await listsDb.from("shopping_items").delete().eq("id", id);
  if (error) {
    console.error(error);
    return;
  }
  await loadShoppingItems();
}

async function archiveShoppingList(id) {
  const { error } = await listsDb
    .from("shopping_lists")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await loadShoppingLists();
}

async function loadChecklists() {
  const { data, error } = await listsDb
    .from("checklists")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  listState.checklists = data || [];

  const activeLists = listState.checklists.filter((l) => l.status === "active");
  if (!listState.activeChecklistId || !activeLists.some((l) => l.id === listState.activeChecklistId)) {
    listState.activeChecklistId = activeLists[0]?.id || null;
  }

  renderChecklistTabs();
  renderChecklistArchivedLists();
  await loadChecklistItems();
}

async function loadChecklistItems() {
  if (!listState.activeChecklistId) {
    listState.checklistItems = [];
    renderChecklistItems();
    return;
  }

  const { data, error } = await listsDb
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", listState.activeChecklistId)
    .order("position", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  listState.checklistItems = data || [];
  renderChecklistItems();
}

function renderChecklistTabs() {
  const activeLists = listState.checklists.filter((l) => l.status === "active");

  listEls.checklistTabs.innerHTML = activeLists.length
    ? activeLists
        .map(
          (list) => `
            <button class="list-tab ${list.id === listState.activeChecklistId ? "active" : ""}" data-checklist-id="${list.id}">
              ${escapeHtml(list.title)}
            </button>
          `
        )
        .join("")
    : `<div class="empty-state">Aucune check-list active.</div>`;

  listEls.createChecklistBtn.disabled = activeLists.length >= 3;
}

function renderChecklistArchivedLists() {
  const archived = listState.checklists.filter((l) => l.status === "archived");

  listEls.checklistArchivedLists.innerHTML = archived.length
    ? archived
        .map(
          (list) => `
            <div class="history-card">
              <p class="history-title">${escapeHtml(list.title)}</p>
              <p class="history-meta">Archivée</p>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Pas d’historique.</div>`;
}

function renderChecklistItems() {
  const filter = listEls.checklistFilter.value;
  let items = [...listState.checklistItems];

  if (filter === "unchecked") {
    items = items.filter((i) => !i.is_checked);
  } else if (filter === "checked") {
    items = items.filter((i) => i.is_checked);
  }

  listEls.checklistItemsContainer.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <div class="sortable-item ${item.is_checked ? "checked" : ""}" draggable="true" data-checklist-item-id="${item.id}">
              <div class="sort-handle">⋮⋮</div>

              <div class="sortable-main">
                <p class="sortable-title">${escapeHtml(item.label)}</p>
              </div>

              <button class="item-check-btn ${item.is_checked ? "checked" : ""}" data-checklist-toggle="${item.id}">
                ${item.is_checked ? "✓" : ""}
              </button>

              <div class="item-side-actions">
                <button class="small-pill-btn" data-checklist-edit="${item.id}">Modifier</button>
                <button class="small-pill-btn" data-checklist-delete="${item.id}">Supprimer</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Aucun élément.</div>`;
}

async function createChecklist(title) {
  const activeCount = listState.checklists.filter((l) => l.status === "active").length;
  if (activeCount >= 3) {
    alert("Maximum 3 check-lists actives.");
    return;
  }

  const { error } = await listsDb.from("checklists").insert({
    title,
    status: "active",
  });

  if (error) {
    console.error(error);
    return;
  }

  await loadChecklists();
}

async function addChecklistItem(label) {
  if (!listState.activeChecklistId) {
    alert("Crée d'abord une check-list.");
    return;
  }

  const maxPosition = listState.checklistItems.length
    ? Math.max(...listState.checklistItems.map((i) => i.position))
    : 0;

  const { error } = await listsDb.from("checklist_items").insert({
    checklist_id: listState.activeChecklistId,
    label,
    position: maxPosition + 1,
  });

  if (error) {
    console.error(error);
    return;
  }

  await loadChecklistItems();
}

async function toggleChecklistItem(id, checked) {
  const { error } = await listsDb
    .from("checklist_items")
    .update({ is_checked: !checked })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await loadChecklistItems();
}

async function deleteChecklistItem(id) {
  const { error } = await listsDb.from("checklist_items").delete().eq("id", id);
  if (error) {
    console.error(error);
    return;
  }
  await loadChecklistItems();
}

async function archiveChecklist(id) {
  const { error } = await listsDb
    .from("checklists")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await loadChecklists();
}

function formatUnit(unit) {
  if (!unit) return "";
  if (unit === "piece") return "pc";
  return unit;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function persistShoppingOrder() {
  const items = [...listEls.shoppingItemsContainer.querySelectorAll("[data-shopping-item-id]")];
  for (let i = 0; i < items.length; i += 1) {
    const id = items[i].dataset.shoppingItemId;
    await listsDb.from("shopping_items").update({ position: i + 1 }).eq("id", id);
  }
  await loadShoppingItems();
}

async function persistChecklistOrder() {
  const items = [...listEls.checklistItemsContainer.querySelectorAll("[data-checklist-item-id]")];
  for (let i = 0; i < items.length; i += 1) {
    const id = items[i].dataset.checklistItemId;
    await listsDb.from("checklist_items").update({ position: i + 1 }).eq("id", id);
  }
  await loadChecklistItems();
}

function enableSimpleDrag(container, persistCallback, itemSelector) {
  let dragged = null;

  container.addEventListener("dragstart", (event) => {
    const item = event.target.closest(itemSelector);
    if (!item) return;
    dragged = item;
  });

  container.addEventListener("dragover", (event) => {
    event.preventDefault();
    const target = event.target.closest(itemSelector);
    if (!dragged || !target || dragged === target) return;

    const rect = target.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    target.parentNode.insertBefore(dragged, before ? target : target.nextSibling);
  });

  container.addEventListener("drop", async () => {
    if (!dragged) return;
    await persistCallback();
    dragged = null;
  });
}

function initListModeEvents() {
  listEls.modeCards.forEach((card) => {
    card.addEventListener("click", () => switchMode(card.dataset.mode));
  });

  listEls.createShoppingListBtn.addEventListener("click", () => {
    listEls.shoppingListModal.classList.remove("hidden");
  });

  listEls.closeShoppingListModalBtn.addEventListener("click", () => {
    listEls.shoppingListModal.classList.add("hidden");
  });

  listEls.shoppingListForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createShoppingList(listEls.shoppingListTitle.value.trim());
    listEls.shoppingListForm.reset();
    listEls.shoppingListModal.classList.add("hidden");
  });

  listEls.createChecklistBtn.addEventListener("click", () => {
    listEls.checklistModal.classList.remove("hidden");
  });

  listEls.closeChecklistModalBtn.addEventListener("click", () => {
    listEls.checklistModal.classList.add("hidden");
  });

  listEls.checklistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createChecklist(listEls.checklistTitle.value.trim());
    listEls.checklistForm.reset();
    listEls.checklistModal.classList.add("hidden");
  });

  listEls.shoppingListsTabs.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-shopping-list-id]");
    if (!btn) return;
    listState.activeShoppingListId = btn.dataset.shoppingListId;
    renderShoppingTabs();
    await loadShoppingItems();
  });

  listEls.checklistTabs.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-checklist-id]");
    if (!btn) return;
    listState.activeChecklistId = btn.dataset.checklistId;
    renderChecklistTabs();
    await loadChecklistItems();
  });

  listEls.shoppingPresetCategories.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-preset-category]");
    if (!btn) return;
    listState.activePresetCategory = btn.dataset.presetCategory;
    renderPresetCategoryItems();
  });

  document.addEventListener("click", async (event) => {
    const addPresetBtn = event.target.closest("[data-add-preset-item]");
    if (addPresetBtn) {
      const presetId = addPresetBtn.dataset.addPresetItem;
      const preset = listState.shoppingPresets.find((p) => p.id === presetId);
      if (!preset) return;

      const valueInput = document.querySelector(`[data-preset-value="${presetId}"]`);
      const unitInput = document.querySelector(`[data-preset-unit="${presetId}"]`);

      await addShoppingItem({
        label: preset.label,
        quantity_value: valueInput?.value ? Number(valueInput.value) : null,
        quantity_unit: unitInput?.value || preset.quantity_unit,
        category: preset.category,
      });
    }
  });

  listEls.shoppingItemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addShoppingItem({
      label: listEls.shoppingItemLabel.value.trim(),
      quantity_value: listEls.shoppingItemQuantityValue.value ? Number(listEls.shoppingItemQuantityValue.value) : null,
      quantity_unit: listEls.shoppingItemQuantityUnit.value,
    });
    listEls.shoppingItemForm.reset();
    listEls.shoppingItemQuantityUnit.value = "piece";
  });

  listEls.checklistItemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addChecklistItem(listEls.checklistItemLabel.value.trim());
    listEls.checklistItemForm.reset();
  });

  listEls.shoppingFilter.addEventListener("change", renderShoppingItems);
  listEls.checklistFilter.addEventListener("change", renderChecklistItems);

  listEls.shoppingItemsContainer.addEventListener("click", async (event) => {
    const toggleBtn = event.target.closest("[data-shopping-toggle]");
    if (toggleBtn) {
      const id = toggleBtn.dataset.shoppingToggle;
      const item = listState.shoppingItems.find((i) => i.id === id);
      if (item) await toggleShoppingItem(id, item.is_checked);
      return;
    }

    const deleteBtn = event.target.closest("[data-shopping-delete]");
    if (deleteBtn) {
      await deleteShoppingItem(deleteBtn.dataset.shoppingDelete);
      return;
    }

    const editBtn = event.target.closest("[data-shopping-edit]");
    if (editBtn) {
      const id = editBtn.dataset.shoppingEdit;
      const item = listState.shoppingItems.find((i) => i.id === id);
      if (!item) return;

      const newLabel = window.prompt("Article", item.label);
      if (newLabel === null) return;

      const newValue = window.prompt("Quantité", item.quantity_value ?? "");
      const newUnit = window.prompt("Unité (piece/kg/g/l/ml)", item.quantity_unit ?? "piece");

      await listsDb
        .from("shopping_items")
        .update({
          label: newLabel.trim(),
          quantity_value: newValue ? Number(newValue) : null,
          quantity_unit: newUnit || "piece",
        })
        .eq("id", id);

      await loadShoppingItems();
    }
  });

  listEls.checklistItemsContainer.addEventListener("click", async (event) => {
    const toggleBtn = event.target.closest("[data-checklist-toggle]");
    if (toggleBtn) {
      const id = toggleBtn.dataset.checklistToggle;
      const item = listState.checklistItems.find((i) => i.id === id);
      if (item) await toggleChecklistItem(id, item.is_checked);
      return;
    }

    const deleteBtn = event.target.closest("[data-checklist-delete]");
    if (deleteBtn) {
      await deleteChecklistItem(deleteBtn.dataset.checklistDelete);
      return;
    }

    const editBtn = event.target.closest("[data-checklist-edit]");
    if (editBtn) {
      const id = editBtn.dataset.checklistEdit;
      const item = listState.checklistItems.find((i) => i.id === id);
      if (!item) return;

      const newLabel = window.prompt("Élément", item.label);
      if (newLabel === null) return;

      await listsDb
        .from("checklist_items")
        .update({ label: newLabel.trim() })
        .eq("id", id);

      await loadChecklistItems();
    }
  });

  enableSimpleDrag(listEls.shoppingItemsContainer, persistShoppingOrder, "[data-shopping-item-id]");
  enableSimpleDrag(listEls.checklistItemsContainer, persistChecklistOrder, "[data-checklist-item-id]");
}

async function initListsModule() {
  initListModeEvents();
  switchMode("menage");
  await loadShoppingPresets();
  await loadShoppingLists();
  await loadChecklists();
}

initListsModule();
