"""
LM5060 Constants - Extracted from opendatasheet

Source: opendatasheet/data/extracted_v2/lm5060_ds.json
Datasheet: SNVS628H (TI LM5060)
Extraction date: 2026-04-02

DO NOT EDIT MANUALLY - Regenerate with scripts/extract_constants_from_opendatasheet.py
"""

from typing import NamedTuple


class ConstantValue(NamedTuple):
    """Constant with min/typ/max values and source attribution"""
    typical: float
    min: float | None
    max: float | None
    unit: str
    conditions: str
    source: str = "opendatasheet"


# DIVIDER_BOTTOM
# Unit: kΩ
# Conditions: Recommended fixed value for R11
# Source: Datasheet typical application
DIVIDER_BOTTOM = ConstantValue(
    typical=10.0,
    min=None,
    max=None,
    unit="kΩ",
    conditions="Recommended fixed value for R11",
    source="Datasheet typical application"
)

# GATE_CHARGE_CURRENT
# Unit: µA
# Conditions: On-state, TJ = 25°C
# Source: opendatasheet
GATE_CHARGE_CURRENT = ConstantValue(
    typical=24,
    min=17,
    max=31,
    unit="µA",
    conditions="On-state, TJ = 25°C",
    source="opendatasheet"
)

# OVP_THRESHOLD
# Unit: V
# Conditions: OVP pin threshold voltage rising, TJ = 25°C
# Source: opendatasheet
OVP_THRESHOLD = ConstantValue(
    typical=2.0,
    min=1.88,
    max=2.12,
    unit="V",
    conditions="OVP pin threshold voltage rising, TJ = 25°C",
    source="opendatasheet"
)

# REVERSE_COMP_CURRENT
# Unit: µA
# Conditions: Reverse current compensation
# Source: ic-eval-tool (needs datasheet verification)
REVERSE_COMP_CURRENT = ConstantValue(
    typical=8.0,
    min=None,
    max=None,
    unit="µA",
    conditions="Reverse current compensation",
    source="ic-eval-tool (needs datasheet verification)"
)

# REVERSE_COMP_RESISTOR
# Unit: Ω
# Conditions: Internal reverse compensation resistor
# Source: ic-eval-tool (needs datasheet verification)
REVERSE_COMP_RESISTOR = ConstantValue(
    typical=10000,
    min=None,
    max=None,
    unit="Ω",
    conditions="Internal reverse compensation resistor",
    source="ic-eval-tool (needs datasheet verification)"
)

# SENSE_CURRENT
# Unit: µA
# Conditions: SENSE pin bias current, TJ = 25°C
# Source: opendatasheet
SENSE_CURRENT = ConstantValue(
    typical=16,
    min=13.6,
    max=18.0,
    unit="µA",
    conditions="SENSE pin bias current, TJ = 25°C",
    source="opendatasheet"
)

# TIMER_CHARGE_CURRENT
# Unit: µA
# Conditions: TIMER charge current after start-up, VGS = 6.5 V, TJ = 25°C
# Source: opendatasheet
TIMER_CHARGE_CURRENT = ConstantValue(
    typical=11,
    min=8.5,
    max=13.0,
    unit="µA",
    conditions="TIMER charge current after start-up, VGS = 6.5 V, TJ = 25°C",
    source="opendatasheet"
)

# TIMER_TRIP_VOLTAGE
# Unit: V
# Conditions: TIMER pin trip threshold
# Source: Datasheet Section 8.2.2.3
TIMER_TRIP_VOLTAGE = ConstantValue(
    typical=2.0,
    min=None,
    max=None,
    unit="V",
    conditions="TIMER pin trip threshold",
    source="Datasheet Section 8.2.2.3"
)

# UVLO_BIAS_CURRENT
# Unit: µA
# Conditions: TJ = 25°C
# Source: opendatasheet
UVLO_BIAS_CURRENT = ConstantValue(
    typical=5.5,
    min=3.8,
    max=7.2,
    unit="µA",
    conditions="TJ = 25°C",
    source="opendatasheet"
)

# UVLO_THRESHOLD
# Unit: V
# Conditions: UVLO pin threshold voltage rising, TJ = 25°C
# Source: opendatasheet
UVLO_THRESHOLD = ConstantValue(
    typical=1.6,
    min=1.45,
    max=1.75,
    unit="V",
    conditions="UVLO pin threshold voltage rising, TJ = 25°C",
    source="opendatasheet"
)


# Precision configuration for output formatting
class PrecisionConfig:
    """Output precision for different parameter types"""
    RESISTOR_DIGITS = 2      # kΩ - 2 decimal places
    CAPACITOR_DIGITS = 1     # nF - 1 decimal place
    VOLTAGE_DIGITS = 2       # V - 2 decimal places
    CURRENT_DIGITS = 2       # A - 2 decimal places
    DECIMAL_PRECISION = 10   # Intermediate calculation precision
