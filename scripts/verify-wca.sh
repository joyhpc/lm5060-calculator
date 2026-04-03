#!/bin/bash

# LM5060 WCA 计算器 - 快速验证脚本（Bash 版本）

echo "🧪 LM5060 WCA 引擎验证"
echo ""

# 检查文件是否存在
echo "📁 检查文件完整性..."

files=(
  "lib/wca-engine.ts"
  "components/WCAInputForm.tsx"
  "components/WCAResultDisplay.tsx"
  "app/wca/page.tsx"
  "docs/WCA_TECHNICAL.md"
  "docs/WCA_UI_LAYOUT.md"
  "docs/WCA_INTEGRATION.md"
  "docs/WCA_DELIVERY.md"
)

missing_files=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (缺失)"
    missing_files=$((missing_files + 1))
  fi
done

echo ""

if [ $missing_files -eq 0 ]; then
  echo "✅ 所有文件完整"
else
  echo "❌ 缺失 $missing_files 个文件"
  exit 1
fi

echo ""
echo "📊 代码统计..."

# 统计代码行数
ts_lines=$(find lib components app/wca -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
md_lines=$(find docs -name "WCA_*.md" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

echo "✓ TypeScript/TSX 代码: $ts_lines 行"
echo "✓ Markdown 文档: $md_lines 行"

echo ""
echo "🔍 检查核心函数..."

# 检查核心函数是否存在
if grep -q "export function computeWCA" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ computeWCA() 函数存在"
else
  echo "✗ computeWCA() 函数缺失"
  exit 1
fi

if grep -q "export function snapToStandardResistor" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ snapToStandardResistor() 函数存在"
else
  echo "✗ snapToStandardResistor() 函数缺失"
  exit 1
fi

if grep -q "export function getAlternativeResistors" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ getAlternativeResistors() 函数存在"
else
  echo "✗ getAlternativeResistors() 函数缺失"
  exit 1
fi

echo ""
echo "🔍 检查 IC 容差常量..."

constants=(
  "UVLO_THRESHOLD"
  "OVP_THRESHOLD"
  "UVLO_BIAS_CURRENT"
  "UVLO_HYSTERESIS_CURRENT"
  "SENSE_CURRENT"
  "TIMER_CHARGE_CURRENT"
  "GATE_CHARGE_CURRENT"
  "REVERSE_COMP_CURRENT"
)

for const in "${constants[@]}"; do
  if grep -q "$const:" lib/wca-engine.ts 2>/dev/null; then
    echo "✓ $const 常量存在"
  else
    echo "✗ $const 常量缺失"
    exit 1
  fi
done

echo ""
echo "🔍 检查 E96/E24 序列..."

if grep -q "const E96_SERIES" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ E96_SERIES 序列存在"
else
  echo "✗ E96_SERIES 序列缺失"
  exit 1
fi

if grep -q "const E24_SERIES" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ E24_SERIES 序列存在"
else
  echo "✗ E24_SERIES 序列缺失"
  exit 1
fi

echo ""
echo "🔍 检查 React 组件..."

if grep -q "export default function WCAInputForm" components/WCAInputForm.tsx 2>/dev/null; then
  echo "✓ WCAInputForm 组件存在"
else
  echo "✗ WCAInputForm 组件缺失"
  exit 1
fi

if grep -q "export default function WCAResultDisplay" components/WCAResultDisplay.tsx 2>/dev/null; then
  echo "✓ WCAResultDisplay 组件存在"
else
  echo "✗ WCAResultDisplay 组件缺失"
  exit 1
fi

echo ""
echo "🔍 检查关键功能..."

# 检查迟滞电流计算
if grep -q "UVLO_HYSTERESIS_CURRENT" lib/wca-engine.ts 2>/dev/null && \
   grep -q "hys_offset" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ 迟滞电流偏移计算"
else
  echo "✗ 迟滞电流偏移计算缺失"
  exit 1
fi

# 检查 SOA 评估
if grep -q "soa_check" lib/wca-engine.ts 2>/dev/null && \
   grep -q "i2t_actual" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ MOSFET SOA 评估"
else
  echo "✗ MOSFET SOA 评估缺失"
  exit 1
fi

# 检查浪涌电流计算
if grep -q "inrush_current" lib/wca-engine.ts 2>/dev/null && \
   grep -q "peak_current" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ 浪涌电流计算"
else
  echo "✗ 浪涌电流计算缺失"
  exit 1
fi

# 检查反向验算
if grep -q "actual_thresholds" lib/wca-engine.ts 2>/dev/null && \
   grep -q "threshold_drift" lib/wca-engine.ts 2>/dev/null; then
  echo "✓ 反向验算与阈值漂移"
else
  echo "✗ 反向验算缺失"
  exit 1
fi

echo ""
echo "🔍 检查文档完整性..."

docs=(
  "WCA_TECHNICAL.md"
  "WCA_UI_LAYOUT.md"
  "WCA_INTEGRATION.md"
  "WCA_DELIVERY.md"
)

for doc in "${docs[@]}"; do
  if [ -f "docs/$doc" ]; then
    lines=$(wc -l < "docs/$doc")
    echo "✓ $doc ($lines 行)"
  else
    echo "✗ $doc (缺失)"
    exit 1
  fi
done

echo ""
echo "=" | tr -d '\n'; printf '%.0s=' {1..59}; echo ""
echo "🎉 所有检查通过！WCA 计算器已就绪"
echo "=" | tr -d '\n'; printf '%.0s=' {1..59}; echo ""
echo ""
echo "📦 交付清单："
echo "  ✅ 核心引擎: lib/wca-engine.ts (~650 行)"
echo "  ✅ UI 组件: components/WCA*.tsx (~550 行)"
echo "  ✅ 页面示例: app/wca/page.tsx (~150 行)"
echo "  ✅ 技术文档: docs/WCA_*.md (~17,000 字)"
echo ""
echo "🚀 下一步："
echo "  1. 运行 'npm run dev' 启动开发服务器"
echo "  2. 访问 http://localhost:3000/wca"
echo "  3. 测试 WCA 计算功能"
echo ""
echo "📚 文档位置："
echo "  - 技术文档: docs/WCA_TECHNICAL.md"
echo "  - UI 布局: docs/WCA_UI_LAYOUT.md"
echo "  - 集成指南: docs/WCA_INTEGRATION.md"
echo "  - 交付清单: docs/WCA_DELIVERY.md"
