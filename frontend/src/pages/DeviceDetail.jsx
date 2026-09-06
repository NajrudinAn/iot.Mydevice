import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../api/client';
import { Activity, Terminal, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function DeviceDetail() {
  const { applicationId, applicationSlug, deviceId } = useParams();
  const navigate = useNavigate();
  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;

  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Command state
  const [command, setCommand] = useState('');
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandError, setCommandError] = useState('');
  const [commandSuccess, setCommandSuccess] = useState('');

  const fetchTelemetry = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/devices/${deviceId}/data`);
      setTelemetry(res.data.data || []);
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to read data from this device.');
      } else {
        setError('Failed to load telemetry data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [applicationId, deviceId]);

  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    setCommandLoading(true);
    setCommandError('');
    setCommandSuccess('');
    try {
      await appClient.post(`/applications/${applicationId}/devices/${deviceId}/command`, { command });
      setCommandSuccess('Command sent successfully.');
      setCommand('');
    } catch (err) {
      if (err.response?.status === 403) {
        setCommandError('You do not have permission to command this device.');
      } else {
        setCommandError(err.response?.data?.message || 'Failed to send command.');
      }
    } finally {
      setCommandLoading(false);
    }
  };

  const columns = [
    { header: 'Time', field: 'recorded_at', render: (row) => new Date(row.recorded_at).toLocaleString() },
    { header: 'Temperature', field: 'temperature', render: (row) => row.temperature != null ? `${row.temperature.toFixed(2)} °C` : '-' },
    { header: 'Humidity', field: 'humidity', render: (row) => row.humidity != null ? `${row.humidity.toFixed(2)} %` : '-' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-4">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`${basePath}/devices`)}>Back to Devices</Button>
      </div>

      <PageHeader 
        title={`Device: ${deviceId}`} 
        description="Inspect device telemetry and dispatch commands."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Activity className="text-primary" size={18} />
              <h3 className="font-bold">Live Telemetry</h3>
            </div>
            {error ? (
              <div className="p-8 text-center text-red-400 bg-red-500/10 m-4 rounded">{error}</div>
            ) : (
              <Table 
                columns={columns} 
                data={telemetry} 
                loading={loading} 
                emptyMessage="No telemetry data received yet."
              />
            )}
          </Card>
        </div>

        <div>
          <Card>
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Terminal className="text-primary" size={18} />
              <h3 className="font-bold">Command Center</h3>
            </div>
            <div className="p-6">
              {commandError && <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded">{commandError}</div>}
              {commandSuccess && <div className="text-green-400 text-sm mb-4 bg-green-500/10 p-2 rounded">{commandSuccess}</div>}
              
              <form onSubmit={handleSendCommand}>
                <Input
                  label="Payload"
                  placeholder="e.g. SET_TEMP:22"
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  className="mb-4"
                />
                <Button type="submit" loading={commandLoading} className="w-full">
                  Send Command
                </Button>
              </form>
              <p className="text-xs text-muted mt-4">
                Note: Ensure you have `can_command` permission for this device before attempting to send messages.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
