const database = require("../../infra/database");

afterAll(() => database.close());

test("a real database accepts parameterized values", async () => {
  const result = await database.query({
    text: "SELECT $1::text AS value",
    values: ["literal'value"],
  });
  expect(result.rows[0].value).toBe("literal'value");
});

test("a failed query does not exhaust the reusable pool", async () => {
  await expect(database.query("SELECT FROM")).rejects.toThrow();
  const results = await Promise.all(
    Array.from({ length: 20 }, () => database.query("SELECT 1 AS value")),
  );
  expect(results.every((result) => result.rows[0].value === 1)).toBe(true);
});

test("closing permits a fresh query with a new pool", async () => {
  await database.close();
  const result = await database.query("SELECT 1 AS value");
  expect(result.rows[0].value).toBe(1);
});
