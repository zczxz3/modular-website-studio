# 完整下载、克隆检查与启动

## 本次核对

用户报告 Git 克隆后的目录为空、只剩失效的 Git。核对时，Studio 本地开发分支有完整源码，GitHub `main` 仍为早期 `3f989b2…`，未包含后续新手流程与 P0–P4。远端目录和本地索引都未发现 `160000` 类型的子模块指针。因此，不能仅凭这份反馈断言用户机器上的具体故障原因；本轮修复交付流程，并在全新目录验证完整检出。

## 普通用户的使用路径

1. 安装 Node.js 22.12 或以上版本。
2. 正常克隆仓库，或使用 GitHub **Code → Download ZIP** 后完整解压。
3. 在包含 `package.json` 的目录运行 `npm ci`，然后 `npm start`。
4. 打开终端显示的网址，使用模板、组件与素材完成作品，再下载工程或网站。

源码 ZIP 不需要 Git，也不需要 `.git`。普通克隆不需要递归子模块。项目已经包含模板、31 个组件的固定源码、动效依赖与许可证。

## 保留旧目录，重新检出

不要直接删除旧目录，以免丢失自己改过的文件。在旧目录的上一级运行：

```bash
git clone https://github.com/zczxz3/modular-website-studio.git modular-website-studio-clean
cd modular-website-studio-clean
npm ci
npm run check:checkout
npm start
```

如果不使用 Git，下载 GitHub 源码 ZIP，解压到新的普通文件夹后执行后四步中的 npm 命令。

若旧 `.git` 是包含 `gitdir: …` 的小文本文件，它属于另一处 Git 管理目录；移动文件夹或复制工作树后，目标路径可能失效。这种文件不等于完整 Git 仓库。不要从旧目录拷贝这个指针来“修复”新目录，也不要对未知目录执行强制清理。

`npm run check:checkout` 检查关键源码是否存在且非空；有 Git 时检查源码是否已跟踪、是否含有子模块指针；遇到失效工作树指针给出明确错误。无 Git 的完整源码 ZIP 也能通过。

## 网页运行包

维护者运行 `npm run package`，会先构建，再从干净提交生成：

| 文件 | 内容与用途 |
| --- | --- |
| `release/modular-website-studio-source.zip` | `git archive HEAD` 的完整普通源码；不带 `.git`、子模块指针或 node_modules |
| `release/modular-website-studio-web.zip` | 生产网页、依赖原许可证、独立 HTTP 服务、Windows/Linux/macOS 启动文件 |
| `release/manifest.json` | 源码提交与两个包的字节数、SHA-256 |

网页包完整解压后，Windows 双击 `start.cmd`；macOS/Linux 运行 `sh start.sh`。启动文件只调用 Node 内置模块，无需 npm 下载依赖。默认监听 `127.0.0.1:4173`，不会向局域网开放。端口被占用时会明确报错，可设置 `PORT`。必须经 HTTP 打开，不能双击构建目录里的 HTML。

草稿仍属于当前浏览器和地址；给别人传递作品应下载可编辑工程或导出网站。以上分发修复不加入安装器、账户或远程服务。

CI 在干净 checkout 下执行 `npm ci`、完整检查、打包和浏览器回归，并上传 `studio-source-and-web` 构建产物。下载 CI 产物需按 GitHub 的访问条件登录；开发者也可以自行按上述命令生成，不依赖该下载入口。

## 本轮验证记录

已在新的普通 Git 克隆目录验证（`git clone --no-hardlinks --single-branch`，不是 worktree）：

- `npm ci --offline` 从本机 npm 缓存安装 213 个依赖包，通过；没有复用原目录的 node_modules。
- `npm run check`：17 个测试文件、133 项源码/DOM 测试通过；另有 3 项分发回归通过，覆盖失效 gitdir、子模块式空目录和静态服务。
- `npm run package` 生产构建与两种 ZIP 生成通过；保留既有 Monaco 大包提示。
- 源码 ZIP 单独解压，在无 `.git` 的目录通过检出检查。
- 网页 ZIP 单独解压，在无 `.git`、无 node_modules 的目录启动独立 Node 服务；真实 Chromium 完成新建作品、中文标题编辑、添加仓库组件、导出单页 HTML，并在断网后打开验证内容与样式。

前一轮同一编辑器源码的全量浏览器回归为 30 项通过；本轮改变启动、完整性检查与分发，不把这份历史结果写作新的全量回归。用户原来那个空目录未提供具体路径，尚未直接检查或修改。
