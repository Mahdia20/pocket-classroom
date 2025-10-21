// === Helper Functions ===
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function generateId() {
  return "capsule_" + Date.now();
}

// LocalStorage Index
function loadIndex() {
  return JSON.parse(localStorage.getItem("pc_capsules_index") || "[]");
}
function saveIndex(index) {
  localStorage.setItem("pc_capsules_index", JSON.stringify(index));
}

// === NAVIGATION ===
const navLinks = $$(".nav-link");
const sections = $$(".app-section");

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.getAttribute("data-section");

    navLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    sections.forEach(sec => sec.classList.add("d-none"));
    $(`#${target}`).classList.remove("d-none");

    if (target === "learn") populateLearnSelect();
    if (target === "library") renderLibrary();
  });
});

// === LIBRARY VIEW ===
function renderLibrary() {
  const libraryGrid = $("#libraryGrid");
  const capsules = loadIndex();

  libraryGrid.innerHTML = "";

  if (capsules.length === 0) {
    libraryGrid.innerHTML = `
      <div class="col-12 text-center text-muted">
        <p>No capsules yet. Click <b>Author</b> to create one!</p>
      </div>`;
    return;
  }

  capsules.forEach(capsule => {
    const prog = JSON.parse(localStorage.getItem(`pc_progress_${capsule.id}`) || "{}");
    const bestScore = prog.bestScore || 0;
    const knownCount = (prog.knownFlashcards || []).length;

    const card = document.createElement("div");
    card.className = "col-md-4";

    card.innerHTML = `
      <div class="card shadow-sm h-100">
        <div class="card-body">
          <h5 class="card-title">${capsule.title}</h5>
          <span class="badge bg-primary">${capsule.level}</span>
          <p class="text-muted mb-1"><small>${capsule.subject}</small></p>
          <p class="text-muted"><small>Updated: ${capsule.updatedAt}</small></p>

          <div class="mb-2">
            <small>Best Quiz Score:</small>
            <div class="progress">
              <div class="progress-bar bg-success" role="progressbar" style="width:${bestScore}%;">
                ${bestScore}%
              </div>
            </div>
          </div>
          <div class="mb-2">
            <small>Known Flashcards: ${knownCount}</small>
          </div>

          <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-sm btn-success learn-btn">Learn</button>
            <button class="btn btn-sm btn-warning edit-btn">Edit</button>
            <button class="btn btn-sm btn-info export-btn">Export</button>
            <button class="btn btn-sm btn-danger delete-btn">Delete</button>
          </div>
        </div>
      </div>
    `;

    // Button actions
    card.querySelector(".export-btn").addEventListener("click", () => exportCapsule(capsule.id));
    card.querySelector(".delete-btn").addEventListener("click", () => deleteCapsule(capsule.id));
    card.querySelector(".learn-btn").addEventListener("click", () => {
      $("[data-section='learn']").click();
      $("#learnCapsuleSelect").value = capsule.id;
      $("#learnCapsuleSelect").dispatchEvent(new Event("change"));
    });

    libraryGrid.appendChild(card);
  });
}

function deleteCapsule(id) {
  if (!confirm("Delete this capsule?")) return;
  localStorage.removeItem(`pc_capsule_${id}`);
  localStorage.removeItem(`pc_progress_${id}`);
  const index = loadIndex().filter(c => c.id !== id);
  saveIndex(index);
  renderLibrary();
}

// === AUTHOR MODE ===
const flashcardsContainer = $("#flashcardsContainer");
$("#addFlashcard").addEventListener("click", () => addFlashcardRow());

function addFlashcardRow(front = "", back = "") {
  const row = document.createElement("div");
  row.className = "row g-2 mb-2 flashcard-row";

  row.innerHTML = `
    <div class="col-5"><input type="text" class="form-control flash-front" placeholder="Front" value="${front}"></div>
    <div class="col-5"><input type="text" class="form-control flash-back" placeholder="Back" value="${back}"></div>
    <div class="col-2 d-flex align-items-center">
      <button type="button" class="btn btn-sm btn-danger remove-flashcard">✖</button>
    </div>
  `;

  row.querySelector(".remove-flashcard").addEventListener("click", () => row.remove());
  flashcardsContainer.appendChild(row);
}

// Quiz Editor
const quizContainer = $("#quizContainer");
$("#addQuiz").addEventListener("click", () => addQuizQuestion());

function addQuizQuestion() {
  const qWrap = document.createElement("div");
  qWrap.className = "quiz-question card p-3 mb-2";

  qWrap.innerHTML = `
    <div class="d-flex justify-content-between align-items-start mb-2">
      <strong>Question</strong>
      <button type="button" class="btn btn-sm btn-danger remove-question">Remove</button>
    </div>
    <input type="text" class="form-control mb-2 quiz-text" placeholder="Write the question...">
    ${[0,1,2,3].map(i => `
      <div class="input-group mb-1 choice-row">
        <span class="input-group-text">
          <input type="radio" name="quiz_${Date.now()}" value="${i}">
        </span>
        <input type="text" class="form-control quiz-choice" placeholder="Choice ${i+1}">
      </div>
    `).join("")}
    <textarea class="form-control quiz-explanation mt-2" rows="2" placeholder="Optional explanation..."></textarea>
  `;

  qWrap.querySelector(".remove-question").addEventListener("click", () => qWrap.remove());
  quizContainer.appendChild(qWrap);
}

function collectQuiz() {
  return Array.from(document.querySelectorAll(".quiz-question")).map(qEl => {
    const text = qEl.querySelector(".quiz-text").value.trim();
    const choices = Array.from(qEl.querySelectorAll(".quiz-choice")).map(i => i.value.trim());
    const radios = qEl.querySelectorAll("input[type=radio]");
    let answerIndex = -1;
    radios.forEach(r => { if (r.checked) answerIndex = Number(r.value); });
    const explanation = qEl.querySelector(".quiz-explanation").value.trim();
    return { question: text, choices, answerIndex, explanation };
  }).filter(q => q.question && q.choices.every(c => c) && q.answerIndex >= 0);
}

$("#capsuleForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const meta = {
    id: generateId(),
    title: $("#title").value.trim(),
    subject: $("#subject").value.trim(),
    level: $("#level").value,
    description: $("#description").value.trim(),
    notes: $("#notes").value.split("\n").map(l => l.trim()).filter(l => l),
    flashcards: Array.from(document.querySelectorAll(".flashcard-row")).map(row => {
      const front = row.querySelector(".flash-front").value.trim();
      const back = row.querySelector(".flash-back").value.trim();
      return { front, back };
    }).filter(c => c.front && c.back),
    quiz: collectQuiz(),
    updatedAt: new Date().toLocaleString(),
    schema: "pocket-classroom/v1"
  };

  if (!meta.title) {
    alert("Title is required!");
    return;
  }
  if (!meta.notes.length && !meta.flashcards.length && !meta.quiz.length) {
    alert("Please add at least one note, flashcard, or quiz question!");
    return;
  }

  localStorage.setItem(`pc_capsule_${meta.id}`, JSON.stringify(meta));

  const index = loadIndex();
  index.push({ id: meta.id, title: meta.title, subject: meta.subject, level: meta.level, updatedAt: meta.updatedAt });
  saveIndex(index);

  alert("Capsule saved ✅");
  e.target.reset();
  flashcardsContainer.innerHTML = "";
  quizContainer.innerHTML = "";
  $("[data-section='library']").click();
});

// === LEARN MODE ===
function populateLearnSelect() {
  const select = $("#learnCapsuleSelect");
  const index = loadIndex();
  select.innerHTML = index.length ? `<option value="">-- Select a capsule --</option>` : `<option>No capsules</option>`;
  index.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.title} (${c.level})`;
    select.appendChild(opt);
  });
}

// Tabs
const tabButtons = $$("#learnTabs .nav-link");
const learnTabs = $$(".learn-tab");
tabButtons.forEach(btn => btn.addEventListener("click", () => {
  tabButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  learnTabs.forEach(tab => tab.classList.add("d-none"));
  $(`#tab-${btn.dataset.tab}`).classList.remove("d-none");
}));

// Notes
function renderNotes(capsule) {
  const list = $("#notesList");
  const search = $("#noteSearch");
  if (!capsule.notes.length) {
    list.innerHTML = `<li class="text-muted">No notes</li>`;
    return;
  }
  function update(filter = "") {
    list.innerHTML = "";
    capsule.notes.filter(n => n.toLowerCase().includes(filter.toLowerCase()))
      .forEach(n => { const li = document.createElement("li"); li.textContent = n; list.appendChild(li); });
  }
  update();
  search.oninput = () => update(search.value);
}

// Flashcards
let currentFlashIndex = 0, currentFlashcards = [], knownSet = new Set(), currentCapsuleId = null;
function renderFlashcard() {
  const inner = $(".flashcard-inner");
  inner.classList.remove("flipped");
  if (!currentFlashcards.length) {
    $(".flashcard-front span").textContent = "No flashcards";
    $(".flashcard-back span").textContent = "No flashcards";
    $("#flashCounter").textContent = "";
    return;
  }
  const card = currentFlashcards[currentFlashIndex];
  $(".flashcard-front span").textContent = card.front;
  $(".flashcard-back span").textContent = card.back;
  $("#flashCounter").textContent = `Card ${currentFlashIndex+1} of ${currentFlashcards.length}`;
}
$("#flashcardBox").addEventListener("click", () => $(".flashcard-inner").classList.toggle("flipped"));
$("#prevFlash").addEventListener("click", () => { if (currentFlashcards.length) { currentFlashIndex = (currentFlashIndex - 1 + currentFlashcards.length) % currentFlashcards.length; renderFlashcard(); }});
$("#nextFlash").addEventListener("click", () => { if (currentFlashcards.length) { currentFlashIndex = (currentFlashIndex + 1) % currentFlashcards.length; renderFlashcard(); }});
$("#knownFlash").addEventListener("click", () => { knownSet.add(currentFlashIndex); saveProgress(); });
$("#unknownFlash").addEventListener("click", () => { knownSet.delete(currentFlashIndex); saveProgress(); });
function saveProgress() {
  if (!currentCapsuleId) return;
  const key = `pc_progress_${currentCapsuleId}`;
  const existing = JSON.parse(localStorage.getItem(key) || "{}");
  existing.knownFlashcards = Array.from(knownSet);
  localStorage.setItem(key, JSON.stringify(existing));
}

// Quiz
let quizQuestions = [], quizIndex = 0, quizScore = 0, quizBest = 0;
function startQuiz(capsule) {
  quizQuestions = capsule.quiz || [];
  quizIndex = 0; quizScore = 0;
  if (!quizQuestions.length) {
    $("#quizBox").classList.add("d-none");
    $("#quizResult").classList.remove("d-none");
    $("#quizScore").textContent = "0";
    $("#quizBestScore").textContent = quizBest || 0;
    return;
  }
  $("#quizBox").classList.remove("d-none");
  $("#quizResult").classList.add("d-none");
  renderQuizQuestion();
}
function renderQuizQuestion() {
  const q = quizQuestions[quizIndex];
  $("#quizQuestion").textContent = q.question;
  $("#quizChoices").innerHTML = "";
  $("#quizFeedback").textContent = "";
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "list-group-item list-group-item-action";
    btn.textContent = choice;
    btn.addEventListener("click", () => handleQuizAnswer(i));
    $("#quizChoices").appendChild(btn);
  });
}
function handleQuizAnswer(selected) {
  const q = quizQuestions[quizIndex];
  const fb = $("#quizFeedback");
  if (selected === q.answerIndex) { fb.textContent = "✅ Correct!"; fb.className = "text-success fw-bold"; quizScore++; }
  else { fb.textContent = "❌ Wrong!"; fb.className = "text-danger fw-bold"; }
  if (q.explanation) fb.textContent += " " + q.explanation;
  setTimeout(() => { quizIndex++; quizIndex < quizQuestions.length ? renderQuizQuestion() : endQuiz(); }, 1000);
}
function endQuiz() {
  const percent = Math.round((quizScore / quizQuestions.length) * 100);
  $("#quizBox").classList.add("d-none");
  $("#quizResult").classList.remove("d-none");
  $("#quizScore").textContent = percent;
  if (percent > quizBest) quizBest = percent;
  $("#quizBestScore").textContent = quizBest;
  if (currentCapsuleId) {
    const key = `pc_progress_${currentCapsuleId}`;
    const prog = JSON.parse(localStorage.getItem(key) || "{}");
    prog.bestScore = quizBest;
    localStorage.setItem(key, JSON.stringify(prog));
  }
}
$("#restartQuiz").addEventListener("click", () => { quizIndex = 0; quizScore = 0; $("#quizResult").classList.add("d-none"); $("#quizBox").classList.remove("d-none"); renderQuizQuestion(); });

// Capsule change
$("#learnCapsuleSelect").addEventListener("change", () => {
  const id = $("#learnCapsuleSelect").value;
  if (!id) return;
  const capsule = JSON.parse(localStorage.getItem(`pc_capsule_${id}`));
  currentCapsuleId = id;
  renderNotes(capsule);
  currentFlashcards = capsule.flashcards || [];
  currentFlashIndex = 0;
  const prog = JSON.parse(localStorage.getItem(`pc_progress_${id}`) || "{}");
  knownSet = new Set(prog.knownFlashcards || []);
  renderFlashcard();
  quizBest = prog.bestScore || 0;
  startQuiz(capsule);
});

// === EXPORT / IMPORT ===
function exportCapsule(id) {
  const capsule = JSON.parse(localStorage.getItem(`pc_capsule_${id}`));
  if (!capsule) return alert("Capsule not found!");
  capsule.schema = "pocket-classroom/v1";
  const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = capsule.title.replace(/\s+/g, "_") + ".json";
  a.click(); URL.revokeObjectURL(url);
}
$("#importBtn").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.schema !== "pocket-classroom/v1") return alert("Invalid schema!");
      if (!data.title || (!data.notes?.length && !data.flashcards?.length && !data.quiz?.length)) {
        alert("Invalid capsule data!"); return;
      }
      const newId = generateId();
      data.id = newId; data.updatedAt = new Date().toLocaleString();
      localStorage.setItem(`pc_capsule_${newId}`, JSON.stringify(data));
      const index = loadIndex();
      index.push({ id: newId, title: data.title, subject: data.subject, level: data.level, updatedAt: data.updatedAt });
      saveIndex(index);
      renderLibrary();
      alert("Capsule imported successfully ✅");
    } catch (err) { alert("Error importing file: " + err.message); }
  };
  reader.readAsText(file);
});

// === INIT ===
document.addEventListener("DOMContentLoaded", () => {
  renderLibrary();
  populateLearnSelect();
  console.log("Pocket Classroom Ready 🚀");
});
// === DARK MODE TOGGLE ===
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

if (localStorage.getItem("theme") === "dark") {
  body.classList.add("dark-mode");
  themeToggle.textContent = "☀️ Light Mode";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

