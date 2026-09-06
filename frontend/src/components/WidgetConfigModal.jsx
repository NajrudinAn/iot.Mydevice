import React, { useState, useEffect } from 'react';
import { appClient } from '../api/client';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';

export default function WidgetConfigModal({ onClose, onSuccess, pageId, dashboardId, applicationId }) {
  const [title, setTitle] = useState('');
  const [widgetType, setWidgetType] = useState('STATUS');
  const [dataSourceId, setDataSourceId] = useState('');
  const [dataSources, setDataSources] = useState([]);
  
  // Custom configuration based on widget type
  const [color, setColor] = useState('#6366f1');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        const res = await appClient.get(`/applications/${applicationId}/data-sources`);
        setDataSources(res.data.sources || res.data.dataSources || []);
      } catch (err) {
        console.error("Failed to load data sources", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDataSources();
  }, [applicationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const config = {
        data_source_id: dataSourceId,
        color: color
      };

      await appClient.post(`/applications/${applicationId}/dashboards/${dashboardId}/pages/${pageId}/widgets`, {
        title,
        widget_type: widgetType,
        position_x: 0,
        position_y: 0,
        width: widgetType === 'STATUS' || widgetType === 'SENSOR_VALUE' ? 2 : 4,
        height: widgetType === 'STATUS' || widgetType === 'SENSOR_VALUE' ? 2 : 4,
        configuration: config
      });
      onSuccess();
    } catch (err) {
      alert("Failed to create widget: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Configure Widget"
    >
      <form id="widget-form" onSubmit={handleSubmit}>
        <Input 
          label="Widget Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="e.g. Living Room Temperature"
          required
        />
        
        <Select 
          label="Visualization Type" 
          value={widgetType} 
          onChange={e => setWidgetType(e.target.value)}
        >
          <option value="STATUS">Status Indicator</option>
          <option value="SENSOR_VALUE">Metric (Number)</option>
          <option value="SENSOR_TABLE">Data Table</option>
          <option value="LINE_CHART">Time-series Line Chart</option>
          <option value="BAR_CHART">Bar Chart</option>
          <option value="TEXT">Static Text / Markdown</option>
        </Select>
        
        {widgetType !== 'TEXT' && (
          <Select 
            label="Data Source" 
            value={dataSourceId} 
            onChange={e => setDataSourceId(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">Select Data Source...</option>
            {dataSources.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </Select>
        )}
        
        {(widgetType === 'LINE_CHART' || widgetType === 'BAR_CHART' || widgetType === 'SENSOR_VALUE') && (
          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div className="flex gap-2">
              {['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'].map(preset => (
                <button 
                  key={preset}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${color === preset ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: preset }}
                  onClick={() => setColor(preset)}
                />
              ))}
              <input 
                type="color" 
                className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer bg-transparent"
                value={color} 
                onChange={e => setColor(e.target.value)} 
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8 pt-4 border-t border-white/10">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={submitting}>Create Widget</Button>
        </div>
      </form>
    </Modal>
  );
}
