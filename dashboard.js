
const Store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem("bahar_" + key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem("bahar_" + key, JSON.stringify(value));
  }
};

const initialServices = [
  {id: 1, name: "کوتاهی مو", price: 350000, description: "کوتاهی و فرم‌دهی مو", image: "", video: ""},
  {id: 2, name: "رنگ مو", price: 1200000, description: "رنگ مو", image: "", video: ""},
  {id: 3, name: "میکاپ", price: 900000, description: "آرایش مراسم", image: "", video: ""},
  {id: 4, name: "خدمات ناخن", price: 450000, description: "مانیکور", image: "", video: ""}
];

const readServices = () => Store.get("services", initialServices);
const money = n => Number(n || 0).toLocaleString("fa-IR") + " تومان";
const safe = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
);
const byId = (items, id) => items.find(item => String(item.id) === String(id));

let user = Store.get("user", null);
let services = readServices();
let staff = Store.get("staff", []);
let appointments = Store.get("appointments", []);
let payments = Store.get("payments", []);
let expenses = Store.get("expenses", []);

function refreshData() {
  services = readServices();
  staff = Store.get("staff", []);
  appointments = Store.get("appointments", []);
  payments = Store.get("payments", []);
  expenses = Store.get("expenses", []);
}

function table(headers, rows) {
  if (!rows.length) return "<p class='muted'>هنوز اطلاعاتی ثبت نشده است.</p>";
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>`;
}

function start() {
  if (!user) {
    location.href = "login.html";
    return;
  }

  document.getElementById("welcome").textContent =
    `خوش آمدی ${user.name} | نقش: ${
      {admin:"مدیر", accountant:"حسابدار", customer:"مشتری"}[user.role] || "کاربر"
    }`;

  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("bahar_user");
    location.href = "index.html";
  });

  if (user.role === "customer") {
    document.getElementById("customer-panel").classList.remove("hidden");
    renderCustomer();
    return;
  }

  if (user.role !== "admin" && user.role !== "accountant") {
    alert("نقش کاربری نامعتبر است.");
    location.href = "login.html";
    return;
  }

  document.getElementById("staff-panel").classList.remove("hidden");

  if (user.role === "admin") {
    document.getElementById("service-management").classList.remove("hidden");
    document.getElementById("staff-management").classList.remove("hidden");
    bindServiceForm();
    bindStaffForm();
  }

  bindFinanceForms();
  renderAll();
}

function renderCustomer() {
  refreshData();
  const mine = appointments.filter(a => a.customer === user.name);
  document.getElementById("my-appointments").innerHTML = mine.map(a =>
    `<div class="card section">
      <h3>${safe(a.serviceName)}</h3>
      <p>تاریخ: ${safe(a.date)} | ساعت: ${safe(a.time)}</p>
      <p>وضعیت: <span class="pill">${safe(a.status)}</span></p>
      <p class="muted">${safe(a.notes || "")}</p>
    </div>`
  ).join("") || "<p>هنوز نوبتی با این نام ثبت نشده است.</p>";
}

function renderAll() {
  refreshData();
  renderStats();
  renderAppointments();
  renderServices();
  renderStaff();
  fillFinanceSelects();
  renderFinancialReport();
}

function renderStats() {
  const income = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const cost = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  document.getElementById("stats").innerHTML = `
    <div class="stat">نوبت‌ها<strong>${appointments.length.toLocaleString("fa-IR")}</strong></div>
    <div class="stat">کارکنان<strong>${staff.length.toLocaleString("fa-IR")}</strong></div>
    <div class="stat">درآمد ثبت‌شده<strong>${money(income)}</strong></div>
    <div class="stat">هزینه‌ها<strong>${money(cost)}</strong></div>`;
}

function renderAppointments() {
  const rows = appointments.map(a => `
    <tr>
      <td>${safe(a.customer)}</td>
      <td>${safe(a.serviceName)}</td>
      <td>${safe(a.date)}</td>
      <td>${safe(a.time)}</td>
      <td>${safe(a.status)}</td>
      <td>
        <button class="btn" data-approve="${a.id}">تأیید</button>
        <button class="btn btn-secondary" data-done="${a.id}">انجام شد</button>
        <button class="btn btn-danger" data-delete-appointment="${a.id}">حذف</button>
      </td>
    </tr>`);

  document.getElementById("appointment-table").innerHTML =
    table(["مشتری","خدمت","تاریخ","ساعت","وضعیت","عملیات"], rows);

  document.querySelectorAll("[data-approve]").forEach(btn =>
    btn.addEventListener("click", () => updateAppointment(btn.dataset.approve, "تأیید شد"))
  );
  document.querySelectorAll("[data-done]").forEach(btn =>
    btn.addEventListener("click", () => updateAppointment(btn.dataset.done, "انجام شد"))
  );
  document.querySelectorAll("[data-delete-appointment]").forEach(btn =>
    btn.addEventListener("click", () => {
      if (!confirm("این نوبت حذف شود؟")) return;
      appointments = appointments.filter(a => String(a.id) !== btn.dataset.deleteAppointment);
      Store.set("appointments", appointments);
      renderAll();
    })
  );
}

function updateAppointment(id, status) {
  appointments = appointments.map(a =>
    String(a.id) === String(id) ? {...a, status} : a
  );
  Store.set("appointments", appointments);
  renderAll();
}

function bindServiceForm() {
  document.getElementById("service-form").addEventListener("submit", event => {
    event.preventDefault();
    const f = new FormData(event.target);
    services.push({
      id: Date.now(),
      name: String(f.get("name")).trim(),
      price: Number(f.get("price")),
      description: String(f.get("description") || "").trim(),
      image: String(f.get("image") || "").trim(),
      video: String(f.get("video") || "").trim()
    });
    Store.set("services", services);
    event.target.reset();
    renderAll();
  });
}

function renderServices() {
  if (user.role !== "admin") return;

  const rows = services.map(s => `
    <tr>
      <td>${safe(s.name)}</td>
      <td>${money(s.price)}</td>
      <td>${safe(s.description)}</td>
      <td><button class="btn btn-danger" data-delete-service="${s.id}">حذف</button></td>
    </tr>`);

  document.getElementById("service-table").innerHTML =
    table(["خدمت","قیمت","توضیحات","عملیات"], rows);

  document.querySelectorAll("[data-delete-service]").forEach(btn =>
    btn.addEventListener("click", () => {
      if (!confirm("این خدمت حذف شود؟")) return;
      services = services.filter(s => String(s.id) !== btn.dataset.deleteService);
      Store.set("services", services);
      renderAll();
    })
  );
}

function bindStaffForm() {
  document.getElementById("staff-form").addEventListener("submit", event => {
    event.preventDefault();
    const f = new FormData(event.target);
    staff.push({
      id: Date.now(),
      name: String(f.get("name")).trim(),
      share: Number(f.get("share"))
    });
    Store.set("staff", staff);
    event.target.reset();
    renderAll();
  });
}

function renderStaff() {
  if (user.role !== "admin") return;

  const rows = staff.map(s => {
    const earned = payments
      .filter(p => String(p.staffId) === String(s.id))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const shareAmount = earned * Number(s.share || 0) / 100;

    return `<tr>
      <td>${safe(s.name)}</td>
      <td>${Number(s.share || 0)}٪</td>
      <td>${money(earned)}</td>
      <td>${money(shareAmount)}</td>
      <td><button class="btn btn-danger" data-delete-staff="${s.id}">حذف</button></td>
    </tr>`;
  });

  document.getElementById("staff-table").innerHTML =
    table(["نام کارمند","سهم","درآمد خدمات ثبت‌شده","سهم محاسبه‌شده","عملیات"], rows);

  document.querySelectorAll("[data-delete-staff]").forEach(btn =>
    btn.addEventListener("click", () => {
      if (!confirm("این کارمند حذف شود؟")) return;
      staff = staff.filter(s => String(s.id) !== btn.dataset.deleteStaff);
      Store.set("staff", staff);
      renderAll();
    })
  );
}

function fillFinanceSelects() {
  const serviceSelect = document.getElementById("payment-service");
  const staffSelect = document.getElementById("payment-staff");

  serviceSelect.innerHTML = services.map(s =>
    `<option value="${s.id}">${safe(s.name)} — ${money(s.price)}</option>`
  ).join("");

  staffSelect.innerHTML = staff.map(s =>
    `<option value="${s.id}">${safe(s.name)}</option>`
  ).join("");

  if (!staff.length) {
    staffSelect.innerHTML = '<option value="">ابتدا کارمند ثبت کن</option>';
  }
}

function bindFinanceForms() {
  document.getElementById("payment-form").addEventListener("submit", event => {
    event.preventDefault();
    const f = new FormData(event.target);
    const service = byId(services, f.get("serviceId"));
    const employee = byId(staff, f.get("staffId"));

    if (!service || !employee) {
      alert("برای ثبت درآمد، ابتدا خدمت و کارمند را ثبت کن.");
      return;
    }

    payments.push({
      id: Date.now(),
      serviceId: service.id,
      serviceName: service.name,
      staffId: employee.id,
      staffName: employee.name,
      amount: Number(f.get("amount")),
      date: f.get("date")
    });

    Store.set("payments", payments);
    event.target.reset();
    renderAll();
  });

  document.getElementById("expense-form").addEventListener("submit", event => {
    event.preventDefault();
    const f = new FormData(event.target);

    expenses.push({
      id: Date.now(),
      title: String(f.get("title")).trim(),
      amount: Number(f.get("amount")),
      date: f.get("date")
    });

    Store.set("expenses", expenses);
    event.target.reset();
    renderAll();
  });
}

function renderFinancialReport() {
  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const net = totalIncome - totalExpenses;

  const paymentRows = payments.map(p => `
    <tr>
      <td>${safe(p.date)}</td>
      <td>${safe(p.serviceName)}</td>
      <td>${safe(p.staffName)}</td>
      <td>${money(p.amount)}</td>
    </tr>`);

  const expenseRows = expenses.map(e => `
    <tr>
      <td>${safe(e.date)}</td>
      <td>${safe(e.title)}</td>
      <td>${money(e.amount)}</td>
    </tr>`);

  document.getElementById("financial-report").innerHTML = `
    <div class="stat-grid">
      <div class="stat">کل درآمد<strong>${money(totalIncome)}</strong></div>
      <div class="stat">کل هزینه<strong>${money(totalExpenses)}</strong></div>
      <div class="stat">مانده<strong>${money(net)}</strong></div>
    </div>
    <h3>ریز درآمدها</h3>
    ${table(["تاریخ","خدمت","کارمند","مبلغ"], paymentRows)}
    <h3>ریز هزینه‌ها</h3>
    ${table(["تاریخ","عنوان هزینه","مبلغ"], expenseRows)}`;
}

document.addEventListener("DOMContentLoaded", start);
