/**
 * Sensors Dashboard - Temperature, Humidity, Door Status
 */

import { useState, useEffect } from 'react';

interface SensorData {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'door' | 'motion' | 'airquality';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  location: string;
  lastUpdate: string;
  history: { time: string; value: number }[];
}

export default function Sensors() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSensors();
    const interval = setInterval(loadSensors, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSensors = async () => {
    // Mock data - would connect to sensors service API
    setSensors([
      {
        id: 'temp-01',
        name: 'Kennel Temperature',
        type: 'temperature',
        value: 22.5,
        unit: '°C',
        status: 'normal',
        location: 'Main Kennel',
        lastUpdate: new Date().toISOString(),
        history: generateMockHistory(22, 3),
      },
      {
        id: 'temp-02',
        name: 'Outdoor Temperature',
        type: 'temperature',
        value: 28.0,
        unit: '°C',
        status: 'warning',
        location: 'Outside',
        lastUpdate: new Date().toISOString(),
        history: generateMockHistory(28, 5),
      },
      {
        id: 'humid-01',
        name: 'Kennel Humidity',
        type: 'humidity',
        value: 45,
        unit: '%',
        status: 'normal',
        location: 'Main Kennel',
        lastUpdate: new Date().toISOString(),
        history: generateMockHistory(45, 10),
      },
      {
        id: 'door-01',
        name: 'Main Door',
        type: 'door',
        value: 0,
        unit: '',
        status: 'normal',
        location: 'Kennel Entrance',
        lastUpdate: new Date().toISOString(),
        history: [],
      },
      {
        id: 'air-01',
        name: 'Air Quality',
        type: 'airquality',
        value: 420,
        unit: 'ppm',
        status: 'normal',
        location: 'Main Kennel',
        lastUpdate: new Date().toISOString(),
        history: generateMockHistory(420, 50),
      },
    ]);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-6">Loading sensors...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📡 Sensors Dashboard</h1>
        <button
          onClick={loadSensors}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map(sensor => (
          <SensorCard key={sensor.id} sensor={sensor} />
        ))}
      </div>

      {/* Temperature & Humidity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🌡️ Temperature History (24h)</h2>
          <SimpleChart
            data={sensors.find(s => s.type === 'temperature')?.history || []}
            color="#ef4444"
            unit="°C"
          />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">💧 Humidity History (24h)</h2>
          <SimpleChart
            data={sensors.find(s => s.type === 'humidity')?.history || []}
            color="#3b82f6"
            unit="%"
          />
        </div>
      </div>

      {/* Door Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">🚪 Door Status</h2>
        <div className="space-y-2">
          {sensors.filter(s => s.type === 'door').map(door => (
            <div key={door.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{door.name}</div>
                <div className="text-sm text-gray-600">{door.location}</div>
              </div>
              <div className={`px-3 py-1 rounded-full ${door.value === 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {door.value === 1 ? '🚪 Open' : '🔒 Closed'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SensorCard({ sensor }: { sensor: SensorData }) {
  const statusColors = {
    normal: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
  };

  const icons: Record<string, string> = {
    temperature: '🌡️',
    humidity: '💧',
    door: '🚪',
    motion: '🏃',
    airquality: '🌬️',
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[sensor.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icons[sensor.type]}</span>
        <span className={`px-2 py-1 text-xs rounded-full ${sensor.status === 'normal' ? 'bg-green-200' : sensor.status === 'warning' ? 'bg-yellow-200' : 'bg-red-200'}`}>
          {sensor.status.toUpperCase()}
        </span>
      </div>
      <div className="text-3xl font-bold mb-1">
        {sensor.type === 'door' ? (sensor.value === 1 ? 'Open' : 'Closed') : `${sensor.value}${sensor.unit}`}
      </div>
      <div className="text-sm font-medium">{sensor.name}</div>
      <div className="text-xs text-gray-600">{sensor.location}</div>
      <div className="text-xs text-gray-400 mt-2">
        Updated: {new Date(sensor.lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  );
}

function SimpleChart({ data, color, unit }: { data: { time: string; value: number }[]; color: string; unit: string }) {
  if (data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-gray-500">No data</div>;
  }

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  return (
    <div className="h-40 flex items-end gap-1">
      {data.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-t"
            style={{
              height: `${((point.value - min) / range) * 100}%`,
              backgroundColor: color,
              minHeight: '4px',
            }}
            title={`${point.value}${unit}`}
          />
        </div>
      ))}
    </div>
  );
}

function generateMockHistory(base: number, variance: number): { time: string; value: number }[] {
  const history = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    history.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: base + (Math.random() - 0.5) * variance * 2,
    });
  }
  return history;
}
