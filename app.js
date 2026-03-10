/* global supabase, SUPABASE_URL, SUPABASE_ANON_KEY */

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  tasks: [],
  currentPerson: "Mathieu",
  currentView: "day",
  selectedDate: "",
};

const els = {
  taskForm: document.getElementById("taskForm"),
  title: document.getElementById("title"),
  assignee: document.getElementById("assignee"),
  dueDate: document.getElementById("dueDate"),
  repeatDays: document.getElementById("repeatDays"),
  notes: document.getElementById("notes"),
  refreshBtn: document.getElementById("refreshBtn"),
  personTabs: [...document.querySelectorAll(".person-tab")],
  viewBtns: [...document.querySelectorAll(".view-btn")],
  selectedDate: document.getElementById("selectedDate"),
  statusFilter: document.getElementById("statusFilter"),
  agendaTitle: document.getElementById("agendaTitle"),
  agendaSubtitle: document.getElementById("agendaSubtitle"),
  countBadge: document.getElementById("countBadge"),
  statusMessage: document.getElementById("statusMessage"),
  agendaContainer: document.getElementById("agendaContainer"),

  editModal: document.getElementById("editModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  editForm: document.getElementById("editForm"),
  editId: document.getElementById("editId"),
  editTitle: document.getElementById("editTitle"),
  editAssignee: document.getElementById("editAssignee"),
  editDueDate: document.getElementById("editDueDate"),
  editRepeatDays: document.getElementById("editRepeatDays"),
  editNotes: document.getElementById("editNotes"),
  deleteFromModalBtn: document.getElementById("deleteFromModalBtn"),
};

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Number(days));
  return formatDateInput(date);
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  if (assignee === "Sarah") return "sarah";
  return "mathieu";
}

function applyActiveStates() {
  els.personTabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.person === state.currentPerson);
  });

  els.viewBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
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
      if (!dateSet.has(task.due_date)) return false;

      if (state.currentPerson !== "all" && task.assignee !== state.currentPerson) {
        return false;
      }

      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return (a.title || "").localeCompare(b.title || "", "fr");
    });
}

function renderAgenda() {
  const filtered = getFilteredTasks();
  updateAgendaHeader(filtered.length);

  const rangeDates = getRangeDates();

  if (!filtered.length) {
    els.agendaContainer.innerHTML = `<div class="empty-state">Aucune tâche sur cette période.</div>`;
    return;
  }

  const html = rangeDates
    .map((date) => {
      const dayTasks = filtered.filter((task) => task.due_date === date);

      if (!dayTasks.length) return "";

      return `
        <div class="day-group">
          <div class="day-header">
            <p class="day-header-title">${escapeHtml(formatDateLabel(date))}</p>
            <p class="day-header-subtitle">${escapeHtml(String(dayTasks.length))} tâche(s)</p>
          </div>

          ${dayTasks
            .map((task) => {
              const personClass = getPersonClass(task.assignee);
              const doneClass = task.status === "done" ? "done" : "";
              const overdueClass = isOverdue(task) ? "overdue" : "";

              const repeatText =
                Number(task.repeat_days) > 0
                  ? `Tous les ${task.repeat_days} jour(s)`
                  : "Sans répétition";

              return `
                <article class="task-card ${personClass} ${doneClass} ${overdueClass}">
                  <div class="task-top">
                    <button class="check-action" data-action="done" data-id="${task.id}" aria-label="Marquer comme fait"></button>

                    <div class="task-main">
                      <div class="task-title-row">
                        <h3 class="task-title">${escapeHtml(task.title)}</h3>
                      </div>

                      <div class="task-badges">
                        <span class="task-badge">${escapeHtml(task.assignee)}</span>
                        <span class="task-badge">${escapeHtml(repeatText)}</span>
                        <span class="task-badge">${task.status === "pending" ? "À faire" : "Terminée"}</span>
                      </div>

                      <div class="task-meta">
                        Prochaine occurrence : ${escapeHtml(formatDateShort(task.due_date))}<br>
                        Dernière validation : ${task.last_completed_at ? escapeHtml(formatDateShort(task.last_completed_at)) : "Jamais"}
                        ${task.notes ? `<br>Note : ${escapeHtml(task.notes)}` : ""}
                      </div>

                      <div class="task-actions">
                        <button class="edit-btn" data-action="edit" data-id="${task.id}">Modifier</button>
                        <button class="delete-btn" data-action="delete" data-id="${task.id}">Supprimer</button>
                      </div>
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    })
    .join("");

  els.agendaContainer.innerHTML = html || `<div class="empty-state">Aucune tâche sur cette période.</div>`;
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
  els.assignee.value = state.currentPerson === "Sarah" ? "Sarah" : "Mathieu";
  els.dueDate.value = state.selectedDate;
  els.repeatDays.value = "0";
  setMessage("Tâche ajoutée.", "success");
}

async function completeTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const completedDate = todayString();

  const updatePayload =
    Number(task.repeat_days) > 0
      ? {
          last_completed_at: completedDate,
          due_date: addDays(completedDate, task.repeat_days),
          status: "pending",
        }
      : {
          last_completed_at: completedDate,
          status: "done",
        };

  setMessage("Mise à jour en cours...");

  const { error } = await db.from("tasks").update(updatePayload).eq("id", id);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la validation : ${error.message}`, "error");
    return;
  }

  setMessage("Tâche mise à jour.", "success");
}

function openEditModal(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  els.editId.value = task.id;
  els.editTitle.value = task.title || "";
  els.editAssignee.value = task.assignee || "Mathieu";
  els.editDueDate.value = task.due_date;
  els.editRepeatDays.value = String(task.repeat_days ?? 0);
  els.editNotes.value = task.notes || "";

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

async function deleteTask(id) {
  const ok = window.confirm("Supprimer cette tâche ?");
  if (!ok) return;

  setMessage("Suppression en cours...");

  const { error } = await db.from("tasks").delete().eq("id", id);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la suppression : ${error.message}`, "error");
    return;
  }

  closeEditModal();
  setMessage("Tâche supprimée.", "success");
}

function handleAgendaClick(event) {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === "done") completeTask(id);
  if (action === "edit") openEditModal(id);
  if (action === "delete") deleteTask(id);
}

function initRealtime() {
  db.channel("tasks-realtime-v2")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => fetchTasks()
    )
    .subscribe();
}

function initEvents() {
  els.taskForm.addEventListener("submit", addTask);
  els.refreshBtn.addEventListener("click", fetchTasks);
  els.statusFilter.addEventListener("change", renderAgenda);
  els.selectedDate.addEventListener("change", () => {
    state.selectedDate = els.selectedDate.value;
    renderAgenda();
  });
  els.agendaContainer.addEventListener("click", handleAgendaClick);

  els.personTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentPerson = btn.dataset.person;
      els.assignee.value = state.currentPerson === "Sarah" ? "Sarah" : "Mathieu";
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

  els.editForm.addEventListener("submit", saveEdit);
  els.closeModalBtn.addEventListener("click", closeEditModal);
  els.deleteFromModalBtn.addEventListener("click", () => deleteTask(els.editId.value));

  els.editModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeModal === "true") {
      closeEditModal();
    }
  });
}

function initDefaults() {
  state.selectedDate = todayString();
  els.selectedDate.value = state.selectedDate;
  els.dueDate.value = state.selectedDate;
  els.assignee.value = "Mathieu";
  applyActiveStates();
}

async function init() {
  initDefaults();
  initEvents();
  initRealtime();
  await fetchTasks();
}

init();
