const express = require('express');
const router = express.Router();
const { executeQuery } = require('../services/elasticsearch');
const honeypotManager = require('../services/honeypot-manager');
const { spawn } = require('child_process');
const path = require('path');

// Dashboard Overview Endpoint
router.get('/dashboard/overview', async (req, res) => {
  try {
    const overview = await getDashboardOverview();
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Attack Statistics
router.get('/attacks/statistics', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    const query = {
      query: {
        bool: {
          must: [
            { range: { '@timestamp': { gte: `now-${timeframe}` } } }
          ]
        }
      },
      aggs: {
        attack_types: { terms: { field: 'attack_type.keyword', size: 10 } },
        severity_levels: { terms: { field: 'severity.keyword' } },
        countries: { terms: { field: 'geoip.country_name.keyword', size: 15 } },
        hourly_attacks: {
          date_histogram: {
            field: '@timestamp',
            calendar_interval: '1h'
          }
        }
      }
    };

    const result = await executeQuery('honeypot-logs-*', query);
    
    res.json({
      success: true,
      data: {
        total_attacks: result.hits.total.value,
        attack_types: result.aggregations.attack_types.buckets,
        severity_distribution: result.aggregations.severity_levels.buckets,
        geographic_data: result.aggregations.countries.buckets,
        timeline: result.aggregations.hourly_attacks.buckets
      }
    });
  } catch (error) {
    console.error('Attack statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attack statistics'
    });
  }
});

// Real-time Attack Feed
router.get('/attacks/realtime', async (req, res) => {
  try {
    const query = {
      query: {
        bool: {
          must: [
            { range: { '@timestamp': { gte: 'now-5m' } } }
          ]
        }
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 50
    };

    const result = await executeQuery('honeypot-logs-*', query);
    
    res.json({
      success: true,
      data: result.hits.hits.map(hit => ({
        id: hit._id,
        timestamp: hit._source['@timestamp'],
        source_ip: hit._source.source_ip,
        target_port: hit._source.target_port,
        attack_type: hit._source.attack_type,
        severity: hit._source.severity,
        honeypot_type: hit._source.honeypot_type,
        location: hit._source.geoip,
        payload: hit._source.payload
      }))
    });
  } catch (error) {
    console.error('Real-time attacks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time data'
    });
  }
});

// AI Analysis Endpoint
router.post('/ai/analyze', async (req, res) => {
  try {
    const { attack_data, analysis_type = 'full' } = req.body;
    
    // Spawn Python AI analyzer
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../ai-engine/analyzer.py'),
      '--mode', analysis_type,
      '--data', JSON.stringify(attack_data)
    ]);

    let analysisResult = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      analysisResult += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(analysisResult);
          res.json({
            success: true,
            data: result
          });
        } catch (parseError) {
          res.status(500).json({
            success: false,
            error: 'Failed to parse AI analysis result'
          });
        }
      } else {
        console.error('AI analysis failed:', errorOutput);
        res.status(500).json({
          success: false,
          error: 'AI analysis failed'
        });
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate AI analysis'
    });
  }
});

// Threat Intelligence
router.get('/threats/intelligence', async (req, res) => {
  try {
    const { ip, timeframe = '7d' } = req.query;
    
    let query = {
      query: {
        bool: {
          must: [
            { range: { '@timestamp': { gte: `now-${timeframe}` } } }
          ]
        }
      },
      aggs: {
        malicious_ips: {
          terms: { field: 'source_ip.keyword', size: 100 },
          aggs: {
            attack_count: { value_count: { field: 'attack_type.keyword' } },
            latest_attack: { max: { field: '@timestamp' } }
          }
        },
        attack_patterns: {
          terms: { field: 'attack_signature.keyword', size: 20 }
        }
      }
    };

    if (ip) {
      query.query.bool.must.push({ term: { 'source_ip.keyword': ip } });
    }

    const result = await executeQuery('honeypot-logs-*', query);
    
    res.json({
      success: true,
      data: {
        malicious_ips: result.aggregations.malicious_ips.buckets,
        attack_patterns: result.aggregations.attack_patterns.buckets,
        total_threats: result.hits.total.value
      }
    });
  } catch (error) {
    console.error('Threat intelligence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threat intelligence'
    });
  }
});

// Export attack data
router.get('/attacks/export', async (req, res) => {
  try {
    const { format = 'json', timeframe = '24h', attack_type } = req.query;
    
    let query = {
      query: {
        bool: {
          must: [
            { range: { '@timestamp': { gte: `now-${timeframe}` } } }
          ]
        }
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 10000
    };

    if (attack_type) {
      query.query.bool.must.push({ term: { 'attack_type.keyword': attack_type } });
    }

    const result = await executeQuery('honeypot-logs-*', query);
    const data = result.hits.hits.map(hit => hit._source);

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attack_data.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=attack_data.json');
      res.json({
        export_date: new Date().toISOString(),
        total_records: data.length,
        data: data
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// Search attacks
router.post('/attacks/search', async (req, res) => {
  try {
    const { 
      query: searchQuery, 
      filters = {}, 
      page = 1, 
      size = 20,
      sort_field = '@timestamp',
      sort_order = 'desc'
    } = req.body;

    let esQuery = {
      query: {
        bool: {
          must: [],
          filter: []
        }
      },
      from: (page - 1) * size,
      size: size,
      sort: [{ [sort_field]: { order: sort_order } }]
    };

    // Add search query
    if (searchQuery) {
      esQuery.query.bool.must.push({
        multi_match: {
          query: searchQuery,
          fields: ['source_ip', 'attack_type', 'payload', 'user_agent']
        }
      });
    }

    // Add filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        esQuery.query.bool.filter.push({
          term: { [`${field}.keyword`]: value }
        });
      }
    });

    const result = await executeQuery('honeypot-logs-*', esQuery);
    
    res.json({
      success: true,
      data: {
        hits: result.hits.hits.map(hit => ({
          id: hit._id,
          ...hit._source
        })),
        total: result.hits.total.value,
        page: page,
        pages: Math.ceil(result.hits.total.value / size)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Helper Functions
async function getDashboardOverview() {
  const [
    totalAttacks,
    recentAttacks,
    activeThreats,
    honeypotStatus
  ] = await Promise.all([
    getTotalAttacks(),
    getRecentAttacks(),
    getActiveThreats(),
    honeypotManager.getStatus()
  ]);

  return {
    total_attacks: totalAttacks,
    recent_attacks: recentAttacks,
    active_threats: activeThreats,
    honeypot_status: honeypotStatus,
    system_health: await getSystemHealth()
  };
}

async function getTotalAttacks() {
  const query = {
    query: { match_all: {} }
  };
  const result = await executeQuery('honeypot-logs-*', query);
  return result.hits.total.value;
}

async function getRecentAttacks() {
  const query = {
    query: {
      range: { '@timestamp': { gte: 'now-1h' } }
    }
  };
  const result = await executeQuery('honeypot-logs-*', query);
  return result.hits.total.value;
}

async function getActiveThreats() {
  const query = {
    query: {
      bool: {
        must: [
          { range: { '@timestamp': { gte: 'now-24h' } } },
          { term: { 'severity.keyword': 'high' } }
        ]
      }
    },
    aggs: {
      unique_ips: {
        cardinality: { field: 'source_ip.keyword' }
      }
    }
  };
  const result = await executeQuery('honeypot-logs-*', query);
  return result.aggregations.unique_ips.value;
}

async function getSystemHealth() {
  try {
    const healthChecks = await Promise.all([
      checkElasticsearchHealth(),
      honeypotManager.healthCheck(),
      checkAIEngineHealth()
    ]);

    return {
      elasticsearch: healthChecks[0],
      honeypots: healthChecks[1],
      ai_engine: healthChecks[2],
      overall: healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded'
    };
  } catch (error) {
    return {
      overall: 'unhealthy',
      error: error.message
    };
  }
}

async function checkElasticsearchHealth() {
  try {
    const result = await executeQuery('_cluster/health');
    return {
      status: result.status === 'green' ? 'healthy' : 'degraded',
      details: result
    };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkAIEngineHealth() {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../ai-engine/analyzer.py'),
      '--health-check'
    ]);

    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.on('close', (code) => {
      resolve({
        status: code === 0 ? 'healthy' : 'unhealthy',
        details: result
      });
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      pythonProcess.kill();
      resolve({ status: 'timeout' });
    }, 5000);
  });
}

function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

module.exports = router;