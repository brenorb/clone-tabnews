import status from "../../pages/api/v1/status";
import database from "../../infra/database";

jest.mock("../../infra/database", () => ({ query: jest.fn() }));

function response() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

beforeEach(() => jest.clearAllMocks());

test("GET reports a live database probe and a valid timestamp", async () => {
  database.query.mockResolvedValue({
    rows: [{ version: "16.15", max_connections: 100, opened_connections: 2 }],
  });
  const res = response();
  await status({ method: "GET" }, res);
  expect(database.query).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(200);
  const payload = res.json.mock.calls[0][0];
  expect(Number.isNaN(Date.parse(payload.updated_at))).toBe(false);
  expect(payload.dependencies.database).toEqual({
    version: "16.15",
    max_connections: 100,
    opened_connections: 2,
  });
  expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
});

test("unsupported methods never probe the database", async () => {
  const res = response();
  await status({ method: "POST" }, res);
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith("Allow", "GET");
  expect(database.query).not.toHaveBeenCalled();
});

test("database failures produce 503 without returning connection details", async () => {
  database.query.mockRejectedValue(new Error("sensitive connection detail"));
  const res = response();
  await status({ method: "GET" }, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ error: "Database unavailable" });
});
