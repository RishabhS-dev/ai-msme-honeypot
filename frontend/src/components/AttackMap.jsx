import React, { useState, useEffect, useRef } from 'react';
import { Globe, MapPin, Activity, Filter, BarChart3, Eye, Shield } from 'lucide-react';

const AttackMap = ({ socket }) => {
  const [attacks, setAttacks] = useState([]);
  const [filteredAttacks, setFilteredAttacks] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [filter, setFilter] = useState('all');
  const [timeframe, setTimeframe] = useState('24h');
  const [mapView, setMapView] = useState('world');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [attackStats, setAttackStats] = useState({});
  const mapRef = useRef(null);

  // Mock world map coordinates for demonstration
  const worldCoordinates = {
    'United States': { lat: 39.8283, lng: -98.5795, attacks: 0 },
    'China': { lat: 35.8617, lng: 104.1954, attacks: 0 },
    'Russia': { lat: 61.5240, lng: 105.3188, attacks: 0 },
    'Germany': { lat: 51.1657, lng: 10.4515, attacks: 0 },
    'United Kingdom': { lat: 55.3781, lng: -3.4360, attacks: 0 },
    'France': { lat: 46.6034, lng: 1.8883, attacks: 0 },
    'Brazil': { lat: -14.2350, lng: -51.9253, attacks: 0 },
    'India': { lat: 20.5937, lng: 78.9629, attacks: 0 },
    'Japan': { lat: 36.2048, lng: 138.2529, attacks: 0 },
    'South Korea': { lat: 35.9078, lng: 127.7669, attacks: 0 },
    'Australia': { lat: -25.2744, lng: 133.7751, attacks: 0 },
    'Canada': { lat: 56.1304, lng: -106.3468, attacks: 0 },
    'Mexico': { lat: 23.6345, lng: -102.5528, attacks: 0 },
    'Turkey': { lat: 38.9637, lng: 35.2433, attacks: 0 },
    'Iran': { lat: 32.4279, lng: 53.6880, attacks: 0 },
    'Ukraine': { lat: 48.3794, lng: 31.1656, attacks: 0 },
    'Netherlands': { lat: 52.1326, lng: 5.2913, attacks: 0 },
    'Poland': { lat: 51.9194, lng: 19.1451, attacks: 0 },
    'Italy': { lat: 41.8719, lng: 12.5674, attacks: 0 },
    'Spain': { lat: 40.4637, lng: -3.7492, attacks: 0 }
  };

  useEffect(() => {
    fetchAttackData();
    
    if (socket) {
      socket.on('new-attack', handleNewAttack);
      socket.on('attack-geolocated', handleGeolocatedAttack);
      
      return () => {
        socket.off('new-attack', handleNewAttack);
        socket.off('attack-geolocated', handleGeolocatedAttack);
      };
    }
  }, [socket, timeframe]);

  useEffect(() => {
    filterAttacks();
    calculateStats();
  }, [attacks, filter]);

  const fetchAttackData = async () => {
    try {
      const response = await fetch(`/api/attacks/geolocation?timeframe=${timeframe}`);
      const data = await response.json();
      setAttacks(data.attacks || []);
    } catch (error) {
      console.error('Failed to fetch attack data:', error);
      // Fallback to mock data for demonstration
      generateMockAttacks();
    }
  };

  const generateMockAttacks = () => {
    const mockAttacks = [];
    const countries = Object.keys(worldCoordinates);
    const attackTypes = ['SSH Brute Force', 'Web Scan', 'Port Scan', 'SQL Injection', 'Malware', 'DDoS'];
    
    for (let i = 0; i < 100; i++) {
      const country = countries[Math.floor(Math.random() * countries.length)];
      const coords = worldCoordinates[country];
      
      mockAttacks.push({
        id: i,
        source_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: country,
        city: `City ${i}`,
        latitude: coords.lat + (Math.random() - 0.5) * 10,
        longitude: coords.lng + (Math.random() - 0.5) * 10,
        attack_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        target_port: [22, 80, 443, 3306, 21, 23][Math.floor(Math.random() * 6)],
        honeypot_name: `honeypot-${Math.floor(Math.random() * 5) + 1}`
      });
    }
    
    setAttacks(mockAttacks);
  };

  const handleNewAttack = (attack) => {
    setAttacks(prev => [attack, ...prev].slice(0, 1000));
  };

  const handleGeolocatedAttack = (attack) => {
    setAttacks(prev => 
      prev.map(a => a.id === attack.id ? { ...a, ...attack } : a)
    );
  };

  const filterAttacks = () => {
    let filtered = attacks;
    
    if (filter !== 'all') {
      filtered = filtered.filter(attack => attack.attack_type === filter);
    }
    
    setFilteredAttacks(filtered);
  };

  const calculateStats = () => {
    const stats = {
      total: attacks.length,
      countries: new Set(attacks.map(a => a.country)).size,
      topCountries: {},
      topPorts: {},
      severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    attacks.forEach(attack => {
      // Country stats
      stats.topCountries[attack.country] = (stats.topCountries[attack.country] || 0) + 1;
      
      // Port stats
      stats.topPorts[attack.target_port] = (stats.topPorts[attack.target_port] || 0) + 1;
      
      // Severity stats
      stats.severityDistribution[attack.severity] = (stats.severityDistribution[attack.severity] || 0) + 1;
    });

    setAttackStats(stats);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getAttackTypeColor = (type) => {
    const colors = {
      'SSH Brute Force': '#3b82f6',
      'Web Scan': '#8b5cf6',
      'Port Scan': '#06b6d4',
      'SQL Injection': '#ef4444',
      'Malware': '#dc2626',
      'DDoS': '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Simple SVG world map representation
  const renderWorldMap = () => {
    return (
      <div className="relative bg-blue-50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <svg
          ref={mapRef}
          viewBox="0 0 1000 500"
          className="w-full h-full"
          style={{ background: 'linear-gradient(to bottom, #dbeafe 0%, #bfdbfe 100%)' }}
        >
          {/* Simple world map outline */}
          <rect x="0" y="0" width="1000" height="500" fill="#3b82f6" fillOpacity="0.1" />
          
          {/* Continents (simplified shapes) */}
          <path d="M100 150 Q200 100 300 150 L350 200 Q300 250 200 240 Q150 220 100 200 Z" fill="#22c55e" fillOpacity="0.3" />
          <path d="M400 120 Q500 80 600 120 L650 180 Q600 230 500 220 Q450 200 400 180 Z" fill="#22c55e" fillOpacity="0.3" />
          <path d="M700 100 Q800 60 900 100 L950 160 Q900 210 800 200 Q750 180 700 160 Z" fill="#22c55e" fillOpacity="0.3" />
          
          {/* Attack points */}
          {filteredAttacks.map((attack, index) => {
            const x = ((attack.longitude + 180) / 360) * 1000;
            const y = ((90 - attack.latitude) / 180) * 500;
            
            return (
              <g key={attack.id}>
                {/* Attack pulse animation */}
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={getSeverityColor(attack.severity)}
                  fillOpacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={getSeverityColor(attack.severity)}
                  className="cursor-pointer"
                  onClick={() => setSelectedCountry(attack)}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
          <h4 className="text-sm font-semibold mb-2">Severity Levels</h4>
          <div className="space-y-1">
            {['critical', 'high', 'medium', 'low'].map(severity => (
              <div key={severity} className="flex items-center space-x-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSeverityColor(severity) }}
                />
                <span className="capitalize">{severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const topCountries = Object.entries(attackStats.topCountries || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const uniqueAttackTypes = [...new Set(attacks.map(a => a.attack_type))];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Global Attack Map</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">All Attack Types</option>
              {uniqueAttackTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{attackStats.total || 0}</div>
            <p className="text-sm text-gray-500">Total Attacks</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{attackStats.countries || 0}</div>
            <p className="text-sm text-gray-500">Countries</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{filteredAttacks.length}</div>
            <p className="text-sm text-gray-500">Filtered</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(attackStats.topPorts || {}).length}
            </div>
            <p className="text-sm text-gray-500">Target Ports</p>
          </div>
        </div>
      </div>

      {/* World Map */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Attack Origins</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1 rounded text-sm ${showHeatmap ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              <Activity className="w-4 h-4 inline mr-1" />
              Heatmap
            </button>
          </div>
        </div>
        
        {renderWorldMap()}
      </div>

      {/* Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">Top Attack Sources</h3>
          </div>
          
          <div className="space-y-3">
            {topCountries.map(([country, count], index) => (
              <div key={country} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium">{country}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(count / topCountries[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-red-600">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attacks */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Recent Attacks</h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-3">
            {filteredAttacks.slice(0, 10).map((attack) => (
              <div key={attack.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{attack.attack_type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium`}
                        style={{ 
                          backgroundColor: getSeverityColor(attack.severity) + '20',
                          color: getSeverityColor(attack.severity)
                        }}>
                    {attack.severity}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>IP: {attack.source_ip}</div>
                  <div>Country: {attack.country}</div>
                  <div>Port: {attack.target_port}</div>
                  <div>Time: {formatTimestamp(attack.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attack Details Modal */}
      {selectedCountry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Attack Details</h3>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm">{selectedCountry.source_ip} ({selectedCountry.country})</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Attack Type</label>
                  <p className="text-sm">{selectedCountry.attack_type}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Port</label>
                  <p className="text-sm">{selectedCountry.target_port}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium`}
                        style={{ 
                          backgroundColor: getSeverityColor(selectedCountry.severity) + '20',
                          color: getSeverityColor(selectedCountry.severity)
                        }}>
                    {selectedCountry.severity}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm">{formatTimestamp(selectedCountry.timestamp)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttackMap;