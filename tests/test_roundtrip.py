"""Test round-trip calculation: requirements → BOM → performance"""
import pytest
from lm5060 import compute_bom, compute_performance, ForwardInput, ReverseInput


def test_roundtrip_basic():
    """Test round-trip with default parameters"""
    # Forward: requirements → BOM
    forward_input = ForwardInput(
        vin_min=9.0,
        vin_max=36.0,
        i_limit=30.0,
        rds_on=5.0,
        ocp_delay=12.0,
        dvdt=0.5
    )

    bom = compute_bom(forward_input)

    # Reverse: BOM → performance
    reverse_input = ReverseInput(
        R8=bom.R8,
        R10=bom.R10,
        R11=bom.R11,
        Rs=bom.Rs,
        C_TIMER=bom.C_TIMER,
        C_GATE=bom.C_GATE,
        rds_on=forward_input.rds_on
    )

    performance = compute_performance(reverse_input)

    # Verify round-trip accuracy (< 0.1% error)
    assert abs(performance.uvlo_rising - forward_input.vin_min) < 0.01, \
        f"vin_min mismatch: {forward_input.vin_min} → {performance.uvlo_rising}"

    assert abs(performance.ovp_threshold - forward_input.vin_max) < 0.01, \
        f"vin_max mismatch: {forward_input.vin_max} → {performance.ovp_threshold}"

    assert abs(performance.i_limit - forward_input.i_limit) < 0.01, \
        f"i_limit mismatch: {forward_input.i_limit} → {performance.i_limit}"

    assert abs(performance.ocp_delay - forward_input.ocp_delay) < 0.01, \
        f"ocp_delay mismatch: {forward_input.ocp_delay} → {performance.ocp_delay}"

    assert abs(performance.gate_slew_rate - forward_input.dvdt) < 0.01, \
        f"dvdt mismatch: {forward_input.dvdt} → {performance.gate_slew_rate}"


def test_roundtrip_multiple_cases():
    """Test round-trip with multiple parameter sets"""
    test_cases = [
        # (vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt)
        (9.0, 36.0, 30.0, 5.0, 12.0, 0.5),
        (12.0, 48.0, 20.0, 10.0, 10.0, 1.0),
        (5.0, 24.0, 50.0, 3.0, 15.0, 0.3),
        (18.0, 60.0, 10.0, 8.0, 8.0, 0.8),
    ]

    for vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt in test_cases:
        # Forward
        forward_input = ForwardInput(
            vin_min=vin_min,
            vin_max=vin_max,
            i_limit=i_limit,
            rds_on=rds_on,
            ocp_delay=ocp_delay,
            dvdt=dvdt
        )

        bom = compute_bom(forward_input)

        # Reverse
        reverse_input = ReverseInput(
            R8=bom.R8,
            R10=bom.R10,
            R11=bom.R11,
            Rs=bom.Rs,
            C_TIMER=bom.C_TIMER,
            C_GATE=bom.C_GATE,
            rds_on=rds_on
        )

        performance = compute_performance(reverse_input)

        # Verify (< 0.1% relative error)
        rel_error_vin_min = abs(performance.uvlo_rising - vin_min) / vin_min
        rel_error_vin_max = abs(performance.ovp_threshold - vin_max) / vin_max
        rel_error_i_limit = abs(performance.i_limit - i_limit) / i_limit
        rel_error_ocp = abs(performance.ocp_delay - ocp_delay) / ocp_delay
        rel_error_dvdt = abs(performance.gate_slew_rate - dvdt) / dvdt

        assert rel_error_vin_min < 0.001, \
            f"Case {test_cases.index((vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt))}: vin_min error {rel_error_vin_min*100:.4f}%"
        assert rel_error_vin_max < 0.001, \
            f"Case {test_cases.index((vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt))}: vin_max error {rel_error_vin_max*100:.4f}%"
        assert rel_error_i_limit < 0.001, \
            f"Case {test_cases.index((vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt))}: i_limit error {rel_error_i_limit*100:.4f}%"
        assert rel_error_ocp < 0.001, \
            f"Case {test_cases.index((vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt))}: ocp_delay error {rel_error_ocp*100:.4f}%"
        assert rel_error_dvdt < 0.001, \
            f"Case {test_cases.index((vin_min, vin_max, i_limit, rds_on, ocp_delay, dvdt))}: dvdt error {rel_error_dvdt*100:.4f}%"


def test_reverse_calculation_only():
    """Test reverse calculation with known BOM values"""
    # Use BOM from datasheet example (if available)
    reverse_input = ReverseInput(
        R8=170.0,
        R10=46.25,
        R11=10.0,
        Rs=14556.96,
        C_TIMER=64.5,
        C_GATE=48.0,
        rds_on=5.0
    )

    performance = compute_performance(reverse_input)

    # Verify reasonable values
    assert 8.0 < performance.uvlo_rising < 10.0, f"UVLO rising out of range: {performance.uvlo_rising}"
    assert 35.0 < performance.ovp_threshold < 37.0, f"OVP threshold out of range: {performance.ovp_threshold}"
    assert 29.0 < performance.i_limit < 31.0, f"Current limit out of range: {performance.i_limit}"
    assert 11.0 < performance.ocp_delay < 13.0, f"OCP delay out of range: {performance.ocp_delay}"
    assert 0.4 < performance.gate_slew_rate < 0.6, f"Gate slew rate out of range: {performance.gate_slew_rate}"

    # Verify UVLO hysteresis (falling < rising)
    assert performance.uvlo_falling < performance.uvlo_rising, \
        f"UVLO falling should be less than rising: {performance.uvlo_falling} vs {performance.uvlo_rising}"
