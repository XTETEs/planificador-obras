export const CORPORATE_DOMAIN = 'enue.es';

const STORAGE_ACTIVE_USER_KEY = 'enue_active_user';
const STORAGE_SAVED_ACCOUNTS_KEY = 'enue_saved_accounts';

// Corrección automática de errores tipográficos frecuentes en teclados móviles/tablets
const EMAIL_TYPO_ALIASES = {
  'jteuelo@enue.es': { email: 'jtejuelo@enue.es', displayName: 'Ximo' },
  'j.tejuelo@enue.es': { email: 'jtejuelo@enue.es', displayName: 'Ximo' },
  'ximo@enue.es': { email: 'jtejuelo@enue.es', displayName: 'Ximo' }
};

// Cuentas corporativas registradas en Firestore para acceso rápido en cualquier dispositivo nuevo
export const DEFAULT_CORPORATE_ACCOUNTS = [
  { email: 'jtejuelo@enue.es', displayName: 'Ximo' },
  { email: 'calidad@enue.es', displayName: 'Yara' }
];

let currentAuthUser = null;
let authListeners = [];

/**
 * Normaliza un correo corporativo corrigiendo erratas conocidas de teclado móvil/tablet
 */
export function normalizeCorporateEmail(email, customName = '') {
  const raw = (email || '').trim().toLowerCase();
  if (EMAIL_TYPO_ALIASES[raw]) {
    return {
      email: EMAIL_TYPO_ALIASES[raw].email,
      displayName: customName && customName.trim() && customName.trim().toLowerCase() !== 'jteuelo'
        ? customName.trim()
        : EMAIL_TYPO_ALIASES[raw].displayName
    };
  }
  return {
    email: raw,
    displayName: customName ? customName.trim() : ''
  };
}

// Inicializar usuario desde almacenamiento local si existe (corrigiendo erratas como jteuelo@enue.es)
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        const normalized = normalizeCorporateEmail(parsed.email, parsed.displayName);
        const fixedUid = getUserIdFromEmail(normalized.email);
        currentAuthUser = {
          ...parsed,
          uid: fixedUid,
          email: normalized.email,
          displayName: normalized.displayName || getDisplayNameFromEmail(normalized.email)
        };
        if (parsed.email !== normalized.email || parsed.uid !== fixedUid) {
          localStorage.setItem(STORAGE_ACTIVE_USER_KEY, JSON.stringify(currentAuthUser));
        }
      }
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
  const clean = email.trim().toLowerCase();
  const known = DEFAULT_CORPORATE_ACCOUNTS.find(a => a.email === clean);
  if (known) return known.displayName;
  const prefix = clean.split('@')[0];
  const parts = prefix.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return prefix;
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

/**
 * Genera un identificador único determinista y seguro para la partición de datos en Firestore
 */
export function getUserIdFromEmail(email) {
  const normalized = normalizeCorporateEmail(email);
  return 'u_' + normalized.email.replace(/[^a-z0-9]/g, '_');
}

/**
 * Inicia sesión directa sin contraseña mediante verificación de correo corporativo @enue.es
 */
export function loginWithCorporateEmail(email, customName = '') {
  const normalized = normalizeCorporateEmail(email, customName);
  const cleanEmail = normalized.email;
  if (!cleanEmail) {
    throw new Error('Introduce tu correo corporativo.');
  }

  if (!isCorporateEmail(cleanEmail)) {
    throw new Error(`Acceso denegado: Únicamente se permite el acceso con correo corporativo oficial terminado en @${CORPORATE_DOMAIN}`);
  }

  const displayName = normalized.displayName
    ? normalized.displayName
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
      accounts = accounts.filter(a => a.email !== cleanEmail && a.email !== (email || '').trim().toLowerCase());
      accounts.unshift({
        email: cleanEmail,
        displayName,
        lastUsed: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 8)));
    } catch (e) {
      console.warn('Error guardando sesión:', e);
    }
  }

  notifyAuthListeners();
  return user;
}

/**
 * Obtiene la lista de cuentas corporativas disponibles (combinando las usadas en el dispositivo y las corporativas registradas)
 */
export function getSavedAccounts() {
  let localAccounts = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_ACCOUNTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localAccounts = parsed.map(acc => {
            const norm = normalizeCorporateEmail(acc.email, acc.displayName);
            return {
              ...acc,
              email: norm.email,
              displayName: norm.displayName || getDisplayNameFromEmail(norm.email)
            };
          });
        }
      }
    } catch (e) {
      localAccounts = [];
    }
  }

  // Combinar sin duplicados con las cuentas corporativas activas para que aparezcan en tablets y móviles nuevos
  const merged = [...localAccounts];
  for (const defAcc of DEFAULT_CORPORATE_ACCOUNTS) {
    if (!merged.some(a => a.email === defAcc.email)) {
      merged.push({
        email: defAcc.email,
        displayName: defAcc.displayName,
        lastUsed: null
      });
    }
  }
  return merged;
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
