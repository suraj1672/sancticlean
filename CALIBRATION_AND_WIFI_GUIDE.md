# Bin Calibration & WiFi Configuration Guide

## 🎯 New Features Added

You now have two powerful new features in your temple dashboard system:

### 1. **Bin Calibration System** 📏
- **Purpose**: Automatically detect the empty bin level (0% reference point)
- **When to use**: When first installing a device or when bin depth changes
- **How it works**: Takes multiple measurements when bin is empty to set accurate 0% level

### 2. **WiFi Configuration** 📶
- **Purpose**: Remotely update WiFi credentials for any device
- **When to use**: When WiFi network changes or device needs to connect to different network
- **How it works**: Sends new credentials through Firebase, device restarts with new settings

## 🔧 How to Use These Features

### **Accessing Device Controls**

1. **Open Temple Dashboard** (`temple-dashboard.html`)
2. **Click on any temple card** to open detailed view
3. **Scroll down to "Device Controls" section**

You'll see three control cards:
- **Bin Calibration** - Calibrate empty level
- **WiFi Configuration** - Update WiFi settings  
- **Device Commands** - Send various commands

### **Bin Calibration Process**

#### **When to Calibrate:**
- ✅ **First time setup** - After installing the device
- ✅ **Bin replacement** - When changing to different sized bin
- ✅ **Accuracy issues** - If fill percentages seem incorrect
- ✅ **After maintenance** - If sensor position changed

#### **Step-by-Step Calibration:**

1. **Empty the bin completely** - Remove all waste
2. **Open temple detail page** for the device
3. **Check "Current Distance"** - Should show distance to empty bin bottom
4. **Click "Calibrate Empty Level"** button
5. **Wait for calibration** - Progress bar shows status:
   - *Preparing sensor...*
   - *Taking measurements...*
   - *Calculating empty level...*
   - *Saving calibration...*
6. **Calibration complete!** - New empty level is saved

#### **What Happens During Calibration:**
- Device takes 10 measurements for accuracy
- Calculates average distance to empty bin
- Sets this as 0% fill level (empty)
- Saves calibration data to Firebase
- Updates all future fill percentage calculations

### **WiFi Configuration Process**

#### **When to Update WiFi:**
- ✅ **Network change** - WiFi password changed
- ✅ **New location** - Moving device to different network
- ✅ **Better signal** - Switching to stronger WiFi network
- ✅ **Security update** - Changing to more secure network

#### **Step-by-Step WiFi Update:**

1. **Open temple detail page** for the device
2. **Check "Current Network"** - Shows currently connected WiFi
3. **Enter new WiFi details:**
   - **WiFi SSID**: Network name (case-sensitive)
   - **WiFi Password**: Network password
4. **Click "Update WiFi Settings"**
5. **Wait for confirmation** - Success message appears
6. **Device restarts** - Connects to new network (takes 1-2 minutes)

#### **Important WiFi Notes:**
- ⚠️ **Device will restart** and may be offline for 1-2 minutes
- ⚠️ **Double-check credentials** - Incorrect details will cause connection failure
- ⚠️ **2.4GHz networks only** - ESP8266 doesn't support 5GHz
- ⚠️ **Network must be accessible** from device location

## 🔧 Device Commands Available

### **Additional Device Controls:**

1. **Restart Device** 🔄
   - Reboots the Arduino device
   - Useful for troubleshooting connection issues

2. **Test Email Alert** 📧
   - Sends a test email to all configured recipients
   - Helps verify SMTP settings are working

3. **Reset Daily Counters** 🔄
   - Resets daily full count and email count to zero
   - Useful for testing or manual reset

4. **Force Data Update** 📤
   - Forces device to immediately send current data
   - Useful when dashboard shows stale data

## 📊 Technical Details

### **How Calibration Works:**

#### **Before Calibration:**
```
Fixed Bin Depth: 50 cm
Distance Reading: 15 cm
Fill Calculation: (50 - 15) / 50 = 70%
```

#### **After Calibration:**
```
Calibrated Empty Level: 48.5 cm (actual measurement)
Distance Reading: 15 cm  
Fill Calculation: (48.5 - 15) / 48.5 = 69.1% (more accurate!)
```

### **Firebase Collections Updated:**

#### **1. Device Configuration** (`deviceConfig`)
```javascript
{
  "deviceId": "TEMPLE_01",
  "emptyLevel_cm": 48.5,
  "wifiSSID": "Temple_WiFi",
  "calibrationDate": "2024-01-20T10:30:00Z",
  "wifiUpdateDate": "2024-01-20T11:00:00Z"
}
```

#### **2. Device Commands** (`deviceCommands`)
```javascript
{
  "deviceId": "TEMPLE_01",
  "command": "calibrate_empty_level",
  "timestamp": "2024-01-20T10:30:00Z",
  "requestedBy": "dashboard",
  "status": "completed"
}
```

### **Arduino Code Changes:**

#### **New Variables:**
```cpp
float EMPTY_LEVEL_CM = 50.0;  // Calibrated empty level
bool calibrationMode = false; // Calibration in progress
```

#### **New Functions:**
- `performCalibration()` - Execute calibration process
- `updateWiFiCredentials()` - Handle WiFi updates
- `checkForCommands()` - Check for dashboard commands

#### **Updated Fill Calculation:**
```cpp
// Old calculation (fixed depth)
float fill = 100.0f * (1.0f - d_cm / BIN_DEPTH_CM);

// New calculation (calibrated empty level)  
float fill = 100.0f * (1.0f - d_cm / EMPTY_LEVEL_CM);
```

## 🚨 Troubleshooting

### **Calibration Issues:**

**Problem**: "Calibration failed - no valid readings"
- **Solution**: Check sensor connections and bin is completely empty

**Problem**: "Calibration gives wrong percentage"
- **Solution**: Ensure bin is 100% empty during calibration

**Problem**: "Fill percentage negative or over 100%"
- **Solution**: Re-calibrate with properly empty bin

### **WiFi Issues:**

**Problem**: "Device not connecting to new WiFi"
- **Solution**: 
  - Verify SSID and password are correct
  - Check WiFi is 2.4GHz (not 5GHz)
  - Ensure strong signal at device location

**Problem**: "WiFi update not working"
- **Solution**:
  - Check Firebase connection
  - Verify device is checking for commands
  - Manual restart may be needed

### **Command Issues:**

**Problem**: "Commands not executing"
- **Solution**:
  - Check Firebase connection
  - Verify device is online
  - Commands are checked every 10 seconds

## 📱 Dashboard Interface

### **Visual Indicators:**

- **🟢 Green Status**: Calibration/WiFi update successful
- **🟡 Yellow Warning**: Process in progress or minor issue  
- **🔴 Red Error**: Failed operation or connection issue

### **Real-time Updates:**

- **Current Distance**: Updates every 30 seconds with live readings
- **Empty Level**: Shows calibrated 0% reference point
- **Current Network**: Displays connected WiFi SSID
- **Status Messages**: Show success/error messages for 5 seconds

## 🔒 Security Considerations

### **WiFi Credentials:**
- Passwords are transmitted through Firebase (encrypted in transit)
- Consider using dedicated IoT network for devices
- Regularly update WiFi passwords for security

### **Command Security:**
- Commands are timestamped and tracked
- Only authorized dashboard users can send commands
- Consider implementing user authentication

## 🎯 Best Practices

### **Calibration:**
1. **Always calibrate when bin is completely empty**
2. **Calibrate during stable conditions** (no vibrations)
3. **Re-calibrate if changing bin type or size**
4. **Document calibration dates** for maintenance records

### **WiFi Management:**
1. **Test new WiFi settings** before mass deployment
2. **Keep backup of working credentials**
3. **Use strong, unique passwords**
4. **Monitor connection status** after updates

### **Device Commands:**
1. **Use test email** to verify SMTP settings
2. **Reset counters** at start of new tracking periods
3. **Restart devices** if connection issues persist
4. **Force updates** when dashboard data seems stale

Your temple bin monitoring system now has advanced calibration and remote management capabilities! 🏛️✨
