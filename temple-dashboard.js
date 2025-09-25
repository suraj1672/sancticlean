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

/* ==== FOOTER CONTACT CONFIGURATION ==== */
let FOOTER_CONTACT = {
  email: "support@templedashboard.com",
  phone: "+91 674-XXXX-XXXX"
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

/* ==== SUPABASE TEMPLE FUNCTIONS ==== */
async function loadTemplesFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('temples')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading temples from Supabase:', error);
      return;
    }

    // Update the TEMPLES object with data from Supabase
    if (data && data.length > 0) {
      data.forEach(temple => {
        if (TEMPLES[temple.id]) {
          TEMPLES[temple.id] = {
            ...TEMPLES[temple.id], // Keep existing properties like deviceId, fullCountToday, notifications
            name: temple.name,
            location: temple.location
          };
          
          // Update the UI elements
          updateTempleUI(temple.id, temple);
        }
      });
    } else {
      // If no data exists, initialize with default data
      await initializeTemplesInSupabase();
    }
  } catch (error) {
    console.error('Error loading temples:', error);
    // If there's an error, initialize with default data
    await initializeTemplesInSupabase();
  }
}

function updateTempleUI(templeId, templeData) {
  const nameElement = document.querySelector(`[data-temple="${templeId}"] h3`);
  const locationElement = document.querySelector(`[data-temple="${templeId}"] .temple-location`);

  if (nameElement) {
    // Extract text content without the icon
    const iconElement = nameElement.querySelector('i');
    if (iconElement) {
      nameElement.innerHTML = `<i class="fas fa-place-of-worship"></i> ${templeData.name}`;
    } else {
      nameElement.textContent = templeData.name;
    }
  }
  if (locationElement) {
    locationElement.textContent = templeData.location;
  }
}

async function saveTempleToSupabase(templeId, templeData) {
  try {
    const { data, error } = await supabase
      .from('temples')
      .upsert({
        id: templeId,
        name: templeData.name,
        location: templeData.location,
        device_id: templeData.deviceId,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving temple to Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving temple:', error);
    throw error;
  }
}

async function initializeTemplesInSupabase() {
  try {
    console.log('Initializing temple data in Supabase...');
    
    // Insert default temple data
    const templeData = Object.entries(TEMPLES).map(([id, temple]) => ({
      id: id,
      name: temple.name,
      location: temple.location,
      device_id: temple.deviceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('temples')
      .insert(templeData);

    if (error) {
      console.error('Error initializing temples in Supabase:', error);
    } else {
      console.log('Temple data initialized successfully in Supabase');
    }
  } catch (error) {
    console.error('Error initializing temples:', error);
  }
}

/* ==== SUPABASE FOOTER CONTACT FUNCTIONS ==== */
async function loadFooterContactFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('footer_contact')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error) {
      console.error('Error loading footer contact from Supabase:', error);
      return;
    }

    // Update the FOOTER_CONTACT object with data from Supabase
    if (data) {
      FOOTER_CONTACT.email = data.email;
      FOOTER_CONTACT.phone = data.phone;
      
      // Update the UI elements
      updateFooterContactUI(data);
    } else {
      // If no data exists, initialize with default data
      await initializeFooterContactInSupabase();
    }
  } catch (error) {
    console.error('Error loading footer contact:', error);
    // If there's an error, initialize with default data
    await initializeFooterContactInSupabase();
  }
}

function updateFooterContactUI(contactData) {
  const emailElement = document.getElementById('footer-email');
  const phoneElement = document.getElementById('footer-phone');

  if (emailElement) emailElement.textContent = contactData.email;
  if (phoneElement) phoneElement.textContent = contactData.phone;
}

async function saveFooterContactToSupabase(contactData) {
  try {
    const { data, error } = await supabase
      .from('footer_contact')
      .upsert({
        id: 'main',
        email: contactData.email,
        phone: contactData.phone,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving footer contact to Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving footer contact:', error);
    throw error;
  }
}

async function initializeFooterContactInSupabase() {
  try {
    console.log('Initializing footer contact data in Supabase...');
    
    const { data, error } = await supabase
      .from('footer_contact')
      .insert({
        id: 'main',
        email: FOOTER_CONTACT.email,
        phone: FOOTER_CONTACT.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error initializing footer contact in Supabase:', error);
    } else {
      console.log('Footer contact data initialized successfully in Supabase');
    }
  } catch (error) {
    console.error('Error initializing footer contact:', error);
  }
}

/* ==== FOOTER CONTACT EDIT FUNCTIONS ==== */
function editFooterContact(e) {
  e.stopPropagation(); // prevent bubbling
  
  const footerSection = e.target.closest('.footer-section');
  const originalContent = footerSection.innerHTML;
  
  // Create edit form
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  editForm.innerHTML = `
    <div class="edit-form-content" onclick="event.stopPropagation()">
      <h4>Edit Contact Information</h4>
      <div class="form-group">
        <label>Email:</label>
        <input type="email" id="edit-footer-email" value="${FOOTER_CONTACT.email}" onclick="event.stopPropagation()">
      </div>
      <div class="form-group">
        <label>Phone:</label>
        <input type="text" id="edit-footer-phone" value="${FOOTER_CONTACT.phone}" onclick="event.stopPropagation()">
      </div>
      <div class="form-actions" onclick="event.stopPropagation()">
        <button class="save-btn" onclick="saveFooterContact(event)">Save</button>
        <button class="cancel-btn" onclick="cancelFooterEdit(event)">Cancel</button>
      </div>
    </div>
  `;
  
  footerSection.innerHTML = '';
  footerSection.appendChild(editForm);
  footerSection.dataset.originalContent = originalContent;
}

async function saveFooterContact(e) {
  e.stopPropagation(); // prevent bubbling
  
  const newEmail = document.getElementById('edit-footer-email').value.trim();
  const newPhone = document.getElementById('edit-footer-phone').value.trim();
  
  if (!newEmail || !newPhone) {
    alert('Please fill in all fields');
    return;
  }
  
  // Update footer contact data
  FOOTER_CONTACT.email = newEmail;
  FOOTER_CONTACT.phone = newPhone;
  
  try {
    // Save to Supabase
    await saveFooterContactToSupabase({
      email: newEmail,
      phone: newPhone
    });
    
    // Restore footer section with updated data
    restoreFooterSection();
    showMessage('Contact information updated successfully!', 'success');
    window.location.reload();
  } catch (error) {
    console.error('Error saving footer contact:', error);
    showMessage('Error saving contact information', 'error');
  }
}

function cancelFooterEdit(e) {
  e.stopPropagation(); // prevent bubbling
  restoreFooterSection();
}

function restoreFooterSection() {
  const footerSection = document.querySelector('.footer-section:nth-child(2)');
  const originalContent = footerSection.dataset.originalContent;
  
  if (originalContent) {
    footerSection.innerHTML = originalContent;
    delete footerSection.dataset.originalContent;
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
    
    // Load Temple data from Supabase
    console.log("🏛️ Loading Temple data from Supabase...");
    await loadTemplesFromSupabase();
    
    // Load Footer Contact data from Supabase
    console.log("📞 Loading Footer Contact data from Supabase...");
    await loadFooterContactFromSupabase();
  } else {
    console.warn("⚠️ Supabase connection failed, using default data");
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
function editTemple(e, templeId) {
  e.stopPropagation(); // prevent bubbling

  const temple = TEMPLES[templeId];
  if (!temple) return;

  const nameEl = document.querySelector(`[data-temple="${templeId}"] h3`);
  const locationEl = document.querySelector(`[data-temple="${templeId}"] .temple-location`);

  if (!nameEl || !locationEl) return;

  // Create edit form
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  editForm.innerHTML = `
    <div class="edit-form-content" onclick="event.stopPropagation()">
      <h4>Edit Temple Details</h4>
      <div class="form-group">
        <label>Temple Name:</label>
        <input type="text" id="edit-temple-name" value="${temple.name}" onclick="event.stopPropagation()">
      </div>
      <div class="form-group">
        <label>Location:</label>
        <input type="text" id="edit-temple-location" value="${temple.location}" onclick="event.stopPropagation()">
      </div>
      <div class="form-actions" onclick="event.stopPropagation()">
        <button class="save-btn" onclick="saveTemple(event,'${templeId}')">Save</button>
        <button class="cancel-btn" onclick="cancelEdit(event,'${templeId}')">Cancel</button>
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

async function saveTemple(e, templeId) {
  e.stopPropagation(); // prevent bubbling

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
  
  try {
    // Save to Supabase
    await saveTempleToSupabase(templeId, {
      name: newName,
      location: newLocation,
      deviceId: temple.deviceId
    });
    
    // Restore temple card with updated data
    restoreTempleCard(templeId);
    showMessage('Temple details updated successfully!', 'success');
    window.location.reload();
    
  } catch (error) {
    console.error('Error saving temple:', error);
    showMessage('Error saving temple details', 'error');
  }
}

function cancelEdit(e, templeId) {
  e.stopPropagation(); // prevent bubbling

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
function editNGO(e, ngoId) {
  e.stopPropagation(); // prevent bubbling
  
  const ngo = NGOS[ngoId];
  if (!ngo) return;

  const ngoCard = document.querySelector(`[data-ngo="${ngoId}"]`);
  const originalContent = ngoCard.innerHTML;

  // Create edit form
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  editForm.innerHTML = `
    <div class="edit-form-content" onclick="event.stopPropagation()">
      <h4>Edit NGO Details</h4>
      <div class="form-group">
        <label>NGO Name:</label>
        <input type="text" id="edit-ngo-name" value="${ngo.name}" onclick="event.stopPropagation()">
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea id="edit-ngo-description" onclick="event.stopPropagation()">${ngo.description}</textarea>
      </div>
      <div class="form-group">
        <label>Phone:</label>
        <input type="text" id="edit-ngo-phone" value="${ngo.phone}"  onclick="event.stopPropagation()">
      </div>
      <div class="form-group">
        <label>Email:</label>
        <input type="email" id="edit-ngo-email" value="${ngo.email}"  onclick="event.stopPropagation()">
      </div>
      <div class="form-actions" onclick="event.stopPropagation()">
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
function viewTempleDetails(e, templeId) {
  e.stopPropagation(); // prevent bubbling
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
    FOOTER_CONTACT,
    dailyStats,
    incrementFullCount,
    handleFullBinNotification,
    testSupabaseConnection,
    loadNGOsFromSupabase,
    saveNGOToSupabase,
    loadTemplesFromSupabase,
    saveTempleToSupabase,
    loadFooterContactFromSupabase,
    saveFooterContactToSupabase
  };
  console.log("🔧 Debug functions available via window.templeDebug");
}
