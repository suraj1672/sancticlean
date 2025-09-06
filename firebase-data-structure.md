# Firebase Data Structure for Temple Dashboard

## Overview
This document outlines the Firestore database structure needed for the Puri Temple Smart Dustbin Dashboard.

## Collections and Documents

### 1. `bins` Collection
Each temple device should have a document with the device ID as the document name.

#### Document Structure:
```javascript
// Document ID: "TEMPLE_01" (Jagannath Temple)
{
  "distance_cm": 15.5,           // Distance from sensor to waste (number)
  "binDepth_cm": 50,             // Total depth of the bin (number)
  "fill_pct": 69,                // Fill percentage (number, 0-100)
  "status": "HALF",              // Status: "EMPTY", "HALF", "FULL" (string)
  "updatedAt": Timestamp,        // Firebase timestamp
  "time": Timestamp,             // Alternative timestamp field
  "deviceId": "TEMPLE_01",       // Device identifier (string)
  "location": "Main Temple Complex, Puri",  // Physical location (string)
  "templeName": "Jagannath Temple"  // Temple name (string)
}
```

#### Required Documents:
- `TEMPLE_01` - Jagannath Temple
- `TEMPLE_02` - Gundicha Temple  
- `TEMPLE_03` - Lokanath Temple
- `TEMPLE_04` - Mausi Maa Temple

### 2. `notifications` Collection (Optional)
Track daily notification counts per device.

#### Document Structure:
```javascript
// Document ID: "2024-01-15" (Date format: YYYY-MM-DD)
{
  "date": "2024-01-15",
  "TEMPLE_01_alerts": 3,         // Number of alerts for this device today
  "TEMPLE_02_alerts": 1,
  "TEMPLE_03_alerts": 0,
  "TEMPLE_04_alerts": 2,
  "totalAlerts": 6
}
```

### 3. `dailyStats` Collection (Optional)
Track daily collection statistics.

#### Document Structure:
```javascript
// Document ID: "2024-01-15" (Date format: YYYY-MM-DD)
{
  "date": "2024-01-15",
  "totalCollections": 12,        // Total times bins were full today
  "TEMPLE_01_count": 4,          // Times this device was full today
  "TEMPLE_02_count": 2,
  "TEMPLE_03_count": 3,
  "TEMPLE_04_count": 3,
  "lastUpdated": Timestamp
}
```

### 4. `binHistory` Collection (For Charts & Analytics)
Store historical data for trend analysis.

#### Document Structure:
```javascript
// Document ID: Auto-generated
{
  "deviceId": "TEMPLE_01",
  "timestamp": Timestamp,
  "distance_cm": 15.5,
  "fill_pct": 69,
  "status": "HALF",
  "binDepth_cm": 50
}
```

### 5. `emailAlerts` Collection (Email Tracking)
Track all email notifications sent.

#### Document Structure:
```javascript
// Document ID: Auto-generated
{
  "deviceId": "TEMPLE_01",
  "timestamp": Timestamp,
  "fillLevel": 85,
  "status": "FULL",
  "emailSent": true,
  "emailRecipients": ["admin@temple.com", "maintenance@temple.com"],
  "smtpResponse": "250 OK",
  "responseTime": "2.3s",
  "subject": "Temple Bin Full Alert - Jagannath Temple",
  "retryCount": 0
}
```

### 6. `deviceStats` Collection (Per Device Statistics)
Daily statistics per device for detailed view.

#### Document Structure:
```javascript
// Document ID: "TEMPLE_01_2024-01-15"
{
  "deviceId": "TEMPLE_01",
  "date": "2024-01-15",
  "fullEvents": 4,
  "emailAlerts": 3,
  "maxFillLevel": 95,
  "avgFillLevel": 65,
  "firstFullTime": Timestamp,
  "lastFullTime": Timestamp,
  "totalReadings": 144,
  "uptime": "23h 45m"
}
```

## Arduino Code Integration

### Required Fields to Send from Arduino:
```cpp
// Minimum required fields for each update
{
  "distance_cm": sensorDistance,     // From ultrasonic sensor
  "binDepth_cm": 50,                 // Fixed value for your bin
  "fill_pct": calculatedPercentage,  // (binDepth - distance) / binDepth * 100
  "status": binStatus,               // "EMPTY", "HALF", "FULL"
  "updatedAt": FieldValue.serverTimestamp(),
  "deviceId": "TEMPLE_01"            // Your device identifier
}
```

### Status Calculation Logic:
```cpp
// Example Arduino logic
float fillPercentage = ((binDepth - distance) / binDepth) * 100;
String status;

if (fillPercentage >= 80) {
  status = "FULL";
  // Send SMTP notification here
} else if (fillPercentage >= 50) {
  status = "HALF";
} else {
  status = "EMPTY";
}
```

## SMTP Integration

### Email Notification Trigger:
When the Arduino detects `status = "FULL"`, it should:

1. Update Firestore with the full status
2. Send SMTP email notification
3. Optionally increment the daily notification count

### Sample SMTP Email Content:
```
Subject: 🚨 Temple Bin Full Alert - [Temple Name]

Dear Temple Management,

The smart dustbin at [Temple Name] is now FULL and requires immediate attention.

Details:
- Location: [Temple Location]
- Device ID: [Device ID]
- Fill Level: [Fill Percentage]%
- Time: [Current Time]
- Status: FULL

Please arrange for waste collection as soon as possible.

Best regards,
Smart Temple Management System
```

## Security Rules (Optional)

### Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to bins collection
    match /bins/{document} {
      allow read: if true;
      allow write: if request.auth != null; // Require authentication for writes
    }
    
    // Allow read access to stats
    match /dailyStats/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /notifications/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing the Dashboard

### Using Browser Console:
```javascript
// Test data simulation (only works on localhost)
window.templeDebug.simulateTempleData('jagannath', 85, 'FULL');
window.templeDebug.simulateTempleData('gundicha', 45, 'HALF');
window.templeDebug.simulateTempleData('lokanath', 20, 'EMPTY');
window.templeDebug.simulateTempleData('mausimaa', 95, 'FULL');
```

## Next Steps

1. **Set up Firestore database** with the collections above
2. **Configure Arduino devices** to send data to the correct document IDs
3. **Test SMTP functionality** from Arduino when bins are full
4. **Deploy the dashboard** to a web server
5. **Set up authentication** if needed for write operations

## Device Configuration

Make sure each Arduino device is configured with the correct:
- `deviceId` (TEMPLE_01, TEMPLE_02, TEMPLE_03, TEMPLE_04)
- WiFi credentials
- Firebase project credentials
- SMTP server settings
- Bin depth measurement (binDepth_cm)

The dashboard will automatically detect and display data from any device that matches the expected device IDs.
