/*******************************************************************************
 * SYNAWATCH - Smart Watch with LVGL UI
 *
 * Hardware:
 * - ESP32-S3
 * - Round Display 240x240 (GC9A01) - configured in TFT_eSPI User_Setup.h
 * - CST816 Touch Controller
 * - BLE for sensor data communication
 *
 * Adjust pin configuration below for your specific hardware
 ******************************************************************************/

#include <Arduino.h>
#include <lvgl.h>
#include <TFT_eSPI.h>
#include <Wire.h>
#include <math.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Include UI files from EEZ Studio
#include "ui/ui.h"
#include "ui/screens.h"

/*******************************************************************************
 * Pin Configuration - ADJUST FOR YOUR HARDWARE
 * Current config: Waveshare ESP32-S3-Touch-LCD-1.28
 ******************************************************************************/
// Display backlight (match TFT_eSPI User_Setup.h)
#define TFT_BL_PIN          40

// Touch I2C pins (Wire - default I2C)
#define TOUCH_SDA           6
#define TOUCH_SCL           7
#define TOUCH_INT           5
#define TOUCH_RST           13

// Sensor I2C pins (Wire1 - second I2C bus)
#define SENSOR_SDA          16
#define SENSOR_SCL          17

// CST816 I2C address
#define CST816_ADDR         0x15

// Sensor I2C addresses
#define MAX30102_ADDR       0x57
#define MLX90614_ADDR       0x5A
#define MPU9250_ADDR        0x68

/*******************************************************************************
 * Display Configuration
 ******************************************************************************/
#define SCREEN_WIDTH        240
#define SCREEN_HEIGHT       240
#define DRAW_BUF_SIZE       (SCREEN_WIDTH * 20)  // Buffer for 20 lines

// Screen Sleep Configuration
#define SCREEN_TIMEOUT      10000  // Screen off after 10 seconds of inactivity (adjustable)

/*******************************************************************************
 * BLE Configuration
 ******************************************************************************/
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcd1234-ab12-cd34-ef56-123456789abc"

/*******************************************************************************
 * CST816 Touch Register Definitions
 ******************************************************************************/
#define CST816_REG_GESTURE      0x01
#define CST816_REG_FINGER_NUM   0x02
#define CST816_REG_XPOS_H       0x03
#define CST816_REG_XPOS_L       0x04
#define CST816_REG_YPOS_H       0x05
#define CST816_REG_YPOS_L       0x06

// Gesture IDs
#define GESTURE_NONE            0x00
#define GESTURE_SWIPE_UP        0x01
#define GESTURE_SWIPE_DOWN      0x02
#define GESTURE_SWIPE_LEFT      0x03
#define GESTURE_SWIPE_RIGHT     0x04
#define GESTURE_SINGLE_CLICK    0x05
#define GESTURE_DOUBLE_CLICK    0x0B
#define GESTURE_LONG_PRESS      0x0C

/*******************************************************************************
 * Global Variables
 ******************************************************************************/
TFT_eSPI tft = TFT_eSPI();

// LVGL buffers
static lv_disp_draw_buf_t draw_buf;
static lv_color_t buf1[DRAW_BUF_SIZE];
static lv_color_t buf2[DRAW_BUF_SIZE];

// Touch state
static bool touch_pressed = false;
static int16_t touch_x = 0;
static int16_t touch_y = 0;
static uint8_t last_gesture = GESTURE_NONE;

// Screen sleep state
static bool screenOn = true;
static unsigned long lastActivityTime = 0;

// BLE variables
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
volatile bool deviceConnected = false;
bool oldDeviceConnected = false;
bool bleEnabled = false;
volatile bool bleStatusChanged = false;  // Flag for UI update

// BLE data transmission
#define BLE_SEND_INTERVAL 500  // Send data every 500ms
static unsigned long lastBLESend = 0;

// UI references (used by screens.c for BLE toggle)
extern "C" {
    lv_obj_t* connectLabel = NULL;
    lv_obj_t* connectButton = NULL;
}

// Current screen tracking for swipe navigation
static int currentScreenIndex = 0;
static const int TOTAL_SCREENS = 5;  // Main, HR/SpO2, Suhu/Ambient, Stress, Activity

// Time variables
static int hours = 19;
static int minutes = 59;
static int seconds = 0;
static unsigned long lastTimeUpdate = 0;

// Sensor data variables
static int heartRate = 0;
static int spO2 = 0;
static float bodyTemp = 0.0;      // Object/body temperature
static float ambientTemp = 0.0;   // Ambient temperature
static float accelX = 0, accelY = 0, accelZ = 0;
static float gyroX = 0, gyroY = 0, gyroZ = 0;
static int stressLevel = 0;
static String activityStatus = "DIAM";
static unsigned long lastSensorRead = 0;
#define SENSOR_READ_INTERVAL 100  // Read sensors every 100ms

// MAX30102 variables for proper HR/SpO2 calculation
#define MAX30102_BUFFER_SIZE 100
static uint32_t irBuffer[MAX30102_BUFFER_SIZE];
static uint32_t redBuffer[MAX30102_BUFFER_SIZE];
static int bufferIndex = 0;
static bool bufferFilled = false;

// Heart Rate calculation variables
static uint32_t lastIrValue = 0;
static uint32_t irDelta = 0;
static bool isPeak = false;
static unsigned long lastPeakTime = 0;
static unsigned long peakIntervals[10];
static int peakIntervalIndex = 0;
static int peakCount = 0;

// SpO2 calculation variables
static float dcRed = 0, dcIr = 0;
static float acRed = 0, acIr = 0;

// Finger detection threshold
#define FINGER_THRESHOLD 50000
static bool fingerDetected = false;

// Smoothing variables for stable display
static int smoothedHR = 0;
static int smoothedSpO2 = 0;
static float smoothedBodyTemp = -999;
static float smoothedAmbientTemp = -999;
static bool tempInitialized = false;

// Activity detection variables
#define ACCEL_BUFFER_SIZE 20
static float accelMagBuffer[ACCEL_BUFFER_SIZE];
static int accelBufferIndex = 0;
static float accelVariance = 0;

// HRV for stress calculation
static int hrHistory[10];
static int hrHistoryIndex = 0;
static int hrVariability = 0;

/*******************************************************************************
 * Sensor I2C Helper Functions (using Wire1)
 ******************************************************************************/
bool sensor_write_reg(uint8_t addr, uint8_t reg, uint8_t value) {
    Wire1.beginTransmission(addr);
    Wire1.write(reg);
    Wire1.write(value);
    return Wire1.endTransmission() == 0;
}

uint8_t sensor_read_reg(uint8_t addr, uint8_t reg) {
    Wire1.beginTransmission(addr);
    Wire1.write(reg);
    Wire1.endTransmission(false);
    Wire1.requestFrom(addr, (uint8_t)1);
    return Wire1.read();
}

bool sensor_read_bytes(uint8_t addr, uint8_t reg, uint8_t *data, uint8_t len) {
    Wire1.beginTransmission(addr);
    Wire1.write(reg);
    if (Wire1.endTransmission(false) != 0) return false;
    Wire1.requestFrom(addr, len);
    for (uint8_t i = 0; i < len && Wire1.available(); i++) {
        data[i] = Wire1.read();
    }
    return true;
}

/*******************************************************************************
 * MAX30102 Functions - Heart Rate & SpO2
 ******************************************************************************/
#define MAX30102_INT_STATUS1    0x00
#define MAX30102_INT_STATUS2    0x01
#define MAX30102_INT_ENABLE1    0x02
#define MAX30102_INT_ENABLE2    0x03
#define MAX30102_FIFO_WR_PTR    0x04
#define MAX30102_FIFO_OVF_CNT   0x05
#define MAX30102_FIFO_RD_PTR    0x06
#define MAX30102_FIFO_DATA      0x07
#define MAX30102_FIFO_CONFIG    0x08
#define MAX30102_MODE_CONFIG    0x09
#define MAX30102_SPO2_CONFIG    0x0A
#define MAX30102_LED1_PA        0x0C
#define MAX30102_LED2_PA        0x0D
#define MAX30102_PILOT_PA       0x10
#define MAX30102_MULTI_LED_1    0x11
#define MAX30102_MULTI_LED_2    0x12
#define MAX30102_TEMP_INT       0x1F
#define MAX30102_TEMP_FRAC      0x20
#define MAX30102_TEMP_CONFIG    0x21
#define MAX30102_REV_ID         0xFE
#define MAX30102_PART_ID        0xFF

bool max30102_init() {
    // Check if MAX30102 is present
    uint8_t partId = sensor_read_reg(MAX30102_ADDR, MAX30102_PART_ID);
    if (partId != 0x15) {
        Serial.printf("MAX30102 not found (ID: 0x%02X)\n", partId);
        return false;
    }

    // Reset
    sensor_write_reg(MAX30102_ADDR, MAX30102_MODE_CONFIG, 0x40);
    delay(100);

    // Configure
    sensor_write_reg(MAX30102_ADDR, MAX30102_INT_ENABLE1, 0xC0);  // Enable interrupts
    sensor_write_reg(MAX30102_ADDR, MAX30102_INT_ENABLE2, 0x00);
    sensor_write_reg(MAX30102_ADDR, MAX30102_FIFO_WR_PTR, 0x00);  // Clear FIFO
    sensor_write_reg(MAX30102_ADDR, MAX30102_FIFO_OVF_CNT, 0x00);
    sensor_write_reg(MAX30102_ADDR, MAX30102_FIFO_RD_PTR, 0x00);
    sensor_write_reg(MAX30102_ADDR, MAX30102_FIFO_CONFIG, 0x4F);  // Sample avg = 4, FIFO rollover
    sensor_write_reg(MAX30102_ADDR, MAX30102_MODE_CONFIG, 0x03);  // SpO2 mode
    sensor_write_reg(MAX30102_ADDR, MAX30102_SPO2_CONFIG, 0x27);  // SPO2_ADC_RGE = 4096nA, sample rate = 100Hz, LED pulse width = 411us
    sensor_write_reg(MAX30102_ADDR, MAX30102_LED1_PA, 0x24);      // LED1 current ~7mA
    sensor_write_reg(MAX30102_ADDR, MAX30102_LED2_PA, 0x24);      // LED2 current ~7mA
    sensor_write_reg(MAX30102_ADDR, MAX30102_PILOT_PA, 0x7F);     // Pilot LED current

    Serial.println("MAX30102 initialized");
    return true;
}

void max30102_read() {
    uint8_t data[6];
    uint32_t ir = 0, red = 0;

    // Read FIFO data (3 bytes RED + 3 bytes IR)
    if (sensor_read_bytes(MAX30102_ADDR, MAX30102_FIFO_DATA, data, 6)) {
        red = ((uint32_t)data[0] << 16) | ((uint32_t)data[1] << 8) | data[2];
        ir = ((uint32_t)data[3] << 16) | ((uint32_t)data[4] << 8) | data[5];
        red &= 0x3FFFF;  // 18-bit data
        ir &= 0x3FFFF;

        // Check finger detection
        fingerDetected = (ir > FINGER_THRESHOLD);

        if (fingerDetected) {
            // Store in buffer for averaging
            irBuffer[bufferIndex] = ir;
            redBuffer[bufferIndex] = red;
            bufferIndex = (bufferIndex + 1) % MAX30102_BUFFER_SIZE;
            if (bufferIndex == 0) bufferFilled = true;

            // Calculate DC components (average)
            uint32_t irSum = 0, redSum = 0;
            int sampleCount = bufferFilled ? MAX30102_BUFFER_SIZE : bufferIndex;
            for (int i = 0; i < sampleCount; i++) {
                irSum += irBuffer[i];
                redSum += redBuffer[i];
            }
            dcIr = (float)irSum / sampleCount;
            dcRed = (float)redSum / sampleCount;

            // Calculate AC components (peak-to-peak variation)
            uint32_t irMax = 0, irMin = UINT32_MAX;
            uint32_t redMax = 0, redMin = UINT32_MAX;
            for (int i = 0; i < sampleCount; i++) {
                if (irBuffer[i] > irMax) irMax = irBuffer[i];
                if (irBuffer[i] < irMin) irMin = irBuffer[i];
                if (redBuffer[i] > redMax) redMax = redBuffer[i];
                if (redBuffer[i] < redMin) redMin = redBuffer[i];
            }
            acIr = (float)(irMax - irMin);
            acRed = (float)(redMax - redMin);

            // Heart Rate Detection using peak detection
            irDelta = (ir > lastIrValue) ? (ir - lastIrValue) : (lastIrValue - ir);

            // Detect peaks (when signal changes from rising to falling)
            static bool wasRising = false;
            bool isRising = (ir > lastIrValue);

            if (wasRising && !isRising && irDelta > 100) {
                // Peak detected
                unsigned long currentTime = millis();
                unsigned long interval = currentTime - lastPeakTime;

                // Valid heart beat interval (300ms to 1500ms = 40-200 BPM)
                if (interval > 300 && interval < 1500 && lastPeakTime > 0) {
                    peakIntervals[peakIntervalIndex] = interval;
                    peakIntervalIndex = (peakIntervalIndex + 1) % 10;
                    peakCount++;

                    // Calculate average HR from intervals
                    if (peakCount >= 3) {
                        unsigned long avgInterval = 0;
                        int validIntervals = min(peakCount, 10);
                        for (int i = 0; i < validIntervals; i++) {
                            avgInterval += peakIntervals[i];
                        }
                        avgInterval /= validIntervals;

                        int calculatedHR = 60000 / avgInterval;

                        // Validate range (40-200 BPM)
                        if (calculatedHR >= 40 && calculatedHR <= 200) {
                            // Smooth the HR value
                            if (smoothedHR == 0) {
                                smoothedHR = calculatedHR;
                            } else {
                                smoothedHR = (smoothedHR * 7 + calculatedHR * 3) / 10;
                            }
                            heartRate = smoothedHR;
                        }
                    }
                }
                lastPeakTime = currentTime;
            }
            wasRising = isRising;
            lastIrValue = ir;

            // SpO2 Calculation using R-value
            if (dcIr > 0 && dcRed > 0 && acIr > 0 && acRed > 0) {
                float R = (acRed / dcRed) / (acIr / dcIr);

                // SpO2 = 110 - 25 * R (empirical formula)
                // More accurate: SpO2 = -45.060 * R * R + 30.354 * R + 94.845
                int calculatedSpO2 = (int)(110.0 - 25.0 * R);

                // Validate range (70-100%)
                if (calculatedSpO2 >= 70 && calculatedSpO2 <= 100) {
                    // Smooth the SpO2 value
                    if (smoothedSpO2 == 0) {
                        smoothedSpO2 = calculatedSpO2;
                    } else {
                        smoothedSpO2 = (smoothedSpO2 * 8 + calculatedSpO2 * 2) / 10;
                    }
                    spO2 = smoothedSpO2;
                }
            }

            // Store HR for HRV calculation
            if (heartRate > 0) {
                hrHistory[hrHistoryIndex] = heartRate;
                hrHistoryIndex = (hrHistoryIndex + 1) % 10;
            }
        } else {
            // No finger detected - reset values gradually
            if (heartRate > 0) heartRate = 0;
            if (spO2 > 0) spO2 = 0;
            smoothedHR = 0;
            smoothedSpO2 = 0;
            peakCount = 0;
            lastPeakTime = 0;
        }
    }
}

/*******************************************************************************
 * MLX90614 Functions - Infrared Temperature
 ******************************************************************************/
#define MLX90614_TA     0x06  // Ambient temperature
#define MLX90614_TOBJ1  0x07  // Object temperature

float mlx90614_read_reg_temp(uint8_t reg) {
    uint8_t data[3];

    Wire1.beginTransmission(MLX90614_ADDR);
    Wire1.write(reg);
    if (Wire1.endTransmission(false) != 0) return -999;

    Wire1.requestFrom(MLX90614_ADDR, (uint8_t)3);
    if (Wire1.available() < 3) return -999;

    data[0] = Wire1.read();  // LSB
    data[1] = Wire1.read();  // MSB
    data[2] = Wire1.read();  // PEC (CRC)

    uint16_t rawTemp = (data[1] << 8) | data[0];
    float temp = (rawTemp * 0.02) - 273.15;  // Convert to Celsius

    return temp;
}

float mlx90614_read_object_temp_smoothed() {
    float rawTemp = mlx90614_read_reg_temp(MLX90614_TOBJ1);

    // Check for read error
    if (rawTemp < -100) {
        // Return last valid value or default
        return (smoothedBodyTemp > -100) ? smoothedBodyTemp : 36.5;
    }

    // Validate range (-40 to 125°C for object)
    if (rawTemp < -40 || rawTemp > 125) {
        return (smoothedBodyTemp > -100) ? smoothedBodyTemp : rawTemp;
    }

    // Apply smoothing filter
    if (!tempInitialized || smoothedBodyTemp < -100) {
        smoothedBodyTemp = rawTemp;
    } else {
        // Exponential moving average (alpha = 0.3)
        smoothedBodyTemp = smoothedBodyTemp * 0.7 + rawTemp * 0.3;
    }

    return smoothedBodyTemp;
}

float mlx90614_read_ambient_temp_smoothed() {
    float rawTemp = mlx90614_read_reg_temp(MLX90614_TA);

    // Check for read error
    if (rawTemp < -100) {
        // Return last valid value or default
        return (smoothedAmbientTemp > -100) ? smoothedAmbientTemp : 25.0;
    }

    // Validate range (-40 to 85°C for ambient)
    if (rawTemp < -40 || rawTemp > 85) {
        return (smoothedAmbientTemp > -100) ? smoothedAmbientTemp : rawTemp;
    }

    // Apply smoothing filter
    if (!tempInitialized || smoothedAmbientTemp < -100) {
        smoothedAmbientTemp = rawTemp;
    } else {
        // Exponential moving average (alpha = 0.3)
        smoothedAmbientTemp = smoothedAmbientTemp * 0.7 + rawTemp * 0.3;
    }

    return smoothedAmbientTemp;
}

// Keep original functions for compatibility
float mlx90614_read_object_temp() {
    return mlx90614_read_object_temp_smoothed();
}

float mlx90614_read_ambient_temp() {
    return mlx90614_read_ambient_temp_smoothed();
}

bool mlx90614_init() {
    // Try to read temperature to verify sensor is present
    float temp = mlx90614_read_reg_temp(MLX90614_TOBJ1);
    Serial.printf("MLX90614 raw object temp: %.2f\n", temp);

    if (temp < -100) {
        Serial.println("MLX90614 not found or read error");
        // Try to scan for device
        Wire1.beginTransmission(MLX90614_ADDR);
        uint8_t error = Wire1.endTransmission();
        Serial.printf("MLX90614 I2C scan result: %d (0=found)\n", error);
        return false;
    }

    // Initialize smoothed values
    smoothedBodyTemp = temp;
    float ambTemp = mlx90614_read_reg_temp(MLX90614_TA);
    Serial.printf("MLX90614 raw ambient temp: %.2f\n", ambTemp);

    if (ambTemp > -100) {
        smoothedAmbientTemp = ambTemp;
    } else {
        smoothedAmbientTemp = 25.0;  // Default value
    }

    tempInitialized = true;
    Serial.printf("MLX90614 initialized (Body: %.1fC, Ambient: %.1fC)\n", smoothedBodyTemp, smoothedAmbientTemp);
    return true;
}

/*******************************************************************************
 * MPU9250 Functions - Accelerometer & Gyroscope
 ******************************************************************************/
#define MPU9250_WHO_AM_I    0x75
#define MPU9250_PWR_MGMT_1  0x6B
#define MPU9250_PWR_MGMT_2  0x6C
#define MPU9250_CONFIG      0x1A
#define MPU9250_GYRO_CONFIG 0x1B
#define MPU9250_ACCEL_CONFIG 0x1C
#define MPU9250_ACCEL_XOUT_H 0x3B
#define MPU9250_GYRO_XOUT_H  0x43

bool mpu9250_init() {
    // Check WHO_AM_I
    uint8_t whoami = sensor_read_reg(MPU9250_ADDR, MPU9250_WHO_AM_I);
    if (whoami != 0x71 && whoami != 0x73) {  // MPU9250 or MPU9255
        Serial.printf("MPU9250 not found (WHO_AM_I: 0x%02X)\n", whoami);
        return false;
    }

    // Wake up
    sensor_write_reg(MPU9250_ADDR, MPU9250_PWR_MGMT_1, 0x00);
    delay(100);

    // Configure
    sensor_write_reg(MPU9250_ADDR, MPU9250_PWR_MGMT_1, 0x01);  // Auto select best clock
    sensor_write_reg(MPU9250_ADDR, MPU9250_CONFIG, 0x03);      // DLPF 41Hz
    sensor_write_reg(MPU9250_ADDR, MPU9250_GYRO_CONFIG, 0x08); // Gyro ±500°/s
    sensor_write_reg(MPU9250_ADDR, MPU9250_ACCEL_CONFIG, 0x08); // Accel ±4g

    Serial.println("MPU9250 initialized");
    return true;
}

void mpu9250_read() {
    uint8_t data[14];

    if (sensor_read_bytes(MPU9250_ADDR, MPU9250_ACCEL_XOUT_H, data, 14)) {
        // Accelerometer (±4g range, 8192 LSB/g)
        int16_t ax = (data[0] << 8) | data[1];
        int16_t ay = (data[2] << 8) | data[3];
        int16_t az = (data[4] << 8) | data[5];

        // Skip temperature (data[6], data[7])

        // Gyroscope (±500°/s range, 65.5 LSB/°/s)
        int16_t gx = (data[8] << 8) | data[9];
        int16_t gy = (data[10] << 8) | data[11];
        int16_t gz = (data[12] << 8) | data[13];

        accelX = ax / 8192.0;
        accelY = ay / 8192.0;
        accelZ = az / 8192.0;

        gyroX = gx / 65.5;
        gyroY = gy / 65.5;
        gyroZ = gz / 65.5;
    }
}

/*******************************************************************************
 * Activity Detection based on accelerometer variance
 ******************************************************************************/
void detectActivity() {
    // Calculate total acceleration magnitude
    float totalAccel = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

    // Store in circular buffer
    accelMagBuffer[accelBufferIndex] = totalAccel;
    accelBufferIndex = (accelBufferIndex + 1) % ACCEL_BUFFER_SIZE;

    // Calculate mean
    float mean = 0;
    for (int i = 0; i < ACCEL_BUFFER_SIZE; i++) {
        mean += accelMagBuffer[i];
    }
    mean /= ACCEL_BUFFER_SIZE;

    // Calculate variance (measures movement intensity)
    accelVariance = 0;
    for (int i = 0; i < ACCEL_BUFFER_SIZE; i++) {
        float diff = accelMagBuffer[i] - mean;
        accelVariance += diff * diff;
    }
    accelVariance /= ACCEL_BUFFER_SIZE;

    // Also consider gyroscope for rotation detection
    float gyroMag = sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);

    // Activity classification based on variance and gyro
    // Variance < 0.01: very still (DIAM)
    // Variance 0.01-0.05: walking (JALAN)
    // Variance 0.05-0.2: running (LARI)
    // Variance > 0.2: very active (AKTIF)

    if (accelVariance < 0.01 && gyroMag < 10) {
        activityStatus = "DIAM";
    } else if (accelVariance < 0.05 || (accelVariance < 0.1 && gyroMag < 30)) {
        activityStatus = "JALAN";
    } else if (accelVariance < 0.2 || gyroMag < 100) {
        activityStatus = "LARI";
    } else {
        activityStatus = "AKTIF";
    }
}

/*******************************************************************************
 * Stress Level Estimation using HRV (Heart Rate Variability)
 ******************************************************************************/
void calculateStress() {
    // Calculate HRV (RMSSD - Root Mean Square of Successive Differences)
    // Using simplified approach with HR values instead of RR intervals
    int validCount = 0;
    float sumSquaredDiff = 0;

    for (int i = 1; i < 10; i++) {
        int prev = hrHistory[(hrHistoryIndex + i - 1) % 10];
        int curr = hrHistory[(hrHistoryIndex + i) % 10];

        if (prev > 0 && curr > 0) {
            int diff = curr - prev;
            sumSquaredDiff += diff * diff;
            validCount++;
        }
    }

    if (validCount > 3) {
        hrVariability = (int)sqrt(sumSquaredDiff / validCount);
    }

    // Stress estimation based on HR and HRV
    // High HR + Low HRV = High Stress
    // Normal HR + High HRV = Low Stress

    int hrScore = 0;
    if (heartRate > 0) {
        if (heartRate < 60) {
            hrScore = 10;       // Resting - very relaxed
        } else if (heartRate < 70) {
            hrScore = 20;       // Calm
        } else if (heartRate < 80) {
            hrScore = 35;       // Normal
        } else if (heartRate < 90) {
            hrScore = 50;       // Slightly elevated
        } else if (heartRate < 100) {
            hrScore = 65;       // Elevated
        } else if (heartRate < 120) {
            hrScore = 80;       // High
        } else {
            hrScore = 95;       // Very high
        }
    }

    // HRV adjustment (higher HRV = lower stress)
    int hrvAdjustment = 0;
    if (hrVariability > 20) {
        hrvAdjustment = -15;  // High HRV - reduce stress score
    } else if (hrVariability > 10) {
        hrvAdjustment = -5;   // Moderate HRV
    } else if (hrVariability < 5 && hrVariability > 0) {
        hrvAdjustment = 10;   // Low HRV - increase stress score
    }

    // Activity adjustment (physical activity causes normal HR elevation)
    int activityAdjustment = 0;
    if (activityStatus == "LARI" || activityStatus == "AKTIF") {
        activityAdjustment = -20;  // Active, so high HR is expected
    } else if (activityStatus == "JALAN") {
        activityAdjustment = -10;
    }

    // Calculate final stress level based on HR and HRV
    if (heartRate > 0 && fingerDetected) {
        stressLevel = hrScore + hrvAdjustment + activityAdjustment;
    } else {
        stressLevel = 0;
    }

    // Clamp to valid range
    if (stressLevel < 0) stressLevel = 0;
    if (stressLevel > 100) stressLevel = 100;
}

/*******************************************************************************
 * Read All Sensors and Update UI
 ******************************************************************************/
void readSensors() {
    if (millis() - lastSensorRead < SENSOR_READ_INTERVAL) return;
    lastSensorRead = millis();

    // Read MAX30102 (Heart Rate & SpO2)
    max30102_read();

    // Read MLX90614 (Object & Ambient Temperature)
    bodyTemp = mlx90614_read_object_temp();
    ambientTemp = mlx90614_read_ambient_temp();

    // Read MPU9250 (Accelerometer & Gyroscope)
    mpu9250_read();

    // Calculate derived values
    detectActivity();
    calculateStress();

    // Update UI labels - Heart Rate
    if (objects.hr_v != NULL) {
        char hrStr[8];
        if (fingerDetected && heartRate > 0) {
            snprintf(hrStr, sizeof(hrStr), "%d", heartRate);
        } else {
            snprintf(hrStr, sizeof(hrStr), "--");
        }
        lv_label_set_text(objects.hr_v, hrStr);
    }

    // Update UI labels - SpO2
    if (objects.sp2o_v != NULL) {
        char spo2Str[8];
        if (fingerDetected && spO2 > 0) {
            snprintf(spo2Str, sizeof(spo2Str), "%d%%", spO2);
        } else {
            snprintf(spo2Str, sizeof(spo2Str), "--%");
        }
        lv_label_set_text(objects.sp2o_v, spo2Str);
    }

    // Update UI labels - Body/Object Temperature
    if (objects.suhu_v != NULL) {
        char tempStr[12];
        // Valid range check (must be > -100 to exclude error value -999)
        if (bodyTemp > -100 && bodyTemp < 150) {
            snprintf(tempStr, sizeof(tempStr), "%.1f", bodyTemp);
        } else {
            snprintf(tempStr, sizeof(tempStr), "--.-");
        }
        lv_label_set_text(objects.suhu_v, tempStr);
    }

    // Update UI labels - Ambient Temperature
    if (objects.amb_v != NULL) {
        char ambStr[12];
        // Valid range check (must be > -100 to exclude error value -999)
        if (ambientTemp > -100 && ambientTemp < 150) {
            snprintf(ambStr, sizeof(ambStr), "%.1f", ambientTemp);
        } else {
            snprintf(ambStr, sizeof(ambStr), "--.-");
        }
        lv_label_set_text(objects.amb_v, ambStr);
    }

    // Update UI labels - Stress Level
    if (objects.stress_v != NULL) {
        // Only update stress if we have valid HR data
        if (fingerDetected && heartRate > 0) {
            lv_arc_set_value(objects.stress_v, stressLevel);
        } else {
            lv_arc_set_value(objects.stress_v, 0);
        }
    }

    // Update UI labels - Activity Status
    if (objects.activity_v != NULL) {
        lv_label_set_text(objects.activity_v, activityStatus.c_str());
    }

    // Debug output every 2 seconds
    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 2000) {
        lastDebug = millis();
        Serial.println("========== SENSOR DATA ==========");
        Serial.printf("HR=%d SpO2=%d%% Body=%.1fC Amb=%.1fC\n",
                      heartRate, spO2, bodyTemp, ambientTemp);
        Serial.printf("Activity=%s Stress=%d%% Finger=%s\n",
                      activityStatus.c_str(), stressLevel,
                      fingerDetected ? "YES" : "NO");
        Serial.println("==================================");
    }
}

/*******************************************************************************
 * Initialize All Sensors
 ******************************************************************************/
void initSensors() {
    // Initialize second I2C bus for sensors
    Wire1.begin(SENSOR_SDA, SENSOR_SCL);
    Wire1.setClock(400000);
    Serial.println("[OK] Sensor I2C bus initialized (GPIO16/17)");

    // Initialize buffers
    for (int i = 0; i < MAX30102_BUFFER_SIZE; i++) {
        irBuffer[i] = 0;
        redBuffer[i] = 0;
    }
    for (int i = 0; i < ACCEL_BUFFER_SIZE; i++) {
        accelMagBuffer[i] = 1.0;  // Initialize to 1g (resting)
    }
    for (int i = 0; i < 10; i++) {
        hrHistory[i] = 0;
        peakIntervals[i] = 0;
    }

    // Initialize each sensor
    if (max30102_init()) {
        Serial.println("[OK] MAX30102 (Heart Rate/SpO2)");
    } else {
        Serial.println("[WARN] MAX30102 not detected");
    }

    if (mlx90614_init()) {
        Serial.println("[OK] MLX90614 (Temperature)");
    } else {
        Serial.println("[WARN] MLX90614 not detected");
    }

    if (mpu9250_init()) {
        Serial.println("[OK] MPU9250 (Accelerometer/Gyro)");
    } else {
        Serial.println("[WARN] MPU9250 not detected");
    }
}

/*******************************************************************************
 * CST816 Touch Functions - Direct I2C Read
 ******************************************************************************/
bool cst816_read_touch(int16_t *x, int16_t *y, uint8_t *gesture) {
    uint8_t data[7];

    Wire.beginTransmission(CST816_ADDR);
    Wire.write(CST816_REG_GESTURE);
    if (Wire.endTransmission() != 0) {
        return false;
    }

    Wire.requestFrom(CST816_ADDR, 6);
    if (Wire.available() < 6) {
        return false;
    }

    data[0] = Wire.read();  // Gesture
    data[1] = Wire.read();  // Finger num
    data[2] = Wire.read();  // X high
    data[3] = Wire.read();  // X low
    data[4] = Wire.read();  // Y high
    data[5] = Wire.read();  // Y low

    *gesture = data[0];
    uint8_t finger_num = data[1];

    if (finger_num > 0) {
        *x = ((data[2] & 0x0F) << 8) | data[3];
        *y = ((data[4] & 0x0F) << 8) | data[5];
        return true;  // Touch detected
    }

    return false;  // No touch
}

bool cst816_init() {
    // Reset touch controller if RST pin is defined
    if (TOUCH_RST >= 0) {
        pinMode(TOUCH_RST, OUTPUT);
        digitalWrite(TOUCH_RST, LOW);
        delay(10);
        digitalWrite(TOUCH_RST, HIGH);
        delay(100);
    }

    // Set interrupt pin
    if (TOUCH_INT >= 0) {
        pinMode(TOUCH_INT, INPUT);
    }

    // Check if CST816 is present on I2C bus
    Wire.beginTransmission(CST816_ADDR);
    uint8_t error = Wire.endTransmission();

    if (error == 0) {
        Serial.printf("CST816 found at address 0x%02X\n", CST816_ADDR);
        return true;
    } else {
        Serial.printf("CST816 NOT found at address 0x%02X (error: %d)\n", CST816_ADDR, error);

        // Scan I2C bus to find touch controller
        Serial.println("Scanning I2C bus for touch controller...");
        for (uint8_t addr = 1; addr < 127; addr++) {
            Wire.beginTransmission(addr);
            if (Wire.endTransmission() == 0) {
                Serial.printf("  Found device at 0x%02X\n", addr);
            }
        }
        return false;
    }
}

/*******************************************************************************
 * Display Flush Callback for LVGL
 ******************************************************************************/
void my_disp_flush(lv_disp_drv_t *disp, const lv_area_t *area, lv_color_t *color_p) {
    uint32_t w = (area->x2 - area->x1 + 1);
    uint32_t h = (area->y2 - area->y1 + 1);

    tft.startWrite();
    tft.setAddrWindow(area->x1, area->y1, w, h);
    tft.pushColors((uint16_t *)&color_p->full, w * h, true);
    tft.endWrite();

    lv_disp_flush_ready(disp);
}

/*******************************************************************************
 * Touch Read Callback for LVGL
 ******************************************************************************/
// Debug: print touch every N ms
static unsigned long lastTouchDebug = 0;

void my_touchpad_read(lv_indev_drv_t *indev_driver, lv_indev_data_t *data) {
    int16_t x, y;
    uint8_t gesture;

    if (cst816_read_touch(&x, &y, &gesture)) {
        touch_pressed = true;
        touch_x = x;
        touch_y = y;
        last_gesture = gesture;

        // Reset activity timer when screen is on and touched
        if (screenOn) {
            resetActivityTimer();
        }

        data->state = LV_INDEV_STATE_PRESSED;
        data->point.x = x;
        data->point.y = y;

    } else {
        // Check for gesture when touch is released
        if (touch_pressed && last_gesture != GESTURE_NONE) {
            handleGesture(last_gesture);
            last_gesture = GESTURE_NONE;
        }

        touch_pressed = false;
        data->state = LV_INDEV_STATE_RELEASED;
        data->point.x = touch_x;
        data->point.y = touch_y;
    }
}

/*******************************************************************************
 * Screen Sleep/Wake Functions
 ******************************************************************************/
void screenWake() {
    if (!screenOn) {
        digitalWrite(TFT_BL_PIN, HIGH);  // Turn on backlight
        screenOn = true;
        lastActivityTime = millis();
        Serial.println("Screen: Wake up");
    }
}

void screenSleep() {
    if (screenOn) {
        digitalWrite(TFT_BL_PIN, LOW);  // Turn off backlight
        screenOn = false;
        Serial.println("Screen: Sleep");
    }
}

void screenToggle() {
    if (screenOn) {
        screenSleep();
    } else {
        screenWake();
    }
}

void resetActivityTimer() {
    lastActivityTime = millis();
}

void checkScreenTimeout() {
    // Only check timeout if screen is on
    if (screenOn && (millis() - lastActivityTime > SCREEN_TIMEOUT)) {
        screenSleep();
    }
}

/*******************************************************************************
 * Gesture Handler for Screen Navigation
 ******************************************************************************/
void handleGesture(uint8_t gesture) {
    // Double click always works (even when screen is off) to toggle screen
    if (gesture == GESTURE_DOUBLE_CLICK) {
        screenToggle();
        return;
    }

    // Other gestures only work when screen is on
    if (!screenOn) {
        return;
    }

    // Reset activity timer for any gesture
    resetActivityTimer();

    switch (gesture) {
        case GESTURE_SWIPE_LEFT:
            // Swipe left - next screen
            if (currentScreenIndex < TOTAL_SCREENS - 1) {
                currentScreenIndex++;
                loadScreen((enum ScreensEnum)(currentScreenIndex + 1));
                Serial.printf("Swipe Left -> Screen %d\n", currentScreenIndex + 1);
            }
            break;

        case GESTURE_SWIPE_RIGHT:
            // Swipe right - previous screen
            if (currentScreenIndex > 0) {
                currentScreenIndex--;
                loadScreen((enum ScreensEnum)(currentScreenIndex + 1));
                Serial.printf("Swipe Right -> Screen %d\n", currentScreenIndex + 1);
            }
            break;

        case GESTURE_SWIPE_UP:
            Serial.println("Gesture: Swipe Up");
            break;

        case GESTURE_SWIPE_DOWN:
            Serial.println("Gesture: Swipe Down");
            break;

        case GESTURE_LONG_PRESS:
            Serial.println("Gesture: Long Press");
            break;

        case GESTURE_SINGLE_CLICK:
            Serial.printf("Gesture: Click at (%d, %d)\n", touch_x, touch_y);
            break;

        default:
            break;
    }
}

/*******************************************************************************
 * BLE Server Callbacks
 * NOTE: Don't call LVGL functions here! Use flag and update UI in main loop
 ******************************************************************************/
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        bleStatusChanged = true;  // Flag for UI update in main loop
        Serial.println("BLE: Device Connected");
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        bleStatusChanged = true;  // Flag for UI update in main loop
        Serial.println("BLE: Device Disconnected");
    }
};

/*******************************************************************************
 * BLE Characteristic Callbacks - Receive sensor data
 ******************************************************************************/
class MyCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String value = pCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.print("BLE Received: ");
            Serial.println(value);
            parseSensorData(value);
        }
    }

    void parseSensorData(String data) {
        int hrPos = data.indexOf("HR:");
        if (hrPos >= 0) {
            int hrEnd = data.indexOf(",", hrPos);
            if (hrEnd < 0) hrEnd = data.length();
            String hrStr = data.substring(hrPos + 3, hrEnd);
            if (objects.hr_v != NULL) {
                lv_label_set_text(objects.hr_v, hrStr.c_str());
            }
        }

        int spo2Pos = data.indexOf("SPO2:");
        if (spo2Pos >= 0) {
            int spo2End = data.indexOf(",", spo2Pos);
            if (spo2End < 0) spo2End = data.length();
            String spo2Str = data.substring(spo2Pos + 5, spo2End);
            spo2Str += "%";
            if (objects.sp2o_v != NULL) {
                lv_label_set_text(objects.sp2o_v, spo2Str.c_str());
            }
        }

        int stressPos = data.indexOf("STRESS:");
        if (stressPos >= 0) {
            int stressEnd = data.indexOf(",", stressPos);
            if (stressEnd < 0) stressEnd = data.length();
            String stressStr = data.substring(stressPos + 7, stressEnd);
            int stressVal = stressStr.toInt();
            if (objects.stress_v != NULL) {
                lv_arc_set_value(objects.stress_v, stressVal);
            }
        }

        int actPos = data.indexOf("ACTIVITY:");
        if (actPos >= 0) {
            String actStr = data.substring(actPos + 9);
            actStr.trim();
            if (objects.activity_v != NULL) {
                lv_label_set_text(objects.activity_v, actStr.c_str());
            }
        }
    }
};

/*******************************************************************************
 * BLE Setup
 ******************************************************************************/
void setupBLE() {
    BLEDevice::init("SYNAWATCH");

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ   |
        BLECharacteristic::PROPERTY_WRITE  |
        BLECharacteristic::PROPERTY_NOTIFY |
        BLECharacteristic::PROPERTY_INDICATE
    );

    pCharacteristic->addDescriptor(new BLE2902());
    pCharacteristic->setCallbacks(new MyCallbacks());

    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);

    Serial.println("BLE: Initialized");
}

void startBLEAdvertising() {
    BLEDevice::startAdvertising();
    bleEnabled = true;
    Serial.println("BLE: Advertising Started");

    if (connectLabel != NULL) {
        lv_label_set_text(connectLabel, "SCANNING...");
    }
}

void stopBLEAdvertising() {
    BLEDevice::stopAdvertising();
    bleEnabled = false;
    Serial.println("BLE: Advertising Stopped");

    if (connectLabel != NULL) {
        lv_label_set_text(connectLabel, "CONNECT");
    }
}

// Called from screens.c when CONNECT button is pressed
extern "C" void toggleBLE() {
    Serial.println("toggleBLE() called!");
    if (deviceConnected) {
        pServer->disconnect(pServer->getConnId());
    } else if (bleEnabled) {
        stopBLEAdvertising();
    } else {
        startBLEAdvertising();
    }
}

/*******************************************************************************
 * Update BLE Status UI (called from main loop, not from BLE callback)
 ******************************************************************************/
void updateBLEStatusUI() {
    if (bleStatusChanged) {
        bleStatusChanged = false;

        if (deviceConnected) {
            if (connectLabel != NULL) {
                lv_label_set_text(connectLabel, "CONNECTED");
            }
            if (connectButton != NULL) {
                lv_obj_set_style_bg_color(connectButton, lv_color_hex(0xff00ff00), LV_PART_MAIN);
            }
        } else {
            if (connectLabel != NULL) {
                lv_label_set_text(connectLabel, "CONNECT");
            }
            if (connectButton != NULL) {
                lv_obj_set_style_bg_color(connectButton, lv_color_hex(0xfff7ff00), LV_PART_MAIN);
            }
        }
    }
}

/*******************************************************************************
 * Send Sensor Data via BLE
 ******************************************************************************/
void sendBLEData() {
    // Only send if connected and interval has passed
    if (!deviceConnected) return;
    if (millis() - lastBLESend < BLE_SEND_INTERVAL) return;
    lastBLESend = millis();

    // Create JSON formatted data string
    // Format: {"hr":75,"spo2":98,"bt":36.5,"at":28.2,"ax":0.10,"ay":0.20,"az":1.00,"gx":0.5,"gy":0.3,"gz":0.1,"stress":30,"act":"DIAM"}

    char jsonData[256];
    snprintf(jsonData, sizeof(jsonData),
        "{\"hr\":%d,\"spo2\":%d,\"bt\":%.1f,\"at\":%.1f,\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,\"gx\":%.1f,\"gy\":%.1f,\"gz\":%.1f,\"stress\":%d,\"act\":\"%s\",\"finger\":%s}",
        heartRate,
        spO2,
        bodyTemp,
        ambientTemp,
        accelX,
        accelY,
        accelZ,
        gyroX,
        gyroY,
        gyroZ,
        stressLevel,
        activityStatus.c_str(),
        fingerDetected ? "true" : "false"
    );

    // Send data via BLE notify
    pCharacteristic->setValue(jsonData);
    pCharacteristic->notify();

    // Debug output
    Serial.print("BLE TX: ");
    Serial.println(jsonData);
}

/*******************************************************************************
 * Time Update Function
 ******************************************************************************/
void updateTime() {
    if (millis() - lastTimeUpdate >= 1000) {
        lastTimeUpdate = millis();
        seconds++;

        if (seconds >= 60) {
            seconds = 0;
            minutes++;
            if (minutes >= 60) {
                minutes = 0;
                hours++;
                if (hours >= 24) {
                    hours = 0;
                }
            }
        }

        if (objects.main != NULL) {
            lv_obj_t* timeLabel = lv_obj_get_child(objects.main, 1);
            if (timeLabel != NULL && lv_obj_check_type(timeLabel, &lv_label_class)) {
                char timeStr[6];
                snprintf(timeStr, sizeof(timeStr), "%02d:%02d", hours, minutes);
                lv_label_set_text(timeLabel, timeStr);
            }
        }
    }
}

/*******************************************************************************
 * Setup
 ******************************************************************************/
void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("\n========================================");
    Serial.println("SYNAWATCH Starting...");
    Serial.println("========================================");

    // Initialize backlight
    pinMode(TFT_BL_PIN, OUTPUT);
    digitalWrite(TFT_BL_PIN, HIGH);
    Serial.println("[OK] Backlight initialized");

    // Initialize display
    tft.begin();
    tft.setRotation(0);
    tft.fillScreen(TFT_BLACK);
    Serial.println("[OK] Display initialized (240x240)");

    // Initialize I2C for touch
    Wire.begin(TOUCH_SDA, TOUCH_SCL);
    Wire.setClock(400000);

    // Initialize CST816 touch
    if (cst816_init()) {
        Serial.println("[OK] Touch controller initialized");
    } else {
        Serial.println("[WARN] Touch controller NOT found!");
    }

    // Initialize sensors (MAX30102, MLX90614, MPU9250)
    initSensors();

    // Initialize LVGL
    lv_init();
    Serial.println("[OK] LVGL initialized");

    // Initialize display buffer (double buffering)
    lv_disp_draw_buf_init(&draw_buf, buf1, buf2, DRAW_BUF_SIZE);

    // Initialize display driver
    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.hor_res = SCREEN_WIDTH;
    disp_drv.ver_res = SCREEN_HEIGHT;
    disp_drv.flush_cb = my_disp_flush;
    disp_drv.draw_buf = &draw_buf;
    lv_disp_drv_register(&disp_drv);
    Serial.println("[OK] LVGL display driver registered");

    // Initialize input device driver (touch)
    static lv_indev_drv_t indev_drv;
    lv_indev_drv_init(&indev_drv);
    indev_drv.type = LV_INDEV_TYPE_POINTER;
    indev_drv.read_cb = my_touchpad_read;
    lv_indev_drv_register(&indev_drv);
    Serial.println("[OK] LVGL input driver registered");

    // Initialize BLE
    setupBLE();
    Serial.println("[OK] BLE initialized");

    // Initialize UI (from EEZ Studio generated files)
    ui_init();
    Serial.println("[OK] UI initialized");

    // Initialize screen sleep timer
    lastActivityTime = millis();
    screenOn = true;

    Serial.println("========================================");
    Serial.println("SYNAWATCH Ready!");
    Serial.println("Swipe left/right to navigate screens");
    Serial.println("Double click to wake/sleep screen");
    Serial.println("Tap CONNECT button for BLE pairing");
    Serial.println("========================================\n");
}

/*******************************************************************************
 * Main Loop
 ******************************************************************************/
void loop() {
    // Handle LVGL tick
    lv_tick_inc(5);

    // Handle LVGL tasks (this will call touch read callback)
    lv_timer_handler();

    // Check screen timeout (auto sleep)
    checkScreenTimeout();

    // Only process UI updates when screen is on
    if (screenOn) {
        // Handle UI tick (from EEZ Studio)
        ui_tick();

        // Update BLE status UI (safe to call LVGL here)
        updateBLEStatusUI();

        // Read sensors and update UI
        readSensors();

        // Update time display
        updateTime();
    }

    // Send sensor data via BLE (if connected) - always active regardless of screen
    sendBLEData();

    // Handle BLE reconnection after disconnect
    if (!deviceConnected && oldDeviceConnected) {
        delay(500);
        if (bleEnabled) {
            startBLEAdvertising();
        }
        oldDeviceConnected = deviceConnected;
    }

    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // Small delay for loop
    delay(5);
}

/*******************************************************************************
 * Helper function to set time manually
 ******************************************************************************/
void setTime(int h, int m, int s) {
    hours = h % 24;
    minutes = m % 60;
    seconds = s % 60;
}
