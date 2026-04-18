import { audioService } from '../services/AudioService';

export const useActionValidator = (showToast: (message: string, type: 'success' | 'danger') => void) => {
  const validateTarget = (target: string | null | undefined, moduleName: string): boolean => {
    if (!target || target.trim() === '' || target === 'Choisir une cible...' || target === 'Choisir un salon...') {
      // Double sound: alert + failure
      audioService.play('target_required');
      setTimeout(() => audioService.play('failure', { volume: 0.6 }), 200);
      
      showToast(`⚠️ ACTION REQUISE : Sélectionnez une cible pour le module ${moduleName}`, 'danger');
      return false;
    }
    return true;
  };

  const validateConnection = (isAuthenticated: boolean): boolean => {
    if (!isAuthenticated) {
      audioService.play('denied');
      showToast('🔒 ACCÈS REFUSÉ : Connectez-vous à Discord d\'abord', 'danger');
      return false;
    }
    return true;
  };

  return { validateTarget, validateConnection };
};
