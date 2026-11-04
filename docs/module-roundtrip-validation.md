# 本地模块跨页面保存与导出验收

## 测试输入与修复前复现

Node.js 22+ 下运行：

```bash
npm ci
node --experimental-strip-types tests/module-fixtures.ts
npm run dev
```

输入生成在 `test-results/module-fixtures/`。`site.zip` 包含 `index.html`、`pages/about.html`、`styles.css` 和独立 `main.js`；`card.zip` 是根目录含 `module.json` 的真实本地模块 ZIP。

1. 打开 `site.zip`，通过「模块 → ＋ 安装模块 ZIP」安装 `card.zip`；首页添加两次，再通过「文件 → 当前页面」切到 `pages/about.html` 添加一次。修复前二级页卡片计算出的 padding 为 `0px`，应为 `23px`，原因是 CSS 已存在时跳过了该页的 link 插入。
2. 在同一项目安装并使用 `a-slash-b.zip` 和 `a-dash-b.zip`。修复前 `a/b` 和 `a-b` 都映射到 `modules/a-b.css`，后一张卡片 padding 为 `0px`，应为 `29px`。打开 `legacy.mws.json` 后再安装短横线模块也会复现。
3. 安装 `unsafe.zip` 会拒绝 onclick，但修复前打开具有同一 manifest 的 `unsafe.mws.json` 会成功替换项目。修复后两种入口都拒绝，当前项目保持不变。

测试先于产品修复提交。基线浏览器运行 `41771001970` 得到 **4 failed / 2 passed**，失败位置分别是二级页样式、两个 ID 碰撞用例和不安全项目重开。本地新增校验用例在修复前得到 **3 failed / 17 passed**，另发现 template 内事件属性未被遍历。

## 修复范围

- `src/core/modules.ts`：模块 ID 采用无碰撞编码；匹配的旧 v1 CSS 继续复用；按当前页面检查相对 link。通过现有源码 insert 命令和 transaction 准备完整项目，交给 ProjectStore 一次提交。
- `src/App.tsx`：`useModule()` 调用统一插入函数，保留一次撤销/重做。
- `src/core/module-validation.ts`、`src/core/io.ts`：ZIP 与项目重开共用 HTML、CSS、权限和依赖校验；包括 template 内容；普通网站脚本不受模块 manifest 限制。
- `tests/module-fixtures.ts`、`tests/modules.test.ts`：真实 ZIP 输入、旧 v1 项目、恶意 manifest、事务回滚和手工 CSS 保留测试。
- `e2e/helpers.ts`、`e2e/editor.spec.ts`：真实文件选择器、保留 suggestedFilename 的下载、新上下文重开、浏览器计算样式、真实导出解压与独立静态服务器。

## 最短手工验收路径

1. 执行上面的三条命令，打开开发服务器地址，点击「画布」，「打开项目」选择生成的 `site.zip`。
2. 「模块 → ＋ 安装模块 ZIP」选择 `card.zip`，点击「本地验收卡片 → ＋ 添加到页面」。撤销一次应消失，重做一次应恢复；再添加一次，首页共两张卡片。
3. 「文件 → 当前页面」选择 `pages/about.html`，在模块库添加一张。应同样显示浅蓝背景、深蓝文字和 23px 内边距。
4. 切回首页，「保存项目」下载 `website.mws.json`。在新的无痕窗口打开编辑器，再用「打开项目」选中该下载文件。首页标题含 `HOME-20261104`、两张卡片；二级页标题含 `ABOUT-20261104`、一张卡片，模块库中仍有「本地验收卡片」。
5. 从库卸载该模块，页面实例及样式应保留。点击「导出网站 ↗」，解压下载 ZIP，在解压目录执行 `python -m http.server 8000`。分别访问 `/index.html` 与 `/pages/about.html`，卡片外观不变；点击「原站按钮」后输出变为「原站脚本执行成功」。编辑画布中的该按钮不会运行原站脚本。

补充碰撞验收：打开 `legacy.mws.json`，安装 `a-dash-b.zip`，将「短横线模块」加入页面，两种卡片分别有 17px 和 29px 内边距。原 `modules/a-b.css` 文件及 `href='./modules/a-b.css'` 保持原样。

自动检查还断言全项目恰有一份该卡片 CSS、每个使用页恰有一个正确引用、导出的源文件与保存项目一致，以及卸载仅移除模块注册信息。

## 实际执行结果（2026-11-04）

修复版本 `f16253409c1b7a340481796185e86bc1fbf39240` 的 [GitHub Actions 运行](https://github.com/zczxz3/modular-website-studio/actions/runs/41771842193) 使用 Node.js 22 和 Chromium，三个要求的命令均成功：

| 命令 | 结果 |
| --- | --- |
| `npm run check` | TypeScript 检查通过；3 个测试文件、23 项单元测试通过 |
| `npm run build` | 通过；31.76 秒，保留既有 Monaco 大包体提示 |
| `npm run test:e2e` | 6 passed，17.7 秒，无失败或重试通过项 |

本地同样通过 check（23 项）和 build。当前受限执行环境运行 test:e2e 时，Vite 启动遇到系统错误 `uv_interface_addresses returned Unknown system error 1`，未进入浏览器测试；上述浏览器通过结果来自仓库真实 CI，而非本地环境。未为规避该限制改动产品或测试配置。
