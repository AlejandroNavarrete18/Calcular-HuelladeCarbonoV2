import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import AlertMessage from '../components/AlertMessage.jsx';
import LoginShell from '../components/LoginShell.jsx';
import { iniciarSesion } from '../adminApi.js';
import { errorMessage } from '../errors.js';

// Mismo largo máximo que se permite al crear una contraseña
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_MAX_LENGTH = 254;

// Pantalla de inicio de sesión del panel: mismo header, footer y estilo que la calculadora, con el formulario centrado
export default function LoginPage({ notice, onLoggedIn }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) {
      return;
    }
    setSending(true);
    setError('');
    try {
      const data = await iniciarSesion(correo, contrasena);
      onLoggedIn(data);
    } catch (err) {
      setError(errorMessage(err));
      // Tras un intento fallido la contraseña se borra: nunca queda escrita en la pantalla.
      setContrasena('');
      setSending(false);
    }
  }

  let PasswordIcon = Eye;
  let passwordType = 'password';
  let passwordLabel = 'Mostrar contraseña';
  if (showPassword) {
    PasswordIcon = EyeOff;
    passwordType = 'text';
    passwordLabel = 'Ocultar contraseña';
  }

  const message = error || notice;
  let describedBy;
  if (message) {
    describedBy = 'login-aviso';
  }

  return (
    <LoginShell>
      <section className="enter-screen w-full min-w-0 max-w-md overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lg">
        <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-navy-900 via-gold-400 to-sun-500" />

        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5 sm:p-8">
          <div>
            <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.15em] text-sun-600">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Panel de administración
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-navy-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-muted">Escribe tu correo y tu contraseña para entrar.</p>
          </div>

          <div id="login-aviso">
            <AlertMessage>{message}</AlertMessage>
          </div>

          <div>
            <label htmlFor="correo" className="field-label">
              Correo
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="correo"
                name="correo"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={correo}
                maxLength={EMAIL_MAX_LENGTH}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                onChange={(event) => setCorreo(event.target.value)}
                className="field-input !pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contrasena" className="field-label">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="contrasena"
                name="contrasena"
                type={passwordType}
                autoComplete="current-password"
                value={contrasena}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                onChange={(event) => setContrasena(event.target.value)}
                onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                onBlur={() => setCapsLock(false)}
                className="field-input !pl-10 !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={passwordLabel}
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted hover:bg-navy-50"
              >
                <PasswordIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {capsLock && (
              <p role="status" className="mt-1.5 text-sm font-semibold text-sun-600">
                Tienes activado el bloqueo de mayúsculas.
              </p>
            )}
          </div>

          <button type="submit" disabled={sending || !correo || !contrasena} className="btn-primary w-full">
            {sending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {sending && 'Entrando…'}
            {!sending && 'Entrar'}
          </button>

          <div className="flex justify-center border-t border-navy-100 pt-4 text-sm">
            <a href="/" className="inline-flex min-h-10 items-center gap-1.5 font-bold text-navy-700 hover:underline">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Ir a la calculadora
            </a>
          </div>
        </form>
      </section>
    </LoginShell>
  );
}
