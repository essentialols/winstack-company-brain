/**
 * Minimal MPEG audio frame walker: strips ID3 tags and Xing/Info/VBRI header frames
 * (so concatenated files report the right length in browsers) and sums frame durations.
 */

const BITRATES: Record<string, number[]> = {
  // version-layer → kbps by index
  'V1L1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  'V1L2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  'V1L3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  'V2L1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  'V2L2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  'V2L3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG1
  2: [22050, 24000, 16000], // MPEG2
  0: [11025, 12000, 8000], // MPEG2.5
};

export interface Mp3Parsed {
  audio: Buffer;
  durationSec: number;
}

function skipId3v2(buf: Buffer): number {
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6]! & 0x7f) << 21) | ((buf[7]! & 0x7f) << 14) | ((buf[8]! & 0x7f) << 7) | (buf[9]! & 0x7f);
    const footer = (buf[5]! & 0x10) !== 0 ? 10 : 0;
    return 10 + size + footer;
  }
  return 0;
}

function isInfoFrame(frame: Buffer): boolean {
  const head = frame.toString('latin1', 0, Math.min(frame.length, 64));
  return head.includes('Xing') || head.includes('Info') || head.includes('VBRI');
}

export function parseMp3(buf: Buffer): Mp3Parsed {
  const frames: Buffer[] = [];
  let duration = 0;
  let i = skipId3v2(buf);
  let end = buf.length;
  if (end >= 128 && buf.toString('latin1', end - 128, end - 125) === 'TAG') end -= 128; // ID3v1
  let first = true;

  while (i + 4 <= end) {
    const b1 = buf[i + 1]!;
    const b2 = buf[i + 2]!;
    if (buf[i] !== 0xff || (b1 & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const ver = (b1 >> 3) & 3; // 0=2.5, 2=2, 3=1
    const layerBits = (b1 >> 1) & 3; // 1=III, 2=II, 3=I
    const brIdx = b2 >> 4;
    const srIdx = (b2 >> 2) & 3;
    const pad = (b2 >> 1) & 1;
    if (ver === 1 || layerBits === 0 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const layer = 4 - layerBits; // 1..3
    const kbps = BITRATES[`${ver === 3 ? 'V1' : 'V2'}L${layer}`]![brIdx]!;
    const sr = SAMPLE_RATES[ver]![srIdx]!;
    const spf = layer === 1 ? 384 : layer === 2 ? 1152 : ver === 3 ? 1152 : 576;
    const len = layer === 1 ? Math.floor((12 * kbps * 1000) / sr + pad) * 4 : Math.floor(((spf / 8) * kbps * 1000) / sr) + pad;
    if (len < 4 || i + len > end) break;
    const frame = buf.subarray(i, i + len);
    if (first && isInfoFrame(frame)) {
      // VBR/Info header frame carries no audio of its own; drop it.
    } else {
      frames.push(frame);
      duration += spf / sr;
    }
    first = false;
    i += len;
  }

  if (frames.length === 0) {
    // Not parseable: keep the raw bytes and estimate at 128 kbps.
    return { audio: buf, durationSec: (buf.length * 8) / 128_000 };
  }
  return { audio: Buffer.concat(frames), durationSec: duration };
}
