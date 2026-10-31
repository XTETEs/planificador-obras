import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
  Search,
  Eye,
  Calendar,
  Building,
  CheckCircle2,
  Trash2,
  X,
  Clock,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  subscribeToCorporateUsers,
  registerCorporateUser,
  updateUserRole,
  deleteCorporateUser,
  getUserActivityStats
} from '../services/db.js';
import { CORPORATE_DOMAIN, isUserAdmin, removeSavedAccount } from '../services/auth.js';

export function AdminUsersModal({
  isOpen,
  onClose,
  currentUser,
  onSwitchUserView,
  viewingAsUser,
  onResetView
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'user'
  const [userStats, setUserStats] = useState({}); // { [uid]: { obras: 0, tareas: 0, notas: 0 } }
  const [loadingStats, setLoadingStats] = useState({});
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Formulario nuevo usuario
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Escucha en tiempo real de usuarios
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const unsub = subscribeToCorporateUsers((userList) => {
      setUsers(userList);
      setLoading(false);

      // Cargar estadísticas de actividad de forma asíncrona
      userList.forEach(async (u) => {
        if (!userStats[u.uid]) {
          try {
            const stats = await getUserActivityStats(u.uid);
            setUserStats(prev => ({ ...prev, [u.uid]: stats }));
          } catch (e) {}
        }
      });
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isOpen]);

  // Listener para cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtrado de usuarios
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'all' ||
      (roleFilter === 'admin' && (u.rol === 'admin' || isUserAdmin(u.email))) ||
      (roleFilter === 'user' && u.rol !== 'admin' && !isUserAdmin(u.email));

    return matchesQuery && matchesRole;
  });

  const totalAdmins = users.filter(u => u.rol === 'admin' || isUserAdmin(u.email)).length;
  const totalStandard = users.length - totalAdmins;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    let cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      cleanEmail += `@${CORPORATE_DOMAIN}`;
    }

    if (!cleanEmail.endsWith(`@${CORPORATE_DOMAIN}`)) {
      setFormError(`El correo debe terminar en @${CORPORATE_DOMAIN}`);
      return;
    }

    setSubmitting(true);
    try {
      await registerCorporateUser({
        email: cleanEmail,
        displayName: newName.trim(),
        rol: newRole
      });
      setFormSuccess(`Usuario ${cleanEmail} registrado satisfactoriamente.`);
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess(null);
      }, 2000);
    } catch (err) {
      setFormError(err.message || 'Error al registrar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRole = async (user) => {
    if (user.email === currentUser?.email) {
      alert('No puedes revocar tus propios privilegios de administrador.');
      return;
    }
    const currentIsAdmin = user.rol === 'admin' || isUserAdmin(user.email);
    const newTargetRole = currentIsAdmin ? 'user' : 'admin';
    const confirmMsg = currentIsAdmin
      ? `¿Deseas cambiar a ${user.displayName || user.email} al rol de Usuario estándar?`
      : `¿Deseas otorgar permisos de Administrador a ${user.displayName || user.email}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await updateUserRole(user.uid, newTargetRole);
    } catch (err) {
      alert('Error actualizando rol: ' + err.message);
    }
  };

  const handleRequestDeleteUser = (user) => {
    if (user.email === currentUser?.email) {
      alert('No puedes eliminar tu propia cuenta mientras estás conectado.');
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteCorporateUser(userToDelete.uid);
      removeSavedAccount(userToDelete.email);
      setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
      setUserToDelete(null);
    } catch (err) {
      alert('Error eliminando usuario corporativo: ' + (err?.message || err));
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleLoadUserStats = async (uid) => {
    setLoadingStats(prev => ({ ...prev, [uid]: true }));
    try {
      const stats = await getUserActivityStats(uid);
      setUserStats(prev => ({ ...prev, [uid]: stats }));
    } catch (e) {
    } finally {
      setLoadingStats(prev => ({ ...prev, [uid]: false }));
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Sin fecha';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Nunca';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        
        {/* CABECERA MODAL */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">Panel de Administración</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ENUE Proyectos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Supervisión de usuarios registrados, roles y auditoría de planificación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE MÉTRICAS RÁPIDAS Y ACCIONES */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-4">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">Total Registrados</p>
                <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{users.length}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">Administradores</p>
                <p className="text-lg sm:text-xl font-black text-amber-600 leading-tight">{totalAdmins}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">Usuarios Estándar</p>
                <p className="text-lg sm:text-xl font-black text-emerald-700 leading-tight">{totalStandard}</p>
              </div>
            </div>
          </div>

          {/* FILTROS Y BOTÓN AÑADIR */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o correo @enue.es..."
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Todos los roles</option>
                <option value="admin">Solo Admins</option>
                <option value="user">Solo Usuarios</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {viewingAsUser && (
                <button
                  type="button"
                  onClick={onResetView}
                  className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-emerald-300"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Volver a Mi Sesión ({currentUser?.displayName || 'Ximo'})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddForm(prev => !prev)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{showAddForm ? 'Cerrar Registro' : '+ Registrar Usuario'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* FORMULARIO DESPLEGABLE DE ALTA DE USUARIO */}
        {showAddForm && (
          <form
            onSubmit={handleCreateUser}
            className="p-5 bg-amber-50/70 border-b border-amber-200 shrink-0 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Pre-autorizar Nuevo Usuario Corporativo ENUE</span>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Correo Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@enue.es"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Carlos Martínez"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Rol Asignado
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="user">Usuario Estándar (Planificador Propio)</option>
                  <option value="admin">Administrador (Acceso a todos los usuarios)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar y Autorizar'}
              </button>
            </div>
          </form>
        )}

        {/* LISTA DE USUARIOS REGISTRADOS */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-bold">Cargando usuarios registrados desde Firestore...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No se encontraron usuarios</p>
              <p className="text-xs text-slate-400">Prueba con otro término de búsqueda o registra un nuevo usuario corporativo.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((user) => {
                const isAdmin = user.rol === 'admin' || isUserAdmin(user.email);
                const isMe = user.email === currentUser?.email;
                const isCurrentlyViewing = viewingAsUser && viewingAsUser.uid === user.uid;
                const stats = userStats[user.uid] || { obras: 0, tareas: 0, notas: 0 };
                const isLoadingStatsForThis = loadingStats[user.uid];

                return (
                  <div
                    key={user.uid}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrentlyViewing
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                        : isMe
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    } flex flex-col md:flex-row md:items-center justify-between gap-3`}
                  >
                    {/* Identidad de usuario */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                        isAdmin
                          ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 ring-2 ring-amber-400/40'
                          : 'bg-gradient-to-tr from-slate-800 to-slate-700 text-white'
                      }`}>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">
                            {user.displayName || user.email.split('@')[0]}
                          </h4>

                          {isMe && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                              Tú (Sesión activa)
                            </span>
                          )}

                          {isCurrentlyViewing && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950 animate-pulse">
                              Supervisando ahora
                            </span>
                          )}

                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              Administrador
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              Usuario Estándar
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                          {user.email}
                        </p>

                        {/* Metadatos y actividad */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1" title="Primer registro en el sistema">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Alta: <strong className="text-slate-600 font-semibold">{formatDate(user.fecha_creado)}</strong>
                          </span>

                          <span className="flex items-center gap-1" title="Último acceso a la aplicación">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Último acceso: <strong className="text-slate-600 font-semibold">{formatDateTime(user.ultimo_acceso)}</strong>
                          </span>

                          {/* Conteo de actividad */}
                          <div className="inline-flex items-center gap-2 bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-medium">
                            <span>🏗️ <strong>{stats.obras || 0}</strong> obras</span>
                            <span>•</span>
                            <span>📋 <strong>{stats.tareas || 0}</strong> tareas</span>
                            <button
                              type="button"
                              onClick={() => handleLoadUserStats(user.uid)}
                              className="text-slate-400 hover:text-slate-700 ml-1 p-0.5 cursor-pointer border-none bg-transparent"
                              title="Refrescar conteo"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${isLoadingStatsForThis ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN PARA EL ADMINISTRADOR */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
                      {/* Supervisar Planificador */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isCurrentlyViewing) {
                            onResetView();
                          } else {
                            onSwitchUserView(user);
                            onClose();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                          isCurrentlyViewing
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                        }`}
                        title="Ver y supervisar el cronograma y tareas semanales de este usuario"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isCurrentlyViewing ? 'Dejar de Supervisar' : 'Supervisar Plan'}</span>
                      </button>

                      {/* Cambiar Rol */}
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => handleToggleRole(user)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-200"
                          title={isAdmin ? 'Degradar a usuario normal' : 'Promocionar a Administrador'}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      )}

                      {/* Eliminar usuario */}
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteUser(user)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
                          title="Eliminar usuario corporativo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <p className="text-[11px] leading-tight text-center sm:text-left">
            ℹ️ <strong className="text-slate-700">Acceso Seguro ENUE:</strong> Todos los miembros con correo terminando en <strong className="text-slate-800">@{CORPORATE_DOMAIN}</strong> pueden registrarse y acceder. Como administrador, puedes auditar la actividad de cualquier usuario.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl cursor-pointer transition-all border-none shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* CARTEL DE CONFIRMACIÓN PARA ELIMINAR USUARIO */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => { if (!isDeletingUser) setUserToDelete(null); }}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl max-w-sm w-full text-center space-y-4 animate-scaleIn border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center ring-8 ring-red-50 shadow-md">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">¿Eliminar usuario?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Estás a punto de eliminar al usuario <strong className="text-slate-900 font-bold">{userToDelete.displayName || userToDelete.email}</strong>.
              </p>
              <p className="text-[11px] font-mono text-slate-500 bg-slate-100 p-2 rounded-xl break-all">
                {userToDelete.email}
              </p>
              <p className="text-[11px] text-red-600 font-semibold pt-1">
                ⚠️ Se borrará su registro de Firestore y todas sus obras y tareas asociadas.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors border-none disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer transition-colors shadow-lg shadow-red-600/20 border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
