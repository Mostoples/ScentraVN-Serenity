/**
 * SYNAWATCH - Stress State Store
 *
 * In-memory state management for stress calculation.
 * Maintains previous stress value and rolling history for analytics.
 *
 * @module StressStore
 * @version 1.0.0
 */

/**
 * Internal state storage
 * @private
 */
const _state = {
    previousStress: 0,
    history: [], // Rolling array of last 60 stress readings
    maxHistorySize: 60
};

/**
 * Get current stress score from sensor data
 *
 * Calls the StressCalculator with previous stress value for smoothing.
 * Automatically updates the internal state with the new result.
 *
 * @param {Object} sensorData - Raw sensor data from ESP32 BLE
 * @returns {Object} Stress calculation result from StressCalculator
 *
 * @example
 * const result = getStress({
 *   hr: 75, spo2: 98, bt: 36.5, at: 25.2,
 *   ax: 0.1, ay: -0.2, az: 9.8,
 *   act: "DIAM", finger: true,
 *   gsrRaw: 1234, gsrBase: 1000, gsrCal: true
 * });
 *
 * console.log(result.stressScore); // e.g., 35
 * console.log(result.stressLevel); // "NORMAL"
 */
function getStress(sensorData) {
    // Call StressCalculator with previous stress for smoothing
    const result = StressCalculator.calculateStress(sensorData, _state.previousStress);

    // Update previous stress for next calculation
    _state.previousStress = result.stressScore;

    // Add to history (rolling buffer)
    _state.history.push({
        score: result.stressScore,
        level: result.stressLevel,
        timestamp: result.calculatedAt,
        components: result.stressComponents
    });

    // Trim history to max size (keep last 60 readings)
    if (_state.history.length > _state.maxHistorySize) {
        _state.history.shift(); // Remove oldest entry
    }

    return result;
}

/**
 * Get rolling history of last N stress readings
 *
 * @param {number} [limit] - Maximum number of readings to return (default: all)
 * @returns {Array<Object>} Array of stress history entries
 *
 * Each entry contains:
 * - score: number (0-100)
 * - level: string ("RILEKS", "NORMAL", etc.)
 * - timestamp: ISO string
 * - components: { hrScore, spo2Score, gsrScore, tempScore }
 *
 * @example
 * const last10 = getStressHistory(10);
 * console.log(last10[0].score); // Most recent stress score
 */
function getStressHistory(limit) {
    if (limit && limit < _state.history.length) {
        return _state.history.slice(-limit); // Return last N entries
    }
    return [..._state.history]; // Return copy of entire history
}

/**
 * Reset stress history and previous stress value
 *
 * Call this when BLE disconnects to clear state for next session.
 *
 * @example
 * // In BLE disconnect handler
 * resetStressHistory();
 */
function resetStressHistory() {
    _state.previousStress = 0;
    _state.history = [];
    console.log('[StressStore] History reset');
}

/**
 * Get current previous stress value
 *
 * Useful for debugging or displaying current baseline.
 *
 * @returns {number} Current previous stress value (0-100)
 */
function getPreviousStress() {
    return _state.previousStress;
}

/**
 * Get stress statistics from history
 *
 * @returns {Object} Statistics object
 * @returns {number} returns.count - Number of readings in history
 * @returns {number} returns.average - Average stress score
 * @returns {number} returns.min - Minimum stress score
 * @returns {number} returns.max - Maximum stress score
 * @returns {number} returns.current - Current stress score
 *
 * @example
 * const stats = getStressStats();
 * console.log(`Average stress: ${stats.average}%`);
 */
function getStressStats() {
    if (_state.history.length === 0) {
        return {
            count: 0,
            average: 0,
            min: 0,
            max: 0,
            current: _state.previousStress
        };
    }

    const scores = _state.history.map(entry => entry.score);
    const sum = scores.reduce((acc, score) => acc + score, 0);

    return {
        count: _state.history.length,
        average: Math.round(sum / scores.length),
        min: Math.min(...scores),
        max: Math.max(...scores),
        current: _state.previousStress
    };
}

// ============================================
// EXPORTS
// ============================================
if (typeof window !== 'undefined') {
    window.StressStore = {
        getStress,
        getStressHistory,
        resetStressHistory,
        getPreviousStress,
        getStressStats
    };
}
