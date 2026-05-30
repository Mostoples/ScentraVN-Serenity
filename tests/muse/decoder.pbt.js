/**
 * Property-based tests for js/muse/decoder.js (Task 2.3).
 *
 * **Validates: Requirements 4.1, 22.1**
 *
 * Properties:
 *   P1. EEG round-trip within quantization tolerance.
 *       ∀ seq ∈ uint16, ∀ samples (µV) within the 10-bit dynamic range:
 *         decodeEegPacket(encodeEegPacket({seq, samples})) ≈ {seq, samples}
 *       with |Δ_i| ≤ EEG_LSB_UV/2 + ε for all i.
 *   P2. EEG decoder is total on 12-byte buffers (never throws on length 12).
 *   P3. EEG decoder rejects every byte length ≠ 12 with MalformedPacketError.
 *   P4. PPG/IMU/battery decoders reject every wrong byte length similarly.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  decodeEegPacket,
  encodeEegPacket,
  decodePpgPacket,
  decodeImuPacket,
  decodeBattery,
  MalformedPacketError,
  EEG_PACKET_BYTES,
  EEG_SAMPLES_PER_PACKET,
  EEG_LSB_UV,
  EEG_OFFSET,
  PPG_PACKET_BYTES,
  IMU_PACKET_BYTES,
} from '../../js/muse/decoder.js';

/* ─── Arbitraries ─────────────────────────────────────────────────── */

// 10-bit dynamic range: codes 0..1023 → µV ≈ [(0-512)*LSB, (1023-512)*LSB]
const MIN_UV = (0 - EEG_OFFSET) * EEG_LSB_UV;        // ≈ -250.00 µV
const MAX_UV = (1023 - EEG_OFFSET) * EEG_LSB_UV;     // ≈ +249.51 µV

const arbSampleUv = fc.double({
  min: MIN_UV,
  max: MAX_UV,
  noNaN: true,
  noDefaultInfinity: true,
});

const arbEegPayload = fc.record({
  seq: fc.integer({ min: 0, max: 0xFFFF }),
  samples: fc.array(arbSampleUv, { minLength: EEG_SAMPLES_PER_PACKET, maxLength: EEG_SAMPLES_PER_PACKET }),
});

/* ─── P1: EEG round-trip ──────────────────────────────────────────── */

describe('PBT: EEG round-trip', () => {
  it('decodeEegPacket(encodeEegPacket({seq, samples})) ≈ {seq, samples} within ±LSB/2', () => {
    fc.assert(
      fc.property(arbEegPayload, ({ seq, samples }) => {
        const encoded = encodeEegPacket({ seq, samples });
        const decoded = decodeEegPacket(encoded);
        if (decoded.seq !== seq) return false;
        if (decoded.samples.length !== EEG_SAMPLES_PER_PACKET) return false;
        const tol = EEG_LSB_UV / 2 + 1e-6;
        for (let i = 0; i < EEG_SAMPLES_PER_PACKET; i++) {
          if (Math.abs(decoded.samples[i] - samples[i]) > tol) return false;
        }
        return true;
      }),
      { numRuns: 256 }
    );
  });
});

/* ─── P2: total on length 12 ─────────────────────────────────────── */

describe('PBT: EEG decoder is total on 12-byte buffers', () => {
  it('never throws when given a 12-byte buffer of arbitrary content', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: EEG_PACKET_BYTES, maxLength: EEG_PACKET_BYTES }), (bytes) => {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const result = decodeEegPacket(view);
        if (typeof result.seq !== 'number') return false;
        if (result.samples.length !== EEG_SAMPLES_PER_PACKET) return false;
        // All decoded samples must lie within the 10-bit range.
        for (let i = 0; i < EEG_SAMPLES_PER_PACKET; i++) {
          if (result.samples[i] < MIN_UV - 1e-6) return false;
          if (result.samples[i] > MAX_UV + 1e-6) return false;
        }
        return true;
      }),
      { numRuns: 256 }
    );
  });
});

/* ─── P3: EEG decoder rejects wrong length ───────────────────────── */

describe('PBT: EEG decoder rejects wrong byte length', () => {
  it('throws MalformedPacketError for any length ≠ 12', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 64 }).filter((n) => n !== EEG_PACKET_BYTES),
        (len) => {
          const buf = new ArrayBuffer(len);
          let threw = false;
          try {
            decodeEegPacket(buf);
          } catch (e) {
            threw = e instanceof MalformedPacketError;
          }
          return threw;
        }
      ),
      { numRuns: 64 }
    );
  });
});

/* ─── P4: PPG/IMU/battery length validation ──────────────────────── */

describe('PBT: PPG decoder rejects wrong byte length', () => {
  it('throws MalformedPacketError for any length ≠ 14', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 64 }).filter((n) => n !== PPG_PACKET_BYTES),
        (len) => {
          let threw = false;
          try {
            decodePpgPacket(new ArrayBuffer(len));
          } catch (e) {
            threw = e instanceof MalformedPacketError;
          }
          return threw;
        }
      ),
      { numRuns: 64 }
    );
  });
});

describe('PBT: IMU decoder rejects wrong byte length', () => {
  it('throws MalformedPacketError for any length ≠ 20', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 64 }).filter((n) => n !== IMU_PACKET_BYTES),
        (len) => {
          let threw = false;
          try {
            decodeImuPacket(new ArrayBuffer(len));
          } catch (e) {
            threw = e instanceof MalformedPacketError;
          }
          return threw;
        }
      ),
      { numRuns: 64 }
    );
  });
});

describe('PBT: Battery decoder rejects single-byte payloads', () => {
  it('throws MalformedPacketError for length < 2; total for length ≥ 2', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 32 }), (len) => {
        let threwOrTotal;
        try {
          const v = decodeBattery(new ArrayBuffer(len));
          threwOrTotal = len >= 2 && typeof v === 'number' && v >= 0 && v <= 100;
        } catch (e) {
          threwOrTotal = len < 2 && e instanceof MalformedPacketError;
        }
        return threwOrTotal;
      }),
      { numRuns: 64 }
    );
  });
});
