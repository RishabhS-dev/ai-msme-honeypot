# anomaly_detector.py

import pandas as pd
from datetime import datetime
import numpy as np

class AnomalyDetector:
    def __init__(self):
        self.model = None  # Placeholder for future ML models

    def initialize(self):
        """Initialize or load anomaly detection models"""
        # For now, rule-based heuristic. In future, ML models can be loaded here.
        print("🔍 Anomaly Detector initialized (Rule-based)")

    def detect(self, df: pd.DataFrame) -> list:
        """Detect anomalies in the honeypot logs DataFrame"""
        anomalies = []

        if df.empty:
            return anomalies

        # Temporal Anomaly: Burst in a very short time
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            time_window = (df['timestamp'].max() - df['timestamp'].min()).total_seconds()

            if time_window < 60 and len(df) > 100:
                anomalies.append({
                    'type': 'Temporal Burst',
                    'severity': 'medium',
                    'description': f"{len(df)} events in {time_window:.2f} seconds",
                    'confidence': 0.8,
                    'detected_at': datetime.now().isoformat()
                })

        # Port Targeting Anomaly: Unusual port targeting
        if 'dst_port' in df.columns:
            common_ports = [22, 80, 443, 3389, 21, 25, 53]
            targeted_ports = df['dst_port'].value_counts()
            unusual_ports = targeted_ports[~targeted_ports.index.isin(common_ports)]

            if len(unusual_ports) > 5:
                anomalies.append({
                    'type': 'Unusual Port Targeting',
                    'severity': 'low',
                    'description': f"Multiple unusual ports targeted: {list(unusual_ports.index[:10])}",
                    'confidence': 0.6,
                    'detected_at': datetime.now().isoformat()
                })

        # IP Frequency Spike
        if 'src_ip' in df.columns:
            top_ips = df['src_ip'].value_counts()
            for ip, count in top_ips.items():
                if count > 50:
                    anomalies.append({
                        'type': 'IP Frequency Spike',
                        'ip': ip,
                        'severity': 'high' if count > 100 else 'medium',
                        'description': f"High activity from IP {ip}: {count} events",
                        'confidence': min(0.95, count / 150),
                        'detected_at': datetime.now().isoformat()
                    })

        return anomalies
