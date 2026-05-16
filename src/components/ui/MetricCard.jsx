import React from 'react';

export default function MetricCard({ icon: Icon, label, value, hint, tone = 'blue' }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-card-icon">
        {Icon ? <Icon size={20} aria-hidden="true" /> : null}
      </div>
      <span className="metric-card-label">{label}</span>
      <strong className="metric-card-value">{value}</strong>
      {hint ? <small className="metric-card-hint">{hint}</small> : null}
    </article>
  );
}
