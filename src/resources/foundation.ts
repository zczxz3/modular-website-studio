// Frozen local examples from zczxz3/website-assets@4f1d40d4f5c77ed42bb4baa55fc86722267690e9.
// Preserve source and MIT notices; repository integration is deferred (docs/resource-sync.md).
export const foundation = [
  {
    "id": "foundation/navigation",
    "version": "1.0.0",
    "name": "Compact navigation",
    "description": "Native disclosure navigation with real link destinations.",
    "html": "<nav class=\"mf-navigation\" aria-label=\"Example navigation\"><strong>FIELD STUDIO</strong><details><summary>Explore</summary><div><a href=\"https://example.com/\">Overview</a><a href=\"https://example.com/work\">Work</a><a href=\"https://example.com/about\">About</a></div></details></nav>",
    "css": "/*\nMIT License\n\nCopyright (c) 2026 website-assets contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n*/\n.mf-navigation {--mf-accent:#286c70;--mf-ink:#163d42;--mf-surface:#ffffff;--mf-radius:14px;--mf-space:20px;--mf-duration:260ms;color:var(--mf-ink);background:var(--mf-surface);font:15px/1.55 system-ui,sans-serif;max-width:100%;border-radius:var(--mf-radius);padding:var(--mf-space);border:1px solid #c4d4d5;overflow-wrap:anywhere} .mf-navigation,.mf-navigation *,.mf-navigation *::before,.mf-navigation *::after{box-sizing:border-box} .mf-navigation :where(h2,h3,p){margin:0 0 12px} .mf-navigation :where(input,select,textarea,button){font:inherit;color:inherit} .mf-navigation :where(input,select,textarea){max-width:100%;accent-color:var(--mf-accent)} .mf-navigation :where(button,a,summary,input,select,textarea):focus-visible{outline:3px solid var(--mf-accent);outline-offset:4px} .mf-navigation a{color:var(--mf-accent);text-underline-offset:4px} .mf-navigation small{font-size:12px;color:#456569} .mf-navigation label{cursor:pointer}\n.mf-navigation {display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap} .mf-navigation strong{font-size:13px;letter-spacing:.12em;padding-top:12px} .mf-navigation summary{cursor:pointer;min-height:44px;padding:10px} .mf-navigation details div{display:grid;gap:4px} .mf-navigation a{padding:12px;min-height:44px}\n@media(prefers-reduced-motion:reduce){.mf-navigation *,.mf-navigation *::before,.mf-navigation *::after{animation:none!important;transition:none!important}}",
    "permissions": [],
    "dependencies": {},
    "study": {
      "category": "Navigation",
      "references": [
        6,
        8,
        26
      ],
      "behavior": "Native disclosure navigation with real link destinations.",
      "limitations": "Replace example.com links before publishing; not an ARIA application menu.",
      "editable": "Text, --mf-accent, --mf-radius, --mf-space and --mf-duration.",
      "implementation": "Independent implementation; no third-party source copied.",
      "license": "MIT",
      "selector": ".mf-navigation"
    }
  },
  {
    "id": "foundation/card",
    "version": "1.0.0",
    "name": "Editorial card",
    "description": "Responsive semantic article with an original CSS illustration.",
    "html": "<article class=\"mf-card\"><div class=\"mf-cover\" aria-hidden=\"true\"></div><p><small>FIELD NOTES · 01</small></p><h2>Room for a new idea</h2><p>A quiet starting point for stories, projects and useful details.</p><a href=\"https://example.com/\">Read the story ↗</a></article>",
    "css": "/*\nMIT License\n\nCopyright (c) 2026 website-assets contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n*/\n.mf-card {--mf-accent:#286c70;--mf-ink:#163d42;--mf-surface:#ffffff;--mf-radius:14px;--mf-space:20px;--mf-duration:260ms;color:var(--mf-ink);background:var(--mf-surface);font:15px/1.55 system-ui,sans-serif;max-width:100%;border-radius:var(--mf-radius);padding:var(--mf-space);border:1px solid #c4d4d5;overflow-wrap:anywhere} .mf-card,.mf-card *,.mf-card *::before,.mf-card *::after{box-sizing:border-box} .mf-card :where(h2,h3,p){margin:0 0 12px} .mf-card :where(input,select,textarea,button){font:inherit;color:inherit} .mf-card :where(input,select,textarea){max-width:100%;accent-color:var(--mf-accent)} .mf-card :where(button,a,summary,input,select,textarea):focus-visible{outline:3px solid var(--mf-accent);outline-offset:4px} .mf-card a{color:var(--mf-accent);text-underline-offset:4px} .mf-card small{font-size:12px;color:#456569} .mf-card label{cursor:pointer}\n.mf-card .mf-cover{height:130px;border-radius:8px;background:radial-gradient(ellipse at 20% 100%,#a9cbd0 0 32%,transparent 33%),linear-gradient(135deg,#e0eceb,#9ebec3);margin-bottom:22px} .mf-card h2{font:500 28px/1.15 Georgia,serif} .mf-card a{display:inline-flex;align-items:center;min-height:44px}\n@media(prefers-reduced-motion:reduce){.mf-card *,.mf-card *::before,.mf-card *::after{animation:none!important;transition:none!important}}",
    "permissions": [],
    "dependencies": {},
    "study": {
      "category": "Cards",
      "references": [
        1,
        4,
        5,
        12
      ],
      "behavior": "Responsive semantic article with an original CSS illustration.",
      "limitations": "Illustration is procedural; replace the example link.",
      "editable": "Text, --mf-accent, --mf-radius, --mf-space and --mf-duration.",
      "implementation": "Independent implementation; no third-party source copied.",
      "license": "MIT",
      "selector": ".mf-card"
    }
  },
  {
    "id": "foundation/grid",
    "version": "1.0.0",
    "name": "Responsive content grid",
    "description": "Auto-fit layout that responds to its container without JavaScript.",
    "html": "<section class=\"mf-grid\" aria-label=\"Project stages\"><article><small>01 / OBSERVE</small><h3>Study the behavior</h3><p>Record default and interactive states.</p></article><article><small>02 / REBUILD</small><h3>Write the component</h3><p>Use scoped styles and native controls.</p></article><article><small>03 / VERIFY</small><h3>Test the export</h3><p>Open the result outside the editor.</p></article></section>",
    "css": "/*\nMIT License\n\nCopyright (c) 2026 website-assets contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n*/\n.mf-grid {--mf-accent:#286c70;--mf-ink:#163d42;--mf-surface:#ffffff;--mf-radius:14px;--mf-space:20px;--mf-duration:260ms;color:var(--mf-ink);background:var(--mf-surface);font:15px/1.55 system-ui,sans-serif;max-width:100%;border-radius:var(--mf-radius);padding:var(--mf-space);border:1px solid #c4d4d5;overflow-wrap:anywhere} .mf-grid,.mf-grid *,.mf-grid *::before,.mf-grid *::after{box-sizing:border-box} .mf-grid :where(h2,h3,p){margin:0 0 12px} .mf-grid :where(input,select,textarea,button){font:inherit;color:inherit} .mf-grid :where(input,select,textarea){max-width:100%;accent-color:var(--mf-accent)} .mf-grid :where(button,a,summary,input,select,textarea):focus-visible{outline:3px solid var(--mf-accent);outline-offset:4px} .mf-grid a{color:var(--mf-accent);text-underline-offset:4px} .mf-grid small{font-size:12px;color:#456569} .mf-grid label{cursor:pointer}\n.mf-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:16px;padding:0;border:0;background:transparent} .mf-grid article{padding:20px;border:1px solid #c4d4d5;border-radius:var(--mf-radius);background:var(--mf-surface)} .mf-grid h3{font-size:18px;margin-top:16px}\n@media(prefers-reduced-motion:reduce){.mf-grid *,.mf-grid *::before,.mf-grid *::after{animation:none!important;transition:none!important}}",
    "permissions": [],
    "dependencies": {},
    "study": {
      "category": "Layout",
      "references": [
        6,
        8,
        10
      ],
      "behavior": "Auto-fit layout that responds to its container without JavaScript.",
      "limitations": "No drag-and-drop logic inside the exported component.",
      "editable": "Text, --mf-accent, --mf-radius, --mf-space and --mf-duration.",
      "implementation": "Independent implementation; no third-party source copied.",
      "license": "MIT",
      "selector": ".mf-grid"
    }
  },
  {
    "id": "foundation/button-fill",
    "version": "1.0.0",
    "name": "Fill sweep",
    "description": "Basic: original Button Atlas pattern adapted to static HTML/CSS, with focus and press feedback.",
    "html": "<div class=\"mf-button-fill\"><button type=\"button\"><span class=\"mf-decor\" aria-hidden=\"true\"></span><span class=\"mf-label\">Continue</span></button></div>",
    "css": "/*\nMIT License\n\nCopyright (c) 2026 website-assets contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n*/\n.mf-button-fill {--mf-accent:#286c70;--mf-ink:#163d42;--mf-surface:#ffffff;--mf-radius:14px;--mf-space:20px;--mf-duration:260ms;color:var(--mf-ink);background:var(--mf-surface);font:15px/1.55 system-ui,sans-serif;max-width:100%;border-radius:var(--mf-radius);padding:var(--mf-space);border:1px solid #c4d4d5;overflow-wrap:anywhere} .mf-button-fill,.mf-button-fill *,.mf-button-fill *::before,.mf-button-fill *::after{box-sizing:border-box} .mf-button-fill :where(h2,h3,p){margin:0 0 12px} .mf-button-fill :where(input,select,textarea,button){font:inherit;color:inherit} .mf-button-fill :where(input,select,textarea){max-width:100%;accent-color:var(--mf-accent)} .mf-button-fill :where(button,a,summary,input,select,textarea):focus-visible{outline:3px solid var(--mf-accent);outline-offset:4px} .mf-button-fill a{color:var(--mf-accent);text-underline-offset:4px} .mf-button-fill small{font-size:12px;color:#456569} .mf-button-fill label{cursor:pointer}\n.mf-button-fill {display:inline-flex;padding:8px;border:0;background:transparent} .mf-button-fill button{position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;max-width:100%;padding:14px 25px;border:1px solid var(--mf-accent);border-radius:var(--mf-radius);background:var(--mf-surface);color:var(--mf-accent);font-weight:650;cursor:pointer;touch-action:manipulation;transition:transform var(--mf-duration),color var(--mf-duration),border-radius var(--mf-duration),box-shadow var(--mf-duration)} .mf-button-fill button:active:not(:disabled){transform:scale(.96)} .mf-button-fill button:disabled{opacity:.5;cursor:not-allowed} .mf-button-fill .mf-label{position:relative;z-index:2} .mf-button-fill .mf-decor{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:0} .mf-button-fill .mf-decor::before{content:\"\";position:absolute;inset:0;background:var(--mf-accent);transform:translateY(101%);transition:transform var(--mf-duration)} .mf-button-fill button:is(:hover,:focus-visible):not(:disabled) .mf-decor::before{transform:translateY(0)} .mf-button-fill button:is(:hover,:focus-visible):not(:disabled){color:#fff}\n@media(prefers-reduced-motion:reduce){.mf-button-fill *,.mf-button-fill *::before,.mf-button-fill *::after{animation:none!important;transition:none!important}}",
    "permissions": [],
    "dependencies": {},
    "study": {
      "category": "Buttons",
      "references": [
        14,
        15
      ],
      "behavior": "Basic: original Button Atlas pattern adapted to static HTML/CSS, with focus and press feedback.",
      "limitations": "Visual button only; bind application actions separately. For roll edit both copies; for stagger update visible letters and aria-label together.",
      "editable": "Text, --mf-accent, --mf-radius, --mf-space and --mf-duration.",
      "implementation": "Independent implementation; no third-party source copied.",
      "license": "MIT",
      "selector": ".mf-button-fill"
    }
  }
];
