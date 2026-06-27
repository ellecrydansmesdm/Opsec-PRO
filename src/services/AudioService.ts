import { useSettingsStore } from '../store/useSettingsStore';

// 1. Static imports of all WAV files for Vite bundling
import navHoverLight from '@/assets/audio/nav/hover_light.wav';
import navHoverImportant from '@/assets/audio/nav/hover_important.wav';
import navFocusInput from '@/assets/audio/nav/focus_input.wav';
import navSelectTab from '@/assets/audio/nav/select_tab.wav';
import navChangePage from '@/assets/audio/nav/change_page.wav';
import navModalOpen from '@/assets/audio/nav/modal_open.wav';
import navModalClose from '@/assets/audio/nav/modal_close.wav';
import navMenuExpand from '@/assets/audio/nav/menu_expand.wav';
import navMenuCollapse from '@/assets/audio/nav/menu_collapse.wav';

import actionsBtnPrimary from '@/assets/audio/actions/btn_primary.wav';
import actionsBtnSecondary from '@/assets/audio/actions/btn_secondary.wav';
import actionsToggleOn from '@/assets/audio/actions/toggle_on.wav';
import actionsToggleOff from '@/assets/audio/actions/toggle_off.wav';
import actionsValidation from '@/assets/audio/actions/validation.wav';
import actionsSave from '@/assets/audio/actions/save.wav';
import actionsCancel from '@/assets/audio/actions/cancel.wav';
import actionsReset from '@/assets/audio/actions/reset.wav';

import modulesLaunch from '@/assets/audio/modules/launch.wav';
import modulesStop from '@/assets/audio/modules/stop.wav';
import modulesActive from '@/assets/audio/modules/active.wav';
import modulesComplete from '@/assets/audio/modules/complete.wav';
import modulesFailed from '@/assets/audio/modules/failed.wav';

import logsInfo from '@/assets/audio/logs/info.wav';
import logsSuccess from '@/assets/audio/logs/success.wav';
import logsWarn from '@/assets/audio/logs/warn.wav';
import logsErrorCritical from '@/assets/audio/logs/error_critical.wav';

import notificationsNormal from '@/assets/audio/notifications/normal.wav';
import notificationsImportant from '@/assets/audio/notifications/important.wav';
import notificationsSystem from '@/assets/audio/notifications/system.wav';
import notificationsUrgent from '@/assets/audio/notifications/urgent.wav';

import accountSwitch from '@/assets/audio/account/switch.wav';
import accountLoginSuccess from '@/assets/audio/account/login_success.wav';
import accountLoginFail from '@/assets/audio/account/login_fail.wav';
import accountLogout from '@/assets/audio/account/logout.wav';

import protectionSentinelActive from '@/assets/audio/protection/sentinel_active.wav';
import protectionSentinelDisabled from '@/assets/audio/protection/sentinel_disabled.wav';
import protectionEventDetect from '@/assets/audio/protection/event_detect.wav';
import protectionProtectionTriggered from '@/assets/audio/protection/protection_triggered.wav';

import spamStart from '@/assets/audio/spam/start.wav';
import spamStop from '@/assets/audio/spam/stop.wav';
import spamCampaignEnd from '@/assets/audio/spam/campaign_end.wav';

import pomeloUsernameFound from '@/assets/audio/pomelo/username_found.wav';
import pomeloUsernameClaimed from '@/assets/audio/pomelo/username_claimed.wav';
import pomeloClaimFailed from '@/assets/audio/pomelo/claim_failed.wav';

import sanitizerCleanStart from '@/assets/audio/sanitizer/clean_start.wav';
import sanitizerCleanStop from '@/assets/audio/sanitizer/clean_stop.wav';
import sanitizerUserInterrupt from '@/assets/audio/sanitizer/user_interrupt.wav';

// Mapping of new sound files
const SOUND_FILES = {
  // Navigation UI
  'nav_hover_light': navHoverLight,
  'nav_hover_important': navHoverImportant,
  'nav_focus_input': navFocusInput,
  'nav_select_tab': navSelectTab,
  'nav_change_page': navChangePage,
  'nav_modal_open': navModalOpen,
  'nav_modal_close': navModalClose,
  'nav_menu_expand': navMenuExpand,
  'nav_menu_collapse': navMenuCollapse,

  // Actions
  'action_toggle_on': actionsToggleOn,
  'action_toggle_off': actionsToggleOff,
  'action_btn_primary': actionsBtnPrimary,
  'action_btn_secondary': actionsBtnSecondary,
  'action_validation': actionsValidation,
  'action_save': actionsSave,
  'action_cancel': actionsCancel,
  'action_reset': actionsReset,

  // Modules
  'module_launch': modulesLaunch,
  'module_stop': modulesStop,
  'module_active': modulesActive,
  'module_complete': modulesComplete,
  'module_failed': modulesFailed,

  // Logs
  'log_info': logsInfo,
  'log_success': logsSuccess,
  'log_warn': logsWarn,
  'log_error_critical': logsErrorCritical,

  // Notifications
  'notif_normal': notificationsNormal,
  'notif_important': notificationsImportant,
  'notif_system': notificationsSystem,
  'notif_urgent': notificationsUrgent,

  // Account
  'account_switch': accountSwitch,
  'account_login_success': accountLoginSuccess,
  'account_login_fail': accountLoginFail,
  'account_logout': accountLogout,

  // Protection
  'sentinel_active': protectionSentinelActive,
  'sentinel_disabled': protectionSentinelDisabled,
  'sentinel_event_detect': protectionEventDetect,
  'sentinel_protection_triggered': protectionProtectionTriggered,

  // Spam
  'spam_start': spamStart,
  'spam_stop': spamStop,
  'spam_campaign_end': spamCampaignEnd,

  // Pomelo
  'pomelo_username_found': pomeloUsernameFound,
  'pomelo_username_claimed': pomeloUsernameClaimed,
  'pomelo_claim_failed': pomeloClaimFailed,

  // Sanitizer
  'sanitizer_clean_start': sanitizerCleanStart,
  'sanitizer_clean_stop': sanitizerCleanStop,
  'sanitizer_user_interrupt': sanitizerUserInterrupt,
};

type NewSoundEvent = keyof typeof SOUND_FILES;

type LegacySoundEvent =
  | 'boot' | 'ready' 
  | 'click' | 'toggle' | 'hover'
  | 'success' | 'error' | 'failure' | 'denied'
  | 'module_start' | 'module_stop' | 'module_error'
  | 'target_required';

export type SoundEvent = NewSoundEvent | LegacySoundEvent;

// Legacy sound to new sound mapping
const LEGACY_MAPPING: Record<LegacySoundEvent, NewSoundEvent> = {
  'boot': 'account_login_success',
  'ready': 'action_validation',
  'click': 'action_btn_secondary',
  'toggle': 'action_toggle_on',
  'hover': 'nav_hover_light',
  'success': 'action_validation',
  'error': 'log_error_critical',
  'failure': 'module_failed',
  'denied': 'account_login_fail',
  'module_start': 'module_launch',
  'module_stop': 'module_stop',
  'module_error': 'module_failed',
  'target_required': 'log_warn',
};

class AudioController {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;
  private enabled: boolean = true;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private lastPlayed: Map<string, number> = new Map();
  private static instance: AudioController;

  static getInstance() {
    if (!AudioController.instance) {
      AudioController.instance = new AudioController();
    }
    return AudioController.instance;
  }

  constructor() {
    // Setup lazy init triggers on mouse/key interactions
    const unlock = () => {
      this.initCtx();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          console.log("[Audio] System Unlocked & Context Resumed");
          this.preloadAll();
        });
      } else {
        this.preloadAll();
      }
      document.removeEventListener('mousedown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('mousedown', unlock);
    document.addEventListener('keydown', unlock);

    // Live sync with settings store
    useSettingsStore.subscribe((state) => {
      const newVol = state.settings.audioVolume ?? 0.5;
      const newEnabled = state.settings.audioEnabled ?? true;
      
      if (this.volume !== newVol) this.setVolume(newVol);
      if (this.enabled !== newEnabled) this.toggle(newEnabled);
    });
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
  }

  // Preloads all WAV buffers in the background to ensure zero latency
  private preloadAll() {
    Object.keys(SOUND_FILES).forEach(name => {
      this.loadSound(name as NewSoundEvent);
    });
  }

  // Asynchronously loads and decodes a WAV file into the cache
  private loadSound(name: NewSoundEvent): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) {
      return Promise.resolve(this.buffers.get(name) || null);
    }

    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    const promise = (async () => {
      this.initCtx();
      const ctx = this.ctx;
      if (!ctx) return null;

      try {
        const url = SOUND_FILES[name];
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(name, buffer);
        return buffer;
      } catch (err) {
        console.error(`[Audio] Failed to load/decode sound: ${name}`, err);
        return null;
      } finally {
        this.loadingPromises.delete(name);
      }
    })();

    this.loadingPromises.set(name, promise);
    return promise;
  }

  // Plays a sound from cache with optional custom volume and throttle bypassing
  async play(event: SoundEvent, options?: { volume?: number; bypassThrottle?: boolean }) {
    if (!this.enabled) return;

    this.initCtx();
    const ctx = this.ctx;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {}
    }

    // Resolve legacy sound aliases
    let targetSound = event as NewSoundEvent;
    if (event in LEGACY_MAPPING) {
      targetSound = LEGACY_MAPPING[event as LegacySoundEvent];
    }

    // Rate Limiting (Throttle) to avoid audio spam
    const now = Date.now();
    const throttleTime = 120; // ms
    const lastTime = this.lastPlayed.get(targetSound) || 0;
    if (!options?.bypassThrottle && (now - lastTime < throttleTime)) {
      return; // Skip playback to prevent audio overlap/clipping
    }
    this.lastPlayed.set(targetSound, now);

    const finalVolume = (options?.volume !== undefined ? options.volume : 1.0) * this.volume;
    if (finalVolume <= 0) return;

    try {
      // Get or load buffer
      let buffer = this.buffers.get(targetSound);
      if (!buffer) {
        buffer = await this.loadSound(targetSound) || undefined;
      }

      if (!buffer) return;

      // Sample-accurate zero-latency buffer source playback
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Explicit cleanup to prevent memory fragmentation / lingering Web Audio nodes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };

      source.start(0);
    } catch (err) {
      console.error(`[Audio] Error during sound play: ${targetSound}`, err);
    }
  }

  setVolume(vol: number) {
    this.volume = vol;
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const audioService = AudioController.getInstance();
