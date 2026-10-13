const path = require("node:path");
const { runner, Migration } = require("node-pg-migrate");
const getDatabaseConfig = require("./database-config");

const defaultDirectory = path.join(__dirname, "migrations");

async function runMigrations({
  direction = "up",
  dryRun = false,
  migrationsDir = defaultDirectory,
  databaseConfig = getDatabaseConfig(),
  schema = "public",
  logger = console,
} = {}) {
  if (!["up", "down"].includes(direction)) {
    throw new Error("Migration direction must be up or down");
  }
  return runner({
    databaseUrl: databaseConfig,
    dir: migrationsDir,
    direction,
    count: direction === "down" ? 1 : Infinity,
    dryRun,
    schema,
    migrationsSchema: schema,
    migrationsTable: "pgmigrations",
    checkOrder: true,
    singleTransaction: true,
    noLock: false,
    verbose: false,
    logger,
  });
}

async function createMigration(name, directory = defaultDirectory) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name || "")) {
    throw new Error("Use a kebab-case migration name, e.g. create-posts");
  }
  const templateFileName = path.resolve(
    path.dirname(require.resolve("node-pg-migrate")),
    "../templates/migration-template.js",
  );
  return Migration.create(name, directory, { templateFileName });
}

module.exports = { runMigrations, createMigration };
