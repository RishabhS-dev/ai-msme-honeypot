const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * List all running containers with basic info.
 */
async function listContainers() {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id,
      names: c.Names,
      image: c.Image,
      status: c.Status,
      state: c.State,
      ports: c.Ports
    }));
  } catch (error) {
    console.error('Error listing containers:', error);
    throw error;
  }
}

/**
 * Start a container by its name or ID.
 */
async function startContainer(containerIdOrName) {
  try {
    const container = docker.getContainer(containerIdOrName);
    await container.start();
    console.log(`Container ${containerIdOrName} started`);
    return true;
  } catch (error) {
    console.error(`Failed to start container ${containerIdOrName}:`, error);
    throw error;
  }
}

/**
 * Stop a container by its name or ID.
 */
async function stopContainer(containerIdOrName) {
  try {
    const container = docker.getContainer(containerIdOrName);
    await container.stop();
    console.log(`Container ${containerIdOrName} stopped`);
    return true;
  } catch (error) {
    console.error(`Failed to stop container ${containerIdOrName}:`, error);
    throw error;
  }
}

/**
 * Restart a container by its name or ID.
 */
async function restartContainer(containerIdOrName) {
  try {
    const container = docker.getContainer(containerIdOrName);
    await container.restart();
    console.log(`Container ${containerIdOrName} restarted`);
    return true;
  } catch (error) {
    console.error(`Failed to restart container ${containerIdOrName}:`, error);
    throw error;
  }
}

/**
 * Inspect detailed info of a container.
 */
async function inspectContainer(containerIdOrName) {
  try {
    const container = docker.getContainer(containerIdOrName);
    const data = await container.inspect();
    return data;
  } catch (error) {
    console.error(`Failed to inspect container ${containerIdOrName}:`, error);
    throw error;
  }
}

/**
 * Health Check of a specific container by health status.
 */
async function isContainerHealthy(containerIdOrName) {
  try {
    const info = await inspectContainer(containerIdOrName);
    if (info.State.Health) {
      return info.State.Health.Status === 'healthy';
    }
    return null; // Healthcheck not defined
  } catch (error) {
    console.error('Error checking container health:', error);
    throw error;
  }
}

module.exports = {
  listContainers,
  startContainer,
  stopContainer,
  restartContainer,
  inspectContainer,
  isContainerHealthy
};
