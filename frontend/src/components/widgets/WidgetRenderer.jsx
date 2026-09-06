import React from 'react';
import { Activity, Thermometer, Database } from 'lucide-react';
import LineChartWidget from './LineChartWidget';
import BarChartWidget from './BarChartWidget';

export default function WidgetRenderer({ widget, widgetData }) {
  // widgetData will be passed down from the parent polling loop
  // format: { status: 'ok'|'error', data: <sensor_data_row or array>, message: '...' }

  if (!widgetData) {
    return <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>Waiting for data...</div>;
  }

  if (widgetData.status === 'error') {
    return <div className="flex-center" style={{ height: '100%', color: 'var(--accent)', padding: '1rem', textAlign: 'center' }}>{widgetData.message}</div>;
  }

  const data = widgetData.data;

  switch (widget.widget_type) {
    case 'STATUS':
      // Assume data is a single row with the requested field. e.g. data = { status: 'online' }
      const statusField = Object.keys(data || {})[0] || 'status';
      const statusVal = data ? data[statusField] : 'Unknown';
      return (
        <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '0.5rem' }}>
          <Activity size={32} color={statusVal === 'online' || statusVal === true ? 'var(--secondary)' : 'var(--text-muted)'} />
          <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{String(statusVal)}</span>
        </div>
      );
    case 'SENSOR_VALUE': {
      // Data could be { temperature: 25.5, recorded_at: ... }
      const valueField = Object.keys(data || {}).find(k => k !== 'recorded_at') || 'value';
      const val = data ? data[valueField] : '--';
      const color = widget.configuration?.color || 'var(--primary)';
      return (
        <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '0.5rem' }}>
          <Thermometer size={32} color={color} />
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{val !== undefined ? val : '--'}</span>
        </div>
      );
    }
    case 'LINE_CHART':
      return <LineChartWidget data={data} widget={widget} />;
    case 'BAR_CHART':
      return <BarChartWidget data={data} widget={widget} />;
    case 'SENSOR_TABLE': {
      const dataArray = Array.isArray(data) ? data : [data].filter(Boolean);
      if (dataArray.length === 0) {
        return <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No data</div>;
      }
      // Get all unique keys except some internal ones
      const allKeys = new Set();
      dataArray.forEach(d => Object.keys(d).forEach(k => {
        if (k !== 'id' && k !== 'device_id') allKeys.add(k);
      }));
      const columns = Array.from(allKeys).sort((a, b) => {
        if (a === 'recorded_at') return -1;
        if (b === 'recorded_at') return 1;
        return a.localeCompare(b);
      });

      return (
        <div style={{ height: '100%', width: '100%', overflow: 'auto' }}>
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-white/5 text-muted sticky top-0">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-4 py-2">{col.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataArray.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  {columns.map(col => {
                    let val = row[col];
                    if (col === 'recorded_at' && val) val = new Date(val).toLocaleString();
                    return <td key={col} className="px-4 py-2 truncate max-w-[200px]">{val !== undefined && val !== null ? String(val) : '--'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'TEXT':
      return (
        <div style={{ padding: '1rem', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
          {widget.configuration?.content || 'No content provided.'}
        </div>
      );
    default:
      return (
        <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem' }}>
          <Database size={24} />
          <span>Unsupported Widget Type</span>
        </div>
      );
  }
}
