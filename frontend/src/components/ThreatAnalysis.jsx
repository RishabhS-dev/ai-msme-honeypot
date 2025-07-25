import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Shield, AlertTriangle, Target, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const ThreatAnalysis = ({ socket }) => {
  const [analysisData, setAnalysisData] = useState({
    threat_trends: [],
    attack_patterns: [],
    risk_assessment: {},
    predictions: [],
    anomalies: [],
    recommendations: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [expandedSections, setExpandedSections] = useState({
    patterns: true,
    predictions: true,
    anomalies: true,
    recommendations: true
  });

  useEffect(() => {
    fetchAnalysisData();
    
    if (socket) {
      socket.on('threat-analysis-update', handleAnalysisUpdate);
      socket.on('new-prediction', handleNewPrediction);
      
      return () => {
        socket.off('threat-analysis-update', handleAnalysisUpdate);
        socket.off('new-prediction', handleNewPrediction);
      };
    }
  }, [socket, selectedTimeframe]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analysis/threats?timeframe=${selectedTimeframe}`);
      const data = await response.json();
      setAnalysisData(data);
    } catch (error) {
      console.error('Failed to fetch threat analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisUpdate = (newData) => {
    setAnalysisData(prev => ({
      ...prev,
      ...newData
    }));
  };

  const handleNewPrediction = (prediction) => {
    setAnalysisData(prev => ({
      ...prev,
      predictions: [prediction, ...prev.predictions].slice(0, 10)
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">AI Threat Analysis</h2>
          </div>
          
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Risk Assessment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysisData.risk_assessment?.overall_risk)}`}>
              <Shield className="w-4 h-4 mr-1" />
              {analysisData.risk_assessment?.overall_risk || 'Unknown'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Overall Risk</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analysisData.threat_trends?.length || 0}
            </div>
            <p className="text-xs text-gray-500">Active Threats</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analysisData.predictions?.length || 0}
            </div>
            <p className="text-xs text-gray-500">Predictions</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {analysisData.anomalies?.length || 0}
            </div>
            <p className="text-xs text-gray-500">Anomalies</p>
          </div>
        </div>

        {/* Threat Trends Chart */}
        {analysisData.threat_trends?.length > 0 && (
          <div className="h-64">
            <h3 className="text-lg font-medium mb-4">Threat Activity Trends</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysisData.threat_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="threat_count" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="severity_score" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Attack Patterns */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <button
            onClick={() => toggleSection('patterns')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold">Attack Patterns</h3>
            </div>
            {expandedSections.patterns ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        
        {expandedSections.patterns && (
          <div className="p-4">
            {analysisData.attack_patterns?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.attack_patterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attack_type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="frequency" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysisData.attack_patterns}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="frequency"
                      >
                        {analysisData.attack_patterns.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No attack patterns detected</p>
            )}
          </div>
        )}
      </div>

      {/* AI Predictions */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <button
            onClick={() => toggleSection('predictions')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">AI Predictions</h3>
            </div>
            {expandedSections.predictions ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        
        {expandedSections.predictions && (
          <div className="p-4">
            {analysisData.predictions?.length > 0 ? (
              <div className="space-y-4">
                {analysisData.predictions.map((prediction, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{prediction.event_type || 'Security Event'}</h4>
                      <span className="text-sm text-gray-500">
                        Confidence: {formatConfidence(prediction.confidence)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Predicted Time: {new Date(prediction.predicted_time).toLocaleString()}</span>
                      <span className={`px-2 py-1 rounded ${getRiskColor(prediction.severity)}`}>
                        {prediction.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No predictions available</p>
            )}
          </div>
        )}
      </div>

      {/* Anomaly Detection */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <button
            onClick={() => toggleSection('anomalies')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Anomaly Detection</h3>
            </div>
            {expandedSections.anomalies ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        
        {expandedSections.anomalies && (
          <div className="p-4">
            {analysisData.anomalies?.length > 0 ? (
              <div className="space-y-4">
                {analysisData.anomalies.map((anomaly, index) => (
                  <div key={index} className="border rounded-lg p-4 border-l-4 border-l-orange-500">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{anomaly.type || 'Network Anomaly'}</h4>
                      <span className="text-sm text-orange-600">
                        Score: {anomaly.anomaly_score?.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{anomaly.description}</p>
                    <div className="text-xs text-gray-500">
                      Detected: {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No anomalies detected</p>
            )}
          </div>
        )}
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <button
            onClick={() => toggleSection('recommendations')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">AI Recommendations</h3>
            </div>
            {expandedSections.recommendations ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        
        {expandedSections.recommendations && (
          <div className="p-4">
            {analysisData.recommendations?.length > 0 ? (
              <div className="space-y-4">
                {analysisData.recommendations.map((recommendation, index) => (
                  <div key={index} className="border rounded-lg p-4 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{recommendation.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${getRiskColor(recommendation.priority)}`}>
                        {recommendation.priority} Priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
                    
                    {recommendation.actions && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Recommended Actions:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {recommendation.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
                      <span>Impact: {recommendation.impact}</span>
                      <span>Effort: {recommendation.effort}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recommendations available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreatAnalysis;