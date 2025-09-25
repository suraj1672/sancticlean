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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ==== SUPABASE CONFIG ==== */
const supabaseUrl = 'https://iyqadlwfcvnveiwroive.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cWFkbHdmY3ZudmVpd3JvaXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzU5NzIsImV4cCI6MjA3NDM1MTk3Mn0.gFyc6PpjzaDpjOpWixS8DiqE_Cj2IuNK1Lbc9JckPgc';

// Initialize Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ==== TEMPLE CONFIGURATION ==== */
const TEMPLES = {
  jagannath: {
    name: "Jagannath Temple",
    deviceId: "TEMPLE_01",
    location: "Main Temple Complex, Puri",
    fullCountToday: 0,
    notifications: 0
  },
  gundicha: {
    name: "Gundicha Temple",
    deviceId: "TEMPLE_02",
    location: "Gundicha Ghar, Puri",
    fullCountToday: 0,
    notifications: 0
  },
  lokanath: {
    name: "Lokanath Temple",
    deviceId: "TEMPLE_03",
    location: "Lokanath Road, Puri",
    fullCountToday: 0,
    notifications: 0
  },
  mausimaa: {
    name: "Mausi Maa Temple",
    deviceId: "TEMPLE_04",
    location: "Grand Road, Puri",
    fullCountToday: 0,
    notifications: 0
  }
};

/* ==== NGO CONFIGURATION ==== */
const NGOS = {
  greenpuri: {
    name: "Green Puri Initiative",
    description: "Environmental conservation and waste management",
    phone: "+91 9876543210",
    email: "info@greenpuri.org"
  },
  swachhodisha: {
    name: "Swachh Odisha Foundation",
    description: "Clean India mission implementation",
    phone: "+91 9876543211",
    email: "contact@swachhodisha.org"
  },
  templecare: {
    name: "Temple Care Society",
    description: "Temple maintenance and cleanliness",
    phone: "+91 9876543212",
    email: "help@templecare.org"
  },
  cleannetwork: {
    name: "Community Clean Network",
    description: "Community-driven cleanliness programs",
    phone: "+91 9876543213",
    email: "info@cleannetwork.org"
  }
};

/* ==== GLOBAL VARIABLES ==== */
let unsubscribers = {};
let dailyStats = {
  totalCollections: 0,
  totalAlerts: 0,
  activeDevices: 0,
  lastSync: null
};

/* ==== SUPABASE NGO FUNCTIONS ==== */
async function loadNGOsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('ngos')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading NGOs from Supabase:', error);
      // If table doesn't exist, initialize with default data
      await initializeNGOsInSupabase();
      return;
    }

    // Update the NGOS object with data from Supabase
    if (data && data.length > 0) {
      data.forEach(ngo => {
        if (NGOS[ngo.id]) {
          NGOS[ngo.id] = {
            name: ngo.name,
            description: ngo.description,
            phone: ngo.phone,
            email: ngo.email
          };

          // Update the UI elements
          updateNGOUI(ngo.id, ngo);
        }
      });
    } else {
      // If no data exists, initialize with default data
      await initializeNGOsInSupabase();
    }
  } catch (error) {
    console.error('Error loading NGOs:', error);
    // If there's an error, initialize with default data
    await initializeNGOsInSupabase();
  }
}

async function initializeNGOsInSupabase() {
  try {
    console.log('Initializing NGO data in Supabase...');

    // Insert default NGO data
    const ngoData = Object.entries(NGOS).map(([id, ngo]) => ({
      id: id,
      name: ngo.name,
      description: ngo.description,
      phone: ngo.phone,
      email: ngo.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('ngos')
      .insert(ngoData);

    if (error) {
      console.error('Error initializing NGOs in Supabase:', error);
    } else {
      console.log('NGO data initialized successfully in Supabase');
    }
  } catch (error) {
    console.error('Error initializing NGOs:', error);
  }
}

function updateNGOUI(ngoId, ngoData) {
  const nameElement = document.getElementById(`ngo-name-${ngoId}`);
  const descElement = document.getElementById(`ngo-desc-${ngoId}`);
  const phoneElement = document.getElementById(`ngo-phone-${ngoId}`);
  const emailElement = document.getElementById(`ngo-email-${ngoId}`);

  if (nameElement) nameElement.textContent = ngoData.name;
  if (descElement) descElement.textContent = ngoData.description;
  if (phoneElement) phoneElement.textContent = ngoData.phone;
  if (emailElement) emailElement.textContent = ngoData.email;
}

async function saveNGOToSupabase(ngoId, ngoData) {
  try {
    const { data, error } = await supabase
      .from('ngos')
      .upsert({
        id: ngoId,
        name: ngoData.name,
        description: ngoData.description,
        phone: ngoData.phone,
        email: ngoData.email,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving NGO to Supabase:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error saving NGO:', error);
    throw error;
  }
}

/* ==== UTILITY FUNCTIONS ==== */
const C = 326; // Ring circumference

function setRingPercent(templeId, pct) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = C - (C * clamped / 100);
  const meterElement = document.getElementById(`meter-${templeId}`);
  const fillElement = document.getElementById(`fill-${templeId}`);

  if (meterElement && fillElement) {
    meterElement.style.strokeDashoffset = String(offset);
    fillElement.textContent = clamped.toFixed(0) + "%";
  }
}

function setPill(templeId, status) {
  const pillElement = document.getElementById(`status-${templeId}`);
  const cardElement = document.querySelector(`[data-temple="${templeId}"]`);

  if (pillElement && cardElement) {
    pillElement.textContent = status || "—";
    pillElement.classList.remove("pill-empty", "pill-half", "pill-full");
    cardElement.classList.remove("alert", "warning", "success");

    if (status === "FULL") {
      pillElement.classList.add("pill-full");
      cardElement.classList.add("alert");
    } else if (status === "HALF") {
      pillElement.classList.add("pill-half");
      cardElement.classList.add("warning");
    } else {
      pillElement.classList.add("pill-empty");
      cardElement.classList.add("success");
    }
  }
}

function tsToLocal(ts) {
  if (!ts) return "—";
  try {
    if (ts.toDate) return ts.toDate().toLocaleString();
  } catch (_) { }
  try {
    return new Date(ts).toLocaleString();
  } catch (_) { }
  return "—";
}

function resetTempleUI(templeId) {
  setRingPercent(templeId, 0);
  setPill(templeId, "—");

  const elements = [
    `distance-${templeId}`,
    `depth-${templeId}`,
    `updated-${templeId}`,
    `full-count-${templeId}`,
    `notifications-${templeId}`
  ];

  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = id.includes('full-count') || id.includes('notifications') ? "0" : "—";
    }
  });
}

function updateNotificationCount(templeId, count) {
  const notificationElement = document.getElementById(`notifications-${templeId}`);
  if (notificationElement) {
    notificationElement.textContent = `${count} alerts`;
    TEMPLES[templeId].notifications = count;
  }
}

function incrementFullCount(templeId) {
  TEMPLES[templeId].fullCountToday++;
  dailyStats.totalCollections++;
  console.log(`📊 ${TEMPLES[templeId].name} full count: ${TEMPLES[templeId].fullCountToday}`);
}

/* ==== FIRESTORE LISTENERS ==== */
function watchTempleDevice(templeId) {
  const temple = TEMPLES[templeId];
  if (!temple) return;

  // Clean up existing subscription
  if (unsubscribers[templeId]) {
    unsubscribers[templeId]();
    delete unsubscribers[templeId];
  }

  resetTempleUI(templeId);

  // Listen to device data
  unsubscribers[templeId] = db.collection("bins").doc(temple.deviceId).onSnapshot((snap) => {
    if (!snap.exists) {
      console.warn(`Device ${temple.deviceId} not found for ${temple.name}`);
      resetTempleUI(templeId);
      return;
    }

    const data = snap.data();
    updateTempleDisplay(templeId, data);

  }, (error) => {
    console.error(`Error watching ${temple.name}:`, error);
    resetTempleUI(templeId);
  });
}

function updateTempleDisplay(templeId, data) {
  const distance_cm = Number(data.distance_cm || 0);
  const depth_cm = Number(data.binDepth_cm || 0);
  const fill_pct = Number(data.fill_pct || 0);
  const status = data.status || "EMPTY";
  const updatedAt = data.updatedAt || data.time || null;

  // Update distance
  const distanceElement = document.getElementById(`distance-${templeId}`);
  if (distanceElement) {
    distanceElement.textContent = isFinite(distance_cm) ? distance_cm.toFixed(1) : "—";
  }

  // Update depth
  const depthElement = document.getElementById(`depth-${templeId}`);
  if (depthElement) {
    depthElement.textContent = isFinite(depth_cm) ? depth_cm.toFixed(1) : "—";
  }

  // Update ring and status
  setRingPercent(templeId, fill_pct);
  setPill(templeId, status);

  // Update timestamp
  const updatedElement = document.getElementById(`updated-${templeId}`);
  if (updatedElement) {
    updatedElement.textContent = tsToLocal(updatedAt);
  }

  // Handle full bin notifications
  if (status === "FULL") {
    handleFullBinNotification(templeId, data);
  }

  // Update last sync time
  dailyStats.lastSync = new Date().toLocaleString();
}

function handleFullBinNotification(templeId, data) {
  const temple = TEMPLES[templeId];

  // Check if this is a new "FULL" status (you might want to store previous status)
  // For now, we'll increment notification count
  temple.notifications++;
  updateNotificationCount(templeId, temple.notifications);

  // Send email notification (simulated - actual SMTP will be handled by Arduino)
  console.log(`📧 SMTP Notification: ${temple.name} dustbin is FULL!`);
  console.log(`📍 Location: ${temple.location}`);
  console.log(`📊 Fill Level: ${data.fill_pct}%`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);

  // You could also trigger a browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${temple.name} - Bin Full!`, {
      body: `The dustbin at ${temple.location} is full and needs attention.`,
      icon: '/favicon.ico'
    });
  }
}

/* ==== STATISTICS AND NOTIFICATIONS ==== */
function watchNotifications() {
  // Watch for notification documents in Firestore
  db.collection("notifications").where("date", "==", getTodayDateString()).onSnapshot((snapshot) => {
    let totalAlerts = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const templeId = getTempleIdFromDeviceId(data.deviceId);
      if (templeId) {
        totalAlerts += data.alertCount || 0;
      }
    });

    dailyStats.totalAlerts = totalAlerts;
    updateSummaryStats();
  });
}

function watchDailyStats() {
  // Watch for daily collection statistics
  db.collection("dailyStats").doc(getTodayDateString()).onSnapshot((snap) => {
    if (snap.exists) {
      const data = snap.data();
      dailyStats.totalCollections = data.totalCollections || 0;

      // Update individual temple counts
      Object.keys(TEMPLES).forEach(templeId => {
        const deviceId = TEMPLES[templeId].deviceId;
        TEMPLES[templeId].fullCountToday = data[`${deviceId}_count`] || 0;
        const fullCountElement = document.getElementById(`full-count-${templeId}`);
        if (fullCountElement) {
          fullCountElement.textContent = TEMPLES[templeId].fullCountToday;
        }
      });

      updateSummaryStats();
    }
  });
}

function updateSummaryStats() {
  // Count active devices
  dailyStats.activeDevices = Object.keys(unsubscribers).length;

  // Update last sync time
  dailyStats.lastSync = new Date().toLocaleString();

  console.log(`📊 Active devices: ${dailyStats.activeDevices}/4`);
  console.log(`🔄 Last sync: ${dailyStats.lastSync}`);
}

/* ==== HELPER FUNCTIONS ==== */
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function getTempleIdFromDeviceId(deviceId) {
  for (const [templeId, temple] of Object.entries(TEMPLES)) {
    if (temple.deviceId === deviceId) {
      return templeId;
    }
  }
  return null;
}

/* ==== INITIALIZATION ==== */
async function initializeDashboard() {
  console.log("🏛️ Initializing Puri Temple Dashboard...");

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Test Supabase connection
  console.log("🔗 Testing Supabase connection...");
  const supabaseConnected = await testSupabaseConnection();

  if (supabaseConnected) {
    // Load NGO data from Supabase
    console.log("📋 Loading NGO data from Supabase...");
    await loadNGOsFromSupabase();
  } else {
    console.warn("⚠️ Supabase connection failed, using default NGO data");
  }

  // Start watching all temple devices
  Object.keys(TEMPLES).forEach(templeId => {
    console.log(`📡 Starting monitoring for ${TEMPLES[templeId].name}...`);
    watchTempleDevice(templeId);
  });

  // Start watching notifications
  watchNotifications();

  // Initialize summary stats
  updateSummaryStats();

  console.log("✅ Dashboard initialized successfully!");
}

/* ==== ERROR HANDLING ==== */
window.addEventListener('error', (event) => {
  console.error('Dashboard Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

/* ==== CLEANUP ==== */
window.addEventListener('beforeunload', () => {
  // Clean up all subscriptions
  Object.values(unsubscribers).forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
});

/* ==== NAVIGATION HANDLERS ==== */
function setupNavigationHandlers() {
  // Add click handlers to temple cards for navigation
  Object.keys(TEMPLES).forEach(templeId => {
    const templeCard = document.querySelector(`[data-temple="${templeId}"]`);
    if (templeCard) {
      templeCard.style.cursor = 'pointer';
      templeCard.addEventListener('click', () => {
        window.location.href = `temple-detail.html?temple=${templeId}`;
      });

      // Add hover effect
      templeCard.addEventListener('mouseenter', () => {
        templeCard.style.transform = 'translateY(-5px)';
      });

      templeCard.addEventListener('mouseleave', () => {
        templeCard.style.transform = 'translateY(-3px)';
      });
    }
  });
}

/* ==== START THE APPLICATION ==== */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeDashboard();
  setupNavigationHandlers();
});

/* ==== ADDITIONAL FEATURES FOR DEVELOPMENT ==== */

// Function to simulate data for testing (remove in production)
function simulateTempleData(templeId, fillPercent, status) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const mockData = {
      distance_cm: Math.random() * 30 + 5,
      binDepth_cm: 50,
      fill_pct: fillPercent,
      status: status,
      updatedAt: new Date(),
      time: new Date()
    };
    updateTempleDisplay(templeId, mockData);
  }
}

/* ==== EDIT FUNCTIONALITY ==== */

// Temple edit functions
function editTemple(templeId) {
  const temple = TEMPLES[templeId];
  if (!temple) return;

  const nameEl = document.querySelector(`[data-temple="${templeId}"] h3`);
  const locationEl = document.querySelector(`[data-temple="${templeId}"] .temple-location`);

  if (!nameEl || !locationEl) return;

  // Create edit form
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  editForm.innerHTML = `
    <div class="edit-form-content">
      <h4>Edit Temple Details</h4>
      <div class="form-group">
        <label>Temple Name:</label>
        <input type="text" id="edit-temple-name" value="${temple.name}">
      </div>
      <div class="form-group">
        <label>Location:</label>
        <input type="text" id="edit-temple-location" value="${temple.location}">
      </div>
      <div class="form-actions">
        <button class="save-btn" onclick="saveTemple('${templeId}')">Save</button>
        <button class="cancel-btn" onclick="cancelEdit('${templeId}')">Cancel</button>
      </div>
    </div>
  `;

  // Replace temple card content
  const templeCard = document.querySelector(`[data-temple="${templeId}"]`);
  const originalContent = templeCard.innerHTML;
  templeCard.innerHTML = '';
  templeCard.appendChild(editForm);

  // Store original content for cancel
  templeCard.dataset.originalContent = originalContent;
}

function saveTemple(templeId) {
  const temple = TEMPLES[templeId];
  const newName = document.getElementById('edit-temple-name').value.trim();
  const newLocation = document.getElementById('edit-temple-location').value.trim();

  if (!newName || !newLocation) {
    alert('Please fill in all fields');
    return;
  }

  // Update temple data
  temple.name = newName;
  temple.location = newLocation;

  // Save to Firebase
  db.collection('templeConfig').doc(templeId).set({
    name: newName,
    location: newLocation,
    deviceId: temple.deviceId,
    lastUpdated: new Date()
  }).then(() => {
    // Restore temple card with updated data
    restoreTempleCard(templeId);
    showMessage('Temple details updated successfully!', 'success');
  }).catch(error => {
    console.error('Error saving temple:', error);
    showMessage('Error saving temple details', 'error');
  });
}

function cancelEdit(templeId) {
  restoreTempleCard(templeId);
}

function restoreTempleCard(templeId) {
  const templeCard = document.querySelector(`[data-temple="${templeId}"]`);
  const originalContent = templeCard.dataset.originalContent;

  if (originalContent) {
    templeCard.innerHTML = originalContent;
    delete templeCard.dataset.originalContent;
  }
}

// NGO edit functions
function editNGO(ngoId) {
  const ngo = NGOS[ngoId];
  if (!ngo) return;

  const ngoCard = document.querySelector(`[data-ngo="${ngoId}"]`);
  const originalContent = ngoCard.innerHTML;

  // Create edit form
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  editForm.innerHTML = `
    <div class="edit-form-content">
      <h4>Edit NGO Details</h4>
      <div class="form-group">
        <label>NGO Name:</label>
        <input type="text" id="edit-ngo-name" value="${ngo.name}">
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea id="edit-ngo-description">${ngo.description}</textarea>
      </div>
      <div class="form-group">
        <label>Phone:</label>
        <input type="text" id="edit-ngo-phone" value="${ngo.phone}">
      </div>
      <div class="form-group">
        <label>Email:</label>
        <input type="email" id="edit-ngo-email" value="${ngo.email}">
      </div>
      <div class="form-actions">
        <button class="save-btn" onclick="saveNGO('${ngoId}')">Save</button>
        <button class="cancel-btn" onclick="cancelNGOEdit('${ngoId}')">Cancel</button>
      </div>
    </div>
  `;

  ngoCard.innerHTML = '';
  ngoCard.appendChild(editForm);
  ngoCard.dataset.originalContent = originalContent;
}

async function saveNGO(ngoId) {
  const ngo = NGOS[ngoId];
  const newName = document.getElementById('edit-ngo-name').value.trim();
  const newDescription = document.getElementById('edit-ngo-description').value.trim();
  const newPhone = document.getElementById('edit-ngo-phone').value.trim();
  const newEmail = document.getElementById('edit-ngo-email').value.trim();

  if (!newName || !newDescription || !newPhone || !newEmail) {
    alert('Please fill in all fields');
    return;
  }

  // Update NGO data
  ngo.name = newName;
  ngo.description = newDescription;
  ngo.phone = newPhone;
  ngo.email = newEmail;

  try {
    // Save to Supabase
    await saveNGOToSupabase(ngoId, {
      name: newName,
      description: newDescription,
      phone: newPhone,
      email: newEmail
    });

    // Restore NGO card with updated data
    restoreNGOCard(ngoId);
    showMessage('NGO details updated successfully!', 'success');
    window.location.reload();
  } catch (error) {
    console.error('Error saving NGO:', error);
    showMessage('Error saving NGO details', 'error');
  }
}

function cancelNGOEdit(ngoId) {
  restoreNGOCard(ngoId);
}

function restoreNGOCard(ngoId) {
  const ngoCard = document.querySelector(`[data-ngo="${ngoId}"]`);
  const originalContent = ngoCard.dataset.originalContent;

  if (originalContent) {
    ngoCard.innerHTML = originalContent;
    delete ngoCard.dataset.originalContent;
  }
}

// Navigation functions
function viewTempleDetails(templeId) {
  window.location.href = `temple-detail.html?temple=${templeId}`;
}

// Utility functions
function showMessage(message, type = 'info') {
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `status-message ${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
  `;

  if (type === 'success') {
    messageEl.style.background = 'var(--success)';
  } else if (type === 'error') {
    messageEl.style.background = 'var(--danger)';
  } else {
    messageEl.style.background = 'var(--info)';
  }

  document.body.appendChild(messageEl);

  // Auto remove after 3 seconds
  setTimeout(() => {
    messageEl.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 300);
  }, 3000);
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('ngos')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Expose functions for debugging (remove in production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.templeDebug = {
    simulateTempleData,
    TEMPLES,
    NGOS,
    dailyStats,
    incrementFullCount,
    handleFullBinNotification,
    testSupabaseConnection,
    loadNGOsFromSupabase,
    saveNGOToSupabase
  };
  console.log("🔧 Debug functions available via window.templeDebug");
}
