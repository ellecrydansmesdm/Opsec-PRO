import { getHWID } from './hwid';

// Obfuscated dynamic endpoint reconstruction (anti-strings / anti-reverse)
const _0xbf = [0x68,0x74,0x74,0x70,0x73,0x3a,0x2f,0x2f,0x6f,0x70,0x73,0x65,0x63,0x2d,0x61,0x75,0x74,0x68,0x2d,0x64,0x65,0x66,0x61,0x75,0x6c,0x74,0x2d,0x72,0x74,0x64,0x62,0x2e,0x66,0x69,0x72,0x65,0x62,0x61,0x73,0x65,0x69,0x6f,0x2e,0x63,0x6f,0x6d];
const getAuthEndpoint = (): string => Buffer.from(_0xbf).toString('utf-8');

export class KeyAuthClient {
  private initialized = false;

  constructor() {
  }

  async initialize(): Promise<boolean> {
    this.initialized = true;
    return true;
  }

  async license(key: string): Promise<{ success: boolean; message: string; info?: any }> {
    if (!key || key.trim() === '') {
      return { success: false, message: 'Veuillez entrer une clé de licence.' };
    }

    try {
      const hwid = getHWID();
      const endpoint = getAuthEndpoint();
      
      // Récupération de la clé depuis Firebase
      const response = await fetch(`${endpoint}/licenses/${key}.json`);
      if (!response.ok) {
        return { success: false, message: `Erreur serveur d'authentification: code ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data) {
        return { success: false, message: 'Clé de licence invalide ou introuvable.' };
      }
      
      if (data.status !== 'active') {
         return { success: false, message: 'Cette clé de licence a été désactivée ou bannie.' };
      }

      // Vérification de l'expiration
      if (data.durationDays !== 'lifetime') {
        const expirationTime = data.createdAt + (data.durationDays * 24 * 60 * 60 * 1000);
        if (Date.now() > expirationTime) {
           return { success: false, message: 'Cette clé de licence a expiré.' };
        }
      }

      // Vérification du HWID (Hardware ID)
      if (!data.hwid || data.hwid === '') {
        // Première utilisation, on lie la clé à ce PC
        const patchRes = await fetch(`${endpoint}/licenses/${key}.json`, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ hwid: hwid })
        });
        if (!patchRes.ok) {
            return { success: false, message: "Impossible de lier la clé à votre machine." };
        }
      } else if (data.hwid !== hwid) {
        return { success: false, message: 'Cette clé est déjà liée à un autre ordinateur. Veuillez contacter le support pour un reset HWID.' };
      }

      // Succès
      let expirationStr = 'Jamais (Lifetime)';
      if (data.durationDays !== 'lifetime') {
          const expDate = new Date(data.createdAt + (data.durationDays * 24 * 60 * 60 * 1000));
          expirationStr = expDate.toLocaleDateString();
      }

      return { 
        success: true, 
        message: 'Connexion réussie ! Bienvenue sur Opsec PRO.',
        info: {
           expires: expirationStr
        }
      };
      
    } catch (e: any) {
      console.error('[Firebase Auth] Validation error:', e);
      return { success: false, message: `Impossible de contacter le serveur de licences: ${e.message}` };
    }
  }
}
