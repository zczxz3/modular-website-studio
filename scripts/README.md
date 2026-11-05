# 维护脚本

[开发导航](../docs/development/README.md) · [分发说明](../docs/checkout-and-release.md)

| 命令 | 作用 | 会生成或修改什么 |
| --- | --- | --- |
| `npm start` / `npm run dev` | 启动 Vite 开发服务 | 开发缓存，不修改工程源码 |
| `npm run check:checkout` | 检查源码完整性、失效 gitdir 和 gitlink | 只读 |
| `npm run check:resources` | 校验固定上游、动效、组件包与许可证 | 只读 |
| `npm run check` | 检出/资源检查、TypeScript、单元/DOM 和分发测试 | TypeScript 缓存 |
| `npm run build` | 生产构建 | `dist/` |
| `npm run package` | 构建并从干净的 Git 提交制作发行包 | `release/` 的两种 ZIP 和 `manifest.json` |
| `npm run serve` | 使用 Node 内置静态服务打开 `dist/` | 默认仅监听 `127.0.0.1:4173` |
| `npm run test:e2e` | 真实 Chromium 操作、下载重开与离线导出验证 | `test-results/` |
| `node scripts/build-curated.mjs` | 从固定上游文件重建精选区块 | `src/resources/curated/` 中的生成文件 |
| `node scripts/build-website-assets.mjs` | 从本地固定发行包重建组件定义 | `src/resources/website-assets-library/` 中的生成文件 |

## 发行产物

`modular-website-studio-source.zip` 用于开发；`modular-website-studio-web.zip` 用于直接启动工作台；`manifest.json` 记录源码提交、文件大小和 SHA-256。输出目录不提交进 Git，正式版本在 GitHub Releases 发布。

打包要求工作区干净且源码已提交。不要手工把 `node_modules/`、`.git`、本机缓存或 worktree 指针放入 ZIP。
