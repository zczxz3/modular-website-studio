# 开发导航

[项目首页](../../README.md) · [文档目录](../README.md) · [源码地图](../../src/README.md)

## 启动与检查

需要 Node.js 22.12+。在项目根目录执行：

```bash
npm ci
npm start
```

修改核心功能后运行 `npm run check` 和 `npm run build`；涉及画布、导入导出或代码编辑时，再运行：

```bash
npx playwright install chromium
npm run test:e2e
```

`npm run package` 从干净的已提交 Git 版本生成源码包、网页包和校验清单；命令和产物见 [脚本说明](../../scripts/README.md)。

## 按任务找代码

| 任务 | 先读什么 | 实现位置 |
| --- | --- | --- |
| 改工作台界面和新手流程 | [界面记录](../interface-polish.md) | `src/components/`、`src/App.tsx` |
| 修改 HTML/CSS 写回和撤销 | [架构](../architecture.md)、[编辑契约](editor-contract.md) | `src/core/source.ts`、`commands.ts`、`store.ts` |
| 调整画布投影和选区 | [编辑契约](editor-contract.md) | `src/preview/`、`src/components/Canvas.tsx` |
| 增加模板 | [工程格式](../formats.md) | `src/templates/`、`src/core/catalog.ts` |
| 增加静态组件 | [组件接入](../resource-sync.md)、[模块格式](../formats.md) | `src/resources/`、`src/core/modules.ts` |
| 改动效配置或导出 | [P1–P4](../p1-p4.md)、[复用记录](../open-source-reuse.md) | `src/core/aos.ts`、`xyz.ts`、`effects.ts`、`export-html.ts` |
| 排查兼容性 | [当前边界](../status.md)、[安全模型](../../SECURITY.md) | `tests/`、`e2e/` |

## 保持的架构约束

真实源文件是工程的唯一持久数据；画布由源码生成。视觉操作通过命令和事务写回，保持一次手势一次撤销。不能为了小修改重新序列化整个 HTML，也不能让编辑 iframe 执行用户脚本。

动效和资源必须验证保存、重开、独立导出与清理。website-assets 以固定 revision 和稳定 ID 接入；自动同步和任意 JS 生命周期保留接口。新增模块不能绕过现有校验器。

详细规则见 [AGENTS.md](../../AGENTS.md) 与 [贡献指南](../../CONTRIBUTING.md)。历史验收分别记录其提交和环境，不能把旧绿灯写作新版本结果；当前证据入口在 [项目现状](../status.md#验证证据)。
