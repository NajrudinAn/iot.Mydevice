import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function LineChartWidget({ data, widget }) {
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
    if (d.recorded_at) {
      allLabels.add(new Date(d.recorded_at).toLocaleTimeString());
    }
  });

  const labels = Array.from(allLabels).sort();
  
  const colors = [baseColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const datasets = Object.keys(groupedData).map((devId, idx) => {
    const devData = groupedData[devId];
    // Map data to labels to handle missing points
    const mappedData = labels.map(l => {
      const point = devData.find(d => d.recorded_at && new Date(d.recorded_at).toLocaleTimeString() === l);
      return point ? point[valueField] : null;
    });

    const color = colors[idx % colors.length];

    return {
      label: devId === 'Default' ? widget.title : `${widget.title} (${devId})`,
      data: mappedData,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0
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
      <Line options={options} data={chartData} />
    </div>
  );
}
