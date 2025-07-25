import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Activity, MapPin, Users, Target, Zap, Clock, TrendingUp, Bell } from 'lucide-react';

const Dashboard = () => {
  const [attackData, setAttackData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [honeypotStatus, setHoneypotStatus] = useState({});
  const [statistics, setStatistics] = useState({
    totalEvents: 0,
    uniqueAttackers: 0,
    portsTargeted: 0,
    threatLevel: 'Low',
    attackIntensity: 'Low'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  // Simulated real-time data for demo
  useEffect(() => {
    const generateDemoData = () => {
      const demoAttacks = [
        {
          id: '1',
          type: 'brute_force',
          severity: 'high',
          source_ip: '192.168.1.100',
          timestamp: new Date().toISOString(),
          description: 'SSH Brute Force Attack - 45 attempts detected',
          location: { country: 'Russia', city: 'Moscow', lat: 55.7558, lng: 37.6176 }
        },
        {
          id: '2',
          type: 'port_scan',
          severity: 'medium',
          source_ip: '10.0.0.50',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          description: 'Port Scanning - 12 ports targeted',
          location: { country: 'China', city: 'Beijing', lat: 39.9042, lng: 116.4074 }
        },
        {
          id: '3',
          type: 'web_attack',
          severity: 'high',
          source_ip: '172.16.0.10',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          description: 'SQL Injection attempt on web application',
          location: { country: 'USA', city: 'New York', lat: 40.7128, lng: -74.0060 }
        }
      ];

      const demoAlerts = [
        {
          id: 'alert-1',
          severity: 'critical',
          title: 'Critical Brute Force Attack',
          message: 'Immediate action required - SSH service under attack',
          timestamp: new Date().toISOString(),
          actions: ['Block IP', 'Change SSH Port', 'Enable Fail2Ban']
        },
        {
          id: 'alert-2',
          severity: 'high',
          title: 'Persistent Attacker Detected',
          message: 'Same IP attacking multiple services',
          timestamp: new Date(Date.now() - 180000).toISOString(),
          actions: ['Block IP Range', 'Review Firewall Rules']
        }
      ];

      setAttackData(demoAttacks);
      setAlerts(demoAlerts);
      setStatistics({
        totalEvents: 127,
        uniqueAttackers: 8,
        portsTargeted: 15,
        threatLevel: 'High',
        attackIntensity: 'Medium'
      });
      setHoneypotStatus({
        ssh: { status: 'active', attacks: 45, port: 22 },
        web: { status: 'active', attacks: 23, port: 80 },
        ftp: { status: 'spawning', attacks: 8, port: 21 },
        smb: { status: 'idle', attacks: 2, port: 445 }
      });
      setIsConnected(true);
    };

    generateDemoData();
    const interval = setInterval(generateDemoData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[severity] || 'bg-gray-500';
  };

  const getThreatLevelColor = (level) => {
    const colors = {
      Critical: 'text-red-600 bg-red-100',
      High: 'text-orange-600 bg-orange-100',
      Medium: 'text-yellow-600 bg-yellow-100',
      Low: 'text-green-600 bg-green-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleActionClick = (action, alertId) => {
    console.log(`Executing action: ${action} for alert: ${alertId}`);
    // In real implementation, this would call the backend API
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Honeypot Security Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time threat monitoring for your business</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-2 rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <select 
              value={selectedTimeRange} 
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Attackers</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.uniqueAttackers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ports Targeted</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.portsTargeted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Threat Level</p>
              <p className={`text-lg font-bold px-3 py-1 rounded-full ${getThreatLevelColor(statistics.threatLevel)}`}>
                {statistics.threatLevel}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attack Intensity</p>
              <p className="text-lg font-bold text-gray-900">{statistics.attackIntensity}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Alerts */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-red-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Critical Alerts</h2>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active alerts</p>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className={`w-3 h-3 rounded-full mr-2 ${getSeverityColor(alert.severity)}`}></div>
                            <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                          <div className="flex items-center text-xs text-gray-500 mb-3">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimestamp(alert.timestamp)}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">Recommended Actions:</p>
                            {alert.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleActionClick(action, alert.id)}
                                className="block w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attack Feed */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Live Attack Feed</h2>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Updates
                </div>
              </div>
            </div>
            <div className="p-6">
              {attackData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No attacks detected</p>
              ) : (
                <div className="space-y-4">
                  {attackData.map((attack) => (
                    <div key={attack.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className={`w-3 h-3 rounded-full mr-2 ${getSeverityColor(attack.severity)}`}></div>
                            <h3 className="font-semibold text-gray-900 capitalize">
                              {attack.type.replace('_', ' ')} Attack
                            </h3>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getSeverityColor(attack.severity)} text-white`}>
                              {attack.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{attack.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {attack.source_ip}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimestamp(attack.timestamp)}
                            </div>
                            {attack.location && (
                              <div>
                                📍 {attack.location.city}, {attack.location.country}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Honeypot Status */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-purple-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Honeypot Status</h2>
              <span className="ml-2 text-sm text-gray-500">(Dynamic Adaptation Active)</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(honeypotStatus).map(([service, status]) => (
                <div key={service} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 uppercase">{service}</h3>
                    <div className="flex items-center">
                      {status.status === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>}
                      {status.status === 'spawning' && <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>}
                      {status.status === 'idle' && <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        status.status === 'active' ? 'bg-green-100 text-green-800' :
                        status.status === 'spawning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Port:</span>
                      <span className="font-mono">{status.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attacks:</span>
                      <span className="font-semibold text-red-600">{status.attacks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Business Recommendations */}
      <div className="mt-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Security Recommendations for Your Business</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">🔒 Immediate Actions</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Change default SSH port from 22</li>
                <li>• Enable strong password policies</li>
                <li>• Block suspicious IP addresses</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">🛡️ Medium-term</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Implement multi-factor authentication</li>
                <li>• Set up intrusion detection system</li>
                <li>• Regular security training for staff</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">📈 Long-term</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Deploy enterprise security tools</li>
                <li>• Conduct regular penetration testing</li>
                <li>• Develop incident response plan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;