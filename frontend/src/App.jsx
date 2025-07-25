import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import HoneypotStatus from './components/HoneypotStatus';
import AlertPanel from './components/AlertPanel';
import AttackMap from './components/AttackMap';
import ThreatAnalysis from './components/ThreatAnalysis';

const socket = io('http://localhost:5000'); // Connect to Backend API (adjust if needed)

function App() {
  const [honeypots, setHoneypots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState({});

  useEffect(() => {
    // Placeholder Data until backend feeds in
    setHoneypots([
      { name: 'SSH-Honeypot', type: 'SSH', port: 2222, status: 'running' },
      { name: 'Web-Honeypot', type: 'HTTP', port: 8080, status: 'running' },
    ]);

    setAlerts([
      { timestamp: '2025-07-25 10:15', type: 'Brute Force Attack', sourceIP: '203.0.113.10', severity: 'High' },
      { timestamp: '2025-07-25 09:50', type: 'SQL Injection Attempt', sourceIP: '192.0.2.25', severity: 'Medium' },
    ]);

    setAnalytics({
      totalAttacks: 1287,
      topAttackTypes: { 'Brute Force': 700, 'SQL Injection': 400, 'Port Scans': 187 },
      attackTrend: [100, 120, 150, 180, 220, 250, 300],
    });

    // Live WebSocket updates
    socket.on('honeypot-update', data => setHoneypots(data));
    socket.on('alert', alert => setAlerts(prev => [alert, ...prev.slice(0, 19)]));
    socket.on('threat-analytics', data => setAnalytics(data));

    return () => {
      socket.off('honeypot-update');
      socket.off('alert');
      socket.off('threat-analytics');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-900 text-white py-4 text-center text-2xl font-bold shadow-md">
        🛡️ AI-Driven Honeypot Monitoring Dashboard
      </header>

      <main className="flex flex-wrap gap-4 p-4">
        <div className="w-full md:w-1/3 space-y-4">
          <HoneypotStatus honeypots={honeypots} />
          <AlertPanel alerts={alerts} />
        </div>

        <div className="w-full md:w-2/3 space-y-4">
          <AttackMap honeypots={honeypots} />
          <ThreatAnalysis analytics={analytics} />
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-300 text-center text-sm p-2">
        &copy; 2025 AI-Honeypot for MSMEs | Built with ❤️
      </footer>
    </div>
  );
}

export default App;
