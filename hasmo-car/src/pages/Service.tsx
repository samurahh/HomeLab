import { useState, useEffect } from "react";
import type { ServiceRecord } from "../types.ts";
import { api } from "../hooks/useApi.ts";
import Calendar from "../components/Calendar.tsx";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ServiceProps {
  carId: number;
}

interface ServiceFormData {
  date: string;
  odometer: string;
  description: string;
  cost: string;
  notes: string;
}

type SortKey = "date" | "odometer" | "description" | "cost" | "notes";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

const COLUMNS: [SortKey, string][] = [
  ["date", "Date"],
  ["odometer", "Odometer (km)"],
  ["description", "Description"],
  ["cost", "Cost (RON)"],
  ["notes", "Notes"],
];

export default function Service({ carId }: ServiceProps) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<ServiceFormData>({
    date: todayStr(),
    odometer: "",
    description: "",
    cost: "",
    notes: "",
  });

  const openModal = () => {
    setForm({
      date: todayStr(),
      odometer: "",
      description: "",
      cost: "",
      notes: "",
    });
    setShowModal(true);
  };

  const loadRecords = () => {
    api.get<ServiceRecord[]>(`/cars/${carId}/service`).then(setRecords);
  };

  useEffect(() => {
    loadRecords();
  }, [carId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/cars/${carId}/service`, {
      date: form.date,
      odometer: form.odometer ? parseFloat(form.odometer) : null,
      description: form.description,
      cost: form.cost ? parseFloat(form.cost) : 0,
      notes: form.notes,
    });
    setShowModal(false);
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service record?")) return;
    await api.delete(`/cars/${carId}/service/${id}`);
    loadRecords();
  };

  // Sort
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
  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const totalServices = records.length;

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
            <div className="metric-label">Total Services</div>
            <div className="metric-value">{totalServices}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Cost</div>
            <div className="metric-value">{totalCost.toFixed(2)} RON</div>
          </div>
        </div>
      )}

      <div className="card">
        {records.length === 0 ? (
          <div className="empty-state">
            <h3>No service records yet</h3>
            <p>Add your first service record to start tracking maintenance.</p>
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
                    <td>{r.date}</td>
                    <td>{r.odometer !== null ? r.odometer.toLocaleString() : "—"}</td>
                    <td>{r.description || "—"}</td>
                    <td>{r.cost.toFixed(2)}</td>
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
            <h2>Add Service Record</h2>
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
                      placeholder="e.g. Oil change, Brake pads"
                    />
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
                    <label>Cost (RON)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      placeholder="Amount"
                    />
                  </div>
                </div>
                <div className="service-form-calendar">
                  <Calendar
                    key={showModal ? "open" : "closed"}
                    value={form.date}
                    onChange={(date) => setForm({ ...form, date })}
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
