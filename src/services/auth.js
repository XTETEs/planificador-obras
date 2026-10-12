export const CORPORATE_DOMAIN = 'enue.es';

const STORAGE_ACTIVE_USER_KEY = 'enue_active_user';
const STORAGE_SAVED_ACCOUNTS_KEY = 'enue_saved_accounts';

let currentAuthUser = null;
let authListeners = [];

// Inicializar usuario desde almacenamiento local si existe
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
    if (raw) {
      currentAuthUser = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error leyendo usuario activo de localStorage:', e);
  }
}

function notifyAuthListeners() {
  authListeners.slice().forEach(fn => {
    try {
      fn(currentAuthUser);
    } catch (e) {
      console.error('Error en listener de autenticación:', e);
    }
  });
}

/**
 * Valida si un correo electrónico pertenece al dominio oficial @enue.es
 */
export function isCorporateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith(`@${CORPORATE_DOMAIN}`);
}

/**
 * Extrae un nombre amigable a partir del usuario de correo (ej. joaquin.martinez -> Joaquín Martínez)
 */
export function getDisplayNameFromEmail(email) {
  if (!email || typeof email !== 'string') return 'Usuario';
  const prefix = email.split('@')[0];
  const parts = prefix.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return prefix;
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

/**
 * Genera un identificador único determinista y seguro para la partición de datos en Firestore
 */
export function getUserIdFromEmail(email) {
  const clean = (email || '').trim().toLowerCase();
  return 'u_' + clean.replace(/[^a-z0-9]/g, '_');
}

/**
 * Inicia sesión directa sin contraseña mediante verificación de correo corporativo @enue.es
 */
export function loginWithCorporateEmail(email, customName = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Introduce tu correo corporativo.');
  }

  if (!isCorporateEmail(cleanEmail)) {
    throw new Error(`Acceso denegado: Únicamente se permite el acceso con correo corporativo oficial terminado en @${CORPORATE_DOMAIN}`);
  }

  const displayName = customName && customName.trim()
    ? customName.trim()
    : getDisplayNameFromEmail(cleanEmail);

  const uid = getUserIdFromEmail(cleanEmail);

  const user = {
    uid,
    email: cleanEmail,
    displayName,
    lastLogin: new Date().toISOString()
  };

  currentAuthUser = user;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_ACTIVE_USER_KEY, JSON.stringify(user));

      // Guardar en la lista de cuentas recordadas en este dispositivo
      let accounts = getSavedAccounts();
      accounts = accounts.filter(a => a.email !== cleanEmail);
      accounts.unshift({
        email: cleanEmail,
        displayName,
        lastUsed: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 5)));
    } catch (e) {
      console.warn('Error guardando sesión:', e);
    }
  }

  notifyAuthListeners();
  return user;
}

/**
 * Obtiene la lista de cuentas corporativas usadas previamente en este navegador
 */
export function getSavedAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Elimina una cuenta de la lista de cuentas recordadas
 */
export function removeSavedAccount(email) {
  if (typeof window === 'undefined') return;
  try {
    const accounts = getSavedAccounts().filter(a => a.email !== email);
    localStorage.setItem(STORAGE_SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {}
}

/**
 * Cierra la sesión activa
 */
export function logout() {
  currentAuthUser = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_ACTIVE_USER_KEY);
    } catch (e) {}
  }
  notifyAuthListeners();
  return Promise.resolve();
}

/**
 * Obtiene el usuario corporativo actual
 */
export function getCurrentUser() {
  return currentAuthUser;
}

/**
 * Suscripción al estado de sesión corporativa
 */
export function onAuthUserChange(callback) {
  authListeners.push(callback);
  // Llamar de inmediato con el estado actual
  try {
    callback(currentAuthUser);
  } catch (e) {
    console.error(e);
  }

  return () => {
    authListeners = authListeners.filter(f => f !== callback);
  };
}
