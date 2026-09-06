import React from 'react';
import './Skeleton.css';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) {
  return (
    <div 
      className={`skeleton-loader ${className}`} 
      style={{ width, height, borderRadius }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="ds-card" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="flex-between">
        <Skeleton width="32px" height="32px" borderRadius="50%" />
        <Skeleton width="80px" height="16px" />
      </div>
      <div className="mt-4">
        <Skeleton width="60px" height="36px" className="mb-2" />
        <Skeleton width="100px" height="14px" />
      </div>
    </div>
  );
}
