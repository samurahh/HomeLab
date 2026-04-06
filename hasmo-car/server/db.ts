import { Database } from "bun:sqlite";
import path from "path";

const dataDir = process.env.DATA_DIR || path.join(import.meta.dirname, "..");
const dbPath = path.join(dataDir, "data.db");
const db = new Database(dbPath, { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

db.run(`
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL DEFAULT 'Default',
    make TEXT DEFAULT '',
    model TEXT DEFAULT '',
    year TEXT DEFAULT '',
    license_plate TEXT DEFAULT '',
    fuel_type TEXT DEFAULT '',
    picture TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS fuel_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    odometer REAL,
    fuel_quantity REAL NOT NULL,
    total_cost REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    odometer REAL,
    description TEXT NOT NULL DEFAULT '',
    cost REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT '',
    urgency TEXT NOT NULL DEFAULT 'normal',
    remind_type TEXT NOT NULL DEFAULT 'date',
    remind_date TEXT,
    remind_odometer REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
  )
`);

// Migrate: drop old date/odometer columns from reminders if they exist
const remCols = db.query("PRAGMA table_info(reminders)").all() as { name: string }[];
if (remCols.find((c) => c.name === "date")) {
  db.run("ALTER TABLE reminders RENAME TO reminders_old");
  db.run(`
    CREATE TABLE reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      notes TEXT DEFAULT '',
      urgency TEXT NOT NULL DEFAULT 'normal',
      remind_type TEXT NOT NULL DEFAULT 'date',
      remind_date TEXT,
      remind_odometer REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);
  db.run("INSERT INTO reminders (id, car_id, description, notes, urgency, remind_type, remind_date, remind_odometer, created_at) SELECT id, car_id, description, notes, urgency, remind_type, remind_date, remind_odometer, created_at FROM reminders_old");
  db.run("DROP TABLE reminders_old");
}

db.run(`
  CREATE TABLE IF NOT EXISTS insurance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    odometer REAL,
    price REAL NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'RCA',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
  )
`);

// Migrate: rename date to start_date + add end_date if old schema
const insCols = db.query("PRAGMA table_info(insurance_records)").all() as { name: string }[];
if (insCols.find((c) => c.name === "date") && !insCols.find((c) => c.name === "start_date")) {
  db.run("ALTER TABLE insurance_records RENAME TO insurance_records_old");
  db.run(`
    CREATE TABLE insurance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      odometer REAL,
      price REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'RCA',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);
  db.run("INSERT INTO insurance_records (id, car_id, start_date, end_date, odometer, price, type, notes, created_at) SELECT id, car_id, date, date, odometer, price, type, notes, created_at FROM insurance_records_old");
  db.run("DROP TABLE insurance_records_old");
}

// Migrate: make odometer nullable on existing databases
const columns = db.query("PRAGMA table_info(fuel_records)").all() as { name: string; notnull: number }[];
const odoCol = columns.find((c) => c.name === "odometer");
if (odoCol && odoCol.notnull === 1) {
  db.run("ALTER TABLE fuel_records RENAME TO fuel_records_old");
  db.run(`
    CREATE TABLE fuel_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      odometer REAL,
      fuel_quantity REAL NOT NULL,
      total_cost REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);
  db.run("INSERT INTO fuel_records SELECT * FROM fuel_records_old");
  db.run("DROP TABLE fuel_records_old");
}

// Ensure at least one default car exists
const carCount = db.query("SELECT COUNT(*) as count FROM cars").get() as {
  count: number;
};
if (carCount.count === 0) {
  db.run("INSERT INTO cars (alias) VALUES ('Default')");
}

export default db;
