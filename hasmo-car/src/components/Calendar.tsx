import { useState } from "react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type View = "days" | "months";

interface CalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function Calendar({ value, onChange }: CalendarProps) {
  const selected = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [view, setView] = useState<View>("days");

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevNav = () => {
    if (view === "months") {
      setViewYear(viewYear - 1);
    } else if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextNav = () => {
    if (view === "months") {
      setViewYear(viewYear + 1);
    } else if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedStr = value;
  const now = new Date();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const titleText = view === "months"
    ? `${viewYear}`
    : `${MONTHS[viewMonth]} ${viewYear}`;

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={prevNav}>‹</button>
        <span
          className="calendar-title calendar-title-clickable"
          onClick={() => setView(view === "months" ? "days" : "months")}
        >
          {titleText}
        </span>
        <button type="button" className="calendar-nav" onClick={nextNav}>›</button>
      </div>
      <div className="calendar-body">
        {view === "months" ? (
          <div className="calendar-months-grid">
            {MONTHS_SHORT.map((m, i) => (
              <button
                key={m}
                type="button"
                className={`calendar-month ${i === viewMonth ? "selected" : ""}`}
                onClick={() => {
                  setViewMonth(i);
                  setView("days");
                }}
              >
                {m}
              </button>
            ))}
          </div>
        ) : (
          <div className="calendar-grid">
            {DAYS.map((d) => (
              <div key={d} className="calendar-day-label">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="calendar-cell" />;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const classes = [
                "calendar-day",
                dateStr === selectedStr ? "selected" : "",
                dateStr === todayStr ? "today" : "",
              ].filter(Boolean).join(" ");
              return (
                <div key={i} className="calendar-cell">
                  <button type="button" className={classes} onClick={() => onChange(dateStr)}>
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
