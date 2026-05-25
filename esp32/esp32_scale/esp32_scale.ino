#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <HX711_ADC.h>

// ─── WiFi ─────────────────────────────
const char* WIFI_SSID     = "Scorpion";
const char* WIFI_PASSWORD = "tint_clair1355555";

// ─── Server ───────────────────────────
const char* SERVER_HOST = "10.131.158.82";
const int   SERVER_PORT = 4000;
const char* DEVICE_ID   = "scale-01";

String WEIGHT_URL;

// ─── HX711 ────────────────────────────
#define DOUT_PIN 16
#define SCK_PIN  5

HX711_ADC LoadCell(DOUT_PIN, SCK_PIN);

// Nilai Kalibrasi (2 KG)
float calibrationValue = 226.92;

// ─── Filter ───────────────────────────
#define STABLE_THRESHOLD 0.005   // 5 gram
#define WEIGHT_MIN       0.01

// ─── Timing ───────────────────────────
uint32_t lastSend = 0;
#define SEND_INTERVAL 500

float lastWeight = 0;
float lastSent   = -999;

// ─── WiFi ─────────────────────────────
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.println(WiFi.localIP());
}

// ─── Kirim ke server ──────────────────
bool sendWeight(float w) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(WEIGHT_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"weight\":" + String(w,3) + ",\"device_id\":\"" + DEVICE_ID + "\"}";
  int code = http.POST(body);

  if (code == 200) {
    Serial.printf("[OK] %.3f kg\n", w);
    http.end();
    return true;
  }

  Serial.printf("[ERR] %d\n", code);
  http.end();
  return false;
}

// ─── Baca Berat Stabil ─────────────────
float readWeightStable() {
  static bool newDataReady = false;

  if (LoadCell.update()) newDataReady = true;

  if (newDataReady) {
    float weight = LoadCell.getData();

    // filter noise
    if (weight < WEIGHT_MIN) weight = 0;

    // smoothing
    float smoothed = (lastWeight * 0.7) + (weight * 0.3);

    // tahan kalau perubahan kecil
    if (fabs(smoothed - lastWeight) < STABLE_THRESHOLD) {
      smoothed = lastWeight;
    }

    lastWeight = smoothed;
    newDataReady = false;

    return roundf(smoothed * 1000) / 1000.0;
  }

  return lastWeight;
}

// ─── Setup ────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== TIMBANGAN AI START ===");

  LoadCell.begin();

  unsigned long stabilizingtime = 2000;
  bool _tare = true;

  LoadCell.start(stabilizingtime, _tare);

  if (LoadCell.getTareTimeoutFlag()) {
    Serial.println("HX711 ERROR!");
    while (1);
  }

  LoadCell.setCalFactor(calibrationValue);

  Serial.println("Tare & Kalibrasi siap");

  WEIGHT_URL = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/weight";

  connectWiFi();
}

// ─── Loop ─────────────────────────────
void loop() {

  float weight = readWeightStable() / 1000.0;

  if (millis() - lastSend > SEND_INTERVAL) {
    lastSend = millis();

    Serial.printf("[BERAT] %.3f kg\n", weight);

    if (fabs(weight - lastSent) >= 0.001) {
      if (sendWeight(weight)) {
        lastSent = weight;
      }
    }
  }
}