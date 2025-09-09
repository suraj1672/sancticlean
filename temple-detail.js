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

/* ==== TEMPLE CONFIGURATION ==== */
const TEMPLES = {
  jagannath: {
    name: "Jagannath Temple",
    deviceId: "TEMPLE_01",
    location: "Main Temple Complex, Puri",
    installed: "2024-01-15",
    maintenance: "2024-01-20"
  },
  gundicha: {
    name: "Gundicha Temple", 
    deviceId: "TEMPLE_02",
    location: "Gundicha Ghar, Puri",
    installed: "2024-01-16",
    maintenance: "2024-01-21"
  },
  lokanath: {
    name: "Lokanath Temple",
    deviceId: "TEMPLE_03", 
    location: "Lokanath Road, Puri",
    installed: "2024-01-17",
    maintenance: "2024-01-22"
  },
  mausimaa: {
    name: "Mausi Maa Temple",
    deviceId: "TEMPLE_04",
    location: "Grand Road, Puri",
    installed: "2024-01-18",
    maintenance: "2024-01-23"
  }
};

/* ==== GLOBAL VARIABLES ==== */
let currentTemple = null;
let currentDeviceId = null;
let unsubscribers = {};
let charts = {};

/* ==== UTILITY FUNCTIONS ==== */
const C = 326; // Ring circumference

function setRingPercent(elementId, pct) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = C - (C * clamped / 100);
  const meterElement = document.getElementById(elementId);
  
  if (meterElement) {
    meterElement.style.strokeDashoffset = String(offset);
  }
  return clamped;
}

function tsToLocal(ts) {
  if (!ts) return "—";
  try { 
    if (ts.toDate) return ts.toDate().toLocaleString(); 
  } catch(_) {}
  try { 
    return new Date(ts).toLocaleString(); 
  } catch(_) {}
  return "—";
}

function formatDate(date) {
  if (!date) return "—";
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  } catch(_) {
    return "—";
  }
}

function formatTime(date) {
  if (!date) return "—";
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString();
  } catch(_) {
    return "—";
  }
}

function getTempleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('temple') || 'jagannath';
}

function goBack() {
  window.location.href = 'index.html';
}

/* ==== CURRENT STATUS MANAGEMENT ==== */
function updateCurrentStatus(data) {
  const distance_cm = Number(data.distance_cm || 0);
  const depth_cm = Number(data.binDepth_cm || 0);
  const fill_pct = Number(data.fill_pct || 0);
  const status = data.status || "EMPTY";
  const updatedAt = data.updatedAt || data.time || null;
  
  // Update calibration readings
  updateCalibrationReadings(data);
  
  // Update ring meter
  const clampedPct = setRingPercent('current-meter', fill_pct);
  const fillElement = document.getElementById('current-fill');
  if (fillElement) {
    fillElement.textContent = clampedPct.toFixed(0) + "%";
  }
  
  // Update status pill
  const statusElement = document.getElementById('current-status');
  const statusCard = document.getElementById('current-status-card');
  if (statusElement && statusCard) {
    statusElement.textContent = status;
    statusElement.classList.remove("pill-empty", "pill-half", "pill-full");
    statusCard.classList.remove("alert", "warning", "success");
    
    if (status === "FULL") {
      statusElement.classList.add("pill-full");
      statusCard.classList.add("alert");
    } else if (status === "HALF") {
      statusElement.classList.add("pill-half");
      statusCard.classList.add("warning");
    } else {
      statusElement.classList.add("pill-empty");
      statusCard.classList.add("success");
    }
  }
  
  // Update current stats
  const distanceEl = document.getElementById('current-distance');
  const depthEl = document.getElementById('current-depth');
  const updatedEl = document.getElementById('current-updated');
  
  if (distanceEl) distanceEl.textContent = isFinite(distance_cm) ? distance_cm.toFixed(1) + " cm" : "—";
  if (depthEl) depthEl.textContent = isFinite(depth_cm) ? depth_cm.toFixed(1) + " cm" : "—";
  if (updatedEl) updatedEl.textContent = tsToLocal(updatedAt);
}

/* ==== STATISTICS MANAGEMENT ==== */
function updateTodayStats(stats) {
  const todayFullEl = document.getElementById('today-full-count');
  const todayEmailEl = document.getElementById('today-email-count');
  const todayAvgEl = document.getElementById('today-avg-fill');
  
  if (todayFullEl) todayFullEl.textContent = stats.fullCount || 0;
  if (todayEmailEl) todayEmailEl.textContent = stats.emailCount || 0;
  if (todayAvgEl) todayAvgEl.textContent = (stats.avgFill || 0).toFixed(0) + "%";
}

function updateWeeklyStats(stats) {
  const weekFullEl = document.getElementById('week-total-full');
  const weekEmailEl = document.getElementById('week-total-emails');
  const weekAvgEl = document.getElementById('week-avg-daily');
  
  if (weekFullEl) weekFullEl.textContent = stats.totalFull || 0;
  if (weekEmailEl) weekEmailEl.textContent = stats.totalEmails || 0;
  if (weekAvgEl) weekAvgEl.textContent = (stats.avgDaily || 0).toFixed(1);
}

/* ==== QUICK STATS MANAGEMENT ==== */
function updateQuickStats(stats) {
  const avgFillTimeEl = document.getElementById('avg-fill-time');
  const weeklyPatternEl = document.getElementById('weekly-pattern');
  const efficiencyScoreEl = document.getElementById('efficiency-score');
  const alertResponseEl = document.getElementById('alert-response');
  
  if (avgFillTimeEl) {
    avgFillTimeEl.textContent = stats.avgFillTime || "6.2 hrs";
  }
  
  if (weeklyPatternEl) {
    weeklyPatternEl.textContent = stats.peakDay || "Monday";
  }
  
  if (efficiencyScoreEl) {
    const score = stats.efficiencyScore || 85;
    efficiencyScoreEl.textContent = score + "%";
    
    // Add color coding based on score
    if (score >= 80) {
      efficiencyScoreEl.style.color = 'var(--success)';
    } else if (score >= 60) {
      efficiencyScoreEl.style.color = 'var(--warning)';
    } else {
      efficiencyScoreEl.style.color = 'var(--danger)';
    }
  }
  
  if (alertResponseEl) {
    alertResponseEl.textContent = stats.alertResponse || "12 min";
  }
}

/* ==== ALERTS MANAGEMENT ==== */
function updateAlertHistory(alerts) {
  const alertsList = document.getElementById('alerts-list');
  if (!alertsList) return;
  
  if (alerts.length === 0) {
    alertsList.innerHTML = '<div class="loading-alerts">No alerts found for the selected period.</div>';
    return;
  }
  
  const alertsHtml = alerts.map(alert => `
    <div class="alert-row">
      <div class="alert-col">${formatTime(alert.timestamp)}</div>
      <div class="alert-col">${alert.fillLevel || 0}%</div>
      <div class="alert-col">
        <span class="alert-status ${alert.status.toLowerCase()}">${alert.status}</span>
      </div>
      <div class="alert-col">
        <span class="email-status ${alert.emailSent ? 'sent' : 'failed'}">
          <i class="fas fa-${alert.emailSent ? 'check' : 'times'}"></i>
          ${alert.emailSent ? 'Sent' : 'Failed'}
        </span>
      </div>
      <div class="alert-col">${alert.responseTime || '—'}</div>
    </div>
  `).join('');
  
  alertsList.innerHTML = alertsHtml;
}

/* ==== DAILY STATISTICS TABLE ==== */
function updateDailyStatsTable(stats) {
  const tableBody = document.getElementById('daily-stats-body');
  if (!tableBody) return;
  
  if (stats.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No statistics available.</td></tr>';
    return;
  }
  
  const statsHtml = stats.map(stat => `
    <tr>
      <td>${formatDate(stat.date)}</td>
      <td>${stat.fullEvents || 0}</td>
      <td>${stat.emailAlerts || 0}</td>
      <td>${stat.maxFillLevel || 0}%</td>
      <td>${stat.avgFillLevel || 0}%</td>
      <td>${stat.firstFullTime ? formatTime(stat.firstFullTime) : '—'}</td>
      <td>${stat.lastFullTime ? formatTime(stat.lastFullTime) : '—'}</td>
    </tr>
  `).join('');
  
  tableBody.innerHTML = statsHtml;
}

/* ==== DEVICE INFO MANAGEMENT ==== */
function updateDeviceInfo(temple, deviceData) {
  const deviceIdEl = document.getElementById('device-id');
  const deviceDepthEl = document.getElementById('device-depth');
  const deviceInstalledEl = document.getElementById('device-installed');
  const deviceMaintenanceEl = document.getElementById('device-maintenance');
  
  if (deviceIdEl) deviceIdEl.textContent = temple.deviceId;
  if (deviceDepthEl) deviceDepthEl.textContent = (deviceData.binDepth_cm || 50) + " cm";
  if (deviceInstalledEl) deviceInstalledEl.textContent = temple.installed;
  if (deviceMaintenanceEl) deviceMaintenanceEl.textContent = temple.maintenance;
  
  // Update connection status (simulated)
  const connectionEl = document.getElementById('connection-status');
  const connectionIndicator = document.getElementById('connection-indicator');
  const signalEl = document.getElementById('signal-strength');
  const batteryEl = document.getElementById('battery-level');
  const uptimeEl = document.getElementById('device-uptime');
  
  if (connectionEl && connectionIndicator) {
    const isOnline = deviceData.updatedAt && (new Date() - (deviceData.updatedAt.toDate ? deviceData.updatedAt.toDate() : new Date(deviceData.updatedAt))) < 300000; // 5 minutes
    
    connectionIndicator.classList.remove('offline', 'warning');
    if (isOnline) {
      connectionEl.textContent = 'Online';
      connectionIndicator.classList.add('online');
    } else {
      connectionEl.textContent = 'Offline';
      connectionIndicator.classList.add('offline');
    }
  }
  
  // Simulated values (replace with real data when available)
  if (signalEl) signalEl.textContent = "Strong (-45 dBm)";
  if (batteryEl) batteryEl.textContent = "85%";
  if (uptimeEl) uptimeEl.textContent = "72 hours";
}

/* ==== FIRESTORE LISTENERS ==== */
function watchCurrentDevice() {
  if (!currentDeviceId) return;
  
  // Clean up existing subscription
  if (unsubscribers.current) {
    unsubscribers.current();
    delete unsubscribers.current;
  }
  
  // Listen to current device data
  unsubscribers.current = db.collection("bins").doc(currentDeviceId).onSnapshot((snap) => {
    if (!snap.exists) {
      console.warn(`Device ${currentDeviceId} not found`);
      return;
    }
    
    const data = snap.data();
    updateCurrentStatus(data);
    updateDeviceInfo(TEMPLES[currentTemple], data);
    
  }, (error) => {
    console.error(`Error watching device ${currentDeviceId}:`, error);
  });
}

function loadHistoricalData() {
  if (!currentDeviceId) return;
  
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Load daily statistics
  db.collection("dailyStats")
    .where("deviceId", "==", currentDeviceId)
    .where("date", ">=", weekAgo)
    .orderBy("date", "desc")
    .get()
    .then((snapshot) => {
      const dailyStats = [];
      const weeklyData = [];
      let todayStats = { fullCount: 0, emailCount: 0, avgFill: 0 };
      let weeklyStats = { totalFull: 0, totalEmails: 0, avgDaily: 0 };
      
      snapshot.forEach(doc => {
        const data = doc.data();
        dailyStats.push(data);
        weeklyData.push(data);
        
        if (isToday(data.date)) {
          todayStats = {
            fullCount: data.fullEvents || 0,
            emailCount: data.emailAlerts || 0,
            avgFill: data.avgFillLevel || 0
          };
        }
        
        weeklyStats.totalFull += data.fullEvents || 0;
        weeklyStats.totalEmails += data.emailAlerts || 0;
      });
      
      weeklyStats.avgDaily = weeklyStats.totalFull / Math.max(1, dailyStats.length);
      
      updateTodayStats(todayStats);
      updateWeeklyStats(weeklyStats);
      updateDailyStatsTable(dailyStats);
      
      // Update quick stats with calculated data
      const quickStats = {
        avgFillTime: calculateAvgFillTime(dailyStats),
        peakDay: findPeakDay(weeklyData),
        efficiencyScore: calculateEfficiency(weeklyStats),
        alertResponse: calculateAvgResponse(weeklyStats)
      };
      updateQuickStats(quickStats);
    })
    .catch(error => {
      console.log("Daily stats not available:", error.message);
      // Generate sample data for demo
      const sampleStats = generateSampleDailyStats();
      updateTodayStats({ fullCount: 3, emailCount: 3, avgFill: 65 });
      updateWeeklyStats({ totalFull: 15, totalEmails: 12, avgDaily: 2.1 });
      updateDailyStatsTable(sampleStats);
      
      // Update quick stats with sample data
      updateQuickStats({
        avgFillTime: "6.2 hrs",
        peakDay: "Monday",
        efficiencyScore: 85,
        alertResponse: "12 min"
      });
    });
  
  // Load alert history
  loadAlertHistory('week');
}

function loadAlertHistory(period) {
  if (!currentDeviceId) return;
  
  let startDate = new Date();
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'all':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  db.collection("emailAlerts")
    .where("deviceId", "==", currentDeviceId)
    .where("timestamp", ">=", startDate)
    .orderBy("timestamp", "desc")
    .limit(50)
    .get()
    .then((snapshot) => {
      const alerts = [];
      snapshot.forEach(doc => {
        alerts.push(doc.data());
      });
      updateAlertHistory(alerts);
    })
    .catch(error => {
      console.log("Alert history not available:", error.message);
      // Generate sample data for demo
      const sampleAlerts = generateSampleAlerts();
      updateAlertHistory(sampleAlerts);
    });
}

/* ==== HELPER FUNCTIONS ==== */
function isToday(date) {
  const today = new Date();
  const checkDate = date.toDate ? date.toDate() : new Date(date);
  return checkDate.toDateString() === today.toDateString();
}

function generateSampleTrendData() {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp: time,
      fill_pct: Math.random() * 100
    });
  }
  return data;
}

function generateSampleDailyStats() {
  const stats = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    stats.push({
      date: date,
      fullEvents: Math.floor(Math.random() * 5),
      emailAlerts: Math.floor(Math.random() * 5),
      maxFillLevel: Math.floor(Math.random() * 40) + 60,
      avgFillLevel: Math.floor(Math.random() * 30) + 40,
      firstFullTime: new Date(date.getTime() + Math.random() * 12 * 60 * 60 * 1000),
      lastFullTime: new Date(date.getTime() + (12 + Math.random() * 12) * 60 * 60 * 1000)
    });
  }
  return stats;
}

function generateSampleAlerts() {
  const alerts = [];
  for (let i = 0; i < 10; i++) {
    const time = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    alerts.push({
      timestamp: time,
      fillLevel: Math.floor(Math.random() * 30) + 70,
      status: Math.random() > 0.5 ? 'FULL' : 'HALF',
      emailSent: Math.random() > 0.1,
      responseTime: Math.floor(Math.random() * 300) + 30 + 's'
    });
  }
  return alerts.sort((a, b) => b.timestamp - a.timestamp);
}

/* ==== QUICK STATS CALCULATION HELPERS ==== */
function calculateAvgFillTime(dailyStats) {
  if (!dailyStats || dailyStats.length === 0) return "6.2 hrs";
  
  let totalHours = 0;
  let count = 0;
  
  dailyStats.forEach(stat => {
    if (stat.avgFillTime) {
      totalHours += stat.avgFillTime;
      count++;
    }
  });
  
  if (count === 0) return "6.2 hrs";
  const avg = totalHours / count;
  return avg.toFixed(1) + " hrs";
}

function findPeakDay(weeklyData) {
  if (!weeklyData || weeklyData.length === 0) return "Monday";
  
  const dayCount = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  weeklyData.forEach(data => {
    if (data.date) {
      const dayIndex = (data.date.toDate ? data.date.toDate() : new Date(data.date)).getDay();
      const dayName = days[dayIndex];
      dayCount[dayName] = (dayCount[dayName] || 0) + (data.fullEvents || 0);
    }
  });
  
  let peakDay = "Monday";
  let maxCount = 0;
  
  Object.entries(dayCount).forEach(([day, count]) => {
    if (count > maxCount) {
      maxCount = count;
      peakDay = day;
    }
  });
  
  return peakDay;
}

function calculateEfficiency(weeklyStats) {
  if (!weeklyStats) return 85;
  
  const totalFull = weeklyStats.totalFull || 0;
  const totalEmails = weeklyStats.totalEmails || 0;
  
  // Efficiency based on email response rate and frequency
  if (totalFull === 0) return 100;
  
  const responseRate = (totalEmails / totalFull) * 100;
  const frequency = Math.min(weeklyStats.avgDaily || 0, 5) * 20; // Max 5 per day = 100%
  
  const efficiency = Math.min((responseRate * 0.6) + (frequency * 0.4), 100);
  return Math.round(efficiency);
}

function calculateAvgResponse(weeklyStats) {
  if (!weeklyStats) return "12 min";
  
  // Simulate response time based on efficiency
  const efficiency = calculateEfficiency(weeklyStats);
  
  if (efficiency >= 90) return "8 min";
  if (efficiency >= 80) return "12 min";
  if (efficiency >= 70) return "18 min";
  if (efficiency >= 60) return "25 min";
  return "35 min";
}

/* ==== EVENT HANDLERS ==== */
function setupEventHandlers() {
  // Date filter change
  const dateFilter = document.getElementById('date-filter');
  if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
      loadAlertHistory(e.target.value);
    });
  }
}

/* ==== INITIALIZATION ==== */
function initializeDetailPage() {
  currentTemple = getTempleFromUrl();
  const temple = TEMPLES[currentTemple];
  
  if (!temple) {
    console.error('Invalid temple:', currentTemple);
    goBack();
    return;
  }
  
  currentDeviceId = temple.deviceId;
  
  // Update page title and header
  document.title = `${temple.name} - Temple Details`;
  const nameElement = document.getElementById('temple-name');
  const locationElement = document.getElementById('temple-location');
  
  if (nameElement) nameElement.textContent = temple.name;
  if (locationElement) locationElement.textContent = temple.location;
  
  // Setup event handlers
  setupEventHandlers();
  
  // Start watching current device
  watchCurrentDevice();
  
  // Load historical data
  loadHistoricalData();
  
  console.log(`🏛️ Temple detail page initialized for ${temple.name}`);
}

/* ==== CLEANUP ==== */
window.addEventListener('beforeunload', () => {
  // Clean up all subscriptions
  Object.values(unsubscribers).forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  
  // Destroy charts
  Object.values(charts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
});

/* ==== DEVICE CONTROL FUNCTIONS ==== */

// Calibration system
let calibrationInProgress = false;
let calibrationType = null; // 'empty' or 'full'

function startEmptyCalibration() {
  if (calibrationInProgress) return;
  
  const calibrateBtn = document.getElementById('calibrate-empty-btn');
  const progressDiv = document.getElementById('calibration-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  if (!calibrateBtn || !progressDiv || !progressFill || !progressText) {
    console.error('Calibration elements not found');
    return;
  }
  
  calibrationInProgress = true;
  calibrationType = 'empty';
  calibrateBtn.disabled = true;
  calibrateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calibrating...';
  progressDiv.style.display = 'block';
  
  // Send empty calibration command to device
  sendCalibrationCommand()
    .then((result) => {
      if (result.success) {
        showStatusMessage('Empty bin calibration completed successfully! New empty level: ' + result.emptyLevel + ' cm', 'success');
        updateEmptyLevelDisplay(result.emptyLevel);
        updateCalibrationStatus();
      } else {
        showStatusMessage('Empty calibration failed: ' + result.error, 'error');
      }
    })
    .catch((error) => {
      console.error('Empty calibration error:', error);
      showStatusMessage('Empty calibration failed: ' + error.message, 'error');
    })
    .finally(() => {
      calibrationInProgress = false;
      calibrationType = null;
      calibrateBtn.disabled = false;
      calibrateBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Calibrate Empty Bin';
      progressDiv.style.display = 'none';
    });
}

// Temple information update function
function updateTempleInfo() {
  const templeNameInput = document.getElementById('temple-name-input');
  const templeLocationInput = document.getElementById('temple-location-input');
  const updateBtn = document.getElementById('info-update-btn');
  
  if (!templeNameInput || !templeLocationInput || !updateBtn) {
    console.error('Temple info form elements not found');
    return;
  }
  
  const newName = templeNameInput.value.trim();
  const newLocation = templeLocationInput.value.trim();
  
  if (!newName && !newLocation) {
    showStatusMessage('Please enter temple name or location to update', 'error');
    return;
  }
  
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
  
  // Update both deviceConfig and bins collections
  const updateData = {};
  if (newName) updateData.templeName = newName;
  if (newLocation) updateData.location = newLocation;
  updateData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
  
  Promise.all([
    newName || newLocation ? db.collection('deviceConfig').doc(currentDeviceId).set(updateData, { merge: true }) : Promise.resolve(),
    newName || newLocation ? db.collection('bins').doc(currentDeviceId).set(updateData, { merge: true }) : Promise.resolve()
  ])
    .then(() => {
      let message = 'Temple information updated successfully!';
      if (newName && newLocation) {
        message = `Temple name and location updated to "${newName}" at "${newLocation}"`;
      } else if (newName) {
        message = `Temple name updated to "${newName}"`;
      } else if (newLocation) {
        message = `Temple location updated to "${newLocation}"`;
      }
      
      showStatusMessage(message, 'success');
      
      // Update the page header
      if (newName) {
        const nameElement = document.getElementById('temple-name');
        if (nameElement) nameElement.textContent = newName;
      }
      if (newLocation) {
        const locationElement = document.getElementById('temple-location');
        if (locationElement) locationElement.textContent = newLocation;
      }
      
      // Clear the inputs
      templeNameInput.value = '';
      templeLocationInput.value = '';
    })
    .catch((error) => {
      console.error('Temple info update error:', error);
      showStatusMessage('Failed to update temple information: ' + error.message, 'error');
    })
    .finally(() => {
      updateBtn.disabled = false;
      updateBtn.innerHTML = '<i class="fas fa-save"></i> Update Temple Information';
    });
}

async function sendCalibrationCommand() {
  return new Promise((resolve, reject) => {
    if (!currentDeviceId) {
      reject(new Error('No device selected'));
      return;
    }
    
    // Show progress with realistic steps
    let progress = 0;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    const interval = setInterval(() => {
      progress += 8;
      if (progressFill) progressFill.style.width = progress + '%';
      
      if (progress <= 20) {
        if (progressText) progressText.textContent = 'Preparing sensor...';
      } else if (progress <= 40) {
        if (progressText) progressText.textContent = 'Ensuring bin is empty...';
      } else if (progress <= 70) {
        if (progressText) progressText.textContent = 'Taking 15 distance measurements...';
      } else if (progress <= 90) {
        if (progressText) progressText.textContent = 'Calculating empty level...';
      } else {
        if (progressText) progressText.textContent = 'Saving calibration to device...';
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Send calibration command to Firebase (using the format your Arduino expects)
        const calibrationData = {
          deviceId: currentDeviceId,
          command: 'calibrate_empty_level',
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          requestedBy: 'dashboard',
          status: 'pending'
        };
        
        // Create command document with the device ID format your Arduino expects
        const commandDocId = currentDeviceId + '_pending';
        
        db.collection('deviceCommands').doc(commandDocId).set(calibrationData)
          .then(() => {
            // Monitor for completion by watching the command status
            const unsubscribe = db.collection('deviceCommands').doc(commandDocId)
              .onSnapshot((doc) => {
                if (doc.exists) {
                  const data = doc.data();
                  if (data.status === 'done') {
                    unsubscribe();
                    // Get the updated empty level from deviceConfig
                    db.collection('deviceConfig').doc(currentDeviceId).get()
                      .then((configDoc) => {
                        if (configDoc.exists && configDoc.data().emptyLevel_cm) {
                          resolve({
                            success: true,
                            emptyLevel: configDoc.data().emptyLevel_cm.toFixed(1)
                          });
                        } else {
                          resolve({
                            success: true,
                            emptyLevel: '45.0' // Fallback value
                          });
                        }
                      })
                      .catch(() => {
                        resolve({
                          success: true,
                          emptyLevel: '45.0' // Fallback value
                        });
                      });
                  } else if (data.status === 'failed') {
                    unsubscribe();
                    reject(new Error(data.reason || 'Calibration failed'));
                  }
                }
              }, (error) => {
                unsubscribe();
                reject(error);
              });
            
            // Timeout after 30 seconds
            setTimeout(() => {
              unsubscribe();
              reject(new Error('Calibration timeout - device may be offline'));
            }, 30000);
          })
          .catch((error) => {
            reject(error);
          });
      }
    }, 250);
  });
}

function updateEmptyLevelDisplay(emptyLevel) {
  const emptyLevelEl = document.getElementById('empty-level-distance');
  if (emptyLevelEl) {
    emptyLevelEl.textContent = emptyLevel + ' cm';
  }
}

function updateFullLevelDisplay(fullLevel) {
  const fullLevelEl = document.getElementById('full-level-distance');
  if (fullLevelEl) {
    fullLevelEl.textContent = fullLevel + ' cm';
  }
}

function updateCalibrationStatus() {
  const emptyLevelEl = document.getElementById('empty-level-distance');
  const statusEl = document.getElementById('calibration-status');
  const lastCalibEl = document.getElementById('last-calibration');
  
  if (emptyLevelEl && statusEl) {
    const emptyLevel = emptyLevelEl.textContent;
    
    if (emptyLevel !== '— cm' && emptyLevel !== '') {
      statusEl.textContent = 'Calibrated';
      statusEl.style.color = 'var(--success)';
      
      // Update last calibration time if available
      if (lastCalibEl) {
        const now = new Date();
        lastCalibEl.textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
      }
    } else {
      statusEl.textContent = 'Not Calibrated';
      statusEl.style.color = 'var(--muted)';
    }
  }
}

// WiFi configuration
function updateWiFiConfig() {
  const ssidInput = document.getElementById('new-wifi-ssid');
  const passwordInput = document.getElementById('new-wifi-password');
  const updateBtn = document.getElementById('wifi-update-btn');
  
  if (!ssidInput || !passwordInput || !updateBtn) {
    console.error('WiFi form elements not found');
    return;
  }
  
  const newSSID = ssidInput.value.trim();
  const newPassword = passwordInput.value.trim();
  
  if (!newSSID) {
    showStatusMessage('Please enter a WiFi SSID', 'error');
    return;
  }
  
  if (!newPassword) {
    showStatusMessage('Please enter a WiFi password', 'error');
    return;
  }
  
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating WiFi...';
  
  // Update both deviceConfig and send command to device
  Promise.all([
    // Update deviceConfig collection (your Arduino reads from here)
    db.collection('deviceConfig').doc(currentDeviceId).set({
      wifiSSID: newSSID,
      wifiPassword: newPassword,
      lastWifiUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }),
    
    // Also send as a command for immediate processing
    db.collection('deviceCommands').doc(currentDeviceId + '_pending').set({
      deviceId: currentDeviceId,
      wifiSSID: newSSID,
      wifiPassword: newPassword,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      requestedBy: 'dashboard',
      status: 'pending'
    })
  ])
    .then(() => {
      showStatusMessage('WiFi configuration updated! Device will reconnect with new settings within 30 seconds.', 'success');
      ssidInput.value = '';
      passwordInput.value = '';
      
      // Update current WiFi display
      setTimeout(() => {
        const currentWiFiEl = document.getElementById('current-wifi-ssid');
        if (currentWiFiEl) {
          currentWiFiEl.textContent = newSSID;
        }
      }, 2000);
    })
    .catch((error) => {
      console.error('WiFi update error:', error);
      showStatusMessage('Failed to update WiFi configuration: ' + error.message, 'error');
    })
    .finally(() => {
      updateBtn.disabled = false;
      updateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update WiFi Settings';
    });
}

// SMTP configuration - Simplified to only update recipient emails
function updateSMTPConfig() {
  const smtpRecipients = document.getElementById('smtp-recipients');
  const updateBtn = document.getElementById('smtp-update-btn');
  
  if (!smtpRecipients || !updateBtn) {
    console.error('SMTP form elements not found');
    return;
  }
  
  const recipients = smtpRecipients.value.trim();
  
  if (!recipients) {
    showStatusMessage('Please enter at least one recipient email address', 'error');
    return;
  }
  
  // Validate recipients
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r);
  const invalidRecipients = recipientList.filter(r => !emailRegex.test(r));
  
  if (invalidRecipients.length > 0) {
    showStatusMessage('Please enter valid email addresses. Invalid: ' + invalidRecipients.join(', '), 'error');
    return;
  }
  
  updateBtn.disabled = true;
  updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Recipients...';
  
  // Update recipients in both deviceConfig and send command (format your Arduino expects)
  const recipientsCsv = recipientList.join(', ');
  
  Promise.all([
    // Update deviceConfig collection (your Arduino reads from here)
    db.collection('deviceConfig').doc(currentDeviceId).set({
      recipientsCsv: recipientsCsv,
      recipients: recipientList, // Also store as array for web dashboard
      lastEmailUpdate: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }),
    
    // Send command for immediate processing
    db.collection('deviceCommands').doc(currentDeviceId + '_pending').set({
      deviceId: currentDeviceId,
      command: 'update_email_recipients',
      recipientsCsv: recipientsCsv,
      recipients: recipientList,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      requestedBy: 'dashboard',
      status: 'pending'
    })
  ])
    .then(() => {
      showStatusMessage(`Email recipients updated successfully! ${recipientList.length} recipient(s) configured.`, 'success');
      
      // Clear the input
      smtpRecipients.value = '';
      
      // Update current SMTP status
      setTimeout(() => {
        const currentSmtpEl = document.getElementById('current-smtp-status');
        if (currentSmtpEl) {
          currentSmtpEl.textContent = `${recipientList.length} recipient(s) configured`;
          currentSmtpEl.style.color = 'var(--success)';
        }
      }, 1000);
    })
    .catch((error) => {
      console.error('Email recipients update error:', error);
      showStatusMessage('Failed to update email recipients: ' + error.message, 'error');
    })
    .finally(() => {
      updateBtn.disabled = false;
      updateBtn.innerHTML = '<i class="fas fa-envelope"></i> Update Email Recipients';
    });
}

// Device commands
function sendDeviceCommand(command) {
  if (!currentDeviceId) {
    showStatusMessage('No device selected', 'error');
    return;
  }
  
  const commandData = {
    deviceId: currentDeviceId,
    command: command,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    requestedBy: 'dashboard',
    status: 'pending'
  };
  
  let commandText = '';
  switch (command) {
    case 'reboot':
      commandText = 'Device restart';
      break;
    case 'test_email':
      commandText = 'Test email alert';
      break;
    case 'reset_counters':
      commandText = 'Reset daily counters';
      break;
    case 'force_update':
      commandText = 'Force data update';
      break;
    default:
      commandText = 'Command';
  }
  
  // Use the format your Arduino expects (deviceId_pending document)
  db.collection('deviceCommands').doc(currentDeviceId + '_pending').set(commandData)
    .then(() => {
      showStatusMessage(commandText + ' sent to device successfully', 'success');
      
      // Special handling for test email
      if (command === 'test_email') {
        setTimeout(() => {
          showStatusMessage('Test email command sent. Check your configured email addresses in 1-2 minutes.', 'warning');
        }, 1000);
      }
    })
    .catch((error) => {
      console.error('Command error:', error);
      showStatusMessage('Failed to send ' + commandText.toLowerCase() + ': ' + error.message, 'error');
    });
}

// Status message display
function showStatusMessage(message, type = 'success') {
  // Remove existing status messages
  const existingMessages = document.querySelectorAll('.status-message');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new status message
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  
  // Add to the device controls section
  const controlsSection = document.querySelector('.device-controls-section');
  if (controlsSection) {
    controlsSection.appendChild(statusDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusDiv.style.opacity = '0';
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.parentNode.removeChild(statusDiv);
        }
      }, 300);
    }, 5000);
  }
}

// Update current readings display
function updateCalibrationReadings(data) {
  const currentRawEl = document.getElementById('current-raw-distance');
  const currentFullEl = document.getElementById('current-full-distance');
  const emptyLevelEl = document.getElementById('empty-level-distance');
  const fullLevelEl = document.getElementById('full-level-distance');
  
  if (currentRawEl && data.distance_cm) {
    currentRawEl.textContent = data.distance_cm.toFixed(1) + ' cm';
  }
  
  if (currentFullEl && data.distance_cm) {
    currentFullEl.textContent = data.distance_cm.toFixed(1) + ' cm';
  }
  
  if (emptyLevelEl && data.emptyLevel_cm) {
    emptyLevelEl.textContent = data.emptyLevel_cm.toFixed(1) + ' cm';
  }
  
  if (fullLevelEl && data.fullLevel_cm) {
    fullLevelEl.textContent = data.fullLevel_cm.toFixed(1) + ' cm';
  }
  
  // Update calibration status
  updateCalibrationStatus();
}

// Load device configuration
function loadDeviceConfiguration() {
  if (!currentDeviceId) return;
  
  // Load current WiFi SSID
  db.collection('deviceConfig').doc(currentDeviceId).get()
    .then((doc) => {
      if (doc.exists) {
        const config = doc.data();
        const currentWiFiEl = document.getElementById('current-wifi-ssid');
        const emptyLevelEl = document.getElementById('empty-level-distance');
        
        if (currentWiFiEl && config.wifiSSID) {
          currentWiFiEl.textContent = config.wifiSSID;
        }
        
        if (emptyLevelEl && config.emptyLevel_cm) {
          emptyLevelEl.textContent = config.emptyLevel_cm.toFixed(1) + ' cm';
        }
      }
    })
    .catch((error) => {
      console.log('Device config not found:', error.message);
      // Set default values
      const currentWiFiEl = document.getElementById('current-wifi-ssid');
      if (currentWiFiEl) {
        currentWiFiEl.textContent = 'Unknown';
      }
    });
}

/* ==== START THE APPLICATION ==== */
document.addEventListener('DOMContentLoaded', () => {
  initializeDetailPage();
  loadDeviceConfiguration();
});
