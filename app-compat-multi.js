/* ==== FIREBASE CONFIG ==== */
const firebaseConfig = {
  apiKey: "AIzaSyB-Y1ydzoD2rQONDLTMz5qDnCdBBc6sF9Q",
  authDomain: "smart-dustbin-9f582.firebaseapp.com",
  projectId: "smart-dustbin-9f582",
  storageBucket: "smart-dustbin-9f582.firebasestorage.app",
  messagingSenderId: "463558998968",
  appId: "1:463558998968:web:3104a7ad0367ff603eed4d",
  measurementId: "G-0BB8G8T8QE"
};

// 1) Init
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2) DOM
const elPill    = document.getElementById("statusPill");
const elSelect  = document.getElementById("deviceSelect");
const elFill    = document.getElementById("fillPct");
const elDist    = document.getElementById("distance");
const elDepth   = document.getElementById("depth");
const elUpdated = document.getElementById("updatedAt");
const elMeterFg = document.getElementById("meterFg");

// Ring meter helper (circumference ~ 326)
const C = 326;
function setRingPercent(pct){
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = C - (C * clamped / 100);
  elMeterFg.style.strokeDashoffset = String(offset);
  elFill.textContent = clamped.toFixed(0) + "%";
}
function setPill(status){
  elPill.textContent = status || "—";
  elPill.classList.remove("pill-empty","pill-half","pill-full");
  if (status === "FULL") elPill.classList.add("pill-full");
  else if (status === "HALF") elPill.classList.add("pill-half");
  else elPill.classList.add("pill-empty");
}
function tsToLocal(ts) {
  if (!ts) return "—";
  try { if (ts.toDate) return ts.toDate().toLocaleString(); } catch(_) {}
  try { return new Date(ts).toLocaleString(); } catch(_) {}
  return "—";
}
function resetUI(){
  setRingPercent(0); setPill("—");
  elDist.textContent = "—"; elDepth.textContent = "—"; elUpdated.textContent = "—";
}

// 3) Read URL ?id=...
function getQueryId(){
  const m = (location.search || "").match(/[?&]id=([^&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

// 4) Manage subscriptions
let unsubscribeDoc = null;
function watchDevice(deviceId){
  if (!deviceId) return;
  if (unsubscribeDoc) { unsubscribeDoc(); unsubscribeDoc = null; }
  resetUI();

  // reflect selection, remember last choice
  elSelect.value = deviceId;
  try { localStorage.setItem("lastDeviceId", deviceId); } catch(_){}

  unsubscribeDoc = db.collection("bins").doc(deviceId).onSnapshot((snap)=>{
    if (!snap.exists) { console.warn("Doc missing:", deviceId); resetUI(); return; }
    const d = snap.data();
    const distance_cm = Number(d.distance_cm || 0);
    const depth_cm    = Number(d.binDepth_cm || 0);
    const fill_pct    = Number(d.fill_pct || 0);
    const status      = d.status || "EMPTY";
    const updatedAt   = d.updatedAt || d.time || null;

    elDist.textContent = isFinite(distance_cm) ? distance_cm.toFixed(1) : "—";
    elDepth.textContent = isFinite(depth_cm) ? depth_cm.toFixed(1)   : "—";
    setRingPercent(fill_pct);
    setPill(status);
    elUpdated.textContent = tsToLocal(updatedAt);
  }, (err) => {
    console.error("onSnapshot error:", err);
    alert("Firestore error: " + (err && err.message ? err.message : err));
  });
}

// 5) Populate device dropdown and auto-select
let unsubscribeList = null;
function startDeviceList(){
  // Order by updatedAt desc so first option is most recently updated
  unsubscribeList = db.collection("bins").orderBy("updatedAt", "desc").onSnapshot((qs)=>{
    const devices = [];
    qs.forEach(doc => devices.push({ id: doc.id, d: doc.data() }));

    // build options
    elSelect.innerHTML = "";
    devices.forEach(({id, d})=>{
      const opt = document.createElement("option");
      opt.value = id;
      const pct = typeof d.fill_pct === "number" ? ` (${d.fill_pct}%)` : "";
      opt.textContent = id + pct;
      elSelect.appendChild(opt);
    });

    // pick current: URL ?id > localStorage > first (latest)
    let target = getQueryId();
    if (!target) {
      try { target = localStorage.getItem("lastDeviceId"); } catch(_){}
    }
    if (!target && devices.length) target = devices[0].id;

    if (target) watchDevice(target);
  });
}

// 6) Handle manual selection changes
elSelect.addEventListener("change", (e)=>{
  const id = e.target.value;
  // if URL had ?id, keep it; otherwise, remember selection
  watchDevice(id);
});

// Go!
startDeviceList();
