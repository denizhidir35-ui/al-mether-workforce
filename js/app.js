/* AL METHER WORKFORCE - APP.JS v4.0 CLEAN MOBILE */

const MASTER_CODE = "9-9-999";
const MASTER_PASSWORD = "1234";

let companies = {};
let storesDB = [];
let personnelDB = [];
let managersDB = [];
let regionsDB = [];
let logs = [];

let users = JSON.parse(localStorage.getItem("users")) || [];
let pendingApprovals = JSON.parse(localStorage.getItem("pendingApprovals")) || [];

let selectedCompany = localStorage.getItem("selectedCompany") || null;
let selectedStore = localStorage.getItem("selectedStore") || null;

let currentAction = "LOGIN";
let qrScanner = null;
let qrRunning = false;
let qrProcessed = false;

function $(id) {
  return document.getElementById(id);
}

function toast(msg) {
  alert(msg);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveLocal() {
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("pendingApprovals", JSON.stringify(pendingApprovals));

  if (selectedCompany) localStorage.setItem("selectedCompany", selectedCompany);
  if (selectedStore) localStorage.setItem("selectedStore", selectedStore);
}

function checkSupabase() {
  if (!window.supabaseClient) {
    toast("Supabase bağlantısı yok. js/supabase.js dosyasını kontrol et.");
    return false;
  }
  return true;
}

/* START */

async function initApp() {
  if (!checkSupabase()) return;

  prepareBreakButtonUI();

  await seedDefaultData();
  await loadAllData();

  if (selectedCompany && !companies[selectedCompany]) {
    selectedCompany = null;
    selectedStore = null;
    localStorage.removeItem("selectedCompany");
    localStorage.removeItem("selectedStore");
  }

  if (selectedStore && !storesDB.find(s => s.code === selectedStore)) {
    selectedStore = null;
    localStorage.removeItem("selectedStore");
  }

  renderCompanyOptions();

  hideAll();

  if (!selectedCompany) {
    $("companyPage").style.display = "block";
  } else if (!selectedStore) {
    renderStoreOptions();
    $("storePage").style.display = "block";
  } else {
    $("homePage").style.display = "block";
  }

  refreshAllUI();

  console.log("AL METHER WORKFORCE v4.0 CLEAN LOADED");
}

/* DATABASE */

async function seedDefaultData() {
  const { data, error } = await supabaseClient.from("companies").select("*");

  if (error) {
    console.error("companies read error:", error.message);
    return;
  }

  if (data && data.length > 0) return;

  await supabaseClient.from("companies").upsert([
    { code: "SKX", name: "Skechers" },
    { code: "DEMO", name: "Demo Firma" }
  ], { onConflict: "code" });

  await supabaseClient.from("stores").upsert([
    { company_code: "SKX", code: "SKX-M085", name: "SKX - M085", radius: 150 },
    { company_code: "SKX", code: "SKX-M086", name: "SKX - M086", radius: 150 },
    { company_code: "DEMO", code: "DEMO-M001", name: "Demo Mağaza", radius: 150 }
  ], { onConflict: "code" });

  await supabaseClient.from("managers").upsert([
    {
      company_code: "SKX",
      store_code: "SKX-M085",
      code: "M085-ADMIN",
      name: "M085 Yönetici",
      password: "1234"
    },
    {
      company_code: "SKX",
      store_code: "SKX-M086",
      code: "M086-ADMIN",
      name: "M086 Yönetici",
      password: "1234"
    }
  ], { onConflict: "code" });

  await supabaseClient.from("regions").upsert([
    { code: "BOLGE-ADMIN", name: "Bölge Müdürü", password: "1234" }
  ], { onConflict: "code" });
}

async function loadAllData() {
  const [
    companiesRes,
    storesRes,
    personnelRes,
    managersRes,
    regionsRes,
    logsRes
  ] = await Promise.all([
    supabaseClient.from("companies").select("*").order("created_at", { ascending: true }),
    supabaseClient.from("stores").select("*").order("created_at", { ascending: true }),
    supabaseClient.from("personnel").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("managers").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("regions").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("attendance_logs").select("*").order("created_at", { ascending: false }).limit(300)
  ]);

  companies = {};
  storesDB = storesRes.data || [];
  personnelDB = personnelRes.data || [];
  managersDB = managersRes.data || [];
  regionsDB = regionsRes.data || [];
  logs = logsRes.data || [];

  (companiesRes.data || []).forEach(c => {
    companies[c.code] = {
      code: c.code,
      name: c.name,
      stores: []
    };
  });

  storesDB.forEach(store => {
    if (!companies[store.company_code]) {
      companies[store.company_code] = {
        code: store.company_code,
        name: store.company_code,
        stores: []
      };
    }

    companies[store.company_code].stores.push({
      code: store.code,
      name: store.name,
      lat: store.latitude,
      lng: store.longitude,
      radius: store.radius || 150
    });
  });
}

/* MAIN UI */

function hideAll() {
  [
    "companyPage",
    "storePage",
    "homePage",
    "personPanel",
    "managerLoginPanel",
    "managerPanel",
    "regionLoginPanel",
    "regionPanel",
    "adminPanel"
  ].forEach(id => {
    const el = $(id);
    if (el) el.style.display = "none";
  });
}

function goHome() {
  stopScanner();
  hideAll();
  $("homePage").style.display = "block";
}

function refreshAllUI() {
  renderCompanyOptions();
  renderStoreOptions();
  updateCounters();
  renderLogs();
  renderAdminLogs();
  renderRegionDashboard();
  renderPersonnelList();
}

function openPersonPanel() {
  hideAll();
  $("personPanel").style.display = "block";
  setAction("LOGIN");
}

function openManagerLogin() {
  hideAll();
  $("managerLoginPanel").style.display = "block";
}

function openRegionLogin() {
  hideAll();
  $("regionLoginPanel").style.display = "block";
}

function openAdminPanel() {
  hideAll();
  $("adminPanel").style.display = "block";
  renderAdminLogs();
}

/* COMPANY STORE */

function renderCompanyOptions() {
  const select = $("companySelect");
  if (!select) return;

  select.innerHTML = "";

  const keys = Object.keys(companies);

  if (!keys.length) {
    select.innerHTML = `<option value="">Şirket bulunamadı</option>`;
    return;
  }

  keys.forEach(code => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = companies[code].name || code;
    select.appendChild(option);
  });

  if (selectedCompany && companies[selectedCompany]) {
    select.value = selectedCompany;
  }
}

function renderStoreOptions() {
  const select = $("storeSelect");
  if (!select || !selectedCompany) return;

  select.innerHTML = "";

  const stores = companies[selectedCompany]?.stores || [];

  if (!stores.length) {
    select.innerHTML = `<option value="">Mağaza bulunamadı</option>`;
    return;
  }

  stores.forEach(store => {
    const option = document.createElement("option");
    option.value = store.code;
    option.textContent = store.name;
    select.appendChild(option);
  });

  if (selectedStore) {
    select.value = selectedStore;
  }
}

function saveCompany() {
  const value = $("companySelect").value;

  if (!value || !companies[value]) {
    toast("Şirket seçilmedi");
    return;
  }

  selectedCompany = value;
  selectedStore = null;

  localStorage.setItem("selectedCompany", selectedCompany);
  localStorage.removeItem("selectedStore");

  renderStoreOptions();

  hideAll();
  $("storePage").style.display = "block";
}

function saveStore() {
  const value = $("storeSelect").value;

  if (!value) {
    toast("Mağaza seçilmedi");
    return;
  }

  selectedStore = value;
  localStorage.setItem("selectedStore", selectedStore);

  hideAll();
  $("homePage").style.display = "block";
}

/* ACTION BUTTONS */

function prepareBreakButtonUI() {
  const breakBtn = $("breakAction");
  const returnBtn = $("returnAction");

  if (breakBtn) {
    breakBtn.textContent = "Mola";
    breakBtn.onclick = () => setAction("BREAK");
  }

  if (returnBtn) {
    returnBtn.style.display = "none";
  }
}

function setAction(action) {
  currentAction = action;

  ["loginAction", "breakAction", "returnAction", "exitAction"].forEach(id => {
    const btn = $(id);
    if (btn) btn.classList.remove("selectedAction");
  });

  if (action === "LOGIN") $("loginAction")?.classList.add("selectedAction");
  if (action === "BREAK") $("breakAction")?.classList.add("selectedAction");
  if (action === "EXIT") $("exitAction")?.classList.add("selectedAction");
}

/* LOGIN */

async function managerLogin() {
  const code = $("managerCode").value.trim().toUpperCase();
  const password = $("managerPassword").value.trim();

  if (code === MASTER_CODE && password === MASTER_PASSWORD) {
    openAdminPanel();
    return;
  }

  await loadAllData();

  const manager = managersDB.find(m => m.code === code && m.password === password);

  if (!manager) {
    toast("Bilgiler yanlış");
    return;
  }

  selectedCompany = manager.company_code;
  selectedStore = manager.store_code;

  localStorage.setItem("selectedCompany", selectedCompany);
  localStorage.setItem("selectedStore", selectedStore);

  hideAll();
  $("managerPanel").style.display = "block";

  updateCounters();
  renderPersonnelList();
  renderLogs();
  renderPending();
}

async function regionLogin() {
  const code = $("regionCode").value.trim().toUpperCase();
  const password = $("regionPassword").value.trim();

  if (code === MASTER_CODE && password === MASTER_PASSWORD) {
    openAdminPanel();
    return;
  }

  await loadAllData();

  const region = regionsDB.find(
    r => String(r.code).toUpperCase() === code && String(r.password) === password
  );

  if (!region) {
    toast("Bölge müdürü bilgileri yanlış");
    return;
  }

  if (!selectedCompany && Object.keys(companies).length > 0) {
    selectedCompany = Object.keys(companies)[0];
    localStorage.setItem("selectedCompany", selectedCompany);
  }

  hideAll();
  $("regionPanel").style.display = "block";
  renderRegionDashboard();
}

/* PERSONNEL */

async function addPersonnel() {
  const name = $("newPersonName").value.trim();
  const code = $("newPersonCode").value.trim().toUpperCase();
  const type = $("newPersonType").value;
  const hours = Number($("newPersonHours").value || 0);

  if (!selectedCompany || !selectedStore) {
    toast("Şirket / mağaza seçili değil");
    return;
  }

  if (!name || !code) {
    toast("Ad soyad ve personel kodu zorunlu");
    return;
  }

  const { error } = await supabaseClient.from("personnel").insert({
    company_code: selectedCompany,
    store_code: selectedStore,
    personnel_code: code,
    full_name: name,
    personnel_type: type,
    weekly_hours: hours,
    password: null,
    active: true
  });

  if (error) {
    toast("Personel eklenemedi: " + error.message);
    return;
  }

  $("newPersonName").value = "";
  $("newPersonCode").value = "";
  $("newPersonHours").value = "";

  await createLog(code, "PERSONNEL_CREATED", "Yeni personel eklendi: " + name);
  await loadAllData();

  renderPersonnelList();
  renderLogs();
  renderRegionDashboard();

  toast("Personel eklendi");
}

function getPersonnel(code) {
  return personnelDB.find(
    p => p.personnel_code === code &&
    p.store_code === selectedStore &&
    p.company_code === selectedCompany
  );
}

function getActiveUser(code) {
  return users.find(
    u => u.code === code &&
    u.store === selectedStore
  );
}

async function renderPersonnelList() {
  const area = $("personnelList");
  if (!area) return;

  const list = personnelDB.filter(
    p => p.company_code === selectedCompany &&
    p.store_code === selectedStore
  );

  if (!list.length) {
    area.innerHTML = `<div class="log">Bu mağazada henüz personel yok.</div>`;
    return;
  }

  area.innerHTML = "";

  list.forEach(p => {
    const activeUser = users.find(
      u => u.code === p.personnel_code && u.store === p.store_code
    );

    const status =
      activeUser?.status === "ACTIVE" ? "Aktif" :
      activeUser?.status === "BREAK" ? "Molada" :
      "Dışarıda";

    area.innerHTML += `
      <div class="log">
        <b>${escapeHTML(p.full_name)}</b><br>
        Kod: ${escapeHTML(p.personnel_code)}<br>
        Tür: ${p.personnel_type === "FULL" ? "Full Personel" : "Part Time"}<br>
        Haftalık Saat: ${p.weekly_hours || 0}<br>
        Durum: ${status}<br>
        Şifre: ${p.password ? "Oluşturuldu" : "İlk giriş bekleniyor"}<br>
        <button class="loginBtn blue" onclick="resetPersonnelPassword('${p.id}')">Şifre Sıfırla</button>
        <button class="loginBtn red" onclick="deletePersonnel('${p.id}')">Personeli Sil</button>
      </div>
    `;
  });
}

async function resetPersonnelPassword(id) {
  await supabaseClient.from("personnel").update({ password: null }).eq("id", id);
  await loadAllData();
  renderPersonnelList();
  toast("Şifre sıfırlandı");
}

async function deletePersonnel(id) {
  const person = personnelDB.find(p => p.id === id);
  if (!person) return;

  if (!confirm(person.full_name + " silinsin mi?")) return;

  await supabaseClient.from("personnel").delete().eq("id", id);

  users = users.filter(
    u => !(u.code === person.personnel_code && u.store === person.store_code)
  );

  saveLocal();

  await createLog(person.personnel_code, "PERSONNEL_DELETED", "Personel silindi: " + person.full_name);
  await loadAllData();

  renderPersonnelList();
  updateCounters();

  toast("Personel silindi");
}

async function checkPersonnelPassword(person) {
  if (!person.password) {
    const p1 = prompt("İlk giriş. Yeni şifre oluştur:");

    if (!p1 || p1.length < 4) {
      toast("Şifre en az 4 karakter olmalı");
      return false;
    }

    const p2 = prompt("Şifreyi tekrar gir:");

    if (p1 !== p2) {
      toast("Şifreler eşleşmiyor");
      return false;
    }

    const { error } = await supabaseClient
      .from("personnel")
      .update({ password: p1 })
      .eq("id", person.id);

    if (error) {
      toast("Şifre kaydedilemedi");
      return false;
    }

    person.password = p1;
    toast("Şifre oluşturuldu");
    return true;
  }

  const pass = prompt("Personel şifrenizi girin:");

  if (pass !== person.password) {
    createPending("Yanlış şifre denemesi: " + person.personnel_code);
    toast("Şifre yanlış");
    return false;
  }

  return true;
}

/* QR / GPS */

async function startQRScanner() {
  if (qrRunning) return;

  await loadAllData();

  const code = $("personCode").value.trim().toUpperCase();

  if (!code) {
    toast("Personel kodu gerekli");
    return;
  }

  const person = getPersonnel(code);

  if (!person) {
    createPending("Kayıtsız personel işlem denemesi: " + code);
    toast("Bu personel kayıtlı değil");
    return;
  }

  const passwordOk = await checkPersonnelPassword(person);
  if (!passwordOk) return;

  const gpsOk = await verifyLocation();
  if (!gpsOk) {
    toast("Konum doğrulaması başarısız");
    return;
  }

  await stopScanner();

  $("reader").style.display = "block";

  qrRunning = true;
  qrProcessed = false;
  qrScanner = new Html5Qrcode("reader");

  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 5, qrbox: 220 },
      async decodedText => {
        if (qrProcessed) return;

        qrProcessed = true;
        await stopScanner();

        const valid =
          decodedText === "STORE:" + selectedStore ||
          decodedText === selectedStore;

        if (!valid) {
          createPending("Yanlış mağaza QR denemesi: " + code);
          toast("Geçersiz QR");
          return;
        }

        await processAction(code, person);
      },
      () => {}
    );
  } catch (e) {
    await stopScanner();
    toast("Kamera açılamadı");
  }
}

async function stopScanner() {
  try {
    if (qrScanner) {
      await qrScanner.stop();
      await qrScanner.clear();
    }
  } catch (e) {}

  qrScanner = null;
  qrRunning = false;
  qrProcessed = false;

  const reader = $("reader");
  if (reader) {
    reader.innerHTML = "";
    reader.style.display = "none";
  }
}

function getCurrentStoreInfo() {
  const list = companies[selectedCompany]?.stores || [];
  return list.find(s => s.code === selectedStore) || null;
}

function verifyLocation() {
  return new Promise(resolve => {
    const store = getCurrentStoreInfo();

    if (!store || !store.lat || !store.lng) {
      resolve(true);
      return;
    }

    if (!navigator.geolocation) {
      createPending("Cihaz konum desteklemiyor");
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const distance = getDistanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          store.lat,
          store.lng
        );

        if (distance <= store.radius) {
          resolve(true);
        } else {
          createPending("Konum dışı işlem. Mesafe: " + Math.round(distance) + " metre");
          resolve(false);
        }
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

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fillLocationFields(latId, lngId) {
  if (!navigator.geolocation) {
    toast("Bu cihaz konum desteklemiyor");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      $(latId).value = pos.coords.latitude;
      $(lngId).value = pos.coords.longitude;
      toast("GPS alındı");
    },
    () => toast("Konum alınamadı"),
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/* PROCESS */

async function processAction(code, person) {
  if (currentAction === "LOGIN") {
    if (getActiveUser(code)) {
      toast("Bu personel zaten içeride");
      return;
    }

    users.push({
      id: Date.now(),
      code,
      name: person.full_name,
      company: selectedCompany,
      store: selectedStore,
      status: "ACTIVE",
      loginTime: Date.now(),
      breakStart: null,
      totalBreakMinutes: 0
    });

    saveLocal();

    await createLog(code, "LOGIN", person.full_name + " giriş yaptı");
    toast("Giriş başarılı");
  }

  if (currentAction === "BREAK") {
    const user = getActiveUser(code);

    if (!user) {
      toast("Önce giriş yapılmalı");
      return;
    }

    if (user.status === "BREAK") {
      const minutes = Math.max(1, Math.round((Date.now() - user.breakStart) / 60000));

      user.status = "ACTIVE";
      user.breakStart = null;
      user.totalBreakMinutes += minutes;

      saveLocal();

      await createLog(code, "BREAK_RETURN", person.full_name + " moladan döndü");
      toast("Mola bitti");
    } else {
      user.status = "BREAK";
      user.breakStart = Date.now();

      saveLocal();

      await createLog(code, "BREAK_START", person.full_name + " mola başlattı");
      toast("Mola başladı");
    }
  }

  if (currentAction === "EXIT") {
    const user = getActiveUser(code);

    if (!user) {
      toast("Aktif giriş bulunamadı");
      return;
    }

    if (user.status === "BREAK") {
      toast("Önce molayı bitirmelisin");
      return;
    }

    users = users.filter(
      u => !(u.code === code && u.store === selectedStore)
    );

    saveLocal();

    await createLog(code, "EXIT", person.full_name + " çıkış yaptı");
    toast("Çıkış başarılı");
  }

  await loadAllData();
  updateCounters();
  renderPersonnelList();
  renderLogs();
  renderRegionDashboard();
}

/* REGION */

function renderRegionDashboard() {
  renderRegionStoreSelect();
  renderRegionCounts();
  renderRegionStores();
  renderRegionManagers();
  renderRegionPersonnel();
  renderRegionLogs();
}

function renderRegionStoreSelect() {
  const select = $("regionManagerStoreSelect");
  if (!select) return;

  const stores = storesDB.filter(s => s.company_code === selectedCompany);

  select.innerHTML = "";

  stores.forEach(store => {
    const option = document.createElement("option");
    option.value = store.code;
    option.textContent = store.name + " / " + store.code;
    select.appendChild(option);
  });
}

function renderRegionCounts() {
  const stores = storesDB.filter(s => s.company_code === selectedCompany);
  const managers = managersDB.filter(m => m.company_code === selectedCompany);
  const personnel = personnelDB.filter(p => p.company_code === selectedCompany);

  if ($("regionStoreCount")) $("regionStoreCount").innerText = stores.length;
  if ($("regionManagerCount")) $("regionManagerCount").innerText = managers.length;
  if ($("regionPersonnelCount")) $("regionPersonnelCount").innerText = personnel.length;
  if ($("regionActiveCount")) $("regionActiveCount").innerText = users.filter(u => u.status === "ACTIVE").length;
  if ($("regionBreakCount")) $("regionBreakCount").innerText = users.filter(u => u.status === "BREAK").length;
  if ($("regionTodayLogCount")) $("regionTodayLogCount").innerText = logs.length;
}

function renderRegionStores() {
  const area = $("regionStoreList");
  if (!area) return;

  const stores = storesDB.filter(s => s.company_code === selectedCompany);

  if (!stores.length) {
    area.innerHTML = `<div class="log">Henüz mağaza yok.</div>`;
    return;
  }

  area.innerHTML = "";

  stores.forEach(store => {
    const managerCount = managersDB.filter(m => m.store_code === store.code).length;
    const personCount = personnelDB.filter(p => p.store_code === store.code).length;

    area.innerHTML += `
      <div class="log">
        <b>🏬 ${escapeHTML(store.name)}</b><br>
        Kod: ${escapeHTML(store.code)}<br>
        Yönetici: ${managerCount}<br>
        Personel: ${personCount}<br>
        GPS: ${store.latitude && store.longitude ? "Aktif" : "Yok"}<br>
        <button class="loginBtn green" onclick="selectStoreFromCard('${escapeHTML(store.code)}')">
          Bu Mağazayı Yönet
        </button>
      </div>
    `;
  });
}

function renderRegionManagers() {
  const area = $("regionManagerList");
  if (!area) return;

  const managers = managersDB.filter(m => m.company_code === selectedCompany);

  if (!managers.length) {
    area.innerHTML = `<div class="log">Yönetici yok.</div>`;
    return;
  }

  area.innerHTML = "";

  managers.forEach(m => {
    area.innerHTML += `
      <div class="log">
        <b>👔 ${escapeHTML(m.name)}</b><br>
        Kod: ${escapeHTML(m.code)}<br>
        Mağaza: ${escapeHTML(m.store_code)}
      </div>
    `;
  });
}

function renderRegionPersonnel() {
  const area = $("regionPersonnelList");
  if (!area) return;

  const personnel = personnelDB.filter(p => p.company_code === selectedCompany);

  if (!personnel.length) {
    area.innerHTML = `<div class="log">Personel yok.</div>`;
    return;
  }

  area.innerHTML = "";

  personnel.forEach(p => {
    area.innerHTML += `
      <div class="log">
        <b>👤 ${escapeHTML(p.full_name)}</b><br>
        Kod: ${escapeHTML(p.personnel_code)}<br>
        Mağaza: ${escapeHTML(p.store_code)}
      </div>
    `;
  });
}

function renderRegionLogs() {
  const area = $("regionLogs");
  if (!area) return;

  const list = logs.filter(l => l.company_code === selectedCompany);

  if (!list.length) {
    area.innerHTML = `<div class="log">Log yok.</div>`;
    return;
  }

  area.innerHTML = "";

  list.forEach(log => {
    area.innerHTML += `
      <div class="log">
        ${escapeHTML(log.store_code)}<br>
        ${escapeHTML(log.details)}<br>
        <small>${new Date(log.created_at).toLocaleString("tr-TR")}</small>
      </div>
    `;
  });
}

function selectStoreFromCard(storeCode) {
  selectedStore = storeCode;
  localStorage.setItem("selectedStore", selectedStore);
  toast("Seçili mağaza: " + storeCode);
  renderRegionDashboard();
}

function regionUseCurrentLocation() {
  fillLocationFields("regionStoreLat", "regionStoreLng");
}

async function regionAddStore() {
  const name = $("regionStoreName").value.trim();
  const codeRaw = $("regionStoreCode").value.trim().toUpperCase();

  if (!name || !codeRaw) {
    toast("Mağaza adı ve kodu gerekli");
    return;
  }

  const code = codeRaw.startsWith(selectedCompany + "-")
    ? codeRaw
    : selectedCompany + "-" + codeRaw;

  const lat = Number($("regionStoreLat").value || 0) || null;
  const lng = Number($("regionStoreLng").value || 0) || null;

  await supabaseClient.from("stores").upsert({
    company_code: selectedCompany,
    code,
    name,
    latitude: lat,
    longitude: lng,
    radius: 150
  }, { onConflict: "code" });

  selectedStore = code;
  saveLocal();

  await loadAllData();
  renderRegionDashboard();

  toast("Mağaza eklendi");
}

async function regionAddManager() {
  const name = $("regionManagerName").value.trim();
  const code = $("regionManagerCode").value.trim().toUpperCase();
  const password = $("regionManagerPassword").value.trim();
  const storeCode = $("regionManagerStoreSelect").value;

  if (!name || !code || !password || !storeCode) {
    toast("Yönetici bilgileri eksik");
    return;
  }

  await supabaseClient.from("managers").upsert({
    company_code: selectedCompany,
    store_code: storeCode,
    code,
    name,
    password
  }, { onConflict: "code" });

  await loadAllData();
  renderRegionDashboard();

  toast("Yönetici atandı");
}

/* ADMIN */

function adminUseCurrentLocation() {
  fillLocationFields("adminStoreLat", "adminStoreLng");
}

async function adminAddCompany() {
  const name = $("adminCompanyName").value.trim();
  const code = $("adminCompanyCode").value.trim().toUpperCase();

  if (!name || !code) {
    toast("Şirket adı ve kodu gerekli");
    return;
  }

  await supabaseClient.from("companies").upsert({ code, name }, { onConflict: "code" });

  selectedCompany = code;
  selectedStore = null;
  saveLocal();

  await loadAllData();
  renderAdminLogs();

  toast("Şirket eklendi");
}

async function adminAddStore() {
  const name = $("adminStoreName").value.trim();
  const code = $("adminStoreCode").value.trim().toUpperCase();

  if (!selectedCompany || !name || !code) {
    toast("Şirket ve mağaza bilgileri gerekli");
    return;
  }

  const lat = Number($("adminStoreLat").value || 0) || null;
  const lng = Number($("adminStoreLng").value || 0) || null;

  await supabaseClient.from("stores").upsert({
    company_code: selectedCompany,
    code,
    name,
    latitude: lat,
    longitude: lng,
    radius: 150
  }, { onConflict: "code" });

  selectedStore = code;
  saveLocal();

  await loadAllData();
  renderAdminLogs();

  toast("Mağaza eklendi");
}

async function adminAddManager() {
  const name = $("adminManagerName").value.trim();
  const code = $("adminManagerCode").value.trim().toUpperCase();
  const password = $("adminManagerPassword").value.trim();

  if (!selectedCompany || !selectedStore || !name || !code || !password) {
    toast("Yönetici bilgileri eksik");
    return;
  }

  await supabaseClient.from("managers").upsert({
    company_code: selectedCompany,
    store_code: selectedStore,
    code,
    name,
    password
  }, { onConflict: "code" });

  await loadAllData();
  renderAdminLogs();

  toast("Yönetici eklendi");
}

async function adminAddRegion() {
  const name = $("adminRegionName").value.trim();
  const code = $("adminRegionCode").value.trim().toUpperCase();
  const password = $("adminRegionPassword").value.trim();

  if (!name || !code || !password) {
    toast("Bölge müdürü bilgileri eksik");
    return;
  }

  await supabaseClient.from("regions").upsert({
    name,
    code,
    password
  }, { onConflict: "code" });

  await loadAllData();
  renderAdminLogs();

  toast("Bölge müdürü eklendi");
}

async function adminResetSystem() {
  if (!confirm("Personel ve log kayıtları sıfırlansın mı?")) return;

  await supabaseClient.from("attendance_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseClient.from("personnel").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  users = [];
  pendingApprovals = [];
  saveLocal();

  await loadAllData();
  renderAdminLogs();

  toast("Sistem sıfırlandı");
}

function renderAdminLogs() {
  const area = $("adminLogs");
  if (!area) return;

  renderAdminDashboardCounters();

  area.innerHTML = `
    <div class="log">
      <b>Sistem Özeti</b><br>
      Şirket: ${Object.keys(companies).length}<br>
      Mağaza: ${storesDB.length}<br>
      Yönetici: ${managersDB.length}<br>
      Bölge Müdürü: ${regionsDB.length}<br>
      Personel: ${personnelDB.length}<br>
      Log: ${logs.length}<br>
      Seçili Şirket: ${escapeHTML(selectedCompany || "-")}<br>
      Seçili Mağaza: ${escapeHTML(selectedStore || "-")}
    </div>
  `;
}

function renderAdminDashboardCounters() {
  if ($("adminCompanyCount")) $("adminCompanyCount").innerText = Object.keys(companies).length;
  if ($("adminStoreCount")) $("adminStoreCount").innerText = storesDB.length;
  if ($("adminManagerCount")) $("adminManagerCount").innerText = managersDB.length;
  if ($("adminPersonnelCount")) $("adminPersonnelCount").innerText = personnelDB.length;

  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => l.created_at && l.created_at.slice(0, 10) === today);

  if ($("adminTodayLoginCount")) $("adminTodayLoginCount").innerText = todayLogs.filter(l => l.action === "LOGIN").length;
  if ($("adminTodayExitCount")) $("adminTodayExitCount").innerText = todayLogs.filter(l => l.action === "EXIT").length;
}

/* LOGS */

async function createLog(personnelCode, action, details) {
  await supabaseClient.from("attendance_logs").insert({
    company_code: selectedCompany,
    store_code: selectedStore,
    personnel_code: personnelCode || null,
    action,
    details
  });

  await loadAllData();
}

function renderLogs() {
  const area = $("logsArea");
  if (!area) return;

  const list = logs.filter(l => l.store_code === selectedStore);

  if (!list.length) {
    area.innerHTML = `<div class="log">Henüz hareket yok.</div>`;
    return;
  }

  area.innerHTML = "";

  list.forEach(log => {
    area.innerHTML += `
      <div class="log">
        ${escapeHTML(log.details)}<br>
        <small>${new Date(log.created_at).toLocaleString("tr-TR")}</small>
      </div>
    `;
  });
}

/* PENDING */

function createPending(text) {
  pendingApprovals.unshift({
    id: Date.now(),
    company: selectedCompany,
    store: selectedStore,
    text,
    time: new Date().toLocaleString("tr-TR")
  });

  saveLocal();
  renderPending();
}

function renderPending() {
  const area = $("pendingArea");
  if (!area) return;

  const list = pendingApprovals.filter(p => p.store === selectedStore);

  if (!list.length) {
    area.innerHTML = "";
    return;
  }

  area.innerHTML = "<h3 style='margin-top:20px;'>Yönetici Onayı Bekleyenler</h3>";

  list.forEach(item => {
    area.innerHTML += `
      <div class="pendingBox">
        ${escapeHTML(item.text)}<br>
        <small>${escapeHTML(item.time)}</small>
      </div>
    `;
  });
}

/* COUNTERS */

function updateCounters() {
  if ($("activeCount")) {
    $("activeCount").innerText = users.filter(
      u => u.store === selectedStore && u.status === "ACTIVE"
    ).length;
  }

  if ($("breakCount")) {
    $("breakCount").innerText = users.filter(
      u => u.store === selectedStore && u.status === "BREAK"
    ).length;
  }

  if ($("exitCount")) {
    $("exitCount").innerText = logs.filter(
      l => l.store_code === selectedStore && l.action === "EXIT"
    ).length;
  }
}

initApp();