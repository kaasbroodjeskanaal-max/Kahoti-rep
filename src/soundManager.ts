class SoundEffectsManager {
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("kahoti_sfx_enabled") !== "false";
      this.volume = parseFloat(localStorage.getItem("kahoti_sfx_volume") || "0.5");
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("kahoti_sfx_enabled", String(enabled));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== "undefined") {
      localStorage.setItem("kahoti_sfx_volume", String(this.volume));
    }
  }

  private createAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  }

  public playJoinRoom() {
    if (!this.enabled) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    masterGain.connect(ctx.destination);

    // Warm chord (C G C E) arpeggio rising
    const freqs = [130.81, 196.00, 261.63, 329.63]; // C3, G3, C4, E4
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.4);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.5);
    });

    // Gentle sub-audio swoop filter pop
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(5, now);
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    const noise = ctx.createOscillator();
    noise.type = "triangle";
    noise.frequency.setValueAtTime(100, now);
    noise.frequency.exponentialRampToValueAtTime(400, now + 0.35);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.45);
  }

  public playSelectAnswer() {
    if (!this.enabled) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    // Quick modern click
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCorrect() {
    if (!this.enabled) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    masterGain.connect(ctx.destination);

    // Sparkling arpeggio / success chime (C5, E5, G5, C6, E6)
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.6);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.7);
    });

    // Add a high filter sweep for "sparkle"
    const noise = ctx.createOscillator();
    noise.type = "triangle";
    noise.frequency.setValueAtTime(800, now);
    noise.frequency.linearRampToValueAtTime(2000, now + 0.4);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    noise.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  public playIncorrect() {
    if (!this.enabled) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    masterGain.connect(ctx.destination);

    // Sad soft low tone arpeggio down
    const freqs = [220.00, 196.00, 174.61]; // A3, G3, F3
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.5);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.6);
    });
  }

  public playLobbyJoin() {
    if (!this.enabled) return;
    const ctx = this.createAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const sfx = new SoundEffectsManager();
