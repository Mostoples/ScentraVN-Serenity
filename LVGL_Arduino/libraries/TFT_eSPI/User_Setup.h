//                            USER DEFINED SETTINGS
//   Waveshare ESP32-S3-Touch-LCD-1.28 (GC9A01 240x240)
//   Configured for SYNAWATCH Project

#define USER_SETUP_INFO "Waveshare_ESP32S3_GC9A01"

// ##################################################################################
//
// Section 1. Call up the right driver file and any options for it
//
// ##################################################################################

// GC9A01 Driver for round 240x240 display
#define GC9A01_DRIVER

// Display resolution
#define TFT_WIDTH  240
#define TFT_HEIGHT 240

// Color order - uncomment if colors are wrong
// #define TFT_RGB_ORDER TFT_RGB
// #define TFT_RGB_ORDER TFT_BGR

// ##################################################################################
//
// Section 2. Define the pins that are used to interface with the display
//
// ##################################################################################

// Waveshare ESP32-S3-Touch-LCD-1.28 Pin Configuration
#define TFT_MOSI 11  // SDA
#define TFT_SCLK 10  // SCL
#define TFT_CS    9  // Chip select
#define TFT_DC    8  // Data Command
#define TFT_RST  12  // Reset
#define TFT_BL   40  // Backlight (optional, set to -1 if not used)

#define TFT_BACKLIGHT_ON HIGH  // Level to turn ON back-light

// ##################################################################################
//
// Section 3. Define the fonts that are to be used here
//
// ##################################################################################

#define LOAD_GLCD   // Font 1. Original Adafruit 8 pixel font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts

#define SMOOTH_FONT

// ##################################################################################
//
// Section 4. Other options
//
// ##################################################################################

// SPI Frequency - GC9A01 supports up to 80MHz
#define SPI_FREQUENCY  40000000  // 40 MHz (stable)
// #define SPI_FREQUENCY  80000000  // 80 MHz (faster, may be unstable)

#define SPI_READ_FREQUENCY  20000000

// Use HSPI port (ESP32-S3)
// #define USE_HSPI_PORT
