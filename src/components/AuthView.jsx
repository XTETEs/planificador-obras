import React, { useState } from 'react';
import {
  Building,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
  isCorporateEmail,
  getAuthErrorMessage,
  CORPORATE_DOMAIN
} from '../services/auth.js';

export function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Validación rápida de dominio
  const trimmedEmail = email.trim().toLowerCase();
  const hasDomainError = trimmedEmail.length > 0 && trimmedEmail.includes('@') && !isCorporateEmail(trimmedEmail);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    if (!trimmedEmail) {
      setError('Por favor, introduce tu correo corporativo.');
      return;
    }

    if (!isCorporateEmail(trimmedEmail)) {
      setError(`Acceso restringido: Solo se admiten correos corporativos oficiales terminados en @${CORPORATE_DOMAIN}`);
      return;
    }

    if (mode === 'forgot') {
      try {
        setLoading(true);
        await resetPassword(trimmedEmail);
        setSuccessInfo(`Hemos enviado un enlace de recuperación a ${trimmedEmail}. Revisa tu bandeja de entrada.`);
        setLoading(false);
      } catch (err) {
        setError(getAuthErrorMessage(err));
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Introduce tu contraseña.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        const res = await loginWithEmail(trimmedEmail, password);
        if (onAuthSuccess) onAuthSuccess(res.user);
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          setError('Introduce tu nombre y apellidos para identificarte en el planificador.');
          setLoading(false);
          return;
        }
        const res = await registerWithEmail(trimmedEmail, password, displayName);
        if (onAuthSuccess) onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessInfo(null);
    try {
      setLoading(true);
      const res = await loginWithGoogle();
      if (onAuthSuccess) onAuthSuccess(res.user);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Fondo estético arquitectónico */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Resplandores dorados de marca */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Cabecera / Identidad corporativa */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 mb-4 ring-8 ring-amber-500/10">
            <Building className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Planificador Semanal
          </h1>
          <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase mt-1">
            Actividades y Repasos • ENUE Proyectos
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Acceso exclusivo con correo corporativo <strong className="text-white">@{CORPORATE_DOMAIN}</strong></span>
          </div>
        </div>

        {/* Tarjeta de Acceso */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Mensajes de Alerta */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {successInfo && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{successInfo}</div>
            </div>
          )}

          {/* Botón Google Workspace (Opción 1-click preferida para empresas) */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar con Google Workspace</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                    o con correo de empresa
                  </span>
                </div>
              </div>

              {/* Selector Modo Iniciar Sesión / Registrarse */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
                <KeyRound className="w-4 h-4" />
                <span>Restablecer contraseña</span>
              </div>
              <p className="text-xs text-slate-400">
                Introduce tu correo de ENUE y te enviaremos un enlace oficial para asignar una nueva clave.
              </p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre y Apellidos
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. Carlos Navarro"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Correo Corporativo
                </label>
                <span className="text-[11px] text-amber-400/90 font-mono">@{CORPORATE_DOMAIN}</span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`nombre.apellido@${CORPORATE_DOMAIN}`}
                  className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all ${
                    hasDomainError
                      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  }`}
                />
              </div>
              {hasDomainError && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Debes utilizar tu dirección oficial con dominio @{CORPORATE_DOMAIN}
                </p>
              )}
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Contraseña
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || hasDomainError}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Comprobando credenciales...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Entrar a mi sesión'}
                    {mode === 'register' && 'Crear mi cuenta corporativa'}
                    {mode === 'forgot' && 'Enviar enlace de recuperación'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>

        {/* Pie de seguridad */}
        <div className="mt-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
          <span>Sistema Seguro de Planificación</span>
          <span>•</span>
          <span>ENUE Proyectos © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
