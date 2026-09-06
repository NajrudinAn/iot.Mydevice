import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items, className = '' }) {
  return (
    <nav className={`flex items-center text-sm text-muted ${className}`}>
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
