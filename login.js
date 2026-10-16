
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const role = String(data.get("role") || "customer");

    if (!name) {
      alert("نام را وارد کن.");
      return;
    }

    localStorage.setItem("bahar_user", JSON.stringify({name, role}));
    location.href = "dashboard.html";
  });
});
