const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || "127.0.0.1",
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DB || "local_db",
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "local_password",
      max: 10,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 10000,
    });
    pool.on("error", (error) => {
      console.error("Idle database connection failed", { code: error.code });
    });
  }
  return pool;
}

async function query(queryObject) {
  return getPool().query(queryObject);
}

async function close() {
  const currentPool = pool;
  pool = undefined;
  if (currentPool) await currentPool.end();
}

module.exports = { query, close };
