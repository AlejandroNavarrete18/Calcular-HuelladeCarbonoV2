import mysql from 'mysql2/promise';

const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Crea el pool de conexiones a MySQL.
 * Las credenciales llegan desde las variables de entorno (server/.env), nunca escritas en el código.
 *
 * @param {{host: string, port: number, user: string, password: string, database: string, connectionLimit: number}} dbConfig
 */
export function createDatabasePool({ connectionLimit, ...connection }) {
  return mysql.createPool({
    ...connection,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    connectTimeout: CONNECT_TIMEOUT_MS,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    timezone: 'local',
    decimalNumbers: true, // DECIMAL llega como número, no como texto
    dateStrings: true, // DATE/DATETIME llegan como texto "AAAA-MM-DD ..."
  });
}

/**
 * Comprueba que la base de datos responde. Se usa al arrancar para fallar rápido y con un mensaje claro.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export async function verifyDatabaseConnection(pool) {
  await pool.execute('SELECT 1');
}
