/* DATABASE */

let users =
JSON.parse(
localStorage.getItem("users")
) || [];

let logs =
JSON.parse(
localStorage.getItem("logs")
) || [];

let pendingApprovals =
JSON.parse(
localStorage.getItem("pendingApprovals")
) || [];

let selectedStore =
localStorage.getItem("selectedStore");

/* MASTER */

const MASTER_CODE =
"9-9-999";

const MASTER_PASSWORD =
"1234";

/* MANAGERS */

const managers = [

{
code:"M085-ADMIN",
password:"1234",
store:"SKX-M085"
},

{
code:"M086-ADMIN",
password:"1234",
store:"SKX-M086"
},

{
code:"LTB-ADMIN",
password:"1234",
store:"LTB-M201"
}

];

/* QR */

let qrScanner = null;

let qrRunning = false;

let qrProcessed = false;

/* ACTION */

let currentAction = "LOGIN";

let selectedBreak = 15;

/* INIT */

if(selectedStore){

document.getElementById(
"storePage"
).style.display = "none";

document.getElementById(
"homePage"
).style.display = "block";

}

/* STORE */

function saveStore(){

selectedStore =
document.getElementById(
"storeSelect"
).value;

localStorage.setItem(
"selectedStore",
selectedStore
);

document.getElementById(
"storePage"
).style.display = "none";

document.getElementById(
"homePage"
).style.display = "block";

}

/* UI */

function hideAll(){

const panels = [

"homePage",
"personPanel",
"managerPanel",
"regionPanel",
"managerLoginPanel",
"regionLoginPanel"

];

panels.forEach(id=>{

const el =
document.getElementById(id);

if(el){

el.style.display = "none";

}

});

}

function goHome(){

hideAll();

document.getElementById(
"homePage"
).style.display = "block";

stopScanner();

}

function openPersonPanel(){

hideAll();

document.getElementById(
"personPanel"
).style.display = "block";

}

function openManagerLogin(){

hideAll();

document.getElementById(
"managerLoginPanel"
).style.display = "block";

}

function openRegionLogin(){

hideAll();

document.getElementById(
"regionLoginPanel"
).style.display = "block";

}

/* ACTION */

function setAction(action){

currentAction = action;

document.getElementById(
"loginAction"
).classList.remove(
"selectedAction"
);

document.getElementById(
"breakAction"
).classList.remove(
"selectedAction"
);

document.getElementById(
"exitAction"
).classList.remove(
"selectedAction"
);

if(action==="LOGIN"){

document.getElementById(
"loginAction"
).classList.add(
"selectedAction"
);

}

if(action==="BREAK"){

document.getElementById(
"breakAction"
).classList.add(
"selectedAction"
);

}

if(action==="EXIT"){

document.getElementById(
"exitAction"
).classList.add(
"selectedAction"
);

}

}

function setBreakTime(min){

selectedBreak = min;

}

/* LOGS */

function createLog(text){

logs.unshift({

store:selectedStore,
text,
time:new Date()
.toLocaleString()

});

localStorage.setItem(
"logs",
JSON.stringify(logs)
);

renderLogs();
renderRegionLogs();

}

/* PENDING */

function createPending(text){

pendingApprovals.unshift({

store:selectedStore,
text,
time:new Date()
.toLocaleString()

});

localStorage.setItem(
"pendingApprovals",
JSON.stringify(
pendingApprovals
)
);

renderPending();

}

function renderPending(){

const area =
document.getElementById(
"pendingArea"
);

if(!area) return;

area.innerHTML = "";

pendingApprovals
.filter(
p=>p.store===selectedStore
)
.forEach((item,index)=>{

area.innerHTML += `

<div class="pendingBox">

⚠️ ${item.text}<br>

<small>
${item.time}
</small>

<button
class="loginBtn green"
onclick="approvePending(${index})">

Onayla

</button>

<button
class="loginBtn red"
onclick="rejectPending(${index})">

Reddet

</button>

</div>

`;

});

}

function approvePending(index){

pendingApprovals.splice(index,1);

localStorage.setItem(
"pendingApprovals",
JSON.stringify(
pendingApprovals
)
);

renderPending();

}

function rejectPending(index){

pendingApprovals.splice(index,1);

localStorage.setItem(
"pendingApprovals",
JSON.stringify(
pendingApprovals
)
);

renderPending();

}

/* MANAGER LOGIN */

function managerLogin(){

const code =
document.getElementById(
"managerCode"
).value;

const password =
document.getElementById(
"managerPassword"
).value;

const manager =
managers.find(
m =>
m.code===code &&
m.password===password
);

if(!manager){

alert(
"Bilgiler yanlış"
);

return;

}

if(
manager.store !== selectedStore
){

alert(
"Bu mağaza için yetkiniz yok"
);

return;

}

hideAll();

document.getElementById(
"managerPanel"
).style.display = "block";

updateCounters();
renderLogs();
renderPending();

}

/* MASTER LOGIN */

function regionLogin(){

const code =
document.getElementById(
"regionCode"
).value;

const password =
document.getElementById(
"regionPassword"
).value;

if(
code !== MASTER_CODE ||
password !== MASTER_PASSWORD
){

alert(
"Erişim reddedildi"
);

return;

}

hideAll();

document.getElementById(
"regionPanel"
).style.display = "block";

renderRegionLogs();

}

/* QR */

async function stopScanner(){

try{

if(qrScanner){

await qrScanner.stop();

await qrScanner.clear();

qrScanner = null;

}

}catch(e){}

const reader =
document.getElementById(
"reader"
);

if(reader){

reader.innerHTML = "";

reader.style.display = "none";

}

qrRunning = false;

qrProcessed = false;

}

async function startQRScanner(){

if(qrRunning){

return;

}

const code =
document.getElementById(
"personCode"
).value;

if(!code){

alert(
"Personel kodu gerekli"
);

return;

}

await stopScanner();

qrRunning = true;

document.getElementById(
"reader"
).style.display = "block";

qrScanner =
new Html5Qrcode("reader");

try{

await qrScanner.start(

{
facingMode:"environment"
},

{
fps:5,
qrbox:200
},

async(decodedText)=>{

if(qrProcessed){

return;

}

qrProcessed = true;

await stopScanner();

if(
decodedText !==
"STORE:" + selectedStore
){

createPending(
"Yanlış mağaza QR"
);

alert(
"Geçersiz QR"
);

return;

}

processAction(code);

},

()=>{}

);

}catch(e){

await stopScanner();

alert(
"Kamera açılamadı"
);

}

}

/* PROCESS */

function processAction(code){

/* LOGIN */

if(currentAction==="LOGIN"){

const exists =
users.find(
u =>
u.code===code &&
u.store===selectedStore
);

if(exists){

createPending(
"Çoklu giriş: " +
code
);

alert(
"Yönetici onayı gerekli"
);

return;

}

users.push({

code,
store:selectedStore,
status:"ACTIVE"

});

localStorage.setItem(
"users",
JSON.stringify(users)
);

createLog(
"✅ " +
code +
" giriş yaptı"
);

updateCounters();

alert(
"Giriş başarılı"
);

}

/* BREAK */

if(currentAction==="BREAK"){

const userIndex =
users.findIndex(
u =>
u.code===code &&
u.store===selectedStore
);

if(userIndex === -1){

createPending(
"Girişsiz mola: " +
code
);

alert(
"Onay gerekli"
);

return;

}

users[userIndex].status =
"BREAK";

localStorage.setItem(
"users",
JSON.stringify(users)
);

createLog(
"☕ " +
code +
" molada"
);

updateCounters();

alert(
"Mola başladı"
);

}

/* EXIT */

if(currentAction==="EXIT"){

const exists =
users.find(
u =>
u.code===code &&
u.store===selectedStore
);

if(!exists){

createPending(
"Geçersiz çıkış: " +
code
);

alert(
"Onay gerekli"
);

return;

}

users =
users.filter(
u =>
!(
u.code===code &&
u.store===selectedStore
)
);

localStorage.setItem(
"users",
JSON.stringify(users)
);

createLog(
"👋 " +
code +
" çıkış yaptı"
);

updateCounters();

alert(
"Çıkış başarılı"
);

}

}

/* COUNTERS */

function updateCounters(){

document.getElementById(
"activeCount"
).innerText =

users.filter(
u =>
u.store===selectedStore &&
u.status==="ACTIVE"
).length;

document.getElementById(
"breakCount"
).innerText =

users.filter(
u =>
u.store===selectedStore &&
u.status==="BREAK"
).length;

document.getElementById(
"exitCount"
).innerText =

logs.filter(
l =>
l.store===selectedStore &&
l.text.includes("çıkış")
).length;

}

/* RENDER LOGS */

function renderLogs(){

const area =
document.getElementById(
"logsArea"
);

if(!area) return;

area.innerHTML = "";

logs
.filter(
l=>l.store===selectedStore
)
.forEach(log=>{

area.innerHTML += `

<div class="log">

🏪 ${log.store}<br>

${log.text}<br>

<small>
${log.time}
</small>

</div>

`;

});

}

function renderRegionLogs(){

const area =
document.getElementById(
"regionLogs"
);

if(!area) return;

area.innerHTML = "";

logs.forEach(log=>{

area.innerHTML += `

<div class="log">

🏪 ${log.store}<br>

${log.text}<br>

<small>
${log.time}
</small>

</div>

`;

});

}

/* INIT */

updateCounters();
renderLogs();