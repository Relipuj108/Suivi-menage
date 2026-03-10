/* global supabase, SUPABASE_URL, SUPABASE_ANON_KEY */

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  form: document.getElementById("taskForm"),
  title: document.getElementById("title"),
  assignee: document.getElementById("assignee"),
  dueDate: document.getElementById("dueDate"),
  repeatDays: document.getElementById("repeatDays"),
  notes: document.getElementById("notes"),
  filterStatus: document.getElementById("filterStatus"),
  filterAssignee: document.getElementById("filterAssignee"),
  searchInput: document.getElementById("searchInput"),
  taskList: document.getElementById("taskList"),
  countBadge: document.getElementById("countBadge"),
  statusMessage: document.getElementById("statusMessage"),
  refreshBtn: document.getElementById("refreshBtn"),
};

let tasks = [];

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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
  if (type) {
    els.statusMessage.classList.add(type);
  }
}

function buildAssigneeFilter() {
  const currentValue = els.filterAssignee.value;
  const names = [...new Set(tasks.map((t) => (t.assignee || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr"));

  els.filterAssignee.innerHTML =
    `<option value="">Tout le monde</option>` +
    names
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("");

  if (names.includes(currentValue)) {
    els.filterAssignee.value = currentValue;
  } else {
    els.filterAssignee.value = "";
  }
}

function getFilteredTasks() {
  const statusFilter = els.filterStatus.value;
  const assigneeFilter = els.filterAssignee.value.trim().toLowerCase();
  const search = els.searchInput.value.trim().toLowerCase();

  return tasks
    .filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;

      if (
        assigneeFilter &&
        (task.assignee || "").trim().toLowerCase() !== assigneeFilter
      ) {
        return false;
      }

      if (search) {
        const haystack = `${task.title || ""} ${task.assignee || ""} ${task.notes || ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      return (a.title || "").localeCompare(b.title || "", "fr");
    });
}

function renderTasks() {
  buildAssigneeFilter();

  const filtered = getFilteredTasks();
  els.countBadge.textContent = String(filtered.length);

  if (!filtered.length) {
    els.taskList.innerHTML = `
      <div class="empty-state">
        Aucune tâche à afficher.
      </div>
    `;
    return;
  }

  els.taskList.innerHTML = filtered
    .map((task) => {
      const overdueClass = isOverdue(task) ? "overdue" : "";
      const doneClass = task.status === "done" ? "done" : "";
      const repeatText =
        Number(task.repeat_days) > 0
          ? `Tous les ${task.repeat_days} jour(s)`
          : "Sans répétition";

      return `
        <article class="task-card ${overdueClass} ${doneClass}">
          <div class="task-top">
            <div>
              <h3 class="task-title">${escapeHtml(task.title)}</h3>
              <div class="badges">
                <span class="badge">Prévue : ${escapeHtml(formatDate(task.due_date))}</span>
                <span class="badge">${escapeHtml(task.assignee || "Non assignée")}</span>
                <span class="badge">${escapeHtml(repeatText)}</span>
              </div>
            </div>
          </div>

          <div class="task-meta">
            Statut : ${task.status === "pending" ? "À faire" : "Terminée"}<br>
            Dernière validation : ${task.last_completed_at ? escapeHtml(formatDate(task.last_completed_at)) : "Jamais"}<br>
            ${task.notes ? `Note : ${escapeHtml(task.notes)}<br>` : ""}
            <span class="small-muted">Créée le : ${escapeHtml(formatDate(task.created_at.slice(0, 10)))}</span>
          </div>

          <div class="task-actions">
            ${
              task.status === "pending"
                ? `<button class="action-done" data-action="done" data-id="${task.id}">Fait</button>`
                : `<button class="action-reset" data-action="reset" data-id="${task.id}">Remettre à faire</button>`
            }
            <button class="action-delete" data-action="delete" data-id="${task.id}">Supprimer</button>
          </div>
        </article>
      `;
    })
    .join("");
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

  tasks = data || [];
  renderTasks();
  setMessage("Synchronisé.", "success");
}

async function addTask(event) {
  event.preventDefault();

  const title = els.title.value.trim();
  const assignee = els.assignee.value.trim();
  const dueDate = els.dueDate.value;
  const repeatDays = Number(els.repeatDays.value || 0);
  const notes = els.notes.value.trim();

  if (!title) {
    setMessage("Le titre de la tâche est obligatoire.", "error");
    return;
  }

  if (!dueDate) {
    setMessage("La date prévue est obligatoire.", "error");
    return;
  }

  const payload = {
    title,
    assignee: assignee || null,
    due_date: dueDate,
    repeat_days: repeatDays,
    status: "pending",
    notes: notes || null,
  };

  setMessage("Ajout en cours...");

  const { error } = await db.from("tasks").insert(payload);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de l'ajout : ${error.message}`, "error");
    return;
  }

  els.form.reset();
  els.repeatDays.value = "0";
  els.dueDate.value = todayString();

  setMessage("Tâche ajoutée.", "success");
}

async function completeTask(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const completedDate = todayString();

  let updatePayload;

  if (Number(task.repeat_days) > 0) {
    updatePayload = {
      last_completed_at: completedDate,
      due_date: addDays(completedDate, task.repeat_days),
      status: "pending",
    };
  } else {
    updatePayload = {
      last_completed_at: completedDate,
      status: "done",
    };
  }

  setMessage("Mise à jour en cours...");

  const { error } = await db.from("tasks").update(updatePayload).eq("id", taskId);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la validation : ${error.message}`, "error");
    return;
  }

  setMessage("Tâche mise à jour.", "success");
}

async function resetTask(taskId) {
  setMessage("Mise à jour en cours...");

  const { error } = await db
    .from("tasks")
    .update({ status: "pending" })
    .eq("id", taskId);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors du reset : ${error.message}`, "error");
    return;
  }

  setMessage("Tâche remise à faire.", "success");
}

async function deleteTask(taskId) {
  const confirmed = window.confirm("Supprimer cette tâche ?");
  if (!confirmed) return;

  setMessage("Suppression en cours...");

  const { error } = await db.from("tasks").delete().eq("id", taskId);

  if (error) {
    console.error(error);
    setMessage(`Erreur lors de la suppression : ${error.message}`, "error");
    return;
  }

  setMessage("Tâche supprimée.", "success");
}

function handleTaskListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "done") completeTask(id);
  if (action === "reset") resetTask(id);
  if (action === "delete") deleteTask(id);
}

function initRealtime() {
  db.channel("tasks-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      () => {
        fetchTasks();
      }
    )
    .subscribe();
}

function initEvents() {
  els.form.addEventListener("submit", addTask);
  els.taskList.addEventListener("click", handleTaskListClick);
  els.filterStatus.addEventListener("change", renderTasks);
  els.filterAssignee.addEventListener("change", renderTasks);
  els.searchInput.addEventListener("input", renderTasks);
  els.refreshBtn.addEventListener("click", fetchTasks);
}

async function init() {
  els.dueDate.value = todayString();
  initEvents();
  initRealtime();
  await fetchTasks();
}

init();
