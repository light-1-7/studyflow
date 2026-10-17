/* StudyFlow
   تطبيق بسيط لإدارة مهام المذاكرة.
   البيانات تُحفظ تلقائيًا داخل localStorage في نفس المتصفح.
*/

const DAYS = [
  { id: "sat", name: "السبت", short: "سبت" },
  { id: "sun", name: "الأحد", short: "أحد" },
  { id: "mon", name: "الإثنين", short: "إثن" },
  { id: "tue", name: "الثلاثاء", short: "ثلا" },
  { id: "wed", name: "الأربعاء", short: "أرب" },
  { id: "thu", name: "الخميس", short: "خمي" },
  { id: "fri", name: "الجمعة", short: "جمع" }
];

const DEFAULT_SUBJECTS = [
  { id: "physics", name: "الفيزياء", color: "#3b82f6" },
  { id: "chemistry", name: "الكيمياء", color: "#16a34a" },
  { id: "biology", name: "الأحياء", color: "#e58b26" },
  { id: "english", name: "الإنجليزي", color: "#8b5cf6" },
  { id: "arabic", name: "العربي", color: "#e05283" },
  { id: "geology", name: "الجيولوجيا", color: "#0d9488" }
];

const STORAGE_KEY = "studyflow-data-v1";
const THEME_KEY = "studyflow-theme";
const WEEK_KEY = "studyflow-current-week";
const $ = (selector) => document.querySelector(selector);

let subjects = [];
let tasks = [];
let currentWeekOffset = 0;
let mobileDay = getTodayDayId();
let toastTimer;

const taskDialog = $("#taskDialog");
const subjectsDialog = $("#subjectsDialog");
const taskForm = $("#taskForm");
const subjectForm = $("#subjectForm");

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTodayDayId() {
  // JavaScript: Sunday = 0. Our week starts on Saturday.
  const index = (new Date().getDay() + 1) % 7;
  return DAYS[index].id;
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.subjects) && Array.isArray(saved.tasks)) {
      subjects = saved.subjects;
      tasks = saved.tasks;
      // Add new default subjects if a saved version did not contain them.
      if (!subjects.some((subject) => subject.id === "general")) {
        subjects.push({ id: "general", name: "مهمة عامة", color: "#64748b" });
      }
      return;
    }
  } catch (error) {
    console.warn("تعذر قراءة البيانات المحفوظة:", error);
  }

  subjects = [
    ...DEFAULT_SUBJECTS.map((subject) => ({ ...subject })),
    { id: "general", name: "مهمة عامة", color: "#64748b" }
  ];
  tasks = [];
  saveData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ subjects, tasks }));
}

function resetProgressForNewWeek() {
  const weekStart = getWeekStart();

  // Build a local date key for the Saturday starting this week.
  const currentWeekKey = [
    weekStart.getFullYear(),
    String(weekStart.getMonth() + 1).padStart(2, "0"),
    String(weekStart.getDate()).padStart(2, "0")
  ].join("-");

  const savedWeekKey = localStorage.getItem(WEEK_KEY);

  // First run: save the week without changing existing progress.
  if (!savedWeekKey) {
    localStorage.setItem(WEEK_KEY, currentWeekKey);
    return;
  }

  // Reset completion only when a real new week starts.
  if (savedWeekKey !== currentWeekKey) {
    tasks.forEach((task) => {
      task.done = false;
    });

    localStorage.setItem(WEEK_KEY, currentWeekKey);
    saveData();
  }
}

function getSubject(subjectId) {
  return subjects.find((subject) => subject.id === subjectId)
    || subjects.find((subject) => subject.id === "general")
    || { id: "general", name: "مهمة عامة", color: "#64748b" };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function hexToRgba(hex, alpha = 0.09) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const number = parseInt(full, 16);
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getWeekStart(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  // Saturday is the first day of the week.
  const daysSinceSaturday = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - daysSinceSaturday + offset * 7);
  return date;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function formatDate(date, options = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("ar-EG", options).format(date);
}

function getDateForDay(dayIndex) {
  return addDays(getWeekStart(currentWeekOffset), dayIndex);
}

function renderWeekRange() {
  const start = getWeekStart(currentWeekOffset);
  const end = addDays(start, 6);
  $("#weekRange").textContent = `${formatDate(start)} – ${formatDate(end)}`;
}

function renderDayTabs() {
  const container = $("#mobileDayTabs");
  container.innerHTML = DAYS.map((day, index) => {
    const date = getDateForDay(index);
    const active = day.id === mobileDay ? "active" : "";
    const today = isSameDate(date, new Date());
    return `<button class="day-tab ${active}" type="button" data-day-tab="${day.id}">
      ${day.short}<small>${formatDate(date, { day: "numeric" })}${today ? " · اليوم" : ""}</small>
    </button>`;
  }).join("");
}

function isSameDate(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function renderSubjectOptions() {
  const filter = $("#subjectFilter");
  const oldFilter = filter.value || "all";
  filter.innerHTML = `<option value="all">كل المواد والمهام</option>` + subjects.map((subject) =>
    `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`
  ).join("");
  filter.value = subjects.some((subject) => subject.id === oldFilter) ? oldFilter : "all";

  const taskSubject = $("#taskSubject");
  taskSubject.innerHTML = subjects.map((subject) =>
    `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`
  ).join("");
}

function getFilteredTasks(dayId) {
  const selectedSubject = $("#subjectFilter").value || "all";
  return tasks.filter((task) => task.day === dayId
    && (selectedSubject === "all" || task.subjectId === selectedSubject));
}

function renderTasks() {
  const grid = $("#weekGrid");
  const todayDayId = getTodayDayId();
  grid.innerHTML = DAYS.map((day, index) => {
    const date = getDateForDay(index);
    const today = isSameDate(date, new Date());
    const activeClass = day.id === mobileDay ? "mobile-active" : "";
    const todayClass = today ? "is-today" : "";
    const dayTasks = getFilteredTasks(day.id);
    const taskMarkup = dayTasks.length
      ? dayTasks.map(renderTaskCard).join("")
      : `<div class="empty-day">${$("#subjectFilter").value === "all" ? "مفيش مهام لسه" : "لا توجد مهام لهذه المادة"}</div>`;

    return `<article class="day-column ${activeClass} ${todayClass}" data-day-column="${day.id}">
      <header class="day-head">
        <strong>${day.name}</strong>
        <span>${formatDate(date, { day: "numeric", month: "short" })}</span>
        ${today ? '<span class="today-pill">اليوم</span>' : ""}
      </header>
      <div class="task-list">${taskMarkup}</div>
      <button class="day-add" type="button" data-add-day="${day.id}">＋ إضافة مهمة</button>
    </article>`;
  }).join("");

  const allVisibleTasks = DAYS.flatMap((day) => getFilteredTasks(day.id));
  $("#emptyWeek").classList.toggle("hidden", allVisibleTasks.length > 0);
  grid.classList.toggle("hidden", allVisibleTasks.length === 0);
  renderDayTabs();
  // Keep the mobile selection valid if a day is no longer in view.
  if (!DAYS.some((day) => day.id === mobileDay)) mobileDay = todayDayId;
}

function renderTaskCard(task) {
  const subject = getSubject(task.subjectId);
  const color = subject.color || "#64748b";
  const done = Boolean(task.done);
  return `<article class="task-card ${done ? "done" : ""}" data-edit-task="${escapeHtml(task.id)}"
      style="--task-color:${escapeHtml(color)};--task-bg:${hexToRgba(color, document.body.classList.contains("dark") ? .13 : .09)};--task-border:${hexToRgba(color, .25)}"
      tabindex="0" role="button" aria-label="تعديل المهمة: ${escapeHtml(task.title)}">
    <div class="task-topline"><div>
      <span class="task-subject">${escapeHtml(subject.name)}</span>
      <p class="task-title">${escapeHtml(task.title)}</p>
    </div>${done ? '<span aria-label="مكتملة">✓</span>' : ""}</div>
    ${task.note ? `<p class="task-note">${escapeHtml(task.note)}</p>` : ""}
    <div class="task-actions">
      <button class="done-button" type="button" data-toggle-task="${escapeHtml(task.id)}">${done ? "✓ تم" : "○ تم"}</button>
      <span class="edit-hint">اضغط للتعديل</span>
    </div>
  </article>`;
}

function renderLegend() {
  $("#subjectLegend").innerHTML = subjects.map((subject) =>
    `<span class="legend-chip"><span class="legend-dot" style="background:${escapeHtml(subject.color)}"></span>${escapeHtml(subject.name)}</span>`
  ).join("");
}

function renderProgress() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const remaining = total - completed;
  const percent = total ? Math.round(completed / total * 100) : 0;

  const todayIndex = (new Date().getDay() + 1) % 7;
  const todayTasks = tasks.filter((task) => task.day === DAYS[todayIndex].id);
  const todayDone = todayTasks.filter((task) => task.done).length;
  const todayPercent = todayTasks.length ? Math.round(todayDone / todayTasks.length * 100) : 0;

  $("#progressText").textContent = `${percent}%`;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
  $("#progressDetail").textContent = `${completed} من ${total} مهام مكتملة`;
  $("#remainingCount").textContent = remaining;
  $("#todayProgress").textContent = `${todayPercent}%`;
  $("#todayDetail").textContent = `${todayDone} من ${todayTasks.length} مهام`;
}

function renderAll() {
  renderWeekRange();
  renderSubjectOptions();
  renderTasks();
  renderLegend();
  renderProgress();
}

function openNewTask(dayId = mobileDay) {
  taskForm.reset();
  $("#taskId").value = "";
  $("#taskDialogTitle").textContent = "إضافة مهمة جديدة";
  $("#deleteTaskBtn").classList.add("hidden");
  $("#taskError").textContent = "";
  $("#taskDay").innerHTML = DAYS.map((day) =>
    `<option value="${day.id}">${day.name}</option>`
  ).join("");
  $("#taskDay").value = DAYS.some((day) => day.id === dayId) ? dayId : getTodayDayId();
  $("#taskSubject").value = subjects.some((subject) => subject.id === "general") ? "general" : subjects[0]?.id;
  taskDialog.showModal();
  $("#taskTitle").focus();
}

function openEditTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  $("#taskId").value = task.id;
  $("#taskTitle").value = task.title;
  $("#taskNote").value = task.note || "";
  $("#taskDialogTitle").textContent = "تعديل المهمة";
  $("#deleteTaskBtn").classList.remove("hidden");
  $("#taskError").textContent = "";
  $("#taskDay").innerHTML = DAYS.map((day) =>
    `<option value="${day.id}">${day.name}</option>`
  ).join("");
  $("#taskDay").value = task.day;
  $("#taskSubject").value = subjects.some((subject) => subject.id === task.subjectId)
    ? task.subjectId : "general";
  taskDialog.showModal();
  $("#taskTitle").focus();
}

function saveTask(event) {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  const subjectId = $("#taskSubject").value;
  const day = $("#taskDay").value;
  const note = $("#taskNote").value.trim();
  const taskId = $("#taskId").value;

  if (!title) {
    $("#taskError").textContent = "اكتب اسم المهمة الأول.";
    return;
  }
  if (!DAYS.some((item) => item.id === day)) {
    $("#taskError").textContent = "اختار يومًا صحيحًا.";
    return;
  }

  if (taskId) {
    const existing = tasks.find((task) => task.id === taskId);
    if (existing) Object.assign(existing, { title, subjectId, day, note });
    showToast("تم تعديل المهمة");
  } else {
    tasks.push({ id: makeId(), title, subjectId, day, note, done: false, createdAt: new Date().toISOString() });
    showToast("تمت إضافة المهمة");
  }

  mobileDay = day;
  saveData();
  renderAll();
  taskDialog.close();
}

function toggleTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.done = !task.done;
  saveData();
  renderAll();
  showToast(task.done ? "عاش! المهمة خلصت 🎉" : "تم إرجاع المهمة لقائمة المهام");
}

function deleteTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (!confirm(`متأكد إنك عايز تحذف مهمة «${task.title}»؟`)) return;
  tasks = tasks.filter((item) => item.id !== taskId);
  saveData();
  renderAll();
  taskDialog.close();
  showToast("تم حذف المهمة");
}

function openSubjectsManager() {
  $("#subjectError").textContent = "";
  renderSubjectManager();
  subjectsDialog.showModal();
}

function renderSubjectManager() {
  $("#subjectManagerList").innerHTML = subjects.map((subject) => {
    const isGeneral = subject.id === "general";
    return `<div class="subject-manager-row" data-subject-row="${escapeHtml(subject.id)}">
      <input type="text" value="${escapeHtml(subject.name)}" maxlength="40" aria-label="اسم ${escapeHtml(subject.name)}" data-subject-name="${escapeHtml(subject.id)}">
      <input type="color" value="${escapeHtml(subject.color)}" aria-label="لون ${escapeHtml(subject.name)}" data-subject-color="${escapeHtml(subject.id)}">
      <button class="button button-danger" type="button" data-delete-subject="${escapeHtml(subject.id)}" ${isGeneral ? "disabled title='المهمة العامة لا يمكن حذفها'" : ""}>حذف</button>
    </div>`;
  }).join("");
}

function addSubject() {
  const nameInput = $("#newSubjectName");
  const name = nameInput.value.trim();
  const color = $("#newSubjectColor").value;
  if (!name) {
    $("#subjectError").textContent = "اكتب اسم المادة الأول.";
    nameInput.focus();
    return;
  }
  if (subjects.some((subject) => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    $("#subjectError").textContent = "المادة دي موجودة بالفعل. اختار اسم مختلف.";
    nameInput.focus();
    return;
  }
  subjects.push({ id: makeId(), name, color });
  nameInput.value = "";
  $("#subjectError").textContent = "";
  saveData();
  renderAll();
  renderSubjectManager();
  showToast("تمت إضافة المادة");
}

function updateSubjectName(subjectId, newName) {
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) return;
  const name = newName.trim();
  if (!name) {
    showToast("اسم المادة مينفعش يكون فاضي");
    renderSubjectManager();
    return;
  }
  const duplicate = subjects.some((item) => item.id !== subjectId
    && item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (duplicate) {
    showToast("فيه مادة تانية بنفس الاسم");
    renderSubjectManager();
    return;
  }
  subject.name = name;
  saveData();
  renderAll();
}

function updateSubjectColor(subjectId, color) {
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) return;
  subject.color = color;
  saveData();
  renderAll();
}

function deleteSubject(subjectId) {
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject || subjectId === "general") return;
  const count = tasks.filter((task) => task.subjectId === subjectId).length;
  const message = count
    ? `المادة «${subject.name}» مرتبطة بـ ${count} مهمة. حذفها سينقل هذه المهام إلى «مهمة عامة». نكمل؟`
    : `متأكد إنك عايز تحذف مادة «${subject.name}»؟`;
  if (!confirm(message)) return;

  tasks.forEach((task) => {
    if (task.subjectId === subjectId) task.subjectId = "general";
  });
  subjects = subjects.filter((item) => item.id !== subjectId);
  saveData();
  renderAll();
  renderSubjectManager();
  showToast("تم حذف المادة");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function setTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  $("#themeToggle").textContent = theme === "dark" ? "☀" : "☾";
  $("#themeToggle").title = theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";
  localStorage.setItem(THEME_KEY, theme);
  // Rebuild task backgrounds to suit the selected theme.
  renderTasks();
}

function initializeTheme() {
  setTheme(localStorage.getItem(THEME_KEY) || "light");
}

function bindEvents() {
  $("#addTaskBtn").addEventListener("click", () => openNewTask());
  $("#emptyAddBtn").addEventListener("click", () => openNewTask());
  $("#manageSubjectsBtn").addEventListener("click", openSubjectsManager);
  $("#themeToggle").addEventListener("click", () =>
    setTheme(document.body.classList.contains("dark") ? "light" : "dark"));
  $("#prevWeek").addEventListener("click", () => { currentWeekOffset--; renderAll(); });
  $("#nextWeek").addEventListener("click", () => { currentWeekOffset++; renderAll(); });
  $("#subjectFilter").addEventListener("change", renderTasks);
  taskForm.addEventListener("submit", saveTask);
  $("#deleteTaskBtn").addEventListener("click", () => deleteTask($("#taskId").value));
  $("#addSubjectBtn").addEventListener("click", addSubject);
  $("#newSubjectName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); addSubject(); }
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
  });

  // Event delegation: one listener handles all task cards and their buttons.
  $("#weekGrid").addEventListener("click", (event) => {
    const toggleButton = event.target.closest("[data-toggle-task]");
    if (toggleButton) {
      event.stopPropagation();
      toggleTask(toggleButton.dataset.toggleTask);
      return;
    }
    const addButton = event.target.closest("[data-add-day]");
    if (addButton) {
      mobileDay = addButton.dataset.addDay;
      openNewTask(addButton.dataset.addDay);
      return;
    }
    const taskCard = event.target.closest("[data-edit-task]");
    if (taskCard) openEditTask(taskCard.dataset.editTask);
  });

  $("#weekGrid").addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-edit-task]")) {
      event.preventDefault();
      openEditTask(event.target.dataset.editTask);
    }
  });

  $("#mobileDayTabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-day-tab]");
    if (!tab) return;
    mobileDay = tab.dataset.dayTab;
    renderTasks();
  });

  // Save subject name on leaving its field; update the color immediately.
  $("#subjectManagerList").addEventListener("change", (event) => {
    const nameInput = event.target.closest("[data-subject-name]");
    const colorInput = event.target.closest("[data-subject-color]");
    if (nameInput) updateSubjectName(nameInput.dataset.subjectName, nameInput.value);
    if (colorInput) updateSubjectColor(colorInput.dataset.subjectColor, colorInput.value);
  });

  $("#subjectManagerList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-subject]");
    if (button) deleteSubject(button.dataset.deleteSubject);
  });

  // Close a dialog if the user clicks its backdrop.
  [taskDialog, subjectsDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  // A basic swipe gesture for mobile day navigation.
  let touchStartX = null;
  $("#weekGrid").addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  $("#weekGrid").addEventListener("touchend", (event) => {
    if (touchStartX === null || window.innerWidth > 1000) return;
    const difference = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(difference) < 65) return;
    const currentIndex = DAYS.findIndex((day) => day.id === mobileDay);
    // In RTL layouts, a left swipe moves forward through the week.
    const direction = difference < 0 ? 1 : -1;
    const nextIndex = Math.max(0, Math.min(DAYS.length - 1, currentIndex + direction));
    mobileDay = DAYS[nextIndex].id;
    renderTasks();
    touchStartX = null;
  }, { passive: true });
}

function startApp() {
  loadData();
   resetProgressForNewWeek();
  bindEvents();
  initializeTheme();
  renderAll();
}

startApp();
