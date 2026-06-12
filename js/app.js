/* AL METHER WORKFORCE - APP.JS v3.3 SUPABASE SAAS */

const MASTER_CODE = "9-9-999";
const MASTER_PASSWORD = "1234";

let companies = {};
let storesDB = [];
let personnelDB = [];
let managersDB = [];
let regionsDB = [];
let logs = [];

let pendingApprovals = JSON.parse(localStorage.getItem("pendingApprovals")) || [];
let users = JSON.parse(localStorage.getItem("users")) || [];

let selectedCompany = localStorage.getItem("selectedCompany");
let selectedStore = localStorage.getItem("selectedStore");

let qrScanner = null;
let qrRunning = false;
let qrProcessed = false;
let currentAction = "LOGIN";
let lastLocationResult = null;

function $(id) {
  return document.getElementById(id);
}

function toast(message) {
  alert(message);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function generateId() {
  return "ID-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
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

/* INIT */

async function initApp() {
  prepareBreakButtonUI();

  if (!checkSupabase()) return;

  await seedDefaultData();
  await loadAllData();

  renderCompanyOptions();

  hideAll();

  if (selectedCompany && selectedStore) {
    $("homePage").style.display = "block";
  } else if (selectedCompany) {
    $("storePage").style.display = "block";
    renderStoreOptions();
  } else {
    $("companyPage").style.display = "block";
  }

  updateCounters();
  renderLogs();
  renderRegionDashboard();
  renderAdminLogs();
  await renderPersonnelList();

  console.log("AL METHER WORKFORCE APP v3.3 SUPABASE LOADED");
}

async function seedDefaultData() {
  const { data } = await supabaseClient.from("companies").select("*");

  if (data && data.length > 0) return;

  await supabaseClient.from("companies").insert([
    { code: "POZITIF", name: "Pozitif Matbaa" },
    { code: "SKX", name: "Skechers" },
    { code: "LTB", name: "LTB" },
    { code: "DEMO", name: "Demo Firma" }
  ]);

  await supabaseClient.from("stores").insert([
    { company_code: "POZITIF", code: "POZ-M001", name: "Pozitif Matbaa - Merkez", radius: 150 },
    { company_code: "SKX", code: "SKX-M085", name: "SKX - M085", radius: 150 },
    { company_code: "SKX", code: "SKX-M086", name: "SKX - M086", radius: 150 },
    { company_code: "LTB", code: "LTB-M201", name: "LTB - M201", radius: 150 },
    { company_code: "DEMO", code: "DEMO-M001", name: "Demo Mağaza", radius: 150 }
  ]);

  await supabaseClient.from("managers").insert([
    { company_code: "SKX", store_code: "SKX-M085", code: "M085-ADMIN", name: "M085 Yönetici", password: "1234" },
    { company_code: "SKX", store_code: "SKX-M086", code: "M086-ADMIN", name: "M086 Yönetici", password: "1234" },
    { company_code: "LTB", store_code: "LTB-M201", code: "LTB-ADMIN", name: "LTB Yönetici", password: "1234" },
    { company_code: "POZITIF", store_code: "POZ-M001", code: "POZ-ADMIN", name: "Pozitif Yönetici", password: "1234" },
    { company_code: "DEMO", store_code: "DEMO-M001", code: "DEMO-ADMIN", name: "Demo Yönetici", password: "1234" }
  ]);

  await supabaseClient.from("regions").insert([
    { code: "BOLGE-ADMIN", name: "Bölge Müdürü", password: "1234" }
  ]);
}

async function loadAllData() {
  const [companiesRes, storesRes, personnelRes, managersRes, regionsRes, logsRes] = await Promise.all([
    supabaseClient.from("companies").select("*").order("created_at", { ascending: true }),
    supabaseClient.from("stores").select("*").order("created_at", { ascending: true }),
    supabaseClient.from("personnel").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("managers").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("regions").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("attendance_logs").select("*").order("created_at", { ascending: false }).limit(300)
  ]);

  companies = {};

  (companiesRes.data || []).forEach(c => {
    companies[c.code] = {
      code: c.code,
      name: c.name,
      stores: []
    };
  });

  storesDB = storesRes.data || [];

  storesDB.forEach(s => {
    if (!companies[s.company_code]) {
      companies[s.company_code] = {
        code: s.company_code,
        name: s.company_code,
        stores: []
      };
    }

    companies[s.company_code].stores.push({
      code: s.code,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      radius: s.radius || 150
    });
  });

  personnelDB = personnelRes.data || [];
  managersDB = managersRes.data || [];
  regionsDB = regionsRes.data || [];
  logs = logsRes.data || [];
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
    const el = $(id);
    if (el) el.style.display = "none";
  });
}

function goHome() {
  hideAll();
  $("homePage").style.display = "block";
  stopScanner();
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

function prepareBreakButtonUI() {
  const breakBtn = $("breakAction");
  const returnBtn = $("returnAction");

  if (breakBtn) {
    breakBtn.textContent = "Mola";
    breakBtn.onclick = function () {
      setAction("BREAK");
    };
  }

  if (returnBtn) returnBtn.style.display = "none";
}

function setAction(action) {
  currentAction = action;

  ["loginAction", "breakAction", "returnAction", "exitAction"].forEach(id => {
    const btn = $(id);
    if (btn) btn.classList.remove("selectedAction");
  });

  const target =
    action === "LOGIN" ? "loginAction" :
    action === "BREAK" ? "breakAction" :
    action === "EXIT" ? "exitAction" :
    null;

  if (target) $(target)?.classList.add("selectedAction");
}

/* COMPANY / STORE */

function renderCompanyOptions() {
  const select = $("companySelect");
  if (!select) return;

  select.innerHTML = "";

  Object.keys(companies).forEach(code => {
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
  if (!select) return;

  select.innerHTML = "";

  const list = companies[selectedCompany]?.stores || [];

  list.forEach(store => {
    const option = document.createElement("option");
    option.value = store.code;
    option.textContent = store.name;
    select.appendChild(option);
  });
}

function saveCompany() {
  selectedCompany = $("companySelect").value;
  selectedStore = null;

  localStorage.setItem("selectedCompany", selectedCompany);
  localStorage.removeItem("selectedStore");

  hideAll();
  $("storePage").style.display = "block";
  renderStoreOptions();
}

function saveStore() {
  selectedStore = $("storeSelect").value;

  if (!selectedStore) {
    toast("Mağaza seçilmedi");
    return;
  }

  localStorage.setItem("selectedStore", selectedStore);

  hideAll();
  $("homePage").style.display = "block";
}

/* ADMIN */

async function adminAddCompany() {
  const name = $("adminCompanyName").value.trim();
  const code = $("adminCompanyCode").value.trim().toUpperCase();

  if (!name || !code) {
    toast("Şirket adı ve kodu gerekli");
    return;
  }

  const { error } = await supabaseClient
    .from("companies")
    .upsert({ code, name }, { onConflict: "code" });

  if (error) {
    toast("Şirket kaydedilemedi: " + error.message);
    return;
  }

  selectedCompany = code;
  selectedStore = null;

  localStorage.setItem("selectedCompany", selectedCompany);
  localStorage.removeItem("selectedStore");

  $("adminCompanyName").value = "";
  $("adminCompanyCode").value = "";

  await loadAllData();
  renderCompanyOptions();
  renderAdminLogs();

  toast(name + " şirketi seçildi / oluşturuldu.");
}

function adminUseCurrentLocation() {
  fillLocationFields("adminStoreLat", "adminStoreLng");
}

async function adminAddStore() {
  const name = $("adminStoreName").value.trim();
  const code = $("adminStoreCode").value.trim().toUpperCase();
  const latRaw = $("adminStoreLat").value.trim();
  const lngRaw = $("adminStoreLng").value.trim();

  if (!selectedCompany) {
    toast("Önce şirket ekle / seç");
    return;
  }

  if (!name || !code) {
    toast("Mağaza adı ve kodu gerekli");
    return;
  }

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

  const { error } = await supabaseClient
    .from("stores")
    .upsert({
      company_code: selectedCompany,
      code,
      name,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      radius: 150
    }, { onConflict: "code" });

  if (error) {
    toast("Mağaza kaydedilemedi: " + error.message);
    return;
  }

  selectedStore = code;
  localStorage.setItem("selectedStore", selectedStore);

  $("adminStoreName").value = "";
  $("adminStoreCode").value = "";

  await loadAllData();
  renderStoreOptions();
  renderAdminLogs();

  toast("Mağaza seçildi / kaydedildi: " + name);
}

async function adminAddManager() {
  const name = $("adminManagerName").value.trim();
  const code = $("adminManagerCode").value.trim().toUpperCase();
  const password = $("adminManagerPassword").value.trim();

  if (!selectedCompany || !selectedStore) {
    toast("Önce şirket ve mağaza seçili olmalı");
    return;
  }

  if (!name || !code || !password) {
    toast("Yönetici adı, kodu ve şifresi gerekli");
    return;
  }

  const { error } = await supabaseClient
    .from("managers")
    .upsert({
      company_code: selectedCompany,
      store_code: selectedStore,
      code,
      name,
      password
    }, { onConflict: "code" });

  if (error) {
    toast("Yönetici eklenemedi: " + error.message);
    return;
  }

  $("adminManagerName").value = "";
  $("adminManagerCode").value = "";
  $("adminManagerPassword").value = "";

  await loadAllData();
  renderAdminLogs();

  toast("Yönetici eklendi: " + name);
}

async function adminAddRegion() {
  const name = $("adminRegionName").value.trim();
  const code = $("adminRegionCode").value.trim().toUpperCase();
  const password = $("adminRegionPassword").value.trim();

  if (!name || !code || !password) {
    toast("Bölge müdürü adı, kodu ve şifresi gerekli");
    return;
  }

  const { error } = await supabaseClient
    .from("regions")
    .upsert({ code, name, password }, { onConflict: "code" });

  if (error) {
    toast("Bölge müdürü eklenemedi: " + error.message);
    return;
  }

  $("adminRegionName").value = "";
  $("adminRegionCode").value = "";
  $("adminRegionPassword").value = "";

  await loadAllData();
  renderAdminLogs();

  toast("Bölge müdürü eklendi: " + name);
}

async function adminResetSystem() {
  const ok1 = confirm("Tüm personel ve log kayıtları sıfırlansın mı?");
  if (!ok1) return;

  const ok2 = confirm("Bu işlem geri alınamaz. Emin misin?");
  if (!ok2) return;

  await supabaseClient.from("attendance_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseClient.from("personnel").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  localStorage.removeItem("users");
  localStorage.removeItem("pendingApprovals");

  users = [];
  pendingApprovals = [];

  await loadAllData();
  renderAdminLogs();
  await renderPersonnelList();
  updateCounters();

  toast("Personel ve log kayıtları sıfırlandı");
}

/* REGION MANAGER */

function regionUseCurrentLocation() {
  fillLocationFields("regionStoreLat", "regionStoreLng");
}

async function regionAddStore() {
  const name = $("regionStoreName").value.trim();
  const codeRaw = $("regionStoreCode").value.trim().toUpperCase();
  const latRaw = $("regionStoreLat").value.trim();
  const lngRaw = $("regionStoreLng").value.trim();

  if (!selectedCompany) {
    toast("Önce şirket seçili olmalı");
    return;
  }

  if (!name || !codeRaw) {
    toast("Mağaza adı ve kodu gerekli");
    return;
  }

  const code = codeRaw.startsWith(selectedCompany + "-")
    ? codeRaw
    : selectedCompany + "-" + codeRaw;

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

  const { error } = await supabaseClient
    .from("stores")
    .upsert({
      company_code: selectedCompany,
      code,
      name,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      radius: 150
    }, { onConflict: "code" });

  if (error) {
    toast("Mağaza eklenemedi: " + error.message);
    return;
  }

  selectedStore = code;
  localStorage.setItem("selectedStore", selectedStore);

  $("regionStoreName").value = "";
  $("regionStoreCode").value = "";

  await loadAllData();
  renderStoreOptions();
  renderRegionDashboard();

  toast("Mağaza eklendi / seçildi: " + name);
}

async function regionAddManager() {
  const name = $("regionManagerName").value.trim();
  const code = $("regionManagerCode").value.trim().toUpperCase();
  const password = $("regionManagerPassword").value.trim();
  const storeCode = $("regionManagerStoreSelect").value;

  if (!selectedCompany) {
    toast("Şirket seçili değil");
    return;
  }

  if (!storeCode) {
    toast("Yönetici için mağaza seç");
    return;
  }

  if (!name || !code || !password) {
    toast("Yönetici adı, kodu ve şifresi gerekli");
    return;
  }

  const { error } = await supabaseClient
    .from("managers")
    .upsert({
      company_code: selectedCompany,
      store_code: storeCode,
      code,
      name,
      password
    }, { onConflict: "code" });

  if (error) {
    toast("Yönetici eklenemedi: " + error.message);
    return;
  }

  $("regionManagerName").value = "";
  $("regionManagerCode").value = "";
  $("regionManagerPassword").value = "";

  await loadAllData();
  renderRegionDashboard();

  toast("Yönetici mağazaya atandı: " + name);
}

function renderRegionDashboard() {
  renderRegionStoreSelect();
  renderRegionCounts();
  renderRegionStores();
  renderRegionManagers();
  renderRegionPersonnel();
  renderRegionLogs();
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
    const managers = managersDB.filter(m => m.store_code === store.code);
    const personnel = personnelDB.filter(p => p.store_code === store.code);

    const activeCount = users.filter(
      u => u.store === store.code && u.status === "ACTIVE"
    ).length;

    const breakCount = users.filter(
      u => u.store === store.code && u.status === "BREAK"
    ).length;

    const gps = store.latitude && store.longitude ? "GPS aktif" : "GPS yok";

    area.innerHTML += `
      <div class="log">
        <b>🏬 ${escapeHTML(store.name)}</b><br>
        Kod: ${escapeHTML(store.code)}<br>
        Yönetici: ${managers.length}<br>
        Personel: ${personnel.length}<br>
        Aktif: ${activeCount} | Molada: ${breakCount}<br>
        ${gps}<br>

        <button class="loginBtn blue" onclick="showStoreQR('${escapeHTML(store.code)}','${escapeHTML(store.name)}')">
          QR Göster
        </button>

        <button class="loginBtn green" onclick="selectStoreFromCard('${escapeHTML(store.code)}')">
          Bu Mağazayı Yönet
        </button>

        <div id="qrBox-${escapeHTML(store.code)}" style="display:none;text-align:center;margin-top:12px;background:white;color:#0f172a;padding:12px;border-radius:14px;">
          <canvas id="qrCanvas-${escapeHTML(store.code)}"></canvas>
          <div style="margin-top:8px;font-weight:bold;">${escapeHTML(store.code)}</div>
        </div>
      </div>
    `;
  });
}

function renderRegionCounts() {
  const storeCount = $("regionStoreCount");
  const managerCount = $("regionManagerCount");
  const personnelCount = $("regionPersonnelCount");

  const stores = storesDB.filter(s => s.company_code === selectedCompany);
  const managers = managersDB.filter(m => m.company_code === selectedCompany);
  const personnel = personnelDB.filter(p => p.company_code === selectedCompany);

  if (storeCount) storeCount.innerText = stores.length;
  if (managerCount) managerCount.innerText = managers.length;
  if (personnelCount) personnelCount.innerText = personnel.length;
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
    const gps = store.latitude && store.longitude ? "GPS var" : "GPS yok";

    area.innerHTML += `
      <div class="log">
        <b>🏬 ${escapeHTML(store.name)}</b><br>
        Kod: ${escapeHTML(store.code)}<br>
        ${gps}<br>
        <button class="loginBtn blue" onclick="showStoreQR('${escapeHTML(store.code)}','${escapeHTML(store.name)}')">
          QR Göster
        </button>
        <button class="loginBtn green" onclick="selectStoreFromCard('${escapeHTML(store.code)}')">
          Bu Mağazayı Seç
        </button>
        <div id="qrBox-${escapeHTML(store.code)}" style="display:none;text-align:center;margin-top:12px;background:white;color:#0f172a;padding:12px;border-radius:14px;">
          <canvas id="qrCanvas-${escapeHTML(store.code)}"></canvas>
          <div style="margin-top:8px;font-weight:bold;">${escapeHTML(store.code)}</div>
        </div>
      </div>
    `;
  });
}

function renderRegionManagers() {
  const area = $("regionManagerList");
  if (!area) return;

  const stores = storesDB.filter(s => s.company_code === selectedCompany);

  if (!stores.length) {
    area.innerHTML = `<div class="log">Mağaza yok.</div>`;
    return;
  }

  area.innerHTML = "";

  stores.forEach(store => {
    const managers = managersDB.filter(m => m.store_code === store.code);

    area.innerHTML += `
      <div class="log">
        <b>🏬 ${escapeHTML(store.name)}</b><br>
        Kod: ${escapeHTML(store.code)}<br>
        ${
          managers.length
            ? managers.map(m => `
              👔 ${escapeHTML(m.name)}<br>
              Kod: ${escapeHTML(m.code)}<br><br>
            `).join("")
            : "Bu mağazada yönetici yok."
        }
      </div>
    `;
  });
}

function renderRegionPersonnel() {
  const area = $("regionPersonnelList");
  if (!area) return;

  const stores = storesDB.filter(s => s.company_code === selectedCompany);

  if (!stores.length) {
    area.innerHTML = `<div class="log">Mağaza yok.</div>`;
    return;
  }

  area.innerHTML = "";

  stores.forEach(store => {
    const personnel = personnelDB.filter(p => p.store_code === store.code);

    area.innerHTML += `
      <div class="log">
        <b>🏬 ${escapeHTML(store.name)}</b><br>
        Kod: ${escapeHTML(store.code)}<br>
        Personel Sayısı: ${personnel.length}<br>
        ${
          personnel.length
            ? personnel.map(p => `
              👤 ${escapeHTML(p.full_name)} / ${escapeHTML(p.personnel_code)}<br>
            `).join("")
            : "Bu mağazada personel yok."
        }
      </div>
    `;
  });
}

function renderRegionLogs() {
  const area = $("regionLogs");
  if (!area) return;

  const companyLogs = logs.filter(l => l.company_code === selectedCompany);

  if (!companyLogs.length) {
    area.innerHTML = `<div class="log">Log yok.</div>`;
    return;
  }

  area.innerHTML = "";

  companyLogs.forEach(log => {
    area.innerHTML += `
      <div class="log">
        🏪 ${escapeHTML(log.store_code)}<br>
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
  renderAdminLogs();
  renderRegionDashboard();
}

function showStoreQR(storeCode, storeName) {
  const box = $("qrBox-" + storeCode);
  const canvas = $("qrCanvas-" + storeCode);

  if (!box || !canvas) return;

  if (!window.QRCode) {
    toast("QR kütüphanesi yüklenemedi");
    return;
  }

  const isVisible = box.style.display === "block";

  if (isVisible) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";

  QRCode.toCanvas(canvas, "STORE:" + storeCode, {
    width: 220,
    margin: 2
  }, function (error) {
    if (error) {
      console.error(error);
      toast("QR oluşturulamadı");
    }
  });
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

  const manager = managersDB.find(
    m => m.code === code && m.password === password
  );

  if (!manager) {
    toast("Bilgiler yanlış");
    return;
  }

  if (manager.store_code !== selectedStore) {
    toast("Bu mağaza için yetkiniz yok");
    return;
  }

  hideAll();
  $("managerPanel").style.display = "block";

  updateCounters();
  renderLogs();
  renderPending();
  await renderPersonnelList();
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
  const hours = $("newPersonHours").value;

  if (!selectedCompany || !selectedStore) {
    toast("Şirket / mağaza seçili değil");
    return;
  }

  if (!name || !code) {
    toast("Ad soyad ve personel kodu zorunlu");
    return;
  }

  const { error } = await supabaseClient
    .from("personnel")
    .insert({
      company_code: selectedCompany,
      store_code: selectedStore,
      personnel_code: code,
      full_name: name,
      personnel_type: type,
      weekly_hours: Number(hours || 0),
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

  await createLog(code, "PERSONNEL_CREATED", "👤 Yeni personel eklendi: " + name + " / " + code);
  await loadAllData();

  await renderPersonnelList();
  renderLogs();
  renderAdminLogs();
  renderRegionDashboard();

  toast("Personel eklendi. Artık tüm cihazlarda görünür.");
}

function getPersonnel(code) {
  return personnelDB.find(
    p => p.personnel_code === code && p.store_code === selectedStore
  );
}

function getActiveUser(code) {
  return users.find(
    u => u.code === code && u.store === selectedStore
  );
}

async function renderPersonnelList() {
  const area = $("personnelList");
  if (!area) return;

  await loadAllData();

  const list = personnelDB.filter(
    p => p.store_code === selectedStore && p.company_code === selectedCompany
  );

  if (!list.length) {
    area.innerHTML = `<div class="log">Bu mağazada henüz personel yok.</div>`;
    return;
  }

  area.innerHTML = "";

  list.forEach(p => {
    const activeUser = users.find(
      u => u.code === p.personnel_code && u.store === selectedStore
    );

    const statusText =
      activeUser?.status === "ACTIVE" ? "Aktif" :
      activeUser?.status === "BREAK" ? "Molada" :
      "Dışarıda";

    area.innerHTML += `
      <div class="log">
        <b>${escapeHTML(p.full_name)}</b><br>
        Kod: ${escapeHTML(p.personnel_code)}<br>
        Tür: ${p.personnel_type === "FULL" ? "Full Personel" : "Part Time"}<br>
        Haftalık Saat: ${escapeHTML(p.weekly_hours || 0)}<br>
        Şifre: ${p.password ? "Oluşturuldu" : "İlk giriş bekleniyor"}<br>
        Durum: ${statusText}<br>
        <button class="loginBtn blue" onclick="resetPersonnelPassword('${p.id}')">Şifre Sıfırla</button>
        <button class="loginBtn red" onclick="deletePersonnel('${p.id}')">Personeli Sil</button>
      </div>
    `;
  });
}

async function resetPersonnelPassword(id) {
  const { error } = await supabaseClient
    .from("personnel")
    .update({ password: null })
    .eq("id", id);

  if (error) {
    toast("Şifre sıfırlanamadı");
    return;
  }

  await loadAllData();
  await renderPersonnelList();

  toast("Şifre sıfırlandı");
}

async function deletePersonnel(id) {
  const person = personnelDB.find(p => p.id === id);
  if (!person) return;

  const ok = confirm(person.full_name + " silinsin mi?");
  if (!ok) return;

  const { error } = await supabaseClient
    .from("personnel")
    .delete()
    .eq("id", id);

  if (error) {
    toast("Personel silinemedi");
    return;
  }

  users = users.filter(
    u => !(u.code === person.personnel_code && u.store === person.store_code)
  );

  saveLocal();

  await createLog(person.personnel_code, "PERSONNEL_DELETED", "🗑️ Personel silindi: " + person.full_name);
  await loadAllData();

  await renderPersonnelList();
  updateCounters();
  renderRegionDashboard();

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

  const entered = prompt("Personel şifrenizi girin:");

  if (entered !== person.password) {
    createPending("Yanlış şifre denemesi: " + person.personnel_code);
    toast("Şifre yanlış");
    return false;
  }

  return true;
}

/* LOCATION */

function fillLocationFields(latId, lngId) {
  if (!navigator.geolocation) {
    toast("Bu cihaz konum desteklemiyor");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      $(latId).value = position.coords.latitude;
      $(lngId).value = position.coords.longitude;
      toast("GPS alındı");
    },
    () => {
      toast("Konum alınamadı. İzin verilmedi veya cihaz engelledi.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function getCurrentStoreInfo() {
  const list = companies[selectedCompany]?.stores || [];
  return list.find(s => s.code === selectedStore) || null;
}

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
      lastLocationResult = { ok: true, message: "GPS tanımı yok, QR ile devam edildi" };
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

/* QR SCANNER */

async function stopScanner() {
  try {
    if (qrScanner) {
      await qrScanner.stop();
      await qrScanner.clear();
      qrScanner = null;
    }
  } catch (e) {}

  const reader = $("reader");

  if (reader) {
    reader.innerHTML = "";
    reader.style.display = "none";
  }

  qrRunning = false;
  qrProcessed = false;
}

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
    toast("Bu personel kayıtlı değil. Yönetici panelinden eklenmeli.");
    return;
  }

  const passwordOk = await checkPersonnelPassword(person);
  if (!passwordOk) return;

  const locationOk = await verifyLocation();

  if (!locationOk) {
    toast("Konum doğrulaması başarısız. Yönetici onayı gerekli.");
    return;
  }

  await stopScanner();

  qrRunning = true;
  qrProcessed = false;
  $("reader").style.display = "block";

  qrScanner = new Html5Qrcode("reader");

  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 5, qrbox: 220 },
      async decodedText => {
        if (qrProcessed) return;

        qrProcessed = true;
        await stopScanner();

        const validQR =
          decodedText === "STORE:" + selectedStore ||
          decodedText === selectedStore;

        if (!validQR) {
          createPending("Yanlış mağaza QR: " + code);
          toast("Geçersiz QR");
          return;
        }

        await processAction(code, person);
      },
      () => {}
    );
  } catch (e) {
    await stopScanner();
    toast("Kamera açılamadı. Kamera iznini kontrol et.");
  }
}

/* PROCESS */

async function processAction(code, person) {
  if (currentAction === "LOGIN") {
    const exists = getActiveUser(code);

    if (exists) {
      createPending("Çoklu giriş denemesi: " + code);
      toast("Bu personel zaten içeride.");
      return;
    }

    users.push({
      id: generateId(),
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

    await createLog(code, "LOGIN", "✅ " + person.full_name + " giriş yaptı");

    updateCounters();
    await renderPersonnelList();

    toast("Giriş başarılı");
  }

  if (currentAction === "BREAK") {
    const user = getActiveUser(code);

    if (!user) {
      createPending("Girişsiz mola denemesi: " + code);
      toast("Önce giriş yapılmalı");
      return;
    }

    if (user.status === "BREAK") {
      const start = user.breakStart || Date.now();
      const minutes = Math.max(1, Math.round((Date.now() - start) / 60000));

      user.status = "ACTIVE";
      user.breakStart = null;
      user.totalBreakMinutes = (user.totalBreakMinutes || 0) + minutes;

      saveLocal();

      await createLog(code, "BREAK_RETURN", "✅ " + person.full_name + " moladan döndü (" + minutes + " dk)");

      updateCounters();
      await renderPersonnelList();

      toast("Mola bitti: " + minutes + " dk");
      return;
    }

    user.status = "BREAK";
    user.breakStart = Date.now();

    saveLocal();

    await createLog(code, "BREAK_START", "☕ " + person.full_name + " mola başlattı");

    updateCounters();
    await renderPersonnelList();

    toast("Mola başladı");
  }

  if (currentAction === "EXIT") {
    const user = getActiveUser(code);

    if (!user) {
      createPending("Geçersiz çıkış denemesi: " + code);
      toast("Aktif giriş bulunamadı.");
      return;
    }

    if (user.status === "BREAK") {
      createPending("Moladayken çıkış denemesi: " + code);
      toast("Önce molayı bitirmelisin.");
      return;
    }

    const totalMinutes = Math.max(1, Math.round((Date.now() - user.loginTime) / 60000));
    const breakMinutes = user.totalBreakMinutes || 0;
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);

    users = users.filter(
      u => !(u.code === code && u.store === selectedStore)
    );

    saveLocal();

    await createLog(
      code,
      "EXIT",
      "👋 " + person.full_name + " çıkış yaptı | Çalışma: " + workMinutes + " dk | Mola: " + breakMinutes + " dk"
    );

    updateCounters();
    await renderPersonnelList();

    toast("Çıkış başarılı");
  }
}

/* LOGS */

async function createLog(personnelCode, action, details) {
  const { error } = await supabaseClient
    .from("attendance_logs")
    .insert({
      company_code: selectedCompany,
      store_code: selectedStore,
      personnel_code: personnelCode || null,
      action,
      details
    });

  if (error) console.error("Log kaydedilemedi:", error.message);

  await loadAllData();
  renderLogs();
  renderRegionDashboard();
  renderAdminLogs();
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
        🏪 ${escapeHTML(log.store_code)}<br>
        ${escapeHTML(log.details)}<br>
        <small>${new Date(log.created_at).toLocaleString("tr-TR")}</small>
      </div>
    `;
  });
}

/* PENDING */

function createPending(text) {
  pendingApprovals.unshift({
    id: generateId(),
    company: selectedCompany,
    store: selectedStore,
    text,
    time: new Date().toLocaleString("tr-TR"),
    timestamp: Date.now()
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
        ⚠️ ${escapeHTML(item.text)}<br>
        <small>${escapeHTML(item.time)}</small>
        <button class="loginBtn green" onclick="approvePending('${item.id}')">Onayla</button>
        <button class="loginBtn red" onclick="rejectPending('${item.id}')">Reddet</button>
      </div>
    `;
  });
}

function approvePending(id) {
  pendingApprovals = pendingApprovals.filter(p => p.id !== id);
  saveLocal();
  renderPending();
}

function rejectPending(id) {
  pendingApprovals = pendingApprovals.filter(p => p.id !== id);
  saveLocal();
  renderPending();
}

/* COUNTERS / ADMIN */

function updateCounters() {
  const activeEl = $("activeCount");
  const breakEl = $("breakCount");
  const exitEl = $("exitCount");

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
      l => l.store_code === selectedStore && l.action === "EXIT"
    ).length;
  }
}

function renderAdminLogs() {
  const area = $("adminLogs");
  if (!area) return;

  area.innerHTML = `
    <div class="log">
      <b>Sistem Özeti</b><br>
      Şirket Sayısı: ${Object.keys(companies).length}<br>
      Mağaza Sayısı: ${storesDB.length}<br>
      Seçili Şirket: ${escapeHTML(selectedCompany || "-")}<br>
      Seçili Mağaza: ${escapeHTML(selectedStore || "-")}<br>
      Yönetici Sayısı: ${managersDB.length}<br>
      Bölge Müdürü Sayısı: ${regionsDB.length}<br>
      Personel Sayısı: ${personnelDB.length}<br>
      Aktif İçeride: ${users.length}<br>
      Log Sayısı: ${logs.length}<br>
      Onay Bekleyen: ${pendingApprovals.length}<br>
      Veri Kaynağı: Supabase
    </div>
  `;

  storesDB.forEach(store => {
    area.innerHTML += `
      <div class="log">
        <b>🏬 ${escapeHTML(store.name)}</b><br>
        Şirket: ${escapeHTML(store.company_code)}<br>
        Kod: ${escapeHTML(store.code)}<br>
        <button class="loginBtn blue" onclick="showStoreQR('${escapeHTML(store.code)}','${escapeHTML(store.name)}')">
          QR Göster
        </button>
        <button class="loginBtn green" onclick="selectStoreFromCard('${escapeHTML(store.code)}')">
          Seç
        </button>
        <div id="qrBox-${escapeHTML(store.code)}" style="display:none;text-align:center;margin-top:12px;background:white;color:#0f172a;padding:12px;border-radius:14px;">
          <canvas id="qrCanvas-${escapeHTML(store.code)}"></canvas>
          <div style="margin-top:8px;font-weight:bold;">${escapeHTML(store.code)}</div>
        </div>
      </div>
    `;
  });
}

/* START */

initApp();