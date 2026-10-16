
const DB = {
  read(key, fallback) {
    try {
      const value = localStorage.getItem("bahar_" + key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem("bahar_" + key, JSON.stringify(value));
  }
};

const defaultServices = [
  {id: 1, name: "کوتاهی مو", price: 350000, description: "کوتاهی و فرم‌دهی مو", image: "", video: ""},
  {id: 2, name: "رنگ مو", price: 1200000, description: "رنگ مو متناسب با سلیقه شما", image: "", video: ""},
  {id: 3, name: "میکاپ", price: 900000, description: "آرایش مناسب مهمانی و مراسم", image: "", video: ""},
  {id: 4, name: "خدمات ناخن", price: 450000, description: "مانیکور و زیبایی ناخن", image: "", video: ""}
];

function getServices() {
  return DB.read("services", defaultServices);
}
function formatMoney(value) {
  return Number(value || 0).toLocaleString("fa-IR") + " تومان";
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
function getCurrentUser() {
  return DB.read("user", null);
}
function renderUserArea() {
  const area = document.getElementById("user-area");
  if (!area) return;
  const user = getCurrentUser();
  area.innerHTML = user
    ? `<span>${escapeHTML(user.name)}</span> <a class="btn btn-light" href="dashboard.html">پنل من</a> <button class="btn btn-light" id="logout-button">خروج</button>`
    : `<a class="btn btn-light" href="login.html">ورود کاربران</a>`;

  const logout = document.getElementById("logout-button");
  if (logout) {
    logout.addEventListener("click", () => {
      localStorage.removeItem("bahar_user");
      location.reload();
    });
  }
}
function renderServiceCards() {
  const list = document.getElementById("service-list");
  if (!list) return;
  const services = getServices();

  list.innerHTML = services.map(service => {
    let media = "";
    if (service.image) {
      media += `<img class="card-media" src="${escapeHTML(service.image)}" alt="${escapeHTML(service.name)}">`;
    }
    if (service.video) {
      media += `<video class="card-media" controls preload="metadata" src="${escapeHTML(service.video)}"></video>`;
    }
    return `<article class="card">
      ${media}
      <h3>${escapeHTML(service.name)}</h3>
      <p>${escapeHTML(service.description)}</p>
      <p class="price">${formatMoney(service.price)}</p>
      <button class="btn choose-service" data-id="${service.id}">رزرو این خدمت</button>
    </article>`;
  }).join("") || "<p>هنوز خدمتی ثبت نشده است.</p>";

  list.querySelectorAll(".choose-service").forEach(button => {
    button.addEventListener("click", () => {
      const select = document.getElementById("service");
      if (select) select.value = button.dataset.id;
      document.getElementById("appointment")?.scrollIntoView({behavior: "smooth"});
    });
  });
}
function fillServiceSelect() {
  const select = document.getElementById("service");
  if (!select) return;
  select.innerHTML = getServices().map(service =>
    `<option value="${service.id}">${escapeHTML(service.name)} — ${formatMoney(service.price)}</option>`
  ).join("");
}
function initAppointmentForm() {
  const form = document.getElementById("appointment-form");
  if (!form) return;

  const user = getCurrentUser();
  if (user && user.role === "customer") {
    form.elements.customer.value = user.name;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData(form);
    const service = getServices().find(s => s.id === Number(formData.get("serviceId")));
    if (!service) {
      alert("ابتدا یک خدمت معتبر انتخاب کن.");
      return;
    }

    const appointments = DB.read("appointments", []);
    appointments.push({
      id: Date.now(),
      customer: String(formData.get("customer")).trim(),
      phone: String(formData.get("phone") || "").trim(),
      serviceId: service.id,
      serviceName: service.name,
      price: Number(service.price),
      date: formData.get("date"),
      time: formData.get("time"),
      notes: String(formData.get("notes") || "").trim(),
      status: "در انتظار"
    });
    DB.write("appointments", appointments);

    const message = document.getElementById("appointment-message");
    message.textContent = "نوبت آزمایشی ثبت شد؛ در انتظار تأیید مدیر.";
    message.className = "success";
    form.reset();
    fillServiceSelect();
    if (user && user.role === "customer") form.elements.customer.value = user.name;
  });
}
document.addEventListener("DOMContentLoaded", () => {
  renderUserArea();
  renderServiceCards();
  fillServiceSelect();
  initAppointmentForm();
});
