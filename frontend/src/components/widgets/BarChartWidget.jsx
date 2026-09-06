import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function BarChartWidget({ data, widget }) {
  if (!data) return <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No data</div>;

  const dataArray = Array.isArray(data) ? data : [data];
  if (dataArray.length === 0) return <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No data points</div>;

  const valueField = Object.keys(dataArray[0] || {}).find(k => k !== 'recorded_at' && k !== 'hardware_device_id') || 'value';
  const baseColor = widget.configuration?.color || 'var(--primary)';

  // Group by hardware_device_id
  const groupedData = {};
  const allLabels = new Set();

  dataArray.forEach(d => {
    const devId = d.hardware_device_id || 'Default';
    if (!groupedData[devId]) groupedData[devId] = [];
    groupedData[devId].push(d);
    
    // For AGGREGATED mode without timestamps, we might just have devId
    if (d.recorded_at) {
      allLabels.add(new Date(d.recorded_at).toLocaleTimeString());
    } else {
      allLabels.add('Aggregated');
    }
  });

  const labels = Array.from(allLabels).sort();
  const colors = [baseColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const datasets = Object.keys(groupedData).map((devId, idx) => {
    const devData = groupedData[devId];
    // Map data to labels to handle missing points
    const mappedData = labels.map(l => {
      const point = devData.find(d => {
        if (d.recorded_at) return new Date(d.recorded_at).toLocaleTimeString() === l;
        return l === 'Aggregated';
      });
      return point ? point[valueField] : null;
    });

    const color = colors[idx % colors.length];

    return {
      label: devId === 'Default' ? widget.title : `${widget.title} (${devId})`,
      data: mappedData,
      backgroundColor: color,
      borderRadius: 4
    };
  });

  const chartData = {
    labels,
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: datasets.length > 1, labels: { color: 'var(--text-muted)' } },
    },
    scales: {
      x: { display: false },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: 'var(--text-muted)' } }
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', padding: '1rem' }}>
      <Bar options={options} data={chartData} />
    </div>
  );
}
