/**
 * Unit tests for js/muse/decoder.js (Task 2.2).
 *
 * Validates: Requirements 4.1, 5.1, 7.1, 22.1
 */

import { describe, it, expect } from 'vitest';
import {
  decodeEegPacket,
  encodeEegPacket,
  decodePpgPacket,
  decodeImuPacket,
  decodeBattery,
  MalformedPacketError,
  EEG_LSB_UV,
  EEG_OFFSET,
  EEG_PACKET_BYTES,
  PPG_PACKET_BYTES,
  IMU_PACKET_BYTES,
  ACCEL_LSB_G,
  GYRO_LSB_DPS,
} from '../../js/muse/decoder.js';

/* ─── EEG ─────────────────────────────────────────────────────────── */

describe('decodeEegPacket', () => {
  it('decodes the all-zero packet to 5 samples at the negative rail', () => {
    // 5 codes of 0 → (0 - 512) * 0.488... = ≈ -250 µV
    const buf = new ArrayBuffer(EEG_PACKET_BYTES);
    const view = new DataView(buf);
    view.setUint16(0, 42, false); // seq
    // bytes 2..11 already zero
    const result = decodeEegPacket(view);
    expect(result.seq).toBe(42);
    expect(result.samples.length).toBe(5);
    const expected = (0 - EEG_OFFSET) * EEG_LSB_UV;
    for (const s of result.samples) {
      expect(s).toBeCloseTo(expected, 5);
    }
  });

  it('decodes the all-ones (max code) packet to 5 samples at the positive rail', () => {
    // Pack 5 × 10-bit codes of 0x3FF.
    const codes = [0x3FF, 0x3FF, 0x3FF, 0x3FF, 0x3FF];
    const view = encodeEegPacket({ seq: 1, samples: codes.map((c) => (c - EEG_OFFSET) * EEG_LSB_UV) });
    const result = decodeEegPacket(view);
    const expected = (0x3FF - EEG_OFFSET) * EEG_LSB_UV;
    for (const s of result.samples) {
      expect(s).toBeCloseTo(expected, 5);
    }
  });

  it('round-trips known mid-range samples within ±0.5 µV (10-bit quantization)', () => {
    // Stay within the 10-bit dynamic range: codes 0..1023 → ±249.51 µV.
    const samples = [-200, -10, 0, 25, 100]; // µV — all well inside the rails
    const encoded = encodeEegPacket({ seq: 7, samples });
    const decoded = decodeEegPacket(encoded);
    expect(decoded.seq).toBe(7);
    for (let i = 0; i < 5; i++) {
      // round-trip error ≤ LSB/2 + numerical epsilon
      expect(Math.abs(decoded.samples[i] - samples[i])).toBeLessThanOrEqual(EEG_LSB_UV / 2 + 1e-6);
    }
  });

  it('throws MalformedPacketError on wrong byte length', () => {
    const tooShort = new ArrayBuffer(EEG_PACKET_BYTES - 1);
    const tooLong = new ArrayBuffer(EEG_PACKET_BYTES + 1);
    expect(() => decodeEegPacket(tooShort)).toThrow(MalformedPacketError);
    expect(() => decodeEegPacket(tooLong)).toThrow(MalformedPacketError);

    try {
      decodeEegPacket(tooShort);
    } catch (e) {
      expect(e.packetType).toBe('eeg');
      expect(e.expected).toBe(EEG_PACKET_BYTES);
      expect(e.actual).toBe(EEG_PACKET_BYTES - 1);
    }
  });

  it('accepts ArrayBuffer and Uint8Array inputs equivalently', () => {
    const buf = new ArrayBuffer(EEG_PACKET_BYTES);
    new DataView(buf).setUint16(0, 99, false);
    const fromBuffer = decodeEegPacket(buf);
    const fromU8 = decodeEegPacket(new Uint8Array(buf));
    expect(fromBuffer.seq).toBe(99);
    expect(fromU8.seq).toBe(99);
  });
});

/* ─── PPG ─────────────────────────────────────────────────────────── */

describe('decodePpgPacket', () => {
  it('decodes 6 × 16-bit big-endian samples after the seq number', () => {
    const buf = new ArrayBuffer(PPG_PACKET_BYTES);
    const view = new DataView(buf);
    view.setUint16(0, 12345, false);
    const expected = [100, 200, 300, 65535, 0, 12345];
    for (let i = 0; i < 6; i++) {
      view.setUint16(2 + i * 2, expected[i], false);
    }
    const result = decodePpgPacket(view);
    expect(result.seq).toBe(12345);
    expect(Array.from(result.samples)).toEqual(expected);
  });

  it('throws MalformedPacketError on wrong byte length', () => {
    expect(() => decodePpgPacket(new ArrayBuffer(PPG_PACKET_BYTES - 1))).toThrow(MalformedPacketError);
    expect(() => decodePpgPacket(new ArrayBuffer(PPG_PACKET_BYTES + 1))).toThrow(MalformedPacketError);
  });
});

/* ─── IMU ─────────────────────────────────────────────────────────── */

describe('decodeImuPacket (accel)', () => {
  it('decodes 3 samples × 3 axes scaled to g', () => {
    const buf = new ArrayBuffer(IMU_PACKET_BYTES);
    const view = new DataView(buf);
    view.setUint16(0, 5, false);
    // Sample 0: (16384, 0, 0) → (1g, 0, 0)
    view.setInt16(2 + 0, 16384, false);
    view.setInt16(2 + 2, 0, false);
    view.setInt16(2 + 4, 0, false);
    // Sample 1: (0, -16384, 0) → (0, -1g, 0)
    view.setInt16(8 + 0, 0, false);
    view.setInt16(8 + 2, -16384, false);
    view.setInt16(8 + 4, 0, false);
    // Sample 2: (0, 0, 8192) → (0, 0, 0.5g)
    view.setInt16(14 + 0, 0, false);
    view.setInt16(14 + 2, 0, false);
    view.setInt16(14 + 4, 8192, false);

    const { seq, samples } = decodeImuPacket(view, { kind: 'accel' });
    expect(seq).toBe(5);
    expect(samples.length).toBe(3);
    expect(samples[0].x).toBeCloseTo(1, 6);
    expect(samples[0].y).toBeCloseTo(0, 6);
    expect(samples[0].z).toBeCloseTo(0, 6);
    expect(samples[1].y).toBeCloseTo(-1, 6);
    expect(samples[2].z).toBeCloseTo(0.5, 6);
  });

  it('throws MalformedPacketError on wrong byte length', () => {
    expect(() => decodeImuPacket(new ArrayBuffer(IMU_PACKET_BYTES - 1))).toThrow(MalformedPacketError);
  });
});

describe('decodeImuPacket (gyro)', () => {
  it('decodes gyroscope packet using GYRO_LSB_DPS scale', () => {
    const buf = new ArrayBuffer(IMU_PACKET_BYTES);
    const view = new DataView(buf);
    view.setUint16(0, 9, false);
    // Sample 0: (131, 0, 0) → ≈ (1 dps, 0, 0)
    view.setInt16(2 + 0, 131, false);
    const { seq, samples } = decodeImuPacket(view, { kind: 'gyro' });
    expect(seq).toBe(9);
    expect(samples[0].x).toBeCloseTo(1, 4);
  });
});

describe('IMU scale constants', () => {
  it('ACCEL_LSB_G is exactly 1/16384', () => {
    expect(ACCEL_LSB_G).toBeCloseTo(1 / 16384, 12);
  });
  it('GYRO_LSB_DPS is exactly 1/131', () => {
    expect(GYRO_LSB_DPS).toBeCloseTo(1 / 131, 12);
  });
});

/* ─── Battery ─────────────────────────────────────────────────────── */

describe('decodeBattery', () => {
  it('decodes raw=51200 → 100% (Muse fully charged)', () => {
    const view = new DataView(new ArrayBuffer(2));
    view.setUint16(0, 51200, false);
    expect(decodeBattery(view)).toBe(100);
  });

  it('decodes raw=25600 → 50%', () => {
    const view = new DataView(new ArrayBuffer(2));
    view.setUint16(0, 25600, false);
    expect(decodeBattery(view)).toBe(50);
  });

  it('clamps overflow values to 100', () => {
    const view = new DataView(new ArrayBuffer(2));
    view.setUint16(0, 65535, false);
    expect(decodeBattery(view)).toBe(100);
  });

  it('decodes raw=0 → 0%', () => {
    const view = new DataView(new ArrayBuffer(2));
    expect(decodeBattery(view)).toBe(0);
  });

  it('throws MalformedPacketError when fewer than 2 bytes', () => {
    expect(() => decodeBattery(new ArrayBuffer(1))).toThrow(MalformedPacketError);
  });

  it('accepts longer buffers (firmware sometimes pads)', () => {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setUint16(0, 25600, false);
    expect(decodeBattery(buf)).toBe(50);
  });
});
