const { Client } = require("pg");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const getDatabaseConfig = require("../../infra/database-config");
const { runMigrations } = require("../../infra/migrations");

const schema = `migration_test_${randomBytes(6).toString("hex")}`;
let client;
let temporaryDir;
let lifecycleDir;

beforeAll(async () => {
  client = new Client(getDatabaseConfig());
  await client.connect();
  await client.query(`CREATE SCHEMA "${schema}"`);
  lifecycleDir = await fs.mkdtemp(path.join(os.tmpdir(), "initial-migration-"));
  await fs.copyFile(
    path.resolve(
      __dirname,
      "../../infra/migrations/1791849600000_create-users.js",
    ),
    path.join(lifecycleDir, "1791849600000_create-users.js"),
  );
});

afterAll(async () => {
  if (client) {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
  if (lifecycleDir) await fs.rm(lifecycleDir, { recursive: true, force: true });
  if (temporaryDir) await fs.rm(temporaryDir, { recursive: true, force: true });
});

function migrate(options = {}) {
  return runMigrations({
    direction: "up",
    migrationsDir: lifecycleDir,
    schema,
    databaseConfig: getDatabaseConfig(),
    logger: { info() {}, debug() {}, warn() {}, error() {} },
    ...options,
  });
}

test("dry run, apply, repeat, rollback and reapply work on a real schema", async () => {
  await migrate({ dryRun: true });
  expect(
    (await client.query("SELECT to_regclass($1) AS name", [`${schema}.users`]))
      .rows[0].name,
  ).toBeNull();
  await migrate();
  await migrate();
  expect(
    (
      await client.query(
        `SELECT count(*)::int AS count FROM "${schema}".pgmigrations`,
      )
    ).rows[0].count,
  ).toBe(1);
  const inserted = await client.query(
    `INSERT INTO "${schema}".users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, created_at`,
    ["fixture", "fixture@example.test", "fixture-only-hash"],
  );
  expect(inserted.rows[0].id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  expect(inserted.rows[0].created_at).toBeInstanceOf(Date);
  await expect(
    client.query(
      `INSERT INTO "${schema}".users (username, email, password_hash) VALUES ($1, $2, $3)`,
      ["fixture", "another@example.test", "fixture-only-hash"],
    ),
  ).rejects.toMatchObject({ code: "23505" });
  await migrate({ direction: "down" });
  expect(
    (await client.query("SELECT to_regclass($1) AS name", [`${schema}.users`]))
      .rows[0].name,
  ).toBeNull();
  expect(
    (
      await client.query(
        `SELECT count(*)::int AS count FROM "${schema}".pgmigrations`,
      )
    ).rows[0].count,
  ).toBe(0);
  await migrate();
  expect(
    (await client.query(`SELECT count(*)::int AS count FROM "${schema}".users`))
      .rows[0].count,
  ).toBe(0);
});

test("failed DDL rolls back application changes and migration tracking", async () => {
  await migrate({ direction: "down" });
  temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), "failed-migration-"));
  await fs.writeFile(
    path.join(temporaryDir, "1791849600001_failed.js"),
    'exports.up = pgm => { pgm.createTable("must_rollback", { id: "integer" }); pgm.sql("SELECT nonexistent_migration_function()"); }; exports.down = pgm => pgm.dropTable("must_rollback");',
  );
  await expect(migrate({ migrationsDir: temporaryDir })).rejects.toThrow();
  expect(
    (
      await client.query("SELECT to_regclass($1) AS name", [
        `${schema}.must_rollback`,
      ])
    ).rows[0].name,
  ).toBeNull();
  expect(
    (
      await client.query(
        `SELECT count(*)::int AS count FROM "${schema}".pgmigrations`,
      )
    ).rows[0].count,
  ).toBe(0);
});
