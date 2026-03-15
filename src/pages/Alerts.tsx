/**
 * Alerts Dashboard - Temperature, Door, Device, Motion Alerts
 */

import { useState, useEffect } from 'react';

interface Alert {
  id: string;
  type: 'temperature' | 'door' | 'device' | 'motion' | 'connection';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  kennelId: string;
  deviceId?: string;
  acknowledged: boolean;
  createdAt: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Poll for new alerts
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    // Mock data - would connect to backend alerts API
    setAlerts([
      {
        id: 'alert-01',
        type: 'temperature',
        severity: 'critical',
        title: 'High Temperature Alert',
        message: 'Temperature in Main Kennel exceeded 30°C threshold',
        kennelId: 'kennel-01',
        deviceId: 'temp-01',
        acknowledged: false,
        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: 'alert-02',
        type: 'door',
        severity: 'warning',
        title: 'Door Opened Unexpectedly',
        message: 'Main door opened outside scheduled time',
        kennelId: 'kennel-01',
        deviceId: 'door-01',
        acknowledged: false,
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
      {
        id: 'alert-03',
        type: 'device',
        severity: 'critical',
        title: 'Device Offline',
        message: 'Camera in Feeding Area has been offline for 1 hour',
        kennelId: 'kennel-01',
        deviceId: 'cam-03',
        acknowledged: true,
        createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
      },
      {
        id: 'alert-04',
        type: 'motion',
        severity: 'info',
        title: 'Motion Detected',
        message: 'Motion detected in Secondary Kennel',
        kennelId: 'kennel-02',
        acknowledged: true,
        createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
      },
      {
        id: 'alert-05',
        type: 'connection',
        severity: 'warning',
        title: 'Connection Lost',
        message: 'Lost connection to water dispenser sensor',
        kennelId: 'kennel-01',
        deviceId: 'water-01',
        acknowledged: false,
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      },
    ]);
    setLoading(false);
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(a =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  const unacknowledged = alerts.filter(a => !a.acknowledged).length;
  const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  if (loading) {
    return <div className="p-6">Loading alerts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🔔 Alerts</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            🔴 {critical} Critical
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            ⚠️ {unacknowledged} Unacknowledged
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-4 py-2 rounded-lg ${filter === 'critical' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
        >
          Critical ({alerts.filter(a => a.severity === 'critical').length})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-4 py-2 rounded-lg ${filter === 'warning' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
        >
          Warning ({alerts.filter(a => a.severity === 'warning').length})
        </button>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filteredAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={() => acknowledgeAlert(alert.id)}
            onDelete={() => deleteAlert(alert.id)}
          />
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <span className="text-4xl">✅</span>
          <p className="mt-2">No alerts to display</p>
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onAcknowledge, onDelete }: { alert: Alert; onAcknowledge: () => void; onDelete: () => void }) {
  const severityStyles = {
    critical: 'border-l-red-500 bg-red-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    info: 'border-l-blue-500 bg-blue-50',
  };

  const severityBadge = {
    critical: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  const typeIcons: Record<string, string> = {
    temperature: '🌡️',
    door: '🚪',
    device: '📱',
    motion: '🏃',
    connection: '📡',
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${severityStyles[alert.severity]} ${alert.acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeIcons[alert.type]}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{alert.title}</h3>
              <span className={`px-2 py-0.5 rounded text-xs text-white ${severityBadge[alert.severity]}`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>📍 {alert.kennelId}</span>
              {alert.deviceId && <span>📱 {alert.deviceId}</span>}
              <span>🕐 {formatTime(alert.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!alert.acknowledged && (
            <button
              onClick={onAcknowledge}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              ✓ Acknowledge
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
}
