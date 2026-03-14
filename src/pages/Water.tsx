import React from 'react';

export const Water: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">💧 Water Dispensers</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Total Dispensers</span>
          <p className="text-3xl font-bold text-white mt-2">8</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Online</span>
          <p className="text-3xl font-bold text-green-500 mt-2">7</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Low Water</span>
          <p className="text-3xl font-bold text-yellow-500 mt-2">1</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Water Quality OK</span>
          <p className="text-3xl font-bold text-green-500 mt-2">6</p>
        </div>
      </div>

      {/* Dispensers List */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Registered Water Dispensers</h2>
        <div className="space-y-3">
          {[
            { name: 'Living Room', status: 'online', water: 80, quality: 'Good', temp: 22 },
            { name: 'Kitchen', status: 'online', water: 45, quality: 'Good', temp: 21 },
            { name: 'Garden', status: 'offline', water: 30, quality: 'Poor', temp: 18 },
            { name: 'Bedroom', status: 'online', water: 95, quality: 'Good', temp: 23 },
          ].map((dispenser, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-2xl">💧</span>
                <div>
                  <p className="text-white font-medium">{dispenser.name}</p>
                  <p className="text-slate-400 text-sm capitalize">{dispenser.status}</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-white font-medium">{dispenser.water}%</p>
                  <p className="text-slate-400 text-sm">Water</p>
                </div>
                <div>
                  <p className="text-green-500 font-medium">{dispenser.quality}</p>
                  <p className="text-slate-400 text-sm">Quality</p>
                </div>
                <div>
                  <p className="text-white font-medium">{dispenser.temp}°C</p>
                  <p className="text-slate-400 text-sm">Temp</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4">
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg">
          + Add Dispenser
        </button>
        <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg">
          Dispense Now
        </button>
      </div>
    </div>
  );
};
