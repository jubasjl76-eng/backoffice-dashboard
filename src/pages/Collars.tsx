import React, { useState, useEffect } from 'react';

interface Device {
  _id: string;
  name: string;
  deviceId: string;
  type: string;
  status: string;
  battery: number;
  firmware: string;
  lastSeen: string;
  isOnline: boolean;
}

interface Dog {
  _id: string;
  name: string;
  breed: string;
  deviceId: Device;
}

interface Alert {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  dogId: Dog;
}

interface Location {
  latitude: number;
  longitude: number;
  timestamp: string;
  battery: number;
  speed: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const Collars: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [latestLocation, setLatestLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'map' | 'alerts'>('devices');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchLatestLocation, 10000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [devicesRes, dogsRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/collar/devices`, { headers }),
        fetch(`${API_URL}/collar/dogs`, { headers }),
        fetch(`${API_URL}/collar/alerts?limit=20`, { headers }),
      ]);

      const devicesData = await devicesRes.json();
      const dogsData = await dogsRes.json();
      const alertsData = await alertsRes.json();

      setDevices(devicesData.devices || []);
      setDogs(dogsData.dogs || []);
      setAlerts(alertsData.alerts || []);

      if (devicesData.devices?.length > 0 && !selectedDevice) {
        setSelectedDevice(devicesData.devices[0]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestLocation = async () => {
    if (!selectedDevice || !selectedDevice._id) return;
    
    const dog = dogs.find(d => d.deviceId?._id === selectedDevice._id);
    if (!dog) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${API_URL}/collar/locations/latest/${dog._id}`, { headers });
      const data = await response.json();
      if (data.location) {
        setLatestLocation(data.location);
      }
    } catch (error) {
      console.error('Failed to fetch location:', error);
    }
  };

  const markAlertRead = async (alertId: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await fetch(`${API_URL}/collar/alerts/${alertId}/read`, { 
        method: 'PUT',
        headers 
      });
      setAlerts(alerts.map(a => 
        a._id === alertId ? { ...a, read: true } : a
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'low_battery': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTimeSince = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_battery': return '🔋';
      case 'zone_exit': return '🚪';
      case 'zone_enter': return '🔔';
      case 'device_offline': return '📴';
      case 'speed_alert': return '⚡';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">🐕 GPS Collars</h1>
          <p className="text-slate-400">Manage dog collars and track locations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'devices' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            📱 Devices
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'map' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'alerts' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🔔 Alerts ({alerts.filter(a => !a.read).length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Collars</p>
          <p className="text-2xl font-bold text-white">{devices.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Online</p>
          <p className="text-2xl font-bold text-green-500">
            {devices.filter(d => d.status === 'online').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Low Battery</p>
          <p className="text-2xl font-bold text-yellow-500">
            {devices.filter(d => d.status === 'low_battery').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Offline</p>
          <p className="text-2xl font-bold text-red-500">
            {devices.filter(d => d.status === 'offline').length}
          </p>
        </div>
      </div>

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="text-left p-4 text-slate-400 font-medium">Device</th>
                <th className="text-left p-4 text-slate-400 font-medium">Dog</th>
                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                <th className="text-left p-4 text-slate-400 font-medium">Battery</th>
                <th className="text-left p-4 text-slate-400 font-medium">Last Seen</th>
                <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const dog = dogs.find(d => d.deviceId?._id === device._id);
                return (
                  <tr key={device._id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📍</span>
                        <div>
                          <p className="text-white font-medium">{device.name}</p>
                          <p className="text-slate-500 text-sm">{device.deviceId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {dog?.name || 'Unassigned'}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(device.status)}`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${
                          device.battery > 50 ? '' : device.battery > 20 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {device.battery > 50 ? '🔋' : '🪫'}
                        </span>
                        <span className="text-white">{device.battery}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">
                      {device.lastSeen ? getTimeSince(device.lastSeen) : 'Never'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedDevice(device)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        View on Map
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {devices.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No collar devices registered
            </div>
          )}
        </div>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="h-[500px] flex items-center justify-center bg-slate-900">
            {latestLocation ? (
              <div className="text-center">
                <p className="text-6xl mb-4">🐕</p>
                <p className="text-white text-lg font-medium">
                  {selectedDevice?.name || 'Device'}
                </p>
                <p className="text-slate-400">
                  📍 {latestLocation.latitude.toFixed(6)}, {latestLocation.longitude.toFixed(6)}
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Last update: {getTimeSince(latestLocation.timestamp)}
                </p>
                {latestLocation.speed > 0 && (
                  <p className="text-slate-400 mt-1">
                    Speed: {Math.round(latestLocation.speed * 3.6)} km/h
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <p className="text-4xl mb-4">🗺️</p>
                <p>Select a device to view location</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              Device: <span className="text-white">{selectedDevice?.name || 'None selected'}</span>
            </p>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-start gap-4 ${
                !alert.read ? 'border-l-4 border-l-indigo-500' : ''
              }`}
            >
              <span className="text-2xl">{getAlertIcon(alert.type)}</span>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-medium">{alert.title}</h3>
                    <p className="text-slate-400 text-sm">{alert.message}</p>
                  </div>
                  <span className="text-slate-500 text-sm">
                    {getTimeSince(alert.createdAt)}
                  </span>
                </div>
                {!alert.read && (
                  <button
                    onClick={() => markAlertRead(alert._id)}
                    className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
              <p className="text-slate-400">No alerts</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
