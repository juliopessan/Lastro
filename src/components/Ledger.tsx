import { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Voice({ children }: { children: ReactNode }) {
  return <span className="voice">{children}</span>;
}

export function Fig({ value, label }: { value: string; label: string }) {
  return (
    <div className="fig">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function BarRow({
  label,
  value,
  widthPct,
  color,
}: {
  label: string;
  value: string;
  widthPct: number;
  color: string;
}) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${widthPct}%`, background: color }} />
      </div>
    </div>
  );
}

export function LedgerPanel({
  liveLabel,
  meta,
  children,
}: {
  liveLabel: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <div className="ledger">
      <div className="ledger-head">
        <span className="live">{liveLabel}</span>
        <span className="meta">{meta}</span>
      </div>
      {children}
    </div>
  );
}

export function Measured({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="measured">
      <span className="tick" aria-hidden="true">
        ✓
      </span>
      <p>
        <span className="k">{titulo}</span>
        {children}
      </p>
    </div>
  );
}

export function Flag({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flag">
      <span className="flag-k">{titulo}</span>
      <p>{children}</p>
    </div>
  );
}
