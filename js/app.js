/* DATABASE */

let users = JSON.parse(localStorage.getItem("users")) || [];
let logs = JSON.parse(localStorage.getItem("logs")) || [];
let pendingApprovals = JSON.parse(localStorage.getItem("pendingApprovals")) || [];

let selectedStore = localStorage.getItem("selectedStore");
let selectedCompany = localStorage.getItem("selectedCompany");

const companies = {
  POZITIF: [
    { code: "POZ-M001", name: "Pozitif Matbaa - Merkez" }
  ],
  SKX: [
    { code: "SKX-M085", name: "SKX - M085" },
    { code: "SKX-M086", name: "SKX - M086" }
  ],
  LTB: [
    { code: "LTB-M201", name: "LTB - M201" }
  ],
  DEMO: [
    { code: "DEMO-M001", name: "Demo Mağaza" }
  ]
};

/* MASTER */

const MASTER_CODE = "9-9-999";
const MASTER_PASSWORD = "1234";

/* MANAGERS */

const managers = [
  { code: "M085-ADMIN", password: "1234", store: "SKX-M085" },
  { code: "M086-ADMIN", password: "1234", store: "SKX-M086" },
  { code: "LTB-ADMIN", password: "1234", store: "LTB-M201" },
  { code: "POZ-ADMIN", password: "1234", store: "POZ-M001" },
  { code: "DEMO-ADMIN", password: "1234", store: "DEMO-M001" }
];

/* QR */

let qrScanner = null;
let qrRunning = false;
let qrProcessed = false;

/* ACTION */

let currentAction = "LOGIN";

/* INIT */

function initApp() {
  if (selectedCompany && selectedStore) {
    document.getElementById("companyPage").style.display = "none";
    document.getElementById("storePage").style.display = "none";
    document.getElementById("homePage").style.display = "block";
  } else if (selectedCompany) {
    document.getElementById("companyPage").style.display = "none";
    document.getElementById("storePage").style.display = "block";
    document.getElementById("homePage").style.display = "none";
    renderStoreOptions();
  } else {
    document.getElementById("companyPage").style.display = "block";
    document.getElementById("storePage").style.display = "none";
    document.getElementById("homePage").style.display = "none";
  }

  updateCounters();
  renderLogs();
}

/* STORE */

function saveCompany() {
  selectedCompany = document.getElementById("companySelect").value;

  localStorage.setItem("selectedCompany", selectedCompany);
  localStorage.removeItem("selectedStore");

  selectedStore = null;

  document.getElementById("companyPage").style.display = "none";
  document.getElementById("storePage").style.display = "block";
  document.getElementById("homePage").style.display = "none";

  renderStoreOptions();
}

function renderStoreOptions() {
  const select = document.getElementById("storeSelect");
  if (!select) return;

  select.innerHTML = "";

  const list = companies[selectedCompany] || [];

  list.forEach(store => {
    const option = document.createElement("option");
    option.value = store.code;
    option.textContent = store.name;
    select.appendChild(option);
  });
}

function saveStore() {
  selectedStore = document.getElementById("storeSelect").value;

  localStorage.setItem("selectedStore", selectedStore);

  document.getElementById("storePage").style.display = "none";
  document.getElementById("homePage").style.display = "block";
}

/* UI */

function hideAll() {
  const panels = [
    "companyPage",
    "storePage",
    "homePage",
    "personPanel",
    "managerPanel",
    "regionPanel",
    "managerLoginPanel",
    "regionLoginPanel"
  ];

  panels.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function goHome() {
  hideAll();
  document.getElementById("homePage").style.display = "block";
  stopScanner();
}

function openPersonPanel() {
  hideAll();
  document.getElementById("personPanel").style.display = "block";
}

function openManagerLogin() {
  hideAll();
  document.getElementById("managerLoginPanel").style.display = "block";
}

function openRegionLogin() {
  hideAll();
  document.getElementById("regionLoginPanel").style.display = "block";
}

/* ACTION */

function setAction(action) {
  currentAction = action;

  ["loginAction", "breakAction", "returnAction", "exitAction"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("selectedAction");
  });

  if (action === "LOGIN") {
    document.getElementById("loginAction")?.classList.add("selectedAction");
  }

  if (action === "BREAK") {
    document.getElementById("breakAction")?.classList.add("selectedAction");
  }

  if (action === "RETURN") {
    document.getElementById("returnAction")?.classList.add("selectedAction");
  }

  if (action === "EXIT") {
    document.getElementById("exitAction")?.classList.add("selectedAction");
  }
}

/* LOGS */

function createLog(text) {
  logs.unshift({
    company: selectedCompany,
    store: selectedStore,
    text,
    time: new Date().toLocaleString()
  });

  localStorage.setItem("logs", JSON.stringify(logs));

  renderLogs();
  renderRegionLogs();
}

/* PENDING */

function createPending(text) {
  pendingApprovals.unshift({
    company: selectedCompany,
    store: selectedStore,
    text,
    time: new Date().toLocaleString()
  });

  localStorage.setItem("pendingApprovals", JSON.stringify(pendingApprovals));

  renderPending();
}

function renderPending() {
  const area = document.getElementById("pendingArea");
  if (!area) return;

  area.innerHTML = "";

  pendingApprovals
    .filter(p => p.store === selectedStore)
    .forEach((item, index) => {
      area.innerHTML += `
        <div class="pendingBox">
          ⚠️ ${item.text}<br>
          <small>${item.time}</small>

          <button class="loginBtn green" onclick="approvePending(${index})">
            Onayla
          </button>

          <button class="loginBtn red" onclick="rejectPending(${index})">
            Reddet
          </button>
        </div>
      `;
    });
}

function approvePending(index) {
  pendingApprovals.splice(index, 1);
  localStorage.setItem("pendingApprovals", JSON.stringify(pendingApprovals));
  renderPending();
}

function rejectPending(index) {
  pendingApprovals.splice(index, 1);
  localStorage.setItem("pendingApprovals", JSON.stringify(pendingApprovals));
  renderPending();
}

/* MANAGER LOGIN */

function managerLogin() {
  const code = document.getElementById("managerCode").value.trim();
  const password = document.getElementById("managerPassword").value.trim();

  const manager = managers.find(
    m => m.code === code && m.password === password
  );

  if (!manager) {
    alert("Bilgiler yanlış");
    return;
  }

  if (manager.store !== selectedStore) {
    alert("Bu mağaza için yetkiniz yok");
    return;
  }

  hideAll();

  document.getElementById("managerPanel").style.display = "block";

  updateCounters();
  renderLogs();
  renderPending();
}

/* MASTER LOGIN */

function regionLogin() {
  const code = document.getElementById("regionCode").value.trim();
  const password = document.getElementById("regionPassword").value.trim();

  if (code !== MASTER_CODE || password !== MASTER_PASSWORD) {
    alert("Erişim reddedildi");
    return;
  }

  hideAll();

  document.getElementById("regionPanel").style.display = "block";

  renderRegionLogs();
}

/* QR */

async function stopScanner() {
  try {
    if (qrScanner) {
      await qrScanner.stop();
      await qrScanner.clear();
      qrScanner = null;
    }
  } catch (e) {}

  const reader = document.getElementById("reader");

  if (reader) {
    reader.innerHTML = "";
    reader.style.display = "none";
  }

  qrRunning = false;
  qrProcessed = false;
}

async function startQRScanner() {
  if (qrRunning) return;

  const code = document.getElementById("personCode").value.trim();

  if (!code) {
    alert("Personel kodu gerekli");
    return;
  }

  await stopScanner();

  qrRunning = true;

  document.getElementById("reader").style.display = "block";

  qrScanner = new Html5Qrcode("reader");

  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 5, qrbox: 200 },
      async decodedText => {
        if (qrProcessed) return;

        qrProcessed = true;

        await stopScanner();

        if (decodedText !== "STORE:" + selectedStore) {
          createPending("Yanlış mağaza QR");
          alert("Geçersiz QR");
          return;
        }

        processAction(code);
      },
      () => {}
    );
  } catch (e) {
    await stopScanner();
    alert("Kamera açılamadı");
  }
}

/* PROCESS */

function processAction(code) {
  if (currentAction === "LOGIN") {
    const exists = users.find(
      u => u.code === code && u.store === selectedStore
    );

    if (exists) {
      createPending("Çoklu giriş: " + code);
      alert("Yönetici onayı gerekli");
      return;
    }

    users.push({
      code,
      company: selectedCompany,
      store: selectedStore,
      status: "ACTIVE",
      loginTime: Date.now(),
      breakStart: null,
      totalBreakMinutes: 0
    });

    localStorage.setItem("users", JSON.stringify(users));

    createLog("✅ " + code + " giriş yaptı");

    updateCounters();

    alert("Giriş başarılı");
  }

  if (currentAction === "BREAK") {
    const userIndex = users.findIndex(
      u => u.code === code && u.store === selectedStore
    );

    if (userIndex === -1) {
      createPending("Girişsiz mola: " + code);
      alert("Önce giriş yapılmalı");
      return;
    }

    if (users[userIndex].status === "BREAK") {
      alert("Personel zaten molada");
      return;
    }

    users[userIndex].status = "BREAK";
    users[userIndex].breakStart = Date.now();

    localStorage.setItem("users", JSON.stringify(users));

    createLog("☕ " + code + " mola başlattı");

    updateCounters();

    alert("Mola başladı");
  }

  if (currentAction === "RETURN") {
    const userIndex = users.findIndex(
      u => u.code === code && u.store === selectedStore
    );

    if (userIndex === -1) {
      alert("Personel bulunamadı");
      return;
    }

    if (users[userIndex].status !== "BREAK") {
      alert("Personel molada değil");
      return;
    }

    const start = users[userIndex].breakStart || Date.now();

    const minutes = Math.max(
      1,
      Math.round((Date.now() - start) / 60000)
    );

    users[userIndex].status = "ACTIVE";
    users[userIndex].breakStart = null;
    users[userIndex].totalBreakMinutes =
      (users[userIndex].totalBreakMinutes || 0) + minutes;

    localStorage.setItem("users", JSON.stringify(users));

    createLog("✅ " + code + " moladan döndü (" + minutes + " dk)");

    updateCounters();

    alert("Mola tamamlandı: " + minutes + " dk");
  }

  if (currentAction === "EXIT") {
    const exists = users.find(
      u => u.code === code && u.store === selectedStore
    );

    if (!exists) {
      createPending("Geçersiz çıkış: " + code);
      alert("Onay gerekli");
      return;
    }

    users = users.filter(
      u => !(u.code === code && u.store === selectedStore)
    );

    localStorage.setItem("users", JSON.stringify(users));

    createLog("👋 " + code + " çıkış yaptı");

    updateCounters();

    alert("Çıkış başarılı");
  }
}

/* COUNTERS */

function updateCounters() {
  const activeEl = document.getElementById("activeCount");
  const breakEl = document.getElementById("breakCount");
  const exitEl = document.getElementById("exitCount");

  if (activeEl) {
    activeEl.innerText = users.filter(
      u => u.store === selectedStore && u.status === "ACTIVE"
    ).length;
  }

  if (breakEl) {
    breakEl.innerText = users.filter(
      u => u.store === selectedStore && u.status === "BREAK"
    ).length;
  }

  if (exitEl) {
    exitEl.innerText = logs.filter(
      l => l.store === selectedStore && l.text.includes("çıkış")
    ).length;
  }
}

/* RENDER LOGS */

function renderLogs() {
  const area = document.getElementById("logsArea");
  if (!area) return;

  area.innerHTML = "";

  logs
    .filter(l => l.store === selectedStore)
    .forEach(log => {
      area.innerHTML += `
        <div class="log">
          🏪 ${log.store}<br>
          ${log.text}<br>
          <small>${log.time}</small>
        </div>
      `;
    });
}

function renderRegionLogs() {
  const area = document.getElementById("regionLogs");
  if (!area) return;

  area.innerHTML = "";

  logs.forEach(log => {
    area.innerHTML += `
      <div class="log">
        🏪 ${log.store}<br>
        ${log.text}<br>
        <small>${log.time}</small>
      </div>
    `;
  });
}

/* INIT */

initApp();

console.log("AL METHER WORKFORCE APP LOADED");