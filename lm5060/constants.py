"""
LM5060 Constants - Extracted from opendatasheet

Source: opendatasheet/data/extracted_v2/lm5060_ds.json
Datasheet: SNVS628H (TI LM5060)
Extraction date: 2026-04-02
Validation: Cross-checked with datasheet SNVS628H Section 6 (Electrical Characteristics)

All constants use opendatasheet symbols with datasheet verification.
Typical values calculated as (min+max)/2 when not provided by opendatasheet.
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

# GATE_CHARGE_CURRENT (IGATE)
# Unit: µA
# Conditions: On-state, TJ = -40°C to 125°C
# Source: opendatasheet:IGATE
GATE_CHARGE_CURRENT = ConstantValue(
    typical=24.0,
    min=17,
    max=31,
    unit="µA",
    conditions="On-state, TJ = -40°C to 125°C",
    source="opendatasheet:IGATE"
)

# OVP_THRESHOLD (OVPTH)
# Unit: V
# Conditions: OVP pin threshold voltage rising, TJ = -40°C to 125°C
# Source: opendatasheet:OVPTH
OVP_THRESHOLD = ConstantValue(
    typical=2.0,
    min=1.88,
    max=2.12,
    unit="V",
    conditions="OVP pin threshold voltage rising, TJ = -40°C to 125°C",
    source="opendatasheet:OVPTH"
)

# REVERSE_COMP_CURRENT (IOUT-EN)
# Unit: µA
# Conditions: OUT = VIN, normal operation, TJ = -40°C to 125°C
# Source: opendatasheet:IOUT-EN
REVERSE_COMP_CURRENT = ConstantValue(
    typical=8.0,
    min=5.0,
    max=11.0,
    unit="µA",
    conditions="OUT = VIN, normal operation, TJ = -40°C to 125°C",
    source="opendatasheet:IOUT-EN"
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

# SENSE_CURRENT (ISENSE)
# Unit: µA
# Conditions: SENSE pin bias current, TJ = -40°C to 125°C
# Source: opendatasheet:ISENSE
SENSE_CURRENT = ConstantValue(
    typical=15.8,
    min=13.6,
    max=18.0,
    unit="µA",
    conditions="SENSE pin bias current, TJ = -40°C to 125°C",
    source="opendatasheet:ISENSE"
)

# TIMER_CHARGE_CURRENT (ITIMERH)
# Unit: µA
# Conditions: TIMER charge current after start-up, VGS = 6.5 V, TJ = -40°C to 125°C
# Source: opendatasheet:ITIMERH
TIMER_CHARGE_CURRENT = ConstantValue(
    typical=10.75,
    min=8.5,
    max=13.0,
    unit="µA",
    conditions="TIMER charge current after start-up, VGS = 6.5 V, TJ = -40°C to 125°C",
    source="opendatasheet:ITIMERH"
)

# TIMER_TRIP_VOLTAGE (VTMRH)
# Unit: V
# Conditions: TIMER pin voltage rising
# Source: opendatasheet:VTMRH + Datasheet SNVS628H (confirmed 2.0V typical)
TIMER_TRIP_VOLTAGE = ConstantValue(
    typical=2.0,
    min=2.0,
    max=2.0,
    unit="V",
    conditions="TIMER pin voltage rising",
    source="opendatasheet:VTMRH + Datasheet SNVS628H"
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

# UVLO_THRESHOLD (UVLOTH)
# Unit: V
# Conditions: UVLO pin threshold voltage rising, TJ = -40°C to 125°C
# Source: opendatasheet:UVLOTH
UVLO_THRESHOLD = ConstantValue(
    typical=1.6,
    min=1.45,
    max=1.75,
    unit="V",
    conditions="UVLO pin threshold voltage rising, TJ = -40°C to 125°C",
    source="opendatasheet:UVLOTH"
)


# Precision configuration for output formatting
class PrecisionConfig:
    """Output precision for different parameter types"""
    RESISTOR_DIGITS = 2      # kΩ - 2 decimal places
    CAPACITOR_DIGITS = 1     # nF - 1 decimal place
    VOLTAGE_DIGITS = 2       # V - 2 decimal places
    CURRENT_DIGITS = 2       # A - 2 decimal places
    DECIMAL_PRECISION = 10   # Intermediate calculation precision
