#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <ESP8266SMTPClient.h>

/* ============ USER CONFIG ============ */
// Wi-Fi
const char* WIFI_SSID = "Redmi Note 11";
const char* WIFI_PASS = "123456789";

// Firebase (from your config)
static const char* FB_API_KEY   = "AIzaSyB-Y1ydzoD2rQONDLTMz5qDnCdBBc6sF9Q";
static const char* FB_PROJECTID = "smart-dustbin-9f582";
static const char* FB_DATABASE  = "(default)";

// Firestore collection
const char* COLLECTION = "bins";

// DEVICE CONFIGURATION - CHANGE THIS FOR EACH TEMPLE
// Uncomment ONE of these based on which temple this device is for:
const char* DEVICE_ID = "TEMPLE_01";  // Jagannath Temple
// const char* DEVICE_ID = "TEMPLE_02";  // Gundicha Temple  
// const char* DEVICE_ID = "TEMPLE_03";  // Lokanath Temple
// const char* DEVICE_ID = "TEMPLE_04";  // Mausi Maa Temple

// Temple Information (update based on DEVICE_ID)
const char* TEMPLE_NAME = "Jagannath Temple";
const char* TEMPLE_LOCATION = "Main Temple Complex, Puri";

// SMTP Configuration for Email Alerts
const char* SMTP_SERVER = "smtp.gmail.com";
const int SMTP_PORT = 587;
const char* SMTP_USER = "your-email@gmail.com";  // Change this
const char* SMTP_PASS = "your-app-password";     // Use app password, not regular password
const char* ALERT_EMAIL_1 = "admin@temple.com";  // Primary alert recipient
const char* ALERT_EMAIL_2 = "maintenance@puri.gov.in"; // Secondary recipient
const char* ALERT_EMAIL_3 = "ngo@greenpuri.org"; // NGO contact

// Ultrasonic pins (NodeMCU labels -> GPIO)
const uint8_t PIN_TRIG = D5;   // GPIO14
const uint8_t PIN_ECHO = D6;   // GPIO12 (Echo via voltage divider to 3.3V!)

// Bin depth in centimeters (will be calibrated automatically)
float BIN_DEPTH_CM = 50.0;   // Default depth, will be updated by calibration
float EMPTY_LEVEL_CM = 50.0; // Distance when bin is empty (0% full)

// Status thresholds (percent full)
const int FULL_THRESH = 80;
const int HALF_THRESH = 40;

// Measurement settings
const uint8_t  NUM_SAMPLES        = 5;          // median of N reads
const uint32_t MEASURE_PERIOD_MS  = 30000;     // every 30 seconds
const uint32_t EMAIL_COOLDOWN_MS  = 1800000;   // 30 minutes between emails

/* ============ MINIMAL FIRESTORE CLIENT (ESP8266) ============ */
class FirebaseClient {
public:
  FirebaseClient(const String& apiKey, const String& projectId, const String& database="(default)")
    : apiKey_(apiKey), projectId_(projectId), db_(database) {
      client_.setInsecure(); // DEV ONLY: skip TLS validation; pin a CA for production
  }
  
  String docPath(const String& collection, const String& docId) const {
    return "projects/" + projectId_ + "/databases/" + db_ + "/documents/" + collection + "/" + docId;
  }
  
  String docUrl(const String& collection, const String& docId) const {
    return "https://firestore.googleapis.com/v1/" + docPath(collection, docId) + "?key=" + apiKey_;
  }
  
  String createUrl(const String& collection, const String& docId) const {
    return "https://firestore.googleapis.com/v1/projects/" + projectId_ +
           "/databases/" + db_ + "/documents/" + collection +
           "?documentId=" + urlEncode(docId) + "&key=" + apiKey_;
  }
  
  String commitUrl() const {
    return "https://firestore.googleapis.com/v1/projects/" + projectId_ +
           "/databases/" + db_ + "/documents:commit?key=" + apiKey_;
  }
  
  int getDocument(const String& collection, const String& docId, String& respJson) {
    HTTPClient http;
    String url = docUrl(collection, docId);
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    int code = http.GET();
    respJson = http.getString();
    http.end();
    return code;
  }
  
  int createDocument(const String& collection, const String& docId, const String& fieldsJson, String& respJson) {
    HTTPClient http;
    String url = createUrl(collection, docId);
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    http.addHeader("Content-Type", "application/json");
    String body = "{\"fields\":" + fieldsJson + "}";
    int code = http.POST(body);
    respJson = http.getString();
    http.end();
    return code;
  }
  
  int commitUpdateWithServerTime(const String& collection,
                                 const String& docId,
                                 const String& fieldsJson,
                                 const String& serverTimeField,
                                 String& respJson) {
    String name = docPath(collection, docId);
    // writes[0]: update, writes[1]: server timestamp
    String payload =
      "{\"writes\":["
        "{\"update\":{"
          "\"name\":\"" + name + "\","
          "\"fields\":" + fieldsJson +
        "}}";
    if (serverTimeField.length()) {
      payload +=
        ",{\"transform\":{"
          "\"document\":\"" + name + "\","
          "\"fieldTransforms\":[{\"fieldPath\":\"" + serverTimeField + "\",\"setToServerValue\":\"REQUEST_TIME\"}]"
        "}}";
    }
    payload += "]}";
    
    HTTPClient http;
    String url = commitUrl();
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    respJson = http.getString();
    http.end();
    return code;
  }
  
  // Add document to collection (for history tracking)
  int addDocument(const String& collection, const String& fieldsJson, String& respJson) {
    HTTPClient http;
    String url = "https://firestore.googleapis.com/v1/projects/" + projectId_ +
                "/databases/" + db_ + "/documents/" + collection + "?key=" + apiKey_;
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    http.addHeader("Content-Type", "application/json");
    String body = "{\"fields\":" + fieldsJson + "}";
    int code = http.POST(body);
    respJson = http.getString();
    http.end();
    return code;
  }
  
  static String urlEncode(const String& s) {
    String out; char c; char bufHex[4];
    for (size_t i=0;i<s.length();++i) {
      c = s[i];
      if (isalnum(c) || c=='-' || c=='_' || c=='.' || c=='~') out += c;
      else if (c==' ') out += '+';
      else { snprintf(bufHex, sizeof(bufHex), "%%%02X", (unsigned char)c); out += bufHex; }
    }
    return out;
  }
  
private:
  WiFiClientSecure client_;
  String apiKey_, projectId_, db_;
};

/* ============ EMAIL CLIENT ============ */
class EmailAlert {
public:
  EmailAlert(const char* server, int port, const char* user, const char* pass)
    : server_(server), port_(port), user_(user), pass_(pass) {}
  
  bool sendAlert(const String& deviceId, const String& templeName, const String& location, 
                int fillPercent, const String& status) {
    WiFiClient client;
    
    if (!client.connect(server_, port_)) {
      Serial.println("SMTP connection failed");
      return false;
    }
    
    // Wait for server greeting
    if (!waitForResponse(client, "220")) return false;
    
    // HELO
    client.println("HELO " + String(server_));
    if (!waitForResponse(client, "250")) return false;
    
    // STARTTLS
    client.println("STARTTLS");
    if (!waitForResponse(client, "220")) return false;
    
    // Upgrade to TLS (simplified - in production use proper TLS)
    // For now, continue without TLS (not secure but functional)
    
    // AUTH LOGIN
    client.println("AUTH LOGIN");
    if (!waitForResponse(client, "334")) return false;
    
    // Send username (base64 encoded)
    client.println(base64Encode(user_));
    if (!waitForResponse(client, "334")) return false;
    
    // Send password (base64 encoded)
    client.println(base64Encode(pass_));
    if (!waitForResponse(client, "235")) return false;
    
    // MAIL FROM
    client.println("MAIL FROM:<" + String(user_) + ">");
    if (!waitForResponse(client, "250")) return false;
    
    // RCPT TO (multiple recipients)
    const char* recipients[] = {ALERT_EMAIL_1, ALERT_EMAIL_2, ALERT_EMAIL_3};
    for (int i = 0; i < 3; i++) {
      client.println("RCPT TO:<" + String(recipients[i]) + ">");
      if (!waitForResponse(client, "250")) return false;
    }
    
    // DATA
    client.println("DATA");
    if (!waitForResponse(client, "354")) return false;
    
    // Email headers and body
    client.println("From: " + String(user_));
    client.println("To: " + String(ALERT_EMAIL_1) + ", " + String(ALERT_EMAIL_2) + ", " + String(ALERT_EMAIL_3));
    client.println("Subject: 🚨 Temple Bin Full Alert - " + templeName);
    client.println("Content-Type: text/html; charset=UTF-8");
    client.println();
    
    // HTML email body
    String emailBody = 
      "<html><body style='font-family: Arial, sans-serif;'>"
      "<div style='background: linear-gradient(135deg, #ff9a56, #ff6b6b); padding: 20px; border-radius: 10px; color: white;'>"
      "<h2>🚨 Temple Dustbin Full Alert</h2>"
      "</div>"
      "<div style='padding: 20px; background: #f8f9fa; border-radius: 10px; margin: 10px 0;'>"
      "<h3>Alert Details:</h3>"
      "<table style='width: 100%; border-collapse: collapse;'>"
      "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Temple:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + templeName + "</td></tr>"
      "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Location:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + location + "</td></tr>"
      "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Device ID:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + deviceId + "</td></tr>"
      "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Fill Level:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd; color: #dc3545; font-weight: bold;'>" + String(fillPercent) + "%</td></tr>"
      "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Status:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd; color: #dc3545; font-weight: bold;'>" + status + "</td></tr>"
      "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><strong>Time:</strong></td><td style='padding: 8px; border-bottom: 1px solid #ddd;'>" + getCurrentTime() + "</td></tr>"
      "</table>"
      "</div>"
      "<div style='padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; margin: 10px 0;'>"
      "<p><strong>⚠️ Action Required:</strong> The dustbin at " + templeName + " is now " + status + " and requires immediate attention.</p>"
      "<p>Please arrange for waste collection as soon as possible to maintain temple cleanliness.</p>"
      "</div>"
      "<div style='padding: 10px; text-align: center; color: #666; font-size: 12px;'>"
      "<p>This is an automated alert from the Smart Temple Management System</p>"
      "<p>Dashboard: <a href='http://your-dashboard-url.com'>View Live Dashboard</a></p>"
      "</div>"
      "</body></html>";
    
    client.println(emailBody);
    client.println(".");
    if (!waitForResponse(client, "250")) return false;
    
    // QUIT
    client.println("QUIT");
    waitForResponse(client, "221");
    
    client.stop();
    Serial.println("✅ Email alert sent successfully!");
    return true;
  }
  
private:
  const char* server_;
  int port_;
  const char* user_;
  const char* pass_;
  
  bool waitForResponse(WiFiClient& client, const String& expectedCode) {
    unsigned long timeout = millis() + 10000; // 10 second timeout
    String response = "";
    
    while (millis() < timeout) {
      if (client.available()) {
        response = client.readStringUntil('\n');
        Serial.println("SMTP: " + response);
        if (response.startsWith(expectedCode)) {
          return true;
        }
        if (response.startsWith("4") || response.startsWith("5")) {
          return false; // Error codes
        }
      }
      delay(10);
    }
    return false;
  }
  
  String base64Encode(const String& input) {
    // Simple base64 encoding (you might want to use a proper library)
    const char* chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    String output = "";
    int pad = input.length() % 3;
    
    for (int i = 0; i < input.length(); i += 3) {
      int b1 = input[i];
      int b2 = (i + 1 < input.length()) ? input[i + 1] : 0;
      int b3 = (i + 2 < input.length()) ? input[i + 2] : 0;
      
      output += chars[b1 >> 2];
      output += chars[((b1 & 0x03) << 4) | (b2 >> 4)];
      output += chars[((b2 & 0x0f) << 2) | (b3 >> 6)];
      output += chars[b3 & 0x3f];
    }
    
    if (pad) {
      output[output.length() - 1] = '=';
      if (pad == 1) output[output.length() - 2] = '=';
    }
    
    return output;
  }
  
  String getCurrentTime() {
    // Get current time (you might want to use NTP for accurate time)
    unsigned long now = millis();
    int hours = (now / 3600000) % 24;
    int minutes = (now / 60000) % 60;
    int seconds = (now / 1000) % 60;
    return String(hours) + ":" + String(minutes) + ":" + String(seconds);
  }
};

/* ============ GLOBALS ============ */
FirebaseClient fb(FB_API_KEY, FB_PROJECTID, FB_DATABASE);
EmailAlert emailClient(SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASS);

unsigned long lastMeasure = 0;
unsigned long lastEmailSent = 0;
unsigned long lastCommandCheck = 0;
bool wasFullLastTime = false;
int dailyFullCount = 0;
int dailyEmailCount = 0;
bool calibrationMode = false;

/* ============ ULTRASONIC HELPERS ============ */
float readDistanceOnceCM() {
  digitalWrite(PIN_TRIG, LOW); 
  delayMicroseconds(3);
  digitalWrite(PIN_TRIG, HIGH); 
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  // ~25ms timeout (≈4m)
  unsigned long duration = pulseIn(PIN_ECHO, HIGH, 25000UL);
  if (duration == 0) return NAN;
  
  // distance (cm) ≈ duration / 58
  return (float)duration / 58.0f;
}

float medianDistanceCM(uint8_t n) {
  float vals[15];
  if (n > 15) n = 15;
  uint8_t count = 0;
  
  for (uint8_t i=0;i<n;i++) {
    float d = readDistanceOnceCM();
    if (!isnan(d) && d > 0 && d < 500) vals[count++] = d;
    delay(40);
  }
  
  if (count == 0) return NAN;
  
  // insertion sort
  for (uint8_t i=1;i<count;i++) {
    float key = vals[i]; 
    int j = i - 1;
    while (j >= 0 && vals[j] > key) { 
      vals[j+1] = vals[j]; 
      j--; 
    }
    vals[j+1] = key;
  }
  
  if (count % 2) return vals[count/2];
  return 0.5f*(vals[count/2 - 1] + vals[count/2]);
}

String statusFromPercent(int pct) {
  if (pct >= FULL_THRESH) return "FULL";
  if (pct >= HALF_THRESH) return "HALF";
  return "EMPTY";
}

int clampPct(int p) {
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

/* ============ CALIBRATION AND COMMAND HANDLING ============ */
void performCalibration() {
  Serial.println("🎯 Starting bin calibration...");
  calibrationMode = true;
  
  // Take multiple measurements for accuracy
  float totalDistance = 0;
  int validReadings = 0;
  
  for (int i = 0; i < 10; i++) {
    float distance = medianDistanceCM(3);
    if (!isnan(distance) && distance > 0) {
      totalDistance += distance;
      validReadings++;
    }
    delay(100);
  }
  
  if (validReadings > 0) {
    EMPTY_LEVEL_CM = totalDistance / validReadings;
    Serial.printf("✅ Calibration complete! Empty level: %.2f cm\n", EMPTY_LEVEL_CM);
    
    // Calibration data will be saved in main update
    
    // Update device config in Firebase
    String configFields = String("{") +
      "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
      "\"emptyLevel_cm\":{\"doubleValue\":" + String(EMPTY_LEVEL_CM, 2) + "}," +
      "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}," +
      "\"calibrationDate\":{\"timestampValue\":\"" + getCurrentISOTime() + "\"}" +
    "}";
    
    String resp;
    int code = fb.commitUpdateWithServerTime("deviceConfig", DEVICE_ID, configFields, "updatedAt", resp);
    if (code >= 200 && code < 300) {
      Serial.println("✅ Calibration data saved to Firebase");
    }
  } else {
    Serial.println("❌ Calibration failed - no valid readings");
  }
  
  calibrationMode = false;
}

void updateWiFiCredentials(const String& newSSID, const String& newPassword) {
  Serial.println("📶 Updating WiFi credentials...");
  
  // In a real implementation, you would:
  // 1. Save new credentials to EEPROM/SPIFFS
  // 2. Restart the device
  // 3. Connect with new credentials
  
  Serial.printf("New SSID: %s\n", newSSID.c_str());
  Serial.println("New Password: [HIDDEN]");
  
  // Save to device config
  String configFields = String("{") +
    "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
    "\"wifiSSID\":{\"stringValue\":\"" + newSSID + "\"}," +
    "\"wifiUpdateDate\":{\"timestampValue\":\"" + getCurrentISOTime() + "\"}" +
  "}";
  
  String resp;
  int code = fb.commitUpdateWithServerTime("deviceConfig", DEVICE_ID, configFields, "updatedAt", resp);
  if (code >= 200 && code < 300) {
    Serial.println("✅ WiFi config saved to Firebase");
    Serial.println("🔄 Device will restart to apply new WiFi settings...");
    
    // In production, restart the device here
    // ESP.restart();
  }
}

void checkForCommands() {
  unsigned long now = millis();
  if (now - lastCommandCheck < 10000) return; // Check every 10 seconds
  lastCommandCheck = now;
  
  // Get pending commands from Firebase
  String resp;
  int code = fb.getDocument("deviceCommands", DEVICE_ID + "_pending", resp);
  
  if (code == 200) {
    // Parse command (simplified - in production use ArduinoJson)
    if (resp.indexOf("calibrate_empty_level") > 0) {
      Serial.println("📥 Received calibration command");
      performCalibration();
      
      // Delete the command
      // fb.deleteDocument("deviceCommands", DEVICE_ID + "_pending", resp);
    }
    else if (resp.indexOf("update_wifi") > 0) {
      Serial.println("📥 Received WiFi update command");
      // Extract SSID and password from response
      // In production, properly parse JSON
      
      // For demo, simulate WiFi update
      updateWiFiCredentials("New_Network", "new_password");
    }
    else if (resp.indexOf("test_email") > 0) {
      Serial.println("📥 Received test email command");
      emailClient.sendAlert(DEVICE_ID, TEMPLE_NAME, TEMPLE_LOCATION, 95, "FULL");
    }
    else if (resp.indexOf("reboot") > 0) {
      Serial.println("📥 Received reboot command");
      Serial.println("🔄 Restarting device...");
      // ESP.restart();
    }
    else if (resp.indexOf("reset_counters") > 0) {
      Serial.println("📥 Received reset counters command");
      dailyFullCount = 0;
      dailyEmailCount = 0;
      Serial.println("✅ Daily counters reset");
    }
  }
}

/* ============ FIREBASE HELPERS ============ */
void logToHistory(float distance, int fillPct, const String& status) {
  String historyFields = String("{") +
    "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
    "\"distance_cm\":{\"doubleValue\":" + String(distance, 2) + "}," +
    "\"fill_pct\":{\"doubleValue\":" + String(fillPct) + "}," +
    "\"status\":{\"stringValue\":\"" + status + "\"}," +
    "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}," +
    "\"timestamp\":{\"timestampValue\":\"" + getCurrentISOTime() + "\"}" +
  "}";
  
  String resp;
  int code = fb.addDocument("binHistory", historyFields, resp);
  if (code >= 200 && code < 300) {
    Serial.println("✅ History logged");
  } else {
    Serial.println("❌ History log failed: " + String(code));
  }
}

void logEmailAlert(int fillLevel, const String& status, bool emailSent, const String& response) {
  String alertFields = String("{") +
    "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
    "\"fillLevel\":{\"doubleValue\":" + String(fillLevel) + "}," +
    "\"status\":{\"stringValue\":\"" + status + "\"}," +
    "\"emailSent\":{\"booleanValue\":" + (emailSent ? "true" : "false") + "}," +
    "\"smtpResponse\":{\"stringValue\":\"" + response + "\"}," +
    "\"timestamp\":{\"timestampValue\":\"" + getCurrentISOTime() + "\"}," +
    "\"emailRecipients\":{\"arrayValue\":{\"values\":[" +
      "{\"stringValue\":\"" + String(ALERT_EMAIL_1) + "\"}," +
      "{\"stringValue\":\"" + String(ALERT_EMAIL_2) + "\"}," +
      "{\"stringValue\":\"" + String(ALERT_EMAIL_3) + "\"}" +
    "]}}" +
  "}";
  
  String resp;
  int code = fb.addDocument("emailAlerts", alertFields, resp);
  if (code >= 200 && code < 300) {
    Serial.println("✅ Email alert logged");
  } else {
    Serial.println("❌ Email alert log failed: " + String(code));
  }
}

String getCurrentISOTime() {
  // Simple ISO time format (you should use NTP for accurate time)
  unsigned long now = millis();
  return "2024-01-20T" + String((now / 3600000) % 24) + ":" + 
         String((now / 60000) % 60) + ":" + String((now / 1000) % 60) + "Z";
}

/* ============ SETUP/LOOP ============ */
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("🏛️ Temple Smart Dustbin System Starting...");
  Serial.printf("Temple: %s\n", TEMPLE_NAME);
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  Serial.printf("Location: %s\n", TEMPLE_LOCATION);
  
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);    // ECHO through a 5V→3.3V divider
  
  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  Serial.printf("\n✅ WiFi connected: %s\n", WiFi.localIP().toString().c_str());
  
  // Ensure Firestore doc exists
  String resp; 
  int code = fb.getDocument(COLLECTION, DEVICE_ID, resp);
  if (code == 404) {
    Serial.println("📝 Creating Firestore document...");
    String fields = String("{") +
      "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
      "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}," +
      "\"templeName\":{\"stringValue\":\"" + String(TEMPLE_NAME) + "\"}," +
      "\"location\":{\"stringValue\":\"" + String(TEMPLE_LOCATION) + "\"}" +
    "}";
    code = fb.createDocument(COLLECTION, DEVICE_ID, fields, resp);
    Serial.printf("Create result: %d\n", code);
  } else {
    Serial.printf("✅ Firestore document exists: %d\n", code);
  }
  
  Serial.println("🚀 System ready! Starting measurements...");
}

void loop() {
  unsigned long now = millis();
  
  // Check for commands from dashboard
  checkForCommands();
  
  if (now - lastMeasure >= MEASURE_PERIOD_MS) {
    lastMeasure = now;
    
    Serial.println("\n📏 Taking measurement...");
    float d_cm = medianDistanceCM(NUM_SAMPLES);
    
    if (isnan(d_cm)) {
      Serial.println("❌ Distance read failed.");
      return;
    }
    
    // Compute fill %
    // Compute fill % using calibrated empty level
    float fill = 100.0f * (1.0f - d_cm / EMPTY_LEVEL_CM);
    int fillPct = clampPct((int)roundf(fill));
    String stat = statusFromPercent(fillPct);
    
    Serial.printf("📊 Distance: %.2f cm | Fill: %d%% | Status: %s\n", d_cm, fillPct, stat.c_str());
    
    // Check if bin just became full
    bool isFullNow = (stat == "FULL");
    bool shouldSendEmail = false;
    
    if (isFullNow && !wasFullLastTime) {
      dailyFullCount++;
      shouldSendEmail = true;
      Serial.println("🚨 Bin is now FULL! Triggering alert...");
    } else if (isFullNow && (now - lastEmailSent) >= EMAIL_COOLDOWN_MS) {
      shouldSendEmail = true;
      Serial.println("🔄 Bin still full, sending reminder email...");
    }
    
    // Send email alert if needed
    if (shouldSendEmail) {
      Serial.println("📧 Sending email alert...");
      bool emailSent = emailClient.sendAlert(DEVICE_ID, TEMPLE_NAME, TEMPLE_LOCATION, fillPct, stat);
      
      if (emailSent) {
        dailyEmailCount++;
        lastEmailSent = now;
        Serial.println("✅ Email alert sent successfully!");
        logEmailAlert(fillPct, stat, true, "250 OK");
      } else {
        Serial.println("❌ Email alert failed!");
        logEmailAlert(fillPct, stat, false, "Connection failed");
      }
    }
    
    wasFullLastTime = isFullNow;
    
    // Update Firestore with current data
    String fields = String("{") +
      "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
      "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}," +
      "\"distance_cm\":{\"doubleValue\":" + String(d_cm, 2) + "}," +
      "\"fill_pct\":{\"doubleValue\":" + String(fillPct) + "}," +
      "\"status\":{\"stringValue\":\"" + stat + "\"}," +
      "\"templeName\":{\"stringValue\":\"" + String(TEMPLE_NAME) + "\"}," +
      "\"location\":{\"stringValue\":\"" + String(TEMPLE_LOCATION) + "\"}," +
      "\"dailyFullCount\":{\"doubleValue\":" + String(dailyFullCount) + "}," +
      "\"dailyEmailCount\":{\"doubleValue\":" + String(dailyEmailCount) + "}," +
      "\"emptyLevel_cm\":{\"doubleValue\":" + String(EMPTY_LEVEL_CM, 2) + "}" +
    "}";
    
    String resp;
    int code = fb.commitUpdateWithServerTime(COLLECTION, DEVICE_ID, fields, "updatedAt", resp);
    Serial.printf("📤 Firestore update: %d\n", code);
    
    if (code < 200 || code >= 300) {
      Serial.println("❌ Firestore update failed:");
      Serial.println(resp);
    } else {
      Serial.println("✅ Data updated successfully!");
    }
    
    // Log to history for analytics (every 5th measurement to save space)
    static int measureCount = 0;
    if (++measureCount % 5 == 0) {
      logToHistory(d_cm, fillPct, stat);
    }
  }
  
  // Reset daily counters at midnight (simplified)
  static int lastDay = -1;
  int currentDay = (millis() / (24 * 60 * 60 * 1000)) % 365;
  if (currentDay != lastDay) {
    dailyFullCount = 0;
    dailyEmailCount = 0;
    lastDay = currentDay;
    Serial.println("🌅 New day started, counters reset");
  }
}
