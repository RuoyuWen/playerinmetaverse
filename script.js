// ============================================================
//  Ruoyu Wen — interaction layer
//  HCI principle throughout: feedback, direct manipulation,
//  progressive disclosure, respect for reduced-motion.
// ============================================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Mobile navigation ----------
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
    const setNavigation = (open) => {
        navMenu.classList.toggle('active', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        const bars = navToggle.querySelectorAll('.bar');
        if (bars.length === 3) {
            bars[0].style.transform = open ? 'rotate(45deg) translate(5px, 5px)' : 'none';
            bars[1].style.opacity = open ? '0' : '1';
            bars[2].style.transform = open ? 'rotate(-45deg) translate(6px, -6px)' : 'none';
        }
        // On narrow screens, closed navigation must also leave the tab order.
        navMenu.inert = window.matchMedia('(max-width: 720px)').matches && !open;
    };
    navToggle.addEventListener('click', () => setNavigation(!navMenu.classList.contains('active')));
    if (navToggle.tagName !== 'BUTTON') {
        navToggle.setAttribute('role', 'button');
        navToggle.tabIndex = 0;
        navToggle.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setNavigation(!navMenu.classList.contains('active'));
            }
        });
    }
    navMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNavigation(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navMenu.classList.contains('active')) {
            setNavigation(false);
            navToggle.focus();
        }
    });
    window.matchMedia('(max-width: 720px)').addEventListener('change', () => setNavigation(false));
    setNavigation(false);
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu?.classList.remove('active');
        navToggle?.querySelectorAll('.bar').forEach(b => { b.style.transform = 'none'; b.style.opacity = '1'; });
    });
});

// ---------- Page-in transition ----------
document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => document.body.classList.add('ready'));
});

// ---------- Navbar elevation on scroll ----------
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

// ---------- Progressive reveal ----------
if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); revealObserver.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));
    document.body.classList.add('motion-ready');
}

// ---------- Active nav link by page ----------
(function setActiveNav() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (href.startsWith('#')) return;
        if (href.includes('#') || href.includes('?')) return;
        const linkPage = href.split('/').pop();
        const active = linkPage === page || (href === 'index.html' && (page === '' || page === 'index.html'));
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
})();

// ---------- Pointer-reactive hero glow ----------
const hero = document.getElementById('hero');
if (hero && !reduceMotion) {
    hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        hero.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
}

// ---------- LLM-style streaming self-introduction ----------
const streamOut = document.getElementById('stream-out');
if (streamOut) {
    const lines = [
        ' a PhD candidate designing playful human–agent systems.',
        ' studying how AI agents can prompt — not replace — people.',
        ' a game designer turned HCI researcher (CHI, DiGRA, SIGGRAPH Asia).',
        ' building VR, alternate reality games, and LLM-driven worlds.',
        ' a player in the metaverse, between Christchurch and the world.'
    ];

    if (reduceMotion) {
        streamOut.textContent = lines[0];
    } else {
        let li = 0, ci = 0, deleting = false;
        const type = () => {
            const full = lines[li];
            streamOut.textContent = full.slice(0, ci);
            if (!deleting) {
                if (ci < full.length) { ci++; setTimeout(type, 26 + Math.random() * 36); }
                else { deleting = true; setTimeout(type, 2200); }
            } else {
                if (ci > 0) { ci--; setTimeout(type, 12); }
                else { deleting = false; li = (li + 1) % lines.length; setTimeout(type, 320); }
            }
        };
        setTimeout(type, 600);
    }
}

// ---------- Publication theme filter (direct manipulation) ----------
const filters = document.getElementById('pub-filters');
const pubList = document.getElementById('pub-list');
if (filters && pubList) {
    const pubs = Array.from(pubList.querySelectorAll('.pub'));
    const chips = Array.from(filters.querySelectorAll('.chip'));
    const status = document.createElement('p');
    status.className = 'filter-status';
    status.setAttribute('role', 'status');
    filters.after(status);
    const matches = (pub, theme) => theme === 'all' || (pub.dataset.themes || '').split(' ').includes(theme);
    chips.forEach(chip => {
        let count = chip.querySelector('.count');
        if (!count) {
            count = document.createElement('span');
            count.className = 'count';
            chip.append(count);
        }
        count.textContent = pubs.filter(pub => matches(pub, chip.dataset.filter)).length;
        chip.setAttribute('aria-controls', 'pub-list');
        chip.type = 'button';
    });
    function applyFilter(theme) {
        const selected = chips.find(chip => chip.dataset.filter === theme) || chips[0];
        const f = selected.dataset.filter;
        chips.forEach(chip => {
            const active = chip === selected;
            chip.classList.toggle('active', active);
            chip.setAttribute('aria-pressed', String(active));
        });
        pubs.forEach(p => {
            const show = matches(p, f);
            p.classList.toggle('hide', !show);
            p.hidden = !show;
        });
        const label = selected.childNodes[0].textContent.trim();
        const count = pubs.filter(pub => matches(pub, f)).length;
        status.textContent = `${count} ${count === 1 ? 'publication' : 'publications'} · ${label}`;
    }
    filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (btn && filters.contains(btn)) applyFilter(btn.dataset.filter);
    });
    applyFilter(new URLSearchParams(window.location.search).get('theme') || 'all');
}
