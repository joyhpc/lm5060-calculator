"""Forward calculation engine: requirements → BOM

Formulas ported from ic-eval-tool/src/lib/lm5060Hardware.js
Cross-validated with LM5060 datasheet SNVS628H
"""

from decimal import Decimal, getcontext
from lm5060.schemas import ForwardInput, BOMResult, HealthReport
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


def estimate_condition_number(input_data: ForwardInput) -> float:
    """
    Estimate condition number using finite difference method

    Condition number measures numerical stability:
    - κ < 1e4: HEALTHY
    - 1e4 <= κ < 1e6: WARNING
    - κ >= 1e6: CRITICAL (ill-conditioned)
    """
    epsilon = 0.01  # 1% perturbation

    # Compute base result
    base_result = compute_bom(input_data)

    # Perturb vin_min (most sensitive parameter)
    perturbed_input = input_data.model_copy(
        update={"vin_min": input_data.vin_min * (1 + epsilon)}
    )
    perturbed_result = compute_bom(perturbed_input)

    # Calculate relative change
    relative_input_change = epsilon
    relative_output_change = abs(perturbed_result.R10 - base_result.R10) / base_result.R10

    condition_number = relative_output_change / relative_input_change

    return condition_number


def check_health(input_data: ForwardInput) -> HealthReport:
    """Check numerical health of input parameters"""
    kappa = estimate_condition_number(input_data)

    warnings = []

    # Check if vin_min is too close to UVLO threshold
    if input_data.vin_min < UVLO_THRESHOLD.typical * 2:
        warnings.append(
            f"vin_min ({input_data.vin_min}V) is close to UVLO threshold "
            f"({UVLO_THRESHOLD.typical}V), may cause numerical instability"
        )

    # Determine status
    if kappa >= 1e6:
        status = "CRITICAL"
        warnings.append(
            f"Condition number {kappa:.1e} is very high. "
            "Results may be unreliable. Consider adjusting vin_min."
        )
    elif kappa >= 1e4:
        status = "WARNING"
        warnings.append(
            f"Condition number {kappa:.1e} is elevated. "
            "Results are sensitive to input variations."
        )
    else:
        status = "HEALTHY"

    return HealthReport(
        condition_number=kappa,
        status=status,
        warnings=warnings
    )


def compute_bom(input_data: ForwardInput) -> BOMResult:
    """
    Calculate external component values from system requirements.

    Formulas source: ic-eval-tool/src/lib/lm5060Hardware.js
    Validated against: LM5060 datasheet SNVS628H Section 8.2.2
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
    vin_min = Decimal(str(input_data.vin_min))
    vin_max = Decimal(str(input_data.vin_max))
    i_limit = Decimal(str(input_data.i_limit))
    rds_on = Decimal(str(input_data.rds_on))
    ocp_delay = Decimal(str(input_data.ocp_delay))
    dvdt = Decimal(str(input_data.dvdt))

    # Calculate R8 (OVP resistor)
    # Formula: R8 = R11 * (vin_max - V_OVP) / V_OVP
    # Source: Datasheet Section 8.2.2.1, ic-eval-tool line 41
    r8_raw = r11 * (vin_max - ovp_th) / ovp_th

    # Calculate R10 (UVLO resistor)
    # Formula: R10 = (vin_min - V_UVLO) / (I_UVLO_BIAS + V_UVLO / R11)
    # Source: Datasheet Section 8.2.2.2, ic-eval-tool line 42
    r10_raw = (vin_min - uvlo_th) / (i_uvlo_bias + uvlo_th / r11)

    # Calculate C_TIMER
    # Formula: C_TIMER = (ocp_delay * I_TIMER) / V_TIMER_TRIP
    # Source: Datasheet Section 8.2.2.3, ic-eval-tool line 43
    # Convert ocp_delay from ms to s, result in F, then to nF
    c_timer_raw = (ocp_delay / Decimal("1000")) * i_timer / v_timer_trip * Decimal("1e9")

    # Calculate VDS threshold
    # Formula: V_DSTH = i_limit * (rds_on / 1000)
    # Source: Datasheet Section 8.2.2.4, ic-eval-tool line 44
    # Convert rds_on from mΩ to Ω
    v_dsth_raw = i_limit * (rds_on / Decimal("1000"))

    # Calculate Rs (SENSE resistor)
    # Formula: Rs = (V_DSTH / I_SENSE) + (R_COMP * I_COMP / I_SENSE)
    # Source: Datasheet Section 8.2.2.4, ic-eval-tool line 45-46
    # Note: All currents already converted to A, r_comp in Ω
    rs_raw = (v_dsth_raw / i_sense) + (r_comp * i_comp / i_sense)

    # Calculate C_GATE
    # Formula: C_GATE = I_GATE / dvdt
    # Source: Datasheet Section 8.2.2.5, ic-eval-tool line 47
    # I_GATE in µA, dvdt in V/µs, result directly in nF
    # C = I / (dV/dt) = [µA] / [V/µs] = [µA·µs/V] = [µC/V] = [µF] = [1000 nF]
    i_gate_ua = Decimal(str(GATE_CHARGE_CURRENT.typical))  # Keep in µA
    c_gate_raw = i_gate_ua / dvdt  # Result in nF

    # Round to appropriate precision
    return BOMResult(
        R8=round(float(r8_raw), PrecisionConfig.RESISTOR_DIGITS),
        R10=round(float(r10_raw), PrecisionConfig.RESISTOR_DIGITS),
        R11=float(r11),
        Rs=round(float(rs_raw), PrecisionConfig.RESISTOR_DIGITS),
        C_TIMER=round(float(c_timer_raw), PrecisionConfig.CAPACITOR_DIGITS),
        C_GATE=round(float(c_gate_raw), PrecisionConfig.CAPACITOR_DIGITS),
        V_DSTH=round(float(v_dsth_raw * Decimal("1000")), PrecisionConfig.VOLTAGE_DIGITS)  # Convert to mV
    )


def compute_bom_with_health_check(input_data: ForwardInput) -> tuple[BOMResult, HealthReport]:
    """
    Compute BOM with numerical health check

    Returns:
        (BOMResult, HealthReport)
    """
    health = check_health(input_data)
    result = compute_bom(input_data)

    return result, health
