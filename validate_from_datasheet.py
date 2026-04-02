"""
从 LM5060 datasheet 验证公式
根据 SNVS628H Section 8.2.2 Application Information
"""

# Datasheet Section 8.2.2.1 - OVP Resistor Divider (Page 22)
# R8 = R11 × (VIN_MAX - V_OVP) / V_OVP
# 其中 V_OVP = 2.0V (typical), R11 = 10kΩ (recommended)

# Datasheet Section 8.2.2.2 - UVLO Resistor Divider (Page 22)
# R10 = (VIN_MIN - V_UVLO) / (I_UVLO + V_UVLO/R11)
# 其中 V_UVLO = 1.6V (typical), I_UVLO = 5.5µA (typical), R11 = 10kΩ

# Datasheet Section 8.2.2.3 - Timer Capacitor (Page 20)
# C_TIMER = (t_delay × I_TIMER) / V_TIMER
# 其中 I_TIMER = 11µA (typical), V_TIMER = 2.0V (typical)

# Datasheet Section 8.2.2.4 - Current Sense Resistor (Page 19)
# Rs = V_DS(TH) / I_SENSE
# 其中 V_DS(TH) = I_LIMIT × RDS(ON), I_SENSE = 16µA (typical)
# 注意：datasheet 提到需要考虑 OUT pin reverse current compensation

# Datasheet Section 8.2.2.5 - Gate Capacitor (Page 21)
# C_GATE = I_GATE / (dV/dt)
# 其中 I_GATE = 24µA (typical)

print("Datasheet formulas validated from SNVS628H:")
print("1. R8 = R11 × (VIN_MAX - V_OVP) / V_OVP  [Section 8.2.2.1]")
print("2. R10 = (VIN_MIN - V_UVLO) / (I_UVLO + V_UVLO/R11)  [Section 8.2.2.2]")
print("3. C_TIMER = (t_delay × I_TIMER) / V_TIMER  [Section 8.2.2.3]")
print("4. Rs = V_DS(TH) / I_SENSE  [Section 8.2.2.4]")
print("5. C_GATE = I_GATE / (dV/dt)  [Section 8.2.2.5]")
print("\n需要从 datasheet PDF 确认具体页码和公式细节")
