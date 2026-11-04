// Etiquetas y colores del panel
export const NIVELES = Object.freeze([
  Object.freeze({ key: 'bajo', label: 'Bajo', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' }),
  Object.freeze({ key: 'medio', label: 'Medio', bar: 'bg-gold-400', badge: 'bg-yellow-100 text-yellow-800' }),
  Object.freeze({ key: 'alto', label: 'Alto', bar: 'bg-sun-500', badge: 'bg-orange-100 text-orange-800' }),
  Object.freeze({ key: 'muy_alto', label: 'Muy alto', bar: 'bg-red-600', badge: 'bg-red-100 text-red-800' }),
]);

export const NIVEL_POR_CLAVE = Object.freeze(Object.fromEntries(NIVELES.map((nivel) => [nivel.key, nivel])));

// Secciones del panel. `soloSuperadmin` oculta la opción a quienes tienen el rol admin.
export const SECCIONES = Object.freeze([
  Object.freeze({ key: 'resumen', label: 'Resumen', soloSuperadmin: false }),
  Object.freeze({ key: 'participaciones', label: 'Participaciones', soloSuperadmin: false }),
  Object.freeze({ key: 'correo', label: 'Correo', soloSuperadmin: false }),
  Object.freeze({ key: 'administradores', label: 'Administradores', soloSuperadmin: true }),
  Object.freeze({ key: 'bitacora', label: 'Bitácora', soloSuperadmin: true }),
  Object.freeze({ key: 'cuenta', label: 'Mi cuenta', soloSuperadmin: false }),
]);

export const ROLES = Object.freeze({ superadmin: 'Superadministrador', admin: 'Administrador' });

export const TIPOS_ERROR_CORREO = Object.freeze({
  cuota: 'Límite diario de la cuenta',
  credenciales: 'Credenciales rechazadas',
  destinatario: 'Dirección del destinatario',
  temporal: 'Error temporal',
});

export const ACCIONES_BITACORA = Object.freeze({
  login_ok: 'Inicio de sesión',
  login_fallido: 'Intento de inicio fallido',
  login_bloqueado: 'Intento en cuenta bloqueada',
  logout: 'Cierre de sesión',
  cambio_contrasena: 'Cambio de contraseña',
  cambio_contrasena_fallido: 'Cambio de contraseña fallido',
  ver_participacion: 'Consulta de participación',
  eliminar_participacion: 'Eliminación de participación',
  exportar_participaciones: 'Exportación de participaciones',
  reenviar_correos: 'Reenvío de correos de resultados',
  crear_cuenta_correo: 'Alta de cuenta de correo',
  editar_cuenta_correo: 'Edición de cuenta de correo',
  crear_administrador: 'Alta de administrador',
  crear_administrador_terminal: 'Alta de administrador (terminal)',
  editar_administrador: 'Edición de administrador',
  restablecer_contrasena: 'Restablecimiento de contraseña',
  restablecer_contrasena_terminal: 'Restablecimiento de contraseña (terminal)',
});

// Motivo por el que un reenvío masivo se detuvo antes de terminar.
export const MOTIVOS_DETENCION = Object.freeze({
  sin_cuentas: 'Se acabó el cupo de las cuentas de envío. Lo que falta sigue pendiente: inténtalo cuando haya cupo (mañana o agregando otra cuenta).',
  apagado: 'El servidor se reinició durante el envío. Lo que falta sigue pendiente.',
  error: 'Ocurrió un error inesperado y el envío se detuvo. Lo que falta sigue pendiente.',
});

export const PAGE_SIZE = 25;
