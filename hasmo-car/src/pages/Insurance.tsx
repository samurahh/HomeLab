import { useState, useEffect } from "react";
import type { InsuranceRecord } from "../types.ts";
import { api } from "../hooks/useApi.ts";
import Calendar from "../components/Calendar.tsx";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface InsuranceProps {
  carId: number;
}

interface InsuranceFormData {
  start_date: string;
  end_date: string;
  odometer: string;
  price: string;
  type: string;
  notes: string;
}

type SortKey = "start_date" | "end_date" | "odometer" | "price" | "type" | "notes";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

const COLUMNS: [SortKey, string][] = [
  ["type", "Type"],
  ["start_date", "Start Date"],
  ["end_date", "End Date"],
  ["odometer", "Odometer (km)"],
  ["price", "Price (RON)"],
  ["notes", "Notes"],
];

const INSURANCE_TYPES = ["RCA", "Casco"];

export default function Insurance({ carId }: InsuranceProps) {
  const [records, setRecords] = useState<InsuranceRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("start_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [calendarField, setCalendarField] = useState<"start" | "end">("start");
  const [form, setForm] = useState<InsuranceFormData>({
    start_date: todayStr(),
    end_date: todayStr(),
    odometer: "",
    price: "",
    type: "RCA",
    notes: "",
  });

  const openModal = () => {
    setForm({
      start_date: todayStr(),
      end_date: todayStr(),
      odometer: "",
      price: "",
      type: "RCA",
      notes: "",
    });
    setCalendarField("start");
    setShowModal(true);
  };

  const loadRecords = () => {
    api.get<InsuranceRecord[]>(`/cars/${carId}/insurance`).then(setRecords);
  };

  useEffect(() => {
    loadRecords();
  }, [carId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/cars/${carId}/insurance`, {
      start_date: form.start_date,
      end_date: form.end_date,
      odometer: form.odometer ? parseFloat(form.odometer) : null,
      price: form.price ? parseFloat(form.price) : 0,
      type: form.type,
      notes: form.notes,
    });
    setShowModal(false);
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this insurance record?")) return;
    await api.delete(`/cars/${carId}/insurance/${id}`);
    loadRecords();
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sortedRecords = [...records].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE);
  const pagedRecords = sortedRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Find latest record per type for status badge
  const today = todayStr();
  const latestByType: Record<string, InsuranceRecord> = {};
  for (const r of records) {
    const prev = latestByType[r.type];
    if (!prev || r.end_date > prev.end_date) {
      latestByType[r.type] = r;
    }
  }
  const latestIds = new Set(Object.values(latestByType).map((r) => r.id));

  const getStatus = (r: InsuranceRecord): "active" | "expired" | null => {
    if (!latestIds.has(r.id)) return null;
    return r.end_date >= today ? "active" : "expired";
  };

  // Metrics
  const totalCost = records.reduce((s, r) => s + r.price, 0);
  const rcaCost = records.filter((r) => r.type === "RCA").reduce((s, r) => s + r.price, 0);
  const cascoCost = records.filter((r) => r.type === "Casco").reduce((s, r) => s + r.price, 0);

  const calendarValue = calendarField === "start" ? form.start_date : form.end_date;
  const onCalendarChange = (date: string) => {
    if (calendarField === "start") {
      setForm({ ...form, start_date: date });
    } else {
      setForm({ ...form, end_date: date });
    }
  };

  return (
    <div>
      <div className="fuel-header">
        <div></div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Record
        </button>
      </div>

      {records.length > 0 && (
        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-label">Total Cost</div>
            <div className="metric-value">{totalCost.toFixed(2)} RON</div>
          </div>
          {rcaCost > 0 && (
            <div className="metric-card">
              <div className="metric-label">RCA Total</div>
              <div className="metric-value">{rcaCost.toFixed(2)} RON</div>
            </div>
          )}
          {cascoCost > 0 && (
            <div className="metric-card">
              <div className="metric-label">Casco Total</div>
              <div className="metric-value">{cascoCost.toFixed(2)} RON</div>
            </div>
          )}
          <div className="metric-card">
            <div className="metric-label">Total Records</div>
            <div className="metric-value">{records.length}</div>
          </div>
        </div>
      )}

      <div className="card">
        {records.length === 0 ? (
          <div className="empty-state">
            <h3>No insurance records yet</h3>
            <p>Add your first insurance record to start tracking.</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              + Add Record
            </button>
          </div>
        ) : (
          <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  {COLUMNS.map(([key, label]) => (
                    <th
                      key={key}
                      className="sortable-th"
                      onClick={() => toggleSort(key)}
                    >
                      {label}
                      {sortKey === key && (
                        <span className="sort-arrow">{sortDir === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((r) => {
                  const status = getStatus(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        {status === "active" && (
                          <span className="status-badge status-active">Active</span>
                        )}
                        {status === "expired" && (
                          <span className="status-badge status-expired">Expired</span>
                        )}
                      </td>
                      <td>{r.type}</td>
                      <td>{r.start_date}</td>
                      <td>{r.end_date}</td>
                      <td>{r.odometer !== null ? r.odometer.toLocaleString() : "—"}</td>
                      <td>{r.price.toFixed(2)}</td>
                      <td>{r.notes || "—"}</td>
                      <td>
                        <button
                          className="btn-icon danger"
                          title="Delete"
                          onClick={() => handleDelete(r.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Insurance Record</h2>
            <form onSubmit={handleSubmit}>
              <div className="service-form-layout">
                <div className="service-form-fields">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      {INSURANCE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Odometer (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.odometer}
                      onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                      placeholder="Current reading"
                    />
                  </div>
                  <div className="form-group">
                    <label>Price (RON)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="Amount"
                    />
                  </div>
                </div>
                <div className="service-form-calendar">
                  <div className="calendar-toggle">
                    <button
                      type="button"
                      className={`calendar-toggle-btn ${calendarField === "start" ? "active" : ""}`}
                      onClick={() => setCalendarField("start")}
                    >
                      <span className="calendar-toggle-label">Start</span>
                      <span className="calendar-toggle-date">{form.start_date}</span>
                    </button>
                    <button
                      type="button"
                      className={`calendar-toggle-btn ${calendarField === "end" ? "active" : ""}`}
                      onClick={() => setCalendarField("end")}
                    >
                      <span className="calendar-toggle-label">End</span>
                      <span className="calendar-toggle-date">{form.end_date}</span>
                    </button>
                  </div>
                  <Calendar
                    key={`${showModal}-${calendarField}`}
                    value={calendarValue}
                    onChange={onCalendarChange}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
