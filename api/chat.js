// ===== SOLARA AI - Backend v9 with Offline Fallback =====
// Features:
// - DeepSeek V3 (primary)
// - Gemini 2.0 Flash (secondary fallback)
// - Local hardcoded knowledge base with fuzzy matching (third fallback)
// - Pure ASCII, no mojibake

import crypto from 'crypto';

// ===== TOKEN VERIFICATION =====
function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const payload = Buffer.from(parts[0], 'base64url').toString('utf8');
    const expiresAt = parseInt(payload, 10);
    if (!expiresAt || Date.now() > expiresAt) return false;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const providedSig = parts[1];

    if (expectedSig.length !== providedSig.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(providedSig, 'hex')
    );
  } catch (e) {
    return false;
  }
}

// ===== HARDCODED KNOWLEDGE BASE =====
// Used as fallback when both DeepSeek and Gemini are unavailable.
// Each entry has keywords (for fuzzy matching) and a full answer.

const KNOWLEDGE_BASE = [
  {
    id: "html-doctype",
    keywords: ["doctype","html5","declaration","starting html"],
    title: "HTML5 Document Structure",
    answer: "The basic HTML5 document structure looks like this:\n\n\\`\\`\\`html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>\n\\`\\`\\`\n\nBreakdown:\n- **DOCTYPE html** tells the browser this is HTML5\n- **html lang=\"en\"** wraps everything, declares the language\n- **head** contains metadata (not visible on the page)\n- **meta charset** sets text encoding to UTF-8\n- **meta viewport** makes the page responsive on mobile\n- **title** is what shows on the browser tab\n- **body** contains everything visible on the page"
  },
  {
    id: "html-headings",
    keywords: ["heading","h1","h2","title","header text"],
    title: "HTML Headings",
    answer: "HTML has 6 heading levels, from most important (h1) to least (h6):\n\n\\`\\`\\`html\n<h1>Main Title</h1>\n<h2>Section Title</h2>\n<h3>Subsection</h3>\n<h4>Smaller heading</h4>\n<h5>Even smaller</h5>\n<h6>Smallest heading</h6>\n\\`\\`\\`\n\nBest practices:\n- Use only ONE h1 per page (usually the main page title)\n- Do not skip levels (h1 to h3 without h2 is bad for accessibility)\n- Headings help screen readers and search engines understand your content"
  },
  {
    id: "html-paragraph",
    keywords: ["paragraph","text","p tag"],
    title: "HTML Paragraphs and Text",
    answer: "The paragraph tag creates blocks of text:\n\n\\`\\`\\`html\n<p>This is a paragraph of text.</p>\n<p>Each paragraph is separated by space automatically.</p>\n\\`\\`\\`\n\nFor inline formatting inside paragraphs:\n\\`\\`\\`html\n<p>\n  This is <strong>bold</strong> and this is <em>italic</em>.\n  You can also use <br> to force a line break.\n</p>\n\\`\\`\\`\n\nCommon inline tags:\n- **strong** for important text (bold)\n- **em** for emphasized text (italic)\n- **span** for generic inline containers\n- **br** for line breaks"
  },
  {
    id: "html-links",
    keywords: ["link","anchor","href","hyperlink","a tag"],
    title: "HTML Links (Anchor Tags)",
    answer: "Links use the anchor tag with an href attribute:\n\n\\`\\`\\`html\n<!-- Link to another page -->\n<a href=\"about.html\">About Us</a>\n\n<!-- Link to an external site -->\n<a href=\"https://google.com\">Google</a>\n\n<!-- Link that opens in a new tab -->\n<a href=\"https://google.com\" target=\"_blank\" rel=\"noopener\">Google (new tab)</a>\n\n<!-- Link to a section on the same page -->\n<a href=\"#section1\">Jump to Section 1</a>\n\\`\\`\\`\n\nAlways add **rel=\"noopener\"** when using **target=\"_blank\"** for security."
  },
  {
    id: "html-images",
    keywords: ["image","img","picture","photo"],
    title: "HTML Images",
    answer: "Add images with the img tag:\n\n\\`\\`\\`html\n<img src=\"photo.jpg\" alt=\"Description of the photo\" width=\"400\">\n\\`\\`\\`\n\nImportant attributes:\n- **src** is the image URL or file path (required)\n- **alt** is text shown if image fails to load (required for accessibility)\n- **width** and **height** set dimensions (optional, but helps prevent layout shift)\n\nResponsive images that resize with the container:\n\\`\\`\\`html\n<img src=\"photo.jpg\" alt=\"A sunset\" style=\"max-width: 100%; height: auto;\">\n\\`\\`\\`"
  },
  {
    id: "html-lists",
    keywords: ["list","ul","ol","li","bullet","numbered"],
    title: "HTML Lists",
    answer: "HTML has two main list types:\n\n**Unordered list (bullets):**\n\\`\\`\\`html\n<ul>\n  <li>Apples</li>\n  <li>Bananas</li>\n  <li>Cherries</li>\n</ul>\n\\`\\`\\`\n\n**Ordered list (numbers):**\n\\`\\`\\`html\n<ol>\n  <li>First step</li>\n  <li>Second step</li>\n  <li>Third step</li>\n</ol>\n\\`\\`\\`\n\nYou can nest lists inside each other for hierarchy."
  },
  {
    id: "html-forms",
    keywords: ["form","input","submit","textbox","form field"],
    title: "HTML Forms",
    answer: "A basic form with common inputs:\n\n\\`\\`\\`html\n<form action=\"/submit\" method=\"POST\">\n  <label for=\"name\">Name:</label>\n  <input type=\"text\" id=\"name\" name=\"name\" required>\n\n  <label for=\"email\">Email:</label>\n  <input type=\"email\" id=\"email\" name=\"email\" required>\n\n  <label for=\"message\">Message:</label>\n  <textarea id=\"message\" name=\"message\" rows=\"4\"></textarea>\n\n  <button type=\"submit\">Send</button>\n</form>\n\\`\\`\\`\n\nCommon input types:\n- **text** - single line text\n- **email** - email address (with validation)\n- **password** - hidden text\n- **number** - numeric input\n- **checkbox** - true/false toggle\n- **radio** - one-of-many choice\n- **file** - file upload\n- **date** - date picker"
  },
  {
    id: "html-buttons",
    keywords: ["button","click","pindutan"],
    title: "HTML Buttons",
    answer: "Buttons are created with the button tag:\n\n\\`\\`\\`html\n<button type=\"button\">Click me</button>\n\\`\\`\\`\n\nButton types:\n- **type=\"button\"** - generic button (default for JS interactions)\n- **type=\"submit\"** - submits a form\n- **type=\"reset\"** - resets a form\n\nBasic button with a click handler:\n\\`\\`\\`html\n<button type=\"button\" onclick=\"alert('Hello!')\">Say Hello</button>\n\\`\\`\\`\n\nFor better separation of concerns, use addEventListener in JavaScript instead of onclick."
  },
  {
    id: "html-semantic",
    keywords: ["semantic","header","nav","main","section","article","footer"],
    title: "Semantic HTML Elements",
    answer: "Semantic elements describe the meaning of content, not just its appearance:\n\n\\`\\`\\`html\n<body>\n  <header>\n    <h1>My Website</h1>\n    <nav>\n      <a href=\"/\">Home</a>\n      <a href=\"/about\">About</a>\n    </nav>\n  </header>\n\n  <main>\n    <article>\n      <h2>Blog Post Title</h2>\n      <p>Article content here...</p>\n    </article>\n\n    <aside>\n      <h3>Related Links</h3>\n    </aside>\n  </main>\n\n  <footer>\n    <p>&copy; 2025 My Website</p>\n  </footer>\n</body>\n\\`\\`\\`\n\nBenefits: better SEO, better accessibility for screen readers, clearer code."
  },
  {
    id: "html-tables",
    keywords: ["table","tr","td","th","row","column"],
    title: "HTML Tables",
    answer: "Tables use table, tr (row), th (header cell), and td (data cell):\n\n\\`\\`\\`html\n<table>\n  <thead>\n    <tr>\n      <th>Name</th>\n      <th>Age</th>\n      <th>City</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Alice</td>\n      <td>25</td>\n      <td>Manila</td>\n    </tr>\n    <tr>\n      <td>Bob</td>\n      <td>30</td>\n      <td>Cebu</td>\n    </tr>\n  </tbody>\n</table>\n\\`\\`\\`\n\nUse tables only for tabular data, NOT for layout. Use CSS Grid or Flexbox for layout."
  },
  {
    id: "html-meta",
    keywords: ["meta","seo","description","keywords","og","social"],
    title: "HTML Meta Tags",
    answer: "Meta tags go inside the head and provide info about the page:\n\n\\`\\`\\`html\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <meta name=\"description\" content=\"A short description of the page for search engines\">\n  <meta name=\"keywords\" content=\"web design, tutorial, html\">\n  <meta name=\"author\" content=\"Your Name\">\n\n  <!-- Social media preview -->\n  <meta property=\"og:title\" content=\"My Page Title\">\n  <meta property=\"og:description\" content=\"Description shown when shared on social media\">\n  <meta property=\"og:image\" content=\"https://example.com/preview.jpg\">\n</head>\n\\`\\`\\`"
  },
  {
    id: "css-selectors",
    keywords: ["selector","class","id","target","select element"],
    title: "CSS Selectors",
    answer: "CSS selectors target HTML elements to style them:\n\n\\`\\`\\`css\n/* Element selector - all paragraphs */\np {\n  color: blue;\n}\n\n/* Class selector - elements with class=\"button\" */\n.button {\n  background: black;\n}\n\n/* ID selector - the element with id=\"header\" */\n#header {\n  height: 60px;\n}\n\n/* Descendant selector - li inside ul */\nul li {\n  list-style: none;\n}\n\n/* Multiple selectors */\nh1, h2, h3 {\n  font-family: Arial;\n}\n\n/* Pseudo-classes */\na:hover {\n  color: red;\n}\n\nbutton:disabled {\n  opacity: 0.5;\n}\n\\`\\`\\`"
  },
  {
    id: "css-box-model",
    keywords: ["box model","margin","padding","border","width","height"],
    title: "CSS Box Model",
    answer: "Every element is a box with content, padding, border, and margin:\n\n\\`\\`\\`css\n.box {\n  width: 300px;\n  height: 200px;\n  padding: 20px;    /* space INSIDE the border */\n  border: 2px solid black;\n  margin: 15px;     /* space OUTSIDE the border */\n}\n\\`\\`\\`\n\n**box-sizing** controls how width/height are calculated:\n\\`\\`\\`css\n/* Default: width = content only */\n.default-box {\n  box-sizing: content-box;\n  width: 300px; /* total = 300 + padding + border */\n}\n\n/* Better: width includes padding and border */\n.modern-box {\n  box-sizing: border-box;\n  width: 300px; /* total = exactly 300 */\n}\n\n/* Apply border-box to everything (recommended) */\n* {\n  box-sizing: border-box;\n}\n\\`\\`\\`"
  },
  {
    id: "css-flexbox-center",
    keywords: ["center","flexbox","flex","centering","align center"],
    title: "Center Anything with Flexbox",
    answer: "The easiest way to center content in modern CSS:\n\n\\`\\`\\`css\n.container {\n  display: flex;\n  justify-content: center;  /* horizontal center */\n  align-items: center;      /* vertical center */\n  min-height: 100vh;        /* full screen height */\n}\n\\`\\`\\`\n\nExample HTML:\n\\`\\`\\`html\n<div class=\"container\">\n  <div class=\"box\">I am centered!</div>\n</div>\n\\`\\`\\`\n\nKey flex properties:\n- **display: flex** - turns the container into a flex container\n- **justify-content** - aligns items on the main axis (default: horizontal)\n- **align-items** - aligns items on the cross axis (default: vertical)"
  },
  {
    id: "css-flexbox-full",
    keywords: ["flexbox","flex","flex-direction","flex-wrap","gap","layout"],
    title: "CSS Flexbox Complete Guide",
    answer: "Flexbox is a 1-dimensional layout system for rows or columns:\n\n\\`\\`\\`css\n.container {\n  display: flex;\n  flex-direction: row;         /* row | row-reverse | column | column-reverse */\n  justify-content: space-between; /* start | end | center | space-between | space-around | space-evenly */\n  align-items: center;         /* start | end | center | stretch | baseline */\n  flex-wrap: wrap;             /* nowrap | wrap | wrap-reverse */\n  gap: 20px;                   /* space between items */\n}\n\n.item {\n  flex: 1;              /* grow to fill available space */\n  flex-basis: 200px;    /* starting size */\n  flex-shrink: 0;       /* prevent shrinking */\n}\n\\`\\`\\`\n\nCommon patterns:\n- Navigation bar: **display: flex; justify-content: space-between;**\n- Equal-width columns: use **flex: 1** on each item\n- Card grid that wraps: **flex-wrap: wrap; gap: 20px;**"
  },
  {
    id: "css-grid",
    keywords: ["grid","css grid","grid-template","columns","rows"],
    title: "CSS Grid Basics",
    answer: "CSS Grid is a 2-dimensional layout system for rows AND columns:\n\n\\`\\`\\`css\n.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;  /* 3 equal columns */\n  grid-template-rows: auto;\n  gap: 20px;\n}\n\\`\\`\\`\n\nCommon patterns:\n\n**Responsive card grid (auto-fit):**\n\\`\\`\\`css\n.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 20px;\n}\n\\`\\`\\`\n\n**Full page layout:**\n\\`\\`\\`css\n.page {\n  display: grid;\n  grid-template-columns: 250px 1fr;\n  grid-template-rows: 60px 1fr 40px;\n  min-height: 100vh;\n}\n\\`\\`\\`\n\nGrid vs Flexbox: use Grid for 2D layouts (rows + columns), Flexbox for 1D (single row or column)."
  },
  {
    id: "css-position",
    keywords: ["position","absolute","relative","fixed","sticky","z-index"],
    title: "CSS Positioning",
    answer: "Position controls how an element is placed on the page:\n\n\\`\\`\\`css\n/* Default - normal document flow */\n.static {\n  position: static;\n}\n\n/* Relative to its normal position */\n.relative {\n  position: relative;\n  top: 10px;      /* moves down 10px from normal spot */\n  left: 20px;\n}\n\n/* Absolute - relative to nearest positioned ancestor */\n.absolute {\n  position: absolute;\n  top: 0;\n  right: 0;       /* stuck to top-right corner */\n}\n\n/* Fixed - relative to viewport (does not scroll) */\n.fixed {\n  position: fixed;\n  bottom: 20px;\n  right: 20px;    /* floating action button */\n}\n\n/* Sticky - normal until scrolled to threshold */\n.sticky {\n  position: sticky;\n  top: 0;         /* sticks to top when scrolled past */\n}\n\n/* z-index controls stacking order (higher = on top) */\n.overlay {\n  position: fixed;\n  z-index: 100;\n}\n\\`\\`\\`"
  },
  {
    id: "css-colors",
    keywords: ["color","background","rgb","hex","hsl","gradient"],
    title: "CSS Colors and Backgrounds",
    answer: "Colors can be written in several formats:\n\n\\`\\`\\`css\n.example {\n  /* Named colors */\n  color: red;\n\n  /* Hex codes */\n  color: #ff0000;\n  color: #f00;       /* shorthand */\n\n  /* RGB */\n  color: rgb(255, 0, 0);\n  color: rgba(255, 0, 0, 0.5);  /* with transparency */\n\n  /* HSL (hue, saturation, lightness) */\n  color: hsl(0, 100%, 50%);\n  color: hsla(0, 100%, 50%, 0.5);\n}\n\\`\\`\\`\n\nBackgrounds:\n\\`\\`\\`css\n.hero {\n  background-color: #333;\n  background-image: url('bg.jpg');\n  background-size: cover;\n  background-position: center;\n  background-repeat: no-repeat;\n\n  /* Gradients */\n  background: linear-gradient(to right, red, blue);\n  background: radial-gradient(circle, yellow, red);\n}\n\\`\\`\\`"
  },
  {
    id: "css-typography",
    keywords: ["font","text","typography","font-family","font-size","font-weight"],
    title: "CSS Typography",
    answer: "Style text with these common properties:\n\n\\`\\`\\`css\nbody {\n  font-family: 'Inter', Arial, sans-serif;  /* fallback fonts */\n  font-size: 16px;\n  font-weight: 400;         /* 100-900, or 'normal', 'bold' */\n  line-height: 1.5;         /* spacing between lines */\n  color: #333;\n  letter-spacing: 0.02em;   /* space between letters */\n  text-align: left;         /* left | center | right | justify */\n}\n\n.heading {\n  font-size: 2rem;          /* 2x the root font size */\n  text-transform: uppercase;\n  text-decoration: underline;\n}\n\n.emphasized {\n  font-style: italic;\n  text-decoration: none;    /* remove underline from links */\n}\n\\`\\`\\`\n\nLoading Google Fonts:\n\\`\\`\\`html\n<link href=\"https://fonts.googleapis.com/css2?family=Inter&display=swap\" rel=\"stylesheet\">\n\\`\\`\\`"
  },
  {
    id: "css-transitions",
    keywords: ["transition","animation","hover","smooth","ease"],
    title: "CSS Transitions and Animations",
    answer: "**Transitions** smoothly animate property changes:\n\n\\`\\`\\`css\n.button {\n  background: blue;\n  transition: background 0.3s ease;  /* animate background over 0.3s */\n}\n\n.button:hover {\n  background: red;\n}\n\n/* Animate multiple properties */\n.card {\n  transition: transform 0.3s ease, box-shadow 0.3s ease;\n}\n\n.card:hover {\n  transform: scale(1.05) translateY(-5px);\n  box-shadow: 0 10px 30px rgba(0,0,0,0.2);\n}\n\\`\\`\\`\n\n**Animations** with @keyframes:\n\\`\\`\\`css\n@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(20px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.fade-in {\n  animation: fadeIn 0.5s ease forwards;\n}\n\\`\\`\\`"
  },
  {
    id: "css-responsive",
    keywords: ["responsive","media query","mobile","breakpoint","tablet"],
    title: "CSS Responsive Design",
    answer: "Media queries apply CSS based on screen size:\n\n\\`\\`\\`css\n/* Mobile-first approach - default styles for mobile */\n.container {\n  padding: 20px;\n  font-size: 14px;\n}\n\n/* Tablets and up */\n@media (min-width: 768px) {\n  .container {\n    padding: 40px;\n    font-size: 16px;\n  }\n}\n\n/* Desktops and up */\n@media (min-width: 1024px) {\n  .container {\n    padding: 60px;\n    max-width: 1200px;\n    margin: 0 auto;\n  }\n}\n\\`\\`\\`\n\nStandard breakpoints:\n- Mobile: up to 767px\n- Tablet: 768px to 1023px\n- Desktop: 1024px and up\n\nAlso add the viewport meta tag in your HTML:\n\\`\\`\\`html\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\\`\\`\\`"
  },
  {
    id: "css-shadow",
    keywords: ["shadow","box-shadow","text-shadow","drop shadow"],
    title: "CSS Shadows",
    answer: "Add depth with shadows:\n\n\\`\\`\\`css\n/* Box shadow - offset-x offset-y blur spread color */\n.card {\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n}\n\n/* Layered shadows for realistic depth */\n.floating {\n  box-shadow:\n    0 1px 3px rgba(0,0,0,0.12),\n    0 1px 2px rgba(0,0,0,0.24);\n}\n\n/* Inset shadow (inside the element) */\n.pressed {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);\n}\n\n/* Text shadow */\n.hero-text {\n  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);\n}\n\\`\\`\\`"
  },
  {
    id: "css-variables",
    keywords: ["variable","custom property","var","--"],
    title: "CSS Custom Properties (Variables)",
    answer: "Store reusable values in CSS variables:\n\n\\`\\`\\`css\n/* Define at :root for global scope */\n:root {\n  --primary-color: #3498db;\n  --text-color: #333;\n  --spacing: 16px;\n  --border-radius: 8px;\n}\n\n/* Use them anywhere */\n.button {\n  background: var(--primary-color);\n  padding: var(--spacing);\n  border-radius: var(--border-radius);\n}\n\n.card {\n  color: var(--text-color);\n  margin: var(--spacing);\n}\n\\`\\`\\`\n\nGreat for theming - change one variable to update your whole design."
  },
  {
    id: "js-variables",
    keywords: ["variable","var","let","const","declare"],
    title: "JavaScript Variables (var, let, const)",
    answer: "Three ways to declare variables in JavaScript:\n\n\\`\\`\\`js\n// const - value cannot be reassigned (USE THIS BY DEFAULT)\nconst name = 'Alice';\nconst PI = 3.14;\n\n// let - value can change\nlet count = 0;\ncount = count + 1;\n\n// var - old-style, avoid in modern JS\nvar oldStyle = 'do not use';\n\\`\\`\\`\n\n**Rules:**\n- Use **const** by default\n- Use **let** only when you need to reassign\n- Avoid **var** - it has confusing scoping rules\n\n**Note:** const prevents reassignment, but you can still modify contents of objects and arrays:\n\\`\\`\\`js\nconst list = [1, 2, 3];\nlist.push(4);    // OK - modifying, not reassigning\n// list = [];    // ERROR - reassigning const\n\\`\\`\\`"
  },
  {
    id: "js-data-types",
    keywords: ["data type","string","number","boolean","null","undefined","typeof"],
    title: "JavaScript Data Types",
    answer: "JavaScript has these primitive types:\n\n\\`\\`\\`js\n// String - text\nconst name = 'Alice';\nconst greeting = \"Hello\";\nconst template = \\`Hello, \\${name}!\\`;  // template literal\n\n// Number - any number (no separate int/float)\nconst age = 25;\nconst price = 9.99;\n\n// Boolean - true or false\nconst isActive = true;\n\n// Null - intentional absence of value\nconst empty = null;\n\n// Undefined - variable declared but not assigned\nlet notYet;\n\n// Check the type\nconsole.log(typeof name);    // 'string'\nconsole.log(typeof age);     // 'number'\nconsole.log(typeof isActive); // 'boolean'\n\\`\\`\\`\n\nComplex types: **Object**, **Array**, **Function** (all technically objects)."
  },
  {
    id: "js-strings",
    keywords: ["string","text","concatenation","template literal"],
    title: "JavaScript Strings",
    answer: "Working with strings:\n\n\\`\\`\\`js\nconst first = 'Alice';\nconst last = 'Smith';\n\n// Concatenation with +\nconst full1 = first + ' ' + last;\n\n// Template literals (recommended)\nconst full2 = \\`\\${first} \\${last}\\`;\n\n// Common methods\nconst text = 'Hello, World!';\ntext.length;                  // 13\ntext.toUpperCase();           // 'HELLO, WORLD!'\ntext.toLowerCase();           // 'hello, world!'\ntext.includes('World');       // true\ntext.indexOf('World');        // 7\ntext.replace('World', 'JS');  // 'Hello, JS!'\ntext.slice(0, 5);             // 'Hello'\ntext.split(', ');             // ['Hello', 'World!']\ntext.trim();                  // removes whitespace\n\\`\\`\\`"
  },
  {
    id: "js-conditionals",
    keywords: ["if","else","condition","ternary","switch"],
    title: "JavaScript Conditionals",
    answer: "Make decisions in your code:\n\n\\`\\`\\`js\n// if / else if / else\nconst age = 20;\n\nif (age >= 18) {\n  console.log('Adult');\n} else if (age >= 13) {\n  console.log('Teenager');\n} else {\n  console.log('Child');\n}\n\n// Ternary operator (short if/else)\nconst message = age >= 18 ? 'Adult' : 'Minor';\n\n// Switch statement\nconst day = 'Monday';\nswitch (day) {\n  case 'Monday':\n    console.log('Start of week');\n    break;\n  case 'Friday':\n    console.log('Almost weekend');\n    break;\n  default:\n    console.log('Regular day');\n}\n\\`\\`\\`\n\nComparison operators:\n- **===** strict equal (use this)\n- **!==** strict not equal\n- **>** **<** **>=** **<=**\n- **&&** and, **||** or, **!** not"
  },
  {
    id: "js-loops",
    keywords: ["loop","for","while","iterate","foreach"],
    title: "JavaScript Loops",
    answer: "Repeat code with loops:\n\n\\`\\`\\`js\n// Classic for loop\nfor (let i = 0; i < 5; i++) {\n  console.log(i);  // 0, 1, 2, 3, 4\n}\n\n// While loop\nlet count = 0;\nwhile (count < 3) {\n  console.log(count);\n  count++;\n}\n\n// For...of - loop through array values\nconst fruits = ['apple', 'banana', 'cherry'];\nfor (const fruit of fruits) {\n  console.log(fruit);\n}\n\n// forEach - array method\nfruits.forEach((fruit, index) => {\n  console.log(index, fruit);\n});\n\n// For...in - loop through object keys\nconst person = { name: 'Alice', age: 25 };\nfor (const key in person) {\n  console.log(key, person[key]);\n}\n\\`\\`\\`"
  },
  {
    id: "js-functions",
    keywords: ["function","arrow function","return","parameter","argument"],
    title: "JavaScript Functions",
    answer: "Functions are reusable blocks of code:\n\n\\`\\`\\`js\n// Function declaration\nfunction greet(name) {\n  return 'Hello, ' + name;\n}\n\n// Function expression\nconst greet2 = function(name) {\n  return 'Hello, ' + name;\n};\n\n// Arrow function (modern, recommended for short functions)\nconst greet3 = (name) => 'Hello, ' + name;\n\n// Arrow function with multiple lines\nconst greet4 = (name) => {\n  const message = 'Hello, ' + name;\n  return message;\n};\n\n// Default parameters\nfunction greet5(name = 'friend') {\n  return 'Hello, ' + name;\n}\n\n// Multiple parameters\nconst add = (a, b) => a + b;\nadd(2, 3);  // 5\n\\`\\`\\`"
  },
  {
    id: "js-arrays",
    keywords: ["array","list","push","pop","map","filter","find"],
    title: "JavaScript Arrays",
    answer: "Arrays hold ordered lists of values:\n\n\\`\\`\\`js\nconst fruits = ['apple', 'banana', 'cherry'];\n\n// Access items (zero-indexed)\nfruits[0];              // 'apple'\nfruits.length;          // 3\n\n// Add and remove\nfruits.push('date');    // adds to end\nfruits.pop();           // removes from end\nfruits.unshift('kiwi'); // adds to start\nfruits.shift();         // removes from start\n\n// Find and check\nfruits.includes('apple');       // true\nfruits.indexOf('banana');       // 1\nfruits.find(f => f === 'apple'); // 'apple'\n\n// Transform (returns NEW array)\nconst nums = [1, 2, 3, 4];\nnums.map(n => n * 2);           // [2, 4, 6, 8]\nnums.filter(n => n > 2);        // [3, 4]\nnums.reduce((sum, n) => sum + n, 0); // 10\n\n// Loop through\nnums.forEach(n => console.log(n));\n\\`\\`\\`"
  },
  {
    id: "js-objects",
    keywords: ["object","key","property","destructuring"],
    title: "JavaScript Objects",
    answer: "Objects store data as key-value pairs:\n\n\\`\\`\\`js\n// Create an object\nconst person = {\n  name: 'Alice',\n  age: 25,\n  city: 'Manila',\n  greet: function() {\n    return 'Hi, I am ' + this.name;\n  }\n};\n\n// Access properties\nperson.name;           // 'Alice'\nperson['name'];        // 'Alice' (bracket notation)\n\n// Modify\nperson.age = 26;\nperson.email = 'alice@example.com';  // add new property\n\n// Delete\ndelete person.city;\n\n// Destructuring - extract properties into variables\nconst { name, age } = person;\nconsole.log(name);  // 'Alice'\n\n// Rename with destructuring\nconst { name: userName } = person;\n\n// Spread operator - copy or merge\nconst clone = { ...person };\nconst updated = { ...person, age: 30 };\n\\`\\`\\`"
  },
  {
    id: "js-dom-select",
    keywords: ["dom","queryselector","getelementbyid","select element"],
    title: "JavaScript DOM Selection",
    answer: "Access HTML elements from JavaScript:\n\n\\`\\`\\`js\n// Modern methods (use these)\ndocument.querySelector('#header');      // by ID (returns 1)\ndocument.querySelector('.button');      // by class\ndocument.querySelector('p');            // by tag\ndocument.querySelectorAll('.item');     // returns ALL matches (NodeList)\n\n// Older methods (still work)\ndocument.getElementById('header');\ndocument.getElementsByClassName('button');\ndocument.getElementsByTagName('p');\n\n// Loop through multiple elements\nconst items = document.querySelectorAll('.item');\nitems.forEach(item => {\n  console.log(item.textContent);\n});\n\\`\\`\\`"
  },
  {
    id: "js-dom-modify",
    keywords: ["dom","innerhtml","textcontent","classlist","setattribute","modify"],
    title: "JavaScript DOM Manipulation",
    answer: "Change elements after selecting them:\n\n\\`\\`\\`js\nconst el = document.querySelector('#myDiv');\n\n// Text content (safest for user data)\nel.textContent = 'New text';\n\n// HTML content (careful - can be XSS risk)\nel.innerHTML = '<strong>Bold text</strong>';\n\n// Attributes\nel.setAttribute('data-id', '123');\nel.getAttribute('href');\nel.removeAttribute('disabled');\n\n// Classes\nel.classList.add('active');\nel.classList.remove('hidden');\nel.classList.toggle('open');\nel.classList.contains('active');  // true/false\n\n// Styles (inline - avoid if possible, use CSS classes)\nel.style.color = 'red';\nel.style.backgroundColor = 'yellow';\n\n// Create new elements\nconst newDiv = document.createElement('div');\nnewDiv.textContent = 'Hello';\nnewDiv.className = 'greeting';\ndocument.body.appendChild(newDiv);\n\n// Remove\nel.remove();\n\\`\\`\\`"
  },
  {
    id: "js-events",
    keywords: ["event","click","addeventlistener","onclick","listener"],
    title: "JavaScript Events",
    answer: "Respond to user actions with events:\n\n\\`\\`\\`js\nconst button = document.querySelector('#myBtn');\n\n// Add event listener (recommended)\nbutton.addEventListener('click', function() {\n  console.log('Button was clicked!');\n});\n\n// With arrow function\nbutton.addEventListener('click', () => {\n  console.log('Clicked!');\n});\n\n// Access event details\nbutton.addEventListener('click', (event) => {\n  console.log(event.target);       // the clicked element\n  event.preventDefault();          // stop default behavior\n  event.stopPropagation();         // stop bubbling\n});\n\n// Common events:\n// click, dblclick, mousedown, mouseup, mouseover, mouseout\n// keydown, keyup, keypress\n// submit, change, input, focus, blur\n// load, DOMContentLoaded, resize, scroll\n\n// Form submit\ndocument.querySelector('form').addEventListener('submit', (e) => {\n  e.preventDefault();  // stop page reload\n  const input = document.querySelector('input').value;\n  console.log(input);\n});\n\n// Keyboard\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Enter') {\n    console.log('Enter pressed');\n  }\n});\n\\`\\`\\`"
  },
  {
    id: "js-fetch",
    keywords: ["fetch","api","ajax","http","request","json"],
    title: "JavaScript Fetch API",
    answer: "Make HTTP requests to APIs:\n\n\\`\\`\\`js\n// Basic GET request\nfetch('https://api.example.com/users')\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));\n\n// Modern async/await syntax (recommended)\nasync function getUsers() {\n  try {\n    const response = await fetch('https://api.example.com/users');\n    if (!response.ok) throw new Error('Request failed');\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error('Error:', error);\n  }\n}\n\n// POST request with body\nasync function createUser(userData) {\n  const response = await fetch('https://api.example.com/users', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n    },\n    body: JSON.stringify(userData),\n  });\n  return response.json();\n}\n\ncreateUser({ name: 'Alice', email: 'alice@example.com' });\n\\`\\`\\`"
  },
  {
    id: "js-localstorage",
    keywords: ["localstorage","storage","save","persist","browser storage"],
    title: "JavaScript localStorage",
    answer: "Save data in the browser that persists across page loads:\n\n\\`\\`\\`js\n// Save a value (strings only)\nlocalStorage.setItem('username', 'Alice');\nlocalStorage.setItem('theme', 'dark');\n\n// Retrieve a value\nconst username = localStorage.getItem('username');  // 'Alice'\nconst missing = localStorage.getItem('notThere');   // null\n\n// Save objects/arrays - convert to JSON first\nconst user = { name: 'Alice', age: 25 };\nlocalStorage.setItem('user', JSON.stringify(user));\n\n// Retrieve and parse back\nconst savedUser = JSON.parse(localStorage.getItem('user'));\n\n// Remove one item\nlocalStorage.removeItem('username');\n\n// Clear everything\nlocalStorage.clear();\n\\`\\`\\`\n\nLimits: ~5MB per domain. Data is stored per-domain and persists until manually cleared.\n\n**sessionStorage** works the same but is cleared when the tab closes."
  },
  {
    id: "js-async",
    keywords: ["async","await","promise","asynchronous","then"],
    title: "JavaScript Async / Await",
    answer: "Handle asynchronous operations cleanly:\n\n\\`\\`\\`js\n// Promises with .then (older style)\nfetch('/api/data')\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error(error));\n\n// Async/await (modern, cleaner)\nasync function loadData() {\n  try {\n    const response = await fetch('/api/data');\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error(error);\n  }\n}\n\nloadData();\n\n// Multiple async operations in parallel\nasync function loadMultiple() {\n  const [users, posts] = await Promise.all([\n    fetch('/api/users').then(r => r.json()),\n    fetch('/api/posts').then(r => r.json()),\n  ]);\n  console.log(users, posts);\n}\n\\`\\`\\`\n\nRules:\n- **await** only works inside **async** functions\n- **async** functions always return a Promise\n- Use **try/catch** to handle errors"
  },
  {
    id: "js-todo-example",
    keywords: ["todo","todo list","crud","example app","complete example"],
    title: "Complete Todo App Example",
    answer: "A full working todo list with add, delete, and save:\n\n\\`\\`\\`html\n<!DOCTYPE html>\n<html>\n<head><title>Todo App</title></head>\n<body>\n  <h1>My Todos</h1>\n  <input id=\"input\" placeholder=\"New todo\">\n  <button id=\"addBtn\">Add</button>\n  <ul id=\"list\"></ul>\n\n  <script>\n    const input = document.getElementById('input');\n    const addBtn = document.getElementById('addBtn');\n    const list = document.getElementById('list');\n\n    // Load saved todos\n    let todos = JSON.parse(localStorage.getItem('todos') || '[]');\n\n    function render() {\n      list.innerHTML = '';\n      todos.forEach((todo, index) => {\n        const li = document.createElement('li');\n        li.textContent = todo + ' ';\n        const btn = document.createElement('button');\n        btn.textContent = 'X';\n        btn.onclick = () => removeTodo(index);\n        li.appendChild(btn);\n        list.appendChild(li);\n      });\n    }\n\n    function addTodo() {\n      const text = input.value.trim();\n      if (!text) return;\n      todos.push(text);\n      save();\n      input.value = '';\n      render();\n    }\n\n    function removeTodo(index) {\n      todos.splice(index, 1);\n      save();\n      render();\n    }\n\n    function save() {\n      localStorage.setItem('todos', JSON.stringify(todos));\n    }\n\n    addBtn.onclick = addTodo;\n    input.addEventListener('keydown', e => {\n      if (e.key === 'Enter') addTodo();\n    });\n\n    render();\n  </script>\n</body>\n</html>\n\\`\\`\\`"
  },
  {
    id: "js-form-validation",
    keywords: ["validation","form validation","validate input"],
    title: "JavaScript Form Validation",
    answer: "Validate a form before submitting:\n\n\\`\\`\\`html\n<form id=\"myForm\">\n  <input type=\"text\" id=\"name\" placeholder=\"Name\">\n  <input type=\"email\" id=\"email\" placeholder=\"Email\">\n  <button type=\"submit\">Submit</button>\n  <div id=\"error\"></div>\n</form>\n\n<script>\n  const form = document.getElementById('myForm');\n  const errorDiv = document.getElementById('error');\n\n  form.addEventListener('submit', (e) => {\n    e.preventDefault();  // stop page reload\n\n    const name = document.getElementById('name').value.trim();\n    const email = document.getElementById('email').value.trim();\n\n    // Clear previous errors\n    errorDiv.textContent = '';\n\n    // Validate\n    if (name.length < 2) {\n      errorDiv.textContent = 'Name must be at least 2 characters';\n      return;\n    }\n\n    if (!email.includes('@') || !email.includes('.')) {\n      errorDiv.textContent = 'Please enter a valid email';\n      return;\n    }\n\n    // All good - submit or process\n    console.log('Valid!', { name, email });\n    form.reset();\n  });\n</script>\n\\`\\`\\`"
  },
  {
    id: "js-debounce",
    keywords: ["debounce","throttle","delay","performance"],
    title: "JavaScript Debounce",
    answer: "Debounce delays running a function until user stops typing (great for search):\n\n\\`\\`\\`js\nfunction debounce(func, delay) {\n  let timeout;\n  return function(...args) {\n    clearTimeout(timeout);\n    timeout = setTimeout(() => func(...args), delay);\n  };\n}\n\n// Usage - only runs 300ms after user stops typing\nconst searchInput = document.getElementById('search');\nconst doSearch = debounce((event) => {\n  console.log('Searching for:', event.target.value);\n  // fetch results here\n}, 300);\n\nsearchInput.addEventListener('input', doSearch);\n\\`\\`\\`\n\nWithout debounce, \"hello\" would fire the search 5 times. With debounce, it fires once, 300ms after typing stops."
  },
  {
    id: "js-date",
    keywords: ["date","time","format date","current time"],
    title: "JavaScript Dates",
    answer: "Working with dates:\n\n\\`\\`\\`js\n// Current date/time\nconst now = new Date();\n\n// Specific date\nconst birthday = new Date('2000-01-15');\nconst specific = new Date(2025, 0, 15);  // month is 0-indexed!\n\n// Get parts\nnow.getFullYear();      // 2025\nnow.getMonth();         // 0-11 (Jan = 0)\nnow.getDate();          // 1-31 (day of month)\nnow.getDay();           // 0-6 (Sunday = 0)\nnow.getHours();\nnow.getMinutes();\n\n// Format nicely\nnow.toLocaleDateString();      // '1/15/2025'\nnow.toLocaleTimeString();      // '3:45:23 PM'\nnow.toLocaleString();          // both\nnow.toISOString();             // '2025-01-15T15:45:23.000Z'\n\n// Format with options\nnow.toLocaleDateString('en-US', {\n  year: 'numeric',\n  month: 'long',\n  day: 'numeric',\n});  // 'January 15, 2025'\n\n// Timestamps (milliseconds since 1970)\nDate.now();              // current timestamp\nnew Date().getTime();    // same thing\n\\`\\`\\`"
  },
  {
    id: "js-error-handling",
    keywords: ["error","try catch","exception","throw"],
    title: "JavaScript Error Handling",
    answer: "Handle errors gracefully with try/catch:\n\n\\`\\`\\`js\ntry {\n  // Code that might fail\n  const data = JSON.parse(userInput);\n  console.log(data);\n} catch (error) {\n  // Runs if anything above throws\n  console.error('Failed to parse:', error.message);\n} finally {\n  // Always runs (cleanup)\n  console.log('Done');\n}\n\n// Throwing custom errors\nfunction divide(a, b) {\n  if (b === 0) {\n    throw new Error('Cannot divide by zero');\n  }\n  return a / b;\n}\n\ntry {\n  divide(10, 0);\n} catch (err) {\n  console.error(err.message);\n}\n\n// With async/await\nasync function loadData() {\n  try {\n    const response = await fetch('/api/data');\n    if (!response.ok) {\n      throw new Error('HTTP ' + response.status);\n    }\n    return await response.json();\n  } catch (error) {\n    console.error('Load failed:', error);\n    return null;\n  }\n}\n\\`\\`\\`"
  },
  {
    id: "js-modules",
    keywords: ["module","import","export","es6 module"],
    title: "JavaScript Modules",
    answer: "Split code into files with import/export:\n\n**math.js:**\n\\`\\`\\`js\n// Named exports\nexport function add(a, b) {\n  return a + b;\n}\n\nexport function multiply(a, b) {\n  return a * b;\n}\n\n// Default export (one per file)\nexport default function subtract(a, b) {\n  return a - b;\n}\n\\`\\`\\`\n\n**app.js:**\n\\`\\`\\`js\n// Import named exports\nimport { add, multiply } from './math.js';\n\n// Import default\nimport subtract from './math.js';\n\n// Import both\nimport subtract, { add, multiply } from './math.js';\n\n// Import everything\nimport * as math from './math.js';\nmath.add(1, 2);\n\nconsole.log(add(2, 3));         // 5\nconsole.log(subtract(10, 4));   // 6\n\\`\\`\\`\n\n**In HTML:**\n\\`\\`\\`html\n<script type=\"module\" src=\"app.js\"></script>\n\\`\\`\\`"
  },
  {
    id: "pattern-modal",
    keywords: ["modal","popup","dialog","overlay"],
    title: "Modal / Popup Component",
    answer: "A reusable modal with backdrop:\n\n\\`\\`\\`html\n<button id=\"openBtn\">Open Modal</button>\n\n<div class=\"modal\" id=\"myModal\">\n  <div class=\"modal-content\">\n    <button class=\"close\">X</button>\n    <h2>Modal Title</h2>\n    <p>Modal content here.</p>\n  </div>\n</div>\n\n<style>\n  .modal {\n    display: none;\n    position: fixed;\n    inset: 0;\n    background: rgba(0,0,0,0.5);\n    align-items: center;\n    justify-content: center;\n    z-index: 100;\n  }\n  .modal.active { display: flex; }\n  .modal-content {\n    background: white;\n    padding: 24px;\n    border-radius: 8px;\n    max-width: 500px;\n    position: relative;\n  }\n  .close {\n    position: absolute;\n    top: 8px;\n    right: 8px;\n  }\n</style>\n\n<script>\n  const modal = document.getElementById('myModal');\n  document.getElementById('openBtn').onclick = () => modal.classList.add('active');\n  modal.querySelector('.close').onclick = () => modal.classList.remove('active');\n\n  // Close when clicking backdrop\n  modal.onclick = (e) => {\n    if (e.target === modal) modal.classList.remove('active');\n  };\n\n  // Close with Escape key\n  document.addEventListener('keydown', (e) => {\n    if (e.key === 'Escape') modal.classList.remove('active');\n  });\n</script>\n\\`\\`\\`"
  },
  {
    id: "pattern-tabs",
    keywords: ["tabs","tab component","tabbed interface"],
    title: "Tabbed Interface",
    answer: "Simple tabs with active state:\n\n\\`\\`\\`html\n<div class=\"tabs\">\n  <button class=\"tab active\" data-tab=\"1\">Tab 1</button>\n  <button class=\"tab\" data-tab=\"2\">Tab 2</button>\n  <button class=\"tab\" data-tab=\"3\">Tab 3</button>\n</div>\n\n<div class=\"tab-content active\" data-content=\"1\">Content 1</div>\n<div class=\"tab-content\" data-content=\"2\">Content 2</div>\n<div class=\"tab-content\" data-content=\"3\">Content 3</div>\n\n<style>\n  .tabs { display: flex; border-bottom: 2px solid #eee; }\n  .tab {\n    padding: 10px 20px;\n    background: none;\n    border: none;\n    border-bottom: 2px solid transparent;\n    margin-bottom: -2px;\n    cursor: pointer;\n  }\n  .tab.active { border-bottom-color: blue; color: blue; }\n  .tab-content { display: none; padding: 20px; }\n  .tab-content.active { display: block; }\n</style>\n\n<script>\n  document.querySelectorAll('.tab').forEach(tab => {\n    tab.addEventListener('click', () => {\n      const id = tab.dataset.tab;\n\n      // Update active tab\n      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));\n      tab.classList.add('active');\n\n      // Update visible content\n      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));\n      document.querySelector(\\`[data-content=\"\\${id}\"]\\`).classList.add('active');\n    });\n  });\n</script>\n\\`\\`\\`"
  },
  {
    id: "pattern-dark-mode",
    keywords: ["dark mode","theme","toggle theme","light mode"],
    title: "Dark Mode Toggle",
    answer: "Toggle dark mode with saved preference:\n\n\\`\\`\\`html\n<button id=\"themeBtn\">Toggle Theme</button>\n\n<style>\n  body {\n    background: white;\n    color: black;\n    transition: background 0.3s, color 0.3s;\n  }\n  body.dark {\n    background: #1a1a1a;\n    color: #f5f5f5;\n  }\n</style>\n\n<script>\n  const btn = document.getElementById('themeBtn');\n\n  // Load saved preference on startup\n  if (localStorage.getItem('theme') === 'dark') {\n    document.body.classList.add('dark');\n  }\n\n  btn.addEventListener('click', () => {\n    document.body.classList.toggle('dark');\n    const isDark = document.body.classList.contains('dark');\n    localStorage.setItem('theme', isDark ? 'dark' : 'light');\n  });\n</script>\n\\`\\`\\`"
  }
];

// ===== FUZZY MATCHING =====
// Levenshtein distance for typo tolerance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if word is fuzzy-similar to keyword (typo tolerant)
function fuzzyMatch(word, keyword) {
  word = word.toLowerCase();
  keyword = keyword.toLowerCase();
  if (word === keyword) return 1.0;
  if (word.includes(keyword) || keyword.includes(word)) return 0.85;
  const distance = levenshtein(word, keyword);
  const maxLen = Math.max(word.length, keyword.length);
  const similarity = 1 - distance / maxLen;
  return similarity > 0.75 ? similarity : 0;
}

// Score an entry against user query
function scoreEntry(entry, queryWords) {
  let score = 0;
  const titleWords = entry.title.toLowerCase().split(/\\s+/);
  for (const qw of queryWords) {
    for (const keyword of entry.keywords) {
      const keywordParts = keyword.split(/\\s+/);
      for (const kwp of keywordParts) {
        const s = fuzzyMatch(qw, kwp);
        if (s > 0) score += s * 2;
      }
    }
    for (const tw of titleWords) {
      const s = fuzzyMatch(qw, tw);
      if (s > 0) score += s;
    }
  }
  return score;
}

// Find best matches for user question
function searchKnowledgeBase(query) {
  const queryWords = query
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, ' ')
    .split(/\\s+/)
    .filter(w => w.length > 1);

  if (queryWords.length === 0) return null;

  const scored = KNOWLEDGE_BASE.map(entry => ({
    entry,
    score: scoreEntry(entry, queryWords),
  }));

  scored.sort((a, b) => b.score - a.score);

  if (scored[0].score < 1.5) return null;
  return scored[0].entry;
}

function buildOfflineReply(query) {
  const match = searchKnowledgeBase(query);
  if (!match) {
    return "Both AI services are currently unavailable and I could not find a matching topic in my offline knowledge base. Please try again in a few minutes.\\n\\nAvailable offline topics include HTML basics, CSS layouts, JavaScript fundamentals, DOM manipulation, events, and common patterns. Try rephrasing your question with keywords like 'flexbox', 'array methods', 'form validation', or similar.";
  }
  return "**Offline Mode - Solara Knowledge Base**\\n\\n_The AI services are temporarily unavailable, so I am answering from my local reference library._\\n\\n---\\n\\n## " + match.title + "\\n\\n" + match.answer + "\\n\\n---\\n\\n_Ask a follow-up question or try again in a few minutes when the AI is back online._";
}

// ===== SYSTEM PROMPT =====
const CORE_IDENTITY = [
  "You are Solara - a warm, patient, and intelligent coding teacher for beginners learning HTML, CSS, and JavaScript.",
  "",
  "RULES:",
  "1. NEVER dump code on vague messages like 'test', 'hi', 'help', 'gawa ka'. Reply conversationally and ask ONE clarifying question first.",
  "2. Match reply length to question depth. Short question = short reply.",
  "3. ALWAYS explain in plain words BEFORE showing code.",
  "4. Keep code examples SHORT (under 25 lines).",
  "5. One concept per reply. Never teach 5 things at once.",
  "6. Correct mistakes kindly, frame as 'common mistake'.",
  "7. Praise specifically, not generically.",
  "8. Never say 'As an AI language model'. You are Solara.",
  "",
  "LANGUAGE: Reply in whatever language the user writes in. Formal English by default unless they use another language.",
  "",
  "FORMATTING: Use markdown with bold for key terms, fenced code blocks with language tags (html/css/js), short paragraphs.",
  "",
  "ANTI-PATTERNS: No jargon dumps. No 100-line first replies. No random outputs like 'Hello to Goodbye' or 'print statements' - always respond to what the user ACTUALLY said.",
].join("\n");

const MODE_GENERAL = "\n\n=== MODE: GENERAL ===\nHandle any HTML/CSS/JS question. One concept at a time. Break bigger builds into stages.";
const MODE_REACT = "\n\n=== MODE: REACT EXPERT ===\nModern React 18+. Functional components with hooks. If user seems beginner, suggest JS basics first.";
const MODE_DEBUGGER = "\n\n=== MODE: DEBUGGER ===\nFind root causes. Ask for code, expected behavior, actual behavior if not provided. Show minimal fixes.";
const MODE_EXPLAINER = "\n\n=== MODE: EXPLAINER ===\nTeach concepts with: plain definition, real-life analogy, tiny code example, line-by-line breakdown, when to use it, common mistakes.";
const MODE_REVIEWER = "\n\n=== MODE: CODE REVIEWER ===\nReview kindly. Verdict line, findings by severity (Critical/Important/Minor), always end with 1-2 things done WELL.";
const MODE_EXPLAIN_CODE = "\n\n=== MODE: EXPLAIN THIS CODE ===\nOverview in 1-2 sentences, then line-by-line explanation, then summary of key concepts. Do NOT rewrite the code.";

const PROMPT_PRESETS = {
  general: CORE_IDENTITY + MODE_GENERAL,
  react: CORE_IDENTITY + MODE_REACT,
  debugger: CORE_IDENTITY + MODE_DEBUGGER,
  explainer: CORE_IDENTITY + MODE_EXPLAINER,
  reviewer: CORE_IDENTITY + MODE_REVIEWER,
  'explain-code': CORE_IDENTITY + MODE_EXPLAIN_CODE,
};

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret) {
      return res.status(500).json({
        error: 'Auth is not configured. Set AUTH_SECRET in Vercel Environment Variables.',
      });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!verifyToken(token, authSecret)) {
      return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const { messages, model, preset } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "messages" array.' });
    }

    if (!model || !['deepseek', 'gemini'].includes(model)) {
      return res.status(400).json({ error: 'Invalid model. Use "deepseek" or "gemini".' });
    }

    const presetKey = PROMPT_PRESETS[preset] ? preset : 'general';
    const systemPrompt = PROMPT_PRESETS[presetKey];

    // Get the user's last message for offline fallback matching
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuery = lastUserMessage ? lastUserMessage.content : '';

    // Try primary model, then fallback to the other, then offline knowledge base
    let reply;
    let source = model;
    let usedFallback = false;

    try {
      // Try requested model first
      if (model === 'deepseek') {
        reply = await callDeepSeek(messages, systemPrompt);
      } else {
        reply = await callGemini(messages, systemPrompt);
      }
    } catch (primaryError) {
      console.error('Primary model (' + model + ') failed:', primaryError.message);

      // Try the OTHER model as fallback
      try {
        if (model === 'deepseek') {
          reply = await callGemini(messages, systemPrompt);
          source = 'gemini';
        } else {
          reply = await callDeepSeek(messages, systemPrompt);
          source = 'deepseek';
        }
        usedFallback = true;
      } catch (secondaryError) {
        console.error('Secondary model failed:', secondaryError.message);

        // Both AI services down - use offline knowledge base
        reply = buildOfflineReply(userQuery);
        source = 'offline';
        usedFallback = true;
      }
    }

    return res.status(200).json({
      reply,
      model: source,
      preset: presetKey,
      offline: source === 'offline',
      fallback: usedFallback,
    });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
}

// ===== DEEPSEEK V3 (via OpenRouter) =====
async function callDeepSeek(messages, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }

  const payload = {
    model: 'deepseek/deepseek-chat-v3-0324',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
    top_p: 0.9,
    frequency_penalty: 0.3,
    presence_penalty: 0.2,
    max_tokens: 4096,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
      'HTTP-Referer': 'https://solara-ai.vercel.app',
      'X-Title': 'Solara AI',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = 'OpenRouter error (' + response.status + ')';
    try {
      const errData = JSON.parse(errText);
      errMsg = (errData.error && errData.error.message) || errMsg;
    } catch (e) {
      errMsg = errText.slice(0, 200) || errMsg;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

  if (!reply) {
    throw new Error('DeepSeek returned an empty response.');
  }

  return reply;
}

// ===== GEMINI 2.0 FLASH =====
async function callGemini(messages, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = 'Gemini error (' + response.status + ')';
    try {
      const errData = JSON.parse(errText);
      errMsg = (errData.error && errData.error.message) || errMsg;
    } catch (e) {
      errMsg = errText.slice(0, 200) || errMsg;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const reply = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

  if (!reply) {
    const finishReason = data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('Gemini blocked the response due to safety filters.');
    }
    throw new Error('Gemini returned an empty response.');
  }

  return reply;
}
