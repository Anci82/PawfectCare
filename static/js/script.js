/* ============================
   LOGIN / HEADER
============================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded, JS running");
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
        <div class="login-group">
            <input type="text" id="loginUsername" placeholder="Username or email" />
            <input type="password" id="loginPassword" placeholder="Password" />
        </div>
        <div class="btn-group">
            <button id="loginBtn" class="primary-btn">Log In</button>
            <button id="registerBtn" class="secondary-btn">Register</button>
        </div>
    `;
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document
    .getElementById("registerBtn")
    .addEventListener("click", handleRegister);
}

function handleRegister() {
  // Replace headerRight with registration form
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
    renderPreLoginHeader(); // go back to login view
  });

  document.getElementById("regForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    fetch("/register/", {
      // Django endpoint
      method: "POST",
      body: formData,
    })
      .then((res) => res.json()) // or text depending on your view
      .then((data) => {
        if (data.success) {
          showNotification("Registration successful!");
          renderPreLoginHeader(); // go back to login view
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
        localStorage.removeItem("petLogs");
        localStorage.removeItem("petInfo");
        welcomeSection.style.display = "none";
        dashboardSection.style.display = "block";
        renderPostLoginHeader(data.username);
        fetchPetInfo();
        displayLogs();
      } else {
        showNotification("Login failed: " + data.error);
      }
    })
    .catch((err) => console.error("Login fetch error:", err));
}
// ========== ENTER KEY LISTENER ==========
document.addEventListener("DOMContentLoaded", () => {
  const loginInputs = document.querySelectorAll("#loginUsername, #loginPassword");
  loginInputs.forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleLogin();
      }
    });
  });
});
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
        renderPreLoginHeader();
      }
    });
}

function renderPostLoginHeader(username) {
  headerRight.innerHTML = `
        <span class="user-icon">👤</span>
        <span class="username">${username}</span>
        <button id="signOutBtn" class="secondary-btn">Sign Out</button>
    `;
  document.getElementById("signOutBtn").addEventListener("click", handleLogout);
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

renderPreLoginHeader();
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

let petInfo = {};

function fetchPetInfo() {
  fetch("/ajax-user-pets/")
    .then((res) => res.json())
    .then((data) => {
      if (data.length > 0) {
        petInfo = data[0]; // assuming first pet
        petInfo.id && (document.getElementById("petId").value = petInfo.id);
        petIdInput.value = petInfo.id;
      } else {
        petInfo = {};
      }
      displayPetInfo();
    })
    .catch((err) => console.error("Error fetching pet info:", err));
}

function displayPetInfo() {
  if (!petInfo.type) {
    petInfoWrapper.style.display = "block";
    petInfoDisplay.style.display = "none";
    rightBoxes.style.display = "none";
    document.getElementById("logHistoryDisplay").style.display = "none";
    return;
  }
  document.getElementById("petId").value = petInfo.id || "";
  petInfoContent.innerHTML = `
      <strong>Type:</strong> ${petInfo.type}<br>
        <strong>Name:</strong> ${petInfo.name || "—"}<br>
        <strong>Age:</strong> ${petInfo.age}<br>
    <strong>Weight:</strong> ${petInfo.weight != null ? petInfo.weight : "—"}<br>
    <strong>Breed:</strong> ${petInfo.breed || "—"}<br>
    <strong>Surgery:</strong> ${petInfo.surgery_type || "—"}<br>
    <strong>Surgery Date:</strong> ${petInfo.surgery_date || "—"}<br>
    <strong>Reason / Notes:</strong> ${petInfo.surgery_reason || "—"}<br>
    <button type="button" id="editPetInfo" class="primary-btn">Edit Pet Info</button>
    `;

  petInfoWrapper.style.display = "none";
  petInfoDisplay.style.display = "block";
  rightBoxes.style.display = "flex";
  document.getElementById("logHistoryDisplay").style.display = "block";

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
    rightBoxes.style.display = "none";
    document.getElementById("logHistoryDisplay").style.display = "none";
  });
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
   DAILY LOGS
============================ */
function fetchPetLogs(petId) {
  if (!petId) return;

  fetch(`/ajax-pet-logs/${petId}/`)
    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.logs.length) {
        logs = [];
        displayLogs(); // show "No logs yet" from your current displayLogs()
        return;
      }
      logs = data.logs.map(log => ({
        id: log.id,
        date: log.date,
        food: log.food,
        energy: log.energy,
        notes: log.notes,
        meds: log.meds,
        photo: log.photo_url
      }));
      displayLogs();
    })
    .catch(err => console.error("Error fetching pet logs:", err));
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
  newRow.querySelectorAll("input").forEach(input => input.value = "");
  wrapper.appendChild(newRow);
});

// Display logs
function displayLogs() {
  const logList = document.getElementById("logList");
  logList.innerHTML = "";

  logs.forEach((log, idx) => {
    let dayLabel = "";
    if (petInfo.surgery_date) {
      const surgery = new Date(petInfo.surgery_date);
      const logD = new Date(log.date);
      const diffDays = Math.floor((logD - surgery) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
      dayLabel = `Day ${diffDays} (pre-surgery)`;
    } else {
      dayLabel = `Day ${diffDays}`;
    }
  
    }

    const medStr = log.meds.map(m => `${m.name || "—"} (${m.dosage || 0}mg x ${m.times || 0})`).join(", ");

    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `
      <div class="log-header">
        <span>${log.date} ${dayLabel ? `— ${dayLabel}` : ""}</span>
        <span>▶</span>
      </div>
      <div class="log-content">
        <strong>Food:</strong> ${log.food}<br>
        <strong>Medicine:</strong> ${medStr}<br>
        <strong>Energy:</strong> ${log.energy}<br>
        <strong>Notes:</strong> ${log.notes || "—"}<br>
        ${log.photo ? `<img src="${log.photo}" alt="Pet Photo" class="log-photo"><br>` : ""}
        <button type="button" class="primary-btn edit-log-btn" data-index="${idx}">Edit</button>
        <button type="button" class="primary-btn delete-log-btn" data-index="${idx}">Delete</button>
      </div>
    `;
    div.querySelector(".log-header").addEventListener("click", () => div.classList.toggle("active"));
    logList.appendChild(div);
  });

  setupEditDelete();
}

// Setup Edit/Delete buttons
function setupEditDelete() {
  // Edit log
  document.querySelectorAll(".edit-log-btn").forEach(btn => {
    btn.addEventListener("click", e => {
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
      log.meds.forEach(med => {
        const row = document.createElement("div");
        row.className = "med-row flex-row";
        row.innerHTML = `
          <input type="text" class="medName" placeholder="Medicine Name" value="${med.name || ""}">
          <input type="number" class="medDosage" placeholder="Dosage (mg)" value="${med.dosage || ""}">
          <input type="number" class="medTimes" placeholder="Times per Day" value="${med.times || ""}">
        `;
        wrapper.appendChild(row);
      });

      const existingPhotoContainer = document.getElementById("existingPhotoContainer");
      const photoLabel = document.getElementById("photo-label");
      if (log.photo) {
        existingPhotoContainer.innerHTML = `
          <img src="${log.photo}" alt="Existing Photo" style="max-width:150px; display:block; margin-bottom:5px;">
          <button type="button" id="deletePhotoBtn" class="secondary-btn">Delete Photo</button>
        `;
        photoLabel.innerText = "Upload different/new image";
        document.getElementById("deletePhotoBtn").addEventListener("click", () => {
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
  document.querySelectorAll(".delete-log-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    e.stopPropagation();
    const idx = btn.dataset.index;
    const logId = logs[idx].id;

    if (!logId) return showNotification("Cannot delete log: no ID", "error");

    showConfirm("Are you sure you want to delete this log?").then(confirmed => {
      if (!confirmed) return;

      const formData = new FormData();
      formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

      fetch(`/ajax-delete-log/${logId}/`, {
        method: "POST",
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          logs.splice(idx, 1); // remove from frontend array
          localStorage.setItem("petLogs", JSON.stringify(logs));
          displayLogs();
          showNotification("Log deleted successfully!");
        } else {
          showNotification("Failed to delete log: " + (data.error || ""), "error");
        }
      })
      .catch(err => {
        console.error("Delete fetch error:", err);
        showNotification("Error deleting log", "error");
      });
    });
  });
});

}

// Submit log
logForm.addEventListener("submit", e => {
  e.preventDefault();

  const logDateInput = document.getElementById("date").value;
  const logDate = new Date(logDateInput);
  const surgeryDate = petInfo.surgery_date ? new Date(petInfo.surgery_date) : null;

  // Check surgery date
  if (surgeryDate && logDate < surgeryDate) {
    return showNotification("Log date cannot be before surgery date", "error");
  }

  // Gather medications
  const medRows = document.querySelectorAll("#medications-wrapper .med-row");
  const meds = Array.from(medRows).map(row => ({
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

    const sendForm = () => {
      fetch("/ajax-create-log/", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
          if (!data.success) return showNotification("Error: " + JSON.stringify(data.errors));

          // Build new log, merging old values if editing
          let newLog = {
            id: data.id,
            date: logDateInput,
            food: document.getElementById("food").value,
            energy: document.getElementById("energy").value,
            notes: document.getElementById("notes").value,
            meds: meds.length ? meds : [],
            photo: data.photo_url ?? (editIndex !== null ? logs[editIndex]?.photo : null),
          };

          if (editIndex !== null) {
            // Merge old meds and notes if user left them blank
            const oldLog = logs[editIndex];
            newLog = {
              ...oldLog,
              ...newLog,
              meds: meds.length ? meds : oldLog.meds,
              notes: document.getElementById("notes").value || oldLog.notes,
              photo: data.photo_url ?? oldLog.photo,
            };
            logs[editIndex] = newLog;
            editIndex = null;
          } else {
            logs.push(newLog);
          }

          // Save and display
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
        .catch(err => console.error("Fetch error:", err));
    };

    if (photoData) {
      fetch(photoData)
        .then(res => res.blob())
        .then(blob => {
          formData.append("photo", blob, file.name);
          sendForm();
        });
    } else {
      sendForm();
    }
  };

  if (file) resizeImage(file, 300, 300, finalizeLog);
  else finalizeLog(null);
});


// Handle surgery date changes
function surgeryDateChanged(newDate) {
  if (!newDate) return;

  const surgery = new Date(newDate);
  logs.forEach(log => {
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
  lastLog.meds.forEach(med => {
    const row = document.createElement("div");
    row.className = "med-row flex-row";
    row.innerHTML = `
      <input type="text" class="medName" placeholder="Medicine Name" value="${med.name || ""}">
      <input type="number" class="medDosage" placeholder="Dosage (mg)" value="${med.dosage || ""}">
      <input type="number" class="medTimes" placeholder="Times per Day" value="${med.times || ""}">
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
const aiOption = document.getElementById("aiOption");

// Enable/disable textarea based on dropdown
aiOption.addEventListener("change", function () {
  aiQuestion.disabled = this.value !== "question";
});

aiForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  aiAnswer.innerText = "Thinking... 🤖";

  const option = aiOption.value;
  const question = aiQuestion.value.trim();

  // Always include recent logs for context
  const formData = new FormData();
  formData.append("logs", JSON.stringify(logs));
  formData.append("option", option);
  if (option === "question" && question) {
    formData.append("question", question);
  }

  // CSRF token
  const csrfTokenEl = document.querySelector("[name=csrfmiddlewaretoken]");
  if (csrfTokenEl) {
    formData.append("csrfmiddlewaretoken", csrfTokenEl.value);
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

  aiQuestion.value = ""; // reset textarea
});

// ============================
// SIMPLE AI TEST
// ============================
// const aiForm = document.getElementById("aiForm");
// const aiAnswer = document.getElementById("aiAnswer");

// aiForm.addEventListener("submit", async (e) => {
//   e.preventDefault();
//   aiAnswer.innerText = "Thinking... 🤖";

//   try {
//     const res = await fetch("/ai-helper/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "X-CSRFToken": getCookie("csrftoken"), // if CSRF is on
//       },
//       // Right now Django ignores this body, but keep structure for later
//       body: JSON.stringify({ prompt: "ignore me, Django is hardcoding" }),
//     });

//     if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

//     const data = await res.json();
//     console.log("AI response data:", data);

//     aiAnswer.innerText = data.generated_text || "No AI answer 🐶";
//   } catch (err) {
//     console.error("AI error:", err);
//     aiAnswer.innerText = "Error: " + err.message;
//   }
// });




// const aiForm = document.getElementById("aiForm");
// const aiQuestion = document.getElementById("aiQuestion");
// const aiAnswer = document.getElementById("aiAnswer");
// const aiOption = document.getElementById("aiOption");

// aiOption.addEventListener("change", function () {
//   aiQuestion.disabled = this.value !== "question";
// });

// aiForm.addEventListener("submit", async (e) => {
//   e.preventDefault();
//   aiAnswer.innerText = "Thinking... 🤖";

//   // Log everything before sending
//   console.log("=== LOGS BEFORE SENDING ===");
//   console.log(logs);

//   const formData = new FormData();
//   formData.append("logs", JSON.stringify(logs)); // send logs array
//   formData.append("question", aiQuestion.value || "");

//   // CSRF token from page
//   const csrfTokenEl = document.querySelector('[name=csrfmiddlewaretoken]');
//   if (csrfTokenEl) {
//     formData.append("csrfmiddlewaretoken", csrfTokenEl.value);
//   }

//   try {
//     const res = await fetch("/ai-helper/", {
//       method: "POST",
//       body: formData,
//     });

//     if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//     const data = await res.json();
//     aiAnswer.innerText = data[0]?.generated_text || "No AI answer 🐶";
//   } catch (err) {
//     console.error(err);
//     aiAnswer.innerText = "Error: " + err.message;
//   }
// });

// aiForm.addEventListener("submit", function (e) {
//   e.preventDefault();
//   const option = aiOption.value;
//   const recentLogs = logs
//     .slice(-7)
//     .map((log) => {
//       const meds = log.meds
//         .map((m) => `${m.name || "—"} (${m.dosage || 0}mg x ${m.times || 0})`)
//         .join(", ");
//       return `${log.date}: Food ${log.food}, Meds ${meds}, Energy ${
//         log.energy
//       }, Notes: ${log.notes || "—"}, Photo ${log.photo ? "uploaded" : "none"}`;
//     })
//     .join("\n");

//   let prompt = `Pet: ${petInfo.type || "Unknown"} (${
//     petInfo.age || "?"
//   } years, ${petInfo.breed || "Unknown breed"})\nSurgery: ${
//     petInfo.surgery_type || "Unknown"
//   }\nReason: ${
//     petInfo.surgery_reason || "—"
//   }\n\nRecovery logs (last 7 days):\n${recentLogs}\n`;

//   if (option === "question") {
//     const question = aiQuestion.value.trim();
//     if (!question) return;
//     prompt += `Owner question: "${question}"`;
//   } else {
//     prompt += "Please provide a recovery analysis based on the logs.";
//   }

//   aiAnswer.innerText = "Preparing AI response...\n\n" + prompt;
//   aiQuestion.value = "";
// });

// ============================
// RESET ALL DATA
// ============================
function resetAllData() {
  if (confirm("Are you sure you want to clear all pet info and logs?")) {
    localStorage.removeItem("petInfo");
    localStorage.removeItem("petLogs");
    petInfo = {};
    logs = [];
    petInfoContent.innerText = "No pet info saved yet.";
    displayLogs();
    petInfoForm.reset();
    logForm.reset();
    petInfoWrapper.style.display = "block";
    rightBoxes.style.display = "none";
    showNotification("All data cleared!");
  }
}

// ============================
// DASHBOARD FORM LOGIC
// ============================
const showLogFormBtn = document.getElementById("showLogFormBtn");
const showAIFormBtn = document.getElementById("showAIFormBtn");
const exitLogBtn = document.getElementById("exitLogBtn");
const exitAIBtn = document.getElementById("exitAIBtn");

dailyLogWrapper.style.display = "none";
aiSection.style.display = "none";

function showForm(formElement) {
  rightBoxes.style.display = "none";
  dailyLogWrapper.style.display = "none";
  aiSection.style.display = "none";
  petInfoWrapper.style.display = "none";
  petInfoDisplay.style.display = "none";
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
exitAIBtn.addEventListener("click", () => {
  aiSection.style.display = "none";
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
    setTimeout(() => notif.style.display = "none", 300); // hide after animation
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

    const yesHandler = () => { cleanup(); resolve(true); };
    const noHandler = () => { cleanup(); resolve(false); };

    yesBtn.addEventListener("click", yesHandler);
    noBtn.addEventListener("click", noHandler);
  });
}


