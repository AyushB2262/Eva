export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  async start(onData: (base64: string) => void, onVolumeChange?: (volume: number) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Create AudioWorklet inline
      const workletCode = `
        class RecorderProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferSize = 4096;
            this.buffer = new Float32Array(this.bufferSize);
            this.bytesWritten = 0;
          }

          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (!input || !input.length) return true;
            const channel = input[0];

            for (let i = 0; i < channel.length; i++) {
              this.buffer[this.bytesWritten++] = channel[i];

              if (this.bytesWritten >= this.bufferSize) {
                // Buffer full, process and send
                const pcm16 = new Int16Array(this.bufferSize);
                let sum = 0;
                
                for (let j = 0; j < this.bufferSize; j++) {
                  let s = Math.max(-1, Math.min(1, this.buffer[j]));
                  pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  sum += s * s;
                }

                const rms = Math.sqrt(sum / this.bufferSize);

                // Transfer the buffer instead of base64 encoding it here
                // btoa is not available in the AudioWorkletGlobalScope
                this.port.postMessage({ buffer: pcm16.buffer, rms }, [pcm16.buffer]);
                this.bytesWritten = 0;
              }
            }
            return true;
          }
        }
        registerProcessor('recorder-worklet', RecorderProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await this.audioContext.audioWorklet.addModule(workletUrl);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'recorder-worklet');

      this.workletNode.port.onmessage = (event) => {
        const { buffer, rms } = event.data;
        if (onVolumeChange) {
          const mappedVolume = Math.min(rms * 10, 1);
          onVolumeChange(mappedVolume);
        }

        // Base64 encode the ArrayBuffer on the main thread
        const uint8 = new Uint8Array(buffer);
        let binary = '';
        for (let j = 0; j < uint8.byteLength; j++) {
          binary += String.fromCharCode(uint8[j]);
        }
        const base64Data = btoa(binary);

        onData(base64Data);
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      URL.revokeObjectURL(workletUrl);

    } catch (err) {
      console.error("Failed to start audio recorder:", err);
    }
  }

  stop() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}

export class AudioPlayer {
  private audioContext: AudioContext;
  private panner: StereoPannerNode;
  private nextTime: number = 0;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.panner = this.audioContext.createStereoPanner();
    this.panner.connect(this.audioContext.destination);
  }

  setPan(x: number) {
    if (this.panner.pan) {
      // Smoothly transition pan value
      this.panner.pan.setTargetAtTime(x, this.audioContext.currentTime, 0.1);
    } else {
      this.panner.pan.value = x;
    }
  }


  play(base64: string) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(buffer.buffer);
    const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768.0;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.panner);


    if (this.nextTime < this.audioContext.currentTime) {
      this.nextTime = this.audioContext.currentTime;
    }
    source.start(this.nextTime);
    this.nextTime += audioBuffer.duration;
  }

  stop() {
    this.nextTime = 0;
    this.panner.disconnect();
    this.audioContext.close();
    
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.panner = this.audioContext.createStereoPanner();
    this.panner.connect(this.audioContext.destination);
  }


  isPlaying(): boolean {
    return this.audioContext.state === 'running' && this.nextTime > this.audioContext.currentTime;
  }
}
