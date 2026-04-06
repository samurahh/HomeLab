import type { Tab } from "../types.ts";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "fuel", label: "Fuel", icon: "⛽" },
  { id: "service", label: "Service", icon: "🔧" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
  { id: "vignette", label: "Vignette", icon: "🏷" },
  { id: "insurance", label: "Insurance", icon: "🛡" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "others", label: "Others", icon: "⋯" },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Car Maintenance</div>
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
