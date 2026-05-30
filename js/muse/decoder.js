/**
 * Muse S Gen 2 — Packet Decoder (pure functions)
 *
 * Implements decoding of BLE characteristic payloads from the Muse headband
 * into typed arrays of physical units. All functions are pure and side-effect
 * free; they accept a `DataView` (or anything with a compatible API), validate
 * the byte length, and return decoded values.
 *
 * Reference: design.md § 4 (Spesifikasi BLE & Decoding Muse S Gen 2)
 *
 * Validates: Requirements 4.1, 5.1, 7.1, 22.1
 */

/* ─── Constants ─────────────────────────────────────────────────────── */

/** EEG: 5 samples × 10-bit packed big-endian, prefixed with 16-bit seq number. */
export const EEG_PACKET_BYTES = 12;
export const EEG_SAMPLES_PER_PACKET = 5;

/**
 * EEG ADC scale (Muse, 1.2 V reference, 10-bit unsigned, ±0.5 of full-scale).
 * Each LSB ≈ 1.2 V / 1024 / 2.5 (gain) / 1e-6 ≈ 0.48828125 µV (matches existing
 * `eeg-muse.js` implementation; see legacy module for provenance).
 */
export const EEG_LSB_UV = 0.48828125;
export const EEG_OFFSET = 512; // mid-rail of 10-bit unsigned

/** PPG: 6 samples × 16-bit unsigned big-endian + 2-byte seq number = 14 bytes. */
export const PPG_PACKET_BYTES = 14;
export const PPG_SAMPLES_PER_PACKET = 6;

/**
 * IMU: accelerometer or gyroscope packet — 3 samples × 3 axes × 16-bit signed
 * big-endian + 2-byte seq number = 20 bytes. We treat accel and gyro as
 * separate characteristics that share the same packet layout.
 */
export const IMU_PACKET_BYTES = 20;
export const IMU_SAMPLES_PER_PACKET = 3;

/** Battery: 16-bit unsigned big-endian / 512 → percentage. */
export const BATTERY_PACKET_BYTES_MIN = 2;

/** Accelerometer scale: ±2 g over int16 → 1 / 16384 g per LSB. */
export const ACCEL_LSB_G = 1 / 16384;

/** Gyroscope scale: ±2000 dps over int16 → 1 / 16.384 ≈ 0.061 dps per LSB,
 * but Muse uses simpler 1/131 per dps mapping in firmware. We follow design.md. */
export const GYRO_LSB_DPS = 1 / 131;

/* ─── Errors ────────────────────────────────────────────────────────── */

/**
 * Error thrown when a packet has an unexpected byte length. The caller is
 * expected to drop the packet and increment a `malformedPackets` counter
 * (see Requirement 22.1).
 */
export class MalformedPacketError extends Error {
  /**
   * @param {string} packetType - e.g. 'eeg', 'ppg', 'imu', 'battery'
   * @param {number} expected - Expected byte length
   * @param {number} actual - Actual byte length
   */
  constructor(packetType, expected, actual) {
    super(`Malformed Muse ${packetType} packet: expected ${expected} bytes, got ${actual}`);
    this.name = 'MalformedPacketError';
    this.packetType = packetType;
    this.expected = expected;
    this.actual = actual;
  }
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

/**
 * Normalize input into a DataView. Accepts:
 * - DataView (returned as-is)
 * - ArrayBuffer
 * - Uint8Array / typed array view
 *
 * @param {DataView|ArrayBuffer|ArrayBufferView} input
 * @returns {DataView}
 */
function toDataView(input) {
  if (input instanceof DataView) return input;
  if (input instanceof ArrayBuffer) return new DataView(input);
  if (ArrayBuffer.isView(input)) {
    return new DataView(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError('Muse decoder: input must be DataView, ArrayBuffer, or typed array');
}

/* ─── EEG Decoder ───────────────────────────────────────────────────── */

/**
 * Decode a 12-byte Muse EEG packet into 5 microvolt samples for one channel.
 *
 * Byte layout:
 *   [0..1]   uint16 BE — sequence number
 *   [2..11] 5 × 10-bit unsigned, big-endian, packed (no padding)
 *
 * Validates: Requirement 4.1, 22.1
 *
 * @param {DataView|ArrayBuffer|ArrayBufferView} input - Raw 12-byte packet.
 * @returns {{ seq: number, samples: Float32Array }} 5 samples in µV.
 * @throws {MalformedPacketError} If byte length ≠ 12.
 */
export function decodeEegPacket(input) {
  const view = toDataView(input);
  if (view.byteLength !== EEG_PACKET_BYTES) {
    throw new MalformedPacketError('eeg', EEG_PACKET_BYTES, view.byteLength);
  }

  const seq = view.getUint16(0, false /* big-endian */);
  const samples = new Float32Array(EEG_SAMPLES_PER_PACKET);

  // The 5 × 10-bit samples occupy 50 bits, packed across bytes 2..8 (no padding).
  // We read bit-by-bit using a sliding window starting at bit offset (2*8) = 16.
  for (let i = 0; i < EEG_SAMPLES_PER_PACKET; i++) {
    const bitStart = i * 10;
    const byteOff = 2 + (bitStart >>> 3);
    const bitOff = bitStart & 7;
    const hi = view.getUint8(byteOff);
    const lo = view.getUint8(byteOff + 1);
    // Concatenate two adjacent bytes into a 16-bit word, then shift+mask.
    const word = (hi << 8) | lo;
    const raw = (word >>> (6 - bitOff)) & 0x3FF; // 10-bit
    samples[i] = (raw - EEG_OFFSET) * EEG_LSB_UV;
  }

  return { seq, samples };
}

/**
 * Inverse of {@link decodeEegPacket}, useful for property-based testing.
 * Quantizes microvolt samples back to 10-bit codes and packs them into a
 * 12-byte buffer with the same layout.
 *
 * NOTE: Round-trip is approximate — quantization error is bounded by
 * EEG_LSB_UV / 2 ≈ 0.245 µV per sample; tests should assert |Δ| ≤ 0.5 µV.
 *
 * @param {{ seq: number, samples: ArrayLike<number> }} args
 * @returns {DataView}
 */
export function encodeEegPacket({ seq, samples }) {
  if (!samples || samples.length !== EEG_SAMPLES_PER_PACKET) {
    throw new TypeError(`encodeEegPacket: expected ${EEG_SAMPLES_PER_PACKET} samples`);
  }
  const buf = new ArrayBuffer(EEG_PACKET_BYTES);
  const view = new DataView(buf);
  view.setUint16(0, seq & 0xFFFF, false);

  // Stage 1: quantize and clamp samples to 10-bit unsigned codes.
  /** @type {number[]} */
  const codes = new Array(EEG_SAMPLES_PER_PACKET);
  for (let i = 0; i < EEG_SAMPLES_PER_PACKET; i++) {
    let code = Math.round(samples[i] / EEG_LSB_UV) + EEG_OFFSET;
    if (code < 0) code = 0;
    if (code > 0x3FF) code = 0x3FF;
    codes[i] = code;
  }

  // Stage 2: pack 5 × 10-bit codes into bytes 2..8 big-endian, no padding.
  // Use a bit accumulator (up to 16 bits) shifted out into bytes.
  let acc = 0;
  let nBits = 0;
  let outOff = 2;
  for (let i = 0; i < EEG_SAMPLES_PER_PACKET; i++) {
    acc = (acc << 10) | codes[i];
    nBits += 10;
    while (nBits >= 8) {
      const shift = nBits - 8;
      const byte = (acc >>> shift) & 0xFF;
      view.setUint8(outOff++, byte);
      acc &= (1 << shift) - 1;
      nBits = shift;
    }
  }
  if (nBits > 0) {
    // Final 2 bits → high bits of the final byte, padded with 6 zero bits.
    view.setUint8(outOff, (acc << (8 - nBits)) & 0xFF);
  }

  return view;
}

/* ─── PPG Decoder ───────────────────────────────────────────────────── */

/**
 * Decode a 14-byte PPG packet — 6 × 16-bit unsigned samples big-endian
 * after a 16-bit sequence number.
 *
 * Validates: Requirement 5.1, 22.1
 *
 * @param {DataView|ArrayBuffer|ArrayBufferView} input
 * @returns {{ seq: number, samples: Uint16Array }} Raw ADC counts.
 * @throws {MalformedPacketError}
 */
export function decodePpgPacket(input) {
  const view = toDataView(input);
  if (view.byteLength !== PPG_PACKET_BYTES) {
    throw new MalformedPacketError('ppg', PPG_PACKET_BYTES, view.byteLength);
  }
  const seq = view.getUint16(0, false);
  const samples = new Uint16Array(PPG_SAMPLES_PER_PACKET);
  for (let i = 0; i < PPG_SAMPLES_PER_PACKET; i++) {
    samples[i] = view.getUint16(2 + i * 2, false);
  }
  return { seq, samples };
}

/* ─── IMU Decoder ───────────────────────────────────────────────────── */

/**
 * Decode a 20-byte IMU packet (accelerometer or gyroscope) into 3 samples.
 *
 * For the accelerometer characteristic, the returned `samples[i]` is in g.
 * For the gyroscope characteristic, the returned `samples[i]` is in dps.
 * Caller knows which is which based on which characteristic the packet came
 * from.
 *
 * Validates: Requirement 7.1, 22.1
 *
 * @param {DataView|ArrayBuffer|ArrayBufferView} input
 * @param {{ kind: 'accel'|'gyro' }} options
 * @returns {{ seq: number, samples: Array<{x:number,y:number,z:number}> }}
 * @throws {MalformedPacketError}
 */
export function decodeImuPacket(input, options = { kind: 'accel' }) {
  const view = toDataView(input);
  if (view.byteLength !== IMU_PACKET_BYTES) {
    throw new MalformedPacketError(`imu_${options.kind}`, IMU_PACKET_BYTES, view.byteLength);
  }
  const scale = options.kind === 'gyro' ? GYRO_LSB_DPS : ACCEL_LSB_G;
  const seq = view.getUint16(0, false);
  const samples = new Array(IMU_SAMPLES_PER_PACKET);
  for (let i = 0; i < IMU_SAMPLES_PER_PACKET; i++) {
    const o = 2 + i * 6;
    samples[i] = {
      x: view.getInt16(o + 0, false) * scale,
      y: view.getInt16(o + 2, false) * scale,
      z: view.getInt16(o + 4, false) * scale,
    };
  }
  return { seq, samples };
}

/* ─── Battery Decoder ───────────────────────────────────────────────── */

/**
 * Decode the battery characteristic. Muse exposes a 16-bit big-endian value
 * scaled so that `raw / 512` yields a 0..100 percentage.
 *
 * The Muse firmware sometimes pads this packet; we therefore only require
 * at least 2 bytes and silently ignore trailing bytes.
 *
 * Validates: Requirement 22.1
 *
 * @param {DataView|ArrayBuffer|ArrayBufferView} input
 * @returns {number} Battery percentage in [0, 100].
 * @throws {MalformedPacketError} If fewer than 2 bytes are provided.
 */
export function decodeBattery(input) {
  const view = toDataView(input);
  if (view.byteLength < BATTERY_PACKET_BYTES_MIN) {
    throw new MalformedPacketError('battery', BATTERY_PACKET_BYTES_MIN, view.byteLength);
  }
  const raw = view.getUint16(0, false);
  const pct = raw / 512;
  // Clamp defensively — old firmware versions occasionally report >100.
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

/* ─── Default export bundle (also attaches to window for non-module use) ── */

const MuseDecoder = Object.freeze({
  EEG_PACKET_BYTES,
  EEG_SAMPLES_PER_PACKET,
  EEG_LSB_UV,
  EEG_OFFSET,
  PPG_PACKET_BYTES,
  PPG_SAMPLES_PER_PACKET,
  IMU_PACKET_BYTES,
  IMU_SAMPLES_PER_PACKET,
  ACCEL_LSB_G,
  GYRO_LSB_DPS,
  MalformedPacketError,
  decodeEegPacket,
  encodeEegPacket,
  decodePpgPacket,
  decodeImuPacket,
  decodeBattery,
});

if (typeof window !== 'undefined') {
  window.MuseDecoder = MuseDecoder;
}

export default MuseDecoder;
