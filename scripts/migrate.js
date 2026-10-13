const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { runMigrations, createMigration } = require("../infra/migrations");

async function main() {
  const [command, argument, ...extra] = process.argv.slice(2);
  if (command === "create" && argument && extra.length === 0) {
    console.log(await createMigration(argument));
    return;
  }
  if (
    !["up", "down"].includes(command) ||
    extra.length ||
    (argument && argument !== "--dry-run")
  ) {
    throw new Error("Usage: migrate.js up|down [--dry-run] OR create <name>");
  }
  loadEnvConfig(
    path.resolve(__dirname, ".."),
    process.env.NODE_ENV !== "production",
  );
  const applied = await runMigrations({
    direction: command,
    dryRun: argument === "--dry-run",
  });
  console.log(
    `${argument === "--dry-run" ? "Planned" : "Applied"} ${applied.length} migration(s)`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
