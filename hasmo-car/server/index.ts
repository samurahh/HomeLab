import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import db from "./db.ts";

const app = new Hono();

app.use("/api/*", cors());

// --- Cars ---

app.get("/api/cars", (c) => {
  const cars = db.query("SELECT * FROM cars ORDER BY id").all();
  return c.json(cars);
});

app.get("/api/cars/:id", (c) => {
  const car = db.query("SELECT * FROM cars WHERE id = ?").get(c.req.param("id"));
  if (!car) return c.json({ error: "Not found" }, 404);
  return c.json(car);
});

app.post("/api/cars", async (c) => {
  const { alias } = await c.req.json();
  const result = db.run("INSERT INTO cars (alias) VALUES (?)", alias || "New Car");
  const car = db.query("SELECT * FROM cars WHERE id = ?").get(result.lastInsertRowid);
  return c.json(car, 201);
});

app.put("/api/cars/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const fields = ["alias", "make", "model", "year", "license_plate", "fuel_type", "picture"];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    if (field in body) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (updates.length === 0) return c.json({ error: "No fields to update" }, 400);

  values.push(id);
  db.run(`UPDATE cars SET ${updates.join(", ")} WHERE id = ?`, ...values);
  const car = db.query("SELECT * FROM cars WHERE id = ?").get(id);
  return c.json(car);
});

app.delete("/api/cars/:id", (c) => {
  const id = c.req.param("id");
  const count = db.query("SELECT COUNT(*) as count FROM cars").get() as { count: number };
  if (count.count <= 1) return c.json({ error: "Cannot delete the last car" }, 400);
  db.run("DELETE FROM cars WHERE id = ?", id);
  return c.json({ ok: true });
});

// --- Fuel Records ---

app.get("/api/cars/:carId/fuel", (c) => {
  const carId = c.req.param("carId");
  const records = db
    .query("SELECT * FROM fuel_records WHERE car_id = ? ORDER BY date ASC, odometer ASC")
    .all(carId);
  return c.json(records);
});

app.post("/api/cars/:carId/fuel", async (c) => {
  const carId = c.req.param("carId");
  const { date, odometer, fuel_quantity, total_cost } = await c.req.json();

  const stmt = db.query(
    "INSERT INTO fuel_records (car_id, date, odometer, fuel_quantity, total_cost) VALUES (?1, ?2, ?3, ?4, ?5)"
  );
  const result = stmt.run(
    carId,
    date,
    odometer != null ? odometer : null,
    fuel_quantity,
    total_cost
  );

  const record = db.query("SELECT * FROM fuel_records WHERE id = ?").get(result.lastInsertRowid);
  return c.json(record, 201);
});

app.delete("/api/cars/:carId/fuel/:id", (c) => {
  const id = c.req.param("id");
  db.run("DELETE FROM fuel_records WHERE id = ?", id);
  return c.json({ ok: true });
});

// --- Service Records ---

app.get("/api/cars/:carId/service", (c) => {
  const carId = c.req.param("carId");
  const records = db
    .query("SELECT * FROM service_records WHERE car_id = ? ORDER BY date ASC")
    .all(carId);
  return c.json(records);
});

app.post("/api/cars/:carId/service", async (c) => {
  const carId = c.req.param("carId");
  const { date, odometer, description, cost, notes } = await c.req.json();

  const stmt = db.query(
    "INSERT INTO service_records (car_id, date, odometer, description, cost, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  );
  const result = stmt.run(
    carId,
    date,
    odometer != null ? odometer : null,
    description || "",
    cost || 0,
    notes || ""
  );

  const record = db.query("SELECT * FROM service_records WHERE id = ?").get(result.lastInsertRowid);
  return c.json(record, 201);
});

app.delete("/api/cars/:carId/service/:id", (c) => {
  const id = c.req.param("id");
  db.run("DELETE FROM service_records WHERE id = ?", id);
  return c.json({ ok: true });
});

// --- Reminders ---

app.get("/api/cars/:carId/reminders", (c) => {
  const carId = c.req.param("carId");
  const records = db
    .query("SELECT * FROM reminders WHERE car_id = ? ORDER BY created_at ASC")
    .all(carId);
  return c.json(records);
});

app.post("/api/cars/:carId/reminders", async (c) => {
  const carId = c.req.param("carId");
  const { description, notes, urgency, remind_type, remind_date, remind_odometer } = await c.req.json();

  const stmt = db.query(
    "INSERT INTO reminders (car_id, description, notes, urgency, remind_type, remind_date, remind_odometer) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  );
  const result = stmt.run(
    carId,
    description || "",
    notes || "",
    urgency || "normal",
    remind_type || "date",
    remind_date || null,
    remind_odometer != null ? remind_odometer : null
  );

  const record = db.query("SELECT * FROM reminders WHERE id = ?").get(result.lastInsertRowid);
  return c.json(record, 201);
});

app.delete("/api/cars/:carId/reminders/:id", (c) => {
  const id = c.req.param("id");
  db.run("DELETE FROM reminders WHERE id = ?", id);
  return c.json({ ok: true });
});

// --- Insurance Records ---

app.get("/api/cars/:carId/insurance", (c) => {
  const carId = c.req.param("carId");
  const records = db
    .query("SELECT * FROM insurance_records WHERE car_id = ? ORDER BY start_date ASC")
    .all(carId);
  return c.json(records);
});

app.post("/api/cars/:carId/insurance", async (c) => {
  const carId = c.req.param("carId");
  const { start_date, end_date, odometer, price, type, notes } = await c.req.json();

  const stmt = db.query(
    "INSERT INTO insurance_records (car_id, start_date, end_date, odometer, price, type, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  );
  const result = stmt.run(
    carId,
    start_date,
    end_date,
    odometer != null ? odometer : null,
    price || 0,
    type || "RCA",
    notes || ""
  );

  const record = db.query("SELECT * FROM insurance_records WHERE id = ?").get(result.lastInsertRowid);
  return c.json(record, 201);
});

app.delete("/api/cars/:carId/insurance/:id", (c) => {
  const id = c.req.param("id");
  db.run("DELETE FROM insurance_records WHERE id = ?", id);
  return c.json({ ok: true });
});

// Static file serving (production)
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ root: "./dist", path: "/index.html" }));

export default {
  port: parseInt(process.env.PORT || "3001"),
  fetch: app.fetch,
};
