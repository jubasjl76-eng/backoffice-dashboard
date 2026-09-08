/**
 * Kennel Monitor - Real-time IoT Monitoring Dashboard
 */

import { useState, useEffect } from 'react';

interface KennelData {
  id: string;
  name: string;
  temperature: number;
  humidity: number;
  doorStatus: 'open' | 'closed';
  motionDetected: boolean;
  devices: {
    feeders: number;
    water: number;
    cameras: number;
    sensors: number;
  };
  alerts: number;
  lastUpdate: string;
}

export default function KennelMonitor() {
  const [kennels, setKennels] = useState<KennelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKennel, setSelectedKennel] = useState<string>('kennel-01');

  useEffect(() => {
    loadKennels();
    const interval = setInterval(loadKennels, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadKennels = async () => {
    try {
      // Mock data for now - would connect to backend
      setKennels([
        {
          id: 'kennel-01',
          name: 'Main Kennel',
          temperature: 22.5,
          humidity: 45,
          doorStatus: 'closed',
          motionDetected: false,
          devices: { feeders: 2, water: 1, cameras: 2, sensors: 4 },
          alerts: 0,
          lastUpdate: new Date().toISOString(),
        },
        {
          id: 'kennel-02',
          name: 'Secondary Kennel',
          temperature: 21.0,
          humidity: 50,
          doorStatus: 'closed',
          motionDetected: true,
          devices: { feeders: 1, water: 1, cameras: 1, sensors: 2 },
          alerts: 1,
          lastUpdate: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load kennels:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentKennel = kennels.find(k => k.id === selectedKennel);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🐕 Kennel Monitor</h1>
        <select
          value={selectedKennel}
          onChange={(e) => setSelectedKennel(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {kennels.map(k => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </div>

      {currentKennel && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatusCard
              title="🌡️ Temperature"
              value={`${currentKennel.temperature}°C`}
              status={currentKennel.temperature > 25 ? 'warning' : 'normal'}
            />
            <StatusCard
              title="💧 Humidity"
              value={`${currentKennel.humidity}%`}
              status={currentKennel.humidity > 60 ? 'warning' : 'normal'}
            />
            <StatusCard
              title="🚪 Door"
              value={currentKennel.doorStatus === 'open' ? 'Open' : 'Closed'}
              status={currentKennel.doorStatus === 'open' ? 'warning' : 'normal'}
            />
            <StatusCard
              title="🔔 Alerts"
              value={currentKennel.alerts.toString()}
              status={currentKennel.alerts > 0 ? 'error' : 'normal'}
            />
          </div>

          {/* Device Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">📱 Device Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DeviceStat icon="🍖" label="Feeders" value={currentKennel.devices.feeders} />
              <DeviceStat icon="💧" label="Water" value={currentKennel.devices.water} />
              <DeviceStat icon="📹" label="Cameras" value={currentKennel.devices.cameras} />
              <DeviceStat icon="📡" label="Sensors" value={currentKennel.devices.sensors} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Feed All
                </button>
                <button className="w-full px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
                  Dispense Water
                </button>
                <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                  View All Cameras
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📊 Activity</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Last Feed:</span>
                  <span>2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Water:</span>
                  <span>30 min ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Motion Detected:</span>
                  <span className={currentKennel.motionDetected ? 'text-red-500' : 'text-green-500'}>
                    {currentKennel.motionDetected ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update:</span>
                  <span>{new Date(currentKennel.lastUpdate).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ title, value, status }: { title: string; value: string; status: string }) {
  const colors = {
    normal: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  };
  
  return (
    <div className={`p-4 rounded-lg border ${colors[status as keyof typeof colors]}`}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function DeviceStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
