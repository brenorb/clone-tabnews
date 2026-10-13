const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createMigration, runMigrations } = require("../../infra/migrations");

test("creator writes an up/down template without needing a database", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "migration-create-"));
  try {
    const file = await createMigration("create-posts", dir);
    const text = await fs.readFile(file, "utf8");
    expect(path.dirname(file)).toBe(dir);
    expect(text).toContain("exports.up");
    expect(text).toContain("exports.down");
    await expect(createMigration("../outside", dir)).rejects.toThrow(
      "kebab-case",
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("invalid directions are rejected before any database operation", async () => {
  await expect(runMigrations({ direction: "redo" })).rejects.toThrow(
    "up or down",
  );
});
