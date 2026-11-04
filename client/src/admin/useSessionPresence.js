import { useEffect } from 'react';
import { avisarCierre, enviarLatido } from './adminApi.js';

const HEARTBEAT_MS = 15_000;
// Eventos que cuentan como "la persona está usando el panel" para el reloj de inactividad del servidor.
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const CHANNEL_NAME = 'huella-admin-presencia';
// Tras avisar que otra pestaña se cierra, esta confirma que sigue abierta (dos veces: los temporizadores de una pestaña oculta se frenan).
const CONFIRM_DELAYS_MS = [1_000, 6_000];

/*
 * Mantiene viva la sesión mientras la página está abierta y la termina cuando se cierra:
 *  - al cerrar la pestaña o el navegador avisa al servidor (sendBeacon) y, si no hay más señales, la sesión termina;
 *  - mientras la página está abierta manda un latido que cancela ese aviso (recargas, otras pestañas del panel);
 *  - el latido informa si hubo actividad real: sin actividad, la sesión se cierra sola por inactividad.
 * Solo funciona mientras `active` sea true (hay una sesión abierta).
 */
export function useSessionPresence(active) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let hadActivity = false;
    const markActivity = () => {
      hadActivity = true;
    };
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, markActivity, { passive: true });
    }

    // Un fallo de red no es motivo para cerrar la sesión: un 401 ya lo atiende adminApi.
    const beat = () => {
      const wasActive = hadActivity;
      hadActivity = false;
      enviarLatido(wasActive).catch(() => {
        hadActivity ||= wasActive;
      });
    };
    const timer = setInterval(beat, HEARTBEAT_MS);

    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
    const confirmTimers = [];
    if (channel) {
      channel.onmessage = () => {
        for (const delay of CONFIRM_DELAYS_MS) {
          confirmTimers.push(setTimeout(() => enviarLatido(false).catch(() => {}), delay));
        }
      };
    }

    const handlePageHide = () => {
      avisarCierre();
      channel?.postMessage('cerrando');
    };
    // Si el navegador restaura la página desde su caché (botón atrás), el aviso anterior se cancela de inmediato.
    const handlePageShow = (event) => {
      if (event.persisted) {
        beat();
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      clearInterval(timer);
      confirmTimers.forEach(clearTimeout);
      channel?.close();
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, markActivity);
      }
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [active]);
}
