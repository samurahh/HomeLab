import { useState, useEffect } from "react";
import type { FuelRecord } from "../types.ts";
import { api } from "../hooks/useApi.ts";
import Calendar from "../components/Calendar.tsx";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface FuelProps {
  carId: number;
}

interface FuelFormData {
  date: string;
  odometer: string;
  fuel_quantity: string;
  cost: string;
  cost_type: "total" | "unit";
}

type SortKey = "date" | "odometer" | "delta" | "fuel_quantity" | "economy" | "total_cost" | "unitCost";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;

const COLUMNS: [SortKey, string][] = [
  ["date", "Date"],
  ["odometer", "Odometer (km)"],
  ["delta", "Delta (km)"],
  ["fuel_quantity", "Quantity (L)"],
  ["economy", "Economy (L/100km)"],
  ["total_cost", "Total Cost (RON)"],
  ["unitCost", "Unit Cost (RON/L)"],
];

export default function Fuel({ carId }: FuelProps) {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<FuelFormData>({
    date: todayStr(),
    odometer: "",
    fuel_quantity: "",
    cost: "",
    cost_type: "total",
  });

  const openModal = () => {
    setForm({
      date: todayStr(),
      odometer: "",
      fuel_quantity: "",
      cost: "",
      cost_type: "total",
    });
    setShowModal(true);
  };

  const loadRecords = () => {
    api.get<FuelRecord[]>(`/cars/${carId}/fuel`).then(setRecords);
  };

  useEffect(() => {
    loadRecords();
  }, [carId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fuelQty = parseFloat(form.fuel_quantity);
    const costVal = parseFloat(form.cost);
    const totalCost =
      form.cost_type === "unit" ? costVal * fuelQty : costVal;

    await api.post(`/cars/${carId}/fuel`, {
      date: form.date,
      odometer: form.odometer ? parseFloat(form.odometer) : null,
      fuel_quantity: fuelQty,
      total_cost: totalCost,
    });

    setShowModal(false);
    setForm({
      date: todayStr(),
      odometer: "",
      fuel_quantity: "",
      cost: "",
      cost_type: "total",
    });
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this fuel record?")) return;
    await api.delete(`/cars/${carId}/fuel/${id}`);
    loadRecords();
  };

  // Compute derived columns
  const enrichedRecords = records.map((r, i) => {
    const prev = i > 0 ? records[i - 1] : null;
    const delta =
      prev && prev.odometer !== null && r.odometer !== null
        ? r.odometer - prev.odometer
        : null;
    const economy =
      delta && delta > 0 ? (r.fuel_quantity / delta) * 100 : null;
    const unitCost =
      r.fuel_quantity > 0 ? r.total_cost / r.fuel_quantity : null;
    return { ...r, delta, economy, unitCost };
  });

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

  const sortedRecords = [...enrichedRecords].sort((a, b) => {
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

  // Compute metrics
  // For average economy and total km, use records with odometer as bounds.
  // Sum fuel consumed between consecutive odometer-known records to handle gaps.
  const withOdometer = records.filter((r) => r.odometer !== null);
  let totalKm = 0;
  let fuelInSpans = 0;
  let costInSpans = 0;
  for (let i = 1; i < withOdometer.length; i++) {
    const prev = withOdometer[i - 1]!;
    const curr = withOdometer[i]!;
    const dist = curr.odometer! - prev.odometer!;
    if (dist > 0) {
      totalKm += dist;
      // Sum fuel & cost for records between prev and curr (inclusive of curr, exclusive of prev)
      // These represent fuel consumed to travel this span
      const prevIdx = records.indexOf(prev);
      const currIdx = records.indexOf(curr);
      for (let j = prevIdx + 1; j <= currIdx; j++) {
        fuelInSpans += records[j]!.fuel_quantity;
        costInSpans += records[j]!.total_cost;
      }
    }
  }
  const totalLiters = records.reduce((sum, r) => sum + r.fuel_quantity, 0);
  const totalCost = records.reduce((sum, r) => sum + r.total_cost, 0);
  const avgEconomy = totalKm > 0 ? (fuelInSpans / totalKm) * 100 : null;
  const pricePerKm = totalKm > 0 ? costInSpans / totalKm : null;

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
            <div className="metric-label">Total Kilometers</div>
            <div className="metric-value">{totalKm > 0 ? `${totalKm.toLocaleString()} km` : "—"}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Liters</div>
            <div className="metric-value">{totalLiters.toFixed(1)} L</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Average Economy</div>
            <div className="metric-value">
              {avgEconomy !== null ? `${avgEconomy.toFixed(2)} L/100km` : "—"}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Cost</div>
            <div className="metric-value">{totalCost.toFixed(2)} RON</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Price / km</div>
            <div className="metric-value">
              {pricePerKm !== null ? `${pricePerKm.toFixed(3)} RON` : "—"}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {enrichedRecords.length === 0 ? (
          <div className="empty-state">
            <h3>No fuel records yet</h3>
            <p>Add your first fuel record to start tracking consumption.</p>
            <button
              className="btn btn-primary"
              onClick={() => openModal()}
            >
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
                    <td>{r.delta !== null ? r.delta.toLocaleString() : "—"}</td>
                    <td>{r.fuel_quantity.toFixed(2)}</td>
                    <td>{r.economy !== null ? r.economy.toFixed(2) : "—"}</td>
                    <td>{r.total_cost.toFixed(2)}</td>
                    <td>{r.unitCost !== null ? r.unitCost.toFixed(2) : "—"}</td>
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
            <h2>Add Fuel Record</h2>
            <form onSubmit={handleSubmit}>
              <div className="fuel-form-layout">
                <div className="fuel-form-left">
                  <div className="form-group">
                    <label>Odometer (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.odometer}
                      onChange={(e) =>
                        setForm({ ...form, odometer: e.target.value })
                      }
                      placeholder="Current reading"
                    />
                  </div>
                  <div className="form-group">
                    <label>Fuel Quantity (Liters)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={form.fuel_quantity}
                      onChange={(e) =>
                        setForm({ ...form, fuel_quantity: e.target.value })
                      }
                      placeholder="Liters filled"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cost (RON)</label>
                    <div className="cost-input-wrapper">
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={form.cost}
                        onChange={(e) =>
                          setForm({ ...form, cost: e.target.value })
                        }
                        placeholder="Amount"
                      />
                      <select
                        className="cost-type-toggle"
                        value={form.cost_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cost_type: e.target.value as "total" | "unit",
                          })
                        }
                      >
                        <option value="total">Total</option>
                        <option value="unit">/L</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="fuel-form-right">
                  <Calendar
                    key={showModal ? "open" : "closed"}
                    value={form.date}
                    onChange={(date) => setForm({ ...form, date })}
                  />
                </div>
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
