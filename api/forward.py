from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lm5060 import compute_bom, compute_bom_with_health_check, ForwardInput

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Convert to ForwardInput
            input_data = ForwardInput(
                vin_min=data['vin_min'],
                vin_max=data['vin_max'],
                i_limit=data['i_limit'],
                rds_on=data['rds_on'],
                ocp_delay=data['ocp_delay'],
                dvdt=data['dvdt'],
            )
            
            # Compute BOM
            health_check = data.get('health_check', False)
            if health_check:
                bom, health = compute_bom_with_health_check(input_data)
                health_data = {
                    'condition_number': health.condition_number,
                    'status': health.status,
                    'warnings': health.warnings,
                }
            else:
                bom = compute_bom(input_data)
                health_data = None
            
            # Format response
            result = {
                'success': True,
                'data': {
                    'R8_kOhm': bom.R8,
                    'R9_kOhm': bom.R9,
                    'R10_kOhm': bom.R10,
                    'R11_kOhm': bom.R11,
                    'Rs_Ohm': bom.Rs,
                    'C_TIMER_nF': bom.C_TIMER,
                    'C_GATE_nF': bom.C_GATE,
                    'V_DSTH_mV': bom.V_DSTH,
                },
                'health': health_data,
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
