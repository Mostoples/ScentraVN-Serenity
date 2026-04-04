/**
 * SYNAWATCH - Stress Level Calculator
 *
 * Client-side stress calculation based on physiological sensor data.
 * Implements weighted scoring from HR, SpO2, GSR, and skin temperature.
 *
 * @module StressCalculator
 * @version 2.0.0
 */

/**
 * Clamp a value between min and max
 *
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 *
 * @example
 * clamp(150, 0, 100) // returns 100
 * clamp(-10, 0, 100) // returns 0
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Get stress level classification based on score
 *
 * @param {number} stressScore - Stress score (0-100)
 * @returns {string} Stress level label in Indonesian
 *
 * Classification:
 * - 0–25   → "RILEKS"
 * - 26–45  → "NORMAL"
 * - 46–60  → "TEGANG"
 * - 61–75  → "STRESS SEDANG"
 * - 76–90  → "STRESS TINGGI"
 * - 91–100 → "STRESS BERAT"
 */
function getStressLevel(stressScore) {
    if (stressScore <= 25) return "RILEKS";
    if (stressScore <= 45) return "NORMAL";
    if (stressScore <= 60) return "TEGANG";
    if (stressScore <= 75) return "STRESS SEDANG";
    if (stressScore <= 90) return "STRESS TINGGI";
    return "STRESS BERAT";
}

/**
 * Calculate stress level from sensor data
 *
 * @param {Object} sensorData - Raw sensor data from ESP32 BLE
 * @param {number} sensorData.hr - Heart rate (BPM)
 * @param {number} sensorData.spo2 - Oxygen saturation (%)
 * @param {number} sensorData.bt - Body temperature (°C)
 * @param {number} sensorData.at - Ambient temperature (°C)
 * @param {number} sensorData.ax - Accelerometer X-axis
 * @param {number} sensorData.ay - Accelerometer Y-axis
 * @param {number} sensorData.az - Accelerometer Z-axis
 * @param {string} sensorData.act - Activity status ("DIAM", "JALAN", etc.)
 * @param {boolean} sensorData.finger - Finger detection status
 * @param {number} sensorData.gsrRaw - Raw GSR sensor value
 * @param {number} sensorData.gsrBase - GSR baseline calibration value
 * @param {boolean} sensorData.gsrCal - GSR calibration status
 * @param {number} previousStress - Previous stress score for smoothing (0-100)
 *
 * @returns {Object} Stress calculation result
 * @returns {number} returns.stressScore - Final stress score (0-100)
 * @returns {string} returns.stressLevel - Stress level label
 * @returns {Object} returns.stressComponents - Individual component scores
 * @returns {number} returns.stressComponents.hrScore - Heart rate component (0-100)
 * @returns {number} returns.stressComponents.spo2Score - SpO2 component (0-100)
 * @returns {number} returns.stressComponents.gsrScore - GSR component (0-100)
 * @returns {number} returns.stressComponents.tempScore - Temperature component (0-100)
 * @returns {string} returns.calculatedAt - ISO timestamp
 *
 * @example
 * const result = calculateStress({
 *   hr: 75, spo2: 98, bt: 36.5, at: 25.2,
 *   ax: 0.1, ay: -0.2, az: 9.8,
 *   act: "DIAM", finger: true,
 *   gsrRaw: 1234, gsrBase: 1000, gsrCal: true
 * }, 30);
 *
 * console.log(result.stressScore); // e.g., 35
 * console.log(result.stressLevel); // "NORMAL"
 */
function calculateStress(sensorData, previousStress = 0) {
    // ============================================
    // GUARD CONDITION: Finger Detection
    // ============================================
    // If no finger detected, skip calculation and return previous stress unchanged
    if (!sensorData.finger) {
        return {
            stressScore: Math.round(previousStress),
            stressLevel: getStressLevel(Math.round(previousStress)),
            stressComponents: {
                hrScore: 0,
                spo2Score: 0,
                gsrScore: 0,
                tempScore: 0
            },
            calculatedAt: new Date().toISOString(),
            skipped: true,
            reason: "No finger detected"
        };
    }

    // ============================================
    // STEP 1: Activity Factor from IMU
    // ============================================
    const ax = sensorData.ax || 0;
    const ay = sensorData.ay || 0;
    const az = sensorData.az || 0;
    const act = sensorData.act || "DIAM";

    // Calculate IMU magnitude
    const magnitude = Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);

    // Determine activity factor
    let activityFactor = 0.0;
    if (act === "DIAM" && magnitude < 10.2) {
        activityFactor = 0.0;
    } else if (magnitude >= 10.2 && magnitude <= 13) {
        activityFactor = 0.5;
    } else if (magnitude > 13) {
        activityFactor = 1.0;
    }

    // Calculate activity penalty
    const activityPenalty = activityFactor * 20;

    // ============================================
    // STEP 2: HR Score (weight: 0.30)
    // ============================================
    const hr = sensorData.hr || 0;
    const hrScore = clamp((hr - 60) / 50 * 100, 0, 100);

    // ============================================
    // STEP 3: SpO2 Score (weight: 0.15)
    // ============================================
    const spo2 = sensorData.spo2 || 0;
    const spo2Score = clamp((100 - spo2) / 10 * 100, 0, 100);

    // ============================================
    // STEP 4: GSR Score (weight: 0.35)
    // ============================================
    let gsrScore = 0;
    if (sensorData.gsrCal === true) {
        const gsrRaw = sensorData.gsrRaw || 0;
        const gsrBase = sensorData.gsrBase || 0;
        gsrScore = clamp((gsrRaw - gsrBase) / 500 * 100, 0, 100);
    }

    // ============================================
    // STEP 5: Skin Temperature Score (weight: 0.20)
    // ============================================
    const bt = sensorData.bt || 0;
    const at = sensorData.at || 0;
    const tempDelta = bt - at;
    const tempScore = clamp((14 - tempDelta) / 8 * 100, 0, 100);

    // ============================================
    // STEP 6: Weighted Stress Raw
    // ============================================
    const stressRaw =
        (hrScore * 0.30) +
        (gsrScore * 0.35) +
        (tempScore * 0.20) +
        (spo2Score * 0.15);

    // ============================================
    // STEP 7: Activity Correction
    // ============================================
    const stressFinal = clamp(stressRaw - activityPenalty, 0, 100);

    // ============================================
    // STEP 8: Exponential Smoothing
    // ============================================
    const alpha = 0.3;
    const stressSmoothed = (alpha * stressFinal) + ((1 - alpha) * previousStress);
    const stressOutput = Math.round(stressSmoothed);

    // ============================================
    // STEP 9: Stress Level Classification
    // ============================================
    const stressLevel = getStressLevel(stressOutput);

    // ============================================
    // RETURN RESULT
    // ============================================
    return {
        stressScore: stressOutput,
        stressLevel: stressLevel,
        stressComponents: {
            hrScore: Math.round(hrScore),
            spo2Score: Math.round(spo2Score),
            gsrScore: Math.round(gsrScore),
            tempScore: Math.round(tempScore)
        },
        calculatedAt: new Date().toISOString(),
        skipped: false,
        // Debug info (optional)
        debug: {
            magnitude: magnitude.toFixed(2),
            activityFactor,
            activityPenalty,
            stressRaw: stressRaw.toFixed(2),
            stressFinal: stressFinal.toFixed(2),
            stressSmoothed: stressSmoothed.toFixed(2),
            previousStress
        }
    };
}

// ============================================
// EXPORTS
// ============================================
if (typeof window !== 'undefined') {
    window.StressCalculator = {
        calculateStress,
        getStressLevel,
        clamp
    };
}
