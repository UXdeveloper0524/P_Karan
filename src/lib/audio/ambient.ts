import { clamp, smoothstep } from "@/lib/math";

/** A soft A-major chord and a pentatonic chime scale. */
const CHORD_HZ = [110, 164.81, 220, 277.18] as const;
const CHIME_HZ = [440, 523.25, 587.33, 659.25, 783.99, 880] as const;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  const legacy = window as Window & { webkitAudioContext?: AudioContextConstructor };
  return window.AudioContext ?? legacy.webkitAudioContext ?? null;
}

export interface AmbientAudioOptions {
  /** Optional music file. If it loads, it replaces the generated chord. */
  readonly musicSrc?: string;
  readonly onMusicReady?: () => void;
}

/**
 * Generated ambient sound with no audio files needed. The filter opens as the
 * visitor scrolls, so the sound brightens as the story clears up.
 * Create it inside a click handler: browsers block audio before a gesture.
 */
export class AmbientAudio {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly chordGains: GainNode[] = [];
  private readonly oscillators: OscillatorNode[] = [];
  private music: HTMLAudioElement | null = null;
  private musicReady = false;
  private running = false;
  private lastIntensity = -1;

  static isSupported(): boolean {
    return getAudioContextConstructor() !== null;
  }

  constructor(options: AmbientAudioOptions = {}) {
    const Context = getAudioContextConstructor();
    if (!Context) throw new Error("Web Audio is not supported in this browser");

    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 300;
    this.filter.connect(this.master);
    this.master.connect(this.context.destination);

    CHORD_HZ.forEach((hz, i) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = i % 2 ? "triangle" : "sine";
      oscillator.frequency.value = hz;
      oscillator.detune.value = (i - 1.5) * 4;
      const gain = this.context.createGain();
      gain.gain.value = 0.07;
      oscillator.connect(gain);
      gain.connect(this.filter);
      oscillator.start();
      this.oscillators.push(oscillator);
      this.chordGains.push(gain);
    });

    if (options.musicSrc) this.loadMusic(options.musicSrc, options.onMusicReady);
  }

  private loadMusic(src: string, onReady?: () => void): void {
    const music = new Audio(src);
    music.loop = true;
    music.volume = 0;
    music.addEventListener(
      "canplaythrough",
      () => {
        this.musicReady = true;
        this.chordGains.forEach((gain) => {
          gain.gain.value = 0;
        });
        if (this.running) void music.play().catch(() => undefined);
        onReady?.();
      },
      { once: true },
    );
    music.load();
    this.music = music;
  }

  async start(): Promise<void> {
    this.running = true;
    await this.context.resume();
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(0.8, now + 1.2);
    if (this.music && this.musicReady) void this.music.play().catch(() => undefined);
  }

  stop(): void {
    this.running = false;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.6);
    this.music?.pause();
  }

  /** Scroll progress (0 to 1) opens the filter and lifts the music volume. */
  setIntensity(progress: number): void {
    if (Math.abs(progress - this.lastIntensity) < 0.002) return;
    this.lastIntensity = progress;
    const eased = smoothstep(progress);
    this.filter.frequency.setTargetAtTime(250 + eased * 2600, this.context.currentTime, 0.15);
    if (this.music && this.musicReady) {
      this.music.volume = this.running ? clamp(0.25 + eased * 0.55) : 0;
    }
  }

  /** A short bell tone, used when a new stop or project is reached. */
  chime(step: number): void {
    if (!this.running) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = CHIME_HZ[step % CHIME_HZ.length] ?? 440;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 1.7);
  }

  dispose(): void {
    this.oscillators.forEach((oscillator) => oscillator.stop());
    this.music?.pause();
    this.music = null;
    void this.context.close();
  }
}
