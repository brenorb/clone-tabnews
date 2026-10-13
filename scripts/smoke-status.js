const assert = require("node:assert/strict");
const path = require("node:path");
const { createServer } = require("node:net");
const { spawn } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");

async function main() {
  const root = path.resolve(__dirname, "..");
  const port = process.env.SMOKE_PORT || "4185";
  if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) {
    throw new Error("SMOKE_PORT must be a valid TCP port");
  }
  // Fail if another server owns the port, so a probe cannot validate that app.
  await new Promise((resolve, reject) => {
    const reservation = createServer();
    reservation.once("error", reject);
    reservation.listen(+port, "127.0.0.1", () => reservation.close(resolve));
  });
  const server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      port,
    ],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  const record = (chunk) => {
    output = (output + chunk).slice(-8192);
  };
  server.stdout.on("data", record);
  server.stderr.on("data", record);
  let stopped = false;
  const exited = new Promise((resolve) => {
    server.once("exit", () => {
      stopped = true;
      resolve();
    });
    server.once("error", (error) => {
      record(error.message);
      stopped = true;
      resolve();
    });
  });
  const request = (route, options = {}) =>
    fetch(`http://127.0.0.1:${port}${route}`, {
      ...options,
      signal: AbortSignal.timeout(2000),
    });
  try {
    let ready = false;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && !stopped) {
      try {
        ready = (await request("/status")).status === 200;
      } catch {
        /* Retry startup. */
      }
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, `Production status did not become healthy.\n${output}`);
    for (const route of ["/status", "/api/v1/status"]) {
      const response = await request(route);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.json();
      assert.ok(Number.isFinite(Date.parse(body.updated_at)));
      const database = body.dependencies.database;
      assert.equal(typeof database.version, "string");
      assert.ok(database.version.length > 0);
      assert.ok(
        Number.isInteger(database.max_connections) &&
          database.max_connections > 0,
      );
      assert.ok(
        Number.isInteger(database.opened_connections) &&
          database.opened_connections > 0,
      );
      const post = await request(route, { method: "POST" });
      assert.equal(post.status, 405, route);
      assert.equal(post.headers.get("allow"), "GET");
      console.log(`${route}: GET 200, POST 405`);
    }
  } finally {
    if (!stopped) {
      server.kill("SIGTERM");
      const forceStop = setTimeout(() => server.kill("SIGKILL"), 5000);
      forceStop.unref();
      await exited;
      clearTimeout(forceStop);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
