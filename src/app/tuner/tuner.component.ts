import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tuner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tuner.component.html',
  styleUrls: ['./tuner.component.css'],
})
export class TunerComponent implements OnDestroy {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private rafId = 0;

  running = signal(false);
  note = signal('-');
  freq = signal(0);
  cents = signal(0);

  private readonly A4 = 440;
  private readonly noteStrings = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];

  //padrao 6 cord E A D G B e


//


  async start() {
    if (this.running()) return;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (err) {
      alert('Não foi possível acessar o microfone: ' + err);
      return;
    }

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.running.set(true);
    this.updatePitch();
  }

  stop() {
    this.running.set(false);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
    this.note.set('-');
    this.freq.set(0);
    this.cents.set(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private updatePitch() {
    if (!this.analyser || !this.audioContext) return;

    const bufferLength = this.analyser.fftSize;
    const buf = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buf);

    const ac = this.autoCorrelate(buf, this.audioContext.sampleRate);
    if (ac !== -1) {
      this.freq.set(ac);
      const noteNum = this.frequencyToNoteNumber(ac);
      const noteName = this.noteStrings[Math.round(noteNum) % 12];
      this.note.set(noteName);
      this.cents.set(this.centsOffFromPitch(ac, noteNum));
    } else {
      this.note.set('-');
      this.freq.set(0);
      this.cents.set(0);
    }

    this.rafId = requestAnimationFrame(() => this.updatePitch());
  }

  private frequencyToNoteNumber(frequency: number) {
    return 12 * (Math.log(frequency / this.A4) / Math.log(2)) + 69;
  }

  private centsOffFromPitch(frequency: number, noteNumberFloat: number) {
    const diff = noteNumberFloat - Math.round(noteNumberFloat);
    return Math.round(diff * 100);
  }

  private autoCorrelate(buf: Float32Array, sampleRate: number): number {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0,
      r2 = SIZE - 1,
      thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    buf = buf.slice(r1, r2);
    const newSize = buf.length;
    const c = new Array(newSize).fill(0);
    for (let i = 0; i < newSize; i++) {
      for (let j = 0; j < newSize - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1,
      maxpos = -1;
    for (let i = d; i < newSize; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;
    if (T0 === 0) return -1;

    const x1 = c[T0 - 1],
      x2 = c[T0],
      x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);


    const frequency = sampleRate / T0;
    return frequency;

  }
}
