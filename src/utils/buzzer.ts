/**
 * Trade Nexus Zero-Polling Audio Alert Synthesizer
 * Uses Web Audio API to play a crisp, distinct notification chime directly
 * without needing external MP3 asset downloads.
 */

class BuzzerService {
  private ctx: AudioContext | null = null;

  playBuzzer() {
    try {
      const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Crisp double-pulse chime (880Hz A5 -> 659Hz E5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch (_) {
      // AudioContext autoplay restriction safe fallback
    }
  }
}

export const buzzer = new BuzzerService();
