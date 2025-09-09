#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include <math.h>
#include <EEPROM.h>


/* ================== DEVICE & DEFAULTS ================== */
// Build one firmware for all four devices; just change this line before flashing each unit:
const char* DEVICE_ID = "TEMPLE_01";   // TEMPLE_01 / TEMPLE_02 / TEMPLE_03 / TEMPLE_04


// Wi-Fi defaults (dashboard/commands can override safely)
String currentWifiSSID = "smartbin";
String currentWifiPass = "smartbin";


/* ================== Firebase (Firestore REST) ================== */
static const char* FB_API_KEY   = "AIzaSyB-Y1ydzoD2rQONDLTMz5qDnCdBBc6sF9Q";
static const char* FB_PROJECTID = "smart-dustbin-9f582";
static const char* FB_DATABASE  = "(default)";
const char* COLLECTION = "bins";


/* ================== SMTP (Gmail implicit TLS 465) ================== */
const char* SMTP_SERVER = "smtp.gmail.com";
const uint16_t SMTP_PORT = 465;                         // implicit TLS
const char* SMTP_USER = "surajkumar149704@gmail.com";   // sender
const char* SMTP_PASS = "zpptgztwdimlyfkm";             // 16-digit App Password


/* ================== Recipients (dynamic, up to 8) ================== */
static const int MAX_RECIP = 8;
String recipients[MAX_RECIP];
int recipientsCount = 0;


// Optional defaults (will be overridden by EEPROM / dashboard)
const char* DEFAULT_RECIPIENTS_CSV =
  "pawanjain2307@gmail.com, maintenance@puri.gov.in, ngo@greenpuri.org, ops@example.com";


/* ================== EEPROM layout ================== */
#define EEPROM_SIZE     512
#define EE_WIFI_SSID    0      // 64
#define EE_WIFI_PASS    64     // 64
#define EE_EMAIL1       128    // legacy slot 1 (64)
#define EE_EMAIL2       192    // legacy slot 2 (64)
#define EE_EMAIL3       256    // legacy slot 3 (64)
#define EE_RECIP_CSV    320    // CSV recipients (up to ~159 chars safely)
#define EE_FLAG         480    // 0xA5 if configured


/* ================== Ultrasonic pins / thresholds ================== */
const uint8_t PIN_TRIG = D5;   // GPIO14
const uint8_t PIN_ECHO = D6;   // GPIO12
float BIN_DEPTH_CM   = 50.0;
float EMPTY_LEVEL_CM = 50.0;
const int FULL_THRESH = 80;
const int HALF_THRESH = 40;


const uint8_t  NUM_SAMPLES        = 5;
const uint32_t MEASURE_PERIOD_MS  = 30000;
const uint32_t EMAIL_COOLDOWN_MS  = 1800000;


/* ================== Minimal Firestore client ================== */
class FirebaseClient {
public:
  FirebaseClient(const String& apiKey, const String& projectId, const String& database="(default)")
    : apiKey_(apiKey), projectId_(projectId), db_(database) { client_.setInsecure(); }


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
    HTTPClient http; String url = docUrl(collection, docId);
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    int code = http.GET(); respJson = http.getString(); http.end(); return code;
  }
  int createDocument(const String& collection, const String& docId, const String& fieldsJson, String& respJson) {
    HTTPClient http; String url = createUrl(collection, docId);
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(String("{\"fields\":") + fieldsJson + "}"); respJson = http.getString(); http.end(); return code;
  }
  int commitUpdateWithServerTime(const String& collection, const String& docId, const String& fieldsJson,
                                 const String& serverTimeField, String& respJson) {
    String name = docPath(collection, docId);
    String payload = String("{\"writes\":[{\"update\":{\"name\":\"") + name + "\",\"fields\":" + fieldsJson + "}}";
    if (serverTimeField.length()) {
      payload += String(",{\"transform\":{\"document\":\"") + name + "\",\"fieldTransforms\":[{\"fieldPath\":\"" +
                 serverTimeField + "\",\"setToServerValue\":\"REQUEST_TIME\"}]}}";
    }
    payload += "]}";
    HTTPClient http; String url = commitUrl();
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload); respJson = http.getString(); http.end(); return code;
  }
  int addDocument(const String& collection, const String& fieldsJson, String& respJson) {
    HTTPClient http; String url = "https://firestore.googleapis.com/v1/projects/" + projectId_ +
                "/databases/" + db_ + "/documents/" + collection + "?key=" + apiKey_;
    if (!http.begin(client_, url)) { respJson = "begin() failed"; return -1; }
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(String("{\"fields\":") + fieldsJson + "}"); respJson = http.getString(); http.end(); return code;
  }
  int setCommandStatus(const String& docId, const String& status, const String& reason, String& respJson) {
    String fields = String("{") + "\"status\":{\"stringValue\":\"" + status + "\"}";
    if (reason.length()) fields += ",\"reason\":{\"stringValue\":\"" + reason + "\"}";
    fields += "}";
    return commitUpdateWithServerTime("deviceCommands", docId, fields, "updatedAt", respJson);
  }


  static String urlEncode(const String& s) {
    String out; char c; char bufHex[4];
    for (size_t i=0;i<s.length();++i) { c = s[i];
      if (isalnum(c) || c=='-' || c=='_' || c=='.' || c=='~') out += c;
      else if (c==' ') out += '+';
      else { snprintf(bufHex, sizeof(bufHex), "%%%02X", (unsigned char)c); out += bufHex; } }
    return out;
  }
  static String isoNow() {
    time_t t = time(nullptr);
    if (t < 100000) { unsigned long ms = millis(); char b[32];
      snprintf(b, sizeof(b), "2024-01-20T%02lu:%02lu:%02luZ",
               (ms/3600000UL)%24, (ms/60000UL)%60, (ms/1000UL)%60);
      return String(b);
    }
    struct tm *ptm = gmtime(&t); char buf[40];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", ptm); return String(buf);
  }


private:
  WiFiClientSecure client_;
  String apiKey_, projectId_, db_;
};


FirebaseClient fb(FB_API_KEY, FB_PROJECTID, FB_DATABASE);


/* ================== SMTP (streamed) ================== */
String base64Encode(const String& input) {
  static const char* tbl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String out; int i = 0, j = 0; uint8_t arr3[3], arr4[4];
  int len = input.length(); const uint8_t* bytes = (const uint8_t*)input.c_str();
  while (len--) { arr3[i++] = *(bytes++); if (i == 3) {
      arr4[0] = (arr3[0] & 0xfc) >> 2;
      arr4[1] = ((arr3[0] & 0x03) << 4) + ((arr3[1] & 0xf0) >> 4);
      arr4[2] = ((arr3[1] & 0x0f) << 2) + ((arr3[2] & 0xc0) >> 6);
      arr4[3] = arr3[2] & 0x3f;
      for (i = 0; i < 4; i++) out += tbl[arr4[i]]; i = 0; } }
  if (i) { for (j = i; j < 3; j++) arr3[j] = '\0';
    arr4[0] = (arr3[0] & 0xfc) >> 2;
    arr4[1] = ((arr3[0] & 0x03) << 4) + ((arr3[1] & 0xf0) >> 4);
    arr4[2] = ((arr3[1] & 0x0f) << 2) + ((arr3[2] & 0xc0) >> 6);
    arr4[3] = arr3[2] & 0x3f;
    for (j = 0; j < i + 1; j++) out += tbl[arr4[j]];
    while ((i++ < 3)) out += '='; }
  return out;
}


bool gmailSendHTML_streamed(const String& subject, const String& toCsv,
                            const String& deviceId, int fillPercent,
                            const String& status, const String& timeHHMMSS) {
  if (toCsv.length() == 0) { Serial.println("SMTP: no recipients; skipping"); return false; }


  WiFiClientSecure client;
  client.setTimeout(12000);
  client.setBufferSizes(1024, 1024);
  client.setInsecure(); // pin CA for production


  Serial.printf("Free heap before SMTP: %u bytes\n", ESP.getFreeHeap());
  Serial.printf("SMTP: connecting %s:%u ...\n", SMTP_SERVER, SMTP_PORT);
  if (!client.connect(SMTP_SERVER, SMTP_PORT)) { Serial.println("SMTP: connect() failed"); return false; }


  auto expect = [&](const char* code, uint32_t ms = 12000) -> bool {
    uint32_t deadline = millis() + ms;
    while (millis() < deadline) {
      while (client.available()) {
        String line = client.readStringUntil('\n'); line.trim(); Serial.println("SMTP< " + line);
        if (line.startsWith(code)) return true;
        if (line.length() >= 4 && line.substring(0,3) == code && line[3] == ' ') return true;
        if (line.length() && (line[0] == '4' || line[0] == '5')) return false;
      }
      delay(10); yield();
    }
    return false;
  };
  auto sendln = [&](const String& s) { Serial.println("SMTP> " + s); client.print(s); client.print("\r\n"); };


  if (!expect("220")) return false;
  sendln("EHLO esp8266.local");            if (!expect("250")) return false;
  sendln("AUTH LOGIN");                     if (!expect("334")) return false;
  sendln(base64Encode(String(SMTP_USER)));  if (!expect("334")) return false;
  sendln(base64Encode(String(SMTP_PASS)));  if (!expect("235")) return false;


  sendln("MAIL FROM:<" + String(SMTP_USER) + ">");  if (!expect("250")) return false;


  // RCPT for each address in CSV
  int start = 0; String toLine;
  while (start >= 0) {
    int comma = toCsv.indexOf(',', start);
    String addr = (comma == -1) ? toCsv.substring(start) : toCsv.substring(start, comma);
    addr.trim();
    if (addr.length()) {
      if (toLine.length()) toLine += ", ";
      toLine += addr;
      sendln("RCPT TO:<" + addr + ">"); if (!expect("250")) return false;
    }
    if (comma == -1) break; start = comma + 1;
  }


  sendln("DATA"); if (!expect("354")) return false;


  // Headers
  sendln("From: " + String(SMTP_USER));
  sendln("To: " + toLine);
  sendln("Subject: " + subject);
  sendln("MIME-Version: 1.0");
  sendln("Content-Type: text/html; charset=UTF-8");
  sendln("");


  // Body (compact; no temple name/location, only Device ID)
  client.print(F("<html><body><h2>Smart Dustbin Alert</h2><p>"));
  client.print(F("<b>Device ID:</b> ")); client.print(deviceId);
  client.print(F("<br><b>Fill Level:</b> ")); client.print(fillPercent); client.print(F("%"));
  client.print(F("<br><b>Status:</b> ")); client.print(status);
  client.print(F("<br><b>Time:</b> ")); client.print(timeHHMMSS);
  client.print(F("</p></body></html>"));


  client.print("\r\n.\r\n"); if (!expect("250")) return false;
  sendln("QUIT"); expect("221"); client.stop();
  Serial.println("SMTP: email sent OK"); return true;
}


/* ================== Globals ================== */
unsigned long lastMeasure = 0;
unsigned long lastEmailSent = 0;
unsigned long lastCommandCheck = 0;
bool wasFullLastTime = false;
int  dailyFullCount = 0;
int  dailyEmailCount = 0;


/* ================== Helpers ================== */
String pendingCmdDocId() { return String(DEVICE_ID) + "_pending"; }


float readDistanceOnceCM() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(3);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long duration = pulseIn(PIN_ECHO, HIGH, 25000UL);
  if (duration == 0) return NAN;
  return (float)duration / 58.0f;
}
float medianDistanceCM(uint8_t n) {
  float vals[15]; if (n > 15) n = 15; uint8_t count = 0;
  for (uint8_t i=0;i<n;i++) { float d = readDistanceOnceCM(); if (!isnan(d) && d > 0 && d < 500) vals[count++] = d; delay(40); }
  if (count == 0) return NAN;
  for (uint8_t i=1;i<count;i++){ float key=vals[i]; int j=i-1; while (j>=0 && vals[j]>key){ vals[j+1]=vals[j]; j--; } vals[j+1]=key; }
  if (count % 2) return vals[count/2]; return 0.5f*(vals[count/2 - 1] + vals[count/2]);
}
String statusFromPercent(int pct){ if (pct>=FULL_THRESH) return "FULL"; if (pct>=HALF_THRESH) return "HALF"; return "EMPTY"; }
int clampPct(int p){ if (p<0) return 0; if (p>100) return 100; return p; }


String isoNow() { return FirebaseClient::isoNow(); }
String getClockTimeHHMMSS() {
  time_t now = time(nullptr);
  if (now > 100000) { struct tm *t = localtime(&now); char buf[16];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", t->tm_hour, t->tm_min, t->tm_sec); return String(buf); }
  unsigned long ms = millis(); char buf2[16];
  snprintf(buf2, sizeof(buf2), "%02d:%02d:%02d", (int)((ms/3600000UL)%24), (int)((ms/60000UL)%60), (int)((ms/1000UL)%60));
  return String(buf2);
}


/* ================== Lightweight JSON helpers ================== */
String findStringField(const String& json, const char* field) {
  String needle = String("\"") + field + "\":{\"stringValue\":\"";
  int s = json.indexOf(needle);
  if (s < 0) return "";
  s += needle.length();
  int e = json.indexOf("\"", s);
  if (e < 0 || e <= s) return "";
  return json.substring(s, e);
}
// Parse array of strings: field: { "arrayValue": { "values": [ { "stringValue": "..." }, ... ] } }
bool findArrayOfStrings(const String& json, const char* field, String out[], int maxCount, int &outCount) {
  outCount = 0;
  String head = String("\"") + field + "\":{\"arrayValue\":{\"values\":[";
  int pos = json.indexOf(head);
  if (pos < 0) return false;
  pos += head.length();
  while (outCount < maxCount) {
    int s = json.indexOf("\"stringValue\":\"", pos);
    if (s < 0) break;
    s += 15;
    int e = json.indexOf("\"", s);
    if (e < 0 || e <= s) break;
    out[outCount++] = json.substring(s, e);
    pos = e + 1;
  }
  return outCount > 0;
}


/* ================== Recipients utilities ================== */
void setRecipientsFromCsv(const String& csv) {
  recipientsCount = 0;
  String tmp = csv; tmp.replace(";", ",");
  int start = 0;
  while (recipientsCount < MAX_RECIP) {
    int c = tmp.indexOf(',', start);
    String part = (c == -1) ? tmp.substring(start) : tmp.substring(start, c);
    part.trim();
    if (part.length()) recipients[recipientsCount++] = part;
    if (c == -1) break;
    start = c + 1;
  }
  Serial.printf("Recipients set (CSV): %d\n", recipientsCount);
}
String recipientsCsv() {
  String csv;
  for (int i=0;i<recipientsCount;i++) {
    if (i) csv += ", ";
    csv += recipients[i];
  }
  return csv;
}
bool applyRecipientsFromJson(const String& json) {
  // 1) Array field names
  const char* arrNames[] = {"recipients", "alertEmails", "smtpRecipients"};
  for (int k=0;k<3;k++) {
    String tmp[MAX_RECIP]; int n=0;
    if (findArrayOfStrings(json, arrNames[k], tmp, MAX_RECIP, n) && n>0) {
      recipientsCount = 0;
      for (int i=0;i<n && i<MAX_RECIP;i++) recipients[recipientsCount++] = tmp[i];
      Serial.printf("Recipients from array '%s': %d\n", arrNames[k], recipientsCount);
      return true;
    }
  }
  // 2) CSV field names
  const char* csvNames[] = {"recipientsCsv", "alertEmailsCsv", "smtpRecipientsCsv"};
  for (int k=0;k<3;k++) {
    String csv = findStringField(json, csvNames[k]);
    if (csv.length()) { setRecipientsFromCsv(csv); return true; }
  }
  // 3) Legacy individual fields
  String e1 = findStringField(json, "alertEmail1");
  String e2 = findStringField(json, "alertEmail2");
  String e3 = findStringField(json, "alertEmail3");
  if (e1.length() || e2.length() || e3.length()) {
    recipientsCount = 0;
    if (e1.length()) recipients[recipientsCount++] = e1;
    if (e2.length()) recipients[recipientsCount++] = e2;
    if (e3.length()) recipients[recipientsCount++] = e3;
    Serial.printf("Recipients from legacy 1/2/3: %d\n", recipientsCount);
    return true;
  }
  return false;
}


/* ================== EEPROM helpers ================== */
void eepromWriteString(int addr, const String& s) {
  int len = s.length(); if (len > 63) len = 63;
  EEPROM.write(addr, len);
  for (int i=0;i<len;i++) EEPROM.write(addr+1+i, s[i]);
  EEPROM.write(addr+1+len, '\0');
}
String eepromReadString(int addr) {
  int len = EEPROM.read(addr);
  if (len < 0 || len > 63) return "";
  String s; for (int i=0;i<len;i++) s += char(EEPROM.read(addr+1+i));
  return s;
}
void saveRecipientsToEEPROM() {
  String csv = recipientsCsv();
  eepromWriteString(EE_RECIP_CSV, csv);
  // keep legacy slots for backward compatibility (first three)
  eepromWriteString(EE_EMAIL1, recipientsCount>0 ? recipients[0] : "");
  eepromWriteString(EE_EMAIL2, recipientsCount>1 ? recipients[1] : "");
  eepromWriteString(EE_EMAIL3, recipientsCount>2 ? recipients[2] : "");
}
void saveConfigToEEPROM() {
  eepromWriteString(EE_WIFI_SSID, currentWifiSSID);
  eepromWriteString(EE_WIFI_PASS, currentWifiPass);
  saveRecipientsToEEPROM();
  EEPROM.write(EE_FLAG, 0xA5);
  EEPROM.commit();
  Serial.println("💾 Config saved to EEPROM");
}
void loadConfigFromEEPROM() {
  if (EEPROM.read(EE_FLAG) != 0xA5) {
    Serial.println("EEPROM: no saved config; loading defaults");
    setRecipientsFromCsv(DEFAULT_RECIPIENTS_CSV);
    return;
  }
  String s1 = eepromReadString(EE_WIFI_SSID);
  String s2 = eepromReadString(EE_WIFI_PASS);
  String csv = eepromReadString(EE_RECIP_CSV);
  if (s1.length()) currentWifiSSID = s1;
  if (s2.length()) currentWifiPass = s2;
  if (csv.length()) setRecipientsFromCsv(csv);
  else {
    // legacy fallback
    String e1 = eepromReadString(EE_EMAIL1);
    String e2 = eepromReadString(EE_EMAIL2);
    String e3 = eepromReadString(EE_EMAIL3);
    String legacyCsv;
    if (e1.length()) legacyCsv += e1;
    if (e2.length()) legacyCsv += (legacyCsv.length()? ", ":"") + e2;
    if (e3.length()) legacyCsv += (legacyCsv.length()? ", ":"") + e3;
    if (legacyCsv.length()) setRecipientsFromCsv(legacyCsv);
    else setRecipientsFromCsv(DEFAULT_RECIPIENTS_CSV);
  }
  Serial.printf("EEPROM: WiFi=%s | Recipients=%s\n",
                currentWifiSSID.c_str(), recipientsCsv().c_str());
}


/* ================== Wi-Fi safe switch ================== */
bool wifiScanHasSSID(const String& target) {
  Serial.println("WiFi: scanning for target SSID...");
  int n = WiFi.scanNetworks(false, true);
  if (n <= 0) { Serial.println("WiFi: scan found no networks"); return false; }
  for (int i = 0; i < n; i++) { if (WiFi.SSID(i) == target) { Serial.printf("WiFi: SSID '%s' FOUND\n", target.c_str()); return true; } }
  Serial.printf("WiFi: SSID '%s' NOT found\n", target.c_str());
  return false;
}
bool connectWiFiWithTimeout(const String& ssid, const String& pass, uint32_t timeoutMs) {
  Serial.printf("WiFi: connecting to '%s'...\n", ssid.c_str());
  WiFi.disconnect(true); delay(250);
  WiFi.mode(WIFI_STA); WiFi.setSleep(false);
  WiFi.begin(ssid.c_str(), pass.c_str());
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) { delay(500); Serial.print("."); yield(); }
  if (WiFi.status() == WL_CONNECTED) { Serial.printf("\nWiFi: connected, IP=%s\n", WiFi.localIP().toString().c_str()); return true; }
  Serial.println("\nWiFi: connect timeout/fail"); return false;
}


/* ================== Config/Command processing ================== */
void createDefaultDeviceConfig() {
  Serial.println("📝 Creating default deviceConfig document...");
  String fields = String("{") +
    "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
    "\"wifiSSID\":{\"stringValue\":\"" + currentWifiSSID + "\"}," +
    "\"wifiPassword\":{\"stringValue\":\"" + currentWifiPass + "\"}," +
    "\"recipientsCsv\":{\"stringValue\":\"" + recipientsCsv() + "\"}," +
    "\"templeName\":{\"stringValue\":\"Temple " + String(DEVICE_ID) + "\"}," +
    "\"location\":{\"stringValue\":\"Location for " + String(DEVICE_ID) + "\"}," +
    "\"emptyLevel_cm\":{\"doubleValue\":" + String(EMPTY_LEVEL_CM, 2) + "}," +
    "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}" +
  "}";
 
  String resp;
  int code = fb.createDocument("deviceConfig", String(DEVICE_ID), fields, resp);
  if (code >= 200 && code < 300) {
    Serial.println("✅ Default deviceConfig created successfully");
  } else {
    Serial.printf("❌ Failed to create deviceConfig: %d\n", code);
    Serial.println("Response: " + resp);
  }
}


void fetchConfigFromFirebase() {
  Serial.println("🔄 Fetching configuration from Firebase...");
  String resp;
  int code = fb.getDocument("deviceConfig", String(DEVICE_ID), resp);
 
  if (code == 404) {
    Serial.println("⚠️ No deviceConfig found, creating default...");
    createDefaultDeviceConfig();
    return;
  } else if (code != 200) {
    Serial.printf("❌ Failed to fetch deviceConfig: %d\n", code);
    return;
  }


  bool changed = false, wifiChanged = false;
  Serial.println("📥 Configuration found, parsing updates...");


  // recipients (supports array/csv/legacy)
  if (applyRecipientsFromJson(resp)) {
    saveRecipientsToEEPROM();
    changed = true;
    Serial.println("📧 Email recipients updated from Firebase");
  }


  // Wi-Fi credentials
  String nSSID = findStringField(resp, "wifiSSID");
  String nPASS = findStringField(resp, "wifiPassword");
 
  if (nSSID.length() && nSSID != currentWifiSSID) {
    Serial.printf("📶 WiFi SSID updated: %s -> %s\n", currentWifiSSID.c_str(), nSSID.c_str());
    currentWifiSSID = nSSID;
    changed = true;
    wifiChanged = true;
  }
 
  if (nPASS.length() && nPASS != currentWifiPass) {
    Serial.println("📶 WiFi password updated");
    currentWifiPass = nPASS;
    changed = true;
    wifiChanged = true;
  }


  if (changed) {
    Serial.println("💾 Saving updated configuration to EEPROM...");
    EEPROM.write(EE_FLAG, 0xA5); // ensure flag set
    saveConfigToEEPROM();
   
    if (wifiChanged) {
      Serial.println("🔄 WiFi credentials changed - reconnecting...");
     
      // Disconnect current connection
      WiFi.disconnect();
      delay(1000);
     
      // Try to connect with new credentials
      if (connectWiFiWithTimeout(currentWifiSSID, currentWifiPass, 20000)) {
        Serial.println("✅ WiFi reconnection successful!");
       
        // Update the deviceConfig to confirm the change was applied
        String confirmFields = String("{") +
          "\"wifiSSID\":{\"stringValue\":\"" + currentWifiSSID + "\"}," +
          "\"wifiPassword\":{\"stringValue\":\"" + currentWifiPass + "\"}," +
          "\"lastWifiUpdate\":{\"timestampValue\":\"" + isoNow() + "\"}" +
        "}";
        String confirmResp;
        fb.commitUpdateWithServerTime("deviceConfig", String(DEVICE_ID), confirmFields, "updatedAt", confirmResp);
       
      } else {
        Serial.println("❌ WiFi reconnection failed! Trying to revert...");
        // Try to reconnect with old credentials (stored in EEPROM backup)
        loadConfigFromEEPROM(); // This will load the old credentials
        if (connectWiFiWithTimeout(currentWifiSSID, currentWifiPass, 15000)) {
          Serial.println("✅ Reverted to previous WiFi settings");
        } else {
          Serial.println("❌ Critical: Cannot connect to any WiFi!");
        }
      }
    }
  } else {
    Serial.println("✅ Configuration is up to date - no changes needed");
  }
}


void updateCommandStatus(const String& status, const String& reason) {
  String resp; int code = fb.setCommandStatus(pendingCmdDocId(), status, reason, resp);
  Serial.printf("command status -> %s (%d)\n", status.c_str(), code);
}


void processPendingCommand() {
  String resp; int code = fb.getDocument("deviceCommands", pendingCmdDocId(), resp);
  if (code != 200) { if (code != 404) Serial.printf("command get err: %d\n", code); return; }


  String status = findStringField(resp, "status");
  if (status == "done") return;  // already processed


  String action = findStringField(resp, "command"); // your screenshot uses "command"
  if (action.length() == 0) action = findStringField(resp, "action");


  // recipients first (array/csv/legacy)
  bool recipientsTouched = applyRecipientsFromJson(resp);
  if (recipientsTouched) { saveRecipientsToEEPROM(); }


  // Wi-Fi change?
  String newSSID = findStringField(resp, "wifiSSID");
  String newPASS = findStringField(resp, "wifiPassword");
  bool wantWiFiChange = (newSSID.length() || newPASS.length());


  // actions
  bool wantTestEmail  = (resp.indexOf("test_email") > 0 || action == "test_email");
  bool wantCalib      = (resp.indexOf("calibrate_empty_level") > 0 || action == "calibrate_empty_level");
  bool wantRecipients = (action == "update_email_recipients"); // from your screenshot
  bool wantReboot     = (resp.indexOf("reboot") > 0 || action == "reboot");


  // Safe Wi-Fi migration with immediate feedback
  if (wantWiFiChange) {
    Serial.println("📶 Processing WiFi change command...");
    String oldSSID=currentWifiSSID, oldPASS=currentWifiPass;
    String stagedSSID = newSSID.length() ? newSSID : currentWifiSSID;
    String stagedPASS = newPASS.length() ? newPASS : currentWifiPass;


    Serial.printf("WiFi: Attempting to switch from '%s' to '%s'\n", oldSSID.c_str(), stagedSSID.c_str());
   
    if (!wifiScanHasSSID(stagedSSID)) {
      Serial.println("❌ Target WiFi network not found in scan");
      updateCommandStatus("failed","ssid_not_found");
      return;
    }
   
    if (connectWiFiWithTimeout(stagedSSID, stagedPASS, 20000)) {
      Serial.println("✅ WiFi change successful!");
      currentWifiSSID = stagedSSID;
      currentWifiPass = stagedPASS;
      saveConfigToEEPROM();
     
      // write back to deviceConfig so dashboard mirrors new values
      String fields = String("{") +
        "\"wifiSSID\":{\"stringValue\":\"" + currentWifiSSID + "\"}," +
        "\"wifiPassword\":{\"stringValue\":\"" + currentWifiPass + "\"}," +
        "\"lastWifiUpdate\":{\"timestampValue\":\"" + isoNow() + "\"}" + "}";
      String r2;
      fb.commitUpdateWithServerTime("deviceConfig", String(DEVICE_ID), fields, "updatedAt", r2);
      updateCommandStatus("done", "wifi_updated_successfully");
     
      // Immediately refresh configuration to sync any other changes
      Serial.println("🔄 Refreshing configuration after WiFi update...");
      delay(1000); // Give Firebase a moment to process
      fetchConfigFromFirebase();
     
    } else {
      Serial.println("❌ WiFi change failed, attempting to revert...");
      bool back = connectWiFiWithTimeout(oldSSID, oldPASS, 15000);
      String failReason = back ? "new_wifi_auth_failed" : "revert_failed_critical";
      updateCommandStatus("failed", failReason);
      Serial.printf("WiFi revert %s\n", back ? "successful" : "FAILED!");
      return;
    }
  }


  // Optional quick calibration of EMPTY level
  if (wantCalib) {
    float total=0; int valid=0;
    for (int i=0;i<10;i++){ float d=medianDistanceCM(3); if(!isnan(d)&&d>0){ total+=d; valid++; } delay(80); }
    if (valid) {
      EMPTY_LEVEL_CM = total/valid;
      String fields = String("{") + "\"emptyLevel_cm\":{\"doubleValue\":" + String(EMPTY_LEVEL_CM,2) + "}" + "}";
      String r2; fb.commitUpdateWithServerTime("deviceConfig", String(DEVICE_ID), fields, "updatedAt", r2);
      Serial.printf("CMD: calibrated EMPTY_LEVEL_CM=%.2f\n", EMPTY_LEVEL_CM);
    }
  }


  // Handle email recipient updates
  if (wantRecipients) {
    Serial.println("📧 Processing email recipients update...");
    if (recipientsTouched) {
      Serial.printf("Email recipients updated: %s\n", recipientsCsv().c_str());
     
      // Update deviceConfig to reflect the change
      String fields = String("{") +
        "\"recipientsCsv\":{\"stringValue\":\"" + recipientsCsv() + "\"}," +
        "\"lastEmailUpdate\":{\"timestampValue\":\"" + isoNow() + "\"}" + "}";
      String r2;
      fb.commitUpdateWithServerTime("deviceConfig", String(DEVICE_ID), fields, "updatedAt", r2);
     
      updateCommandStatus("done", "email_recipients_updated");
    } else {
      updateCommandStatus("done", "no_email_changes_found");
    }
  }


  // Handle test email or general email commands
  if (wantTestEmail) {
    Serial.println("📧 Sending test email...");
    String csv = recipientsCsv();
    if (csv.length() > 0) {
      bool ok = gmailSendHTML_streamed(
        "🧪 Test Email - Smart Dustbin " + String(DEVICE_ID), csv,
        String(DEVICE_ID), 95, "FULL", getClockTimeHHMMSS()
      );
      String result = ok ? "test_email_sent_successfully" : "test_email_failed";
      updateCommandStatus("done", result);
      Serial.println(ok ? "✅ Test email sent successfully" : "❌ Test email failed");
    } else {
      updateCommandStatus("failed", "no_email_recipients_configured");
      Serial.println("❌ No email recipients configured");
    }
  }


  // If no specific action was processed, mark as done
  if (!wantWiFiChange && !wantCalib && !wantTestEmail && !wantRecipients && !wantReboot) {
    if (recipientsTouched) {
      updateCommandStatus("done", "configuration_updated");
    } else {
      updateCommandStatus("done", "no_changes_applied");
    }
  }


  if (wantReboot) {
    Serial.println("🔄 Reboot command received - restarting device...");
    updateCommandStatus("done", "rebooting_device");
    delay(1000);
    ESP.restart();
  }
}


/* ================== History log ================== */
void logToHistory(float distance, int fillPct, const String& status) {
  String fields = String("{") +
    "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
    "\"distance_cm\":{\"doubleValue\":" + String(distance, 2) + "}," +
    "\"fill_pct\":{\"doubleValue\":" + String(fillPct) + "}," +
    "\"status\":{\"stringValue\":\"" + status + "\"}," +
    "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}," +
    "\"timestamp\":{\"timestampValue\":\"" + isoNow() + "\"}" + "}";
  String resp; fb.addDocument("binHistory", fields, resp);
}


/* ================== Setup / Loop ================== */
void setup() {
  Serial.begin(115200); Serial.println();
  Serial.printf("Smart Dustbin starting | Device: %s\n", DEVICE_ID);


  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);


  EEPROM.begin(EEPROM_SIZE);
  loadConfigFromEEPROM();


  WiFi.mode(WIFI_STA); WiFi.setSleep(false);
  connectWiFiWithTimeout(currentWifiSSID, currentWifiPass, 20000);


  // NTP time (IST = UTC+5:30)
  configTime(19800, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Syncing time");
  time_t now = time(nullptr); uint32_t t0=millis();
  while (now < 8*3600 && millis()-t0 < 15000) { delay(500); Serial.print("."); now=time(nullptr); }
  Serial.printf("\nTime: %s", ctime(&now));


  // Ensure Firestore doc exists for this device
  String resp; int code = fb.getDocument(COLLECTION, String(DEVICE_ID), resp);
  if (code == 404) {
    String fields = String("{") +
      "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
      "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}" + "}";
    fb.createDocument(COLLECTION, String(DEVICE_ID), fields, resp);
  }


  // Pull initial recipients/wifi from deviceConfig
  fetchConfigFromFirebase();


  Serial.println("System ready.");
}


void loop() {
  unsigned long now = millis();


  // Poll commands + config every 10s (more frequent for better dashboard responsiveness)
  if (now - lastCommandCheck >= 10000) {
    lastCommandCheck = now;
   
    // Check for pending commands first (higher priority)
    processPendingCommand();
   
    // Then check for configuration updates
    fetchConfigFromFirebase();
   
    // Print current status for debugging
    Serial.printf("📊 Status: WiFi=%s | Recipients=%d | Heap=%u\n",
                  WiFi.status() == WL_CONNECTED ? "OK" : "DISCONNECTED",
                  recipientsCount, ESP.getFreeHeap());
  }


  if (now - lastMeasure >= MEASURE_PERIOD_MS) {
    lastMeasure = now;


    float d_cm = medianDistanceCM(NUM_SAMPLES);
    if (isnan(d_cm)) { Serial.println("Ultrasonic read failed."); return; }


    float fill = 100.0f * (1.0f - d_cm / EMPTY_LEVEL_CM);
    int fillPct = clampPct((int)roundf(fill));
    String stat = statusFromPercent(fillPct);
    Serial.printf("Distance: %.2f cm | Fill: %d%% | Status: %s\n", d_cm, fillPct, stat.c_str());


    bool isFullNow = (stat == "FULL");
    bool shouldSendEmail = false;


    if (isFullNow && !wasFullLastTime) {
      dailyFullCount++; shouldSendEmail = true; Serial.println("Bin is now FULL! Alerting...");
    } else if (isFullNow && (now - lastEmailSent) >= EMAIL_COOLDOWN_MS) {
      shouldSendEmail = true; Serial.println("Bin still FULL, reminder email...");
    }


    if (shouldSendEmail && WiFi.status() == WL_CONNECTED) {
      String csv = recipientsCsv();
      bool emailSent = gmailSendHTML_streamed(
        "Smart Dustbin Alert - " + String(DEVICE_ID), csv,
        String(DEVICE_ID), fillPct, stat, getClockTimeHHMMSS()
      );
      if (emailSent) { dailyEmailCount++; lastEmailSent = now; Serial.println("Email sent."); }
      else           { Serial.println("Email failed."); }
    }


    wasFullLastTime = isFullNow;


    // Update bins/{DEVICE_ID}
    String fields = String("{") +
      "\"deviceId\":{\"stringValue\":\"" + String(DEVICE_ID) + "\"}," +
      "\"binDepth_cm\":{\"doubleValue\":" + String(BIN_DEPTH_CM, 2) + "}," +
      "\"distance_cm\":{\"doubleValue\":" + String(d_cm, 2) + "}," +
      "\"fill_pct\":{\"doubleValue\":" + String(fillPct) + "}," +
      "\"status\":{\"stringValue\":\"" + stat + "\"}," +
      "\"dailyFullCount\":{\"doubleValue\":" + String(dailyFullCount) + "}," +
      "\"dailyEmailCount\":{\"doubleValue\":" + String(dailyEmailCount) + "}," +
      "\"emptyLevel_cm\":{\"doubleValue\":" + String(EMPTY_LEVEL_CM, 2) + "}" + "}";
    String resp; int code = fb.commitUpdateWithServerTime(COLLECTION, String(DEVICE_ID), fields, "updatedAt", resp);
    Serial.printf("Firestore update: %d\n", code);
    if (code < 200 || code >= 300) { Serial.println("Firestore update failed:"); Serial.println(resp); }


    static int measureCount = 0;
    if (++measureCount % 5 == 0) { logToHistory(d_cm, fillPct, stat); }
  }


  delay(5);
}




