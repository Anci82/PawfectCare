/* ============================
   LOGIN / HEADER
============================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded, JS running");
  renderPreLoginHeader();
});
const headerRight = document.getElementById("headerRight");
const welcomeSection = document.getElementById("welcomeSection");
const dashboardSection = document.getElementById("dashboard");
const petIdInput = document.getElementById("petId");
// HIDE RESET ALL DATA SECTION
const resetWrapper = document.getElementById("resetWrapper");
if (resetWrapper) resetWrapper.style.display = "none";

// const validUser = { username: 'admin', password: 'admin' };

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie("csrftoken");

function renderPreLoginHeader() {
  headerRight.innerHTML = `
    <div class="auth-compact">
      <div class="auth-meta">
        <div class="auth-title">
          Welcome to <span class="auth-brand">PawfectCare</span> 🐾
        </div>
        <div class="auth-subtitle">
          Log in to track your pet’s recovery.
        </div>
      </div>

      <div class="auth-buttons">
        <button id="showLogin" class="primary-btn smallbtn">Log In</button>
        <button id="registerBtn" class="primary-btn smallbtn">Register</button>
      </div>
    </div>
  `;

  document
    .getElementById("showLogin")
    .addEventListener("click", renderLoginForm);

  document
    .getElementById("registerBtn")
    .addEventListener("click", handleRegister);
}

function renderLoginForm() {
  headerRight.innerHTML = `
    <form id="loginForm" class="login-group">
      <input type="text" id="loginUsername" placeholder="Username or email" required />
      <input type="password" id="loginPassword" placeholder="Password" required />
      <div class="btn-group">
        <button type="submit" class="primary-btn">Log In</button>
        <button type="button" id="cancelLogin" class="secondary-btn">Cancel</button>
      </div>
      <a href="#" id="forgotPasswordLink" class="link-small">Forgot password?</a>
    </form>
  `;

  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
  });

  document.getElementById("cancelLogin").addEventListener("click", () => {
    renderPreLoginHeader();
  });
}

function handleRegister() {
  headerRight.innerHTML = `
    <form id="regForm" class="login-group">
      <input type="email" name="email" placeholder="Email" required />
      <input type="text" name="username" placeholder="Username" />
      <input type="password" name="password" placeholder="Password" required />
      <div class="btn-group">
        <button type="submit" class="primary-btn">Register</button>
        <button type="button" id="cancelReg" class="secondary-btn">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById("cancelReg").addEventListener("click", () => {
    renderPreLoginHeader();
  });

  document.getElementById("regForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    fetch("/register/", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          showNotification("Registration successful!");
          renderPreLoginHeader();
        } else {
          showNotification("Error: " + (data.error || "Unknown error"));
        }
      })
      .catch((err) => console.error("Registration fetch error:", err));
  });
}

function handleLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

  fetch("/login/", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showNotification("Logged in as " + data.username);

        // 🔹 Store current user globals
        window.currentUsername = data.username;
        window.currentUserEmail = data.email || "";
        window.currentPetName = data.pet_name || null; // comes from Django now

        // clear local caches
        localStorage.removeItem("petLogs");
        localStorage.removeItem("petInfo");

        welcomeSection.style.display = "none";
        dashboardSection.style.display = "block";

        // this will call updateAccountPanel() inside
        renderPostLoginHeader(data.username);

        // still do your usual data fetches
        fetchPetInfo();
        displayLogs();
        displayVetInfo();
      } else {
        showNotification("Login failed: " + data.error);
      }
    })
    .catch((err) => console.error("Login fetch error:", err));
}

function handleLogout() {
  const formData = new FormData();
  formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

  fetch("/logout/", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        welcomeSection.style.display = "block";
        dashboardSection.style.display = "none";
        petInfo = {};
        logs = [];
        localStorage.removeItem("petLogs");
        resetVetUI();
        renderPreLoginHeader();
      }
    });
}
/* ============================
   ACCOUNT HELPERS
============================ */

// 🔹 Update the My Account panel fields from globals
function updateAccountPanel() {
  const accountUsernameEl = document.getElementById("accountUsername");
  const accountEmailEl = document.getElementById("accountEmail");
  const accountPetNameEl = document.getElementById("accountPetName");

  if (accountUsernameEl) {
    accountUsernameEl.textContent = window.currentUsername || "—";
  }
  if (accountEmailEl) {
    accountEmailEl.textContent = window.currentUserEmail || "—";
  }
  if (accountPetNameEl) {
    accountPetNameEl.textContent = window.currentPetName || "—";
  }
}

// 🔹 Call this from wherever you know the pet name (e.g. in fetchPetInfo)
function setCurrentPetName(name) {
  window.currentPetName = name || "Your pet";
  updateAccountPanel();
}
function updateAccountOnServer(newUsername, newEmail) {
  const formData = new FormData();
  formData.append("username", newUsername);
  formData.append("email", newEmail);
  formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

  fetch("/update-account/", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // update globals
        window.currentUsername = data.username;
        window.currentUserEmail = data.email;

        // refresh account panel
        updateAccountPanel();

        // update avatar label in header
        const avatarNameEl = document.querySelector(
          ".user-avatar-btn .avatar-name"
        );
        if (avatarNameEl) {
          avatarNameEl.textContent = data.username;
        }

        showNotification("Account updated ✅");
      } else {
        showNotification("Account update failed: " + data.error);
      }
    })
    .catch((err) => {
      console.error("Update account error:", err);
      showNotification("Account update failed (network error)");
    });
}
function changePasswordOnServer(currentPassword, newPassword1, newPassword2) {
  const formData = new FormData();
  formData.append("current_password", currentPassword);
  formData.append("new_password1", newPassword1);
  formData.append("new_password2", newPassword2);
  formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

  return fetch("/change-password/", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showNotification("Password updated ✅");
      } else {
        showNotification("Password change failed: " + data.error);
      }
      return data;
    })
    .catch((err) => {
      console.error("Change password error:", err);
      showNotification("Password change failed (network error)");
    });
}

/* ============================
   HEADER AFTER LOGIN
============================ */

function renderPostLoginHeader(username) {
  headerRight.innerHTML = `
    <div class="user-menu">
      <button class="user-avatar-btn" id="userMenuToggle" type="button">
        <span class="avatar-icon">👤</span>
        <span class="avatar-name">${username}</span>
      </button>

      <div class="user-menu-panel" id="userMenuPanel">
        <button type="button" class="user-menu-item" id="myAccountBtn">
          My account
        </button>
        <button type="button" class="user-menu-item" id="changePasswordBtn">
          Change password
        </button>
        <button type="button" class="user-menu-item danger-item" id="signOutBtn">
          Sign out
        </button>
      </div>

      <div class="account-panel" id="accountPanel">
        <h4>My account</h4>
        <div class="account-info-row"><strong>Username:</strong> <span id="accountUsername"></span></div>
        <div class="account-info-row"><strong>Email:</strong> <span id="accountEmail"></span></div>
        <div class="account-info-row"><strong>Pet name:</strong> <span id="accountPetName"></span></div>

        <div class="account-actions">
          <button type="button" id="accountEditBtn" class="secondary-btn smallbtn">
            Edit account
          </button>
          <button type="button" id="accountDeleteBtn" class="secondary-btn smallbtn danger-btn">
            Delete account
          </button>
        </div>

        <div class="edit-account-form" id="editAccountForm">
          <h5>Edit account</h5>

          <label>Username</label>
          <input type="text" id="editUsername" class="edit-input" />

          <label>Email</label>
          <input type="email" id="editEmail" class="edit-input" />

          <div class="edit-actions">
            <button id="saveAccountBtn" class="primary-btn smallbtn">Save</button>
            <button id="cancelAccountBtn" class="secondary-btn smallbtn">Cancel</button>
          </div>
        </div>

        <div class="password-form" id="passwordForm">
          <h5>Change password</h5>

          <label>Current password</label>
          <input type="password" id="currentPasswordInput" class="edit-input" />

          <label>New password</label>
          <input type="password" id="newPassword1Input" class="edit-input" />

          <label>Repeat new password</label>
          <input type="password" id="newPassword2Input" class="edit-input" />

          <div class="edit-actions">
            <button id="savePasswordBtn" class="primary-btn smallbtn">Save</button>
            <button id="cancelPasswordBtn" class="secondary-btn smallbtn">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fill panel from globals
  updateAccountPanel();

  // Elements
  const userMenuToggle = document.getElementById("userMenuToggle");
  const userMenuPanel = document.getElementById("userMenuPanel");
  const accountPanel = document.getElementById("accountPanel");

  const myAccountBtn = document.getElementById("myAccountBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const accountEditBtn = document.getElementById("accountEditBtn");
  const accountDeleteBtn = document.getElementById("accountDeleteBtn");

  const actionsRow = accountPanel.querySelector(".account-actions");
  const editForm = document.getElementById("editAccountForm");
  const editUsernameInput = document.getElementById("editUsername");
  const editEmailInput = document.getElementById("editEmail");
  const saveAccountBtn = document.getElementById("saveAccountBtn");
  const cancelAccountBtn = document.getElementById("cancelAccountBtn");

  const passwordForm = document.getElementById("passwordForm");
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPassword1Input = document.getElementById("newPassword1Input");
  const newPassword2Input = document.getElementById("newPassword2Input");
  const savePasswordBtn = document.getElementById("savePasswordBtn");
  const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");

  function resetFormsAndButtons() {
    editForm.style.display = "none";
    passwordForm.style.display = "none";
    actionsRow.classList.remove("hidden");
  }

  // Toggle main dropdown
  userMenuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenuPanel.classList.toggle("open");

    // if closing dropdown, also close account panel + forms
    if (!userMenuPanel.classList.contains("open")) {
      accountPanel.classList.remove("open");
      resetFormsAndButtons();
    }
  });

  // My account: show account panel
  myAccountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    accountPanel.classList.toggle("open");
    if (!accountPanel.classList.contains("open")) {
      // closing account panel resets edit modes
      resetFormsAndButtons();
    }
  });

  // Change password panel
changePasswordBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  // make sure the account panel is visible
  accountPanel.classList.add("open");

  const isOpen = passwordForm.style.display === "block";

  if (isOpen) {
    passwordForm.style.display = "none";
    actionsRow.classList.remove("hidden");
  } else {
    // open password form, close edit account if open
    editForm.style.display = "none";
    passwordForm.style.display = "block";
    actionsRow.classList.add("hidden");

    // clear fields
    currentPasswordInput.value = "";
    newPassword1Input.value = "";
    newPassword2Input.value = "";
  }
});

  // Save new password
  savePasswordBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const currentPw = currentPasswordInput.value;
    const newPw1 = newPassword1Input.value;
    const newPw2 = newPassword2Input.value;

    changePasswordOnServer(currentPw, newPw1, newPw2);

    passwordForm.style.display = "none";
    actionsRow.classList.remove("hidden");
  });

  // Cancel password change
  cancelPasswordBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    passwordForm.style.display = "none";
    actionsRow.classList.remove("hidden");
  });

  // Sign out from menu
  signOutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleLogout();
  });

  // Edit account panel
  accountEditBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Pre-fill current values
    editUsernameInput.value = window.currentUsername || "";
    editEmailInput.value = window.currentUserEmail || "";

    const isOpen = editForm.style.display === "block";

    if (isOpen) {
      editForm.style.display = "none";
      actionsRow.classList.remove("hidden");
    } else {
      // open edit form, close password form
      passwordForm.style.display = "none";
      editForm.style.display = "block";
      actionsRow.classList.add("hidden");
    }
  });

  // Save edited account
  saveAccountBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const newUsername = editUsernameInput.value.trim();
    const newEmail = editEmailInput.value.trim();

    updateAccountOnServer(newUsername, newEmail);

    editForm.style.display = "none";
    actionsRow.classList.remove("hidden");
  });

  // Cancel edit account
  cancelAccountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    editForm.style.display = "none";
    actionsRow.classList.remove("hidden");
  });

  // Delete account (still fake)
  accountDeleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showNotification("Delete account feature coming soon 🐾", "error");
  });

  // Single click-outside handler
  document.addEventListener("click", function (e) {
    const clickedInsideMenu =
      userMenuToggle.contains(e.target) ||
      userMenuPanel.contains(e.target) ||
      accountPanel.contains(e.target);

    if (!clickedInsideMenu) {
      userMenuPanel.classList.remove("open");
      accountPanel.classList.remove("open");
      resetFormsAndButtons();
    }
  });
}


// HIDING HEADER
let lastScroll = 0;
const header = document.querySelector(".header-wrapper");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > lastScroll && currentScroll > 50) {
    // scrolling down → hide header
    header.classList.add("hidden");
  } else {
    // scrolling up → show header
    header.classList.remove("hidden");
  }

  lastScroll = currentScroll;
});

// SLIDER
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll("#demoPlaceholder .tour-slide");
  const dots = document.querySelectorAll("#demoPlaceholder .tour-dot");

  if (!slides.length) return; // safety

  let currentIndex = 0;
  let timerId = null;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
    currentIndex = index;
  }

  function nextSlide() {
    const nextIndex = (currentIndex + 1) % slides.length;
    showSlide(nextIndex);
  }

  function startAutoRotate() {
    stopAutoRotate();
    timerId = setInterval(nextSlide, 4000); // 4s per slide
  }

  function stopAutoRotate() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = parseInt(dot.dataset.index, 10);
      showSlide(index);
      startAutoRotate(); // restart timer on manual click
    });
  });

  // init
  showSlide(0);
  startAutoRotate();
});

/* ============================
   PET INFO
============================ */
const petInfoForm = document.getElementById("petInfoForm");
const petType = document.getElementById("petType");
const breedSelect = document.getElementById("petBreed");
const petInfoContent = document.getElementById("petInfoContent");
const petInfoWrapper = document.getElementById("petInfoWrapper");
const petInfoDisplay = document.getElementById("petInfoDisplay");
const rightBoxes = document.getElementById("rightBoxes");
const vetInfoDisplay = document.getElementById("vetInfoDisplay");
const galleryDisplay = document.getElementById("galleryDisplay");

let petInfo = {};

function fetchPetInfo() {
  fetch("/ajax-user-pets/")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        // assuming first pet is the "main" one
        petInfo = data[0];

        if (petInfo.id) {
          const hiddenPetIdInput = document.getElementById("petId");
          if (hiddenPetIdInput) {
            hiddenPetIdInput.value = petInfo.id;
          }
          if (typeof petIdInput !== "undefined" && petIdInput) {
            petIdInput.value = petInfo.id;
          }
        }

        // 🔹 keep global pet name + My Account panel in sync
        setCurrentPetName(petInfo.name);
      } else {
        petInfo = {};
        // no pets -> clear the label in My Account
        setCurrentPetName(null);
      }

      displayPetInfo();
    })
    .catch((err) => console.error("Error fetching pet info:", err));
}

function displayPetInfo() {
  if (!petInfo.type) {
    petInfoWrapper.style.display = "block";
    petInfoDisplay.style.display = "none";
    vetInfoDisplay.style.display = "none";
    galleryDisplay.style.display = "none";
    rightBoxes.style.display = "none";
    document.getElementById("logHistoryDisplay").style.display = "none";
    backPetBtn.style.display = "none";
    return;
  }

  backPetBtn.style.display = "inline-block";
  document.getElementById("petId").value = petInfo.id || "";

  // Build collapsible content
  petInfoContent.innerHTML = `
    <div class="pet-header">
      <span><strong>${petInfo.name
      ? petInfo.name.charAt(0).toUpperCase() +
      petInfo.name.slice(1).toLowerCase()
      : "Unnamed Pet"
    }</strong></span>
      <span class="arrow">▶</span>
    </div>
    <div class="pet-content">
      <strong>Type:</strong> ${petInfo.type}<br>
      <strong>Age:</strong> ${petInfo.age}<br>
      <strong>Weight:</strong> ${petInfo.weight != null ? petInfo.weight : "—"
    }<br>
      <strong>Breed:</strong> ${petInfo.breed || "—"}<br>
      <strong>Surgery Date:</strong> ${petInfo.surgery_date || "—"}<br>
      <strong>Surgery:</strong> ${petInfo.surgery_type || "—"}<br> 
      <strong>Reason / Notes:</strong> ${petInfo.surgery_reason || "—"}<br>
      <button type="button" id="editPetInfo" class="primary-btn">Edit</button>
    </div>
  `;

  // Initial display setup
  petInfoWrapper.style.display = "none";
  petInfoDisplay.style.display = "block";
  vetInfoDisplay.style.display = "block";
  galleryDisplay.style.display = "block";
  rightBoxes.style.display = "flex";
  document.getElementById("logHistoryDisplay").style.display = "block";

  const petHeader = petInfoContent.querySelector(".pet-header");
  const petContent = petInfoContent.querySelector(".pet-content");
  const arrow = petInfoContent.querySelector(".arrow");

  // start minimized
  petContent.style.display = "none";
  arrow.style.transform = "rotate(0deg)";

  // toggle collapse/expand
  petHeader.addEventListener("click", () => {
    const isActive = petContent.style.display === "";
    petContent.style.display = isActive ? "none" : "";
    arrow.style.transform = isActive ? "rotate(0deg)" : "rotate(90deg)";
  });

  // Edit button behavior
  document.getElementById("editPetInfo").addEventListener("click", () => {
    petInfoWrapper.style.display = "block";
    petType.value = petInfo.type;
    document.getElementById("petName").value = petInfo.name || "";
    document.getElementById("petAge").value = petInfo.age;
    document.getElementById("weight").value =
      petInfo.weight != null ? petInfo.weight : "";
    breedSelect.value = petInfo.breed;
    document.getElementById("surgeryType").value = petInfo.surgery_type || "";
    document.getElementById("surgeryDate").value = petInfo.surgery_date || "";
    document.getElementById("surgeryReason").value =
      petInfo.surgery_reason || "";
    petInfoDisplay.style.display = "none";
    vetInfoDisplay.style.display = "none";
    galleryDisplay.style.display = "none";
    rightBoxes.style.display = "none";
    document.getElementById("logHistoryDisplay").style.display = "none";
  });

  // fetch logs if pet exists
  if (petInfo.id) {
    fetchPetLogs(petInfo.id);
  }
}

petInfoForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(petInfoForm);
  if (petInfo.id) formData.append("pet_id", petInfo.id);
  formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

  fetch("/ajax-create-pet/", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (data.success) {
        showNotification("Pet info saved!");
        fetchPetInfo(); // refresh display
      } else {
        showNotification("Error: " + JSON.stringify(data.errors));
      }
    })
    .catch((err) => console.error("Fetch error:", err));
});

// Call fetch when dashboard loads
if (document.getElementById("dashboard")) fetchPetInfo();

/* ============================
   LOAD DOG BREEDS
============================ */
function loadDogBreeds() {
  fetch("https://dog.ceo/api/breeds/list/all")
    .then((res) => res.json())
    .then((data) => {
      const breeds = Object.keys(data.message).sort();
      breeds.forEach((b) => {
        const option = document.createElement("option");
        option.value = b;
        option.textContent = b.charAt(0).toUpperCase() + b.slice(1);
        breedSelect.appendChild(option);
      });
    })
    .catch((err) => console.error("Error loading dog breeds:", err));
}
loadDogBreeds();

/* ============================
   VET & APPOINTMENTS
============================ */

/* ============================
   VET & APPOINTMENTS (complete)
============================ */

document.addEventListener("DOMContentLoaded", () => {
  // ----- elements -----
  const container = document.getElementById("vetInfoDisplay");
  const summaryRow = document.getElementById("vetInfoSummary");
  const summaryDateEl = document.getElementById("vetSummaryDate");
  const arrowEl = document.querySelector(".vet-summary-arrow");
  const form = document.getElementById("vetInfoForm");

  const inputDate = document.getElementById("next_appointment");
  const inputClinic = document.getElementById("clinic_name");
  const inputPhone = document.getElementById("phone");
  const inputEmail = document.getElementById("email");

  // ----- state -----
  let cardEl = null; // read-only card node
  let isOpen = false; // expanded/collapsed
  let currentVet = null; // last fetched/saved vet info (per session, not localStorage)

  // Start collapsed
  form.style.display = "none";

  // ---------- helpers ----------
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      for (const c of document.cookie.split(";")) {
        const cookie = c.trim();
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  function fmtDateForSummary(isoOrLocal) {
    if (!isoOrLocal) return "—";
    const d = new Date(isoOrLocal);
    if (isNaN(d)) return "—";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function localToISO(datetimeLocal) {
    if (!datetimeLocal) return null; // "2025-11-09T17:45"
    const d = new Date(datetimeLocal);
    return isNaN(d) ? null : d.toISOString();
  }

  const pad = (n) => String(n).padStart(2, "0");

  function isoToDatetimeLocalValue(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function hasAnyField(data) {
    if (!data) return false;
    return Boolean(
      (data.clinic_name && data.clinic_name.trim()) ||
      (data.phone && data.phone.trim()) ||
      (data.email && data.email.trim()) ||
      data.next_appointment
    );
  }

  // ---------- UI helpers ----------
  function fillForm(data) {
    inputClinic.value = data?.clinic_name || "";
    inputPhone.value = data?.phone || "";
    inputEmail.value = data?.email || "";
    inputDate.value = isoToDatetimeLocalValue(data?.next_appointment);
  }

  function setSummary(nextISO) {
    summaryDateEl.textContent = fmtDateForSummary(nextISO);
  }

  function hideCard() {
    if (cardEl) cardEl.style.display = "none";
  }

  function removeCard() {
    if (cardEl) {
      cardEl.remove();
      cardEl = null;
    }
  }

  function showCard() {
    if (cardEl) cardEl.style.display = "block";
  }

  function renderCard(data) {
    removeCard();
    cardEl = document.createElement("div");
    cardEl.id = "vetInfoReadOnly";
    cardEl.className = "vet-readonly";
    cardEl.innerHTML = `
      <div><strong>Clinic:<br></strong> ${data.clinic_name || "—"}</div>
      <div><strong>Phone:</strong><br>
      ${data.phone
        ? `<a href="tel:${data.phone}" class="vet-link">📞 ${data.phone}</a>`
        : "—"
      }
      </div>

      <div><strong>Email:</strong><br>
      ${data.email
        ? `<a href="mailto:${data.email}" class="vet-link">📧 ${data.email}</a>`
        : "—"
      }
      </div>
      <div>
        <button type="button" id="vetInfoEditBtn" class="primary-btn">Edit</button>
      </div>
    `;
    container.insertBefore(cardEl, form);

    // Edit → show form prefilled
    cardEl.querySelector("#vetInfoEditBtn").addEventListener("click", () => {
      if (currentVet) fillForm(currentVet);
      cardEl.style.display = "none";
      form.style.display = "block";
      arrowEl.textContent = "▼";
      inputClinic.focus();
    });
  }

  function resetVetUI() {
    // called on logout
    currentVet = null;
    summaryDateEl.textContent = "DATE/TIME";
    arrowEl.textContent = "▶";
    form.reset();
    form.style.display = "none";
    removeCard();
    isOpen = false;
  }

  // ---------- data ops ----------
  async function fetchVetInfo() {
    const res = await fetch("/vet-info/", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      // 404 or other → treat as no data
      return null;
    }
    return await res.json();
  }

  async function saveVetInfo(payload) {
    const res = await fetch("/vet-info/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Save failed ${res.status}: ${txt}`);
    }
    return await res.json();
  }

  // ---------- expanded content loader ----------
  async function loadExpanded() {
    try {
      const data = await fetchVetInfo();
      currentVet = data; // keep in memory only (per session)
      if (hasAnyField(data)) {
        // show card, hide form
        renderCard(data);
        showCard();
        form.style.display = "none";
        setSummary(data.next_appointment);
      } else {
        // no data → show empty form
        removeCard();
        fillForm({}); // clear
        form.style.display = "block";
        setSummary(null);
      }
    } catch (err) {
      console.error("Error loading vet info:", err);
      // fallback to showing form
      removeCard();
      form.style.display = "block";
    }
  }

  // ---------- toggle behavior ----------
  summaryRow.addEventListener("click", async () => {
    isOpen = !isOpen;
    arrowEl.textContent = isOpen ? "▼" : "▶";
    if (isOpen) {
      await loadExpanded();
    } else {
      hideCard();
      form.style.display = "none";
    }
  });

  // ---------- save handler ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clinic = inputClinic.value.trim();
    if (!clinic) {
      inputClinic.focus();
      return;
    }

    const payload = {
      clinic_name: clinic,
      phone: (inputPhone.value || "").trim(),
      email: (inputEmail.value || "").trim(),
      next_appointment: inputDate.value ? localToISO(inputDate.value) : null,
    };

    try {
      const saved = await saveVetInfo(payload);
      currentVet = saved;
      setSummary(saved.next_appointment);

      // swap to card in expanded view
      renderCard(saved);
      showCard();
      form.style.display = "none";
      arrowEl.textContent = "▼";
      console.log("Vet info saved.");
    } catch (err) {
      console.error(err);
      alert("Could not save vet info. Please check your inputs.");
    }
  });

  // ---------- tiny hooks for login/logout ----------
  // Call after successful LOGIN to refresh the collapsed summary.
  async function displayVetInfo() {
    try {
      const data = await fetchVetInfo();
      currentVet = data;
      setSummary(data?.next_appointment || null);
    } catch {
      setSummary(null);
    }
  }

  // Expose to other modules (login/logout handlers)
  window.displayVetInfo = displayVetInfo; // use after login
  window.resetVetUI = resetVetUI;
  displayVetInfo(); // use on logout
});

/* ============================
   DAILY LOGS
============================ */
function fetchPetLogs(petId) {
  if (!petId) return;

  fetch(`/ajax-pet-logs/${petId}/`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.success || !data.logs.length) {
        logs = [];
        displayLogs(); // show "No logs yet" from your current displayLogs()
        return;
      }
      logs = data.logs.map((log) => ({
        id: log.id,
        date: log.date,
        food: log.food,
        energy: log.energy,
        notes: log.notes,
        meds: log.meds,
        photo: log.photo_url,
      }));
      displayLogs();
    })
    .catch((err) => console.error("Error fetching pet logs:", err));
}

/* ============================
   DAILY LOGS (with Surgery Sync)
============================ */

// Helper function to resize an image
function resizeImage(file, maxWidth, maxHeight, callback) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxWidth) {
        height = Math.round((height *= maxWidth / width));
        width = maxWidth;
      } else if (height > maxHeight) {
        width = Math.round((width *= maxHeight / height));
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Elements
const logForm = document.getElementById("logForm");
const addLogBtn = document.getElementById("add-log-btn");
const dailyLogWrapper = document.getElementById("dailyLogWrapper");
const photoInput = document.getElementById("photo");

let editIndex = null;

// Pre-fill log date with surgery date if present
if (petInfo.surgery_date) {
  document.getElementById("date").value = petInfo.surgery_date;
}

// Add medication row
document.getElementById("add-med").addEventListener("click", () => {
  const wrapper = document.getElementById("medications-wrapper");
  const firstRow = wrapper.querySelector(".med-row");
  const newRow = firstRow.cloneNode(true);
  newRow.querySelectorAll("input").forEach((input) => (input.value = ""));
  wrapper.appendChild(newRow);
});

// Display logs
let logsExpanded = false;
function displayLogs() {
  const logList = document.getElementById("logList");
  logList.innerHTML = "";

  // 🐾 Wrap the whole logs section
  const wrapper = document.createElement("div");
  wrapper.className = "logs-wrapper";

  wrapper.innerHTML = `
    <div class="log-section-header">
      <span><strong>Daily Logs</strong></span>
      <span class="arrow">▶</span>
    </div>
    <div class="log-section-content"></div>
  `;

  const content = wrapper.querySelector(".log-section-content");
  const sectionArrow = wrapper.querySelector(".arrow");

  // Restore expand/collapse state
  if (logsExpanded) {
    content.style.display = "block";
    sectionArrow.style.transform = "rotate(90deg)";
  } else {
    content.style.display = "none";
    sectionArrow.style.transform = "rotate(0deg)";
  }

  // Build individual log entries
  logs.forEach((log, idx) => {
    const medStr = log.meds
      .map((m) => `${m.name || "—"} (${m.dosage || 0}mg x ${m.times || 0})`)
      .join(", ");

    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `
      <div class="log-header">
        <span>${log.date}</span>
        <span>▶</span>
      </div>
      <div class="log-content">
        <strong>Food:</strong> ${log.food}<br>
        <strong>Medicine:</strong> ${medStr}<br>
        <strong>Energy:</strong> ${log.energy}<br>
        <strong>Notes:</strong> ${log.notes || "—"}<br>
        ${log.photo
        ? `<img src="${log.photo}" alt="Pet Photo" class="log-photo">`
        : ""
      }<br>
        <button type="button" class="primary-btn edit-log-btn" data-index="${idx}">Edit</button>
        <button type="button" class="primary-btn delete-log-btn" data-index="${idx}">Delete</button>
      </div>
    `;

    const logHeader = div.querySelector(".log-header");

    // Toggle log details with class
    logHeader.addEventListener("click", (e) => {
      if (e.target.closest("button")) return; // ignore clicks on buttons
      div.classList.toggle("active");
    });

    content.appendChild(div);
  });

  // Section toggle
  const sectionHeader = wrapper.querySelector(".log-section-header");
  sectionHeader.addEventListener("click", () => {
    const isVisible = content.style.display === "block";

    logsExpanded = !isVisible; // ✅ store state

    content.style.display = logsExpanded ? "block" : "none";
    sectionArrow.style.transform = logsExpanded
      ? "rotate(90deg)"
      : "rotate(0deg)";

    if (!logsExpanded) {
      content.querySelectorAll(".log-entry").forEach((entry) => {
        entry.classList.remove("active");
      });
    }
  });

  logList.appendChild(wrapper);

  setupEditDelete();

  // Reattach edit/delete buttons
  wrapper.querySelectorAll(".edit-log-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent toggling when editing
      const idx = btn.dataset.index;
      const log = logs[idx];
      editIndex = idx;
      addLogBtn.innerText = "Done";
      showForm(dailyLogWrapper);

      document.getElementById("date").value = log.date;
      document.getElementById("food").value = log.food;
      document.getElementById("energy").value = log.energy;
      document.getElementById("notes").value = log.notes || "";
      photoInput.value = "";

      const medsWrapper = document.getElementById("medications-wrapper");
      medsWrapper.innerHTML = "";
      log.meds.forEach((med) => {
        const row = document.createElement("div");
        row.className = "med-row flex-row";
        row.innerHTML = `
          <input type="text" class="medName" placeholder="Medicine Name" value="${med.name || ""
          }">
          <input type="number" class="medDosage" placeholder="Dosage (mg)" value="${med.dosage || ""
          }">
          <input type="number" class="medTimes" placeholder="Times per Day" value="${med.times || ""
          }">
        `;
        medsWrapper.appendChild(row);
      });
    });
  });
}

// Setup Edit/Delete buttons
function setupEditDelete() {
  // Edit log
  document.querySelectorAll(".edit-log-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = btn.dataset.index;
      const log = logs[idx];
      editIndex = idx;
      addLogBtn.innerText = "Done";
      showForm(dailyLogWrapper);

      document.getElementById("date").value = log.date;
      document.getElementById("food").value = log.food;
      document.getElementById("energy").value = log.energy;
      document.getElementById("notes").value = log.notes || "";
      photoInput.value = "";

      const wrapper = document.getElementById("medications-wrapper");
      wrapper.innerHTML = "";
      log.meds.forEach((med) => {
        const row = document.createElement("div");
        row.className = "med-row flex-row";
        row.innerHTML = `
          <input type="text" class="medName" placeholder="Medicine Name" value="${med.name || ""
          }">
          <input type="number" class="medDosage" placeholder="Dosage (mg)" value="${med.dosage || ""
          }">
          <input type="number" class="medTimes" placeholder="Times per Day" value="${med.times || ""
          }">
        `;
        wrapper.appendChild(row);
      });

      const existingPhotoContainer = document.getElementById(
        "existingPhotoContainer"
      );
      const photoLabel = document.getElementById("photo-label");
      if (log.photo) {
        existingPhotoContainer.innerHTML = `
          <img src="${log.photo}" alt="Existing Photo" style="max-width:150px; display:block; margin-bottom:5px;">
          <button type="button" id="deletePhotoBtn" class="secondary-btn">Delete Photo</button>
        `;
        photoLabel.innerText = "Upload different/new image";
        document
          .getElementById("deletePhotoBtn")
          .addEventListener("click", () => {
            log.photo = null;
            existingPhotoContainer.innerHTML = "";
            photoLabel.innerText = "Photo (optional)";
          });
      } else {
        existingPhotoContainer.innerHTML = "";
        photoLabel.innerText = "Photo (optional)";
      }
    });
  });

  // Delete log
  document.querySelectorAll(".delete-log-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = btn.dataset.index;
      const logId = logs[idx].id;

      if (!logId) return showNotification("Cannot delete log: no ID", "error");

      showConfirm("Are you sure you want to delete this log?").then(
        (confirmed) => {
          if (!confirmed) return;

          const formData = new FormData();
          formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

          fetch(`/ajax-delete-log/${logId}/`, {
            method: "POST",
            body: formData,
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                logs.splice(idx, 1); // remove from frontend array
                localStorage.setItem("petLogs", JSON.stringify(logs));
                displayLogs();
                showNotification("Log deleted successfully!");
              } else {
                showNotification(
                  "Failed to delete log: " + (data.error || ""),
                  "error"
                );
              }
            })
            .catch((err) => {
              console.error("Delete fetch error:", err);
              showNotification("Error deleting log", "error");
            });
        }
      );
    });
  });
}

// Submit/ edit log
logForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const logDateInput = document.getElementById("date").value;
  const logDate = new Date(logDateInput);
  const surgeryDate = petInfo.surgery_date
    ? new Date(petInfo.surgery_date)
    : null;

  if (surgeryDate && logDate < surgeryDate) {
    return showNotification("Log date cannot be before surgery date", "error");
  }

  // Gather medications
  const medRows = document.querySelectorAll("#medications-wrapper .med-row");
  const meds = Array.from(medRows).map((row) => ({
    name: row.querySelector(".medName").value || "",
    dosage: row.querySelector(".medDosage").value || "",
    times: row.querySelector(".medTimes").value || "",
  }));

  const file = photoInput.files[0];

  const finalizeLog = (photoData) => {
    const formData = new FormData();
    formData.append("pet", document.getElementById("petId").value);
    formData.append("date", logDateInput);
    formData.append("food", document.getElementById("food").value);
    formData.append("energy", document.getElementById("energy").value);
    formData.append("notes", document.getElementById("notes").value);
    formData.append("medications", JSON.stringify(meds));
    formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

    if (photoData) {
      fetch(photoData)
        .then((res) => res.blob())
        .then((blob) => {
          formData.append("photo", blob, file.name);
          sendLogRequest();
        });
    } else {
      sendLogRequest();
    }

    function sendLogRequest() {
      const isEdit = editIndex !== null;
      const url = isEdit
        ? `/ajax-update-log/${logs[editIndex].id}/`
        : "/ajax-create-log/";
      const method = "POST"; // ✅ always POST, even for edit

      fetch(url, { method, body: formData })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success)
            return showNotification("Error: " + JSON.stringify(data.errors));
          const newId = data.id ?? data.log_id;

          const newLog = {
            id: isEdit ? logs[editIndex].id : data.id,
            date: logDateInput,
            food: document.getElementById("food").value,
            energy: document.getElementById("energy").value,
            notes: document.getElementById("notes").value,
            meds: meds.length ? meds : [],
            photo: data.photo_url ?? (isEdit ? logs[editIndex]?.photo : null),
          };

          if (isEdit) {
            logs[editIndex] = newLog;
            editIndex = null;
          } else {
            logs.push(newLog);
          }

          localStorage.setItem("petLogs", JSON.stringify(logs));
          displayLogs();
          logForm.reset();
          addLogBtn.innerText = "Add Log";

          // Reset meds wrapper
          const wrapper = document.getElementById("medications-wrapper");
          wrapper.innerHTML = `<div class="med-row flex-row">
            <input type="text" class="medName" placeholder="Medicine Name">
            <input type="number" class="medDosage" placeholder="Dosage (mg)">
            <input type="number" class="medTimes" placeholder="Times per Day">
          </div>`;

          dailyLogWrapper.style.display = "none";
          displayPetInfo();
        })
        .catch((err) => console.error("Fetch error:", err));
    }
  };

  if (file) resizeImage(file, 300, 300, finalizeLog);
  else finalizeLog(null);
});

// Handle surgery date changes
function surgeryDateChanged(newDate) {
  if (!newDate) return;

  const surgery = new Date(newDate);
  logs.forEach((log) => {
    const logD = new Date(log.date);
    if (logD < surgery) {
      log.date = newDate; // adjust log date to surgery date
    }
  });
  localStorage.setItem("petLogs", JSON.stringify(logs));
  displayLogs();
}

// Copy last log
document.getElementById("copyAllBtn").addEventListener("click", () => {
  if (!logs.length) return showNotification("No previous logs to copy!");
  const lastLog = logs[logs.length - 1];

  document.getElementById("food").value = lastLog.food;
  document.getElementById("energy").value = lastLog.energy;
  document.getElementById("notes").value = lastLog.notes || "";

  const wrapper = document.getElementById("medications-wrapper");
  wrapper.innerHTML = "";
  lastLog.meds.forEach((med) => {
    const row = document.createElement("div");
    row.className = "med-row flex-row";
    row.innerHTML = `
      <input type="text" class="medName" placeholder="Medicine Name" value="${med.name || ""
      }">
      <input type="number" class="medDosage" placeholder="Dosage (mg)" value="${med.dosage || ""
      }">
      <input type="number" class="medTimes" placeholder="Times per Day" value="${med.times || ""
      }">
    `;
    wrapper.appendChild(row);
  });

  showNotification("Copied last log's data!");
});

// ============================
// AI SECTION
// ============================
const aiForm = document.getElementById("aiForm");
const aiQuestion = document.getElementById("aiQuestion");
const aiAnswer = document.getElementById("aiAnswer");
const aiAnswerWrapper = document.getElementById("aiAnswerWrapper");
const aiFollowupBtn = document.getElementById("aiFollowupBtn");

function getCsrfToken() {
  const csrfTokenEl = document.querySelector("[name=csrfmiddlewaretoken]");
  return csrfTokenEl ? csrfTokenEl.value : "";
}

async function sendAiRequest(option, questionText = "") {
  aiAnswerWrapper.style.display = "block";
  aiAnswer.innerText =
    option === "summary"
      ? "Analyzing recovery... 🤖"
      : "Thinking about your question... 🤔";

  const formData = new FormData();
  formData.append("logs", JSON.stringify(logs || [])); // reuse your logs var
  formData.append("option", option);

  if (option === "question" && questionText.trim()) {
    formData.append("question", questionText.trim());
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    formData.append("csrfmiddlewaretoken", csrfToken);
  }

  try {
    const res = await fetch("/ai-helper/", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    aiAnswer.innerText =
      data.generated_text || "No AI answer 🐶 (empty response)";
    console.log("AI response data:", data);
  } catch (err) {
    console.error(err);
    aiAnswer.innerText = "Error: " + err.message;
  }
}

// 1) Analyze Recovery (summary)
aiForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendAiRequest("summary");
});

// 2) Ask follow-up question
aiFollowupBtn.addEventListener("click", () => {
  const question = aiQuestion.value.trim();
  if (!question) {
    aiAnswer.innerText =
      "Please type a question first so I know what to help with. 🐾";
    aiAnswerWrapper.style.display = "block";
    return;
  }
  sendAiRequest("question", question);
  aiQuestion.value = "";
});

// DASHBOARD FORM LOGIC
// ============================
const showLogFormBtn = document.getElementById("showLogFormBtn");
const showAIFormBtn = document.getElementById("showAIFormBtn");
const exitLogBtn = document.getElementById("exitLogBtn");
const exitAIBtn = document.getElementById("exitAIBtn");
const backPetBtn = document.getElementById("exitPetInfoBtn");

dailyLogWrapper.style.display = "none";
aiSection.style.display = "none";

function showForm(formElement) {
  rightBoxes.style.display = "none";
  dailyLogWrapper.style.display = "none";
  aiSection.style.display = "none";
  petInfoWrapper.style.display = "none";
  petInfoDisplay.style.display = "none";
  vetInfoDisplay.style.display = "none";
  galleryDisplay.style.display = "none";
  const logHistoryDisplay = document.getElementById("logHistoryDisplay");
  if (logHistoryDisplay) logHistoryDisplay.style.display = "none";
  formElement.style.display = "block";
  window.scrollTo({ top: formElement.offsetTop, behavior: "smooth" });
}

showLogFormBtn.addEventListener("click", () => showForm(dailyLogWrapper));
showAIFormBtn.addEventListener("click", () => showForm(aiSection));

exitLogBtn.addEventListener("click", () => {
  dailyLogWrapper.style.display = "none";
  editIndex = null; // cancel any editing
  displayPetInfo();
  displayLogs();
});
backPetBtn.addEventListener("click", () => {
  // Cancel editing
  editIndex = null;

  // Restore form values from saved petInfo
  petType.value = petInfo.type || "";
  document.getElementById("petName").value = petInfo.name || "";
  document.getElementById("petAge").value = petInfo.age || "";
  document.getElementById("weight").value = petInfo.weight || "";
  breedSelect.value = petInfo.breed || "";
  document.getElementById("surgeryType").value = petInfo.surgeryType || "";
  document.getElementById("surgeryReason").value = petInfo.surgeryReason || "";

  petInfoWrapper.style.display = "none";
  displayPetInfo();
  displayLogs();
});
exitAIBtn.addEventListener("click", () => {
  aiSection.style.display = "none";
  if (aiAnswer) aiAnswer.innerText = "";
  if (aiAnswerWrapper) aiAnswerWrapper.style.display = "none";

  // Clear follow-up question textarea
  if (aiQuestion) aiQuestion.value = "";
  // ✅ restore everything dashboard-related
  displayPetInfo();
  displayLogs(); // optional, just to be sure logs are up to date
});
function showNotification(message, type = "success", duration = 3000) {
  const notif = document.getElementById("notification");
  notif.textContent = message;

  notif.style.background = type === "error" ? "#f44336" : "#4caf50";
  notif.style.display = "block"; // make sure it's visible

  notif.classList.add("show");
  notif.classList.remove("hide");

  setTimeout(() => {
    notif.classList.remove("show");
    notif.classList.add("hide");
    setTimeout(() => (notif.style.display = "none"), 300); // hide after animation
  }, duration);
}
function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("customConfirm");
    document.getElementById("confirmMessage").innerText = message;
    modal.classList.add("show");

    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    const cleanup = () => {
      modal.classList.remove("show");
      yesBtn.removeEventListener("click", yesHandler);
      noBtn.removeEventListener("click", noHandler);
    };

    const yesHandler = () => {
      cleanup();
      resolve(true);
    };
    const noHandler = () => {
      cleanup();
      resolve(false);
    };

    yesBtn.addEventListener("click", yesHandler);
    noBtn.addEventListener("click", noHandler);
  });
}
