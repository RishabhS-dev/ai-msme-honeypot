# adaptation_engine.py

from datetime import datetime
import random

class AdaptationEngine:
    def __init__(self):
        self.active_honeypots = {}

    def initialize(self):
        """Initialize dynamic adaptation configurations"""
        print("⚙️ Adaptation Engine initialized")

    def generate_adaptation_plan(self, threats: list, features: dict) -> list:
        """
        Generate honeypot adaptation recommendations based on threats and patterns
        """
        recommendations = []

        if not threats:
            return recommendations

        # If critical threats are detected, deploy honeypots on targeted ports
        high_value_ports = self._identify_high_value_ports(features)

        if high_value_ports:
            recommendations.append({
                'action': 'deploy_honeypots',
                'priority': 'high',
                'description': f"Deploy honeypots on ports {high_value_ports}",
                'parameters': {
                    'ports': high_value_ports,
                    'instances': min(5, len(high_value_ports)),
                    'decoys': ['SSH', 'HTTP', 'FTP']  # Decoy types
                },
                'issued_at': datetime.now().isoformat()
            })

        return recommendations

    def _identify_high_value_ports(self, features: dict) -> list:
        """Identify most targeted ports from features"""
        port_freq = features.get('port_frequency', {})
        critical_ports = [22, 21, 80, 443, 3389]

        high_value_ports = []

        for port in critical_ports:
            if port in port_freq and port_freq[port] > 5:
                high_value_ports.append(port)

        # Add non-standard highly targeted ports
        for port, count in port_freq.items():
            if count > 10 and port not in high_value_ports:
                high_value_ports.append(port)

        return high_value_ports[:10]  # Limit to top 10 ports

    def adapt_network(self, recommendation: dict):
        """Mock function to simulate honeypot deployment"""
        deployed_ports = recommendation['parameters']['ports']
        for port in deployed_ports:
            self.active_honeypots[port] = {
                'decoy_service': random.choice(recommendation['parameters']['decoys']),
                'deployed_at': datetime.now().isoformat()
            }

        print(f"🛡️ Adaptation Executed: Deployed honeypots on ports {deployed_ports}")
