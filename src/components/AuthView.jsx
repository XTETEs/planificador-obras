import React, { useState, useEffect } from 'react';
import {
  Building,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import {
  loginWithCorporateEmail,
  isCorporateEmail,
  getSavedAccounts,
  removeSavedAccount,
  getDisplayNameFromEmail,
  CORPORATE_DOMAIN
} from '../services/auth.js';

export function AuthView({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [isChangingAccount, setIsChangingAccount] = useState(false);

  useEffect(() => {
    const accounts = getSavedAccounts();
    setSavedAccounts(accounts);
    if (accounts.length > 0 && !email) {
      // Pre-cargar el correo más reciente
      setEmail(accounts[0].email);
      setDisplayName(accounts[0].displayName || '');
    }
  }, []);

  const trimmedEmail = email.trim().toLowerCase();
  const hasDomainError = trimmedEmail.length > 0 && trimmedEmail.includes('@') && !isCorporateEmail(trimmedEmail);

  // Auto-deducir sugerencia de nombre al escribir correo
  const suggestedName = trimmedEmail.includes('@') ? getDisplayNameFromEmail(trimmedEmail) : '';

  const handleLogin = (targetEmail, targetName) => {
    setError(null);
    const finalEmail = (targetEmail || trimmedEmail).trim().toLowerCase();

    if (!finalEmail) {
      setError('Por favor, introduce tu correo corporativo.');
      return;
    }

    if (!isCorporateEmail(finalEmail)) {
      setError(`Acceso restringido: Solo se admiten correos corporativos oficiales terminados en @${CORPORATE_DOMAIN}`);
      return;
    }

    try {
      const user = loginWithCorporateEmail(finalEmail, targetName || displayName);
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'Error al acceder a la sesión.');
    }
  };

  const handleQuickAccountClick = (account) => {
    handleLogin(account.email, account.displayName);
  };

  const handleRemoveAccount = (e, emailToRemove) => {
    e.stopPropagation();
    removeSavedAccount(emailToRemove);
    const updated = getSavedAccounts();
    setSavedAccounts(updated);
    if (trimmedEmail === emailToRemove) {
      setEmail('');
      setDisplayName('');
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
            <span>Acceso corporativo sin contraseña • <strong className="text-white">@{CORPORATE_DOMAIN}</strong></span>
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

          {/* Accesos rápidos a cuentas recientes en este dispositivo */}
          {savedAccounts.length > 0 && !isChangingAccount && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Cuentas recientes en este dispositivo:
                </span>
              </div>

              <div className="space-y-2">
                {savedAccounts.map((account) => (
                  <div
                    key={account.email}
                    onClick={() => handleQuickAccountClick(account)}
                    className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-2xl flex items-center justify-between transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-sm shadow-xs shrink-0 ring-2 ring-amber-400/20 group-hover:scale-105 transition-transform">
                        {account.displayName ? account.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {account.displayName || account.email}
                        </p>
                        <p className="text-xs text-slate-400 truncate font-mono">
                          {account.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, account.email)}
                        className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Quitar de cuentas recientes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="p-1.5 text-amber-400 group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsChangingAccount(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline decoration-amber-500/30 hover:decoration-amber-400"
                >
                  + Acceder con otro correo corporativo
                </button>
              </div>
            </div>
          )}

          {/* Formulario de Acceso Directo por Correo (Sin contraseña) */}
          {(!savedAccounts.length || isChangingAccount) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
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
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`nombre.apellido@${CORPORATE_DOMAIN}`}
                    className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-all ${
                      hasDomainError
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {hasDomainError && (
                  <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    El correo debe terminar en @{CORPORATE_DOMAIN}
                  </p>
                )}
                {!hasDomainError && suggestedName && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Sesión para: <strong className="text-slate-200">{suggestedName}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre visible (opcional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={suggestedName || 'Ej. Joaquín Martínez'}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={hasDomainError || !trimmedEmail}
                className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Entrar a mi sesión</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {savedAccounts.length > 0 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setIsChangingAccount(false)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ← Volver a cuentas recientes
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Pie de seguridad */}
        <div className="mt-8 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
          <span>Identificación Corporativa Directa</span>
          <span>•</span>
          <span>ENUE Proyectos © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
