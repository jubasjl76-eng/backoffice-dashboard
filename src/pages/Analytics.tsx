import React from 'react';

export const Analytics: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">📈 Analytics</h1>
      
      {/* Time Period */}
      <div className="flex gap-2 mb-6">
        {['Today', 'Week', 'Month', 'Year'].map((period) => (
          <button key={period} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white">
            {period}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Total Events</span>
          <p className="text-3xl font-bold text-white mt-2">2,139</p>
          <p className="text-green-500 text-sm mt-2">↑ 12% from last week</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Feedings</span>
          <p className="text-3xl font-bold text-white mt-2">1,247</p>
          <p className="text-green-500 text-sm mt-2">↑ 8% from last week</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Water Dispensed</span>
          <p className="text-3xl font-bold text-white mt-2">892</p>
          <p className="text-green-500 text-sm mt-2">↑ 15% from last week</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Active Devices</span>
          <p className="text-3xl font-bold text-white mt-2">20/20</p>
          <p className="text-green-500 text-sm mt-2">100% uptime</p>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Events Over Time</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
              <div key={i} className="flex-1 bg-indigo-600 rounded-t" style={{ height: `${height}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-slate-400 text-sm">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Device Activity</h2>
          <div className="space-y-4">
            {[
              { name: 'Living Room Feeder', activity: 95 },
              { name: 'Kitchen Water', activity: 88 },
              { name: 'Bedroom Feeder', activity: 72 },
              { name: 'Garden Dispenser', activity: 65 },
            ].map((device, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white">{device.name}</span>
                  <span className="text-slate-400">{device.activity}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${device.activity}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
