"""Pydantic data models for LM5060 calculator"""
from pydantic import BaseModel, field_validator, model_validator


class ForwardInput(BaseModel):
    """Input for forward calculation: requirements → BOM"""
    vin_min: float  # Minimum input voltage (V)
    vin_max: float  # Maximum input voltage (V)
    i_limit: float  # Current limit (A)
    rds_on: float   # MOSFET on-resistance (mΩ)
    ocp_delay: float  # Overcurrent protection delay (ms)
    dvdt: float     # GATE slew rate (V/µs)

    @field_validator('vin_min', 'vin_max')
    @classmethod
    def validate_voltage(cls, v):
        if not (4.5 <= v <= 80.0):
            raise ValueError(f"Voltage must be between 4.5V and 80V, got {v}V")
        return v

    @field_validator('i_limit', 'rds_on', 'ocp_delay', 'dvdt')
    @classmethod
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError(f"Value must be positive, got {v}")
        return v

    @model_validator(mode='after')
    def validate_voltage_range(self):
        if self.vin_min >= self.vin_max:
            raise ValueError(f"vin_min ({self.vin_min}V) must be < vin_max ({self.vin_max}V)")
        return self


class BOMResult(BaseModel):
    """Output for forward calculation: component values"""
    R8: float       # OVP pull-up resistor (kΩ)
    R10: float      # UVLO pull-up resistor (kΩ)
    R11: float = 10.0  # UVLO pull-down resistor (kΩ), fixed
    Rs: float       # SENSE resistor (Ω)
    C_TIMER: float  # TIMER capacitor (nF)
    C_GATE: float   # GATE capacitor (nF)
    V_DSTH: float   # VDS threshold voltage (mV)


class ReverseInput(BaseModel):
    """Input for reverse calculation: BOM → performance"""
    R8: float       # OVP pull-up resistor (kΩ)
    R10: float      # UVLO pull-up resistor (kΩ)
    R11: float = 10.0  # UVLO pull-down resistor (kΩ)
    Rs: float       # SENSE resistor (Ω)
    C_TIMER: float  # TIMER capacitor (nF)
    C_GATE: float   # GATE capacitor (nF)
    rds_on: float   # MOSFET on-resistance (mΩ)

    @field_validator('R8', 'R10', 'R11', 'Rs', 'C_TIMER', 'C_GATE', 'rds_on')
    @classmethod
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError(f"Value must be positive, got {v}")
        return v


class PerformanceResult(BaseModel):
    """Output for reverse calculation: system performance"""
    uvlo_rising: float      # UVLO rising threshold (V)
    uvlo_falling: float     # UVLO falling threshold (V)
    ovp_threshold: float    # OVP trip voltage (V)
    ocp_delay: float        # Overcurrent protection delay (ms)
    i_limit: float          # Current limit (A)
    gate_slew_rate: float   # GATE slew rate (V/µs)
    vds_threshold: float    # VDS threshold voltage (mV)


class HealthReport(BaseModel):
    """Numerical health report"""
    condition_number: float
    status: str  # "HEALTHY", "WARNING", "CRITICAL"
    warnings: list[str]
    sensitivity: dict[str, float] | None = None


class QuantizedResult(BaseModel):
    """E-series quantization result"""
    ideal_value: float
    quantized_value: float
    quantization_error: float
    alternatives: list[float]
