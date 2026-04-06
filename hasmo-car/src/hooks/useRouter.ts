import { useState, useEffect, useCallback } from "react";
import type { Tab } from "../types.ts";

const VALID_TABS: Set<string> = new Set([
  "dashboard", "fuel", "service", "reminders", "vignette", "insurance", "notes", "others",
]);

interface CarsRoute {
  path: "cars";
}

interface CarRoute {
  path: "car";
  carId: number;
  tab: Tab;
}

export type Route = CarsRoute | CarRoute;

function parseRoute(pathname: string): Route {
  const match = pathname.match(/^\/cars\/(\d+)(?:\/(\w+))?/);
  if (match) {
    const tab = match[2] && VALID_TABS.has(match[2]) ? (match[2] as Tab) : "dashboard";
    return { path: "car", carId: Number(match[1]), tab };
  }
  return { path: "cars" };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, "", path);
    setRoute(parseRoute(path));
  }, []);

  return { route, navigate };
}
