/* AL METHER WORKFORCE - APP.JS v2.1 */

/* DEFAULT DATA */

const DEFAULT_COMPANIES = {
  POZITIF: [
    { code: "POZ-M001", name: "Pozitif Matbaa - Merkez", lat: null, lng: null, radius: 150 }
  ],
  SKX: [
    { code: "SKX-M085", name: "SKX - M085", lat: null, lng: null, radius: 150 },
    { code: "SKX-M086", name: "SKX - M086", lat: null, lng: null, radius: 150 }
  ],
  LTB: [
    { code: "LTB-M201", name: "LTB - M201", lat: null, lng: null, radius: 150 }
  ],
  DEMO: [
    { code: "DEMO-M001", name: "Demo Mağaza", lat: null, lng: null, radius: 150 }
  ]
};

const MASTER_CODE = "9-9-999";
const MASTER_PASSWORD = "1234";

/* DATABASE */

let companies = JSON.parse(localStorage.getItem("companiesDB")) || DEFAULT_COMPANIES;
let users = JSON.parse(localStorage.getItem("users")) || [];
let logs = JSON.parse(localStorage.getItem("logs")) || [];
let pendingApprovals = JSON.parse(localStorage.getItem("pendingApprovals")) || [];
let personnelDB = JSON.parse(localStorage.getItem("personnelDB")) || [];
let managersDB = JSON.parse(localStorage.getItem("managersDB")) || [];
let regionsDB = JSON.parse(localStorage.getItem("regionsDB")) || [];

let selectedStore = localStorage.getItem("selectedStore");
let selectedCompany = localStorage.getItem("selectedCompany");

let qrScanner = null;
let qrRunning = false;
let qrProcessed = false;
let currentAction = "LOGIN";
let lastLocationResult = null;

/* SEED */

function seedDefaultData() {
  localStorage.setItem("companiesDB", JSON.stringify(companies));

  if (!managersDB || managersDB.length === 0) {
    managersDB = [
      { code: "M085-ADMIN", password: "1234", name: "M085 Yönetici", company: "SKX", store: "SKX-M085" },
      { code: "M086-ADMIN", password: "1234", name: "M086 Yönetici", company: "SKX", store: "SKX-M086" },
      { code: "LTB-ADMIN", password: "1234", name: "LTB Yönetici", company: "LTB", store: "LTB-M201" },
      { code: "POZ-ADMIN", password: "1234", name: "Pozitif Yönetici", company: "POZITIF", store: "POZ-M001" },
      { code: "DEMO-ADMIN", password: "1234", name: "Demo Yönetici", company: "DEMO", store: "DEMO-M001" }
    ];
    localStorage.setItem("managersDB", JSON.stringify(managersDB));
  }

  if (!regionsDB || regionsDB.length === 0) {
    regionsDB = [
      {
        code: "BOLGE-ADMIN",
        password: "1234",
        name: "Bölge Müdürü",
        companies: ["POZITIF", "SKX", "LTB", "DEMO"]
      }
    ];
    localStorage.setItem("regionsDB", JSON.stringify(regionsDB));
  }
}

/* INIT */

function initApp() {
  seedDefaultData();
  prepareBreakButtonUI();
  renderCompanyOptions();
  hideAll();

  if (selectedCompany && selectedStore) {
    document.getElementById("homePage").style.display = "block";
  } else if (selectedCompany) {
    document.getElementById("storePage").style.display = "block";
    renderStoreOptions();
  } else {
    document.getElementById("companyPage").style.display = "block";
  }

  updateCounters();
  renderLogs();
  renderRegionLogs();
  renderAdminLogs();
  renderPersonnelList();
}

/* STORE */

function renderCompanyOptions() {
  const select = document.getElementById("companySelect");
  if (!select) return;

  select.innerHTML = "";

  Object.keys(companies).forEach(companyCode => {
    const option = document.createElement("option");
    option.value = companyCode;
    option.textContent = companyCode;
    select.appendChild(option);
  });

  if (selectedCompany && companies[selectedCompany]) {
    select.value = selectedCompany;
  }
}

function saveCompany() {
  selectedCompany = document.getElementById("companySelect").value;
  localStorage.setItem("selectedCompany", selectedCompany);

  localStorage.removeItem("selectedStore");
  selectedStore = null;

  hideAll();
  document.getElementById("storePage").style.display = "block";
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

  if (!selectedStore) {
    alert("Mağaza seçilmedi");
    return;
  }

  localStorage.setItem("selectedStore", selectedStore);

  hideAll();
  document.getElementById("homePage").style.display = "block";
}

/* UI */

function hideAll() {
  [
    "companyPage",
    "storePage",
    "homePage",
    "personPanel",
    "managerPanel",
    "regionPanel",
    "adminPanel",
    "managerLoginPanel",
    "regionLoginPanel"
  ].forEach(id => {
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
  setAction("LOGIN");
}

function openManagerLogin() {
  hideAll();
  document.getElementById("managerLoginPanel").style.display = "block";
}

function openRegionLogin() {
  hideAll();
  document.getElementById("regionLoginPanel").style.display = "block";
}

function prepareBreakButtonUI() {
  const breakBtn = document.getElementById("breakAction");
  const returnBtn = document.getElementById("returnAction");

  if (breakBtn) {
    breakBtn.textContent = "Mola";
    breakBtn.onclick = function () {
      setAction("BREAK");
    };
  }

  if (returnBtn) {
    returnBtn.style.display = "none";
  }
}

/* ACTION */

function setAction(action) {
  currentAction = action;

  ["loginAction", "breakAction", "returnAction", "exitAction"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("selectedAction");
  });

  const target =
    action === "LOGIN" ? "loginAction" :
    action === "BREAK" ? "breakAction" :
    action === "EXIT" ? "exitAction" :
    null;

  if (target) {
    document.getElementById(target)?.classList.add("selectedAction");
  }
}

/* HELPERS */

function saveAll() {
  localStorage.setItem("companiesDB", JSON.stringify(companies));
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("logs", JSON.stringify(logs));
  localStorage.setItem("pendingApprovals", JSON.stringify(pendingApprovals));
  localStorage.setItem("personnelDB", JSON.stringify(personnelDB));
  localStorage.setItem("managersDB", JSON.stringify(managersDB));
  localStorage.setItem("regionsDB", JSON.stringify(regionsDB));
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentStoreInfo() {
  const list = companies[selectedCompany] || [];
  return list.find(s => s.code === selectedStore) || null;
}

function getPersonnel(code) {
  return personnelDB.find(p => p.code === code && p.store === selectedStore);
}

function getActiveUser(code) {
  return users.find(u => u.code === code && u.store === selectedStore);
}

function generateId() {
  return "ID-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
}

/* LOGS */

function createLog(text, extra = {}) {
  logs.unshift({
    id: generateId(),
    company: selectedCompany,
    store: selectedStore,
    text,
    time: new Date().toLocaleString("tr-TR"),
    timestamp: Date.now(),
    ...extra
  });

  saveAll();

  renderLogs();
  renderRegionLogs();
  renderAdminLogs();
}

function createPending(text, extra = {}) {
  pendingApprovals.unshift({
    id: generateId(),
    company: selectedCompany,
    store: selectedStore,
    text,
    time: new Date().toLocaleString("tr-TR"),
    timestamp: Date.now(),
    ...extra
  });

  saveAll();
  renderPending();
}

function renderPending() {
  const area = document.getElementById("pendingArea");
  if (!area) return;

  const list = pendingApprovals.filter(p => p.store === selectedStore);

  if (list.length === 0) {
    area.innerHTML = "";
    return;
  }

  area.innerHTML = "<h3 style='margin-top:20px;'>Yönetici Onayı Bekleyenler</h3>";

  list.forEach(item => {
    area.innerHTML += `
      <div class="pendingBox">
        ⚠️ ${escapeHTML(item.text)}<br>
        <small>${escapeHTML(item.time)}</small>

        <button class="loginBtn green" onclick="approvePending('${item.id}')">
          Onayla
        </button>

        <button class="loginBtn red" onclick="rejectPending('${item.id}')">
          Reddet
        </button>
      </div>
    `;
  });
}

function approvePending(id) {
  const item = pendingApprovals.find(p => p.id === id);

  if (item) {
    createLog("✅ Yönetici onayı verildi: " + item.text);
  }

  pendingApprovals = pendingApprovals.filter(p => p.id !== id);
  saveAll();
  renderPending();
}

function rejectPending(id) {
  const item = pendingApprovals.find(p => p.id === id);

  if (item) {
    createLog("❌ Yönetici reddetti: " + item.text);
  }

  pendingApprovals = pendingApprovals.filter(p => p.id !== id);
  saveAll();
  renderPending();
}

/* LOGIN PANELS */

function openAdminPanel() {
  hideAll();
  document.getElementById("adminPanel").style.display = "block";
  renderAdminLogs();
}

function managerLogin() {
  const code = document.getElementById("managerCode").value.trim();
  const password = document.getElementById("managerPassword").value.trim();

  if (code === MASTER_CODE && password === MASTER_PASSWORD) {
    openAdminPanel();
    return;
  }

  const manager = managersDB.find(
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
  renderPersonnelList();
}

function regionLogin() {
  const code = document.getElementById("regionCode").value.trim();
  const password = document.getElementById("regionPassword").value.trim();

  if (code === MASTER_CODE && password === MASTER_PASSWORD) {
    openAdminPanel();
    return;
  }

  const region = regionsDB.find(
    r => r.code === code && r.password === password
  );

  if (!region) {
    alert("Bölge müdürü bilgileri yanlış");
    return;
  }

  hideAll();
  document.getElementById("regionPanel").style.display = "block";
  renderRegionLogs();
}

/* ADMIN PANEL */

function adminAddCompany() {
  const name = document.getElementById("adminCompanyName").value.trim();
  const code = document.getElementById("adminCompanyCode").value.trim().toUpperCase();

  if (!name || !code) {
    alert("Şirket adı ve kodu gerekli");
    return;
  }

  if (companies[code]) {
    alert("Bu şirket kodu zaten var");
    return;
  }

  companies[code] = [];

  selectedCompany = code;
  localStorage.setItem("selectedCompany", selectedCompany);
  localStorage.removeItem("selectedStore");
  selectedStore = null;

  saveAll();
  renderCompanyOptions();
  renderAdminLogs();

  document.getElementById("adminCompanyName").value = "";
  document.getElementById("adminCompanyCode").value = "";

  alert(name + " şirketi eklendi. Şimdi mağaza ekle.");
}

function adminAddStore() {
  const name = document.getElementById("adminStoreName").value.trim();
  const code = document.getElementById("adminStoreCode").value.trim().toUpperCase();
  const latRaw = document.getElementById("adminStoreLat").value.trim();
  const lngRaw = document.getElementById("adminStoreLng").value.trim();

  if (!selectedCompany) {
    alert("Önce şirket seç veya şirket ekle");
    return;
  }

  if (!name || !code) {
    alert("Mağaza adı ve kodu gerekli");
    return;
  }

  if (!companies[selectedCompany]) {
    companies[selectedCompany] = [];
  }

  const exists = companies[selectedCompany].find(s => s.code === code);

  if (exists) {
    alert("Bu mağaza kodu zaten var");
    return;
  }

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

  companies[selectedCompany].push({
    code,
    name,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    radius: 150
  });

  selectedStore = code;
  localStorage.setItem("selectedStore", selectedStore);

  saveAll();
  renderStoreOptions();
  renderAdminLogs();

  document.getElementById("adminStoreName").value = "";
  document.getElementById("adminStoreCode").value = "";
  document.getElementById("adminStoreLat").value = "";
  document.getElementById("adminStoreLng").value = "";

  alert("Mağaza eklendi: " + name);
}

function adminAddManager() {
  const name = document.getElementById("adminManagerName").value.trim();
  const code = document.getElementById("adminManagerCode").value.trim().toUpperCase();
  const password = document.getElementById("adminManagerPassword").value.trim();

  if (!selectedCompany || !selectedStore) {
    alert("Önce şirket ve mağaza seçili olmalı");
    return;
  }

  if (!name || !code || !password) {
    alert("Yönetici adı, kodu ve şifresi gerekli");
    return;
  }

  const exists = managersDB.find(m => m.code === code);

  if (exists) {
    alert("Bu yönetici kodu zaten var");
    return;
  }

  managersDB.push({
    id: generateId(),
    name,
    code,
    password,
    company: selectedCompany,
    store: selectedStore
  });

  saveAll();
  renderAdminLogs();

  document.getElementById("adminManagerName").value = "";
  document.getElementById("adminManagerCode").value = "";
  document.getElementById("adminManagerPassword").value = "";

  alert("Yönetici eklendi: " + name);
}

function adminAddRegion() {
  const name = document.getElementById("adminRegionName").value.trim();
  const code = document.getElementById("adminRegionCode").value.trim().toUpperCase();
  const password = document.getElementById("adminRegionPassword").value.trim();

  if (!name || !code || !password) {
    alert("Bölge müdürü adı, kodu ve şifresi gerekli");
    return;
  }

  const exists = regionsDB.find(r => r.code === code);

  if (exists) {
    alert("Bu bölge müdürü kodu zaten var");
    return;
  }

  regionsDB.push({
    id: generateId(),
    name,
    code,
    password,
    companies: selectedCompany ? [selectedCompany] : Object.keys(companies)
  });

  saveAll();
  renderAdminLogs();

  document.getElementById("adminRegionName").value = "";
  document.getElementById("adminRegionCode").value = "";
  document.getElementById("adminRegionPassword").value = "";

  alert("Bölge müdürü eklendi: " + name);
}

function adminResetSystem() {
  const ok1 = confirm("Tüm sistem sıfırlansın mı? Personel, log, yönetici ve mağaza verileri silinir.");
  if (!ok1) return;

  const ok2 = confirm("Bu işlem geri alınamaz. Emin misin?");
  if (!ok2) return;

  localStorage.clear();

  companies = DEFAULT_COMPANIES;
  users = [];
  logs = [];
  pendingApprovals = [];
  personnelDB = [];
  managersDB = [];
  regionsDB = [];
  selectedStore = null;
  selectedCompany = null;

  seedDefaultData();

  alert("Sistem sıfırlandı");

  location.reload();
}

/* PERSONNEL MANAGEMENT */

function addPersonnel() {
  const name = document.getElementById("newPersonName").value.trim();
  const code = document.getElementById("newPersonCode").value.trim();
  const type = document.getElementById("newPersonType").value;
  const hours = document.getElementById("newPersonHours").value;

  if (!name || !code) {
    alert("Ad soyad ve personel kodu zorunlu");
    return;
  }

  const exists = personnelDB.find(
    p => p.code === code && p.store === selectedStore
  );

  if (exists) {
    alert("Bu personel kodu zaten kayıtlı");
    return;
  }

  personnelDB.push({
    id: generateId(),
    company: selectedCompany,
    store: selectedStore,
    name,
    code,
    type,
    weeklyHours: Number(hours || 0),
    password: null,
    passwordCreated: false,
    active: true,
    createdAt: new Date().toLocaleString("tr-TR")
  });

  saveAll();

  document.getElementById("newPersonName").value = "";
  document.getElementById("newPersonCode").value = "";
  document.getElementById("newPersonHours").value = "";

  createLog("👤 Yeni personel eklendi: " + name + " / " + code);
  renderPersonnelList();

  alert("Personel eklendi. İlk girişte şifre oluşturacak.");
}

function renderPersonnelList() {
  const area = document.getElementById("personnelList");
  if (!area) return;

  const list = personnelDB.filter(
    p => p.store === selectedStore && p.company === selectedCompany
  );

  if (list.length === 0) {
    area.innerHTML = `
      <div class="log">
        Henüz personel eklenmedi.
      </div>
    `;
    return;
  }

  area.innerHTML = "";

  list.forEach(p => {
    const activeUser = users.find(
      u => u.code === p.code && u.store === selectedStore
    );

    const statusText =
      activeUser?.status === "ACTIVE" ? "Aktif" :
      activeUser?.status === "BREAK" ? "Molada" :
      "Dışarıda";

    area.innerHTML += `
      <div class="log">
        <b>${escapeHTML(p.name)}</b><br>
        Kod: ${escapeHTML(p.code)}<br>
        Tür: ${p.type === "FULL" ? "Full Personel" : "Part Time"}<br>
        Haftalık Saat: ${escapeHTML(p.weeklyHours)}<br>
        Şifre: ${p.passwordCreated ? "Oluşturuldu" : "İlk giriş bekleniyor"}<br>
        Durum: ${statusText}<br>

        <button class="loginBtn blue" onclick="resetPersonnelPassword('${p.id}')">
          Şifre Sıfırla
        </button>

        <button class="loginBtn red" onclick="deletePersonnel('${p.id}')">
          Personeli Sil
        </button>
      </div>
    `;
  });
}

function resetPersonnelPassword(id) {
  const person = personnelDB.find(p => p.id === id);
  if (!person) return;

  person.password = null;
  person.passwordCreated = false;

  saveAll();
  createLog("🔑 Personel şifresi sıfırlandı: " + person.code);
  renderPersonnelList();

  alert("Şifre sıfırlandı. Personel ilk girişte yeni şifre oluşturacak.");
}

function deletePersonnel(id) {
  const person = personnelDB.find(p => p.id === id);
  if (!person) return;

  const ok = confirm(person.name + " silinsin mi?");
  if (!ok) return;

  personnelDB = personnelDB.filter(p => p.id !== id);
  users = users.filter(u => !(u.code === person.code && u.store === person.store));

  saveAll();
  createLog("🗑️ Personel silindi: " + person.name + " / " + person.code);

  renderPersonnelList();
  updateCounters();
}

/* PERSONNEL PASSWORD */

function checkPersonnelPassword(person) {
  if (!person.passwordCreated) {
    const p1 = prompt("İlk giriş. Yeni şifre oluştur:");
    if (!p1 || p1.length < 4) {
      alert("Şifre en az 4 karakter olmalı");
      return false;
    }

    const p2 = prompt("Şifreyi tekrar gir:");
    if (p1 !== p2) {
      alert("Şifreler eşleşmiyor");
      return false;
    }

    person.password = p1;
    person.passwordCreated = true;
    saveAll();

    alert("Şifre oluşturuldu");
    return true;
  }

  const entered = prompt("Personel şifrenizi girin:");

  if (entered !== person.password) {
    alert("Şifre yanlış");
    createPending("Yanlış şifre denemesi: " + person.code);
    return false;
  }

  return true;
}

/* LOCATION */

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function verifyLocation() {
  return new Promise(resolve => {
    const store = getCurrentStoreInfo();

    if (!store || store.lat === null || store.lng === null) {
      lastLocationResult = {
        ok: true,
        message: "Mağaza GPS tanımı yok, QR ile devam edildi"
      };
      resolve(true);
      return;
    }

    if (!navigator.geolocation) {
      createPending("Cihaz konum desteklemiyor");
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const distance = getDistanceMeters(lat, lng, store.lat, store.lng);
        const ok = distance <= store.radius;

        lastLocationResult = {
          ok,
          distance: Math.round(distance),
          lat,
          lng
        };

        if (!ok) {
          createPending("Konum dışı işlem denemesi. Mesafe: " + Math.round(distance) + " metre");
        }

        resolve(ok);
      },
      () => {
        createPending("Konum izni verilmedi");
        resolve(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
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

  const person = getPersonnel(code);

  if (!person) {
    createPending("Kayıtsız personel işlem denemesi: " + code);
    alert("Bu personel kayıtlı değil. Yönetici önce personel eklemeli.");
    return;
  }

  if (!person.active) {
    alert("Bu personel pasif durumda");
    return;
  }

  const passwordOk = checkPersonnelPassword(person);
  if (!passwordOk) return;

  const locationOk = await verifyLocation();
  if (!locationOk) {
    alert("Konum doğrulaması başarısız. Yönetici onayı gerekli.");
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

        const validQR =
          decodedText === "STORE:" + selectedStore ||
          decodedText === selectedStore;

        if (!validQR) {
          createPending("Yanlış mağaza QR: " + code);
          alert("Geçersiz QR");
          return;
        }

        processAction(code, person);
      },
      () => {}
    );
  } catch (e) {
    await stopScanner();
    alert("Kamera açılamadı");
  }
}

/* PROCESS */

function processAction(code, person) {
  if (currentAction === "LOGIN") {
    const exists = getActiveUser(code);

    if (exists) {
      createPending("Çoklu giriş denemesi: " + code);
      alert("Bu personel zaten içeride. Yönetici onayı gerekli.");
      return;
    }

    users.push({
      id: generateId(),
      code,
      name: person.name,
      company: selectedCompany,
      store: selectedStore,
      status: "ACTIVE",
      loginTime: Date.now(),
      breakStart: null,
      totalBreakMinutes: 0
    });

    saveAll();

    createLog("✅ " + person.name + " giriş yaptı", {
      personCode: code,
      action: "LOGIN",
      location: lastLocationResult
    });

    updateCounters();
    renderPersonnelList();

    alert("Giriş başarılı");
  }

  if (currentAction === "BREAK") {
    const user = getActiveUser(code);

    if (!user) {
      createPending("Girişsiz mola denemesi: " + code);
      alert("Önce giriş yapılmalı");
      return;
    }

    if (user.status === "BREAK") {
      const start = user.breakStart || Date.now();
      const minutes = Math.max(1, Math.round((Date.now() - start) / 60000));

      user.status = "ACTIVE";
      user.breakStart = null;
      user.totalBreakMinutes = (user.totalBreakMinutes || 0) + minutes;

      saveAll();

      createLog("✅ " + person.name + " moladan döndü (" + minutes + " dk)", {
        personCode: code,
        action: "BREAK_RETURN",
        breakMinutes: minutes
      });

      updateCounters();
      renderPersonnelList();

      alert("Mola bitti: " + minutes + " dk");
      return;
    }

    user.status = "BREAK";
    user.breakStart = Date.now();

    saveAll();

    createLog("☕ " + person.name + " mola başlattı", {
      personCode: code,
      action: "BREAK_START"
    });

    updateCounters();
    renderPersonnelList();

    alert("Mola başladı");
  }

  if (currentAction === "EXIT") {
    const user = getActiveUser(code);

    if (!user) {
      createPending("Geçersiz çıkış denemesi: " + code);
      alert("Aktif giriş bulunamadı. Yönetici onayı gerekli.");
      return;
    }

    if (user.status === "BREAK") {
      createPending("Moladayken çıkış denemesi: " + code);
      alert("Önce molayı bitirmelisiniz");
      return;
    }

    const totalMinutes = Math.max(1, Math.round((Date.now() - user.loginTime) / 60000));
    const breakMinutes = user.totalBreakMinutes || 0;
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);

    users = users.filter(
      u => !(u.code === code && u.store === selectedStore)
    );

    saveAll();

    createLog(
      "👋 " + person.name + " çıkış yaptı | Çalışma: " + workMinutes + " dk | Mola: " + breakMinutes + " dk",
      {
        personCode: code,
        action: "EXIT",
        totalMinutes,
        breakMinutes,
        workMinutes
      }
    );

    updateCounters();
    renderPersonnelList();

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
      l => l.store === selectedStore && l.action === "EXIT"
    ).length;
  }
}

/* RENDER */

function renderLogs() {
  const area = document.getElementById("logsArea");
  if (!area) return;

  area.innerHTML = "";

  logs
    .filter(l => l.store === selectedStore)
    .forEach(log => {
      area.innerHTML += `
        <div class="log">
          🏪 ${escapeHTML(log.store)}<br>
          ${escapeHTML(log.text)}<br>
          <small>${escapeHTML(log.time)}</small>
        </div>
      `;
    });
}

function renderRegionLogs() {
  const area = document.getElementById("regionLogs");
  if (!area) return;

  const companyPersonnel = personnelDB.filter(p => p.company === selectedCompany);
  const companyManagers = managersDB.filter(m => m.company === selectedCompany);
  const companyLogs = logs.filter(l => l.company === selectedCompany);

  area.innerHTML = `
    <h3>Yöneticiler</h3>
    ${
      companyManagers.length
        ? companyManagers.map(m => `
          <div class="log">
            👔 ${escapeHTML(m.name)}<br>
            Kod: ${escapeHTML(m.code)}<br>
            Mağaza: ${escapeHTML(m.store)}
          </div>
        `).join("")
        : "<div class='log'>Yönetici yok.</div>"
    }

    <h3 style="margin-top:20px;">Personeller</h3>
    ${
      companyPersonnel.length
        ? companyPersonnel.map(p => `
          <div class="log">
            👤 ${escapeHTML(p.name)}<br>
            Kod: ${escapeHTML(p.code)}<br>
            Mağaza: ${escapeHTML(p.store)}<br>
            Tür: ${p.type === "FULL" ? "Full Personel" : "Part Time"}
          </div>
        `).join("")
        : "<div class='log'>Personel yok.</div>"
    }

    <h3 style="margin-top:20px;">Tüm Hareketler</h3>
    ${
      companyLogs.length
        ? companyLogs.map(log => `
          <div class="log">
            🏪 ${escapeHTML(log.store)}<br>
            ${escapeHTML(log.text)}<br>
            <small>${escapeHTML(log.time)}</small>
          </div>
        `).join("")
        : "<div class='log'>Log yok.</div>"
    }
  `;
}

function renderAdminLogs() {
  const area = document.getElementById("adminLogs");
  if (!area) return;

  let storeCount = 0;
  Object.keys(companies).forEach(companyCode => {
    storeCount += companies[companyCode].length;
  });

  area.innerHTML = `
    <div class="log">
      <b>Sistem Özeti</b><br>
      Şirket Sayısı: ${Object.keys(companies).length}<br>
      Mağaza Sayısı: ${storeCount}<br>
      Seçili Şirket: ${escapeHTML(selectedCompany || "-")}<br>
      Seçili Mağaza: ${escapeHTML(selectedStore || "-")}<br>
      Yönetici Sayısı: ${managersDB.length}<br>
      Bölge Müdürü Sayısı: ${regionsDB.length}<br>
      Personel Sayısı: ${personnelDB.length}<br>
      Aktif İçeride: ${users.length}<br>
      Log Sayısı: ${logs.length}<br>
      Onay Bekleyen: ${pendingApprovals.length}
    </div>
  `;

  logs.forEach(log => {
    area.innerHTML += `
      <div class="log">
        🏢 ${escapeHTML(log.company || "-")}<br>
        🏪 ${escapeHTML(log.store || "-")}<br>
        ${escapeHTML(log.text)}<br>
        <small>${escapeHTML(log.time)}</small>
      </div>
    `;
  });
}

/* INIT */

initApp();

console.log("AL METHER WORKFORCE APP v2.1 LOADED");