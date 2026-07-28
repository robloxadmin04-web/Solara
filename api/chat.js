// ===== SOLARA AI - Backend v10 - Multi-Provider Rotation =====
// 4-provider smart fallback + offline knowledge base
// Order: Groq (fastest) -> Gemini -> DeepSeek Direct -> OpenRouter DeepSeek -> Offline
// Combined free quota: ~16,000+ requests/day
// Pure ASCII, no mojibake

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

// ===== HARDCODED KNOWLEDGE BASE (Offline Fallback) =====
const KNOWLEDGE_BASE = [
  {
    id: "html-doctype",
    keywords: ["doctype","html5","declaration","starting html","html structure"],
    title: "HTML5 Document Structure",
    answer: "The basic HTML5 document structure looks like this:\n\n\\`\\`\\`html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>\n\\`\\`\\`\n\nBreakdown:\n- **DOCTYPE html** tells the browser this is HTML5\n- **html lang=\"en\"** wraps everything, declares the language\n- **head** contains metadata (not visible on the page)\n- **meta charset** sets text encoding to UTF-8\n- **meta viewport** makes the page responsive on mobile\n- **title** is what shows on the browser tab\n- **body** contains everything visible on the page"
  },
  {
    id: "html-headings",
    keywords: ["heading","h1","h2","title","header text"],
    title: "HTML Headings",
    answer: "HTML has 6 heading levels:\n\n\\`\\`\\`html\n<h1>Main Title</h1>\n<h2>Section Title</h2>\n<h3>Subsection</h3>\n<h4>Smaller heading</h4>\n<h5>Even smaller</h5>\n<h6>Smallest heading</h6>\n\\`\\`\\`\n\nBest practices:\n- Use only ONE h1 per page\n- Do not skip levels (h1 to h3 without h2 is bad for accessibility)\n- Headings help screen readers and search engines"
  },
  {
    id: "html-links",
    keywords: ["link","anchor","href","hyperlink"],
    title: "HTML Links",
    answer: "Links use the anchor tag:\n\n\\`\\`\\`html\n<a href=\"about.html\">About Us</a>\n<a href=\"https://google.com\" target=\"_blank\" rel=\"noopener\">Google (new tab)</a>\n<a href=\"#section1\">Jump to Section 1</a>\n\\`\\`\\`\n\nAlways add **rel=\"noopener\"** when using **target=\"_blank\"** for security."
  },
  {
    id: "html-images",
    keywords: ["image","img","picture","photo"],
    title: "HTML Images",
    answer: "Add images with the img tag:\n\n\\`\\`\\`html\n<img src=\"photo.jpg\" alt=\"Description\" width=\"400\">\n\\`\\`\\`\n\n- **src** is the image URL (required)\n- **alt** is fallback text (required for accessibility)\n- **width/height** prevent layout shift\n\nResponsive images:\n\\`\\`\\`html\n<img src=\"photo.jpg\" alt=\"A sunset\" style=\"max-width: 100%; height: auto;\">\n\\`\\`\\`"
  },
  {
    id: "html-lists",
    keywords: ["list","ul","ol","li","bullet","numbered"],
    title: "HTML Lists",
    answer: "**Unordered list (bullets):**\n\\`\\`\\`html\n<ul>\n  <li>Apples</li>\n  <li>Bananas</li>\n</ul>\n\\`\\`\\`\n\n**Ordered list (numbers):**\n\\`\\`\\`html\n<ol>\n  <li>First step</li>\n  <li>Second step</li>\n</ol>\n\\`\\`\\`\n\nYou can nest lists for hierarchy."
  },
  {
    id: "html-forms",
    keywords: ["form","input","submit","textbox"],
    title: "HTML Forms",
    answer: "Basic form with common inputs:\n\n\\`\\`\\`html\n<form action=\"/submit\" method=\"POST\">\n  <label for=\"name\">Name:</label>\n  <input type=\"text\" id=\"name\" name=\"name\" required>\n\n  <label for=\"email\">Email:</label>\n  <input type=\"email\" id=\"email\" name=\"email\" required>\n\n  <textarea name=\"message\" rows=\"4\"></textarea>\n\n  <button type=\"submit\">Send</button>\n</form>\n\\`\\`\\`\n\nCommon input types: text, email, password, number, checkbox, radio, file, date"
  },
  {
    id: "html-buttons",
    keywords: ["button","click","pindutan"],
    title: "HTML Buttons",
    answer: "Buttons are created with the button tag:\n\n\\`\\`\\`html\n<button type=\"button\">Click me</button>\n<button type=\"submit\">Submit Form</button>\n<button type=\"button\" onclick=\"alert('Hi!')\">Say Hi</button>\n\\`\\`\\`\n\nFor better code, use addEventListener in JS instead of onclick."
  },
  {
    id: "html-semantic",
    keywords: ["semantic","header","nav","main","section","article","footer"],
    title: "Semantic HTML",
    answer: "Semantic elements describe meaning:\n\n\\`\\`\\`html\n<body>\n  <header>\n    <h1>My Website</h1>\n    <nav><a href=\"/\">Home</a></nav>\n  </header>\n  <main>\n    <article>\n      <h2>Post Title</h2>\n      <p>Content...</p>\n    </article>\n  </main>\n  <footer>\n    <p>Copyright 2025</p>\n  </footer>\n</body>\n\\`\\`\\`\n\nBenefits: better SEO, better accessibility, clearer code."
  },
  {
    id: "html-tables",
    keywords: ["table","tr","td","th","row","column"],
    title: "HTML Tables",
    answer: "Tables use table, tr, th, td:\n\n\\`\\`\\`html\n<table>\n  <thead>\n    <tr>\n      <th>Name</th>\n      <th>Age</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Alice</td>\n      <td>25</td>\n    </tr>\n  </tbody>\n</table>\n\\`\\`\\`\n\nUse tables only for tabular data, not layout."
  },
  {
    id: "css-selectors",
    keywords: ["selector","class","id","target"],
    title: "CSS Selectors",
    answer: "\\`\\`\\`css\n/* Element - all paragraphs */\np { color: blue; }\n\n/* Class */\n.button { background: black; }\n\n/* ID */\n#header { height: 60px; }\n\n/* Descendant */\nul li { list-style: none; }\n\n/* Multiple */\nh1, h2, h3 { font-family: Arial; }\n\n/* Pseudo-classes */\na:hover { color: red; }\nbutton:disabled { opacity: 0.5; }\n\\`\\`\\`"
  },
  {
    id: "css-box-model",
    keywords: ["box model","margin","padding","border","width","height"],
    title: "CSS Box Model",
    answer: "Every element is a box:\n\n\\`\\`\\`css\n.box {\n  width: 300px;\n  padding: 20px;   /* space INSIDE the border */\n  border: 2px solid black;\n  margin: 15px;    /* space OUTSIDE the border */\n}\n\\`\\`\\`\n\nRecommended - use border-box everywhere:\n\\`\\`\\`css\n* {\n  box-sizing: border-box;\n}\n\\`\\`\\`\n\nWith border-box, width includes padding and border - much easier to reason about."
  },
  {
    id: "css-flexbox-center",
    keywords: ["center","flexbox","flex","centering"],
    title: "Center Anything with Flexbox",
    answer: "Easiest way to center content:\n\n\\`\\`\\`css\n.container {\n  display: flex;\n  justify-content: center;  /* horizontal */\n  align-items: center;      /* vertical */\n  min-height: 100vh;\n}\n\\`\\`\\`\n\n\\`\\`\\`html\n<div class=\"container\">\n  <div>I am centered!</div>\n</div>\n\\`\\`\\`"
  },
  {
    id: "css-flexbox",
    keywords: ["flexbox","flex","flex-direction","gap","layout"],
    title: "CSS Flexbox Guide",
    answer: "Flexbox is 1D layout (rows or columns):\n\n\\`\\`\\`css\n.container {\n  display: flex;\n  flex-direction: row;         /* row | column */\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 20px;\n}\n\n.item {\n  flex: 1;              /* fill available space */\n}\n\\`\\`\\`\n\nCommon patterns:\n- Nav bar: **justify-content: space-between**\n- Equal columns: **flex: 1** on items\n- Card grid: **flex-wrap: wrap; gap: 20px**"
  },
  {
    id: "css-grid",
    keywords: ["grid","css grid","grid-template","columns"],
    title: "CSS Grid Basics",
    answer: "Grid is 2D layout (rows AND columns):\n\n\\`\\`\\`css\n.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 20px;\n}\n\\`\\`\\`\n\nResponsive cards:\n\\`\\`\\`css\n.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 20px;\n}\n\\`\\`\\`\n\nGrid vs Flexbox: Grid for 2D (rows+cols), Flex for 1D (single row or col)."
  },
  {
    id: "css-position",
    keywords: ["position","absolute","relative","fixed","sticky","z-index"],
    title: "CSS Positioning",
    answer: "\\`\\`\\`css\n.relative {\n  position: relative;\n  top: 10px;      /* offsets from normal spot */\n}\n\n.absolute {\n  position: absolute;\n  top: 0;\n  right: 0;       /* relative to nearest positioned ancestor */\n}\n\n.fixed {\n  position: fixed;\n  bottom: 20px;   /* stays in viewport when scrolling */\n}\n\n.sticky {\n  position: sticky;\n  top: 0;         /* sticks when scrolled past */\n}\n\n.overlay {\n  z-index: 100;   /* higher = on top */\n}\n\\`\\`\\`"
  },
  {
    id: "css-colors",
    keywords: ["color","background","rgb","hex","gradient"],
    title: "CSS Colors and Backgrounds",
    answer: "\\`\\`\\`css\n.example {\n  color: red;\n  color: #ff0000;\n  color: rgb(255, 0, 0);\n  color: rgba(255, 0, 0, 0.5);   /* transparency */\n  color: hsl(0, 100%, 50%);\n}\n\n.hero {\n  background-image: url('bg.jpg');\n  background-size: cover;\n  background-position: center;\n  background: linear-gradient(to right, red, blue);\n}\n\\`\\`\\`"
  },
  {
    id: "css-typography",
    keywords: ["font","text","typography","font-size"],
    title: "CSS Typography",
    answer: "\\`\\`\\`css\nbody {\n  font-family: 'Inter', Arial, sans-serif;\n  font-size: 16px;\n  font-weight: 400;\n  line-height: 1.5;\n  color: #333;\n  text-align: left;\n}\n\n.heading {\n  font-size: 2rem;\n  text-transform: uppercase;\n}\n\n.link {\n  text-decoration: none;   /* remove underline */\n}\n\\`\\`\\`\n\nLoad Google Fonts:\n\\`\\`\\`html\n<link href=\"https://fonts.googleapis.com/css2?family=Inter&display=swap\" rel=\"stylesheet\">\n\\`\\`\\`"
  },
  {
    id: "css-transitions",
    keywords: ["transition","animation","hover","smooth"],
    title: "CSS Transitions and Animations",
    answer: "**Transitions** animate property changes:\n\n\\`\\`\\`css\n.button {\n  background: blue;\n  transition: background 0.3s ease;\n}\n\n.button:hover {\n  background: red;\n}\n\n.card {\n  transition: transform 0.3s ease, box-shadow 0.3s ease;\n}\n\n.card:hover {\n  transform: scale(1.05) translateY(-5px);\n  box-shadow: 0 10px 30px rgba(0,0,0,0.2);\n}\n\\`\\`\\`\n\n**Keyframe animations:**\n\\`\\`\\`css\n@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(20px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.fade-in {\n  animation: fadeIn 0.5s ease forwards;\n}\n\\`\\`\\`"
  },
  {
    id: "css-responsive",
    keywords: ["responsive","media query","mobile","breakpoint"],
    title: "CSS Responsive Design",
    answer: "Media queries adapt to screen size:\n\n\\`\\`\\`css\n/* Mobile-first defaults */\n.container {\n  padding: 20px;\n  font-size: 14px;\n}\n\n@media (min-width: 768px) {\n  .container {\n    padding: 40px;\n    font-size: 16px;\n  }\n}\n\n@media (min-width: 1024px) {\n  .container {\n    max-width: 1200px;\n    margin: 0 auto;\n  }\n}\n\\`\\`\\`\n\nAdd viewport meta tag:\n\\`\\`\\`html\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\\`\\`\\`"
  },
  {
    id: "css-shadow",
    keywords: ["shadow","box-shadow","text-shadow"],
    title: "CSS Shadows",
    answer: "\\`\\`\\`css\n/* box-shadow: offset-x offset-y blur color */\n.card {\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n}\n\n/* Layered for realism */\n.floating {\n  box-shadow:\n    0 1px 3px rgba(0,0,0,0.12),\n    0 1px 2px rgba(0,0,0,0.24);\n}\n\n/* Inset (inside) */\n.pressed {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);\n}\n\n/* Text shadow */\n.hero-text {\n  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);\n}\n\\`\\`\\`"
  },
  {
    id: "css-variables",
    keywords: ["variable","custom property","var"],
    title: "CSS Variables",
    answer: "Reusable values with CSS variables:\n\n\\`\\`\\`css\n:root {\n  --primary: #3498db;\n  --text: #333;\n  --spacing: 16px;\n  --radius: 8px;\n}\n\n.button {\n  background: var(--primary);\n  padding: var(--spacing);\n  border-radius: var(--radius);\n}\n\n.card {\n  color: var(--text);\n  margin: var(--spacing);\n}\n\\`\\`\\`\n\nChange one variable, update your whole design. Great for theming."
  },
  {
    id: "js-variables",
    keywords: ["variable","var","let","const","declare"],
    title: "JavaScript Variables",
    answer: "Three ways to declare variables:\n\n\\`\\`\\`js\n// const - value cannot be reassigned (USE THIS BY DEFAULT)\nconst name = 'Alice';\n\n// let - value can change\nlet count = 0;\ncount = count + 1;\n\n// var - old-style, avoid\nvar oldStyle = 'do not use';\n\\`\\`\\`\n\nRules:\n- Use **const** by default\n- Use **let** only when reassigning\n- Avoid **var**\n\nNote: const prevents reassignment, but object contents can still change:\n\\`\\`\\`js\nconst list = [1, 2, 3];\nlist.push(4);    // OK\n// list = [];    // ERROR\n\\`\\`\\`"
  },
  {
    id: "js-strings",
    keywords: ["string","text","template literal"],
    title: "JavaScript Strings",
    answer: "\\`\\`\\`js\nconst first = 'Alice';\nconst last = 'Smith';\n\n// Template literals (recommended)\nconst full = \\`\\${first} \\${last}\\`;\n\n// Common methods\nconst text = 'Hello, World!';\ntext.length;                  // 13\ntext.toUpperCase();           // 'HELLO, WORLD!'\ntext.includes('World');       // true\ntext.replace('World', 'JS');  // 'Hello, JS!'\ntext.slice(0, 5);             // 'Hello'\ntext.split(', ');             // ['Hello', 'World!']\ntext.trim();                  // removes whitespace\n\\`\\`\\`"
  },
  {
    id: "js-conditionals",
    keywords: ["if","else","condition","ternary","switch"],
    title: "JavaScript Conditionals",
    answer: "\\`\\`\\`js\n// if / else if / else\nif (age >= 18) {\n  console.log('Adult');\n} else if (age >= 13) {\n  console.log('Teenager');\n} else {\n  console.log('Child');\n}\n\n// Ternary (short if/else)\nconst message = age >= 18 ? 'Adult' : 'Minor';\n\n// Switch\nswitch (day) {\n  case 'Monday':\n    console.log('Start of week');\n    break;\n  default:\n    console.log('Other day');\n}\n\\`\\`\\`\n\nComparison: === (strict equal), !==, >, <, >=, <=\nLogic: && (and), || (or), ! (not)"
  },
  {
    id: "js-loops",
    keywords: ["loop","for","while","iterate","foreach"],
    title: "JavaScript Loops",
    answer: "\\`\\`\\`js\n// Classic for\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n\n// While\nlet count = 0;\nwhile (count < 3) {\n  console.log(count);\n  count++;\n}\n\n// For...of - array values\nconst fruits = ['apple', 'banana'];\nfor (const fruit of fruits) {\n  console.log(fruit);\n}\n\n// forEach - array method\nfruits.forEach((fruit, index) => {\n  console.log(index, fruit);\n});\n\\`\\`\\`"
  },
  {
    id: "js-functions",
    keywords: ["function","arrow function","return","parameter"],
    title: "JavaScript Functions",
    answer: "\\`\\`\\`js\n// Function declaration\nfunction greet(name) {\n  return 'Hello, ' + name;\n}\n\n// Arrow function (modern)\nconst greet2 = (name) => 'Hello, ' + name;\n\n// Multi-line arrow\nconst greet3 = (name) => {\n  const msg = 'Hello, ' + name;\n  return msg;\n};\n\n// Default parameters\nfunction greet4(name = 'friend') {\n  return 'Hello, ' + name;\n}\n\n// Multiple params\nconst add = (a, b) => a + b;\nadd(2, 3);  // 5\n\\`\\`\\`"
  },
  {
    id: "js-arrays",
    keywords: ["array","list","push","map","filter"],
    title: "JavaScript Arrays",
    answer: "\\`\\`\\`js\nconst fruits = ['apple', 'banana', 'cherry'];\n\nfruits[0];              // 'apple'\nfruits.length;          // 3\n\n// Add/remove\nfruits.push('date');    // add to end\nfruits.pop();           // remove from end\nfruits.unshift('kiwi'); // add to start\n\n// Find and check\nfruits.includes('apple');       // true\nfruits.indexOf('banana');       // 1\n\n// Transform (returns NEW array)\nconst nums = [1, 2, 3, 4];\nnums.map(n => n * 2);           // [2, 4, 6, 8]\nnums.filter(n => n > 2);        // [3, 4]\nnums.reduce((sum, n) => sum + n, 0); // 10\n\\`\\`\\`"
  },
  {
    id: "js-objects",
    keywords: ["object","key","property","destructuring"],
    title: "JavaScript Objects",
    answer: "\\`\\`\\`js\nconst person = {\n  name: 'Alice',\n  age: 25,\n  greet() {\n    return 'Hi, I am ' + this.name;\n  }\n};\n\n// Access\nperson.name;           // 'Alice'\nperson['name'];        // 'Alice'\n\n// Modify\nperson.age = 26;\nperson.email = 'alice@example.com';\n\n// Destructuring\nconst { name, age } = person;\n\n// Spread - copy or merge\nconst clone = { ...person };\nconst updated = { ...person, age: 30 };\n\\`\\`\\`"
  },
  {
    id: "js-dom-select",
    keywords: ["dom","queryselector","getelementbyid","select"],
    title: "JavaScript DOM Selection",
    answer: "\\`\\`\\`js\n// Modern (use these)\ndocument.querySelector('#header');      // by ID\ndocument.querySelector('.button');      // by class\ndocument.querySelector('p');            // by tag\ndocument.querySelectorAll('.item');     // ALL matches\n\n// Loop through multiple\nconst items = document.querySelectorAll('.item');\nitems.forEach(item => {\n  console.log(item.textContent);\n});\n\\`\\`\\`"
  },
  {
    id: "js-dom-modify",
    keywords: ["dom","innerhtml","textcontent","classlist","modify"],
    title: "JavaScript DOM Manipulation",
    answer: "\\`\\`\\`js\nconst el = document.querySelector('#myDiv');\n\n// Text\nel.textContent = 'New text';     // safe\nel.innerHTML = '<strong>Bold</strong>';  // careful - XSS risk\n\n// Attributes\nel.setAttribute('data-id', '123');\nel.removeAttribute('disabled');\n\n// Classes\nel.classList.add('active');\nel.classList.remove('hidden');\nel.classList.toggle('open');\nel.classList.contains('active');\n\n// Create elements\nconst div = document.createElement('div');\ndiv.textContent = 'Hello';\ndocument.body.appendChild(div);\n\n// Remove\nel.remove();\n\\`\\`\\`"
  },
  {
    id: "js-events",
    keywords: ["event","click","addeventlistener","listener"],
    title: "JavaScript Events",
    answer: "\\`\\`\\`js\nconst button = document.querySelector('#myBtn');\n\nbutton.addEventListener('click', () => {\n  console.log('Clicked!');\n});\n\n// With event details\nbutton.addEventListener('click', (event) => {\n  console.log(event.target);\n  event.preventDefault();\n});\n\n// Form submit\ndocument.querySelector('form').addEventListener('submit', (e) => {\n  e.preventDefault();  // stop page reload\n});\n\n// Keyboard\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Enter') console.log('Enter pressed');\n});\n\\`\\`\\`\n\nCommon events: click, submit, input, change, keydown, load, scroll"
  },
  {
    id: "js-fetch",
    keywords: ["fetch","api","ajax","http","request","json"],
    title: "JavaScript Fetch API",
    answer: "\\`\\`\\`js\n// Modern async/await (recommended)\nasync function getUsers() {\n  try {\n    const response = await fetch('/api/users');\n    if (!response.ok) throw new Error('Failed');\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error(error);\n  }\n}\n\n// POST with body\nasync function createUser(userData) {\n  const response = await fetch('/api/users', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(userData),\n  });\n  return response.json();\n}\n\\`\\`\\`"
  },
  {
    id: "js-localstorage",
    keywords: ["localstorage","storage","save","persist"],
    title: "JavaScript localStorage",
    answer: "Save data that persists across page loads:\n\n\\`\\`\\`js\n// Strings only\nlocalStorage.setItem('username', 'Alice');\nconst name = localStorage.getItem('username');\n\n// Objects - convert to JSON\nconst user = { name: 'Alice', age: 25 };\nlocalStorage.setItem('user', JSON.stringify(user));\nconst saved = JSON.parse(localStorage.getItem('user'));\n\nlocalStorage.removeItem('username');\nlocalStorage.clear();\n\\`\\`\\`\n\nLimit: ~5MB per domain. Persists until manually cleared.\n\n**sessionStorage** works the same but clears on tab close."
  },
  {
    id: "js-async",
    keywords: ["async","await","promise","asynchronous"],
    title: "JavaScript Async/Await",
    answer: "\\`\\`\\`js\n// Modern syntax (cleaner)\nasync function loadData() {\n  try {\n    const response = await fetch('/api/data');\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error(error);\n  }\n}\n\n// Multiple in parallel\nasync function loadMultiple() {\n  const [users, posts] = await Promise.all([\n    fetch('/api/users').then(r => r.json()),\n    fetch('/api/posts').then(r => r.json()),\n  ]);\n}\n\\`\\`\\`\n\nRules:\n- await only works inside async functions\n- async functions always return a Promise\n- Use try/catch for errors"
  },
  {
    id: "js-todo",
    keywords: ["todo","todo list","crud","example app"],
    title: "Complete Todo App",
    answer: "\\`\\`\\`html\n<!DOCTYPE html>\n<html>\n<body>\n  <h1>Todos</h1>\n  <input id=\"input\" placeholder=\"New todo\">\n  <button id=\"addBtn\">Add</button>\n  <ul id=\"list\"></ul>\n\n  <script>\n    const input = document.getElementById('input');\n    const list = document.getElementById('list');\n    let todos = JSON.parse(localStorage.getItem('todos') || '[]');\n\n    function render() {\n      list.innerHTML = '';\n      todos.forEach((todo, i) => {\n        const li = document.createElement('li');\n        li.textContent = todo;\n        const btn = document.createElement('button');\n        btn.textContent = 'X';\n        btn.onclick = () => {\n          todos.splice(i, 1);\n          save();\n        };\n        li.appendChild(btn);\n        list.appendChild(li);\n      });\n    }\n\n    function save() {\n      localStorage.setItem('todos', JSON.stringify(todos));\n      render();\n    }\n\n    document.getElementById('addBtn').onclick = () => {\n      const text = input.value.trim();\n      if (!text) return;\n      todos.push(text);\n      input.value = '';\n      save();\n    };\n\n    render();\n  </script>\n</body>\n</html>\n\\`\\`\\`"
  },
  {
    id: "js-form-validation",
    keywords: ["validation","form validation","validate"],
    title: "Form Validation",
    answer: "\\`\\`\\`html\n<form id=\"myForm\">\n  <input type=\"text\" id=\"name\" placeholder=\"Name\">\n  <input type=\"email\" id=\"email\" placeholder=\"Email\">\n  <button type=\"submit\">Submit</button>\n  <div id=\"error\"></div>\n</form>\n\n<script>\n  const form = document.getElementById('myForm');\n  const errorDiv = document.getElementById('error');\n\n  form.addEventListener('submit', (e) => {\n    e.preventDefault();\n\n    const name = document.getElementById('name').value.trim();\n    const email = document.getElementById('email').value.trim();\n\n    errorDiv.textContent = '';\n\n    if (name.length < 2) {\n      errorDiv.textContent = 'Name must be at least 2 characters';\n      return;\n    }\n\n    if (!email.includes('@') || !email.includes('.')) {\n      errorDiv.textContent = 'Please enter a valid email';\n      return;\n    }\n\n    console.log('Valid!', { name, email });\n    form.reset();\n  });\n</script>\n\\`\\`\\`"
  },
  {
    id: "js-debounce",
    keywords: ["debounce","throttle","delay","search"],
    title: "JavaScript Debounce",
    answer: "Delays running a function until user stops typing:\n\n\\`\\`\\`js\nfunction debounce(func, delay) {\n  let timeout;\n  return function(...args) {\n    clearTimeout(timeout);\n    timeout = setTimeout(() => func(...args), delay);\n  };\n}\n\n// Usage - only runs 300ms after typing stops\nconst searchInput = document.getElementById('search');\nconst doSearch = debounce((e) => {\n  console.log('Search:', e.target.value);\n}, 300);\n\nsearchInput.addEventListener('input', doSearch);\n\\`\\`\\`\n\nGreat for search - prevents firing on every keystroke."
  },
  {
    id: "js-date",
    keywords: ["date","time","format date"],
    title: "JavaScript Dates",
    answer: "\\`\\`\\`js\nconst now = new Date();\n\n// Get parts\nnow.getFullYear();      // 2025\nnow.getMonth();         // 0-11 (Jan = 0!)\nnow.getDate();          // 1-31\nnow.getHours();\n\n// Format\nnow.toLocaleDateString();      // '1/15/2025'\nnow.toLocaleTimeString();      // '3:45 PM'\nnow.toISOString();             // '2025-01-15T15:45:23.000Z'\n\n// Custom format\nnow.toLocaleDateString('en-US', {\n  year: 'numeric',\n  month: 'long',\n  day: 'numeric',\n});  // 'January 15, 2025'\n\n// Timestamps\nDate.now();              // milliseconds since 1970\n\\`\\`\\`"
  },
  {
    id: "js-error-handling",
    keywords: ["error","try catch","exception","throw"],
    title: "Error Handling",
    answer: "\\`\\`\\`js\ntry {\n  const data = JSON.parse(userInput);\n} catch (error) {\n  console.error('Failed:', error.message);\n} finally {\n  // Always runs\n  console.log('Done');\n}\n\n// Throw custom errors\nfunction divide(a, b) {\n  if (b === 0) throw new Error('Cannot divide by zero');\n  return a / b;\n}\n\n// With async\nasync function loadData() {\n  try {\n    const response = await fetch('/api/data');\n    if (!response.ok) throw new Error('HTTP ' + response.status);\n    return await response.json();\n  } catch (error) {\n    console.error('Load failed:', error);\n    return null;\n  }\n}\n\\`\\`\\`"
  },
  {
    id: "pattern-modal",
    keywords: ["modal","popup","dialog","overlay"],
    title: "Modal / Popup Component",
    answer: "\\`\\`\\`html\n<button id=\"openBtn\">Open Modal</button>\n\n<div class=\"modal\" id=\"myModal\">\n  <div class=\"modal-content\">\n    <button class=\"close\">X</button>\n    <h2>Modal Title</h2>\n    <p>Content here.</p>\n  </div>\n</div>\n\n<style>\n  .modal {\n    display: none;\n    position: fixed;\n    inset: 0;\n    background: rgba(0,0,0,0.5);\n    align-items: center;\n    justify-content: center;\n    z-index: 100;\n  }\n  .modal.active { display: flex; }\n  .modal-content {\n    background: white;\n    padding: 24px;\n    border-radius: 8px;\n    max-width: 500px;\n  }\n</style>\n\n<script>\n  const modal = document.getElementById('myModal');\n  document.getElementById('openBtn').onclick = () => modal.classList.add('active');\n  modal.querySelector('.close').onclick = () => modal.classList.remove('active');\n  modal.onclick = (e) => {\n    if (e.target === modal) modal.classList.remove('active');\n  };\n  document.addEventListener('keydown', (e) => {\n    if (e.key === 'Escape') modal.classList.remove('active');\n  });\n</script>\n\\`\\`\\`"
  },
  {
    id: "pattern-tabs",
    keywords: ["tabs","tab component"],
    title: "Tabbed Interface",
    answer: "\\`\\`\\`html\n<div class=\"tabs\">\n  <button class=\"tab active\" data-tab=\"1\">Tab 1</button>\n  <button class=\"tab\" data-tab=\"2\">Tab 2</button>\n</div>\n\n<div class=\"tab-content active\" data-content=\"1\">Content 1</div>\n<div class=\"tab-content\" data-content=\"2\">Content 2</div>\n\n<style>\n  .tabs { display: flex; border-bottom: 2px solid #eee; }\n  .tab {\n    padding: 10px 20px;\n    background: none;\n    border: none;\n    border-bottom: 2px solid transparent;\n    margin-bottom: -2px;\n    cursor: pointer;\n  }\n  .tab.active { border-bottom-color: blue; color: blue; }\n  .tab-content { display: none; padding: 20px; }\n  .tab-content.active { display: block; }\n</style>\n\n<script>\n  document.querySelectorAll('.tab').forEach(tab => {\n    tab.addEventListener('click', () => {\n      const id = tab.dataset.tab;\n      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));\n      tab.classList.add('active');\n      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));\n      document.querySelector('[data-content=\"' + id + '\"]').classList.add('active');\n    });\n  });\n</script>\n\\`\\`\\`"
  },
  {
    id: "pattern-dark-mode",
    keywords: ["dark mode","theme","toggle theme"],
    title: "Dark Mode Toggle",
    answer: "\\`\\`\\`html\n<button id=\"themeBtn\">Toggle Theme</button>\n\n<style>\n  body {\n    background: white;\n    color: black;\n    transition: background 0.3s, color 0.3s;\n  }\n  body.dark {\n    background: #1a1a1a;\n    color: #f5f5f5;\n  }\n</style>\n\n<script>\n  const btn = document.getElementById('themeBtn');\n\n  if (localStorage.getItem('theme') === 'dark') {\n    document.body.classList.add('dark');\n  }\n\n  btn.addEventListener('click', () => {\n    document.body.classList.toggle('dark');\n    const isDark = document.body.classList.contains('dark');\n    localStorage.setItem('theme', isDark ? 'dark' : 'light');\n  });\n</script>\n\\`\\`\\`"
  }
];

// ===== FUZZY MATCHING =====
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

function scoreEntry(entry, queryWords) {
  let score = 0;
  const titleWords = entry.title.toLowerCase().split(/\\s+/);
  for (const qw of queryWords) {
    for (const keyword of entry.keywords) {
      const parts = keyword.split(/\\s+/);
      for (const kwp of parts) {
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
    return "**Offline Mode**\\n\\nAll AI services are temporarily unavailable, and I could not find a matching topic in my offline knowledge base. Please try again in a few minutes.\\n\\nAvailable offline topics include HTML basics, CSS layouts, JavaScript fundamentals, DOM manipulation, events, and common patterns. Try rephrasing your question with keywords like 'flexbox', 'array methods', 'form validation', or similar.";
  }
  return "**Offline Mode - Local Knowledge Base**\\n\\n_All AI providers are temporarily unavailable. This answer is from my built-in reference library._\\n\\n---\\n\\n## " + match.title + "\\n\\n" + match.answer + "\\n\\n---\\n\\n_Please try again in a few minutes when the AI is back online for follow-up questions._";
}

// ===== SYSTEM PROMPT =====
const CORE_IDENTITY = [
  "You are Solara - a warm, patient, and intelligent coding teacher for beginners learning HTML, CSS, and JavaScript.",
  "",
  "RULES:",
  "1. NEVER dump code on vague messages like 'test', 'hi', 'help'. Reply conversationally and ask ONE clarifying question first.",
  "2. Match reply length to question depth. Short question = short reply.",
  "3. ALWAYS explain in plain words BEFORE showing code.",
  "4. Keep code examples SHORT (under 25 lines).",
  "5. One concept per reply. Never teach 5 things at once.",
  "6. Correct mistakes kindly, frame as 'common mistake'.",
  "7. Praise specifically, not generically.",
  "8. Never say 'As an AI language model'. You are Solara.",
  "",
  "LANGUAGE: Reply in whatever language the user writes in. Formal English by default.",
  "",
  "FORMATTING: Use markdown with bold for key terms, fenced code blocks with language tags (html/css/js), short paragraphs.",
  "",
  "ANTI-PATTERNS: No jargon dumps. No 100-line first replies. Always respond to what the user ACTUALLY said.",
].join("\n");

const MODE_GENERAL = "\n\n=== MODE: GENERAL ===\nHandle any HTML/CSS/JS question. One concept at a time.";
const MODE_REACT = "\n\n=== MODE: REACT EXPERT ===\nModern React 18+. Functional components with hooks. If user seems beginner, suggest JS basics first.";
const MODE_DEBUGGER = "\n\n=== MODE: DEBUGGER ===\nFind root causes. Ask for code, expected, actual if not provided. Show minimal fixes.";
const MODE_EXPLAINER = "\n\n=== MODE: EXPLAINER ===\nTeach concepts with: plain definition, real-life analogy, tiny code example, line-by-line breakdown, when to use, common mistakes.";
const MODE_REVIEWER = "\n\n=== MODE: CODE REVIEWER ===\nReview kindly. Verdict, findings by severity, always end with 1-2 things done WELL.";
const MODE_EXPLAIN_CODE = "\n\n=== MODE: EXPLAIN THIS CODE ===\nOverview in 1-2 sentences, then line-by-line explanation, then summary of key concepts. Do NOT rewrite the code.";

const PROMPT_PRESETS = {
  general: CORE_IDENTITY + MODE_GENERAL,
  react: CORE_IDENTITY + MODE_REACT,
  debugger: CORE_IDENTITY + MODE_DEBUGGER,
  explainer: CORE_IDENTITY + MODE_EXPLAINER,
  reviewer: CORE_IDENTITY + MODE_REVIEWER,
  'explain-code': CORE_IDENTITY + MODE_EXPLAIN_CODE,
};

// ===== PROVIDER 1: GROQ (fastest, 14,400 req/day) =====
async function callGroq(messages, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
    max_tokens: 4096,
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Groq error (' + response.status + '): ' + errText.slice(0, 200));
  }

  const data = await response.json();
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) throw new Error('Groq returned empty response');
  return reply;
}

// ===== PROVIDER 2: GEMINI 2.0 FLASH (Google, 1,500 req/day) =====
async function callGemini(messages, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const contents = messages.map(m => ({
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
    throw new Error('Gemini error (' + response.status + '): ' + errText.slice(0, 200));
  }

  const data = await response.json();
  const reply = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
  if (!reply) {
    const finishReason = data.candidates && data.candidates[0] && data.candidates[0].finishReason;
    if (finishReason === 'SAFETY') throw new Error('Gemini blocked by safety filters');
    throw new Error('Gemini returned empty response');
  }
  return reply;
}

// ===== PROVIDER 3: DIRECT DEEPSEEK (10M free tokens) =====
async function callDeepSeekDirect(messages, systemPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const payload = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
    max_tokens: 4096,
  };

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('DeepSeek Direct error (' + response.status + '): ' + errText.slice(0, 200));
  }

  const data = await response.json();
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) throw new Error('DeepSeek Direct returned empty response');
  return reply;
}

// ===== PROVIDER 4: OPENROUTER DEEPSEEK (backup, 50-200/day) =====
async function callOpenRouter(messages, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const payload = {
    model: 'deepseek/deepseek-chat-v3-0324',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
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
    throw new Error('OpenRouter error (' + response.status + '): ' + errText.slice(0, 200));
  }

  const data = await response.json();
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!reply) throw new Error('OpenRouter returned empty response');
  return reply;
}

// ===== PROVIDER ROUTER =====
// Maps 'deepseek'/'gemini' UI choice to preferred provider order.
// Auto-skips providers with no API key configured.

const PROVIDER_ORDER = {
  // If user chose DeepSeek: try direct first, then OpenRouter, then fallbacks
  deepseek: [
    { name: 'DeepSeek Direct', fn: callDeepSeekDirect, envKey: 'DEEPSEEK_API_KEY' },
    { name: 'OpenRouter', fn: callOpenRouter, envKey: 'OPENROUTER_API_KEY' },
    { name: 'Groq', fn: callGroq, envKey: 'GROQ_API_KEY' },
    { name: 'Gemini', fn: callGemini, envKey: 'GEMINI_API_KEY' },
  ],
  // If user chose Gemini: try Gemini first, then fastest fallbacks
  gemini: [
    { name: 'Gemini', fn: callGemini, envKey: 'GEMINI_API_KEY' },
    { name: 'Groq', fn: callGroq, envKey: 'GROQ_API_KEY' },
    { name: 'DeepSeek Direct', fn: callDeepSeekDirect, envKey: 'DEEPSEEK_API_KEY' },
    { name: 'OpenRouter', fn: callOpenRouter, envKey: 'OPENROUTER_API_KEY' },
  ],
};

async function tryProviders(preferredModel, messages, systemPrompt) {
  const order = PROVIDER_ORDER[preferredModel] || PROVIDER_ORDER.gemini;
  const errors = [];

  for (const provider of order) {
    // Skip providers with no API key
    if (!process.env[provider.envKey]) {
      errors.push(provider.name + ': no API key');
      continue;
    }

    try {
      const reply = await provider.fn(messages, systemPrompt);
      return { reply, provider: provider.name, errors };
    } catch (err) {
      console.error(provider.name + ' failed:', err.message);
      errors.push(provider.name + ': ' + err.message.slice(0, 100));
      // Continue to next provider
    }
  }

  // All providers failed
  return { reply: null, provider: null, errors };
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret) {
      return res.status(500).json({
        error: 'Auth is not configured. Set AUTH_SECRET in Vercel.',
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

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuery = lastUserMessage ? lastUserMessage.content : '';

    // Try all providers in order
    const result = await tryProviders(model, messages, systemPrompt);

    if (result.reply) {
      // Success - one of the providers worked
      const usedFallback = result.provider !== (model === 'gemini' ? 'Gemini' : 'DeepSeek Direct');
      return res.status(200).json({
        reply: result.reply,
        model,
        preset: presetKey,
        provider: result.provider,
        fallback: usedFallback,
        offline: false,
      });
    }

    // All 4 providers failed - use offline knowledge base
    console.error('All providers failed:', result.errors);
    const offlineReply = buildOfflineReply(userQuery);

    return res.status(200).json({
      reply: offlineReply,
      model,
      preset: presetKey,
      provider: 'Offline KB',
      fallback: true,
      offline: true,
    });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
}
