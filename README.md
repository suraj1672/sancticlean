# SanctiClean - Smart Temple Management System

![SanctiClean Logo](https://img.shields.io/badge/SanctiClean-Smart%20Temple%20Management-blue?style=for-the-badge)

## 🏛️ Overview

SanctiClean is an advanced IoT-based smart temple management system designed for real-time monitoring of temple bin systems across Puri, Odisha. The system combines modern web technologies with IoT sensors to ensure clean and well-maintained temple environments.

## ✨ Features

### 🔄 Real-time Monitoring
- Live bin fill level tracking
- Automated status updates
- Real-time distance measurements
- Device connectivity monitoring

### 🏛️ Temple Management
- Multi-temple support (Jagannath, Gundicha, Lokanath, Mausi Maa)
- Individual device tracking
- Editable temple information
- Custom bin calibration for each location

### 🤝 NGO Partnership
- Partner NGO management
- Editable contact information
- Collaboration tracking
- Community engagement features

### ⚙️ Device Controls
- **WiFi Configuration**: Easy SSID/password updates
- **SMTP Settings**: Email notification configuration
- **Bin Calibration**: Individual empty/full level calibration
- **Device Commands**: Remote device management

### 🚀 Future Implementation
- AI-Powered Waste Classification
- Predictive Analytics
- Mobile App Integration
- Advanced Analytics Dashboard

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Styling**: Custom CSS with CSS Grid & Flexbox
- **Icons**: Font Awesome 6.4.0
- **Animations**: CSS Keyframes & Transitions

## 📁 Project Structure

```
bin/
├── temple-dashboard.html      # Main dashboard page
├── temple-dashboard.js        # Dashboard functionality
├── temple-detail.html         # Individual temple details
├── temple-detail.js          # Temple detail functionality
├── temple-styles.css         # Main stylesheet
├── app-compat-multi.js       # Firebase compatibility layer
├── updated-arduino-code.ino  # Arduino/IoT device code
└── README.md                 # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account and project setup
- IoT devices with ultrasonic sensors

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sancticlean.git
   cd sancticlean
   ```

2. **Configure Firebase**
   - Update Firebase configuration in `temple-dashboard.js` and `temple-detail.js`
   - Set up Firestore database with appropriate collections

3. **Deploy to GitHub Pages**
   - Enable GitHub Pages in repository settings
   - Select source branch (main/master)
   - Access your live site at `https://yourusername.github.io/sancticlean`

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Firestore database
3. Update the Firebase config object in JavaScript files
4. Set up the following collections:
   - `bins` - Device data
   - `templeConfig` - Temple information
   - `ngoConfig` - NGO information
   - `deviceCommands` - Device control commands
   - `deviceConfig` - Device configuration

### IoT Device Setup
- Flash the provided Arduino code to your ESP32/NodeMCU
- Configure WiFi credentials
- Set up ultrasonic sensor connections
- Configure SMTP settings for email notifications

## 📊 Data Structure

### Bins Collection
```javascript
{
  distance_cm: number,
  binDepth_cm: number,
  fill_pct: number,
  status: "EMPTY" | "HALF" | "FULL",
  updatedAt: timestamp,
  emptyLevel_cm: number,
  fullLevel_cm: number
}
```

## 🎨 Features Showcase

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Theme**: Modern dark UI with gradient accents
- **Smooth Animations**: Fade-in effects and hover interactions
- **Real-time Updates**: Live data synchronization with Firebase
- **Interactive Controls**: Easy-to-use device management interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Email: support@sancticlean.com
- Issues: [GitHub Issues](https://github.com/yourusername/sancticlean/issues)

## 🙏 Acknowledgments

- Temple authorities of Puri, Odisha
- Partner NGOs for their collaboration
- Open source community for tools and libraries
- Firebase for backend services

---

**Made with ❤️ for cleaner temples and better devotee experience**
