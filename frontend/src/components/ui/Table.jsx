import React from 'react';
import EmptyState from './EmptyState';
import Spinner from './Spinner';

export default function Table({ columns, data, loading, emptyMessage = "No data available", keyField = 'id' }) {
  if (loading) return <div className="p-8 flex-center"><Spinner size={32} /></div>;
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
          {data.map((row, rowIdx) => (
            <tr key={row[keyField] || rowIdx}>
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
