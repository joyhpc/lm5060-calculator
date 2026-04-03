# 测试快速入门

## 快速运行

```bash
# 运行所有测试（推荐）
./scripts/run-all-tests.sh

# 或分别运行
npm test                    # TypeScript 测试
pytest                      # Python 测试
```

## 测试覆盖

✅ **39 个测试用例，100% 通过率**

- TypeScript: 30 个测试（单元测试 + 集成测试）
- Python: 9 个测试（正向计算 + 反向验算）

## 关键测试

### 回归测试（防止 R10 单位 bug 复现）
```bash
npm test -- --reporter=verbose | grep "回归测试"
```

### 单位转换测试
```bash
npm test -- --reporter=verbose | grep "单位转换"
```

### 边界条件测试
```bash
npm test -- --reporter=verbose | grep "边界条件"
```

## 测试 UI

```bash
npm run test:ui             # 打开 Vitest UI
```

## 详细文档

- 完整测试文档：`docs/TESTING.md`
- 测试覆盖报告：`TEST_COVERAGE_REPORT.md`

## 添加新测试

### TypeScript
编辑 `lib/__tests__/wca-engine.test.ts`：

```typescript
it('新测试用例', () => {
  const result = computeWCA({ /* 参数 */ })
  expect(result.field).toBe(expected)
})
```

### Python
在 `tests/` 目录创建 `test_*.py`：

```python
def test_new_feature():
    result = compute_bom(input_data)
    assert result.field == expected
```

## CI/CD 集成

在 CI/CD pipeline 中运行：

```yaml
- name: Run tests
  run: |
    npm test
    pytest
```

---

**测试框架**: Vitest 4.1.2 + pytest 9.0.2
**最后更新**: 2026-04-03
