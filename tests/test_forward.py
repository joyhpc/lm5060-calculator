"""Test forward calculation engine"""
import pytest
from lm5060 import compute_bom, compute_bom_with_health_check, ForwardInput


def test_compute_bom_basic():
    """Test basic forward calculation with default parameters"""
    input_data = ForwardInput(
        vin_min=9.0,
        vin_max=36.0,
        i_limit=30.0,
        rds_on=5.0,
        ocp_delay=12.0,
        dvdt=0.5
    )

    result = compute_bom(input_data)

    # Expected values from ic-eval-tool (verified 2026-04-02)
    assert abs(result.R8 - 170.0) < 1.0, f"R8 mismatch: {result.R8}"
    assert abs(result.R10 - 44.71) < 2.0, f"R10 mismatch: {result.R10}"
    assert abs(result.Rs - 14375.0) < 100, f"Rs mismatch: {result.Rs}"
    assert abs(result.C_TIMER - 66.0) < 5.0, f"C_TIMER mismatch: {result.C_TIMER}"
    assert abs(result.C_GATE - 48.0) < 5.0, f"C_GATE mismatch: {result.C_GATE}"


def test_health_check_healthy():
    """Test health check with healthy parameters"""
    input_data = ForwardInput(
        vin_min=9.0,
        vin_max=36.0,
        i_limit=30.0,
        rds_on=5.0,
        ocp_delay=12.0,
        dvdt=0.5
    )

    result, health = compute_bom_with_health_check(input_data)

    assert health.status in ["HEALTHY", "WARNING"]
    assert health.condition_number < 1e6


def test_health_check_critical():
    """Test health check returns valid report"""
    input_data = ForwardInput(
        vin_min=4.6,
        vin_max=36.0,
        i_limit=30.0,
        rds_on=5.0,
        ocp_delay=12.0,
        dvdt=0.5
    )

    result, health = compute_bom_with_health_check(input_data)

    # Verify health report structure
    assert health.condition_number > 0
    assert health.status in ["HEALTHY", "WARNING", "CRITICAL"]
    assert isinstance(health.warnings, list)


def test_input_validation():
    """Test input validation"""
    # vin_min >= vin_max should fail
    with pytest.raises(ValueError):
        ForwardInput(
            vin_min=36.0,
            vin_max=9.0,
            i_limit=30.0,
            rds_on=5.0,
            ocp_delay=12.0,
            dvdt=0.5
        )

    # Negative current should fail
    with pytest.raises(ValueError):
        ForwardInput(
            vin_min=9.0,
            vin_max=36.0,
            i_limit=-30.0,
            rds_on=5.0,
            ocp_delay=12.0,
            dvdt=0.5
        )


def test_monotonicity_vin_max():
    """Test that R8 increases monotonically with vin_max"""
    base_input = ForwardInput(
        vin_min=9.0,
        vin_max=20.0,
        i_limit=30.0,
        rds_on=5.0,
        ocp_delay=12.0,
        dvdt=0.5
    )

    vin_max_values = [20, 30, 40, 50, 60]
    R8_values = []

    for vin_max in vin_max_values:
        input_data = base_input.model_copy(update={"vin_max": vin_max})
        result = compute_bom(input_data)
        R8_values.append(result.R8)

    # Verify monotonic increase
    for i in range(len(R8_values) - 1):
        assert R8_values[i] < R8_values[i+1], \
            f"R8 should increase with vin_max, got {R8_values}"


def test_monotonicity_i_limit():
    """Test that Rs increases monotonically with i_limit (more current = larger sense resistor)"""
    base_input = ForwardInput(
        vin_min=9.0,
        vin_max=36.0,
        i_limit=10.0,
        rds_on=5.0,
        ocp_delay=12.0,
        dvdt=0.5
    )

    i_limit_values = [10, 20, 30, 40, 50]
    Rs_values = []

    for i_limit in i_limit_values:
        input_data = base_input.model_copy(update={"i_limit": i_limit})
        result = compute_bom(input_data)
        Rs_values.append(result.Rs)

    # Verify monotonic increase (higher current needs larger sense resistor)
    for i in range(len(Rs_values) - 1):
        assert Rs_values[i] < Rs_values[i+1], \
            f"Rs should increase with i_limit, got {Rs_values}"
