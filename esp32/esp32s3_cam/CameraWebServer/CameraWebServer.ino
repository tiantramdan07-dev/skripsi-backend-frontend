/**
 * ============================================================
 * ESP32-S3 CAM — Frame Push to Flask Server (Production v2.0)
 * PT Interskala Mandiri Indonesia
 *
 * Tugas: Kirim frame JPEG ke backend untuk inferensi YOLO.
 *        Berat ditangani oleh ESP32 NodeMCU-32S (terpisah).
 *
 * Hardware:
 *   - ESP32-S3 WROOM-1 dengan kamera OV2640/OV5640
 *   - Atau modul ESP32-S3-CAM, XIAO ESP32-S3 Sense
 *
 * Pin Map (sesuaikan dengan board Anda):
 *   Board: "ESP32S3 Dev Module" di Arduino IDE
 *   Flash: Quad Flash (QIO)
 *   PSRAM: OPI PSRAM (jika ada — disarankan untuk kualitas frame)
 *   Upload Speed: 115200
 *
 * Library:
 *   - ESP32 board package v2.0.x (Arduino ESP32)
 *   - base64 (by Densaugeo / Arduino Library Manager)
 *
 * Cara upload:
 *   1. Tahan tombol BOOT, tekan RESET, lepas keduanya
 *   2. Upload dari Arduino IDE
 *   3. Tekan RESET setelah selesai
 * ============================================================
 */

#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <base64.h>

// ─── PILIH MODEL BOARD ────────────────────────────────────────
// Uncomment salah satu sesuai hardware Anda:

// == XIAO ESP32-S3 Sense ==
// #define CAMERA_MODEL_XIAO_ESP32S3

// == AI-Thinker ESP32-CAM (ESP32, bukan S3) ==
// #define CAMERA_MODEL_AI_THINKER

// == Generic ESP32-S3 dengan OV2640 (default) ==
#define CAMERA_MODEL_ESP32S3_EYE

// ─── Pin Map berdasarkan model ────────────────────────────────
#if defined(CAMERA_MODEL_XIAO_ESP32S3)
  #define PWDN_GPIO_NUM   -1
  #define RESET_GPIO_NUM  -1
  #define XCLK_GPIO_NUM   10
  #define SIOD_GPIO_NUM   40
  #define SIOC_GPIO_NUM   39
  #define Y9_GPIO_NUM     48
  #define Y8_GPIO_NUM     11
  #define Y7_GPIO_NUM     12
  #define Y6_GPIO_NUM     14
  #define Y5_GPIO_NUM     16
  #define Y4_GPIO_NUM     18
  #define Y3_GPIO_NUM     17
  #define Y2_GPIO_NUM     15
  #define VSYNC_GPIO_NUM  38
  #define HREF_GPIO_NUM   47
  #define PCLK_GPIO_NUM   13

#elif defined(CAMERA_MODEL_AI_THINKER)
  #define PWDN_GPIO_NUM   32
  #define RESET_GPIO_NUM  -1
  #define XCLK_GPIO_NUM    0
  #define SIOD_GPIO_NUM   26
  #define SIOC_GPIO_NUM   27
  #define Y9_GPIO_NUM     35
  #define Y8_GPIO_NUM     34
  #define Y7_GPIO_NUM     39
  #define Y6_GPIO_NUM     36
  #define Y5_GPIO_NUM     21
  #define Y4_GPIO_NUM     19
  #define Y3_GPIO_NUM     18
  #define Y2_GPIO_NUM      5
  #define VSYNC_GPIO_NUM  25
  #define HREF_GPIO_NUM   23
  #define PCLK_GPIO_NUM   22

#else // ESP32S3 Eye / Generic S3
  #define PWDN_GPIO_NUM   -1
  #define RESET_GPIO_NUM  -1
  #define XCLK_GPIO_NUM   15
  #define SIOD_GPIO_NUM    4
  #define SIOC_GPIO_NUM    5
  #define Y9_GPIO_NUM     16
  #define Y8_GPIO_NUM     17
  #define Y7_GPIO_NUM     18
  #define Y6_GPIO_NUM     12
  #define Y5_GPIO_NUM     10
  #define Y4_GPIO_NUM      8
  #define Y3_GPIO_NUM      9
  #define Y2_GPIO_NUM     11
  #define VSYNC_GPIO_NUM   6
  #define HREF_GPIO_NUM    7
  #define PCLK_GPIO_NUM   13
#endif

// ─── WiFi Config ─────────────────────────────────────────────
const char* WIFI_SSID     = "Scorpion";          
const char* WIFI_PASSWORD = "tint_clair1355555"; 

// ─── Server Config ────────────────────────────────────────────
const char* SERVER_HOST = "10.131.158.82";
const int   SERVER_PORT = 4000;
const char* CLIENT_ID   = "esp32-cam-01";  

String FRAME_URL;  // dibangun di setup()

// ─── Timing Config ────────────────────────────────────────────
const uint32_t FRAME_INTERVAL_MS = 500;    // 2fps — cukup untuk YOLO inference
const uint32_t WIFI_CHECK_MS     = 10000;
const uint32_t WIFI_TIMEOUT_MS   = 15000;
const uint32_t HTTP_TIMEOUT_MS   = 5000;

// ─── State ────────────────────────────────────────────────────
uint32_t lastFrameMs   = 0;
uint32_t lastWifiCheck = 0;
uint32_t lastBlinkMs   = 0;
uint32_t framesSent    = 0;
bool     ledState      = false;

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

// ─── Init Kamera ─────────────────────────────────────────────
bool initCamera() {
  camera_config_t config;
  config.ledc_channel  = LEDC_CHANNEL_0;
  config.ledc_timer    = LEDC_TIMER_0;
  config.pin_d0        = Y2_GPIO_NUM;
  config.pin_d1        = Y3_GPIO_NUM;
  config.pin_d2        = Y4_GPIO_NUM;
  config.pin_d3        = Y5_GPIO_NUM;
  config.pin_d4        = Y6_GPIO_NUM;
  config.pin_d5        = Y7_GPIO_NUM;
  config.pin_d6        = Y8_GPIO_NUM;
  config.pin_d7        = Y9_GPIO_NUM;
  config.pin_xclk      = XCLK_GPIO_NUM;
  config.pin_pclk      = PCLK_GPIO_NUM;
  config.pin_vsync     = VSYNC_GPIO_NUM;
  config.pin_href      = HREF_GPIO_NUM;
  config.pin_sccb_sda  = SIOD_GPIO_NUM;
  config.pin_sccb_scl  = SIOC_GPIO_NUM;
  config.pin_pwdn      = PWDN_GPIO_NUM;
  config.pin_reset     = RESET_GPIO_NUM;
  config.xclk_freq_hz  = 20000000;

  bool hasPSRAM = psramFound();
  Serial.printf("[CAM] PSRAM: %s\n", hasPSRAM ? "ADA ✅" : "TIDAK ADA ⚠️");

  if (hasPSRAM) {
    config.frame_size   = FRAMESIZE_QVGA;  // 320×240 — optimal untuk YOLO
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode    = CAMERA_GRAB_LATEST;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    config.jpeg_quality = 12;              // 10=best, 63=worst
    config.fb_count     = 2;              // double buffer
  } else {
    config.frame_size   = FRAMESIZE_QVGA;
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location  = CAMERA_FB_IN_DRAM;
    config.jpeg_quality = 20;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] ❌ Init gagal: 0x%x\n", err);
    return false;
  }

  // Tweak sensor
  sensor_t* s = esp_camera_sensor_get();
  if (s != nullptr) {
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_sharpness(s, 0);
    s->set_gainceiling(s, (gainceiling_t)2);
    s->set_colorbar(s, 0);
    s->set_whitebal(s, 1);      // auto white balance
    s->set_gain_ctrl(s, 1);     // auto gain
    s->set_exposure_ctrl(s, 1); // auto exposure
    s->set_hmirror(s, 0);
    s->set_vflip(s, 0);
    // Uncomment jika gambar terbalik:
    // s->set_vflip(s, 1);
    // s->set_hmirror(s, 1);
  }

  Serial.println("[CAM] ✅ Kamera siap!");
  return true;
}

// ─── Konek WiFi ──────────────────────────────────────────────
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Menghubungkan ke '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // matikan power save → latency lebih rendah
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_TIMEOUT_MS) {
      Serial.println("\n[WiFi] ❌ Timeout! Restart...");
      delay(3000);
      ESP.restart();
    }
    delay(300);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] ✅ IP: %s | RSSI: %d dBm\n",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

// ─── Kirim Frame ─────────────────────────────────────────────
void sendFrame() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb || fb->len == 0) {
    Serial.println("[CAM] ⚠️  Gagal capture / frame kosong");
    if (fb) esp_camera_fb_return(fb);
    return;
  }

  Serial.printf("[CAM] Frame: %u bytes → base64 encode...\n", fb->len);

  String b64 = base64::encode(fb->buf, fb->len);
  esp_camera_fb_return(fb);  // kembalikan buffer sesegera mungkin

  if (b64.isEmpty()) {
    Serial.println("[CAM] ❌ base64 encode gagal!");
    return;
  }

  // Susun JSON body
  String body;
  body.reserve(b64.length() + 64);
  body  = "{\"frame\":\"";
  body += b64;
  body += "\",\"client_id\":\"";
  body += CLIENT_ID;
  body += "\"}";

  HTTPClient http;
  http.begin(FRAME_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  int code = http.POST(body);

  if (code == 200) {
    framesSent++;
    String resp = http.getString();
    Serial.printf("[OK] Frame #%lu → HTTP 200 | %s\n",
                  framesSent, resp.substring(0, 60).c_str());
  } else if (code == 429) {
    // Rate limited — normal jika kirim terlalu cepat, skip saja
  } else if (code < 0) {
    Serial.printf("[CAM] ❌ HTTP error: %s\n", http.errorToString(code).c_str());
  } else {
    Serial.printf("[CAM] ⚠️  Server: %d\n", code);
  }

  http.end();
  body = String();  // bebaskan memori
}

// ─── Setup ────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n╔════════════════════════════════╗");
  Serial.println("║  ESP32-S3 CAM Push Mode v2.0   ║");
  Serial.println("║  PT Interskala Mandiri Ind     ║");
  Serial.println("║  [Kamera only — no weight]     ║");
  Serial.println("╚════════════════════════════════╝");

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Init kamera
  if (!initCamera()) {
    Serial.println("HALT: Kamera gagal init!");
    while (true) {
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      delay(200);
    }
  }

  // URL EndPoint
  FRAME_URL = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/esp32_frame";
  Serial.printf("[CFG] Frame URL : %s\n", FRAME_URL.c_str());
  Serial.printf("[CFG] Client ID : %s\n", CLIENT_ID);
  Serial.printf("[CFG] Interval  : %dms (~%d fps)\n",
                FRAME_INTERVAL_MS, 1000 / FRAME_INTERVAL_MS);

  // Konek WiFi
  connectWiFi();

  // Warm-up: buang beberapa frame pertama (sensor stabilisasi)
  Serial.println("[CAM] Warm-up...");
  for (int i = 0; i < 3; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) esp_camera_fb_return(fb);
    delay(150);
  }

  Serial.println("[READY] Mulai kirim frame ke server!");
}

// ─── Loop ─────────────────────────────────────────────────────
void loop() {
  uint32_t now = millis();

  // WiFi health check setiap 10 detik
  if (now - lastWifiCheck >= WIFI_CHECK_MS) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Putus, reconnect...");
      connectWiFi();
    } else {
      Serial.printf("[WiFi] OK | RSSI: %d dBm | Total frame: %lu\n",
                    WiFi.RSSI(), framesSent);
    }
  }

  // Kirim frame setiap FRAME_INTERVAL_MS
  if (now - lastFrameMs >= FRAME_INTERVAL_MS) {
    lastFrameMs = now;
    if (WiFi.status() == WL_CONNECTED) {
      sendFrame();
    }
  }

  // Heartbeat LED — lambat (2s) = connected, cepat (200ms) = disconnected
  uint32_t blinkRate = (WiFi.status() == WL_CONNECTED) ? 2000 : 200;
  if (now - lastBlinkMs >= blinkRate) {
    lastBlinkMs = now;
    ledState    = !ledState;
    digitalWrite(LED_BUILTIN, ledState);
  }

  delay(10);  // yield untuk WiFi stack
}
