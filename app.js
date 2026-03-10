/* global supabase, SUPABASE_URL, SUPABASE_ANON_KEY */

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  tasks: [],
  currentPerson: "all",
  currentView: "day",
  selectedDate: "",
  pendingCompleteTaskId: null,
  deviceId: "",
  hideTaskPanelByDefault: false,
};

const els = {
  taskFormPanel: document.getElementById("taskFormPanel"),
  taskForm: document.getElementById("taskForm"),
  title: document.getElementById("title"),
  assignee: document.getElementById("assignee"),
  dueDate: document.getElementById("dueDate"),
  repeatDays: document.getElementById("repeatDays"),
  notes: document.getElementById("notes"),
  isUniqueTask: document.getElementById("isUniqueTask"),
  alternateAssignee: document.getElementById("alternateAssignee"),

  refreshBtn: document.getElementById("refreshBtn"),
  goTodayBtn: document.getElementById("goTodayBtn"),
  showTaskPanelBtn: document.getElementById("showTaskPanelBtn"),
  hideTaskPanelBtn: document.getElementById("hideTaskPanelBtn"),
  hideTaskPanelDefaultBtn: document.getElementById("hideTaskPanelDefaultBtn"),
  showTaskPanelDefaultBtn: document.getElementById("showTaskPanelDefaultBtn"),

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
  summaryMathieuText: document.getElementById("summaryMathieuText"),
  summarySarahText: document.getElementById("summarySarahText"),
  summaryAllText: document.getElementById("summaryAllText"),
  summaryMathieuOverdue: document.getElementById("summaryMathieuOverdue"),
  summarySarahOverdue: document.getElementById("summarySarahOverdue"),
  summaryAllOverdue: document.getElementById("summaryAllOverdue"),

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
  editIsUniqueTask: document.getElementById("editIsUniqueTask"),
  editAlternateAssignee: document.getElementById("editAlternateAssignee"),
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

function getOtherAssignee(currentAssignee) {
  return currentAssignee === "Sarah" ? "Mathieu" : "Sarah";
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
    const active = btn.dataset.assignee === value;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function getDeviceId() {
  let deviceId = localStorage.getItem("cleaning_app_device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("cleaning_app_device_id", deviceId);
  }

  return deviceId;
}

function showTaskPanel() {
  els.taskFormPanel.classList.remove("hidden-panel");
}

function hideTaskPanel() {
  els.taskFormPanel.classList.add("hidden-panel");
}

async function loadDeviceSettings() {
  state.deviceId = getDeviceId();

  const { data, error } = await db
    .from("device_settings")
    .select("*")
    .eq("device_id", state.deviceId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  state.hideTaskPanelByDefault = Boolean(data?.hide_new_task);

  if (state.hideTaskPanelByDefault) {
    hideTaskPanel();
  } else {
    showTaskPanel();
  }
}

async function saveDeviceSetting(hideByDefault) {
  const { error } = await db
    .from("device_settings")
    .upsert(
      {
        device_id: state.deviceId,
        hide_new_task: hideByDefault,
      },
      { onConflict: "device_id" }
    );

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la sauvegarde appareil : ${error.message}`, "error");
    return false;
  }

  state.hideTaskPanelByDefault = hideByDefault;
  setMessage(
    hideByDefault ? "Section nouvelle tâche cachée par défaut." : "Section nouvelle tâche affichée par défaut.",
    "success"
  );
  return true;
}

function updateCreateRepeatState() {
  const unique = els.isUniqueTask.checked;

  if (unique) {
    els.repeatDays.value = "0";
    els.repeatDays.disabled = true;
    els.alternateAssignee.checked = false;
    els.alternateAssignee.disabled = true;
    els.repeatQuickButtons.forEach((btn) => {
      btn.classList.remove("active");
      btn.disabled = true;
    });
  } else {
    els.repeatDays.disabled = false;
    els.repeatQuickButtons.forEach((btn) => {
      btn.disabled = false;
    });

    const repeatValue = Number(els.repeatDays.value || 0);
    els.alternateAssignee.disabled = repeatValue <= 0;
    if (repeatValue <= 0) {
      els.alternateAssignee.checked = false;
    }
  }
}

function updateEditRepeatState() {
  const unique = els.editIsUniqueTask.checked;

  if (unique) {
    els.editRepeatDays.value = "0";
    els.editRepeatDays.disabled = true;
    els.editAlternateAssignee.checked = false;
    els.editAlternateAssignee.disabled = true;
    els.editRepeatQuickButtons.forEach((btn) => {
      btn.classList.remove("active");
      btn.disabled = true;
    });
  } else {
    els.editRepeatDays.disabled = false;
    els.editRepeatQuickButtons.forEach((btn) => {
      btn.disabled = false;
    });

    const repeatValue = Number(els.editRepeatDays.value || 0);
    els.editAlternateAssignee.disabled = repeatValue <= 0;
    if (repeatValue <= 0) {
      els.editAlternateAssignee.checked = false;
    }
  }
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

  const pendingTasks = state.tasks.filter((task) => task.status === "pending");

  const next5 = pendingTasks.filter(
    (task) => task.due_date >= today && task.due_date <= fiveDaysLater
  );

  const overdue = pendingTasks.filter((task) => task.due_date < today);

  const mathieuNext5 = next5.filter((t) => t.assignee === "Mathieu").length;
  const sarahNext5 = next5.filter((t) => t.assignee === "Sarah").length;
  const allNext5 = next5.length;

  const mathieuOverdue = overdue.filter((t) => t.assignee === "Mathieu").length;
  const sarahOverdue = overdue.filter((t) => t.assignee === "Sarah").length;
  const allOverdue = overdue.length;

  els.summaryMathieu.textContent = String(mathieuNext5 + mathieuOverdue);
  els.summarySarah.textContent = String(sarahNext5 + sarahOverdue);
  els.summaryAll.textContent = String(allNext5 + allOverdue);

  els.summaryMathieuText.textContent = `${mathieuNext5} dans les 5 prochains jours`;
  els.summarySarahText.textContent = `${sarahNext5} dans les 5 prochains jours`;
  els.summaryAllText.textContent = `${allNext5} dans les 5 prochains jours`;

  els.summaryMathieuOverdue.textContent = `${mathieuOverdue} en retard`;
  els.summarySarahOverdue.textContent = `${sarahOverdue} en retard`;
  els.summaryAllOverdue.textContent = `${allOverdue} en retard`;
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
      : "Tâche unique";

  const alternateText =
    Number(task.repeat_days) > 0 && task.alternate_assignee
      ? `<span class="task-badge">Alterne</span>`
      : "";

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
            ${alternateText}
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

  const uniqueTask = els.isUniqueTask.checked;
  const repeatDays = uniqueTask ? 0 : Number(els.repeatDays.value || 0);

  const payload = {
    title: els.title.value.trim(),
    assignee: els.assignee.value,
    due_date: els.dueDate.value,
    repeat_days: repeatDays,
    status: "pending",
    notes: els.notes.value.trim() || null,
    alternate_assignee: !uniqueTask && repeatDays > 0 ? els.alternateAssignee.checked : false,
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
  els.isUniqueTask.checked = false;
  els.alternateAssignee.checked = false;
  syncRepeatMiniButtons(els.repeatQuickButtons, "0");
  updateCreateRepeatState();

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
  els.editIsUniqueTask.checked = Number(task.repeat_days || 0) === 0;
  els.editAlternateAssignee.checked = Boolean(task.alternate_assignee);

  syncRepeatMiniButtons(els.editRepeatQuickButtons, els.editRepeatDays.value);
  updateEditRepeatState();
  els.editModal.classList.remove("hidden");
}

function closeEditModal() {
  els.editModal.classList.add("hidden");
}

async function saveEdit(event) {
  event.preventDefault();

  const id = els.editId.value;
  const uniqueTask = els.editIsUniqueTask.checked;
  const repeatDays = uniqueTask ? 0 : Number(els.editRepeatDays.value || 0);

  const payload = {
    title: els.editTitle.value.trim(),
    assignee: els.editAssignee.value,
    due_date: els.editDueDate.value,
    repeat_days: repeatDays,
    notes: els.editNotes.value.trim() || null,
    alternate_assignee: !uniqueTask && repeatDays > 0 ? els.editAlternateAssignee.checked : false,
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

async function applyCompletion(task, nextDate = null, nextAssignee = null) {
  const completedDate = todayString();

  let payload;
  if (nextDate) {
    payload = {
      last_completed_at: completedDate,
      due_date: nextDate,
      status: "pending",
      assignee: nextAssignee || task.assignee,
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
    await applyCompletion(task, null, null);
    return;
  }

  if (task.due_date === todayString()) {
    const nextDate = addDays(task.due_date, repeatDays);
    const nextAssignee = task.alternate_assignee ? getOtherAssignee(task.assignee) : task.assignee;
    await applyCompletion(task, nextDate, nextAssignee);
    return;
  }

  openCompleteModal(task);
}

async function handleCompleteFromBase(baseType) {
  const task = state.tasks.find((t) => t.id === state.pendingCompleteTaskId);
  if (!task) return;

  const baseDate = baseType === "today" ? todayString() : task.due_date;
  const nextDate = addDays(baseDate, Number(task.repeat_days || 0));
  const nextAssignee = task.alternate_assignee ? getOtherAssignee(task.assignee) : task.assignee;

  closeCompleteModal();
  await applyCompletion(task, nextDate, nextAssignee);
}

async function handleCompleteManual() {
  const task = state.tasks.find((t) => t.id === state.pendingCompleteTaskId);
  if (!task) return;

  const nextDate = els.manualNextDate.value;
  if (!nextDate) {
    setMessage("Choisis une date manuelle.", "error");
    return;
  }

  const nextAssignee = task.alternate_assignee ? getOtherAssignee(task.assignee) : task.assignee;

  closeCompleteModal();
  await applyCompletion(task, nextDate, nextAssignee);
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
  db.channel("tasks-realtime-v42v")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks()
    )
    .subscribe();

  db.channel("device-settings-realtime-v42v")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "device_settings" },
      async () => {
        await loadDeviceSettings();
      }
    )
    .subscribe();
}

function initRepeatButtons(buttons, input, callbackAfter = null) {
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.repeat;
      syncRepeatMiniButtons(buttons, input.value);
      if (callbackAfter) callbackAfter();
    });
  });

  input.addEventListener("input", () => {
    syncRepeatMiniButtons(buttons, input.value);
    if (callbackAfter) callbackAfter();
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

  els.showTaskPanelBtn.addEventListener("click", showTaskPanel);
  els.hideTaskPanelBtn.addEventListener("click", hideTaskPanel);

  els.hideTaskPanelDefaultBtn.addEventListener("click", async () => {
    const ok = await saveDeviceSetting(true);
    if (ok) hideTaskPanel();
  });

  els.showTaskPanelDefaultBtn.addEventListener("click", async () => {
    const ok = await saveDeviceSetting(false);
    if (ok) showTaskPanel();
  });

  els.isUniqueTask.addEventListener("change", updateCreateRepeatState);
  els.alternateAssignee.addEventListener("change", () => {
    if (els.alternateAssignee.disabled) {
      els.alternateAssignee.checked = false;
    }
  });

  els.editIsUniqueTask.addEventListener("change", updateEditRepeatState);
  els.editAlternateAssignee.addEventListener("change", () => {
    if (els.editAlternateAssignee.disabled) {
      els.editAlternateAssignee.checked = false;
    }
  });

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

  initRepeatButtons(els.repeatQuickButtons, els.repeatDays, updateCreateRepeatState);
  initRepeatButtons(els.editRepeatQuickButtons, els.editRepeatDays, updateEditRepeatState);

  initAssigneeButtons(els.assigneeBtns, els.assignee);
  initAssigneeButtons(els.editAssigneeBtns, els.editAssignee);
}

function initDefaults() {
  state.selectedDate = todayString();
  state.deviceId = getDeviceId();

  els.selectedDate.value = state.selectedDate;
  els.dueDate.value = state.selectedDate;
  els.statusFilter.value = "pending";

  syncAssigneeButtons(els.assigneeBtns, els.assignee, "Mathieu");
  syncAssigneeButtons(els.editAssigneeBtns, els.editAssignee, "Mathieu");

  syncRepeatMiniButtons(els.repeatQuickButtons, els.repeatDays.value);
  syncRepeatMiniButtons(els.editRepeatQuickButtons, els.editRepeatDays.value);

  els.isUniqueTask.checked = false;
  els.alternateAssignee.checked = false;
  els.editIsUniqueTask.checked = false;
  els.editAlternateAssignee.checked = false;

  updateCreateRepeatState();
  updateEditRepeatState();
  applyActiveStates();
}

async function init() {
  initDefaults();
  initEvents();
  initRealtime();
  await loadDeviceSettings();
  await fetchTasks();
}

init();
