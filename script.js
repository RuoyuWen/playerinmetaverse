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
    navToggle.addEventListener('click', () => {
        const open = navMenu.classList.toggle('active');
        const bars = navToggle.querySelectorAll('.bar');
        if (bars.length === 3) {
            bars[0].style.transform = open ? 'rotate(45deg) translate(5px, 5px)' : 'none';
            bars[1].style.opacity = open ? '0' : '1';
            bars[2].style.transform = open ? 'rotate(-45deg) translate(6px, -6px)' : 'none';
        }
    });
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
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));

// ---------- Active nav link by page ----------
(function setActiveNav() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (href.startsWith('#')) return;
        const linkPage = href.split('/').pop();
        const active = linkPage === page || (href === 'index.html' && (page === '' || page === 'index.html'));
        link.classList.toggle('active', active);
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
    const allCount = filters.querySelector('[data-filter="all"] .count');
    if (allCount) allCount.textContent = pubs.length;

    filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        filters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        pubs.forEach(p => {
            const show = f === 'all' || (p.dataset.themes || '').split(' ').includes(f);
            p.classList.toggle('hide', !show);
        });
    });
}
