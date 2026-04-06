import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar.tsx";
import TopBar from "./components/TopBar.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Fuel from "./pages/Fuel.tsx";
import Service from "./pages/Service.tsx";
import Reminders from "./pages/Reminders.tsx";
import Insurance from "./pages/Insurance.tsx";
import Placeholder from "./pages/Placeholder.tsx";
import Cars from "./pages/Cars.tsx";
import type { Car, Tab } from "./types.ts";
import { api } from "./hooks/useApi.ts";
import { useRouter } from "./hooks/useRouter.ts";

export default function App() {
  const [cars, setCars] = useState<Car[]>([]);
  const [editing, setEditing] = useState(false);
  const { route, navigate } = useRouter();

  const loadCars = useCallback(async () => {
    const data = await api.get<Car[]>("/cars");
    setCars(data);
  }, []);

  useEffect(() => {
    loadCars();
  }, []);

  const selectCar = (id: number) => {
    setEditing(false);
    navigate(`/cars/${id}`);
  };

  const handleTabChange = (tab: Tab) => {
    if (route.path !== "car") return;
    navigate(`/cars/${route.carId}/${tab}`);
  };

  const handleAddCar = async () => {
    const car = await api.post<Car>("/cars", { alias: "New Car" });
    await loadCars();
    selectCar(car.id);
  };

  const handleDeleteCar = async () => {
    if (route.path !== "car" || cars.length <= 1) return;
    if (!confirm("Delete this car and all its data?")) return;
    await api.delete(`/cars/${route.carId}`);
    await loadCars();
    navigate("/cars");
  };

  if (route.path === "cars") {
    return (
      <div className="app-layout">
        <header className="topbar topbar-full">
          <div className="topbar-left">
            <span className="topbar-brand">Car Maintenance</span>
          </div>
          <div className="car-selector">
            <button className="btn btn-primary" onClick={handleAddCar}>
              + Add Car
            </button>
          </div>
        </header>
        <main className="main-content main-content-full">
          <Cars cars={cars} onSelectCar={selectCar} />
        </main>
      </div>
    );
  }

  const { carId, tab } = route;

  const TAB_LABELS: Record<Tab, string> = {
    dashboard: "Dashboard",
    fuel: "Fuel",
    service: "Service",
    reminders: "Reminders",
    vignette: "Vignette",
    insurance: "Insurance",
    notes: "Notes",
    others: "Others",
  };

  const selectCarFromDropdown = (id: number) => {
    setEditing(false);
    navigate(`/cars/${id}/${tab}`);
  };

  const renderPage = () => {
    switch (tab) {
      case "dashboard":
        return <Dashboard carId={carId} onCarUpdated={loadCars} editing={editing} />;
      case "fuel":
        return <Fuel carId={carId} />;
      case "service":
        return <Service carId={carId} />;
      case "reminders":
        return <Reminders carId={carId} />;
      case "vignette":
        return <Placeholder title="Vignette" icon="🏷" />;
      case "insurance":
        return <Insurance carId={carId} />;
      case "notes":
        return <Placeholder title="Notes" icon="📝" />;
      case "others":
        return <Placeholder title="Others" icon="⋯" />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={tab} onTabChange={handleTabChange} />
      <TopBar
        cars={cars}
        selectedCarId={carId}
        pageTitle={TAB_LABELS[tab]}
        onSelectCar={selectCarFromDropdown}
        onCarsChange={loadCars}
        onAddCar={handleAddCar}
        onDeleteCar={handleDeleteCar}
        onBackToCars={() => navigate("/cars")}
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
      />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}
