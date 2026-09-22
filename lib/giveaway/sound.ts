let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  return audioContext;
}

function beep(frequency: number, durationMs: number, gainValue = 0.05) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + durationMs / 1000,
  );
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

export function playTick() {
  beep(720, 60, 0.03);
}

export function playChime() {
  beep(880, 140, 0.06);
  setTimeout(() => beep(1320, 220, 0.05), 90);
}
