import { Howl, Howler } from 'howler';
import { useSettingsStore } from '../store/useSettingsStore';

export type SoundEvent = 
  | 'boot' | 'ready' 
  | 'click' | 'toggle' | 'hover'
  | 'success' | 'error' | 'failure' | 'denied'
  | 'module_start' | 'module_stop' | 'module_error'
  | 'target_required';

class AudioController {
  private sounds: Map<SoundEvent, Howl> = new Map();
  private volume: number = 0.5;
  private enabled: boolean = true;
  private static instance: AudioController;

  static getInstance() {
    if (!AudioController.instance) {
      AudioController.instance = new AudioController();
    }
    return AudioController.instance;
  }

  constructor() {
    this.initSounds();
    
    // Global Howler config
    Howler.autoUnlock = true;
    
    // Force unlock on first user interaction
    const unlock = () => {
      console.log("[Audio] System Unlocked via User interaction");
      Howler.unload(); // Clean stale states
      this.initSounds(); // Re-init
      document.removeEventListener('mousedown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('mousedown', unlock);
    document.addEventListener('keydown', unlock);

    // Subscribe to settings changes for live sync
    useSettingsStore.subscribe((state) => {
      const newVol = state.settings.audioVolume ?? 0.5;
      const newEnabled = state.settings.audioEnabled ?? true;
      
      if (this.volume !== newVol) this.setVolume(newVol);
      if (this.enabled !== newEnabled) this.toggle(newEnabled);
    });
  }

  private initSounds() {
    const soundMap: Record<SoundEvent, string> = {
      boot: './sounds/boot.wav',
      ready: './sounds/ready.wav',
      click: './sounds/click.wav',
      toggle: './sounds/toggle.wav',
      hover: './sounds/hover.wav',
      success: './sounds/success.wav',
      error: './sounds/error.wav',
      failure: './sounds/failure.wav',
      denied: './sounds/denied.wav',
      module_start: './sounds/module_start.wav',
      module_stop: './sounds/module_stop.wav',
      module_error: './sounds/module_error.wav',
      target_required: './sounds/target_required.wav'
    };

    Object.entries(soundMap).forEach(([key, url]) => {
      this.sounds.set(key as SoundEvent, new Howl({
        src: [url],
        volume: this.volume || 0.5,
        preload: true,
        html5: false, // Local files load instantly, avoid HTML5 audio context locks
        onloaderror: (id, error) => {
          console.warn(`[Audio] Load Error for ${key}:`, error);
          // Retry once after 2 seconds
          setTimeout(() => {
            const sound = this.sounds.get(key as SoundEvent);
            if (sound && sound.state() === 'unloaded') sound.load();
          }, 2000);
        },
        onplayerror: (id, error) => {
          console.warn(`[Audio] Play Error for ${key}:`, error);
        }
      }));
    });
  }

  play(event: SoundEvent, options?: { volume?: number }) {
    console.log(`[Audio] Tentative de lecture: ${event}, enabled: ${this.enabled}, volume global: ${this.volume}`);
    
    if (!this.enabled) {
      console.log(`[Audio] BLOCAGE: Le service audio est désactivé.`);
      return;
    }

    const sound = this.sounds.get(event);
    if (sound) {
      const currentVolume = (options?.volume !== undefined ? options.volume : 1.0) * (this.volume || 0.5);
      console.log(`[Audio] Lecture en cours: ${event} (Volume: ${currentVolume.toFixed(2)}) State: ${sound.state()}`);
      
      if (sound.state() === 'unloaded') {
        console.log(`[Audio] RE-LOADING: ${event}`);
        sound.load();
      }

      sound.volume(currentVolume);
      
      // Add slight variety to repetitive sounds
      if (['click', 'hover', 'toggle'].includes(event)) {
        sound.rate(0.95 + Math.random() * 0.1);
      }
      
      sound.play();
    } else {
      console.error(`[Audio] ERREUR: Son "${event}" non trouvé dans le Map.`);
    }
  }

  setVolume(vol: number) {
    this.volume = vol;
    Howler.volume(vol);
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
    Howler.mute(!enabled);
  }
}

export const audioService = AudioController.getInstance();
