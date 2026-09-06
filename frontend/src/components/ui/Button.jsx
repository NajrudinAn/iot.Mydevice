import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  iconRight: IconRight,
  className = '', 
  loading = false,
  disabled = false,
  ...props 
}) {
  const baseClasses = 'btn flex items-center justify-center gap-2';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    icon: 'btn-icon'
  };
  
  const sizeClasses = {
    sm: 'text-sm py-1 px-2',
    md: 'py-2 px-4',
    lg: 'text-lg py-3 px-6'
  };

  const appliedVariant = variantClasses[variant] || variantClasses.primary;
  const appliedSize = variant === 'icon' ? '' : (sizeClasses[size] || sizeClasses.md);
  
  return (
    <button 
      className={`${baseClasses} ${appliedVariant} ${appliedSize} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner-small"></span>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 18} />
      ) : null}
      {children}
      {!loading && IconRight ? (
        <IconRight size={size === 'sm' ? 14 : 18} />
      ) : null}
    </button>
  );
}
