#!/usr/bin/env python3
"""
LM5060 Calculator CLI

Usage:
  lm5060-calc forward --vin-min 9 --vin-max 36 --i-limit 30 --rds-on 5 --ocp-delay 12 --dvdt 0.5
  lm5060-calc reverse --r8 170 --r10 46.25 --rs 14556.96 --c-timer 64.5 --c-gate 48 --rds-on 5
  lm5060-calc forward --json input.json
  lm5060-calc reverse --json bom.json
"""

import argparse
import json
import sys
from typing import Dict, Any

from lm5060 import (
    compute_bom,
    compute_bom_with_health_check,
    compute_performance,
    ForwardInput,
    ReverseInput,
)


def format_bom_result(bom: Any, health: Any = None, rds_on: float = None) -> Dict[str, Any]:
    """Format BOM result as JSON"""
    result = {
        "R8_kOhm": bom.R8,
        "R10_kOhm": bom.R10,
        "R11_kOhm": bom.R11,
        "Rs_Ohm": bom.Rs,
        "C_TIMER_nF": bom.C_TIMER,
        "C_GATE_nF": bom.C_GATE,
        "V_DSTH_mV": bom.V_DSTH,
    }

    if rds_on is not None:
        result["rds_on"] = rds_on

    if health:
        result["health"] = {
            "condition_number": health.condition_number,
            "status": health.status,
            "warnings": health.warnings,
        }

    return result


def format_performance_result(perf: Any) -> Dict[str, Any]:
    """Format performance result as JSON"""
    return {
        "uvlo_rising_V": perf.uvlo_rising,
        "uvlo_falling_V": perf.uvlo_falling,
        "ovp_threshold_V": perf.ovp_threshold,
        "ocp_delay_ms": perf.ocp_delay,
        "i_limit_A": perf.i_limit,
        "gate_slew_rate_V_per_us": perf.gate_slew_rate,
        "vds_threshold_mV": perf.vds_threshold,
    }


def cmd_forward(args):
    """Forward calculation: requirements → BOM"""
    if args.json:
        # Read from JSON file
        with open(args.json, "r") as f:
            data = json.load(f)
        input_data = ForwardInput(**data)
    else:
        # Read from command line arguments
        if not all([args.vin_min, args.vin_max, args.i_limit, args.rds_on, args.ocp_delay, args.dvdt]):
            print("Error: All parameters required for forward calculation", file=sys.stderr)
            print("Required: --vin-min, --vin-max, --i-limit, --rds-on, --ocp-delay, --dvdt", file=sys.stderr)
            sys.exit(1)

        input_data = ForwardInput(
            vin_min=args.vin_min,
            vin_max=args.vin_max,
            i_limit=args.i_limit,
            rds_on=args.rds_on,
            ocp_delay=args.ocp_delay,
            dvdt=args.dvdt,
        )

    # Compute BOM
    if args.health_check:
        bom, health = compute_bom_with_health_check(input_data)
        result = format_bom_result(bom, health, input_data.rds_on)
    else:
        bom = compute_bom(input_data)
        result = format_bom_result(bom, rds_on=input_data.rds_on)

    # Output
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Result written to {args.output}")
    else:
        print(json.dumps(result, indent=2))


def cmd_reverse(args):
    """Reverse calculation: BOM → performance"""
    if args.json:
        # Read from JSON file
        with open(args.json, "r") as f:
            data = json.load(f)

        # Convert field names if needed (from forward output format)
        if "R8_kOhm" in data:
            data = {
                "R8": data["R8_kOhm"],
                "R10": data["R10_kOhm"],
                "R11": data.get("R11_kOhm", 10.0),
                "Rs": data["Rs_Ohm"],
                "C_TIMER": data["C_TIMER_nF"],
                "C_GATE": data["C_GATE_nF"],
                "rds_on": data.get("rds_on", None),  # May not be in forward output
            }

        # If rds_on not in JSON, require it from command line
        if data.get("rds_on") is None:
            if args.rds_on is None:
                print("Error: rds_on required (not in JSON file)", file=sys.stderr)
                print("Provide via --rds-on argument", file=sys.stderr)
                sys.exit(1)
            data["rds_on"] = args.rds_on

        input_data = ReverseInput(**data)
    else:
        # Read from command line arguments
        if not all([args.r8, args.r10, args.rs, args.c_timer, args.c_gate, args.rds_on]):
            print("Error: All parameters required for reverse calculation", file=sys.stderr)
            print("Required: --r8, --r10, --rs, --c-timer, --c-gate, --rds-on", file=sys.stderr)
            sys.exit(1)

        input_data = ReverseInput(
            R8=args.r8,
            R10=args.r10,
            R11=args.r11 if args.r11 else 10.0,  # Default R11 = 10kΩ
            Rs=args.rs,
            C_TIMER=args.c_timer,
            C_GATE=args.c_gate,
            rds_on=args.rds_on,
        )

    # Compute performance
    performance = compute_performance(input_data)
    result = format_performance_result(performance)

    # Output
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Result written to {args.output}")
    else:
        print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="LM5060 Hot-Swap Controller Calculator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Forward calculation (requirements → BOM)
  %(prog)s forward --vin-min 9 --vin-max 36 --i-limit 30 --rds-on 5 --ocp-delay 12 --dvdt 0.5

  # Forward with health check
  %(prog)s forward --vin-min 9 --vin-max 36 --i-limit 30 --rds-on 5 --ocp-delay 12 --dvdt 0.5 --health-check

  # Reverse calculation (BOM → performance)
  %(prog)s reverse --r8 170 --r10 46.25 --rs 14556.96 --c-timer 64.5 --c-gate 48 --rds-on 5

  # Using JSON input/output
  %(prog)s forward --json input.json --output bom.json
  %(prog)s reverse --json bom.json --output performance.json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Calculation mode")

    # Forward calculation
    forward_parser = subparsers.add_parser("forward", help="Forward calculation (requirements → BOM)")
    forward_parser.add_argument("--vin-min", type=float, help="Minimum input voltage (V)")
    forward_parser.add_argument("--vin-max", type=float, help="Maximum input voltage (V)")
    forward_parser.add_argument("--i-limit", type=float, help="Current limit (A)")
    forward_parser.add_argument("--rds-on", type=float, help="MOSFET on-resistance (mΩ)")
    forward_parser.add_argument("--ocp-delay", type=float, help="Overcurrent protection delay (ms)")
    forward_parser.add_argument("--dvdt", type=float, help="GATE slew rate (V/µs)")
    forward_parser.add_argument("--json", type=str, help="Read input from JSON file")
    forward_parser.add_argument("--output", "-o", type=str, help="Write output to JSON file")
    forward_parser.add_argument("--health-check", action="store_true", help="Include numerical health check")

    # Reverse calculation
    reverse_parser = subparsers.add_parser("reverse", help="Reverse calculation (BOM → performance)")
    reverse_parser.add_argument("--r8", type=float, help="OVP resistor (kΩ)")
    reverse_parser.add_argument("--r10", type=float, help="UVLO resistor (kΩ)")
    reverse_parser.add_argument("--r11", type=float, help="Divider bottom resistor (kΩ, default: 10)")
    reverse_parser.add_argument("--rs", type=float, help="SENSE resistor (Ω)")
    reverse_parser.add_argument("--c-timer", type=float, help="TIMER capacitor (nF)")
    reverse_parser.add_argument("--c-gate", type=float, help="GATE capacitor (nF)")
    reverse_parser.add_argument("--rds-on", type=float, help="MOSFET on-resistance (mΩ)")
    reverse_parser.add_argument("--json", type=str, help="Read input from JSON file")
    reverse_parser.add_argument("--output", "-o", type=str, help="Write output to JSON file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "forward":
        cmd_forward(args)
    elif args.command == "reverse":
        cmd_reverse(args)


if __name__ == "__main__":
    main()
