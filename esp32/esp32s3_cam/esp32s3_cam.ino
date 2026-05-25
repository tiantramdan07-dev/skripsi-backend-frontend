/**
 * ============================================================
 * ESP32-S3 CAM — Frame Sender untuk YOLO Detection
 * Menangkap gambar dari kamera dan POST ke /api/detect_frame
 *
 * Board: ESP32-S3 (mis. XIAO ESP32S3 Sense, atau board lain)
 * Library:
 *   - ESP32 Camera Driver (bawaan ESP32 Arduino core)
 *   - WiFi (built-in)
 *   - HTTPClient (built-in)
 *   - ArduinoJson by Benoit Blanchon
 *   - Base64 by Arturo Guadalupi (atau implementasi manual di bawah)
 *
 * Konfigurasi Board (Tools > Board): "ESP32S3 Dev Module"
 * PSRAM: Enabled (OPI PSRAM)
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include "base64.hpp"   // library base64 — install "Base64" by Densaugeo atau gunakan encode manual

// ─── WiFi & Server ────────────────────────────────────
const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* SERVER_URL    = "http://192.168.10.214:4000/api/detect_frame";
const char* BEARER_TOKEN  = "ISI_TOKEN_JWT_DI_SINI";  // token dari login
const char* CLIENT_ID     = "esp32s3-cam-01";

// ─── Interval pengiriman frame (ms) ───────────────────
// Lebih cepat = lebih responsif, tapi lebih berat server
#define FRAME_INTERVAL_MS 200  // kirim 5 fps

// ─── Pin Kamera (XIAO ESP32S3 Sense) ─────────────────
// Ubah sesuai board Anda
#define PWDN_GPIO_NUM    -1
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM    10
#define SIOD_GPIO_NUM    40
#define SIOC_GPIO_NUM    39
#define Y9_GPIO_NUM      48
#define Y8_GPIO_NUM      11
#define Y7_GPIO_NUM      12
#define Y6_GPIO_NUM      14
#define Y5_GPIO_NUM      16
#define Y4_GPIO_NUM      18
#define Y3_GPIO_NUM      17
#define Y2_GPIO_NUM      15
#define VSYNC_GPIO_NUM   38
#define HREF_GPIO_NUM    47
#define PCLK_GPIO_NUM    13

// ─── State ────────────────────────────────────────────
uint32_t lastFrameMs = 0;
String   lastLabel   = "";

// ─── Base64 Encode Manual (jika tidak punya library) ──
// Jika sudah install library Base64, hapus fungsi ini dan
// gunakan: base64::encode((uint8_t*)buf, len)
static const char B64CHARS[] =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

String base64Encode(const uint8_t* data, size_t len) {
  String out = "";
  out.reserve(((len + 2) / 3) * 4 + 1);
  for (size_t i = 0; i < len; i += 3) {
    uint8_t b0 = data[i];
    uint8_t b1 = (i+1 < len) ? data[i+1] : 0;
    uint8_t b2 = (i+2 < len) ? data[i+2] : 0;
    out += B64CHARS[(b0 >> 2) & 0x3F];
    out += B64CHARS[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0F)];
    out += (i+1 < len) ? B64CHARS[((b1 & 0x0F) << 2) | ((b2 >> 6) & 0x03)] : '=';
    out += (i+2 < len) ? B64CHARS[b2 & 0x3F] : '=';
  }
  return out;
}

// ─── Init Kamera ──────────────────────────────────────
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;  // butuh JPEG untuk kirim ke server

  // Ukuran frame — lebih kecil = lebih cepat kirim
  // QVGA (320x240) bagus untuk realtime
  // VGA (640x480) lebih akurat tapi lebih lambat
  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 12;   // 0=terbaik, 63=terburuk
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size   = FRAMESIZE_QVGA;
    config.jpeg_quality = 20;
    config.fb_count     = 1;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init gagal: 0x%x\n", err);
    return false;
  }

  // Tuning kualitas sensor
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);   // -2 to 2
    s->set_saturation(s, 0);   // -2 to 2
    s->set_contrast(s, 1);     // -2 to 2
    s->set_sharpness(s, 1);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_exposure_ctrl(s, 1);
    s->set_aec2(s, 1);
    s->set_hmirror(s, 0);      // 1 = mirror horizontal
    s->set_vflip(s, 0);        // 1 = flip vertikal
  }

  Serial.println("[CAM] Kamera berhasil diinisialisasi");
  return true;
}

// ─── Kirim Frame ke Backend ───────────────────────────
void sendFrame() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CAM] Gagal ambil frame!");
    return;
  }

  // Encode ke base64
  String b64 = base64Encode(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  // Build JSON body
  // Format: { "frame": "data:image/jpeg;base64,...", "client_id": "..." }
  String body = "{\"frame\":\"data:image/jpeg;base64,";
  body += b64;
  body += "\",\"client_id\":\"";
  body += CLIENT_ID;
  body += "\"}";

  // HTTP POST
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + BEARER_TOKEN);
  http.setTimeout(5000);  // 5 detik timeout

  int code = http.POST(body);

  if (code == 200) {
    String resp = http.getString();
    // Parse deteksi dari response
    // Format: { "detection": "jeruk", "weight": 0.123, ... }
    int di = resp.indexOf("\"detection\":\"");
    if (di >= 0) {
      int start = di + 13;
      int end   = resp.indexOf("\"", start);
      if (end > start) {
        lastLabel = resp.substring(start, end);
        Serial.printf("[DETECT] %s\n", lastLabel.c_str());
      }
    }
  } else if (code == 429) {
    // Rate limited — normal, skip
  } else {
    Serial.printf("[HTTP] Error code: %d\n", code);
  }

  http.end();
}

// ─── WiFi Connect ─────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Menghubungkan ke %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Gagal! Restart...");
    ESP.restart();
  }
}

// ─── Setup & Loop ─────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== ESP32-S3 CAM — Timbangan Digital AI ===");

  if (!initCamera()) {
    Serial.println("[CAM] Kamera gagal! Cek koneksi.");
    while(1) delay(1000);
  }

  connectWiFi();

  Serial.printf("[READY] Kirim frame ke %s setiap %d ms\n",
    SERVER_URL, FRAME_INTERVAL_MS);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Putus, reconnect...");
    connectWiFi();
    return;
  }

  uint32_t now = millis();
  if (now - lastFrameMs >= FRAME_INTERVAL_MS) {
    lastFrameMs = now;
    sendFrame();
  }
}
