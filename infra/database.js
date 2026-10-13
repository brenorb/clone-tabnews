const { Pool } = require("pg");
const getDatabaseConfig = require("./database-config");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      ...getDatabaseConfig(),
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
