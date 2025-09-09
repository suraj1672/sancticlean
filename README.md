# SanctiClean - Smart Temple Dustbin Management System

![SanctiClean Logo](https://img.shields.io/badge/SanctiClean-Smart%20Temple%20Management-blue?style=for-the-badge)
[![Arduino](https://img.shields.io/badge/Arduino-ESP8266-00979D?style=flat&logo=arduino)](https://arduino.cc/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## 🏛️ Overview

SanctiClean is an advanced IoT-based smart dustbin management system designed specifically for temple environments. The system provides real-time monitoring of bin fill levels, automated email alerts, and remote device management through a modern web dashboard.

## ✨ Key Features

### 📊 Real-time Monitoring
- **Live bin fill level tracking** with ultrasonic sensors
- **Automated status updates** (Empty/Half/Full)
- **Real-time distance measurements** with median filtering
- **Device connectivity monitoring** and status reporting

### 🏛️ Multi-Temple Support
- **Generic device architecture** - same code for all temples
- **Dynamic temple information** - editable names and locations
- **Individual device tracking** with unique device IDs
- **Scalable to unlimited temple locations**

### 📧 Smart Notifications
- **Automated email alerts** when bins are full
- **Configurable recipients** via web dashboard
- **HTML email templates** with detailed bin information
- **Email cooldown periods** to prevent spam

### ⚙️ Remote Device Management
- **WiFi Configuration**: Update credentials remotely
- **Email Recipients**: Modify notification recipients
- **Bin Calibration**: Set empty bin levels remotely
- **Device Commands**: Restart, test email, reset counters

### 🔧 Easy Configuration
- **Web-based setup** - no code changes needed
- **Real-time updates** - changes apply within 30 seconds
- **Persistent storage** - settings survive device restarts
- **User-friendly interface** for non-technical users

## 🛠️ Technology Stack

### Hardware
- **ESP8266/NodeMCU** - WiFi-enabled microcontroller
- **HC-SR04** - Ultrasonic distance sensor
- **Power supply** - USB or external adapter

### Software
- **Arduino IDE** - Device programming
- **Firebase Firestore** - Real-time database
- **HTML5/CSS3/JavaScript** - Web dashboard
- **SMTP Protocol** - Email notifications

### Libraries Used
- **ESP8266WiFi** - WiFi connectivity
- **ESP8266HTTPClient** - HTTP requests
- **WiFiClientSecure** - Secure connections
- **EEPROM** - Persistent storage
- **ArduinoJson** - JSON parsing (optional)

## 📁 Project Structure

```
sancticlean/
├── 📄 updated-arduino-code.ino    # Main Arduino firmware
├── 🌐 index.html                  # Main dashboard page
├── 📄 temple-detail.html          # Individual temple management
├── 📜 temple-dashboard.js         # Dashboard JavaScript
├── 📜 temple-detail.js            # Temple detail JavaScript  
├── 🎨 styles.css                  # Main dashboard styles
├── 🎨 temple-styles.css           # Temple detail styles
├── 📚 CALIBRATION_AND_WIFI_GUIDE.md
├── 📚 IMPLEMENTATION_GUIDE.md
├── 📚 firebase-data-structure.md
└── 📄 README.md                   # This file
```

## 🚀 Quick Start

### 1. Hardware Setup
```
ESP8266 NodeMCU Connections:
├── VCC → 3.3V
├── GND → GND  
├── Trig → D5 (GPIO14)
└── Echo → D6 (GPIO12) via voltage divider
```

### 2. Software Setup
1. **Flash Arduino Code**
   ```cpp
   // Change only this line for each device:
   const char* DEVICE_ID = "TEMPLE_01";  // TEMPLE_02, TEMPLE_03, etc.
   ```

2. **Configure Firebase**
   - Update Firebase config in JavaScript files
   - Set up Firestore collections

3. **Deploy Web Dashboard**
   - Host on GitHub Pages, Netlify, or any web server
   - Access via web browser

### 3. Configuration via Web Dashboard
- **Temple Info**: Set name and location
- **WiFi Settings**: Configure network credentials  
- **Email Recipients**: Add notification emails
- **Calibration**: Set empty bin levels

## 🔧 Firebase Collections

### Required Collections:
```javascript
// bins/{DEVICE_ID}
{
  deviceId: "TEMPLE_01",
  distance_cm: 45.2,
  fill_pct: 15,
  status: "EMPTY",
  binDepth_cm: 50.0,
  emptyLevel_cm: 48.5,
  updatedAt: timestamp
}

// deviceConfig/{DEVICE_ID}  
{
  wifiSSID: "TempleWiFi",
  wifiPassword: "password123",
  recipientsCsv: "admin@temple.com, manager@temple.com",
  templeName: "Jagannath Temple",
  location: "Main Complex, Puri"
}

// deviceCommands/{DEVICE_ID}_pending
{
  command: "calibrate_empty_level",
  status: "pending",
  timestamp: timestamp
}
```

## 📱 Web Dashboard Features

### Main Dashboard
- **Live temple overview** with fill level indicators
- **Status cards** for each temple location
- **Quick actions** for common tasks
- **Responsive design** for all devices

### Temple Detail Page  
- **Real-time bin status** with visual indicators
- **Configuration panels** for WiFi and email settings
- **Calibration tools** with step-by-step guidance
- **Device management** commands and status

## 🔄 System Workflow

1. **Device boots** and connects to WiFi
2. **Loads configuration** from EEPROM and Firebase
3. **Takes measurements** every 30 seconds
4. **Sends data** to Firebase Firestore
5. **Checks for commands** every 10 seconds
6. **Sends email alerts** when bin is full
7. **Web dashboard** displays real-time data

## 🎯 Use Cases

### Temple Management
- **Multiple temple locations** with centralized monitoring
- **Staff notifications** when bins need emptying
- **Historical data** for waste management planning

### Remote Maintenance
- **WiFi updates** without physical access
- **Configuration changes** from anywhere
- **Device diagnostics** and troubleshooting

### Scalability
- **Easy deployment** to new locations
- **Minimal hardware requirements**
- **Cloud-based management** for unlimited devices

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/sancticlean/issues)
- **Documentation**: Check the `/docs` folder for detailed guides
- **Email**: Open an issue for support requests

## 🙏 Acknowledgments

- **Temple authorities** for their cooperation and feedback
- **Open source community** for libraries and tools
- **Firebase** for reliable backend services
- **Arduino community** for hardware support

---

**Made with ❤️ for cleaner temples and better devotee experience**

*Smart technology serving spiritual spaces* 🕉️