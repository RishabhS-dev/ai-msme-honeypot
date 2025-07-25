const { Client } = require('@elastic/elasticsearch');

class ElasticsearchService {
  constructor(config) {
    this.client = new Client({ node: config.node, auth: config.auth });
  }

  async connect() {
    try {
      const health = await this.client.cluster.health();
      if (health.body.status === 'red') {
        throw new Error('Elasticsearch cluster health is RED');
      }
      console.log('🔗 Connected to Elasticsearch');
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.close();
      console.log('🔌 Disconnected from Elasticsearch');
    } catch (error) {
      console.error('❌ Error disconnecting Elasticsearch:', error.message);
    }
  }

  async isConnected() {
    try {
      const ping = await this.client.ping();
      return ping.statusCode === 200;
    } catch (error) {
      return false;
    }
  }

  async getRecentLogs(durationInSeconds = 60) {
    try {
      const now = new Date();
      const fromTime = new Date(now.getTime() - durationInSeconds * 1000).toISOString();

      const response = await this.client.search({
        index: 'honeypot-logs',  // Change index name if required
        body: {
          query: {
            range: {
              '@timestamp': {
                gte: fromTime,
                lte: now.toISOString()
              }
            }
          },
          size: 1000,
          sort: [{ '@timestamp': { order: 'desc' } }]
        }
      });

      const hits = response.body.hits.hits;
      const logs = hits.map(hit => hit._source);
      return logs;

    } catch (error) {
      console.error('❌ Error fetching recent logs:', error.message);
      return [];
    }
  }

  async indexLog(logData) {
    try {
      const response = await this.client.index({
        index: 'honeypot-logs',  // Change index if needed
        body: logData
      });

      return response.body;
    } catch (error) {
      console.error('❌ Error indexing log:', error.message);
      throw error;
    }
  }

  async aggregateAttackStats(durationInMinutes = 10) {
    try {
      const now = new Date();
      const fromTime = new Date(now.getTime() - durationInMinutes * 60000).toISOString();

      const response = await this.client.search({
        index: 'honeypot-logs',
        body: {
          query: {
            range: {
              '@timestamp': {
                gte: fromTime,
                lte: now.toISOString()
              }
            }
          },
          size: 0,
          aggs: {
            attack_types: {
              terms: { field: 'attack_type.keyword' }
            },
            top_ips: {
              terms: { field: 'src_ip.keyword', size: 10 }
            },
            top_ports: {
              terms: { field: 'dst_port' }
            }
          }
        }
      });

      return response.body.aggregations;

    } catch (error) {
      console.error('❌ Error aggregating stats:', error.message);
      return null;
    }
  }
}

module.exports = ElasticsearchService;
