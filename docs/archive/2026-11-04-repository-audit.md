# 历史归档：2026-11-04 仓库盘点

> 本页仅保留当时的分支、数量和上游调查结果，不描述当前发布状态。当前信息见 [项目现状](../status.md)。

# 仓库整理与首个作品集目标

**后续更新：** P0–P4 与 31 个 website-assets 静态组件已在当前源码完成；使用 [下载与克隆修复](../checkout-and-release.md) 中的完整交付流程。下面的远程版本矩阵是早期核对记录，不代表当前分支功能数量。

核对日期：2026-11-04。本页区分远端已发布代码、本地开发成果和待办；本地提交不代表已推送或上线。

## 两个仓库的职责

| 仓库 | 当前职责 | 本轮边界 |
| --- | --- | --- |
| `modular-website-studio` | 创建作品、编辑真实 HTML/CSS、应用受控交互、保存工程与导出网站 | 优先完成中文个人作品集的连续创作流程 |
| `website-assets` | 组件研究、独立效果演示、静态模块包、Queue/Foundation 实验工作台 | 记录可复用资源和上游待办；不实装自动加载、同步或升级 |

Studio 继续使用本地示例；外部资源只保留 [接入契约](../resource-sync.md)。项目源码、稳定元素 ID、事务和撤销记录的设计边界见 [架构说明](../architecture.md)。

本轮工作已整理到独立的本地 `feat/student-first-site` 分支；具体实现、最终检查与未完成的验收见 [学生首个网站验收](../student-first-site-validation.md)。已有模块跨页修复包含在本地历史中，远端 PR 的合并状态单独记录。

## 版本与验证位置

| 位置 | 核对到的版本 | 可以确认的内容 |
| --- | --- | --- |
| Studio 远端 `main` | [`3f989b2`](https://github.com/zczxz3/modular-website-studio/tree/3f989b2be833f468db600c24aa49194abf5f918e) | 已有源码编辑器；不能把本地新增的新手流程当成主线已发布功能 |
| Studio 远端 `feat/portfolio-workbench` | [`737dd6a`](https://github.com/zczxz3/modular-website-studio/tree/737dd6a883902d580d7fd8bab60b78bbf2697bcd) | 有作品集模板目录；README 与主线相同，不能仅凭模板文件声称完整新手界面已上线 |
| Studio [PR #1](https://github.com/zczxz3/modular-website-studio/pull/1) | open，核对时 head 为 `88d847…` | 跨页模块复用修复待整合；[通过的 CI](https://github.com/zczxz3/modular-website-studio/actions/runs/41771842193) 对应 `f162534…`，不等于当前 PR head 已通过 |
| Studio 本轮开工时的本地分支 | `feat/portfolio-workbench`，`d73c326` | 中文开始页、作品集模板、上传图片、淡入、实时拖动、受控交互、单 HTML/ZIP 导出；66 项单元/DOM 测试及构建通过，浏览器验收未完成 |
| website-assets 远端 `main` | [`e84d571`](https://github.com/zczxz3/website-assets/tree/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf) | 本次固定版本复跑 Queue 的 10 项 Node 测试，全部通过 |

两仓库核对时均没有 GitHub Pages，仓库主页链接为空。README 可以提供源码和本地运行说明；实际发布并验证前，不填写猜测的在线创作地址。已有历史浏览器测试只证明其记录的提交，不能替后续修改验收。

## 数量口径：可添加、可体验、研究参考

| 范围 | 数量 | 正确解释 |
| --- | --- | --- |
| Studio 本地资源目录，`d73c326` | 7 个 | 5 个固定上游改编示例，加 2 个本地原创选项卡/折叠问答；均可在当前本地工作台添加 |
| 上游 Foundation 包 | 30 个 | 30 个唯一 ID 的静态 HTML/CSS 模块；不是 30 个 JS 插件，也没有自动安装到 Studio |
| Queue 静态项目卡 | 单独提供 | `queue-card.zip` 是另一份静态模块交付，不与 Foundation 数量混算 |
| Queue 研究目录 | 50 项 | 6 项有限实现、41 项待实现、3 项仅供参考；不是 50 个已可安装组件 |
| 新增效果契约 | 20 项 | 均为 planned，运行入口为空，不能标为可添加；效果分类视图共 26 项，与其他分类有重叠 |
| Motion Atlas 图库 | 25 项 | 独立技术演示；其中 JS/WebGL 效果有自身生命周期，不等于 Studio 静态模块 |
| 本轮 Studio 内置效果 | 4 个 CSS 效果 + 淡入 | 按选中对象提供，均随工程与网站保存；不计入 7 个插入模块或上游研究数量 |

产品卡片的含义应保持一致：**可添加**表示已具备本地插入、保存和导出路径；**可体验**表示有演示但尚无 Studio 适配；**研究参考**表示技术或设计来源，不能承诺安装。模板、素材、组件与特效分开计数。

## 上游缺口与 Studio 本轮工作

以下上游问题在 `e84d571` 仍可复现，应记录为 website-assets 待办，不能误写成当前本地 Studio 已缺失的能力。

| 位置 | 核对结果 | 处理方向 |
| --- | --- | --- |
| 上游首页 | 英文动效研究图库，未提供 Queue/模板建站入口 | 上游补首页导航；Studio 自己提供明确的模板入口 |
| Queue 输出语言 | 中文姓名能输出，但 `lang="en"` 和 `View my work` 仍固定为英文 | 上游增加语言与文案配置；Studio 使用中文模板和用户姓名 |
| Queue 封面 | 图片路径被拒绝，只接受六位十六进制颜色 | 上游扩展图片资源模型；Studio 完善已有上传、裁切和跨页封面关联 |
| Queue 保存 | `Save edits` 下载 Queue JSON；`Open in Studio · JSON` 仅下载工程 | 上游纠正按钮含义；Studio 区分本机草稿、可编辑工程和交付网站 |
| Foundation 定制 | 切换组件重置调整；每次变体都使用固定 `-custom` ID | 上游增加按组件草稿与独立变体 ID；Studio 保留实例局部样式和重复 ID 校验 |
| 上游描述与验收文档 | 仓库简介仍称 15 个网站；README 为 25；旧 Queue 验收记录为 8 项 Node 测试 | 整理时保留历史测试版本，另记当前 10 项结果，不把旧记录改造成新验证 |

本次中文姓名探针输出 7 个文件：首页、3 个作品详情页、日志列表、文章和 CSS。姓名正常，语言/按钮仍为英文；`photos/my-cover.jpg` 报错 `Use a six-digit hex color.`。六个测试输入文件均核对了 Git blob；CSV 保留原始字节，SHA-256 为 `1f6ec208a7ff2a681532f4deddcd8584b42fbf6640710cf5ae1e9a51df3d51d1`。

## 本轮目标与优先级

**一个第一次打开平台的学生，从首页开始，换自己的名字和两张作品封面，拖动排序，给标题加淡入，在 390px 预览后，导出能独立打开的网站。**

| 优先级 | 工作 | 验收结果 |
| --- | --- | --- |
| P0 | 明确模板入口与姓名设置 | 无需文档或命令，两次点击内进入可修改标题的作品 |
| P0 | 封面上传、本地素材、纯色、裁切与替代文字 | 横图/竖图在首页和对应详情页一致，保存重开和离线导出后仍在 |
| P0 | 保存与交付分开 | 用户能区分本机草稿、可编辑工程、网站文件；明天能恢复自己的版本 |
| P0 | 导出集中说明 | 完整网站 ZIP 与受支持的单页 HTML 含义清楚；跨页作品不会误导为单文件已包含全站 |
| P1 | 按选中对象展示适用效果，用少量预设调节 | 标题可加淡入、重播和移除；编辑、预览、导出使用同一配置 |
| P1 | 保护布局与实例修改 | 拖动后加悬停效果，移开仍在原位置；两个样式变体保存重开后互不覆盖 |
| P1 | 资源能力标签与文档索引 | 用户能区分可添加、可体验、研究参考；上游更新不自动改写作品 |

本表是本轮实现和验收目标，不作为未经验证的完成清单。完成情况由代码、最终测试记录及 [五人可用性验收](../student-usability-check.md) 更新。

## 发布门槛

| 门槛 | 必须留下的证据 |
| --- | --- |
| 本地正确性 | 对最终提交运行完整检查和生产构建；保存实际命令、版本、结果 |
| 真实浏览器 | 从开始页到独立导出网站的完整操作、实际文件下载重开、390px 和减少动态效果检查；浏览器无法启动时不得标记通过 |
| 五位首次使用者 | 记录第一次停顿、最终导出文件、第二天恢复情况；不以开发者演示替代 |
| 仓库整合 | 在准确提交上核对 PR/CI，保留已完成成果，解决分支差异；不得把较早提交的绿灯套用到新 head |
| 在线入口 | 选定发布方式，实际发布并打开检查后再填写入口；本地准备不等于已公开发布 |

本轮不扩大远程市场、WebGL/任意脚本模块、同步升级或复杂时间轴。

## 证据与相关文档

- [上游 README](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/README.md)、[首页](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/index.html)、[组件 API](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/COMPONENT_API.md)。
- [Queue 页面](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/queue.html)、[生成器](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/queue-model.mjs)、[下载实现](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/queue-lab.mjs)、[当前测试](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/queue-tests.mjs)。
- [Foundation 目录](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/foundation-modules.json)、[定制实现](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/foundation.mjs)、[研究状态目录](https://github.com/zczxz3/website-assets/blob/e84d571299b63d8c66b447ce52b8c8f5e8fd02cf/queue-registry.json)。
- [本地作品集记录](../portfolio-validation.md)、[拖动与 HTML 导出记录](../drag-html-validation.md)、[项目/模块格式](../formats.md)、[路线图](../roadmap.md)。
