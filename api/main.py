"""FastAPI application for LM5060 Calculator"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os

# Add parent directory to path to import lm5060
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lm5060 import (
    compute_bom,
    compute_bom_with_health_check,
    compute_performance,
    ForwardInput,
    ReverseInput,
)

app = FastAPI(
    title="LM5060 Calculator API",
    description="Hot-swap controller calculator with bidirectional computation",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Models
class ForwardRequest(BaseModel):
    vin_min: float = Field(..., description="Minimum input voltage (V)", gt=0)
    vin_max: float = Field(..., description="Maximum input voltage (V)", gt=0)
    i_limit: float = Field(..., description="Current limit (A)", gt=0)
    rds_on: float = Field(..., description="MOSFET on-resistance (mΩ)", gt=0)
    ocp_delay: float = Field(..., description="Overcurrent protection delay (ms)", gt=0)
    dvdt: float = Field(..., description="Gate slew rate (V/µs)", gt=0)
    health_check: bool = Field(default=False, description="Include health check")


class ReverseRequest(BaseModel):
    R8: float = Field(..., description="OVP resistor (kΩ)", gt=0)
    R10: float = Field(..., description="UVLO resistor (kΩ)", gt=0)
    R11: float = Field(default=10.0, description="Divider bottom resistor (kΩ)", gt=0)
    Rs: float = Field(..., description="SENSE resistor (Ω)", gt=0)
    C_TIMER: float = Field(..., description="TIMER capacitor (nF)", gt=0)
    C_GATE: float = Field(..., description="GATE capacitor (nF)", gt=0)
    rds_on: float = Field(..., description="MOSFET on-resistance (mΩ)", gt=0)


class HealthData(BaseModel):
    condition_number: float
    status: str
    warnings: List[str]


class ForwardResponse(BaseModel):
    success: bool
    data: dict
    health: Optional[HealthData] = None


class ReverseResponse(BaseModel):
    success: bool
    data: dict


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "LM5060 Calculator API",
        "version": "1.0.0",
        "endpoints": {
            "forward": "/api/forward",
            "reverse": "/api/reverse",
            "health": "/health",
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/forward", response_model=ForwardResponse)
async def forward_calculation(request: ForwardRequest):
    """
    Forward calculation: system requirements → BOM

    Calculate external component values from system requirements.
    """
    try:
        # Convert to ForwardInput
        input_data = ForwardInput(
            vin_min=request.vin_min,
            vin_max=request.vin_max,
            i_limit=request.i_limit,
            rds_on=request.rds_on,
            ocp_delay=request.ocp_delay,
            dvdt=request.dvdt,
        )

        # Compute BOM
        if request.health_check:
            bom, health = compute_bom_with_health_check(input_data)
            health_data = HealthData(
                condition_number=health.condition_number,
                status=health.status,
                warnings=health.warnings,
            )
        else:
            bom = compute_bom(input_data)
            health_data = None

        # Format response
        data = {
            "R8_kOhm": bom.R8,
            "R10_kOhm": bom.R10,
            "R11_kOhm": bom.R11,
            "Rs_Ohm": bom.Rs,
            "C_TIMER_nF": bom.C_TIMER,
            "C_GATE_nF": bom.C_GATE,
            "V_DSTH_mV": bom.V_DSTH,
        }

        return ForwardResponse(success=True, data=data, health=health_data)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/reverse", response_model=ReverseResponse)
async def reverse_calculation(request: ReverseRequest):
    """
    Reverse calculation: BOM → performance

    Calculate system performance from component values.
    """
    try:
        # Convert to ReverseInput
        input_data = ReverseInput(
            R8=request.R8,
            R10=request.R10,
            R11=request.R11,
            Rs=request.Rs,
            C_TIMER=request.C_TIMER,
            C_GATE=request.C_GATE,
            rds_on=request.rds_on,
        )

        # Compute performance
        perf = compute_performance(input_data)

        # Format response
        data = {
            "uvlo_rising_V": perf.uvlo_rising,
            "uvlo_falling_V": perf.uvlo_falling,
            "ovp_threshold_V": perf.ovp_threshold,
            "ocp_delay_ms": perf.ocp_delay,
            "i_limit_A": perf.i_limit,
            "gate_slew_rate_V_per_us": perf.gate_slew_rate,
            "vds_threshold_mV": perf.vds_threshold,
        }

        return ReverseResponse(success=True, data=data)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
