#!/bin/bash

# Select.jsx
cat << 'FILE' > src/components/ui/Select.jsx
import React from 'react';

export default function Select({ label, helperText, error, className = '', children, ...props }) {
  return (
    <div className={`form-group ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <select 
        className={`form-select ${error ? 'border-red-500' : ''}`} 
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
      {helperText && !error && <span className="text-muted text-sm mt-1">{helperText}</span>}
    </div>
  );
}
FILE

# Card.jsx
cat << 'FILE' > src/components/ui/Card.jsx
import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {children}
    </div>
  );
}
FILE

# Badge.jsx
cat << 'FILE' > src/components/ui/Badge.jsx
import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
FILE

# Modal.jsx
cat << 'FILE' > src/components/ui/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({ isOpen, onClose, title, children, footer }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex-center">
      <div className="modal-content glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex-between">
          <h2 className="modal-title">{title}</h2>
          <Button variant="icon" onClick={onClose} icon={X} />
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
FILE

# Table.jsx
cat << 'FILE' > src/components/ui/Table.jsx
import React from 'react';
import EmptyState from './EmptyState';
import Spinner from './Spinner';

export default function Table({ columns, data, loading, emptyMessage = "No data available", keyField = 'id' }) {
  if (loading) return <div className="p-8 flex-center"><Spinner /></div>;
  if (!data || data.length === 0) return <EmptyState title={emptyMessage} />;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row[keyField]}>
              {columns.map((col, idx) => (
                <td key={idx}>
                  {col.render ? col.render(row) : row[col.field]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
FILE

# Spinner.jsx
cat << 'FILE' > src/components/ui/Spinner.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 24, className = '' }) {
  return <Loader2 className={`spinner-icon animate-spin ${className}`} size={size} />;
}
FILE

# EmptyState.jsx
cat << 'FILE' > src/components/ui/EmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="empty-state flex-center flex-column p-8">
      <div className="empty-state-icon">
        <Icon size={48} />
      </div>
      <h3 className="empty-state-title mt-4 mb-2">{title}</h3>
      {description && <p className="empty-state-description text-muted mb-6 text-center">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
FILE

# ErrorState.jsx
cat << 'FILE' > src/components/ui/ErrorState.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = "An error occurred", message, onRetry }) {
  return (
    <div className="error-state flex-center flex-column p-8 text-center">
      <AlertTriangle size={48} className="text-red-500 mb-4" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      {message && <p className="text-muted mb-6 max-w-md">{message}</p>}
      {onRetry && <Button onClick={onRetry} variant="secondary">Retry</Button>}
    </div>
  );
}
FILE

# ConfirmDialog.jsx
cat << 'FILE' > src/components/ui/ConfirmDialog.jsx
import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmVariant = "danger", loading = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-4 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </div>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
FILE

# PageHeader.jsx
cat << 'FILE' > src/components/ui/PageHeader.jsx
import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export default function PageHeader({ title, description, action, breadcrumbs }) {
  return (
    <div className="page-header mb-8">
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
FILE

# Breadcrumbs.jsx
cat << 'FILE' > src/components/ui/Breadcrumbs.jsx
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items, className = '' }) {
  return (
    <nav className={`breadcrumbs flex items-center text-sm text-muted ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={14} className="mx-2" />}
          {item.href ? (
            <Link to={item.href} className="hover:text-white transition-colors flex items-center gap-1">
              {index === 0 && !item.label && <Home size={14} />}
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
FILE

# Toast.jsx (Just a simple toast container layout for now)
cat << 'FILE' > src/components/ui/Toast.jsx
import React from 'react';

// A full toast system would require a context, but we will start with standard components
// that can be integrated with react-hot-toast or similar later, or built manually.
export default function Toast({ message, type = 'info' }) {
  return (
    <div className={`toast toast-${type}`}>
      {message}
    </div>
  );
}
FILE

chmod +x generate_components.sh
./generate_components.sh
