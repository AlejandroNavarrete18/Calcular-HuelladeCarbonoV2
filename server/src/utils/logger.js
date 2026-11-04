const timestamp = () => new Date().toISOString();

// Logger mínimo: escribe en consola con fecha y nivel.
export const logger = {
  info: (...args) => console.log(timestamp(), '[INFO]', ...args),
  warn: (...args) => console.warn(timestamp(), '[WARN]', ...args),
  error: (...args) => console.error(timestamp(), '[ERROR]', ...args),
};
