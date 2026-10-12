import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { app } from './db.js';

export const auth = getAuth(app);

export const CORPORATE_DOMAIN = 'enue.es';

/**
 * Valida si un correo electrónico pertenece al dominio corporativo oficial de la empresa.
 */
export function isCorporateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith(`@${CORPORATE_DOMAIN}`);
}

/**
 * Normaliza mensajes de error de Firebase a explicaciones claras en español.
 */
export function getAuthErrorMessage(error) {
  if (!error) return 'Ha ocurrido un error inesperado.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido inhabilitada por el administrador.';
    case 'auth/user-not-found':
      return 'No existe ningún usuario registrado con este correo corporativo.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Contraseña o credenciales incorrectas. Verifica tus datos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo corporativo. Inicia sesión.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil (debe tener al menos 6 caracteres).';
    case 'auth/popup-closed-by-user':
      return 'Se ha cancelado la ventana de autenticación con Google.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente de inicio de sesión. Por favor, permítela.';
    case 'auth/network-request-failed':
      return 'Error de conexión de red. Comprueba tu conexión a internet.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por seguridad, inténtalo de nuevo en unos minutos.';
    default:
      return error.message || 'Error en la autenticación.';
  }
}

/**
 * Iniciar sesión con correo corporativo y contraseña.
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Introduce tu correo corporativo.');
  }
  if (!isCorporateEmail(cleanEmail)) {
    throw new Error(`Acceso denegado: Únicamente se permite el acceso al personal corporativo con correo @${CORPORATE_DOMAIN}`);
  }
  if (!password) {
    throw new Error('Introduce tu contraseña.');
  }

  return await signInWithEmailAndPassword(auth, cleanEmail, password);
}

/**
 * Registrar nuevo usuario con correo corporativo y contraseña.
 */
export async function registerWithEmail(email, password, displayName = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Introduce tu correo corporativo.');
  }
  if (!isCorporateEmail(cleanEmail)) {
    throw new Error(`Acceso denegado: Únicamente se permite registrar cuentas con el dominio corporativo @${CORPORATE_DOMAIN}`);
  }
  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener un mínimo de 6 caracteres.');
  }

  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('No se pudo actualizar el nombre del perfil:', e);
    }
  }
  return credential;
}

/**
 * Iniciar sesión mediante Google Workspace con comprobación estricta de dominio corporativo.
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
    hd: CORPORATE_DOMAIN // Hint de Google Workspace para restringir selección al dominio
  });

  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Validación estricta de dominio tras el login de Google
  if (!user || !user.email || !isCorporateEmail(user.email)) {
    const invalidEmail = user?.email || 'desconocido';
    await firebaseSignOut(auth);
    throw new Error(
      `Acceso restringido: El correo "${invalidEmail}" no pertenece al dominio corporativo @${CORPORATE_DOMAIN}. Inicia sesión con tu cuenta de empresa.`
    );
  }

  return credential;
}

/**
 * Enviar correo de restablecimiento de contraseña.
 */
export async function resetPassword(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Introduce tu correo corporativo.');
  }
  if (!isCorporateEmail(cleanEmail)) {
    throw new Error(`El correo debe pertenecer al dominio corporativo @${CORPORATE_DOMAIN}`);
  }
  return await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Cerrar la sesión actual.
 */
export async function logout() {
  return await firebaseSignOut(auth);
}

/**
 * Suscripción al estado de autenticación.
 */
export function onAuthUserChange(callback) {
  return onAuthStateChanged(auth, callback);
}
