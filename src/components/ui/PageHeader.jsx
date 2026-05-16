import React from 'react';

export default function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={`page-header page-header-modern ${className}`.trim()}>
      <div className="page-header-copy">
        {eyebrow ? <span className="page-eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
