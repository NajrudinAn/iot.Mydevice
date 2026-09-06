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
