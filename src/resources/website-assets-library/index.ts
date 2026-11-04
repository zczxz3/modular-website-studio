import modules from './modules.json';
import catalog from './catalog.json';
import pin from './provenance.json';
import license from './LICENSE.txt?raw';
import type {StudioModule} from '../../core/types';
import type {ModuleCatalogSnapshot} from '../../core/resource-contract';

// Existing beginner examples use mf-/qr- too. Namespace the new library so
// mixing the original designs with those themed examples cannot replace CSS.
export const WEBSITE_ASSET_MODULES:StudioModule[]=modules.map(module=>({
  ...module,version:'1.0.1',
  html:module.html.replace('class="mf-price">mf-pricing0 ','class="mf-price">¥0 ').replace(/class="([^"]*)"/g,(_all,classes:string)=>`class="${classes.split(/\s+/).map(name=>/^(mf-|qr-)/.test(name)?'wa-'+name:name).join(' ')}"`),
  css:module.css.replace(/\.(mf-|qr-)/g,'.wa-$1').replace(/\bmf-(spin|shimmer|orbit)\b/g,'wa-mf-$1')
}));
export const WEBSITE_ASSET_CATEGORIES:Record<string,string>={Forms:'表单控件',Disclosure:'展开内容',Navigation:'导航链接',Cards:'内容卡片',Data:'数据展示',Feedback:'状态反馈',Layout:'布局容器',Buttons:'动效按钮',Portfolio:'作品展示'};
// Presentation metadata only. Raw upstream manifests remain in modules.json and the archive.
const labels:Record<string,[string,string]>={
  field:['单行输入框','带标签与焦点提示；填写内容仅在当前页面保留，不提交到服务器。'],
  textarea:['多行文本框','适合留言与说明；不包含自动保存或字数统计。'],
  select:['下拉选择框','原生下拉选项；不连接筛选或业务逻辑。'],
  checklist:['复选清单','可独立勾选的项目；刷新后恢复默认状态。'],
  switch:['偏好开关','原生复选开关；不会申请通知权限或修改系统设置。'],
  range:['范围滑块','原生范围控制；不联动数值输出或其他特效。'],
  'form-grid':['响应式表单组','多字段自适应排列；未连接提交或后台服务。'],
  accordion:['折叠内容组','原生 details；各项可独立展开，无需 JavaScript。'],
  help:['行内帮助','原生点击展开的说明；不是悬浮提示或模态弹窗。'],
  navigation:['原生折叠导航','适配手机的原生菜单；发布前替换示例链接。'],
  breadcrumb:['面包屑导航','显示页面层级；发布前替换示例链接，不含路由逻辑。'],
  card:['图文内容卡片','CSS 插画与正文；修改示例文字与链接后使用。'],
  stat:['统计数字卡片','静态数据展示；数字需要自行更新，不连接实时统计。'],
  pricing:['价格方案卡片','示例价格与权益；按钮不会发起购买或支付。'],
  table:['基础数据表格','语义化表格；不包含排序、分页或实时数据。'],
  progress:['进度指示条','静态进度示例；显示文字与 progress 数值需一起调整。'],
  spinner:['加载旋转标记','纯 CSS 等待动效；不连接请求，完成后需移除。'],
  skeleton:['骨架加载占位','纯 CSS 加载示例；不会自动切换为实际内容。'],
  notice:['常驻提示信息','页面内静态提示；不含自动消失、关闭或实时播报。'],
  grid:['响应式双栏容器','自动适配窄屏；导出后的组件不包含编辑器拖放功能。'],
  'button-fill':['填充悬停按钮','纯 CSS 填充反馈；按钮动作需要另行配置。'],
  'button-border':['描边悬停按钮','纯 CSS 边框反馈；按钮动作需要另行配置。'],
  'button-wave':['波纹悬停按钮','纯 CSS 波纹反馈；按钮动作需要另行配置。'],
  'button-blob':['柔形悬停按钮','纯 CSS 柔形背景；按钮动作需要另行配置。'],
  'button-shine':['扫光悬停按钮','纯 CSS 扫光；按钮动作需要另行配置。'],
  'button-halo':['光环悬停按钮','纯 CSS 光环反馈；按钮动作需要另行配置。'],
  'button-roll':['滚动文字按钮','纯 CSS 文字翻转；改文案时同步修改两份文字。'],
  'button-stagger':['逐字悬停按钮','纯 CSS 逐字反馈；改文案时同步字母和 aria-label。'],
  'button-depth':['立体按压按钮','纯 CSS 层次反馈；按钮动作需要另行配置。'],
  'button-back':['回退悬停按钮','纯 CSS 回退反馈；按钮动作需要另行配置。'],
  'project-card':['作品展示卡 · Queue','静态作品卡片；标题、介绍和链接可修改，需设置真实目标。']
};
export const WEBSITE_ASSET_META:Record<string,{name:string;description:string;category:string;originalName:string}>=Object.fromEntries(catalog.modules.map(record=>{
  const [name,description]=labels[record.id.split('/').pop()!]||[record.name,record.limitations];
  return [record.id,{name,description,category:record.category,originalName:record.name}];
}));
export const WEBSITE_ASSET_NOTICE=`Website Assets static library: https://github.com/${pin.repository}/tree/${pin.revision}\n31 static modules retain upstream IDs. Studio adaptations @1.0.1 prefix mf-/qr- CSS classes and named keyframes with wa- to coexist with older themed examples; foundation/pricing also corrects the upstream sample amount mf-pricing0 to ¥0. Chinese labels are presentation metadata. Original HTML, CSS and manifests remain in the pinned archive and modules.json. Runtime tarball and planned effects are excluded. Projects keep their saved manifests; no automatic upgrades.\n\n${license}`;
export const WEBSITE_ASSET_SNAPSHOT:ModuleCatalogSnapshot={schemaVersion:1,providerId:'website-assets',revision:pin.revision,resources:WEBSITE_ASSET_MODULES.map(module=>({kind:'component',module})),files:{},notice:WEBSITE_ASSET_NOTICE};
