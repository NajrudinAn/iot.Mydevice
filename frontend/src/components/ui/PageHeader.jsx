import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export default function PageHeader({ title, description, action, breadcrumbs }) {
  return (
    <div className="mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-4" />}
      <div className="flex-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && <p className="text-muted mt-2">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
