# Firebase Security Rules for SanctiClean

## Firestore Security Rules

To fix the "missing or insufficient permissions" error, update your Firestore security rules in the Firebase Console:

### 1. Go to Firebase Console
- Visit: https://console.firebase.google.com
- Select your project: `smart-dustbin-9f582`
- Go to "Firestore Database" → "Rules"

### 2. Update Security Rules

Replace your current rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to bins collection
    match /bins/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to device commands
    match /deviceCommands/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to device configuration
    match /deviceConfig/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to email configuration
    match /emailConfig/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to temple configuration
    match /templeConfig/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to NGO configuration
    match /ngoConfig/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to daily stats
    match /dailyStats/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to email alerts
    match /emailAlerts/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to notifications
    match /notifications/{document} {
      allow read, write: if true;
    }
  }
}
```

### 3. Click "Publish"

This will allow your dashboard to read and write data without authentication issues.

## Production Security (Optional)

For production use, you can add authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Require authentication for all operations
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Then implement Firebase Authentication in your dashboard.

## Collections Used by SanctiClean

- `bins` - Real-time bin data from IoT devices
- `deviceCommands` - Commands sent to devices (WiFi, calibration, etc.)
- `deviceConfig` - Device configuration settings
- `emailConfig` - Email recipient configuration
- `templeConfig` - Editable temple information
- `ngoConfig` - Editable NGO information
- `dailyStats` - Daily statistics and analytics
- `emailAlerts` - Email alert history
- `notifications` - System notifications
