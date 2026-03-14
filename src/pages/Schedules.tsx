import React from 'react';

export const Schedules: React.FC = () => {
  const schedules = [
    { device: 'Living Room Feeder', time: '08:00 AM', action: 'Feed', enabled: true },
    { device: 'Living Room Feeder', time: '12:00 PM', action: 'Feed', enabled: true },
    { device: 'Living Room Feeder', time: '06:00 PM', action: 'Feed', enabled: true },
    { device: 'Kitchen Water', time: '09:00 AM', action: 'Dispense', enabled: true },
    { device: 'Kitchen Water', time: '03:00 PM', action: 'Dispense', enabled: false },
    { device: 'Bedroom Feeder', time: '07:00 AM', action: 'Feed', enabled: true },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">⏰ Schedules</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Total Schedules</span>
          <p className="text-3xl font-bold text-white mt-2">{schedules.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Active</span>
          <p className="text-3xl font-bold text-green-500 mt-2">{schedules.filter(s => s.enabled).length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Paused</span>
          <p className="text-3xl font-bold text-yellow-500 mt-2">{schedules.filter(s => !s.enabled).length}</p>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">All Schedules</h2>
        <div className="space-y-3">
          {schedules.map((schedule, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{schedule.action === 'Feed' ? '🐶' : '💧'}</span>
                <div>
                  <p className="text-white font-medium">{schedule.device}</p>
                  <p className="text-slate-400 text-sm">{schedule.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-white font-medium text-lg">{schedule.time}</p>
                <button 
                  className={`px-3 py-1 rounded text-sm ${schedule.enabled ? 'bg-green-600' : 'bg-slate-600'}`}
                >
                  {schedule.enabled ? 'Active' : 'Paused'}
                </button>
                <button className="text-slate-400 hover:text-white">✏️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg">
          + Add Schedule
        </button>
      </div>
    </div>
  );
};
