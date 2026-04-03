from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lm5060 import compute_performance, ReverseInput

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Convert to ReverseInput
            input_data = ReverseInput(
                R8=data['R8'],
                R9=data.get('R9', 10.0),
                R10=data['R10'],
                R11=data.get('R11', 10.0),
                Rs=data['Rs'],
                C_TIMER=data['C_TIMER'],
                C_GATE=data['C_GATE'],
                rds_on=data['rds_on'],
            )
            
            # Compute performance
            perf = compute_performance(input_data)
            
            # Format response
            result = {
                'success': True,
                'data': {
                    'uvlo_rising_V': perf.uvlo_rising,
                    'uvlo_falling_V': perf.uvlo_falling,
                    'ovp_threshold_V': perf.ovp_threshold,
                    'ocp_delay_ms': perf.ocp_delay,
                    'i_limit_A': perf.i_limit,
                    'gate_slew_rate_V_per_us': perf.gate_slew_rate,
                    'vds_threshold_mV': perf.vds_threshold,
                },
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
