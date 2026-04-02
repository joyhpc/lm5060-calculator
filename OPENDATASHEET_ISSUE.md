# Feature Request: Extract Design Formulas, Typical Application Circuits, and Application Notes

## Summary

Currently, opendatasheet extracts electrical characteristics very well (57 parameters for LM5060), but **misses critical design information** needed to build calculators and design tools. This requires users to manually extract formulas from datasheets or reverse-engineer from existing tools.

## Use Case

I'm building an LM5060 calculator that computes external component values (R8, R10, Rs, C_TIMER, C_GATE) from system requirements. While opendatasheet provides excellent electrical characteristics data, I still had to:

1. ❌ Manually extract design formulas from datasheet Section 8.2.2
2. ❌ Port formulas from ic-eval-tool (another tool that already implemented them)
3. ❌ Manually identify typical application circuit components
4. ❌ Manually extract design guidelines and best practices

**With the proposed enhancement**, I could generate the calculator **automatically** from opendatasheet data alone.

## Proposed Enhancement

Add three new fields to the `extraction` object:

### 1. `design_formulas` (Priority: P0 - Critical)

Extract component sizing formulas from "Application Information" sections.

**Example** (LM5060 datasheet Section 8.2.2):

```json
{
  "design_formulas": [
    {
      "name": "R8_OVP_resistor",
      "formula": "R8 = R11 × (VIN_MAX - OVPTH) / OVPTH",
      "formula_latex": "R_8 = R_{11} \\times \\frac{V_{IN(max)} - V_{OVP}}{V_{OVP}}",
      "variables": {
        "R8": {
          "unit": "kΩ",
          "description": "OVP pull-up resistor",
          "is_output": true
        },
        "R11": {
          "unit": "kΩ",
          "description": "OVP pull-down resistor",
          "typical": 10.0,
          "refers_to": null
        },
        "VIN_MAX": {
          "unit": "V",
          "description": "Maximum input voltage",
          "is_input": true
        },
        "OVPTH": {
          "unit": "V",
          "description": "OVP threshold",
          "refers_to": "OVPTH"
        }
      },
      "source": {
        "page": 22,
        "section": "8.2.2.1",
        "figure": null
      },
      "purpose": "Set OVP trip voltage",
      "category": "protection"
    },
    {
      "name": "C_TIMER",
      "formula": "C_TIMER = (t_delay × ITIMERH) / VTMRH",
      "variables": {
        "C_TIMER": {
          "unit": "nF",
          "description": "TIMER capacitor",
          "is_output": true
        },
        "t_delay": {
          "unit": "ms",
          "description": "Desired OCP delay",
          "is_input": true
        },
        "ITIMERH": {
          "unit": "µA",
          "description": "TIMER charge current",
          "refers_to": "ITIMERH"
        },
        "VTMRH": {
          "unit": "V",
          "description": "TIMER trip threshold",
          "refers_to": "VTMRH"
        }
      },
      "source": {
        "page": 20,
        "section": "8.2.2.3"
      },
      "purpose": "Set overcurrent protection delay",
      "category": "timing"
    }
  ]
}
```

**Why this matters**:
- Enables automatic calculator generation
- Links formulas to electrical characteristics (via `refers_to`)
- Preserves source attribution for verification

### 2. `typical_application` (Priority: P0 - Critical)

Extract component connections and recommended values from typical application circuits.

**Example** (LM5060 Figure 8-1, Page 23):

```json
{
  "typical_application": {
    "figure": "Figure 8-1",
    "page": 23,
    "title": "Typical Application Circuit",
    "components": [
      {
        "designator": "R8",
        "type": "resistor",
        "connection": ["VIN", "OVP"],
        "typical_value": "170kΩ",
        "purpose": "OVP threshold setting",
        "related_formula": "R8_OVP_resistor"
      },
      {
        "designator": "R10",
        "type": "resistor",
        "connection": ["VIN", "UVLO"],
        "typical_value": "46.3kΩ",
        "purpose": "UVLO threshold setting",
        "related_formula": "R10_UVLO_resistor"
      },
      {
        "designator": "Rs",
        "type": "resistor",
        "connection": ["SENSE", "OUT"],
        "typical_value": "9.38Ω",
        "purpose": "Current sense resistor",
        "related_formula": "Rs_SENSE_resistor"
      },
      {
        "designator": "Q1",
        "type": "MOSFET",
        "connection": ["GATE", "VIN", "OUT"],
        "typical_value": "N-channel, 30A, 60V",
        "purpose": "Main pass element"
      }
    ],
    "design_example": {
      "vin_range": "9V to 36V",
      "i_limit": "30A",
      "rds_on": "5mΩ",
      "ocp_delay": "12ms"
    }
  }
}
```

**Why this matters**:
- Shows how components connect to IC pins
- Provides reference values for validation
- Links to design formulas

### 3. `application_notes` (Priority: P1 - High)

Extract design guidelines, warnings, and best practices.

**Example** (LM5060 Section 8.2, 10.2):

```json
{
  "application_notes": [
    {
      "id": "AN-001",
      "category": "component_selection",
      "title": "R11 Fixed Value Recommendation",
      "content": "R11 (UVLO divider bottom) should be fixed at 10kΩ for optimal performance",
      "rationale": "Minimizes UVLO threshold error and bias current impact",
      "source": {
        "page": 22,
        "section": "8.2.2.2"
      },
      "severity": "recommendation"
    },
    {
      "id": "AN-002",
      "category": "pcb_layout",
      "title": "SENSE Resistor Placement",
      "content": "Keep Rs trace short and away from switching nodes",
      "rationale": "Minimize noise coupling to current sense path",
      "consequence": "False OCP triggering due to noise",
      "source": {
        "page": 28,
        "section": "10.2"
      },
      "severity": "critical"
    },
    {
      "id": "AN-003",
      "category": "design_limits",
      "title": "MOSFET RDS(ON) Selection",
      "content": "Choose MOSFET with RDS(ON) that gives VDS > 7mV at I_LIMIT",
      "rationale": "VDS comparator offset is ±7mV, need margin for reliable detection",
      "source": {
        "page": 19,
        "section": "8.2.2.4"
      },
      "severity": "critical",
      "related_parameters": ["VOFFSET", "ISENSE"]
    }
  ]
}
```

**Why this matters**:
- Captures design experience and gotchas
- Prevents common mistakes
- Links to relevant parameters

## Additional Enhancement: Parameter Relationships

Add fields to `electrical_characteristics` to show how parameters relate:

```json
{
  "symbol": "IOUT-EN",
  "parameter": "OUT pin bias current, enabled",
  "typical": 8,
  "unit": "µA",
  
  // New fields:
  "used_in_design": true,
  "used_in_formulas": ["Rs_SENSE_resistor"],
  "alternative_names": ["reverseCompMicroAmp", "REVERSE_COMP_CURRENT"],
  "related_parameters": ["ISENSE", "Rs"],
  "note": "Used in Rs calculation as reverse compensation current"
}
```

## Real-World Impact

**Current workflow** (LM5060 calculator):
1. Extract 57 electrical characteristics from opendatasheet ✓
2. Manually extract 5 design formulas from datasheet ❌
3. Manually identify 7 external components ❌
4. Manually extract 10+ design guidelines ❌
5. Cross-validate with ic-eval-tool ❌

**With this enhancement**:
1. Extract everything from opendatasheet ✓
2. Auto-generate calculator code ✓
3. Auto-generate validation tests ✓

## Implementation Suggestions

### Detection Heuristics

**Design formulas**:
- Look for sections titled "Application Information", "Design Procedure", "Component Selection"
- Detect equations with `=` sign
- Extract from figures with "Design Equations" or "Calculation"

**Typical application**:
- Look for figures titled "Typical Application", "Application Circuit", "Functional Block Diagram"
- Extract component designators (R1, C1, Q1, etc.)
- Parse component values from figure annotations

**Application notes**:
- Extract from "Application Information" sections
- Look for "Note:", "Caution:", "Warning:" markers
- Extract from "Layout Guidelines", "PCB Design" sections

### Extraction Priority

For power management ICs (LDO, Buck, Hot-Swap, etc.):
1. **P0**: Design formulas (critical for calculators)
2. **P0**: Typical application circuit (shows how to use the IC)
3. **P1**: Application notes (prevents mistakes)

## Example Chips That Would Benefit

- **LM5060** (Hot-Swap Controller) - my use case
- **TPS56C215** (Buck Converter) - similar structure
- **LM317** (LDO) - classic example with well-defined formulas
- **LTC4361** (Overvoltage Protection) - protection IC with design equations

## References

- **My analysis**: [DATASHEET_ANALYSIS.md](link to file)
- **LM5060 datasheet**: SNVS628H (TI)
- **My calculator**: Built using opendatasheet + manual extraction

## Questions?

Happy to provide more examples or help with implementation. I can share:
- Complete extraction examples for LM5060
- Comparison with other tools (ic-eval-tool, WEBENCH)
- Test cases for validation

---

**Would this enhancement be valuable for opendatasheet?** I believe it would unlock a whole new class of applications (auto-generated calculators, design assistants, etc.).
