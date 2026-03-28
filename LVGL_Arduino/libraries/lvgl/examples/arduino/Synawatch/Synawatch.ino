/*
 * SYNAWATCH - LVGL Watch UI
 * Waveshare ESP32-S3-Touch-LCD-1.28
 * Display: GC9A01 240x240
 * Touch: CST816S
 *
 * Desain dibuat dengan EEZ Studio
 */

#include <lvgl.h>
#include <TFT_eSPI.h>
#include <Wire.h>
#include "ui/ui.h"

// ============== PIN DEFINITIONS ==============
// Touch CST816S pins for Waveshare ESP32-S3-Touch-LCD-1.28
#define TOUCH_SDA   6
#define TOUCH_SCL   7
#define TOUCH_INT   5
#define TOUCH_RST   13

// CST816S I2C Address
#define CST816S_ADDR 0x15

// ============== DISPLAY SETTINGS ==============
static const uint16_t screenWidth  = 240;
static const uint16_t screenHeight = 240;

static lv_disp_draw_buf_t draw_buf;
static lv_color_t buf[screenWidth * 10];

TFT_eSPI tft = TFT_eSPI(screenWidth, screenHeight);

// ============== I2C READ HELPER ==============
uint8_t i2c_read(uint8_t addr, uint8_t reg, uint8_t *data, uint8_t len) {
    Wire.beginTransmission(addr);
    Wire.write(reg);
    if (Wire.endTransmission() != 0) {
        return 1;
    }
    Wire.requestFrom(addr, len);
    for (uint8_t i = 0; i < len; i++) {
        if (Wire.available()) {
            data[i] = Wire.read();
        }
    }
    return 0;
}

// ============== TOUCH INIT ==============
void touch_init() {
    Wire.begin(TOUCH_SDA, TOUCH_SCL);
    pinMode(TOUCH_RST, OUTPUT);
    digitalWrite(TOUCH_RST, LOW);
    delay(10);
    digitalWrite(TOUCH_RST, HIGH);
    delay(50);
    pinMode(TOUCH_INT, INPUT);
    Serial.println("Touch CST816S initialized");
}

// ============== TOUCH READ ==============
bool touch_read(int *x, int *y) {
    uint8_t data[4];
    if (i2c_read(CST816S_ADDR, 0x03, data, 4) != 0) {
        return false;
    }
    uint8_t touchPoints = data[0] & 0x0F;
    if (touchPoints == 0) {
        return false;
    }
    *x = ((data[1] & 0x0F) << 8) | data[2];
    *y = ((data[3] & 0x0F) << 8);
    uint8_t yLow;
    if (i2c_read(CST816S_ADDR, 0x06, &yLow, 1) == 0) {
        *y |= yLow;
    }
    return true;
}

// ============== LVGL DISPLAY FLUSH ==============
void my_disp_flush(lv_disp_drv_t *disp_drv, const lv_area_t *area, lv_color_t *color_p) {
    uint32_t w = (area->x2 - area->x1 + 1);
    uint32_t h = (area->y2 - area->y1 + 1);
    tft.startWrite();
    tft.setAddrWindow(area->x1, area->y1, w, h);
    tft.pushColors((uint16_t *)&color_p->full, w * h, true);
    tft.endWrite();
    lv_disp_flush_ready(disp_drv);
}

// ============== LVGL TOUCHPAD READ ==============
void my_touchpad_read(lv_indev_drv_t *indev_drv, lv_indev_data_t *data) {
    int x, y;
    if (touch_read(&x, &y)) {
        data->state = LV_INDEV_STATE_PR;
        data->point.x = x;
        data->point.y = y;
    } else {
        data->state = LV_INDEV_STATE_REL;
    }
}

// ============== SETUP ==============
void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("\n=== SYNAWATCH ===");

    lv_init();

    tft.begin();
    tft.setRotation(0);
    tft.fillScreen(TFT_BLACK);

    touch_init();

    lv_disp_draw_buf_init(&draw_buf, buf, NULL, screenWidth * 10);

    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.hor_res = screenWidth;
    disp_drv.ver_res = screenHeight;
    disp_drv.flush_cb = my_disp_flush;
    disp_drv.draw_buf = &draw_buf;
    lv_disp_drv_register(&disp_drv);

    static lv_indev_drv_t indev_drv;
    lv_indev_drv_init(&indev_drv);
    indev_drv.type = LV_INDEV_TYPE_POINTER;
    indev_drv.read_cb = my_touchpad_read;
    lv_indev_drv_register(&indev_drv);

    ui_init();
    Serial.println("=== SYNAWATCH Ready! ===");
}

// ============== LOOP ==============
void loop() {
    lv_timer_handler();
    ui_tick();
    delay(5);
}
