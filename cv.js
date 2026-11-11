const printCV = document.getElementById('print-cv');
printCV.hidden = false;
printCV.addEventListener('click', () => window.print());

const sectionLinks = [...document.querySelectorAll('.cv-sidebar nav a')];
const sections = sectionLinks.map(link => document.querySelector(link.hash));
function updateCVSection() {
    const current = [...sections].reverse().find(section => section.getBoundingClientRect().top <= 160) || sections[0];
    sectionLinks.forEach(link => {
        if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
}
let cvScrollQueued = false;
window.addEventListener('scroll', () => {
    if (cvScrollQueued) return;
    cvScrollQueued = true;
    requestAnimationFrame(() => { updateCVSection(); cvScrollQueued = false; });
}, { passive: true });
updateCVSection();
