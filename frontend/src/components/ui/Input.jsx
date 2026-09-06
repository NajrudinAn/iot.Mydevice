import React from 'react';

export default function Input({ label, helperText, error, className = '', ...props }) {
  return (
    <div className={`form-group ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <input 
        className={`form-input ${error ? 'border-red-500 focus:ring-red-500' : ''}`} 
        {...props} 
      />
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
      {helperText && !error && <span className="text-muted text-sm mt-1">{helperText}</span>}
    </div>
  );
}
