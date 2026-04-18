const fs = require('fs');
const path = require('path');

// Helper to generate a minimalistic WAV file in Node
function createSyntheticWav(freq, durationMs, type = 'sine') {
    const sampleRate = 44100;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    
    const buffer = Buffer.alloc(44 + numSamples * 2);
    
    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22); // NumChannels
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(byteRate, 28); // ByteRate
    buffer.writeUInt16LE(numChannels * 2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);
    
    // Generate samples
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        // Add an envelope (fade in/out) to avoid clicks
        const envelope = Math.sin(Math.PI * (i / numSamples));
        
        if (type === 'sine') {
            sample = Math.sin(2 * Math.PI * freq * t);
        } else if (type === 'square') {
            sample = Math.sign(Math.sin(2 * Math.PI * freq * t));
        } else if (type === 'sawtooth') {
            sample = 2 * (freq * t - Math.floor(0.5 + freq * t));
        } else if (type === 'sweep_up') {
            const currentFreq = freq + (i / numSamples) * freq * 2;
            sample = Math.sin(2 * Math.PI * currentFreq * t);
        } else if (type === 'sweep_down') {
            const currentFreq = freq - (i / numSamples) * (freq / 2);
            sample = Math.sin(2 * Math.PI * currentFreq * t);
        } else if (type === 'error') {
            sample = Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * (freq * 1.5) * t); // Dissonance
        }

        // Apply envelope and scaling
        const val = Math.max(-32768, Math.min(32767, Math.floor(sample * envelope * 20000)));
        buffer.writeInt16LE(val, 44 + i * 2);
    }
    
    return buffer;
}

const dir = path.join(__dirname, 'public', 'sounds');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Map logical names to synthetic sound params [freq, duration, type]
const soundMap = {
  boot: [440, 800, 'sweep_up'],
  ready: [880, 500, 'sine'],
  click: [1200, 50, 'sine'],
  toggle: [900, 80, 'square'],
  hover: [2000, 20, 'sine'],
  success: [1000, 300, 'sweep_up'],
  error: [200, 400, 'error'],
  failure: [150, 500, 'sweep_down'],
  denied: [100, 300, 'square'],
  module_start: [600, 400, 'sweep_up'],
  module_stop: [500, 400, 'sweep_down'],
  module_error: [800, 200, 'error'],
  target_required: [1200, 150, 'square']
};

Object.entries(soundMap).forEach(([key, [freq, dur, type]]) => {
  const filePath = path.join(dir, `${key}.wav`);
  const buf = createSyntheticWav(freq, dur, type);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated local sound: /sounds/${key}.wav`);
});
