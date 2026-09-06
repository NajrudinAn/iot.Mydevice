import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Database, 
  title = 'Data Unavailable', 
  description = 'This information is not currently available from the configured data sources.',
  action = null
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      padding: '2rem 1rem',
      textAlign: 'center',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: '50%',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <Icon size={24} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h4 style={{ color: 'white', fontWeight: 500, margin: '0 0 0.5rem 0', fontSize: '14px' }}>{title}</h4>
      <p style={{ fontSize: '12px', maxWidth: '250px', lineHeight: 1.5, margin: 0 }}>{description}</p>
      {action && (
        <div style={{ marginTop: '1rem' }}>
          {action}
        </div>
      )}
    </div>
  );
}
