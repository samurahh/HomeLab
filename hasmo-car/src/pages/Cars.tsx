import type { Car } from "../types.ts";

interface CarsProps {
  cars: Car[];
  onSelectCar: (id: number) => void;
}

export default function Cars({ cars, onSelectCar }: CarsProps) {
  return (
    <div>
      <h1 className="page-title">My Cars</h1>
      <div className="cars-grid">
        {cars.map((car) => (
          <button
            key={car.id}
            className="car-card"
            onClick={() => onSelectCar(car.id)}
          >
            <div className="car-card-image">
              {car.picture ? (
                <img src={car.picture} alt={car.alias} />
              ) : (
                <div className="car-card-placeholder">{car.alias.charAt(0)}</div>
              )}
            </div>
            <div className="car-card-info">
              <div className="car-card-title">{car.alias}</div>
              <div className="car-card-subtitle">
                {[car.make, car.model, car.year].filter(Boolean).join(" ") || "No details yet"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
