import database from "../../../infra/database";

export default async function status(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await database.query(`
      SELECT current_setting('server_version') AS version,
             current_setting('max_connections')::int AS max_connections,
             (SELECT count(*)::int FROM pg_stat_activity
              WHERE datname = current_database()) AS opened_connections
    `);
    return response.status(200).json({
      updated_at: new Date().toISOString(),
      dependencies: { database: result.rows[0] },
    });
  } catch {
    return response.status(503).json({ error: "Database unavailable" });
  }
}
