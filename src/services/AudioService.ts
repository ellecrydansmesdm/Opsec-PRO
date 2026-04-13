import { Howl } from 'howler';
import { useSettingsStore } from '../store/useSettingsStore';

class AudioService {
  private sounds: Record<string, Howl> = {};
  private currentVolume: number = 0.5;
  private isEnabled: boolean = true;

  constructor() {
    this.initSounds();
    // Subscribe to settings changes
    useSettingsStore.subscribe((state) => {
      this.currentVolume = state.settings.audioVolume ?? 0.5;
      this.isEnabled = state.settings.audioEnabled ?? true;
      this.updateAllVolumes();
    });
  }

  private initSounds() {
    const sfxBaseUrl = 'https://assets.mixkit.co/active_storage/sfx/';
    
    // Default high-quality cyberpunk SFX
    const soundConfig = {
      click: '2571/2571-preview.mp3',      // Subtle mechanical click
      success: '2568/2568-preview.mp3',    // Positive pulse
      error: '2567/2567-preview.mp3',      // Negative pulse
      toggle: '2569/2569-preview.mp3',     // Energy transition
      hover: '2570/2570-preview.mp3',      // Subtle static hover
      notification: '2566/2566-preview.mp3' // Ping
    };

    Object.entries(soundConfig).forEach(([name, path]) => {
      this.sounds[name] = new Howl({
        src: [`${sfxBaseUrl}${path}`],
        volume: this.currentVolume,
        preload: true,
        html5: true, // Better for cross-domain URLs
        onloaderror: (id, err) => console.warn(`[AUDIO] Failed to load ${name}:`, err)
      });
    });
  }

  public play(soundName: string) {
    if (!this.isEnabled) return;
    const sound = this.sounds[soundName];
    if (sound) {
      // Small jitter for more human feel
      sound.rate(0.95 + Math.random() * 0.1);
      sound.play();
    }
  }

  private updateAllVolumes() {
    Object.values(this.sounds).forEach(sound => {
      sound.volume(this.currentVolume);
    });
  }
}

export const audioService = new AudioService();
