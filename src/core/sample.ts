import type { Project } from './types';
export const sampleProject:Project={format:'mws-project',version:1,name:'山川之上 · Field Notes',entry:'index.html',modules:[],files:{
  'index.html':{kind:'text',content:`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>山川之上 — Field Notes</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="nav"><strong>FIELD / NOTES</strong><span>地理 · 数据 · 想象</span></nav>
  <main>
    <section class="hero">
      <p class="eyebrow">EXPLORATIONS / 001</p>
      <h1 class="title">山川之上</h1>
      <p class="intro">让每一个想法，拥有自己的形状。<br>从一行文字开始，构建属于你的网页。</p>
      <button id="explore" type="button">探索世界 ↗</button>
      <div class="landscape" aria-label="抽象山川"><div class="ridge far"></div><div class="ridge near"></div><span>35° N / 104° E</span></div>
    </section>
    <section class="cards">
      <article><p class="eyebrow">01 / TERRAIN</p><h2>山川为序</h2><p>点击选择元素，双击修改文字。</p></article>
      <article><p class="eyebrow">02 / STORIES</p><h2>数据生长</h2><p>结构模式排序，自由模式移动。</p></article>
    </section>
    <footer>BUILT WITH CURIOSITY · 2026</footer>
  </main>
  <script src="main.js"></script>
</body>
</html>`},
  'styles.css':{kind:'text',content:`* { box-sizing: border-box; }
body { margin: 0; background: #f3f5ef; color: #173e39; font-family: system-ui, sans-serif; }
.nav { padding: 22px 6%; display: flex; justify-content: space-between; border-bottom: 1px solid #d6dfd7; font-size: 12px; letter-spacing: .08em; }
main { max-width: 1080px; margin: auto; }
.hero { position: relative; padding: 64px 6% 40px; overflow: hidden; }
.eyebrow { font-size: 10px; letter-spacing: .18em; color: #627f77; }
h1 { font-size: clamp(38px, 6vw, 68px); letter-spacing: -.04em; margin: 22px 0; }
.intro { font-size: 14px; line-height: 1.9; color: #62776e; }
button { margin-top: 14px; padding: 13px 24px; background: #245d53; color: #fff; border: 0; border-radius: 30px; cursor: pointer; }
.landscape { position: relative; height: 150px; margin-top: 36px; overflow: hidden; border-radius: 12px; background: #e2eae0; }
.landscape span { position: absolute; bottom: 16px; left: 22px; font-size: 10px; letter-spacing: .15em; color: #fff; }
.ridge { position: absolute; width: 110%; height: 240px; left: -5%; border-radius: 45%; transform: rotate(-8deg); }
.far { top: 75px; background: #a6bbaa; }
.near { top: 110px; left: 20%; background: #496d60; transform: rotate(12deg); }
.cards { display: flex; gap: 20px; padding: 0 6% 36px; }
.cards article { flex: 1; padding: 22px; border: 1px solid #cbd8cf; border-radius: 12px; }
h2 { font-size: 20px; } .cards article > p:last-child { font-size: 12px; color: #62776e; }
footer { padding: 20px 6%; border-top: 1px solid #d6dfd7; font-size: 9px; letter-spacing: .16em; }
@media (max-width: 540px) { .cards { flex-direction: column; } .nav span { display: none; } .hero { padding-top: 36px; } }
`},
  'main.js':{kind:'text',content:`// Project scripts run only in explicit Preview, and in the exported website.
document.querySelector('#explore')?.addEventListener('click', () => {
  document.querySelector('.title').textContent = '世界，就在眼前';
});\n`}
}};
