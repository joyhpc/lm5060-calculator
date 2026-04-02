"""
Extract constants from opendatasheet LM5060 data

This script reads the opendatasheet extracted data and generates
a Python constants file with proper source attribution.
"""

import json
from pathlib import Path

OPENDATASHEET_PATH = "/home/ubuntu/opendatasheet/data/extracted_v2/lm5060_ds.json"
OUTPUT_PATH = "../lm5060/constants.py"

def load_opendatasheet_data():
    """Load LM5060 data from opendatasheet"""
    with open(OPENDATASHEET_PATH) as f:
        return json.load(f)

def extract_constants(data):
    """Extract key constants from electrical characteristics"""
    elec = data['extraction']['electrical_characteristics']

    constants = {}

    # Map of parameter symbols to our constant names
    param_map = {
        'OVPTH': 'OVP_THRESHOLD',
        'UVLOTH': 'UVLO_THRESHOLD',
        'UVLOBIAS': 'UVLO_BIAS_CURRENT',
        'ISENSE': 'SENSE_CURRENT',
        'ITIMERH': 'TIMER_CHARGE_CURRENT',
        'IGATE': 'GATE_CHARGE_CURRENT',
    }

    for item in elec:
        symbol = item.get('symbol', '')

        if symbol in param_map:
            const_name = param_map[symbol]

            # Get values
            typ = item.get('typ')
            min_val = item.get('min')
            max_val = item.get('max')
            unit = item.get('unit', '')
            conditions = item.get('conditions', '')
            temp_range = item.get('temp_range', '')

            # Store both 25C and full temp range
            if temp_range == '25C' and typ is not None:
                if const_name not in constants:
                    constants[const_name] = {}
                constants[const_name]['typical'] = typ
                constants[const_name]['unit'] = unit
                constants[const_name]['conditions'] = conditions
            elif temp_range == 'full' and (min_val is not None or max_val is not None):
                if const_name not in constants:
                    constants[const_name] = {}
                if min_val is not None:
                    constants[const_name]['min'] = min_val
                if max_val is not None:
                    constants[const_name]['max'] = max_val

    # Add fixed constants from datasheet
    constants['DIVIDER_BOTTOM'] = {
        'typical': 10.0,
        'unit': 'kΩ',
        'conditions': 'Recommended fixed value for R11',
        'source': 'Datasheet typical application'
    }

    constants['TIMER_TRIP_VOLTAGE'] = {
        'typical': 2.0,
        'unit': 'V',
        'conditions': 'TIMER pin trip threshold',
        'source': 'Datasheet Section 8.2.2.3'
    }

    constants['REVERSE_COMP_CURRENT'] = {
        'typical': 8.0,
        'unit': 'µA',
        'conditions': 'Reverse current compensation',
        'source': 'ic-eval-tool (needs datasheet verification)'
    }

    constants['REVERSE_COMP_RESISTOR'] = {
        'typical': 10000,
        'unit': 'Ω',
        'conditions': 'Internal reverse compensation resistor',
        'source': 'ic-eval-tool (needs datasheet verification)'
    }

    return constants

def generate_python_file(constants):
    """Generate Python constants file"""

    lines = [
        '"""',
        'LM5060 Constants - Extracted from opendatasheet',
        '',
        'Source: opendatasheet/data/extracted_v2/lm5060_ds.json',
        'Datasheet: SNVS628H (TI LM5060)',
        'Extraction date: 2026-04-02',
        '',
        'DO NOT EDIT MANUALLY - Regenerate with scripts/extract_constants_from_opendatasheet.py',
        '"""',
        '',
        'from typing import NamedTuple',
        '',
        '',
        'class ConstantValue(NamedTuple):',
        '    """Constant with min/typ/max values and source attribution"""',
        '    typical: float',
        '    min: float | None',
        '    max: float | None',
        '    unit: str',
        '    conditions: str',
        '    source: str = "opendatasheet"',
        '',
        ''
    ]

    # Generate constant definitions
    for name, data in sorted(constants.items()):
        typ = data.get('typical')
        min_val = data.get('min')
        max_val = data.get('max')
        unit = data.get('unit', '')
        conditions = data.get('conditions', '')
        source = data.get('source', 'opendatasheet')

        # Add comment
        lines.append(f'# {name}')
        lines.append(f'# Unit: {unit}')
        lines.append(f'# Conditions: {conditions}')
        lines.append(f'# Source: {source}')

        lines.append(f'{name} = ConstantValue(')
        lines.append(f'    typical={typ},')
        lines.append(f'    min={min_val},')
        lines.append(f'    max={max_val},')
        lines.append(f'    unit="{unit}",')
        lines.append(f'    conditions="{conditions}",')
        lines.append(f'    source="{source}"')
        lines.append(')')
        lines.append('')

    # Add precision config
    lines.extend([
        '',
        '# Precision configuration for output formatting',
        'class PrecisionConfig:',
        '    """Output precision for different parameter types"""',
        '    RESISTOR_DIGITS = 2      # kΩ - 2 decimal places',
        '    CAPACITOR_DIGITS = 1     # nF - 1 decimal place',
        '    VOLTAGE_DIGITS = 2       # V - 2 decimal places',
        '    CURRENT_DIGITS = 2       # A - 2 decimal places',
        '    DECIMAL_PRECISION = 10   # Intermediate calculation precision',
        ''
    ])

    return '\n'.join(lines)

def main():
    print("Extracting constants from opendatasheet...")

    data = load_opendatasheet_data()
    print(f"Loaded data from {OPENDATASHEET_PATH}")

    constants = extract_constants(data)
    print(f"Extracted {len(constants)} constants")

    python_code = generate_python_file(constants)

    output_path = Path(__file__).parent / OUTPUT_PATH
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        f.write(python_code)

    print(f"Generated {output_path}")
    print("\nExtracted constants:")
    for name in sorted(constants.keys()):
        print(f"  - {name}")

if __name__ == "__main__":
    main()
