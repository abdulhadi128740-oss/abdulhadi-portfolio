document.addEventListener('DOMContentLoaded', () => {

  /* =====================================================================
     LIVE BACKGROUND — animated particle network + cursor spotlight.
     Runs on a <canvas> fixed behind all content. Particles drift slowly,
     draw connecting lines when close to each other, and gently drift
     toward the cursor when it's nearby, so the page feels alive rather
     than static. Fully paused when the tab isn't visible, and reduced
     to a single static frame for prefers-reduced-motion.
  ===================================================================== */
  function initBackgroundParticles() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ACCENT = [56, 189, 248];   // --accent
    const ACCENT2 = [59, 130, 246];  // --accent-2
    const LINK_DIST = 130;
    const MOUSE_RADIUS = 160;

    let width, height, dpr;
    let particles = [];
    let rafId = null;
    const mouse = { x: 0, y: 0, active: false };

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticles() {
      const area = width * height;
      // scale particle count with viewport, capped for perf on large/small screens
      const count = Math.min(85, Math.max(26, Math.round(area / 17000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.6,
      }));
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS && dist > 0.01) {
            p.x -= (dx / dist) * 0.22;
            p.y -= (dy / dist) * 0.22;
          }
        }
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.16;
            ctx.strokeStyle = `rgba(${ACCENT.join(',')},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p, i) => {
        const color = i % 3 === 0 ? ACCENT2 : ACCENT;
        ctx.fillStyle = `rgba(${color.join(',')},0.7)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function loop() {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (rafId || prefersReducedMotion) return;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    sizeCanvas();
    makeParticles();
    drawFrame();       // always paint at least one frame
    start();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizeCanvas();
        makeParticles();
        drawFrame();
      }, 150);
    }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });

    window.addEventListener('pointerleave', () => { mouse.active = false; });
    window.addEventListener('pointerup', () => { mouse.active = false; }, { passive: true });
    window.addEventListener('pointercancel', () => { mouse.active = false; }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
  }

  initBackgroundParticles();

  /* =====================================================================
     CUSTOM TERMINAL CURSOR
     A small blinking "caret" block trails the pointer with a soft lerp,
     plus a tight dot that tracks it exactly — only on devices with a
     real mouse (pointer:fine). Touch devices keep their native behavior
     untouched. Text inputs keep a normal text caret for usability.
  ===================================================================== */
  function initCustomCursor() {
    const block = document.getElementById('cursorBlock');
    const dot = document.getElementById('cursorDot');
    if (!block || !dot) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.body.classList.add('custom-cursor');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lerp = prefersReducedMotion ? 1 : 0.2;

    let bx = window.innerWidth / 2, by = window.innerHeight / 2;
    let tx = bx, ty = by;
    let hasMoved = false;

    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      hasMoved = true;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      document.body.classList.remove('cursor-hide');
    }, { passive: true });

    (function raf() {
      bx += (tx - bx) * lerp;
      by += (ty - by) * lerp;
      if (hasMoved) {
        block.style.transform = `translate(${bx}px, ${by}px) translate(-50%, -50%)`;
      }
      requestAnimationFrame(raf);
    })();

    const hoverSelector = 'a, button, .term-input, [role="button"]';
    const textSelector = 'input, textarea, .term-input';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(textSelector)) {
        document.body.classList.add('cursor-hide');
      } else if (e.target.closest(hoverSelector)) {
        document.body.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(textSelector)) document.body.classList.remove('cursor-hide');
      if (e.target.closest(hoverSelector)) document.body.classList.remove('cursor-hover');
    });

    document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hide'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-hide'));
  }

  initCustomCursor();

  /* =====================================================================
     DECRYPT / SCRAMBLE HEADING REVEAL
     Section headings resolve from random glyphs into real text as they
     scroll into view — a small nod to the terminal aesthetic. Skips
     entirely for prefers-reduced-motion (headings just appear normally).
  ===================================================================== */
  function initDecryptHeadings() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const GLYPHS = '!<>-_\\/[]{}—=+*^?#$%&01';
    const headings = document.querySelectorAll('.section-head h2');

    function scramble(el) {
      const original = el.textContent;
      const length = original.length;
      let frame = 0;
      const totalFrames = 24;

      el.setAttribute('aria-label', original);
      const interval = setInterval(() => {
        frame++;
        const revealCount = Math.floor((frame / totalFrames) * length);
        let out = '';
        for (let i = 0; i < length; i++) {
          const ch = original[i];
          if (ch === ' ') { out += ' '; continue; }
          out += i < revealCount ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = out;
        if (frame >= totalFrames) {
          el.textContent = original;
          clearInterval(interval);
        }
      }, 28);
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          scramble(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    headings.forEach(h => io.observe(h));
  }

  initDecryptHeadings();

  /* =====================================================================
     SCROLL TO TOP
     Shows the button after scrolling past the hero, hides it near the
     top. Respects prefers-reduced-motion for the scroll behavior.
  ===================================================================== */
  function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const toggle = () => {
      btn.classList.toggle('visible', window.scrollY > 480);
    };
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  initScrollTop();

  /* =====================================================================
     SCROLL TO TOP
     Button fades in once the visitor has scrolled past the hero, and
     smooth-scrolls back to top on click.
  ===================================================================== */
  function initScrollTopButton() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function toggle() {
      btn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
    }
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  initScrollTopButton();

  /* ---------- footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state + mobile toggle ---------- */
  const nav = document.querySelector('.nav');
  const navToggle = document.getElementById('navToggle');

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('.nav-links a, .nav-cta').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* =====================================================================
     PROJECTS — single source of truth.

     To add a new project later: copy the template below, fill it in,
     and push a new object into this array. Nothing else needs to change —
     the card in the Projects section AND the terminal's `projects`
     command both render from this same array.

     TEMPLATE:
     {
       id: 'short-slug',
       title: 'Project Name',
       date: '2026',
       tags: ['Tech', 'Tech', 'Tech'],
       description: 'One or two sentences on what it does.',
       detailLabel: 'Technical call',
       detail: 'The one interesting decision/tradeoff you made building it.',
       github: 'https://github.com/you/repo',
       live: '',              // optional — live demo URL, leave '' if none
       visual: 'chart'        // 'chart' | 'network' | 'grid' | 'code' (fallback)
     }
  ===================================================================== */
  const projects = [
    {
      id: 'titanic',
      title: 'Titanic Survival Prediction',
      date: '2026',
      tags: ['Python', 'Pandas', 'Scikit-Learn'],
      description: 'A classification model predicting Titanic passenger survival — cleaned and explored the raw dataset, engineered features, then compared logistic regression against decision trees.',
      detailLabel: 'Technical call',
      detail: 'feature engineering on missing age/cabin data mattered more than model choice — tuning that step took accuracy from the mid-70s to <strong>80%+</strong>.',
      github: 'https://github.com/abdulhadi128740-oss/Titanic-Project',
      live: '',
      visual: 'chart'
    },
    {
      id: 'donor-dsa',
      title: 'Donor-DSA — Blood Bank Management System',
      date: '2025',
      tags: ['C++', 'OOP', 'Data Structures'],
      description: 'Refactored a C++ blood bank system from a working prototype to an industry-standard build — full OOP redesign, safer memory handling, and real input validation.',
      detailLabel: 'Technical call',
      detail: 'replaced raw pointers with <code>std::unique_ptr</code> throughout to close a class of memory-leak bugs, and added blood-type compatibility logic as a first-class rule rather than a hardcoded check.',
      github: 'https://github.com/abdulhadi128740-oss/Donor-DSA',
      live: '',
      visual: 'network'
    },
    {
      id: 'wip-next',
      title: 'Next Build — In Progress',
      date: '2026',
      tags: ['Coming Soon'],
      description: 'One of three next builds — a Unity roguelike, a recipe app (Chefolio), or a full MERN project — is currently in development. This card is a placeholder; it\'ll be swapped for the real thing (with actual code, screenshots, and technical detail) as soon as there\'s something real to show.',
      detailLabel: 'Status',
      detail: 'placeholder card, not a finished project — check back soon.',
      github: 'https://github.com/abdulhadi128740-oss',
      live: '',
      visual: 'network'
    }

    // 👉 replace the card above with real Unity roguelike / Chefolio / MERN details when ready
  ];

  function projectVisualSVG(type) {
    switch (type) {
      case 'chart':
        return `<svg viewBox="0 0 400 240" class="project-svg" aria-hidden="true">
          <line x1="30" y1="200" x2="370" y2="200" class="axis"/>
          <line x1="30" y1="30" x2="30" y2="200" class="axis"/>
          <polyline class="curve curve-a" points="30,190 80,150 130,160 180,100 230,110 280,60 330,70 370,40"/>
          <polyline class="curve curve-b" points="30,195 80,185 130,140 180,150 230,90 280,95 330,50 370,55"/>
          <circle cx="330" cy="50" r="4" class="pt"/>
          <circle cx="370" cy="40" r="4" class="pt"/>
        </svg>`;
      case 'network':
        return `<svg viewBox="0 0 400 240" class="project-svg" aria-hidden="true">
          <rect x="60" y="40" width="90" height="60" rx="4" class="node"/>
          <rect x="250" y="40" width="90" height="60" rx="4" class="node"/>
          <rect x="60" y="150" width="90" height="60" rx="4" class="node"/>
          <rect x="250" y="150" width="90" height="60" rx="4" class="node"/>
          <line x1="150" y1="70" x2="250" y2="70" class="link"/>
          <line x1="105" y1="100" x2="105" y2="150" class="link"/>
          <line x1="295" y1="100" x2="295" y2="150" class="link"/>
          <line x1="150" y1="180" x2="250" y2="180" class="link"/>
        </svg>`;
      case 'grid': {
        let cells = '';
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 7; c++) {
            const isNode = (r + c) % 4 === 0;
            cells += `<rect x="${30 + c * 48}" y="${30 + r * 45}" width="38" height="33" rx="3" class="${isNode ? 'node' : 'grid-cell'}"/>`;
          }
        }
        return `<svg viewBox="0 0 400 240" class="project-svg" aria-hidden="true">${cells}</svg>`;
      }
      case 'code':
      default:
        return `<svg viewBox="0 0 400 240" class="project-svg" aria-hidden="true">
          <text x="36" y="110" class="code-glyph">&lt;/&gt;</text>
          <line x1="200" y1="70" x2="360" y2="70" class="axis"/>
          <line x1="200" y1="105" x2="330" y2="105" class="axis"/>
          <line x1="200" y1="140" x2="350" y2="140" class="axis"/>
          <line x1="200" y1="175" x2="280" y2="175" class="axis"/>
        </svg>`;
    }
  }

  function renderProjectCard(project, index) {
    const reverseClass = index % 2 === 1 ? ' reverse' : '';
    const liveLink = project.live
      ? `<a href="${project.live}" target="_blank" rel="noopener">Live demo →</a>`
      : '';
    return `
      <article class="project-card${reverseClass}">
        <div class="project-visual" data-visual="${project.id}">
          ${projectVisualSVG(project.visual)}
        </div>
        <div class="project-body">
          <div class="project-top">
            <h3>${project.title}</h3>
            <span class="project-date">${project.date}</span>
          </div>
          <p>${project.description}</p>
          <p class="project-detail"><span class="detail-label">${project.detailLabel}:</span> ${project.detail}</p>
          <div class="tag-row">
            ${project.tags.map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <div class="project-links">
            <a href="${project.github}" target="_blank" rel="noopener">View on GitHub →</a>
            ${liveLink}
          </div>
        </div>
      </article>
    `;
  }

  function renderProjects() {
    const container = document.getElementById('projectList');
    if (!container) return;
    container.innerHTML = projects.map(renderProjectCard).join('');
  }

  renderProjects();

  /* ---------- scroll reveal ---------- */
  const revealTargets = document.querySelectorAll(
    '.section-head, .about-copy, .about-facts, .project-card, .skill-group, .timeline-item, .contact-inner'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(el => io.observe(el));
  }

  /* =====================================================================
     INTERACTIVE TERMINAL
     Real command input instead of a scripted typing animation.
     Reuses the `projects` array above as its data source.
  ===================================================================== */
  function initTerminal() {
    const terminal = document.getElementById('terminal');
    const termLog = document.getElementById('termLog');
    const termInput = document.getElementById('termInput');
    if (!terminal || !termLog || !termInput) return;

    const history = [];
    let historyIndex = -1;

    const sectionAliases = ['about', 'projects', 'skills', 'experience', 'contact'];

    const commands = {
      help: () => [
        'available commands:',
        '&nbsp;&nbsp;whoami&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&mdash; who I am',
        '&nbsp;&nbsp;projects&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&mdash; list of projects',
        '&nbsp;&nbsp;skills&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&mdash; tech stack',
        '&nbsp;&nbsp;experience&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&mdash; work history',
        '&nbsp;&nbsp;contact&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&mdash; how to reach me',
        '&nbsp;&nbsp;cd &lt;section&gt;&nbsp;&nbsp;&nbsp;&mdash; jump to a section',
        '&nbsp;&nbsp;clear&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&mdash; clear this terminal',
      ],
      whoami: () => [
        'name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Abdulhadi Kamran',
        'role&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Full Stack Developer (MERN) in training',
        'focus&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;web &middot; data structures &middot; applied ML',
        'status&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;open to internships &amp; entry-level roles',
      ],
      projects: () => projects.flatMap(p => [
        `<span class="hl">${p.title}</span> (${p.date})`,
        `&nbsp;&nbsp;${p.tags.join(' &middot; ')}`,
        `&nbsp;&nbsp;&rarr; ${p.github}`,
        '&nbsp;',
      ]),
      skills: () => [
        'languages&nbsp;&nbsp;&nbsp;&nbsp;JavaScript &middot; Java &middot; C++ &middot; Python',
        'web&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;React &middot; Node.js &middot; Express &middot; MongoDB',
        'data &amp; ml&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Pandas &middot; Scikit-Learn &middot; Neural Networks',
        'tools&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Git &middot; AWS &middot; Cloud Computing',
      ],
      experience: () => [
        'Dec 2025 &ndash; Mar 2026&nbsp;&nbsp;&nbsp;Sales &amp; Marketing Intern, DefensIQ',
        'Mar 2022 &ndash; Feb 2024&nbsp;&nbsp;&nbsp;Product Research Consultant, Freelance',
        'Since Oct 2023&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BS Software Engineering, Riphah',
      ],
      contact: () => [
        'email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;abdulhadi128740@gmail.com',
        'linkedin&nbsp;&nbsp;/in/abdulhadikamran-a9330429a',
        'github&nbsp;&nbsp;&nbsp;&nbsp;@abdulhadi128740-oss',
      ],
    };

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function print(html, cls) {
      const p = document.createElement('p');
      p.className = 'term-line' + (cls ? ' ' + cls : '');
      p.innerHTML = html;
      termLog.appendChild(p);
      termLog.scrollTop = termLog.scrollHeight;
    }

    function runCommand(raw) {
      const trimmed = raw.trim();
      if (!trimmed) return;

      print(`<span class="prompt">visitor@recruiter</span><span class="colon">:~$</span> ${escapeHtml(trimmed)}`, 'echo');
      history.push(trimmed);
      historyIndex = history.length;

      const [cmd, ...args] = trimmed.split(/\s+/);
      const key = cmd.toLowerCase();

      if (key === 'clear') {
        termLog.innerHTML = '';
        return;
      }

      if (key === 'cd') {
        const target = (args[0] || '').toLowerCase();
        if (sectionAliases.includes(target)) {
          print(`&rarr; jumping to #${target}`);
          document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
        } else {
          print(`cd: no such section: ${escapeHtml(args[0] || '')}`);
          print(`try: cd ${sectionAliases.join(' | ')}`);
        }
        return;
      }

      if (commands[key]) {
        commands[key]().forEach(line => print(line));
        return;
      }

      print(`command not found: ${escapeHtml(cmd)}`);
      print(`type 'help' to see available commands`);
    }

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        runCommand(termInput.value);
        termInput.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          termInput.value = history[historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex++;
          termInput.value = history[historyIndex] || '';
        } else {
          historyIndex = history.length;
          termInput.value = '';
        }
      }
    });

    terminal.addEventListener('click', () => termInput.focus());
  }

  initTerminal();

  /* =====================================================================
     CONTACT FORM — client-side validation + Formspree submission.
     Validates on blur (so errors show as you leave a field) and again
     on submit. If every field is valid, it POSTs via fetch so the page
     never navigates away; the status line reports success/failure.
  ===================================================================== */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    if (!form || !status) return;

    const validators = {
      name: (v) => v.trim().length >= 2
        ? ''
        : 'Enter your name (at least 2 characters).',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
        ? ''
        : 'Enter a valid email address.',
      message: (v) => v.trim().length >= 10
        ? ''
        : 'Message should be at least 10 characters.',
    };

    function showError(field, msg) {
      const inputEl = form.querySelector(`#cf-${field}`);
      const errorEl = form.querySelector(`[data-error-for="cf-${field}"]`);
      if (errorEl) errorEl.textContent = msg;
      if (inputEl) inputEl.classList.toggle('invalid', Boolean(msg));
    }

    function validateField(field) {
      const inputEl = form.querySelector(`#cf-${field}`);
      if (!inputEl) return '';
      const msg = validators[field](inputEl.value);
      showError(field, msg);
      return msg;
    }

    Object.keys(validators).forEach(field => {
      const inputEl = form.querySelector(`#cf-${field}`);
      if (!inputEl) return;
      inputEl.addEventListener('blur', () => validateField(field));
      inputEl.addEventListener('input', () => {
        if (inputEl.classList.contains('invalid')) validateField(field);
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const messages = Object.keys(validators).map(validateField);
      const hasError = messages.some(Boolean);

      if (hasError) {
        status.textContent = 'Please fix the highlighted fields.';
        status.className = 'form-status error';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      status.textContent = 'Sending…';
      status.className = 'form-status';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          status.textContent = "Message sent — thanks! I'll get back to you soon.";
          status.className = 'form-status success';
          form.reset();
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        status.textContent = 'Something went wrong — email me directly at abdulhadi128740@gmail.com instead.';
        status.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  initContactForm();

});
