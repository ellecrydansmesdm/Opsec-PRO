import { audioService } from '../services/AudioService';
import { useSettingsStore } from '@/store/useSettingsStore';

export const useActionValidator = (showToast: (message: string, type: 'success' | 'danger') => void) => {
  const { settings } = useSettingsStore();
  const isFr = settings.language === 'fr';

  const validateTarget = (target: string | null | undefined, moduleName: string): boolean => {
    if (!target || target.trim() === '' || target === 'Choisir une cible...' || target === 'Choisir un salon...' || target === 'Choose target...' || target === 'Choose channel...') {
      // Double sound: alert + failure
      audioService.play('log_warn');
      setTimeout(() => audioService.play('module_failed', { volume: 0.6 }), 200);
      
      showToast(isFr ? `⚠️ ACTION REQUISE : Sélectionnez une cible pour le module ${moduleName}` : `⚠️ ACTION REQUIRED: Select a target for the module ${moduleName}`, 'danger');
      return false;
    }
    return true;
  };

  const validateConnection = (isAuthenticated: boolean): boolean => {
    if (!isAuthenticated) {
      audioService.play('account_login_fail');
      showToast(isFr ? '🔒 ACCÈS REFUSÉ : Connectez-vous à Discord d\'abord' : '🔒 ACCESS DENIED: Connect to Discord first', 'danger');
      return false;
    }
    return true;
  };

  return { validateTarget, validateConnection };
};
