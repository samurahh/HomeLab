import type { Car } from "../types.ts";

interface TopBarProps {
  cars: Car[];
  selectedCarId: number;
  pageTitle: string;
  onSelectCar: (id: number) => void;
  onCarsChange: () => void;
  onAddCar: () => void;
  onDeleteCar: () => void;
  onBackToCars: () => void;
  editing: boolean;
  onToggleEditing: () => void;
}

export default function TopBar({
  cars,
  selectedCarId,
  pageTitle,
  onSelectCar,
  onAddCar,
  onDeleteCar,
  onBackToCars,
  editing,
  onToggleEditing,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-icon" title="All cars" onClick={onBackToCars}>
          ←
        </button>
        <span className="topbar-page-title">{pageTitle}</span>
      </div>
      <div className="car-selector">
        <select
          value={selectedCarId}
          onChange={(e) => onSelectCar(Number(e.target.value))}
        >
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.alias}
            </option>
          ))}
        </select>
        <button
          className={`btn-icon ${editing ? "active" : ""}`}
          title={editing ? "Stop editing" : "Edit car"}
          onClick={onToggleEditing}
        >
          ✎
        </button>
        <button className="btn-icon" title="Add car" onClick={onAddCar}>
          +
        </button>
        {cars.length > 1 && (
          <button
            className="btn-icon danger"
            title="Delete car"
            onClick={onDeleteCar}
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
}
