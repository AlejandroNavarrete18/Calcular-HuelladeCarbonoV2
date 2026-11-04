// constantes de la app

//Pantallas del flujo, en orden
export const SCREENS = Object.freeze({
  INTRO: 'intro',
  THANKS: 'thanks',
  QUIZ: 'quiz',
  CONTACT: 'contact',
  RESULTS: 'results',
});

// Estado del correo, tal como lo informa el servidor al guardar la participación.
export const EMAIL_STATE = Object.freeze({
  QUEUED: 'queued', // el servidor lo está enviando
  NOT_SENT: 'not_sent', // no se envió (la dirección ya recibió varios correos)
});

// Estado del formulario final mientras se guarda la participación.
export const SEND_STATUS = Object.freeze({
  IDLE: 'idle',
  SENDING: 'sending',
  ERROR: 'error',
  DONE: 'done', // guardada: el botón sigue bloqueado mientras se cambia de pantalla para evitar que se envíe otra vez
});

// Estado de una lista que se descarga del servidor (unidades, escuelas, municipios).
export const LIST_STATUS = Object.freeze({
  IDLE: 'idle', // todavía no se necesita (ej. no se ha elegido unidad regional)
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
});

// Duración (ms) de la animación de salida entre pantallas.
export const LEAVE_MS = 220;
