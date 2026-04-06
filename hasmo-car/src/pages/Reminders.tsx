import { useState, useEffect } from "react";
import type { ReminderRecord } from "../types.ts";
import { api } from "../hooks/useApi.ts";
import Calendar from "../components/Calendar.tsx";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface RemindersProps {
  carId: number;
}

interface ReminderFormData {
  description: string;
  notes: string;
  urgency: string;
  remind_type: string;
  remind_date: string;
  remind_odometer: string;
}

type SortKey = "description" | "urgency" | "remind_type" | "remind_date" | "remind_odometer" | "notes";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

const COLUMNS: [SortKey, string][] = [
  ["description", "Description"],
  ["urgency", "Urgency"],
  ["remind_type", "Remind On"],
  ["remind_date", "Date"],
  ["remind_odometer", "Odometer (km)"],
  ["notes", "Notes"],
];

const URGENCY_OPTIONS = ["low", "normal", "high", "critical"];
const REMIND_TYPE_OPTIONS: [string, string][] = [
  ["date", "Date"],
  ["odometer", "Odometer"],
  ["whichever", "Whichever comes first"],
];

const URGENCY_COLORS: Record<string, string> = {
  low: "#94a3b8",
  normal: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

export default function Reminders({ carId }: RemindersProps) {
  const [records, setRecords] = useState<ReminderRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("remind_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<ReminderFormData>({
    description: "",
    notes: "",
    urgency: "normal",
    remind_type: "date",
    remind_date: todayStr(),
    remind_odometer: "",
  });

  const openModal = () => {
    setForm({
      description: "",
      notes: "",
      urgency: "normal",
      remind_type: "date",
      remind_date: todayStr(),
      remind_odometer: "",
    });
    setShowModal(true);
  };

  const loadRecords = () => {
    api.get<ReminderRecord[]>(`/cars/${carId}/reminders`).then(setRecords);
  };

  useEffect(() => {
    loadRecords();
  }, [carId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/cars/${carId}/reminders`, {
      description: form.description,
      notes: form.notes,
      urgency: form.urgency,
      remind_type: form.remind_type,
      remind_date: (form.remind_type === "date" || form.remind_type === "whichever") ? form.remind_date || null : null,
      remind_odometer: (form.remind_type === "odometer" || form.remind_type === "whichever") && form.remind_odometer
        ? parseFloat(form.remind_odometer)
        : null,
    });
    setShowModal(false);
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this reminder?")) return;
    await api.delete(`/cars/${carId}/reminders/${id}`);
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

  // Metrics
  const total = records.length;
  const byCriticality = URGENCY_OPTIONS.map((u) => ({
    label: u,
    count: records.filter((r) => r.urgency === u).length,
  })).filter((x) => x.count > 0);

  const remindTypeLabel = (r: ReminderRecord) => {
    if (r.remind_type === "whichever") return "Whichever first";
    return r.remind_type === "date" ? "Date" : "Odometer";
  };

  const showDateField = form.remind_type === "date" || form.remind_type === "whichever";
  const showOdometerField = form.remind_type === "odometer" || form.remind_type === "whichever";

  return (
    <div>
      <div className="fuel-header">
        <div></div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Reminder
        </button>
      </div>

      {records.length > 0 && (
        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-label">Total Reminders</div>
            <div className="metric-value">{total}</div>
          </div>
          {byCriticality.map((item) => (
            <div className="metric-card" key={item.label}>
              <div className="metric-label">{item.label}</div>
              <div className="metric-value" style={{ color: URGENCY_COLORS[item.label] }}>
                {item.count}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {records.length === 0 ? (
          <div className="empty-state">
            <h3>No reminders yet</h3>
            <p>Add a reminder to stay on top of maintenance.</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              + Add Reminder
            </button>
          </div>
        ) : (
          <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
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
                {pagedRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.description || "—"}</td>
                    <td>
                      <span className="urgency-badge" style={{ background: URGENCY_COLORS[r.urgency] || "#94a3b8" }}>
                        {r.urgency}
                      </span>
                    </td>
                    <td>{remindTypeLabel(r)}</td>
                    <td>{r.remind_date || "—"}</td>
                    <td>{r.remind_odometer !== null ? r.remind_odometer.toLocaleString() : "—"}</td>
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
                ))}
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
            <h2>Add Reminder</h2>
            <form onSubmit={handleSubmit}>
              <div className="service-form-layout">
                <div className="service-form-fields">
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      required
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="e.g. Oil change due"
                    />
                  </div>
                  <div className="form-group">
                    <label>Urgency</label>
                    <select
                      value={form.urgency}
                      onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                    >
                      {URGENCY_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Remind me on</label>
                    <select
                      value={form.remind_type}
                      onChange={(e) => setForm({ ...form, remind_type: e.target.value })}
                    >
                      {REMIND_TYPE_OPTIONS.map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {showOdometerField && (
                    <div className="form-group">
                      <label>At Odometer (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.remind_odometer}
                        onChange={(e) => setForm({ ...form, remind_odometer: e.target.value })}
                        placeholder="e.g. 50000"
                      />
                    </div>
                  )}
                </div>
                {showDateField && (
                  <div className="service-form-calendar">
                    <Calendar
                      key={showModal ? "open" : "closed"}
                      value={form.remind_date}
                      onChange={(date) => setForm({ ...form, remind_date: date })}
                    />
                  </div>
                )}
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
                  Add Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
