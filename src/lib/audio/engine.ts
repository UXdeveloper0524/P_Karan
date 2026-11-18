import { clamp } from "@/lib/math";

/* The engine: a few oscillators through a soft clipper and a low-pass filter, plus
   filtered noise for intake and wind. No audio files are needed. Revs follow the
   car's speed through a small five-gear model. */

const MASTER_LEVEL = 0.7;
const IDLE_RPM = 900;
const REDLINE_RPM = 6400;
/** Top speed of each gear, in road units per second. */
const GEAR_TOP_SPEED = [3.2, 6, 9.5, 14, 20] as const;
const MAX_SPEED = GEAR_TOP_SPEED[GEAR_TOP_SPEED.length - 1] ?? 20;

const CHIME_HZ = [440, 523.25, 587.33, 659.25, 783.99, 880] as const;

/** A four-cylinder fires twice per turn, so the base note is rpm / 30. */
const rpmToHz = (rpm: number): number => rpm / 30;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  const legacy = window as Window & { webkitAudioContext?: AudioContextConstructor };
  return window.AudioContext ?? legacy.webkitAudioContext ?? null;
}

function createSoftClipCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
}

export interface EngineAudioOptions {
  /** Optional music file that plays under the engine. */
  readonly musicSrc?: string;
  readonly onMusicReady?: () => void;
}

/**
 * Create it inside a click handler: browsers block audio before a gesture.
 */
export class EngineAudio {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly engineAmp: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly wind: GainNode;
  private readonly noise: AudioBuffer;
  private readonly oscillators: OscillatorNode[] = [];
  private readonly pitched: { node: OscillatorNode; ratio: number }[] = [];
  private music: HTMLAudioElement | null = null;
  private musicReady = false;

  private muted = false;
  private igniting = false;
  private rpm = 0;
  private gear = 0;
  private speed = 0;
  private lastLoudness = -1;

  static isSupported(): boolean {
    return getAudioContextConstructor() !== null;
  }

  constructor(options: EngineAudioOptions = {}) {
    const Context = getAudioContextConstructor();
    if (!Context) throw new Error("Web Audio is not supported in this browser");
    const context = new Context();
    this.context = context;

    this.master = context.createGain();
    this.master.gain.value = MASTER_LEVEL;
    this.master.connect(context.destination);

    // Engine voice: three oscillators, soft-clipped, filtered, then shaped by an amplitude gain.
    const mix = context.createGain();
    mix.gain.value = 0.5;
    const shaper = context.createWaveShaper();
    shaper.curve = createSoftClipCurve(2.2);
    this.filter = context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 1.1;
    this.engineAmp = context.createGain();
    this.engineAmp.gain.value = 0;
    mix.connect(shaper);
    shaper.connect(this.filter);
    this.filter.connect(this.engineAmp);
    this.engineAmp.connect(this.master);

    const voices: readonly { type: OscillatorType; ratio: number; level: number; detune: number }[] = [
      { type: "sawtooth", ratio: 1, level: 0.9, detune: 0 },
      { type: "sawtooth", ratio: 2, level: 0.35, detune: 9 },
      { type: "square", ratio: 0.5, level: 0.5, detune: -4 },
    ];
    for (const voice of voices) {
      const node = context.createOscillator();
      node.type = voice.type;
      node.detune.value = voice.detune;
      node.frequency.value = rpmToHz(IDLE_RPM) * voice.ratio;
      const level = context.createGain();
      level.gain.value = voice.level;
      node.connect(level);
      level.connect(mix);
      node.start();
      this.oscillators.push(node);
      this.pitched.push({ node, ratio: voice.ratio });
    }

    // Wind and road: looped noise, brighter and louder with speed.
    this.noise = this.createNoise(2);
    this.wind = context.createGain();
    this.wind.gain.value = 0;
    const windFilter = context.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 900;
    this.loopNoise().connect(windFilter);
    windFilter.connect(this.wind);
    this.wind.connect(this.master);

    this.setRpm(IDLE_RPM, 0.01);
    if (options.musicSrc) this.loadMusic(options.musicSrc, options.onMusicReady);
  }

  private createNoise(seconds: number): AudioBuffer {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private loopNoise(): AudioBufferSourceNode {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    source.start();
    return source;
  }

  private loadMusic(src: string, onReady?: () => void): void {
    const music = new Audio(src);
    music.loop = true;
    music.volume = 0;
    music.addEventListener(
      "canplaythrough",
      () => {
        this.musicReady = true;
        music.volume = this.muted ? 0 : 0.3;
        void music.play().catch(() => undefined);
        onReady?.();
      },
      { once: true },
    );
    music.load();
    this.music = music;
  }

  /** Point every voice at an engine speed. */
  private setRpm(rpm: number, timeConstant: number): void {
    const now = this.context.currentTime;
    this.rpm = rpm;
    for (const { node, ratio } of this.pitched) {
      node.frequency.setTargetAtTime(rpmToHz(rpm) * ratio, now, timeConstant);
    }
    this.filter.frequency.setTargetAtTime(260 + rpm * 0.55, now, timeConstant);
  }

  /** Ramp every voice to an engine speed by a given time; used for the start-up script. */
  private rampRpm(rpm: number, at: number): void {
    for (const { node, ratio } of this.pitched) {
      node.frequency.linearRampToValueAtTime(rpmToHz(rpm) * ratio, at);
    }
    this.filter.frequency.linearRampToValueAtTime(260 + rpm * 0.55, at);
  }

  private holdRpm(rpm: number, at: number): void {
    for (const { node, ratio } of this.pitched) node.frequency.setValueAtTime(rpmToHz(rpm) * ratio, at);
    this.filter.frequency.setValueAtTime(260 + rpm * 0.55, at);
  }

  private burst(at: number, duration: number, frequency: number, level: number): void {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const band = this.context.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = frequency;
    band.Q.value = 1.4;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(band);
    band.connect(gain);
    gain.connect(this.master);
    source.start(at);
    source.stop(at + duration + 0.05);
  }

  private tone(at: number, duration: number, from: number, to: number, level: number, type: OscillatorType): void {
    const node = this.context.createOscillator();
    node.type = type;
    node.frequency.setValueAtTime(from, at);
    node.frequency.exponentialRampToValueAtTime(to, at + duration);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    node.connect(gain);
    gain.connect(this.master);
    node.start(at);
    node.stop(at + duration + 0.05);
  }

  /**
   * The start-up script: a relay click, the starter motor turning the engine over in
   * uneven pulses, then the engine catches, revs, and settles to idle.
   * Resolves when the engine is idling.
   */
  async ignite(): Promise<void> {
    await this.context.resume();
    this.igniting = true;
    const t0 = this.context.currentTime + 0.05;
    const amp = this.engineAmp.gain;
    amp.cancelScheduledValues(t0);
    amp.setValueAtTime(0, t0);

    // Key turned: a click.
    this.burst(t0, 0.05, 2400, 0.5);

    // Cranking: low, lumpy turns of the engine, each pulse a cylinder pushing against the starter.
    this.holdRpm(190, t0);
    this.rampRpm(260, t0 + 1.4);
    const crankEnd = t0 + 1.45;
    for (let t = t0 + 0.1; t < crankEnd - 0.1; t += 0.17) {
      amp.setValueAtTime(0.06, t);
      amp.linearRampToValueAtTime(0.55, t + 0.045);
      amp.linearRampToValueAtTime(0.1, t + 0.15);
    }
    // The starter motor's whine rises as it spins up.
    this.tone(t0 + 0.04, 1.4, 360, 620, 0.035, "sawtooth");

    // It catches: a thump, a rev, then a fall to idle.
    amp.setValueAtTime(0.1, crankEnd);
    amp.linearRampToValueAtTime(0.72, crankEnd + 0.07);
    this.holdRpm(260, crankEnd);
    this.rampRpm(2100, crankEnd + 0.2);
    this.holdRpm(2100, crankEnd + 0.38);
    this.rampRpm(1350, crankEnd + 0.75);
    this.rampRpm(IDLE_RPM, crankEnd + 1.35);
    this.tone(crankEnd, 0.35, 90, 40, 0.5, "sine");
    this.burst(crankEnd, 0.16, 420, 0.4);

    const settle = crankEnd + 1.35 - this.context.currentTime;
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, settle) * 1000));

    // Hand control back to the speed model.
    const now = this.context.currentTime;
    amp.cancelScheduledValues(now);
    amp.setValueAtTime(0.42, now);
    this.rpm = IDLE_RPM;
    this.gear = 0;
    this.igniting = false;
    this.lastLoudness = -1;
  }

  /** Feed the car's speed (road units per second, either direction) once per frame. */
  setSpeed(rawSpeed: number): void {
    if (this.igniting) return;
    const target = clamp(Math.abs(rawSpeed), 0, MAX_SPEED * 1.1);
    this.speed += (target - this.speed) * 0.14;
    const speed = this.speed < 0.02 ? 0 : this.speed;

    // Change gear with some hysteresis, so revs climb, drop at a shift, and climb again.
    const last = GEAR_TOP_SPEED.length - 1;
    while (this.gear < last && speed > (GEAR_TOP_SPEED[this.gear] ?? MAX_SPEED) * 0.97) this.gear += 1;
    while (this.gear > 0 && speed < (GEAR_TOP_SPEED[this.gear - 1] ?? 0) * 0.62) this.gear -= 1;

    const top = GEAR_TOP_SPEED[this.gear] ?? MAX_SPEED;
    const rpm = IDLE_RPM + (REDLINE_RPM - IDLE_RPM) * clamp(speed / top);
    if (Math.abs(rpm - this.rpm) > 6) this.setRpm(rpm, 0.07);

    const loudness = 0.42 + 0.34 * clamp(speed / 8);
    if (Math.abs(loudness - this.lastLoudness) > 0.01) {
      this.lastLoudness = loudness;
      this.engineAmp.gain.setTargetAtTime(loudness, this.context.currentTime, 0.1);
      this.wind.gain.setTargetAtTime(0.02 + 0.2 * clamp(speed / 14), this.context.currentTime, 0.2);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.12);
    if (this.music && this.musicReady) this.music.volume = muted ? 0 : 0.3;
  }

  /** A short bell tone, used when a new stop or project is reached. */
  chime(step: number): void {
    if (this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = CHIME_HZ[step % CHIME_HZ.length] ?? 440;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 1.5);
  }

  dispose(): void {
    this.oscillators.forEach((oscillator) => oscillator.stop());
    this.music?.pause();
    this.music = null;
    void this.context.close();
  }
}
