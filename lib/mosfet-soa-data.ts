/**
 * BSZ096N10LS5 Safe Operating Area (SOA) 曲线数据
 * 从 Infineon datasheet Diagram 3 提取
 *
 * 坐标系：对数-对数
 * - X 轴：V_DS [V]
 * - Y 轴：I_D [A]
 * - 条件：T_C = 25°C, D=0 (单脉冲)
 */

export interface SOAPoint {
  vds: number  // Drain-Source Voltage [V]
  id: number   // Drain Current [A]
}

export interface SOACurve {
  pulseWidth: string  // 'DC', '10us', '100us', '1ms', '10ms', '100ms'
  points: SOAPoint[]
}

/**
 * BSZ096N10LS5 SOA 曲线数据
 * 从 datasheet Diagram 3 手动提取关键点
 */
export const BSZ096N10LS5_SOA: SOACurve[] = [
  {
    pulseWidth: 'DC',
    points: [
      { vds: 1, id: 62 },      // 左侧：持续电流极限 (25°C)
      { vds: 10, id: 62 },
      { vds: 20, id: 40 },     // 开始功率限制
      { vds: 30, id: 27 },
      { vds: 40, id: 20 },
      { vds: 50, id: 16 },
      { vds: 60, id: 13 },
      { vds: 70, id: 11 },
      { vds: 80, id: 10 },
      { vds: 90, id: 9 },
      { vds: 100, id: 8 },     // V_DS(max) = 100V
    ],
  },
  {
    pulseWidth: '10ms',
    points: [
      { vds: 1, id: 200 },     // 左侧：脉冲电流极限
      { vds: 10, id: 200 },
      { vds: 20, id: 100 },
      { vds: 30, id: 67 },
      { vds: 40, id: 50 },
      { vds: 50, id: 40 },
      { vds: 60, id: 33 },
      { vds: 70, id: 28 },
      { vds: 80, id: 25 },
      { vds: 90, id: 22 },
      { vds: 100, id: 20 },
    ],
  },
  {
    pulseWidth: '1ms',
    points: [
      { vds: 1, id: 300 },
      { vds: 10, id: 300 },
      { vds: 20, id: 150 },
      { vds: 30, id: 100 },
      { vds: 40, id: 75 },
      { vds: 50, id: 60 },
      { vds: 60, id: 50 },
      { vds: 70, id: 43 },
      { vds: 80, id: 37 },
      { vds: 90, id: 33 },
      { vds: 100, id: 30 },
    ],
  },
  {
    pulseWidth: '100us',
    points: [
      { vds: 1, id: 400 },
      { vds: 10, id: 400 },
      { vds: 20, id: 200 },
      { vds: 30, id: 133 },
      { vds: 40, id: 100 },
      { vds: 50, id: 80 },
      { vds: 60, id: 67 },
      { vds: 70, id: 57 },
      { vds: 80, id: 50 },
      { vds: 90, id: 44 },
      { vds: 100, id: 40 },
    ],
  },
  {
    pulseWidth: '10us',
    points: [
      { vds: 1, id: 500 },
      { vds: 10, id: 500 },
      { vds: 20, id: 250 },
      { vds: 30, id: 167 },
      { vds: 40, id: 125 },
      { vds: 50, id: 100 },
      { vds: 60, id: 83 },
      { vds: 70, id: 71 },
      { vds: 80, id: 62 },
      { vds: 90, id: 56 },
      { vds: 100, id: 50 },
    ],
  },
  {
    pulseWidth: '1us',
    points: [
      { vds: 1, id: 600 },
      { vds: 10, id: 600 },
      { vds: 20, id: 300 },
      { vds: 30, id: 200 },
      { vds: 40, id: 150 },
      { vds: 50, id: 120 },
      { vds: 60, id: 100 },
      { vds: 70, id: 86 },
      { vds: 80, id: 75 },
      { vds: 90, id: 67 },
      { vds: 100, id: 60 },
    ],
  },
]

/**
 * MOSFET 规格参数
 */
export const BSZ096N10LS5_SPECS = {
  partNumber: 'BSZ096N10LS5',
  manufacturer: 'Infineon',
  vds_max: 100,           // V
  id_continuous_25c: 62,  // A @ T_C=25°C
  id_continuous_100c: 39, // A @ T_C=100°C
  id_pulsed: 248,         // A
  rds_on_typ: 9.6,        // mΩ @ V_GS=10V, I_D=20A
  rds_on_max: 13.5,       // mΩ @ V_GS=10V, I_D=20A
  rthJC_typ: 1.1,         // K/W
  rthJC_max: 1.8,         // K/W
  rthJA_min: 62,          // K/W (minimal footprint)
  rthJA_6cm2: 60,         // K/W (6cm² cooling area)
  eas: 82,                // mJ (Avalanche energy)
  tj_max: 150,            // °C
}
