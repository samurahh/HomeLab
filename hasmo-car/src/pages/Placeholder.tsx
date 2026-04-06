interface PlaceholderProps {
  title: string;
  icon: string;
}

export default function Placeholder({ title, icon }: PlaceholderProps) {
  return (
    <div className="placeholder-page">
      <div className="icon">{icon}</div>
      <h2>{title}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}
