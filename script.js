document.addEventListener('DOMContentLoaded', () => {

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

  /* ---------- scroll reveal ---------- */
  const revealTargets = document.querySelectorAll(
    '.section-head, .about-text, .project-card, .skill-group, .timeline-item, .contact-inner'
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

  /* ---------- terminal typing signature ---------- */
  const cmdEl = document.getElementById('termCommand');
  const outEl = document.getElementById('termOutput');

  const command = 'whoami --verbose';
  const output = [
    'name       Abdulhadi Kamran',
    'role       Full Stack Developer (MERN) in training',
    'focus      web · data structures · applied ML',
    'status     open to internships & entry-level roles'
  ];

  if (prefersReducedMotion) {
    cmdEl.textContent = command;
    outEl.innerHTML = output.map(formatLine).join('\n');
  } else {
    typeText(cmdEl, command, 55, () => {
      revealOutputLines(outEl, output, 260);
    });
  }

  function formatLine(line) {
    const [label, ...rest] = line.split(/\s{2,}/);
    return `<span class="hl">${label.padEnd(10, ' ')}</span>${rest.join(' ')}`;
  }

  function typeText(el, text, speed, onDone) {
    let i = 0;
    (function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed);
      } else if (onDone) {
        onDone();
      }
    })();
  }

  function revealOutputLines(el, lines, delay) {
    let i = 0;
    (function step() {
      if (i < lines.length) {
        const p = document.createElement('div');
        p.innerHTML = formatLine(lines[i]);
        p.style.opacity = '0';
        p.style.transition = 'opacity 0.4s ease';
        el.appendChild(p);
        requestAnimationFrame(() => { p.style.opacity = '1'; });
        i++;
        setTimeout(step, delay);
      }
    })();
  }

});
