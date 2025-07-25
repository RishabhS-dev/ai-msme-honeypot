#!/usr/bin/env python3
"""
Attack Classification Module
Classifies different types of attacks using ML and rule-based approaches
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import re
from typing import Dict, List, Tuple, Any
from datetime import datetime, timedelta

class AttackClassifier:
    def __init__(self):
        self.rf_classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10
        )
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.is_trained = False
        
        # Rule-based patterns for immediate classification
        self.attack_signatures = {
            'brute_force': {
                'patterns': [
                    r'Failed password for.*from.*port',
                    r'authentication failure.*rhost=',
                    r'Invalid user.*from.*',
                    r'Failed login attempt'
                ],
                'indicators': {
                    'high_frequency': 10,  # attempts per minute
                    'multiple_usernames': 5,
                    'short_time_window': 300  # seconds
                }
            },
            'port_scan': {
                'patterns': [
                    r'Connection attempt.*refused',
                    r'SYN flood detected',
                    r'Port scan detected',
                    r'Multiple connection attempts'
                ],
                'indicators': {
                    'port_diversity': 5,  # different ports
                    'rapid_succession': 60,  # seconds
                    'no_established_connections': True
                }
            },
            'web_attack': {
                'patterns': [
                    r'GET.*\.\./\.\.',  # Directory traversal
                    r'SELECT.*FROM.*WHERE',  # SQL injection
                    r'<script.*>.*</script>',  # XSS
                    r'union.*select',  # SQL injection
                    r'eval\(',  # Code injection
                    r'cmd=.*&'  # Command injection
                ],
                'indicators': {
                    'suspicious_parameters': 3,
                    'error_responses': 5,
                    'automated_tools': True
                }
            },
            'ddos': {
                'patterns': [
                    r'SYN flood',
                    r'UDP flood',
                    r'Connection flood',
                    r'Rate limit exceeded'
                ],
                'indicators': {
                    'high_volume': 1000,  # requests per minute
                    'multiple_sources': 10,
                    'short_duration': 60
                }
            },
            'malware': {
                'patterns': [
                    r'Known malware signature',
                    r'Suspicious file upload',
                    r'Backdoor detected',
                    r'Trojan activity'
                ],
                'indicators': {
                    'file_operations': True,
                    'network_callbacks': True,
                    'privilege_escalation': True
                }
            }
        }
    
    def initialize(self):
        """Initialize the classifier with sample training data"""
        try:
            # In a real implementation, you'd load a pre-trained model
            # For hackathon, we'll create synthetic training data
            self._create_training_data()
            self.is_trained = True
            print("Attack classifier initialized successfully")
        except Exception as e:
            print(f"Classifier initialization warning: {e}")
            self.is_trained = False
    
    def _create_training_data(self):
        """Create synthetic training data for demonstration"""
        # This would typically load from a real dataset
        # For demo purposes, creating synthetic features
        np.random.seed(42)
        
        # Features: [frequency, port_count, payload_size, time_variance, error_rate]
        n_samples = 1000
        
        # Brute force attacks
        brute_force = np.random.normal([50, 2, 100, 10, 0.8], [10, 1, 50, 5, 0.1], (200, 5))
        brute_force_labels = ['brute_force'] * 200
        
        # Port scans
        port_scan = np.random.normal([20, 15, 50, 5, 0.9], [5, 5, 20, 2, 0.05], (200, 5))
        port_scan_labels = ['port_scan'] * 200
        
        # Web attacks
        web_attack = np.random.normal([10, 3, 500, 20, 0.4], [3, 1, 200, 10, 0.2], (200, 5))
        web_attack_labels = ['web_attack'] * 200
        
        # DDoS attacks
        ddos = np.random.normal([1000, 5, 200, 2, 0.1], [200, 2, 100, 1, 0.05], (200, 5))
        ddos_labels = ['ddos'] * 200
        
        # Normal traffic
        normal = np.random.normal([5, 2, 300, 60, 0.05], [2, 1, 100, 30, 0.02], (200, 5))
        normal_labels = ['normal'] * 200
        
        # Combine all data
        X = np.vstack([brute_force, port_scan, web_attack, ddos, normal])
        y = brute_force_labels + port_scan_labels + web_attack_labels + ddos_labels + normal_labels
        
        # Train the model
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Encode labels
        y_train_encoded = self.label_encoder.fit_transform(y_train)
        
        # Train classifier
        self.rf_classifier.fit(X_train_scaled, y_train_encoded)
        
        # Evaluate (for debugging)
        y_test_encoded = self.label_encoder.transform(y_test)
        accuracy = self.rf_classifier.score(X_test_scaled, y_test_encoded)
        print(f"Classifier accuracy: {accuracy:.3f}")
    
    def classify_attack(self, log_entry: Dict) -> Dict:
        """Classify a single log entry"""
        try:
            # Rule-based classification first (faster and more reliable)
            rule_result = self._rule_based_classification(log_entry)
            if rule_result['confidence'] > 0.7:
                return rule_result
            
            # ML-based classification as backup
            if self.is_trained:
                ml_result = self._ml_classification(log_entry)
                return ml_result if ml_result['confidence'] > rule_result['confidence'] else rule_result
            
            return rule_result
            
        except Exception as e:
            return {
                'attack_type': 'unknown',
                'confidence': 0.0,
                'method': 'error',
                'error': str(e)
            }
    
    def _rule_based_classification(self, log_entry: Dict) -> Dict:
        """Rule-based attack classification"""
        message = log_entry.get('message', '').lower()
        src_ip = log_entry.get('src_ip', '')
        dst_port = log_entry.get('dst_port', 0)
        
        max_confidence = 0.0
        detected_type = 'normal'
        matched_patterns = []
        
        for attack_type, config in self.attack_signatures.items():
            confidence = 0.0
            patterns_matched = 0
            
            # Check message patterns
            for pattern in config['patterns']:
                if re.search(pattern, message, re.IGNORECASE):
                    patterns_matched += 1
                    matched_patterns.append(pattern)
            
            if patterns_matched > 0:
                confidence = min(0.9, patterns_matched / len(config['patterns']) + 0.3)
                
                # Boost confidence based on port
                if attack_type == 'web_attack' and dst_port in [80, 443, 8080]:
                    confidence += 0.1
                elif attack_type == 'brute_force' and dst_port in [22, 21, 3389]:
                    confidence += 0.1
                elif attack_type == 'port_scan' and dst_port in range(1, 1024):
                    confidence += 0.05
                
                confidence = min(1.0, confidence)
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    detected_type = attack_type
        
        return {
            'attack_type': detected_type,
            'confidence': max_confidence,
            'method': 'rule_based',
            'matched_patterns': matched_patterns,
            'indicators': self._extract_indicators(log_entry, detected_type)
        }
    
    def _ml_classification(self, log_entry: Dict) -> Dict:
        """Machine learning based classification"""
        try:
            # Extract features for ML model
            features = self._extract_ml_features(log_entry)
            features_scaled = self.scaler.transform([features])
            
            # Predict
            prediction = self.rf_classifier.predict(features_scaled)[0]
            probabilities = self.rf_classifier.predict_proba(features_scaled)[0]
            
            attack_type = self.label_encoder.inverse_transform([prediction])[0]
            confidence = max(probabilities)
            
            return {
                'attack_type': attack_type,
                'confidence': float(confidence),
                'method': 'machine_learning',
                'probabilities': {
                    self.label_encoder.inverse_transform([i])[0]: float(prob)
                    for i, prob in enumerate(probabilities)
                }
            }
            
        except Exception as e:
            return {
                'attack_type': 'unknown',
                'confidence': 0.0,
                'method': 'ml_error',
                'error': str(e)
            }
    
    def _extract_ml_features(self, log_entry: Dict) -> List[float]:
        """Extract numerical features for ML classification"""
        # Features: [frequency_estimate, port_count, payload_size, time_variance, error_rate]
        
        # Frequency estimate (based on similar recent entries)
        frequency = log_entry.get('frequency_estimate', 1.0)
        
        # Port count (normalized)
        port_count = 1.0  # Would be calculated from recent history
        
        # Payload size
        payload_size = len(log_entry.get('message', ''))
        
        # Time variance (seconds from expected)
        time_variance = log_entry.get('time_variance', 30.0)
        
        # Error rate estimate
        error_rate = 0.1 if 'error' in log_entry.get('message', '').lower() else 0.05
        
        return [frequency, port_count, payload_size, time_variance, error_rate]
    
    def _extract_indicators(self, log_entry: Dict, attack_type: str) -> Dict:
        """Extract specific indicators for the detected attack type"""
        indicators = {}
        message = log_entry.get('message', '').lower()
        
        if attack_type == 'brute_force':
            indicators.update({
                'failed_login': 'failed' in message or 'invalid' in message,
                'multiple_attempts': True,  # Would check history
                'common_passwords': self._check_common_passwords(message),
                'username_enumeration': 'user' in message
            })
        
        elif attack_type == 'port_scan':
            indicators.update({
                'connection_refused': 'refused' in message or 'closed' in message,
                'rapid_connections': True,  # Would check timing
                'port_range': log_entry.get('dst_port', 0),
                'stealth_scan': 'syn' in message.lower()
            })
        
        elif attack_type == 'web_attack':
            indicators.update({
                'sql_injection': any(word in message for word in ['select', 'union', 'where', 'drop']),
                'xss_attempt': '<script' in message or 'javascript:' in message,
                'path_traversal': '../' in message,
                'command_injection': any(word in message for word in ['cmd=', 'exec', 'system'])
            })
        
        elif attack_type == 'ddos':
            indicators.update({
                'high_volume': True,  # Would check request rate
                'multiple_sources': True,  # Would check IP diversity
                'resource_exhaustion': 'timeout' in message or 'limit' in message
            })
        
        return indicators
    
    def _check_common_passwords(self, message: str) -> bool:
        """Check if message contains evidence of common password attempts"""
        common_passwords = [
            'password', '123456', 'admin', 'root', 'guest',
            'user', 'test', 'default', 'pass', '12345'
        ]
        return any(pwd in message.lower() for pwd in common_passwords)
    
    def batch_classify(self, log_entries: List[Dict]) -> List[Dict]:
        """Classify multiple log entries efficiently"""
        results = []
        
        for entry in log_entries:
            classification = self.classify_attack(entry)
            classification['original_entry'] = entry
            results.append(classification)
        
        return results
    
    def update_signatures(self, new_patterns: Dict):
        """Update attack signatures with new patterns"""
        for attack_type, patterns in new_patterns.items():
            if attack_type in self.attack_signatures:
                self.attack_signatures[attack_type]['patterns'].extend(patterns)
            else:
                self.attack_signatures[attack_type] = {
                    'patterns': patterns,
                    'indicators': {}
                }
    
    def get_attack_statistics(self, classifications: List[Dict]) -> Dict:
        """Generate statistics from classification results"""
        stats = {
            'total_classified': len(classifications),
            'attack_distribution': {},
            'confidence_distribution': {},
            'method_usage': {},
            'high_confidence_attacks': 0
        }
        
        for result in classifications:
            attack_type = result['attack_type']
            confidence = result['confidence']
            method = result['method']
            
            # Attack distribution
            stats['attack_distribution'][attack_type] = stats['attack_distribution'].get(attack_type, 0) + 1
            
            # Confidence distribution
            conf_bucket = 'high' if confidence > 0.8 else 'medium' if confidence > 0.5 else 'low'
            stats['confidence_distribution'][conf_bucket] = stats['confidence_distribution'].get(conf_bucket, 0) + 1
            
            # Method usage
            stats['method_usage'][method] = stats['method_usage'].get(method, 0) + 1
            
            # High confidence attacks
            if confidence > 0.8:
                stats['high_confidence_attacks'] += 1
        
        return stats
    
    def save_model(self, filepath: str):
        """Save trained model to disk"""
        try:
            model_data = {
                'classifier': self.rf_classifier,
                'scaler': self.scaler,
                'label_encoder': self.label_encoder,
                'attack_signatures': self.attack_signatures,
                'is_trained': self.is_trained
            }
            joblib.dump(model_data, filepath)
            print(f"Model saved to {filepath}")
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def load_model(self, filepath: str):
        """Load trained model from disk"""
        try:
            model_data = joblib.load(filepath)
            self.rf_classifier = model_data['classifier']
            self.scaler = model_data['scaler']
            self.label_encoder = model_data['label_encoder']
            self.attack_signatures = model_data['attack_signatures']
            self.is_trained = model_data['is_trained']
            print(f"Model loaded from {filepath}")
        except Exception as e:
            print(f"Error loading model: {e}")
            self.initialize()  # Fall back to initialization


if __name__ == '__main__':
    # Test the classifier
    classifier = AttackClassifier()
    classifier.initialize()
    
    # Test samples
    test_logs = [
        {
            'src_ip': '192.168.1.100',
            'dst_port': 22,
            'message': 'Failed password for admin from 192.168.1.100 port 45678',
            'timestamp': datetime.now().isoformat()
        },
        {
            'src_ip': '10.0.0.50',
            'dst_port': 80,
            'message': 'GET /admin/login.php?id=1 UNION SELECT * FROM users',
            'timestamp': datetime.now().isoformat()
        },
        {
            'src_ip': '172.16.0.10',
            'dst_port': 8080,
            'message': 'Connection attempt to port 8080 refused',
            'timestamp': datetime.now().isoformat()
        }
    ]
    
    print("Testing Attack Classifier:")
    print("=" * 40)
    
    for i, log in enumerate(test_logs, 1):
        result = classifier.classify_attack(log)
        print(f"\nTest {i}:")
        print(f"Log: {log['message']}")
        print(f"Classification: {result['attack_type']}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Method: {result['method']}")