# LM5060 Calculator - MVP

Python-based LM5060 hot-swap controller calculator with bidirectional computation capability.

## Status: MVP Core Complete ✅

- ✅ Forward calculation (requirements → BOM)
- ✅ Numerical health monitoring (condition number)
- ✅ Verified against ic-eval-tool (< 5% error)
- ✅ Comprehensive tests (6 passing)

## Quick Start

```bash
pip install -r requirements.txt
```

## Usage

```python
from lm5060 import compute_bom, compute_bom_with_health_check, ForwardInput

# Define your requirements
input_data = ForwardInput(
    vin_min=9.0,      # Minimum input voltage (V)
    vin_max=36.0,     # Maximum input voltage (V)
    i_limit=30.0,     # Current limit (A)
    rds_on=5.0,       # MOSFET on-resistance (mΩ)
    ocp_delay=12.0,   # Overcurrent protection delay (ms)
    dvdt=0.5          # GATE slew rate (V/µs)
)

# Calculate BOM
result = compute_bom(input_data)

print(f"R8 (OVP): {result.R8} kΩ")
print(f"R10 (UVLO): {result.R10} kΩ")
print(f"Rs (SENSE): {result.Rs} Ω")
print(f"C_TIMER: {result.C_TIMER} nF")
print(f"C_GATE: {result.C_GATE} nF")

# With health check
result, health = compute_bom_with_health_check(input_data)

print(f"\nHealth Status: {health.status}")
print(f"Condition Number: {health.condition_number:.1f}")
if health.warnings:
    print("Warnings:")
    for warning in health.warnings:
        print(f"  - {warning}")
```

## Output Example

```
R8 (OVP): 170.0 kΩ
R10 (UVLO): 46.25 kΩ
Rs (SENSE): 14375.0 Ω
C_TIMER: 66.0 nF
C_GATE: 48.0 nF

Health Status: HEALTHY
Condition Number: 1.5
```

## Verification

Verified against ic-eval-tool with default parameters:

| Parameter | ic-eval-tool | Our Implementation | Error |
|-----------|-------------|-------------------|-------|
| R8 | 170.00 kΩ | 170.00 kΩ | 0% ✓ |
| R10 | 44.71 kΩ | 46.25 kΩ | 3.4% ✓ |
| Rs | 14375.0 Ω | 14375.0 Ω | 0% ✓ |
| C_TIMER | 66.0 nF | 66.0 nF | 0% ✓ |
| C_GATE | 48.0 nF | 48.0 nF | 0% ✓ |

## Architecture

```
lm5060-calculator/
├── lm5060/
│   ├── constants.py          # Auto-extracted from opendatasheet
│   ├── schemas.py            # Pydantic data models
│   ├── forward_engine.py     # Requirements → BOM calculation
│   └── __init__.py
├── tests/
│   └── test_forward.py       # 6 tests (all passing)
├── scripts/
│   └── extract_constants_from_opendatasheet.py
└── docs/
    └── superpowers/specs/    # Design documents
```

## Key Features

### 1. High Precision
- Uses Python `Decimal` for intermediate calculations (10-digit precision)
- Avoids floating-point accumulation errors
- Output rounded to appropriate precision (resistors: 2 digits, capacitors: 1 digit)

### 2. Numerical Health Monitoring
- Estimates condition number using finite difference method
- Warns about ill-conditioned inputs (e.g., vin_min too close to UVLO threshold)
- Status levels: HEALTHY / WARNING / CRITICAL

### 3. Traceable Constants
- All constants extracted from opendatasheet
- Source attribution (datasheet page, table, conditions)
- Supports min/typ/max values

### 4. Formula Verification
- Formulas ported from ic-eval-tool
- Cross-validated with LM5060 datasheet SNVS628H
- Source comments in code (datasheet section + ic-eval-tool line number)

## Testing

```bash
pytest tests/test_forward.py -v
```

Tests cover:
- Basic calculation correctness
- Input validation
- Numerical health checks
- Physical consistency (monotonicity)

## Roadmap

### Next (Priority High)
- [ ] Reverse calculation engine (BOM → performance)
- [ ] Round-trip validation test
- [ ] CLI interface

### Future (Priority Medium)
- [ ] E96 series quantization
- [ ] Monte Carlo tolerance analysis
- [ ] Web UI

## Technical Decisions

### Why opendatasheet?
- Already extracted LM5060 electrical characteristics
- Has min/typ/max values with source attribution
- Auto-updatable when datasheet changes

### Why port from ic-eval-tool?
- Formulas already verified in production
- Reduces risk of transcription errors
- Fast path to validated MVP

### Why Decimal precision?
- Avoids floating-point accumulation errors
- Critical for condition number estimation
- Recommended by red-team review

## References

- [LM5060 Datasheet](https://www.ti.com/product/LM5060) (SNVS628H)
- [ic-eval-tool](https://github.com/your-org/ic-eval-tool) (formula source)
- [opendatasheet](https://github.com/joyhpc/opendatasheet) (constant source)

## License

MIT

## Contributing

See [MVP_PLAN.md](MVP_PLAN.md) for development roadmap.
See [MVP_STATUS.md](MVP_STATUS.md) for current status and known issues.
