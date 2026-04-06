import { useState, useEffect, useRef } from "react";
import type { Car, FuelRecord } from "../types.ts";
import { api } from "../hooks/useApi.ts";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler);

const FUEL_TYPES = ["", "Gasoline", "Diesel", "Electric", "Hybrid"];

interface DashboardProps {
  carId: number;
  onCarUpdated: () => void;
  editing: boolean;
}

const lineChartOptions = (unit: string): import("chart.js").ChartOptions<"line"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y.toFixed(2)} ${unit}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, maxRotation: 0 },
    },
    y: {
      grid: { color: "rgba(0,0,0,0.05)" },
      ticks: { font: { size: 10 } },
    },
  },
  elements: {
    point: { radius: 3, hoverRadius: 5 },
    line: { tension: 0.3 },
  },
});

const barChartOptions = (unit: string): import("chart.js").ChartOptions<"bar"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y.toFixed(1)} ${unit}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, maxRotation: 0 },
    },
    y: {
      grid: { color: "rgba(0,0,0,0.05)" },
      ticks: { font: { size: 10 } },
      beginAtZero: true,
    },
  },
});

export default function Dashboard({ carId, onCarUpdated, editing }: DashboardProps) {
  const [car, setCar] = useState<Car | null>(null);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.get<Car>(`/cars/${carId}`).then(setCar);
    api.get<FuelRecord[]>(`/cars/${carId}/fuel`).then(setFuelRecords);
  }, [carId]);

  const updateField = (field: string, value: string) => {
    if (!car) return;
    setCar({ ...car, [field]: value });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await api.put(`/cars/${carId}`, { [field]: value });
      if (field === "alias") onCarUpdated();
      setSaving(false);
    }, 500);
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateField("picture", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  if (!car) return null;

  // Compute metrics from fuel records
  const withOdometer = fuelRecords.filter((r) => r.odometer !== null);
  let totalKm = 0;
  let fuelInSpans = 0;
  let costInSpans = 0;
  for (let i = 1; i < withOdometer.length; i++) {
    const prev = withOdometer[i - 1]!;
    const curr = withOdometer[i]!;
    const dist = curr.odometer! - prev.odometer!;
    if (dist > 0) {
      totalKm += dist;
      const prevIdx = fuelRecords.indexOf(prev);
      const currIdx = fuelRecords.indexOf(curr);
      for (let j = prevIdx + 1; j <= currIdx; j++) {
        fuelInSpans += fuelRecords[j]!.fuel_quantity;
        costInSpans += fuelRecords[j]!.total_cost;
      }
    }
  }
  const totalLiters = fuelRecords.reduce((s, r) => s + r.fuel_quantity, 0);
  const totalCost = fuelRecords.reduce((s, r) => s + r.total_cost, 0);
  const avgEconomy = totalKm > 0 ? (fuelInSpans / totalKm) * 100 : null;
  const pricePerKm = totalKm > 0 ? costInSpans / totalKm : null;
  const lastOdometer = withOdometer.length > 0 ? withOdometer[withOdometer.length - 1]!.odometer : null;

  // Economy over time (per fill-up)
  const economyData: { x: string; y: number }[] = [];
  for (let i = 1; i < fuelRecords.length; i++) {
    const prev = fuelRecords[i - 1]!;
    const curr = fuelRecords[i]!;
    if (prev.odometer !== null && curr.odometer !== null) {
      const delta = curr.odometer - prev.odometer;
      if (delta > 0) {
        economyData.push({
          x: curr.date.slice(5), // MM-DD
          y: (curr.fuel_quantity / delta) * 100,
        });
      }
    }
  }

  // Monthly cost (last 12 months)
  const monthlyCost: Record<string, number> = {};
  for (const r of fuelRecords) {
    const month = r.date.slice(0, 7); // YYYY-MM
    monthlyCost[month] = (monthlyCost[month] || 0) + r.total_cost;
  }
  const sortedMonths = Object.keys(monthlyCost).sort();
  const recentMonths = sortedMonths.slice(-12);
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthlyCostData = recentMonths.map((m) => {
    const [year, mon] = m.split("-");
    return {
      x: `${MONTH_NAMES[parseInt(mon!, 10) - 1]} ${year}`,
      y: monthlyCost[m]!,
    };
  });

  // Odometer over time
  const odometerData = withOdometer.map((r) => ({
    x: r.date.slice(5),
    y: r.odometer!,
  }));

  return (
    <div>
      {/* Car details panel */}
      <div className="card dash-car-panel">
        <div className="dash-car-panel-header">Car Details</div>
        <div className="dash-car-panel-body">
        <div
          className={`dash-car-photo ${!editing && car.picture ? "dash-car-photo-clickable" : ""}`}
          onClick={() => { if (!editing && car.picture) setShowPhoto(true); }}
        >
          {car.picture ? (
            <img src={car.picture} alt={car.alias} />
          ) : (
            <div className="dash-car-photo-empty">{car.alias.charAt(0)}</div>
          )}
          {editing && (
            <label className="dash-photo-upload">
              Change
              <input type="file" accept="image/*" onChange={handlePictureChange} hidden />
            </label>
          )}
        </div>
        <div className="dash-car-details">
          <div className="dash-car-row">
            <div className="dash-field">
              <span className="dash-field-label">Make</span>
              <input
                value={car.make}
                onChange={(e) => updateField("make", e.target.value)}
                placeholder="—"
                readOnly={!editing}
                className={editing ? "" : "dash-field-readonly"}
              />
            </div>
            <div className="dash-field">
              <span className="dash-field-label">Model</span>
              <input
                value={car.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="—"
                readOnly={!editing}
                className={editing ? "" : "dash-field-readonly"}
              />
            </div>
            <div className="dash-field">
              <span className="dash-field-label">Year</span>
              <input
                value={car.year}
                onChange={(e) => updateField("year", e.target.value)}
                placeholder="—"
                readOnly={!editing}
                className={editing ? "" : "dash-field-readonly"}
                style={{ width: 70 }}
              />
            </div>
            <div className="dash-field">
              <span className="dash-field-label">Fuel Type</span>
              {editing ? (
                <select value={car.fuel_type} onChange={(e) => updateField("fuel_type", e.target.value)}>
                  {FUEL_TYPES.map((ft) => (
                    <option key={ft} value={ft}>{ft || "— Select —"}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={car.fuel_type}
                  placeholder="—"
                  readOnly
                  className="dash-field-readonly"
                />
              )}
            </div>
            <div className="dash-field">
              <span className="dash-field-label">License Plate</span>
              <input
                value={car.license_plate}
                onChange={(e) => updateField("license_plate", e.target.value)}
                placeholder="—"
                readOnly={!editing}
                className={editing ? "" : "dash-field-readonly"}
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Metrics */}
      {fuelRecords.length > 0 && (
        <>
          <div className="metrics-row" style={{ marginTop: 20 }}>
            {lastOdometer !== null && (
              <div className="metric-card">
                <div className="metric-label">Odometer</div>
                <div className="metric-value">{lastOdometer.toLocaleString()} km</div>
              </div>
            )}
            <div className="metric-card">
              <div className="metric-label">Total Distance</div>
              <div className="metric-value">{totalKm > 0 ? `${totalKm.toLocaleString()} km` : "—"}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Fuel</div>
              <div className="metric-value">{totalLiters.toFixed(1)} L</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg Economy</div>
              <div className="metric-value">{avgEconomy !== null ? `${avgEconomy.toFixed(2)} L/100km` : "—"}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Spent</div>
              <div className="metric-value">{totalCost.toFixed(0)} RON</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Cost / km</div>
              <div className="metric-value">{pricePerKm !== null ? `${pricePerKm.toFixed(3)} RON` : "—"}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="dash-charts">
            {economyData.length >= 2 && (
              <div className="card dash-chart-card">
                <h3>Fuel Economy (L/100km)</h3>
                <div className="chart-wrapper">
                  <Line
                    data={{
                      labels: economyData.map((d) => d.x),
                      datasets: [{
                        data: economyData.map((d) => d.y),
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59,130,246,0.1)",
                        fill: true,
                      }],
                    }}
                    options={lineChartOptions("L/100km")}
                  />
                </div>
              </div>
            )}
            {monthlyCostData.length > 0 && (
              <div className="card dash-chart-card">
                <h3>Monthly Cost (RON)</h3>
                <div className="chart-wrapper">
                  <Bar
                    data={{
                      labels: monthlyCostData.map((d) => d.x),
                      datasets: [{
                        data: monthlyCostData.map((d) => d.y),
                        backgroundColor: "rgba(139,92,246,0.7)",
                        borderRadius: 4,
                      }],
                    }}
                    options={barChartOptions("RON")}
                  />
                </div>
              </div>
            )}
            {odometerData.length >= 2 && (
              <div className="card dash-chart-card">
                <h3>Odometer (km)</h3>
                <div className="chart-wrapper">
                  <Line
                    data={{
                      labels: odometerData.map((d) => d.x),
                      datasets: [{
                        data: odometerData.map((d) => d.y),
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16,185,129,0.1)",
                        fill: true,
                      }],
                    }}
                    options={lineChartOptions("km")}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showPhoto && car.picture && (
        <div className="modal-overlay" onClick={() => setShowPhoto(false)}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <img src={car.picture} alt={car.alias} />
            <button className="photo-modal-close" onClick={() => setShowPhoto(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
