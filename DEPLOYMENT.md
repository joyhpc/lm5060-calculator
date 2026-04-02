# LM5060 Calculator - 部署完成 ✅

## 生产环境 URL

**🌐 https://lm5060-calculator.vercel.app**

---

## 部署信息

- **平台**: Vercel
- **框架**: Next.js 16.2.2 + FastAPI
- **部署时间**: 2026-04-02
- **状态**: ✅ 运行正常

---

## API 端点测试

### 正向计算 API

```bash
curl -X POST https://lm5060-calculator.vercel.app/api/forward \
  -H "Content-Type: application/json" \
  -d '{
    "vin_min": 9.0,
    "vin_max": 36.0,
    "i_limit": 30.0,
    "rds_on": 5.0,
    "ocp_delay": 12.0,
    "dvdt": 0.5,
    "health_check": true
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "R8_kOhm": 170.0,
    "R10_kOhm": 46.25,
    "R11_kOhm": 10.0,
    "Rs_Ohm": 14556.96,
    "C_TIMER_nF": 64.5,
    "C_GATE_nF": 48.0,
    "V_DSTH_mV": 150.0
  },
  "health": {
    "condition_number": 1.21,
    "status": "HEALTHY",
    "warnings": []
  }
}
```

### 反向计算 API

```bash
curl -X POST https://lm5060-calculator.vercel.app/api/reverse \
  -H "Content-Type: application/json" \
  -d '{
    "R8": 170.0,
    "R10": 46.25,
    "R11": 10.0,
    "Rs": 14556.96,
    "C_TIMER": 64.5,
    "C_GATE": 48.0,
    "rds_on": 5.0
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "uvlo_rising_V": 9.0,
    "uvlo_falling_V": 8.46,
    "ovp_threshold_V": 36.0,
    "ocp_delay_ms": 12.0,
    "i_limit_A": 30.0,
    "gate_slew_rate_V_per_us": 0.5,
    "vds_threshold_mV": 150.0
  }
}
```

---

## 架构

```
用户浏览器
    ↓
Vercel Edge (CDN)
    ├─ Next.js 前端 (静态)
    └─ Python Serverless Functions
         ├─ /api/forward.py
         └─ /api/reverse.py
              ↓
         lm5060 计算引擎
```

---

## 本地开发

### 启动后端 API

```bash
cd /home/ubuntu/lm5060-calculator
python3 api/main.py
# API 运行在 http://localhost:8000
```

### 启动前端

```bash
cd /home/ubuntu/lm5060-calculator
npm run dev
# 前端运行在 http://localhost:3000
```

### CLI 测试 API

```bash
# 测试本地 API
curl -X POST http://localhost:8000/api/forward \
  -H "Content-Type: application/json" \
  -d @input.json

# 测试生产 API
curl -X POST https://lm5060-calculator.vercel.app/api/forward \
  -H "Content-Type: application/json" \
  -d @input.json
```

---

## 解耦验证

### 1. CLI 独立运行 ✅

```bash
python3 -m lm5060.cli forward --vin-min 9 --vin-max 36 --i-limit 30 --rds-on 5 --ocp-delay 12 --dvdt 0.5
```

### 2. API 独立运行 ✅

```bash
python3 api/main.py
curl http://localhost:8000/api/forward -d @input.json
```

### 3. Web UI 调用 API ✅

- 本地开发：调用 `http://localhost:8000`
- 生产环境：调用 `/api/*` (Vercel serverless functions)

---

## 部署流程

1. **本地测试**
   ```bash
   npm run build  # 测试前端构建
   python3 -m pytest tests/  # 运行测试
   ```

2. **部署到 Vercel**
   ```bash
   vercel --prod
   ```

3. **验证部署**
   ```bash
   curl https://lm5060-calculator.vercel.app/api/forward -d @test.json
   ```

---

## 技术栈

### 前端
- Next.js 16.2.2 (App Router)
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4

### 后端
- FastAPI (本地开发)
- Python Serverless Functions (Vercel)
- lm5060 计算引擎

### 部署
- Vercel (无服务器)
- Edge Functions
- CDN

---

## 性能指标

- **API 响应时间**: < 500ms
- **往返精度**: < 0.1% (实测 0.0000%)
- **可用性**: 99.9% (Vercel SLA)

---

## 监控

- **Vercel Dashboard**: https://vercel.com/hpcs-projects-418be2b9/lm5060-calculator
- **部署日志**: 可在 Vercel 控制台查看
- **API 错误**: 返回 400 状态码 + 错误信息

---

## 更新部署

```bash
# 修改代码后
git add .
git commit -m "Update feature"
vercel --prod
```

---

**部署完成时间**: 2026-04-02  
**部署状态**: ✅ 成功  
**生产 URL**: https://lm5060-calculator.vercel.app
