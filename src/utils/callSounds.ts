/**
 * Call sound effects using Web Audio API — zero dependencies, zero cost, works offline.
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// ── Ringtone: pleasant two-tone ring pattern ──
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneGain: GainNode | null = null;

const playRingBurst = (ctx: AudioContext, gain: GainNode) => {
  const now = ctx.currentTime;

  // Two-tone burst (like a phone ring)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 440; // A4
  osc2.frequency.value = 480; // slightly higher

  const burstGain = ctx.createGain();
  burstGain.gain.setValueAtTime(0, now);
  burstGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  burstGain.gain.setValueAtTime(0.3, now + 0.4);
  burstGain.gain.linearRampToValueAtTime(0, now + 0.5);
  // Second ring
  burstGain.gain.linearRampToValueAtTime(0.3, now + 0.7);
  burstGain.gain.setValueAtTime(0.3, now + 1.1);
  burstGain.gain.linearRampToValueAtTime(0, now + 1.2);

  osc1.connect(burstGain);
  osc2.connect(burstGain);
  burstGain.connect(gain);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.3);
  osc2.stop(now + 1.3);
};

export const startRingtone = () => {
  stopRingtone();
  try {
    const ctx = getAudioContext();
    ringtoneGain = ctx.createGain();
    ringtoneGain.gain.value = 1;
    ringtoneGain.connect(ctx.destination);

    // Play immediately then every 3s
    playRingBurst(ctx, ringtoneGain);
    ringtoneInterval = setInterval(() => {
      if (ringtoneGain) playRingBurst(ctx, ringtoneGain);
    }, 3000);
  } catch (e) {
    console.warn('Could not start ringtone:', e);
  }
};

export const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneGain) {
    try { ringtoneGain.disconnect(); } catch { /* ok */ }
    ringtoneGain = null;
  }
};

// ── Dial tone: steady US-style ringing tone (440+480 Hz, 2s on / 4s off) ──
let dialOsc1: OscillatorNode | null = null;
let dialOsc2: OscillatorNode | null = null;
let dialGain: GainNode | null = null;
let dialInterval: ReturnType<typeof setInterval> | null = null;

const playDialBurst = (ctx: AudioContext, gain: GainNode) => {
  const now = ctx.currentTime;
  // 2 second ring burst
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
  gain.gain.setValueAtTime(0.15, now + 1.95);
  gain.gain.linearRampToValueAtTime(0, now + 2.0);
};

export const startDialTone = () => {
  stopDialTone();
  try {
    const ctx = getAudioContext();
    dialGain = ctx.createGain();
    dialGain.gain.value = 0;
    dialGain.connect(ctx.destination);

    dialOsc1 = ctx.createOscillator();
    dialOsc2 = ctx.createOscillator();
    dialOsc1.type = 'sine';
    dialOsc2.type = 'sine';
    dialOsc1.frequency.value = 440;
    dialOsc2.frequency.value = 480;
    dialOsc1.connect(dialGain);
    dialOsc2.connect(dialGain);
    dialOsc1.start();
    dialOsc2.start();

    playDialBurst(ctx, dialGain);
    dialInterval = setInterval(() => {
      if (dialGain) playDialBurst(getAudioContext(), dialGain);
    }, 4000);
  } catch (e) {
    console.warn('Could not start dial tone:', e);
  }
};

export const stopDialTone = () => {
  if (dialInterval) {
    clearInterval(dialInterval);
    dialInterval = null;
  }
  try { dialOsc1?.stop(); } catch { /* ok */ }
  try { dialOsc2?.stop(); } catch { /* ok */ }
  dialOsc1 = null;
  dialOsc2 = null;
  if (dialGain) {
    try { dialGain.disconnect(); } catch { /* ok */ }
    dialGain = null;
  }
};

// ── Short "call ended" beep ──
export const playEndTone = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 480;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* ok */ }
};
