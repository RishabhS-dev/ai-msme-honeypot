#!/usr/bin/env python3
"""
AI-Driven Honeypot Analyzer
Main intelligence engine for dynamic honeypot adaptation
"""

import json
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import re
import hashlib
from typing import Dict, List, Any, Tuple
import warnings
warnings.filterwarnings('ignore')

# Import custom modules
from classifier import AttackClassifier
from anomaly_detector import AnomalyDetector
from adaptation_engine import AdaptationEngine

class HoneypotAIAnalyzer:
    def __init__(self):
        self.attack_classifier = AttackClassifier()
        self.anomaly_detector = AnomalyDetector()
        self.adaptation_engine = AdaptationEngine()
        
        # Initialize threat intelligence
        self.known_malicious_ips = set()
        self.attack_patterns = {}
        self.reputation_scores = {}
        
        # Load pre-trained models or initialize
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize or load pre-trained ML models"""
        try:
            # In a real implementation, you'd load saved models
            # For hackathon, we'll use rule-based + simple ML
            self.attack_classifier.initialize()
            self.anomaly_detector.initialize()
            self.adaptation_engine.initialize()
            
            # Load known malicious IPs (sample data)
            self.known_malicious_ips = {
                '192.168.1.100', '10.0.0.50', '172.16.0.10'  # Demo IPs
            }
            
        except Exception as e:
            print(f"Model initialization warning: {e}", file=sys.stderr)
    
    def analyze_logs(self, logs: List[Dict]) -> Dict:
        """
        Main analysis function - processes honeypot logs and returns insights
        """
        try:
            if not logs:
                return self._empty_response()
            
            # Convert logs to DataFrame for analysis
            df = pd.DataFrame(logs)
            
            # Extract key features
            features = self._extract_features(df)
            
            # Classify attacks
            classified_attacks = self._classify_attacks(features)
            
            # Detect anomalies
            anomalies = self._detect_anomalies(features)
            
            # Generate threat intelligence
            threats = self._analyze_threats(classified_attacks, anomalies)
            
            # Generate adaptation recommendations
            recommendations = self._generate_recommendations(threats, features)
            
            # Update learning models
            self._update_models(features, classified_attacks)
            
            return {
                'timestamp': datetime.now().isoformat(),
                'attacks': classified_attacks,
                'anomalies': anomalies,
                'threats': threats,
                'recommendations': recommendations,
                'statistics': self._generate_statistics(features),
                'reputation_updates': self._get_reputation_updates(features)
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'attacks': [],
                'anomalies': [],
                'threats': [],
                'recommendations': []
            }
    
    def _extract_features(self, df: pd.DataFrame) -> Dict:
        """Extract relevant features from log data"""
        features = {
            'total_events': len(df),
            'unique_ips': df['src_ip'].nunique() if 'src_ip' in df.columns else 0,
            'unique_ports': df['dst_port'].nunique() if 'dst_port' in df.columns else 0,
            'time_range': None,
            'ip_frequency': {},
            'port_frequency': {},
            'geographic_data': {},
            'patterns': {}
        }
        
        if len(df) == 0:
            return features
        
        # Time analysis
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            features['time_range'] = {
                'start': df['timestamp'].min().isoformat(),
                'end': df['timestamp'].max().isoformat(),
                'duration_minutes': (df['timestamp'].max() - df['timestamp'].min()).total_seconds() / 60
            }
        
        # IP analysis
        if 'src_ip' in df.columns:
            features['ip_frequency'] = df['src_ip'].value_counts().head(10).to_dict()
            
            # Detect suspicious IP patterns
            for ip in features['ip_frequency'].keys():
                features['patterns'][ip] = {
                    'is_known_malicious': ip in self.known_malicious_ips,
                    'frequency': features['ip_frequency'][ip],
                    'ports_targeted': df[df['src_ip'] == ip]['dst_port'].nunique() if 'dst_port' in df.columns else 0
                }
        
        # Port analysis
        if 'dst_port' in df.columns:
            features['port_frequency'] = df['dst_port'].value_counts().head(10).to_dict()
        
        # Protocol analysis
        if 'protocol' in df.columns:
            features['protocol_distribution'] = df['protocol'].value_counts().to_dict()
        
        return features
    
    def _classify_attacks(self, features: Dict) -> List[Dict]:
        """Classify detected attacks using ML and rule-based approaches"""
        attacks = []
        
        # Brute force detection
        for ip, data in features.get('patterns', {}).items():
            if data['frequency'] > 10:  # More than 10 attempts
                attacks.append({
                    'id': hashlib.md5(f"{ip}_bruteforce_{datetime.now()}".encode()).hexdigest()[:8],
                    'type': 'brute_force',
                    'severity': 'high' if data['frequency'] > 50 else 'medium',
                    'source_ip': ip,
                    'confidence': min(0.9, data['frequency'] / 100),
                    'description': f"Brute force attack detected from {ip} ({data['frequency']} attempts)",
                    'timestamp': datetime.now().isoformat(),
                    'indicators': {
                        'attempt_count': data['frequency'],
                        'ports_targeted': data['ports_targeted'],
                        'known_malicious': data['is_known_malicious']
                    }
                })
        
        # Port scanning detection
        port_scanners = {}
        for ip, data in features.get('patterns', {}).items():
            if data['ports_targeted'] > 5:  # Scanning multiple ports
                port_scanners[ip] = data
        
        for ip, data in port_scanners.items():
            attacks.append({
                'id': hashlib.md5(f"{ip}_portscan_{datetime.now()}".encode()).hexdigest()[:8],
                'type': 'port_scan',
                'severity': 'medium',
                'source_ip': ip,
                'confidence': min(0.95, data['ports_targeted'] / 20),
                'description': f"Port scanning detected from {ip} ({data['ports_targeted']} ports)",
                'timestamp': datetime.now().isoformat(),
                'indicators': {
                    'ports_scanned': data['ports_targeted'],
                    'scan_frequency': data['frequency']
                }
            })
        
        # Web attack patterns (if HTTP logs present)
        # This would analyze HTTP request patterns, SQL injection attempts, etc.
        
        return attacks
    
    def _detect_anomalies(self, features: Dict) -> List[Dict]:
        """Detect unusual patterns that might indicate new attack vectors"""
        anomalies = []
        
        # Unusual timing patterns
        time_range = features.get('time_range')
        if time_range and time_range['duration_minutes'] < 1 and features['total_events'] > 100:
            anomalies.append({
                'id': hashlib.md5(f"time_anomaly_{datetime.now()}".encode()).hexdigest()[:8],
                'type': 'temporal_anomaly',
                'severity': 'medium',
                'description': f"High frequency activity: {features['total_events']} events in {time_range['duration_minutes']:.1f} minutes",
                'timestamp': datetime.now().isoformat(),
                'confidence': 0.8
            })
        
        # Unusual port targeting
        top_ports = list(features.get('port_frequency', {}).keys())
        unusual_ports = [p for p in top_ports if p not in [22, 80, 443, 21, 25, 53, 3389]]
        
        if len(unusual_ports) > 3:
            anomalies.append({
                'id': hashlib.md5(f"port_anomaly_{datetime.now()}".encode()).hexdigest()[:8],
                'type': 'unusual_ports',
                'severity': 'low',
                'description': f"Targeting unusual ports: {unusual_ports}",
                'timestamp': datetime.now().isoformat(),
                'confidence': 0.6,
                'indicators': {'unusual_ports': unusual_ports}
            })
        
        return anomalies
    
    def _analyze_threats(self, attacks: List[Dict], anomalies: List[Dict]) -> List[Dict]:
        """Analyze and prioritize threats for MSME context"""
        threats = []
        
        # Critical threats requiring immediate attention
        critical_attacks = [a for a in attacks if a['severity'] == 'high']
        for attack in critical_attacks:
            threats.append({
                'id': f"threat_{attack['id']}",
                'severity': 'critical',
                'type': 'immediate_threat',
                'source': attack['source_ip'],
                'description': f"Critical {attack['type']} attack requires immediate attention",
                'business_impact': self._assess_business_impact(attack),
                'recommended_actions': self._get_recommended_actions(attack),
                'timestamp': datetime.now().isoformat()
            })
        
        # Persistent threats (same IP, multiple attack types)
        ip_attacks = {}
        for attack in attacks:
            ip = attack['source_ip']
            if ip not in ip_attacks:
                ip_attacks[ip] = []
            ip_attacks[ip].append(attack)
        
        for ip, ip_attack_list in ip_attacks.items():
            if len(ip_attack_list) > 1:
                threats.append({
                    'id': f"persistent_{hashlib.md5(ip.encode()).hexdigest()[:8]}",
                    'severity': 'high',
                    'type': 'persistent_threat',
                    'source': ip,
                    'description': f"Persistent attacker using multiple techniques ({len(ip_attack_list)} attack types)",
                    'attack_types': [a['type'] for a in ip_attack_list],
                    'business_impact': 'High - Targeted attack likely',
                    'recommended_actions': ['Block IP immediately', 'Review security policies', 'Monitor related IPs'],
                    'timestamp': datetime.now().isoformat()
                })
        
        return threats
    
    def _generate_recommendations(self, threats: List[Dict], features: Dict) -> List[Dict]:
        """Generate actionable recommendations for MSMEs"""
        recommendations = []
        
        # Dynamic honeypot adaptation recommendations
        if len(threats) > 0:
            high_value_ports = self._identify_high_value_ports(features)
            
            recommendations.append({
                'id': f"adapt_{datetime.now().timestamp()}",
                'type': 'adapt',
                'priority': 'high',
                'action': 'spawn_honeypots',
                'description': 'Deploy additional honeypots on targeted ports',
                'parameters': {
                    'ports': high_value_ports,
                    'services': ['ssh', 'web', 'ftp'],
                    'count': min(5, len(high_value_ports))
                },
                'business_justification': 'Increase attack visibility and threat intelligence gathering'
            })
        
        # Security policy recommendations
        frequent_attackers = [ip for ip, count in features.get('ip_frequency', {}).items() if count > 20]
        if frequent_attackers:
            recommendations.append({
                'id': f"block_{datetime.now().timestamp()}",
                'type': 'security_policy',
                'priority': 'critical',
                'action': 'block_ips',
                'description': 'Block persistent attackers at firewall level',
                'parameters': {
                    'ips': frequent_attackers,
                    'duration': 'permanent',
                    'scope': 'all_services'
                },
                'business_justification': 'Prevent resource exhaustion and reduce attack surface'
            })
        
        # Monitoring recommendations
        if features['unique_ports'] > 10:
            recommendations.append({
                'id': f"monitor_{datetime.now().timestamp()}",
                'type': 'monitoring',
                'priority': 'medium',
                'action': 'enhance_monitoring',
                'description': 'Increase monitoring on frequently targeted ports',
                'parameters': {
                    'focus_ports': list(features.get('port_frequency', {}).keys())[:5],
                    'alert_threshold': 10
                },
                'business_justification': 'Early warning system for targeted attacks'
            })
        
        return recommendations
    
    def _assess_business_impact(self, attack: Dict) -> str:
        """Assess business impact for MSME context"""
        impact_mapping = {
            'brute_force': 'Medium - Potential service disruption and credential compromise',
            'port_scan': 'Low - Reconnaissance activity, may precede actual attack',
            'web_attack': 'High - Direct threat to web services and data',
            'malware': 'Critical - System compromise and data breach risk'
        }
        return impact_mapping.get(attack['type'], 'Unknown impact')
    
    def _get_recommended_actions(self, attack: Dict) -> List[str]:
        """Get specific actions recommended for each attack type"""
        action_mapping = {
            'brute_force': [
                'Change default passwords immediately',
                'Enable account lockout policies',
                'Consider IP blocking',
                'Review access logs'
            ],
            'port_scan': [
                'Close unnecessary open ports',
                'Enable firewall logging',
                'Monitor for follow-up attacks',
                'Review network segmentation'
            ],
            'web_attack': [
                'Update web application',
                'Enable WAF protection',
                'Review application logs',
                'Patch known vulnerabilities'
            ]
        }
        return action_mapping.get(attack['type'], ['Review security policies', 'Monitor closely'])
    
    def _identify_high_value_ports(self, features: Dict) -> List[int]:
        """Identify ports that should have additional honeypot coverage"""
        port_freq = features.get('port_frequency', {})
        high_value_ports = []
        
        # Common service ports under attack
        critical_ports = [22, 21, 80, 443, 3389, 25, 53, 135, 139, 445]
        
        for port in critical_ports:
            if port in port_freq and port_freq[port] > 5:
                high_value_ports.append(port)
        
        # Add any highly targeted non-standard ports
        for port, count in port_freq.items():
            if count > 10 and port not in high_value_ports:
                high_value_ports.append(port)
        
        return high_value_ports[:10]  # Limit to top 10
    
    def _generate_statistics(self, features: Dict) -> Dict:
        """Generate statistical summary for dashboard"""
        return {
            'total_events': features['total_events'],
            'unique_attackers': features['unique_ips'],
            'ports_targeted': features['unique_ports'],
            'top_attacker': max(features.get('ip_frequency', {}).items(), 
                              key=lambda x: x[1], default=('None', 0)),
            'most_targeted_port': max(features.get('port_frequency', {}).items(), 
                                    key=lambda x: x[1], default=('None', 0)),
            'attack_intensity': self._calculate_attack_intensity(features),
            'threat_level': self._calculate_threat_level(features)
        }
    
    def _calculate_attack_intensity(self, features: Dict) -> str:
        """Calculate overall attack intensity"""
        total_events = features['total_events']
        time_range = features.get('time_range', {})
        
        if not time_range or time_range.get('duration_minutes', 0) == 0:
            return 'Unknown'
        
        events_per_minute = total_events / time_range['duration_minutes']
        
        if events_per_minute > 50:
            return 'Critical'
        elif events_per_minute > 20:
            return 'High'
        elif events_per_minute > 5:
            return 'Medium'
        else:
            return 'Low'
    
    def _calculate_threat_level(self, features: Dict) -> str:
        """Calculate overall threat level for MSME"""
        score = 0
        
        # Factor in number of unique attackers
        score += min(features['unique_ips'] * 2, 20)
        
        # Factor in port diversity
        score += min(features['unique_ports'] * 1.5, 15)
        
        # Factor in known malicious IPs
        malicious_count = sum(1 for ip in features.get('ip_frequency', {}).keys() 
                             if ip in self.known_malicious_ips)
        score += malicious_count * 10
        
        # Factor in attack frequency
        max_freq = max(features.get('ip_frequency', {}).values(), default=0)
        score += min(max_freq / 10, 25)
        
        if score > 60:
            return 'Critical'
        elif score > 40:
            return 'High'
        elif score > 20:
            return 'Medium'
        else:
            return 'Low'
    
    def _get_reputation_updates(self, features: Dict) -> Dict:
        """Update IP reputation scores"""
        updates = {}
        
        for ip, frequency in features.get('ip_frequency', {}).items():
            # Calculate reputation score (0-100, lower is worse)
            current_score = self.reputation_scores.get(ip, 50)  # Neutral start
            
            # Decrease score based on attack frequency
            penalty = min(frequency * 2, 40)
            new_score = max(0, current_score - penalty)
            
            # Additional penalty for known malicious IPs
            if ip in self.known_malicious_ips:
                new_score = max(0, new_score - 20)
            
            self.reputation_scores[ip] = new_score
            updates[ip] = {
                'old_score': current_score,
                'new_score': new_score,
                'change': new_score - current_score,
                'reason': f'Attack frequency: {frequency}'
            }
        
        return updates
    
    def _update_models(self, features: Dict, attacks: List[Dict]):
        """Update ML models with new data (online learning)"""
        try:
            # In a real implementation, this would update the ML models
            # with new attack patterns for improved detection
            
            # Update attack patterns dictionary
            for attack in attacks:
                attack_type = attack['type']
                if attack_type not in self.attack_patterns:
                    self.attack_patterns[attack_type] = []
                
                self.attack_patterns[attack_type].append({
                    'timestamp': attack['timestamp'],
                    'source_ip': attack['source_ip'],
                    'confidence': attack['confidence'],
                    'indicators': attack.get('indicators', {})
                })
                
                # Keep only recent patterns (last 24 hours)
                cutoff_time = datetime.now() - timedelta(hours=24)
                self.attack_patterns[attack_type] = [
                    p for p in self.attack_patterns[attack_type]
                    if datetime.fromisoformat(p['timestamp'].replace('Z', '+00:00')) > cutoff_time
                ]
            
        except Exception as e:
            print(f"Model update warning: {e}", file=sys.stderr)
    
    def _empty_response(self) -> Dict:
        """Return empty response structure"""
        return {
            'timestamp': datetime.now().isoformat(),
            'attacks': [],
            'anomalies': [],
            'threats': [],
            'recommendations': [],
            'statistics': {
                'total_events': 0,
                'unique_attackers': 0,
                'ports_targeted': 0,
                'attack_intensity': 'None',
                'threat_level': 'Low'
            },
            'reputation_updates': {}
        }


def main():
    """Main function for command-line usage"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            logs = []
        else:
            logs = json.loads(input_data)
        
        # Initialize analyzer
        analyzer = HoneypotAIAnalyzer()
        
        # Analyze logs
        result = analyzer.analyze_logs(logs)
        
        # Output JSON result
        print(json.dumps(result, indent=2, default=str))
        
    except json.JSONDecodeError as e:
        error_response = {
            'error': f'Invalid JSON input: {str(e)}',
            'timestamp': datetime.now().isoformat(),
            'attacks': [],
            'anomalies': [],
            'threats': [],
            'recommendations': []
        }
        print(json.dumps(error_response, indent=2))
        sys.exit(1)
        
    except Exception as e:
        error_response = {
            'error': f'Analysis failed: {str(e)}',
            'timestamp': datetime.now().isoformat(),
            'attacks': [],
            'anomalies': [],
            'threats': [],
            'recommendations': []
        }
        print(json.dumps(error_response, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()