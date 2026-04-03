"""Reverse calculation engine: BOM → performance

Given component values, calculate system performance parameters.
Formulas are inverse of forward calculations from datasheet SNVS628H.
"""

from decimal import Decimal, getcontext
from lm5060.schemas import ReverseInput, PerformanceResult
from lm5060.constants import (
    OVP_THRESHOLD,
    UVLO_THRESHOLD,
    UVLO_BIAS_CURRENT,
    DIVIDER_BOTTOM,
    TIMER_CHARGE_CURRENT,
    TIMER_TRIP_VOLTAGE,
    GATE_CHARGE_CURRENT,
    SENSE_CURRENT,
    REVERSE_COMP_CURRENT,
    REVERSE_COMP_RESISTOR,
    PrecisionConfig
)


def compute_performance(input_data: ReverseInput) -> PerformanceResult:
    """
    Calculate system performance from component values.

    Reverse formulas derived from datasheet SNVS628H Section 8.2.2:
    - OVP threshold from R8, R9: VIN_MAX = OVPTH × (1 + R8/R9)
    - UVLO threshold from R10, R11: VIN_MIN = UVLOTH + R10 × (UVLO_BIAS + UVLOTH/R11)
    - OCP delay from C_TIMER: t_delay = (C_TIMER × VTMRH) / ITIMERH
    - Current limit from Rs: I_LIMIT = (Rs × ISENSE - RO × IOUT-EN) / RDS(ON)
    - Gate slew rate from C_GATE: dV/dt = IGATE / C_GATE
    """
    # Set high precision for intermediate calculations
    getcontext().prec = PrecisionConfig.DECIMAL_PRECISION

    # Extract constants (use typical values)
    ovp_th = Decimal(str(OVP_THRESHOLD.typical))
    uvlo_th = Decimal(str(UVLO_THRESHOLD.typical))
    i_uvlo_bias = Decimal(str(UVLO_BIAS_CURRENT.typical)) / Decimal("1e6")  # µA to A
    r11 = Decimal(str(DIVIDER_BOTTOM.typical))
    i_timer = Decimal(str(TIMER_CHARGE_CURRENT.typical)) / Decimal("1e6")  # µA to A
    v_timer_trip = Decimal(str(TIMER_TRIP_VOLTAGE.typical))
    i_gate = Decimal(str(GATE_CHARGE_CURRENT.typical)) / Decimal("1e6")  # µA to A
    i_sense = Decimal(str(SENSE_CURRENT.typical)) / Decimal("1e6")  # µA to A
    i_comp = Decimal(str(REVERSE_COMP_CURRENT.typical)) / Decimal("1e6")  # µA to A
    r_comp = Decimal(str(REVERSE_COMP_RESISTOR.typical))

    # Convert inputs to Decimal
    r8 = Decimal(str(input_data.R8))
    r9 = Decimal(str(input_data.R9))  # OVP pull-down
    r10 = Decimal(str(input_data.R10))
    r11_uvlo = Decimal(str(input_data.R11))  # UVLO pull-down
    rs = Decimal(str(input_data.Rs))
    c_timer = Decimal(str(input_data.C_TIMER)) / Decimal("1e9")  # nF to F
    c_gate = Decimal(str(input_data.C_GATE)) / Decimal("1e9")  # nF to F
    rds_on = Decimal(str(input_data.rds_on)) / Decimal("1000")  # mΩ to Ω

    # Calculate OVP threshold (rising)
    # From: R8 = R9 × (VIN_MAX - OVPTH) / OVPTH
    # Solve: VIN_MAX = OVPTH × (1 + R8/R9)
    ovp_threshold = ovp_th * (Decimal("1") + r8 / r9)

    # Calculate UVLO threshold (rising)
    # From: R10 = (VIN_MIN - UVLOTH) / (UVLO_BIAS + UVLOTH/R11)
    # Solve: VIN_MIN = UVLOTH + R10 × (UVLO_BIAS + UVLOTH/R11)
    uvlo_rising = uvlo_th + r10 * (i_uvlo_bias + uvlo_th / r11_uvlo)

    # Calculate UVLO falling (with hysteresis, typically ~6% lower)
    # Datasheet doesn't give exact formula, use typical 6% hysteresis
    uvlo_falling = uvlo_rising * Decimal("0.94")

    # Calculate OCP delay
    # From: C_TIMER = (t_delay × ITIMERH) / VTMRH
    # Solve: t_delay = (C_TIMER × VTMRH) / ITIMERH
    ocp_delay = (c_timer * v_timer_trip / i_timer) * Decimal("1000")  # Convert to ms

    # Calculate VDS threshold
    # From: Rs = V_DSTH / ISENSE + (RO × IOUT-EN) / ISENSE
    # Solve: V_DSTH = (Rs × ISENSE) - (RO × IOUT-EN)
    v_dsth = (rs * i_sense) - (r_comp * i_comp)

    # Calculate current limit
    # From: V_DSTH = I_LIMIT × RDS(ON)
    # Solve: I_LIMIT = V_DSTH / RDS(ON)
    i_limit = v_dsth / rds_on

    # Calculate gate slew rate
    # From: C_GATE = IGATE / (dV/dt)
    # Solve: dV/dt = IGATE / C_GATE
    # Keep IGATE in µA and C_GATE in nF: [µA] / [nF] = [V/µs]
    i_gate_ua = Decimal(str(GATE_CHARGE_CURRENT.typical))  # Keep in µA
    c_gate_nf = Decimal(str(input_data.C_GATE))  # Keep in nF
    gate_slew_rate = i_gate_ua / c_gate_nf  # Result in V/µs

    # Calculate VDS threshold in mV for output
    vds_threshold = v_dsth * Decimal("1000")  # Convert to mV

    # Round to appropriate precision
    return PerformanceResult(
        uvlo_rising=round(float(uvlo_rising), PrecisionConfig.VOLTAGE_DIGITS),
        uvlo_falling=round(float(uvlo_falling), PrecisionConfig.VOLTAGE_DIGITS),
        ovp_threshold=round(float(ovp_threshold), PrecisionConfig.VOLTAGE_DIGITS),
        ocp_delay=round(float(ocp_delay), 2),  # ms, 2 decimal places
        i_limit=round(float(i_limit), PrecisionConfig.CURRENT_DIGITS),
        gate_slew_rate=round(float(gate_slew_rate), 2),  # V/µs, 2 decimal places
        vds_threshold=round(float(vds_threshold), PrecisionConfig.VOLTAGE_DIGITS)  # mV
    )
