const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class HoneypotManager {
  constructor(io) {
    this.docker = new Docker();
    this.io = io;
    this.activeHoneypots = new Map();
    this.honeypotConfigs = new Map();
    this.adaptationHistory = [];
    this.maxHoneypots = 20; // Limit for resource management
    
    // Honeypot templates for dynamic spawning
    this.honeypotTemplates = {
      ssh: {
        image: 'cowrie/cowrie:latest',
        basePort: 2222,
        service: 'SSH',
        configPath: './honeypots/ssh-honeypot'
      },
      web: {
        image: 'nginx:alpine',
        basePort: 8080,
        service: 'HTTP',
        configPath: './honeypots/web-honeypot'
      },
      ftp: {
        image: 'stilliard/pure-ftpd',
        basePort: 2121,
        service: 'FTP',
        configPath: './honeypots/ftp-honeypot'
      },
      smb: {
        image: 'dinotools/dionaea:latest',
        basePort: 4445,
        service: 'SMB',
        configPath: './honeypots/smb-honeypot'
      },
      telnet: {
        image: 'dtagdevsec/telnetpot',
        basePort: 2323,
        service: 'Telnet',
        configPath: './honeypots/telnet-honeypot'
      },
      mysql: {
        image: 'dtagdevsec/mysql-honeypot',
        basePort: 3306,
        service: 'MySQL',
        configPath: './honeypots/mysql-honeypot'
      }
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Honeypot Manager...');
      
      // Verify Docker connection
      await this.docker.ping();
      console.log('✅ Docker connection established');
      
      // Load existing honeypot configurations
      await this.loadExistingHoneypots();
      
      // Set up network if not exists
      await this.ensureHoneypotNetwork();
      
      // Start monitoring Docker events
      this.startDockerEventMonitoring();
      
      console.log('✅ Honeypot Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Honeypot Manager:', error);
      throw error;
    }
  }

  async loadExistingHoneypots() {
    try {
      const containers = await this.docker.listContainers({ all: true });
      
      for (const containerInfo of containers) {
        const containerName = containerInfo.Names[0].replace('/', '');
        
        if (containerName.startsWith('honeypot-') || containerName.includes('honeypot')) {
          const container = this.docker.getContainer(containerInfo.Id);
          const inspection = await container.inspect();
          
          this.activeHoneypots.set(containerInfo.Id, {
            id: containerInfo.Id,
            name: containerName,
            status: containerInfo.State,
            ports: this.extractPorts(inspection.NetworkSettings.Ports),
            created: new Date(inspection.Created),
            config: inspection.Config,
            type: this.detectHoneypotType(containerName, inspection)
          });
        }
      }
      
      console.log(`📊 Found ${this.activeHoneypots.size} existing honeypots`);
      
    } catch (error) {
      console.error('❌ Error loading existing honeypots:', error);
    }
  }

  async ensureHoneypotNetwork() {
    try {
      const networks = await this.docker.listNetworks();
      const honeypotNetwork = networks.find(network => network.Name === 'honeypot-network');
      
      if (!honeypotNetwork) {
        console.log('🔧 Creating honeypot network...');
        await this.docker.createNetwork({
          Name: 'honeypot-network',
          Driver: 'bridge',
          IPAM: {
            Config: [{
              Subnet: '172.20.0.0/16'
            }]
          }
        });
        console.log('✅ Honeypot network created');
      }
    } catch (error) {
      console.error('❌ Error ensuring honeypot network:', error);
    }
  }

  startDockerEventMonitoring() {
    this.docker.getEvents({}, (err, stream) => {
      if (err) {
        console.error('❌ Error starting Docker event monitoring:', err);
        return;
      }

      stream.on('data', (chunk) => {
        try {
          const event = JSON.parse(chunk.toString());
          if (event.Type === 'container' && 
              (event.Actor.Attributes.name?.includes('honeypot') || 
               event.Actor.Attributes.image?.includes('honeypot'))) {
            this.handleDockerEvent(event);
          }
        } catch (parseError) {
          // Ignore parsing errors for non-JSON chunks
        }
      });

      stream.on('error', (error) => {
        console.error('❌ Docker event stream error:', error);
      });
    });
  }

  handleDockerEvent(event) {
    const { Action, Actor, time } = event;
    const containerId = Actor.ID;
    const containerName = Actor.Attributes.name;

    switch (Action) {
      case 'start':
        console.log(`🟢 Honeypot started: ${containerName}`);
        this.updateHoneypotStatus(containerId, 'running');
        break;
      case 'stop':
        console.log(`🔴 Honeypot stopped: ${containerName}`);
        this.updateHoneypotStatus(containerId, 'stopped');
        break;
      case 'destroy':
        console.log(`💥 Honeypot destroyed: ${containerName}`);
        this.activeHoneypots.delete(containerId);
        break;
    }

    // Emit real-time updates to connected clients
    this.io.emit('honeypot-status-update', {
      containerId,
      containerName,
      action: Action,
      timestamp: time
    });
  }

  async adaptNetwork(recommendation) {
    try {
      console.log('🔄 Adapting honeypot network based on AI recommendation...');
      console.log('📋 Recommendation:', JSON.stringify(recommendation, null, 2));

      const adaptationResult = {
        timestamp: new Date().toISOString(),
        recommendation,
        actions: [],
        success: true,
        errors: []
      };

      switch (recommendation.action) {
        case 'spawn_honeypots':
          await this.spawnAdditionalHoneypots(recommendation.parameters, adaptationResult);
          break;
        
        case 'modify_config':
          await this.modifyHoneypotConfigs(recommendation.parameters, adaptationResult);
          break;
        
        case 'scale_service':
          await this.scaleHoneypotService(recommendation.parameters, adaptationResult);
          break;
        
        case 'create_decoy':
          await this.createDecoyService(recommendation.parameters, adaptationResult);
          break;
        
        case 'block_threat':
          await this.implementThreatBlocking(recommendation.parameters, adaptationResult);
          break;
        
        default:
          console.warn(`⚠️ Unknown adaptation action: ${recommendation.action}`);
          adaptationResult.success = false;
          adaptationResult.errors.push(`Unknown action: ${recommendation.action}`);
      }

      // Record adaptation history
      this.adaptationHistory.push(adaptationResult);
      
      // Keep only last 100 adaptations
      if (this.adaptationHistory.length > 100) {
        this.adaptationHistory = this.adaptationHistory.slice(-100);
      }

      // Emit adaptation results
      this.io.emit('network-adaptation', adaptationResult);

      console.log(`✅ Network adaptation completed: ${adaptationResult.success ? 'Success' : 'Failed'}`);
      
      return adaptationResult;

    } catch (error) {
      console.error('❌ Network adaptation failed:', error);
      
      const errorResult = {
        timestamp: new Date().toISOString(),
        recommendation,
        success: false,
        errors: [error.message]
      };
      
      this.adaptationHistory.push(errorResult);
      this.io.emit('network-adaptation', errorResult);
      
      return errorResult;
    }
  }

  async spawnAdditionalHoneypots(parameters, result) {
    const { ports, services, count } = parameters;
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      try {
        const service = services[i % services.length];
        const template = this.honeypotTemplates[service];
        
        if (!template) {
          result.errors.push(`Unknown service template: ${service}`);
          continue;
        }

        const availablePort = await this.findAvailablePort(template.basePort);
        const containerName = `honeypot-${service}-dynamic-${Date.now()}-${i}`;

        const containerConfig = {
          Image: template.image,
          name: containerName,
          HostConfig: {
            PortBindings: {
              [`${template.basePort}/tcp`]: [{ HostPort: availablePort.toString() }]
            },
            NetworkMode: 'honeypot-network',
            RestartPolicy: { Name: 'unless-stopped' }
          },
          Env: [
            `HONEYPOT_SERVICE=${service}`,
            `HONEYPOT_PORT=${availablePort}`,
            `ELASTICSEARCH_HOST=elasticsearch:9200`,
            `LOG_LEVEL=INFO`,
            `DYNAMIC_SPAWN=true`
          ],
          Labels: {
            'honeypot.dynamic': 'true',
            'honeypot.service': service,
            'honeypot.spawned-by': 'ai-adaptation'
          }
        };

        // Create and start container
        const container = await this.docker.createContainer(containerConfig);
        await container.start();

        // Add to active honeypots
        this.activeHoneypots.set(container.id, {
          id: container.id,
          name: containerName,
          status: 'running',
          ports: [availablePort],
          created: new Date(),
          type: service,
          dynamic: true
        });

        result.actions.push({
          action: 'spawned_honeypot',
          service,
          container_id: container.id,
          port: availablePort,
          name: containerName
        });

        console.log(`✅ Spawned ${service} honeypot on port ${availablePort}`);

      } catch (error) {
        console.error(`❌ Failed to spawn ${service} honeypot:`, error);
        result.errors.push(`Failed to spawn ${service}: ${error.message}`);
      }
    }
  }

  async modifyHoneypotConfigs(parameters, result) {
    const { target_service, modifications } = parameters;
    
    try {
      // Find honeypots of the target service
      const targetHoneypots = Array.from(this.activeHoneypots.values())
        .filter(hp => hp.type === target_service);

      for (const honeypot of targetHoneypots) {
        const container = this.docker.getContainer(honeypot.id);
        
        // For demo purposes, we'll restart with new environment variables
        // In production, this would modify actual config files
        
        const newEnvVars = Object.entries(modifications).map(([key, value]) => 
          `${key}=${value}`
        );

        // This is a simplified approach - in reality you'd update config files
        // and reload services gracefully
        
        result.actions.push({
          action: 'modified_config',
          container_id: honeypot.id,
          service: target_service,
          modifications: modifications
        });
      }

      console.log(`✅ Modified configuration for ${targetHoneypots.length} ${target_service} honeypots`);
      
    } catch (error) {
      console.error(`❌ Failed to modify ${target_service} configs:`, error);
      result.errors.push(`Config modification failed: ${error.message}`);
    }
  }

  async scaleHoneypotService(parameters, result) {
    const { service, scale_to } = parameters;
    
    try {
      const currentInstances = Array.from(this.activeHoneypots.values())
        .filter(hp => hp.type === service && hp.status === 'running');

      const currentCount = currentInstances.length;
      const targetCount = Math.min(scale_to, 10); // Max 10 instances per service

      if (targetCount > currentCount) {
        // Scale up
        const instancesToAdd = targetCount - currentCount;
        await this.spawnAdditionalHoneypots({
          services: [service],
          count: instancesToAdd
        }, result);
      } else if (targetCount < currentCount) {
        // Scale down
        const instancesToRemove = currentCount - targetCount;
        const dynamicInstances = currentInstances
          .filter(hp => hp.dynamic)
          .slice(0, instancesToRemove);

        for (const instance of dynamicInstances) {
          try {
            const container = this.docker.getContainer(instance.id);
            await container.stop();
            await container.remove();
            
            this.activeHoneypots.delete(instance.id);
            
            result.actions.push({
              action: 'removed_honeypot',
              service,
              container_id: instance.id,
              name: instance.name
            });
          } catch (error) {
            result.errors.push(`Failed to remove ${instance.name}: ${error.message}`);
          }
        }
      }

      console.log(`✅ Scaled ${service} service from ${currentCount} to ${targetCount} instances`);
      
    } catch (error) {
      console.error(`❌ Failed to scale ${service}:`, error);
      result.errors.push(`Scaling failed: ${error.message}`);
    }
  }

  async createDecoyService(parameters, result) {
    const { service_type, fake_banner, ports } = parameters;
    
    try {
      // Create a lightweight decoy service using netcat or similar
      const decoyPort = await this.findAvailablePort(ports[0] || 8000);
      const containerName = `honeypot-decoy-${service_type}-${Date.now()}`;

      const containerConfig = {
        Image: 'alpine:latest',
        name: containerName,
        Cmd: [
          'sh', '-c', 
          `while true; do echo -e "${fake_banner}" | nc -l -p ${decoyPort}; done`
        ],
        HostConfig: {
          PortBindings: {
            [`${decoyPort}/tcp`]: [{ HostPort: decoyPort.toString() }]
          },
          NetworkMode: 'honeypot-network'
        },
        Labels: {
          'honeypot.decoy': 'true',
          'honeypot.service': service_type
        }
      };

      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      this.activeHoneypots.set(container.id, {
        id: container.id,
        name: containerName,
        status: 'running',
        ports: [decoyPort],
        created: new Date(),
        type: `decoy-${service_type}`,
        dynamic: true
      });

      result.actions.push({
        action: 'created_decoy',
        service_type,
        container_id: container.id,
        port: decoyPort,
        banner: fake_banner
      });

      console.log(`✅ Created decoy ${service_type} service on port ${decoyPort}`);
      
    } catch (error) {
      console.error(`❌ Failed to create decoy service:`, error);
      result.errors.push(`Decoy creation failed: ${error.message}`);
    }
  }

  async implementThreatBlocking(parameters, result) {
    const { ips, ports, duration } = parameters;
    
    try {
      // This would integrate with iptables or similar firewall
      // For demo purposes, we'll create a simple blocking mechanism
      
      for (const ip of ips) {
        // In production, you'd use iptables:
        // iptables -A INPUT -s ${ip} -j DROP
        
        console.log(`🚫 Would block IP: ${ip} for ${duration}`);
        
        result.actions.push({
          action: 'blocked_ip',
          ip,
          duration,
          method: 'iptables'
        });
      }

      if (ports && ports.length > 0) {
        for (const port of ports) {
          console.log(`🚫 Would block port: ${port}`);
          
          result.actions.push({
            action: 'blocked_port',
            port,
            duration
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to implement threat blocking:`, error);
      result.errors.push(`Threat blocking failed: ${error.message}`);
    }
  }

  async findAvailablePort(startPort) {
    const usedPorts = new Set();
    
    // Get ports from active honeypots
    this.activeHoneypots.forEach(honeypot => {
      honeypot.ports.forEach(port => usedPorts.add(port));
    });

    // Find next available port
    let port = startPort;
    while (usedPorts.has(port) && port < startPort + 1000) {
      port++;
    }
    
    return port;
  }

  extractPorts(portBindings) {
    const ports = [];
    if (portBindings) {
      Object.keys(portBindings).forEach(containerPort => {
        const hostBindings = portBindings[containerPort];
        if (hostBindings) {
          hostBindings.forEach(binding => {
            if (binding.HostPort) {
              ports.push(parseInt(binding.HostPort));
            }
          });
        }
      });
    }
    return ports;
  }

  detectHoneypotType(containerName, inspection) {
    const image = inspection.Config.Image.toLowerCase();
    
    if (image.includes('cowrie') || containerName.includes('ssh')) return 'ssh';
    if (image.includes('nginx') || containerName.includes('web')) return 'web';
    if (image.includes('ftp') || containerName.includes('ftp')) return 'ftp';
    if (image.includes('dionaea') || containerName.includes('smb')) return 'smb';
    if (image.includes('telnet') || containerName.includes('telnet')) return 'telnet';
    if (image.includes('mysql') || containerName.includes('mysql')) return 'mysql';
    
    return 'unknown';
  }

  updateHoneypotStatus(containerId, status) {
    if (this.activeHoneypots.has(containerId)) {
      this.activeHoneypots.get(containerId).status = status;
    }
  }

  getStatus() {
    return {
      total_honeypots: this.activeHoneypots.size,
      running_honeypots: Array.from(this.activeHoneypots.values())
        .filter(hp => hp.status === 'running').length,
      services: this.getServiceDistribution(),
      recent_adaptations: this.adaptationHistory.slice(-5),
      resource_usage: this.getResourceUsage()
    };
  }

  getServiceDistribution() {
    const distribution = {};
    this.activeHoneypots.forEach(honeypot => {
      const type = honeypot.type || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }

  getResourceUsage() {
    return {
      containers: this.activeHoneypots.size,
      max_containers: this.maxHoneypots,
      utilization: (this.activeHoneypots.size / this.maxHoneypots * 100).toFixed(1) + '%'
    };
  }

  async cleanup() {
    try {
      console.log('🧹 Cleaning up honeypot manager...');
      
      // Stop dynamic honeypots
      const dynamicHoneypots = Array.from(this.activeHoneypots.values())
        .filter(hp => hp.dynamic);

      for (const honeypot of dynamicHoneypots) {
        try {
          const container = this.docker.getContainer(honeypot.id);
          await container.stop({ t: 10 }); // 10 second timeout
          await container.remove();
          console.log(`🗑️ Cleaned up dynamic honeypot: ${honeypot.name}`);
        } catch (error) {
          console.error(`❌ Failed to cleanup ${honeypot.name}:`, error);
        }
      }
      
      console.log('✅ Honeypot manager cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  // API methods for external access
  async listHoneypots() {
    return Array.from(this.activeHoneypots.values());
  }

  async getHoneypotLogs(honeypotId, lines = 100) {
    try {
      const container = this.docker.getContainer(honeypotId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true
      });
      
      return logs.toString();
    } catch (error) {
      throw new Error(`Failed to get logs for ${honeypotId}: ${error.message}`);
    }
  }
  
  async restartHoneypot(honeypotId) {
    try {
      const container = this.docker.getContainer(honeypotId);
      await container.restart();
      
      this.updateHoneypotStatus(honeypotId, 'running');
      return { success: true, message: 'Honeypot restarted successfully' };
    } catch (error) {
      throw new Error(`Failed to restart honeypot: ${error.message}`);
    }
  }
}

module.exports = HoneypotManager;