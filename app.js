/* global supabase, SUPABASE_URL, SUPABASE_ANON_KEY */

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  tasks: [],
  currentPerson: "all",
  currentView: "day",
  selectedDate: "",
  pendingCompleteTaskId: null,
};

const els = {
  taskForm: document.getElementById("taskForm"),
  title: document.getElementById("title"),
  assignee: document.getElementById("assignee"),
  dueDate: document.getElementById("dueDate"),
  repeatDays: document.getElementById("repeatDays"),
  notes: document.getElementById("notes"),
  refreshBtn: document.getElementById("refreshBtn"),
  goTodayBtn: document.getElementById("goTodayBtn"),

  personTabs: [...document.querySelectorAll(".person-tab")],
  viewBtns: [...document.querySelectorAll(".view-btn")],
  summaryCards: [...document.querySelectorAll("[data-summary-person]")],

  selectedDate: document.getElementById("selectedDate"),
  statusFilter: document.getElementById("statusFilter"),
  agendaTitle: document.getElementById("agendaTitle"),
  agendaSubtitle: document.getElementById("agendaSubtitle"),
  countBadge: document.getElementById("countBadge"),
  statusMessage: document.getElementById("statusMessage"),
  agendaContainer: document.getElementById("agendaContainer"),

  summaryMathieu: document.getElementById("summaryMathieu"),
  summarySarah: document.getElementById("summarySarah"),
  summaryAll: document.getElementById("summaryAll"),

  repeatQuickButtons: [...document.querySelectorAll("#repeatQuickButtons .repeat-mini-btn")],

  assigneeBtns: [...document.querySelectorAll("#assigneeToggle .assignee-btn")],

  editModal: document.getElementById("editModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  editForm: document.getElementById("editForm"),
  editId: document.getElementById("editId"),
  editTitle: document.getElementById("editTitle"),
  editAssignee: document.getElementById("editAssignee"),
  editDueDate: document.getElementById("editDueDate"),
  editRepeatDays: document.getElementById("editRepeatDays"),
  editNotes: document.getElementById("editNotes"),
  inactiveFromModalBtn: document.getElementById("inactiveFromModalBtn"),
  editRepeatQuickButtons: [...document.querySelectorAll("#editRepeatQuickButtons .repeat-mini-btn")],
  editAssigneeBtns: [...document.querySelectorAll("#editAssigneeToggle .assignee-btn")],

  completeModal: document.getElementById("completeModal"),
  closeCompleteModalBtn: document.getElementById("closeCompleteModalBtn"),
  completeModalText: document.getElementById("completeModalText"),
  completeFromDueBtn: document.getElementById("completeFromDueBtn"),
  completeFromTodayBtn: document.getElementById("completeFromTodayBtn"),
  manualNextDate: document.getElementById("manualNextDate"),
  completeManualBtn: document.getElementById("completeManualBtn"),
};

function todayString() {
  const now = new Date();
  return formatDateInput(now);
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Number(days));
  return formatDateInput(date);
}

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("fr-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function formatDateShort(dateString) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function startOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDateInput(date);
}

function endOfWeek(dateString) {
  return addDays(startOfWeek(dateString), 6);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isOverdue(task) {
  return task.status === "pending" && task.due_date < todayString();
}

function setMessage(message = "", type = "") {
  els.statusMessage.textContent = message;
  els.statusMessage.className = "status-message";
  if (type) els.statusMessage.classList.add(type);
}

function getPersonClass(assignee) {
  return assignee === "Sarah" ? "sarah" : "mathieu";
}

function applyActiveStates() {
  els.personTabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.person === state.currentPerson);
  });

  els.viewBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
  });
}

function syncRepeatMiniButtons(buttons, value) {
  const strValue = String(value);
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.repeat === strValue);
  });
}

function syncAssigneeButtons(buttons, hiddenInput, value) {
  hiddenInput.value = value;
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.assignee === value);
    btn.setAttribute("aria-pressed", btn.dataset.assignee === value ? "true" : "false");
  });
}

function updateAgendaHeader(filteredCount) {
  const personLabel =
    state.currentPerson === "all" ? "Tout le monde" : state.currentPerson;

  if (state.currentView === "day") {
    els.agendaTitle.textContent = `Jour · ${personLabel}`;
    els.agendaSubtitle.textContent = formatDateLabel(state.selectedDate);
  } else if (state.currentView === "week") {
    els.agendaTitle.textContent = `Semaine · ${personLabel}`;
    els.agendaSubtitle.textContent =
      `${formatDateShort(startOfWeek(state.selectedDate))} → ${formatDateShort(endOfWeek(state.selectedDate))}`;
  } else {
    const nextWeekStart = addDays(startOfWeek(state.selectedDate), 7);
    const nextWeekEnd = addDays(nextWeekStart, 6);
    els.agendaTitle.textContent = `Semaine prochaine · ${personLabel}`;
    els.agendaSubtitle.textContent =
      `${formatDateShort(nextWeekStart)} → ${formatDateShort(nextWeekEnd)}`;
  }

  els.countBadge.textContent = String(filteredCount);
}

function getRangeDates() {
  if (state.currentView === "day") {
    return [state.selectedDate];
  }

  let start = startOfWeek(state.selectedDate);

  if (state.currentView === "nextWeek") {
    start = addDays(start, 7);
  }

  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function getFilteredTasks() {
  const statusFilter = els.statusFilter.value;
  const rangeDates = getRangeDates();
  const dateSet = new Set(rangeDates);

  return state.tasks
    .filter((task) => {
      if (statusFilter === "inactive") {
        if (task.status !== "inactive") return false;
      } else {
        if (!dateSet.has(task.due_date)) return false;

        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }

        if (statusFilter === "all" && task.status === "inactive") {
          return false;
        }
      }

      if (state.currentPerson !== "all" && task.assignee !== state.currentPerson) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.status !== b.status) {
        const order = { pending: 0, done: 1, inactive: 2 };
        return order[a.status] - order[b.status];
      }
      return (a.title || "").localeCompare(b.title || "", "fr");
    });
}

function updateSummaryCards() {
  const today = todayString();
  const fiveDaysLater = addDays(today, 4);

  const base = state.tasks.filter(
    (task) =>
      task.status === "pending" &&
      task.due_date >= today &&
      task.due_date <= fiveDaysLater
  );

  const mathieu = base.filter((t) => t.assignee === "Mathieu").length;
  const sarah = base.filter((t) => t.assignee === "Sarah").length;

  els.summaryMathieu.textContent = String(mathieu);
  els.summarySarah.textContent = String(sarah);
  els.summaryAll.textContent = String(base.length);
}

function renderAgenda() {
  const filtered = getFilteredTasks();
  updateAgendaHeader(filtered.length);

  if (!filtered.length) {
    els.agendaContainer.innerHTML = `<div class="empty-state">Aucune tâche sur cette période.</div>`;
    return;
  }

  if (els.statusFilter.value === "inactive") {
    els.agendaContainer.innerHTML = `
      <div class="day-group">
        <div class="day-header">
          <p class="day-header-title">Tâches inactives</p>
          <p class="day-header-subtitle">${filtered.length} tâche(s)</p>
        </div>

        ${filtered.map(renderTaskCard).join("")}
      </div>
    `;
    return;
  }

  const overdueTasks = filtered.filter((task) => isOverdue(task));
  const regularTasks = filtered.filter((task) => !isOverdue(task));
  const rangeDates = getRangeDates();

  let html = "";

  if (overdueTasks.length) {
    html += `
      <div class="day-group">
        <div class="day-header overdue-header">
          <p class="day-header-title">En retard</p>
          <p class="day-header-subtitle">${overdueTasks.length} tâche(s)</p>
        </div>
        ${overdueTasks.map(renderTaskCard).join("")}
      </div>
    `;
  }

  html += rangeDates
    .map((date) => {
      const dayTasks = regularTasks.filter((task) => task.due_date === date);
      if (!dayTasks.length) return "";

      return `
        <div class="day-group">
          <div class="day-header">
            <p class="day-header-title">${escapeHtml(formatDateLabel(date))}</p>
            <p class="day-header-subtitle">${dayTasks.length} tâche(s)</p>
          </div>

          ${dayTasks.map(renderTaskCard).join("")}
        </div>
      `;
    })
    .join("");

  els.agendaContainer.innerHTML = html || `<div class="empty-state">Aucune tâche sur cette période.</div>`;
}

function renderTaskCard(task) {
  const personClass = getPersonClass(task.assignee);
  const doneClass = task.status === "done" ? "done" : "";
  const inactiveClass = task.status === "inactive" ? "inactive" : "";
  const overdueClass = isOverdue(task) ? "overdue" : "";
  const repeatText =
    Number(task.repeat_days) > 0
      ? `Tous les ${task.repeat_days} jour(s)`
      : "Sans répétition";

  return `
    <article class="task-card ${personClass} ${doneClass} ${inactiveClass} ${overdueClass}">
      <div class="task-top">
        ${
          task.status !== "inactive"
            ? `<button class="check-action" data-action="done" data-id="${task.id}" aria-label="Marquer comme fait"></button>`
            : ``
        }

        <div class="task-main">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>

          <div class="task-badges">
            <span class="task-badge">${escapeHtml(task.assignee)}</span>
            <span class="task-badge">${escapeHtml(repeatText)}</span>
            <span class="task-badge">${
              task.status === "pending"
                ? "À faire"
                : task.status === "done"
                ? "Terminée"
                : "Inactive"
            }</span>
          </div>

          <div class="task-meta">
            Prochaine occurrence : ${escapeHtml(formatDateShort(task.due_date))}<br>
            Dernière validation : ${task.last_completed_at ? escapeHtml(formatDateShort(task.last_completed_at)) : "Jamais"}
            ${task.notes ? `<br>Note : ${escapeHtml(task.notes)}` : ""}
          </div>

          <div class="task-actions">
            <button class="edit-btn" data-action="edit" data-id="${task.id}">Modifier</button>
            ${
              task.status === "inactive"
                ? `<button class="reactivate-btn" data-action="reactivate" data-id="${task.id}">Réactiver</button>`
                : `<button class="delete-btn" data-action="inactive" data-id="${task.id}">Inactiver</button>`
            }
          </div>
        </div>
      </div>
    </article>
  `;
}

async function fetchTasks() {
  setMessage("Chargement...");
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    setMessage(`Erreur de chargement : ${error.message}`, "error");
    return;
  }

  state.tasks = data || [];
  updateSummaryCards();
  renderAgenda();
  setMessage("Synchronisé.", "success");
}

async function addTask(event) {
  event.preventDefault();

  const payload = {
    title: els.title.value.trim(),
    assignee: els.assignee.value,
    due_date: els.dueDate.value,
    repeat_days: Number(els.repeatDays.value || 0),
    status: "pending",
    notes: els.notes.value.trim() || null,
  };

  if (!payload.title || !payload.due_date) {
    setMessage("Titre et date obligatoires.", "error");
    return;
  }

  setMessage("Ajout en cours...");

  const { error } = await db.from("tasks").insert(payload);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de l'ajout : ${error.message}`, "error");
    return;
  }

  els.taskForm.reset();
  syncAssigneeButtons(els.assigneeBtns, els.assignee, "Mathieu");
  els.dueDate.value = state.selectedDate;
  els.repeatDays.value = "0";
  syncRepeatMiniButtons(els.repeatQuickButtons, "0");
  setMessage("Tâche ajoutée.", "success");
}

function openEditModal(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  els.editId.value = task.id;
  els.editTitle.value = task.title || "";
  syncAssigneeButtons(els.editAssigneeBtns, els.editAssignee, task.assignee || "Mathieu");
  els.editDueDate.value = task.due_date;
  els.editRepeatDays.value = String(task.repeat_days ?? 0);
  els.editNotes.value = task.notes || "";

  syncRepeatMiniButtons(els.editRepeatQuickButtons, els.editRepeatDays.value);
  els.editModal.classList.remove("hidden");
}

function closeEditModal() {
  els.editModal.classList.add("hidden");
}

async function saveEdit(event) {
  event.preventDefault();

  const id = els.editId.value;
  const payload = {
    title: els.editTitle.value.trim(),
    assignee: els.editAssignee.value,
    due_date: els.editDueDate.value,
    repeat_days: Number(els.editRepeatDays.value || 0),
    notes: els.editNotes.value.trim() || null,
  };

  if (!payload.title || !payload.due_date) {
    setMessage("Titre et date obligatoires.", "error");
    return;
  }

  setMessage("Enregistrement en cours...");

  const { error } = await db.from("tasks").update(payload).eq("id", id);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de l'enregistrement : ${error.message}`, "error");
    return;
  }

  closeEditModal();
  setMessage("Tâche modifiée.", "success");
}

async function setTaskInactive(id) {
  const ok = window.confirm("Inactiver cette tâche ?");
  if (!ok) return;

  setMessage("Mise à jour en cours...");

  const { error } = await db
    .from("tasks")
    .update({ status: "inactive" })
    .eq("id", id);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors du passage en inactif : ${error.message}`, "error");
    return;
  }

  closeEditModal();
  setMessage("Tâche inactivée.", "success");
}

async function reactivateTask(id) {
  setMessage("Réactivation en cours...");

  const { error } = await db
    .from("tasks")
    .update({ status: "pending" })
    .eq("id", id);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la réactivation : ${error.message}`, "error");
    return;
  }

  setMessage("Tâche réactivée.", "success");
}

function openCompleteModal(task) {
  state.pendingCompleteTaskId = task.id;

  els.completeModalText.textContent =
    `Cette tâche était prévue pour le ${formatDateShort(task.due_date)} et possède une répétition de ${task.repeat_days} jour(s). Choisis comment calculer la prochaine occurrence.`;

  els.manualNextDate.value = addDays(task.due_date, task.repeat_days);
  els.completeModal.classList.remove("hidden");
}

function closeCompleteModal() {
  state.pendingCompleteTaskId = null;
  els.completeModal.classList.add("hidden");
}

async function applyCompletion(task, nextDate = null) {
  const completedDate = todayString();

  let payload;
  if (nextDate) {
    payload = {
      last_completed_at: completedDate,
      due_date: nextDate,
      status: "pending",
    };
  } else {
    payload = {
      last_completed_at: completedDate,
      status: "done",
    };
  }

  setMessage("Mise à jour en cours...");

  const { error } = await db.from("tasks").update(payload).eq("id", task.id);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la validation : ${error.message}`, "error");
    return;
  }

  if (nextDate && state.currentView === "day") {
    state.selectedDate = nextDate;
    els.selectedDate.value = nextDate;
  }

  await fetchTasks();

  setMessage(
    nextDate
      ? `Tâche validée. Prochaine occurrence : ${formatDateShort(nextDate)}`
      : "Tâche terminée.",
    "success"
  );
}

async function completeTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  if (task.status === "inactive") return;

  const repeatDays = Number(task.repeat_days || 0);

  if (repeatDays <= 0) {
    await applyCompletion(task, null);
    return;
  }

  if (task.due_date === todayString()) {
    await applyCompletion(task, addDays(task.due_date, repeatDays));
    return;
  }

  openCompleteModal(task);
}

async function handleCompleteFromBase(baseType) {
  const task = state.tasks.find((t) => t.id === state.pendingCompleteTaskId);
  if (!task) return;

  const baseDate = baseType === "today" ? todayString() : task.due_date;
  const nextDate = addDays(baseDate, Number(task.repeat_days || 0));

  closeCompleteModal();
  await applyCompletion(task, nextDate);
}

async function handleCompleteManual() {
  const task = state.tasks.find((t) => t.id === state.pendingCompleteTaskId);
  if (!task) return;

  const nextDate = els.manualNextDate.value;
  if (!nextDate) {
    setMessage("Choisis une date manuelle.", "error");
    return;
  }

  closeCompleteModal();
  await applyCompletion(task, nextDate);
}

function handleAgendaClick(event) {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === "done") completeTask(id);
  if (action === "edit") openEditModal(id);
  if (action === "inactive") setTaskInactive(id);
  if (action === "reactivate") reactivateTask(id);
}

function initRealtime() {
  db.channel("tasks-realtime-v41")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks()
    )
    .subscribe();
}

function initRepeatButtons(buttons, input) {
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.repeat;
      syncRepeatMiniButtons(buttons, input.value);
    });
  });

  input.addEventListener("input", () => {
    syncRepeatMiniButtons(buttons, input.value);
  });
}

function initAssigneeButtons(buttons, input) {
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      syncAssigneeButtons(buttons, input, btn.dataset.assignee);
    });
  });
}

function jumpToToday() {
  state.selectedDate = todayString();
  state.currentView = "day";
  els.selectedDate.value = state.selectedDate;
  applyActiveStates();
  renderAgenda();
}

function applySummaryPreset(person) {
  state.currentPerson = person;
  state.currentView = "week";
  state.selectedDate = todayString();

  els.selectedDate.value = state.selectedDate;
  els.statusFilter.value = "pending";

  applyActiveStates();
  renderAgenda();
}

function initEvents() {
  els.taskForm.addEventListener("submit", addTask);
  els.refreshBtn.addEventListener("click", fetchTasks);
  els.goTodayBtn.addEventListener("click", jumpToToday);

  els.statusFilter.addEventListener("change", renderAgenda);
  els.selectedDate.addEventListener("change", () => {
    state.selectedDate = els.selectedDate.value;
    renderAgenda();
  });

  els.agendaContainer.addEventListener("click", handleAgendaClick);

  els.personTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentPerson = btn.dataset.person;
      applyActiveStates();
      renderAgenda();
    });
  });

  els.viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentView = btn.dataset.view;
      applyActiveStates();
      renderAgenda();
    });
  });

  els.summaryCards.forEach((card) => {
    card.addEventListener("click", () => {
      applySummaryPreset(card.dataset.summaryPerson);
    });
  });

  els.editForm.addEventListener("submit", saveEdit);
  els.closeModalBtn.addEventListener("click", closeEditModal);
  els.inactiveFromModalBtn.addEventListener("click", () => setTaskInactive(els.editId.value));

  els.editModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal === "true") {
      closeEditModal();
    }
  });

  els.closeCompleteModalBtn.addEventListener("click", closeCompleteModal);
  els.completeFromDueBtn.addEventListener("click", () => handleCompleteFromBase("due"));
  els.completeFromTodayBtn.addEventListener("click", () => handleCompleteFromBase("today"));
  els.completeManualBtn.addEventListener("click", handleCompleteManual);

  initRepeatButtons(els.repeatQuickButtons, els.repeatDays);
  initRepeatButtons(els.editRepeatQuickButtons, els.editRepeatDays);

  initAssigneeButtons(els.assigneeBtns, els.assignee);
  initAssigneeButtons(els.editAssigneeBtns, els.editAssignee);
}

function initDefaults() {
  state.selectedDate = todayString();
  els.selectedDate.value = state.selectedDate;
  els.dueDate.value = state.selectedDate;
  els.statusFilter.value = "pending";

  syncAssigneeButtons(els.assigneeBtns, els.assignee, "Mathieu");
  syncAssigneeButtons(els.editAssigneeBtns, els.editAssignee, "Mathieu");

  syncRepeatMiniButtons(els.repeatQuickButtons, els.repeatDays.value);
  applyActiveStates();
}

async function init() {
  initDefaults();
  initEvents();
  initRealtime();
  await fetchTasks();
}

init();
