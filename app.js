const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const params = new URLSearchParams(location.search);
const currentPage = location.pathname.split("/").pop();

function toast(message) {
  const el = $("toast"); if (!el) return;
  el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
function setMessage(text, isError = false) {
  const el = $("formMessage"); if (!el) return;
  el.textContent = text; el.classList.toggle("error", isError);
}
function genderTag(gender) {
  return `<span class="gender-tag">${escapeHTML(gender)}</span>`;
}
function patientRows(rows) {
  return rows.length ? `<table><thead><tr><th>PATIENT ID</th><th>NAME</th><th>PHONE</th><th>GENDER</th><th>AGE</th><th>PROBLEM</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(p => `<tr>
    <td><span class="id-tag">#${escapeHTML(p.patient_id)}</span></td>
    <td class="patient-name">${escapeHTML(p.name)}</td><td>${escapeHTML(p.phone_number)}</td>
    <td>${genderTag(p.gender)}</td><td>${escapeHTML(p.age)}</td><td>${escapeHTML(p.problem)}</td>
    <td><a class="table-action" href="patient-details.html?id=${encodeURIComponent(p.patient_id)}">View</a><a class="table-action" href="edit-patient.html?id=${encodeURIComponent(p.patient_id)}">Edit</a><button class="table-action delete" data-delete="${escapeHTML(p.patient_id)}">Delete</button></td>
  </tr>`).join("")}</tbody></table>` : `<div class="empty-state">No patient records found. Register a patient to get started.</div>`;
}
let patientsCache = [];
async function loadPatients() {
  try {
    patientsCache = await api("/api/patients");
    renderPatients();
  } catch (err) {
    const table = $("patientsTable"); if (table) table.innerHTML = `<div class="empty-state">${escapeHTML(err.message)}</div>`;
  }
}
function renderPatients() {
  const q = ($("patientSearch")?.value || $("globalSearch")?.value || "").trim().toLowerCase();
  const gender = $("genderFilter")?.value || "all";
  const filtered = patientsCache.filter(p => {
    const haystack = [p.patient_id,p.name,p.phone_number,p.gender,p.age,p.problem].join(" ").toLowerCase();
    return haystack.includes(q) && (gender === "all" || p.gender === gender);
  });
  const table = $("patientsTable"); if (table) table.innerHTML = patientRows(filtered);
  const count = $("recordCount"); if (count) count.textContent = `${filtered.length} of ${patientsCache.length} records`;
}
async function deletePatient(id) {
  if (!confirm(`Delete patient record #${id}? This action cannot be undone.`)) return;
  try { const result = await api(`/api/patients/${encodeURIComponent(id)}`, { method: "DELETE" }); toast(result.message); await loadPatients(); }
  catch (err) { toast(err.message); }
}
document.addEventListener("click", e => {
  const button = e.target.closest("[data-delete]");
  if (button) deletePatient(button.dataset.delete);
});

async function loadDashboard() {
  try {
    const data = await api("/api/dashboard");
    $("totalPatients").textContent = Number(data.total).toLocaleString("en-IN");
    $("averageAge").textContent = data.averageAge;
    const countGender = g => (data.gender.find(x => String(x.gender).toLowerCase() === g.toLowerCase()) || {}).count || 0;
    $("malePatients").textContent = countGender("Male");
    $("femalePatients").textContent = countGender("Female");
    $("recentPatients").innerHTML = data.recent.length ? `<table><thead><tr><th>NAME</th><th>PHONE</th><th>GENDER</th><th>AGE</th><th>PROBLEM</th><th></th></tr></thead><tbody>${data.recent.map(p => `<tr><td class="patient-name">${escapeHTML(p.name)}</td><td>${escapeHTML(p.phone_number)}</td><td>${genderTag(p.gender)}</td><td>${escapeHTML(p.age)}</td><td>${escapeHTML(p.problem)}</td><td><a class="table-action" href="patient-details.html?id=${encodeURIComponent(p.patient_id)}">View</a></td></tr>`).join("")}</tbody></table>` : `<div class="empty-state">No patients registered yet. Add your first patient.</div>`;
    const max = Math.max(1, ...data.problems.map(x => Number(x.count)));
    $("problemInsights").innerHTML = data.problems.length ? data.problems.map(x => `<div class="insight-row"><span>${escapeHTML(x.problem)}</span><b>${x.count}</b><div class="insight-bar"><i style="width:${Math.round(x.count/max*100)}%"></i></div></div>`).join("") : `<div class="empty-state">Problem insights will appear when records are added.</div>`;
  } catch (err) {
    $("recentPatients").innerHTML = `<div class="empty-state">${escapeHTML(err.message)} Check your MySQL connection and table columns.</div>`;
  }
}
async function checkHealth() {
  const el = $("healthStatus"); if (!el) return;
  try { await api("/api/health"); el.classList.add("connected"); el.classList.remove("disconnected"); el.title = "MySQL connected"; }
  catch { el.classList.add("disconnected"); el.classList.remove("connected"); el.title = "MySQL disconnected"; }
}
function formData(form) { return Object.fromEntries(new FormData(form)); }

async function setupAddForm() {
  const form = $("patientForm"); if (!form || currentPage !== "add-patient.html") return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      const result = await api("/api/patients", { method: "POST", body: JSON.stringify(formData(form)) });
      setMessage(`${result.message} Patient ID: ${result.patient_id}`);
      form.reset();
      setTimeout(() => location.href = `patient-details.html?id=${encodeURIComponent(result.patient_id)}`, 750);
    } catch (err) { setMessage(err.message, true); }
  });
}
async function setupEditForm() {
  const form = $("patientForm"); if (!form || currentPage !== "edit-patient.html") return;
  const id = params.get("id"); if (!id) { setMessage("No patient ID was provided.", true); return; }
  try {
    const p = await api(`/api/patients/${encodeURIComponent(id)}`);
    $("patientIdLabel").textContent = p.patient_id;
    $("editHeading").textContent = `Update ${p.name}`;
    for (const key of ["name","phone_number","gender","age","problem"]) form.elements[key].value = p[key] ?? "";
  } catch (err) { setMessage(err.message, true); form.querySelector("button[type=submit]").disabled = true; }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      const result = await api(`/api/patients/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(formData(form)) });
      setMessage(result.message); setTimeout(() => location.href = `patient-details.html?id=${encodeURIComponent(id)}`, 650);
    } catch (err) { setMessage(err.message, true); }
  });
}
async function setupDetails() {
  if (currentPage !== "patient-details.html") return;
  const id = params.get("id"); if (!id) { $("patientDetails").innerHTML = `<div class="empty-state">No patient ID provided.</div>`; return; }
  try {
    const p = await api(`/api/patients/${encodeURIComponent(id)}`);
    $("detailTitle").textContent = p.name;
    $("editPatientLink").href = `edit-patient.html?id=${encodeURIComponent(id)}`;
    $("patientDetails").innerHTML = Object.entries({ "Patient ID":p.patient_id, "Full name":p.name, "Phone number":p.phone_number, "Gender":p.gender, "Age":p.age, "Problem / reason for visit":p.problem }).map(([k,v]) => `<div class="detail-item"><span>${escapeHTML(k.toUpperCase())}</span><strong>${escapeHTML(v)}</strong></div>`).join("");
    $("deletePatientButton").addEventListener("click", async () => { await deletePatient(id); location.href = "patients.html"; });
  } catch (err) { $("patientDetails").innerHTML = `<div class="empty-state">${escapeHTML(err.message)}</div>`; }
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-link").forEach(a => { if (a.getAttribute("href") === currentPage) a.classList.add("active"); });
  $("patientSearch")?.addEventListener("input", renderPatients);
  $("genderFilter")?.addEventListener("change", renderPatients);
  $("globalSearch")?.addEventListener("keydown", e => { if (e.key === "Enter") { sessionStorage.setItem("patientSearch", e.target.value); location.href = "patients.html"; } });
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("globalSearch")?.focus(); } });
  if (currentPage === "patients.html") {
    loadPatients().then(() => { const q = sessionStorage.getItem("patientSearch"); if (q) { $("patientSearch").value = q; sessionStorage.removeItem("patientSearch"); renderPatients(); } });
  }
  if (currentPage === "index.html" || currentPage === "") loadDashboard();
  setupAddForm(); setupEditForm(); setupDetails(); checkHealth();
});
