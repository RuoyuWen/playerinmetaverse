// A small exploration game for browsing the portfolio. No API or study app is used.
(() => {
    'use strict';
    const map = document.getElementById('world-map');
    if (!map) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const storageKey = 'ruoyu-portfolio-exploration-v1';
    const places = {
        games: {
            x: 29, y: 35, name: 'Game Arcade', kicker: 'Games & play',
            title: 'Play is a way of knowing.',
            description: 'What makes people curious enough to keep playing? My work explores player motivation, alternate reality games, and embodied ways to interact.',
            works: [
                ['CHI 2024 · Extended Abstract', 'Listen to the Sword', 'Breathing and spatial audio as interactions for Wuxia games.', 'https://dl.acm.org/doi/full/10.1145/3613905.3648109'],
                ['DiGRA 2024', 'Motivational Landscapes of ARG Players', 'Understanding player motivation through Self-Determination Theory.', 'https://dl.digra.org/index.php/dl/article/view/2228']
            ], more: 'More games research', href: 'research.html?theme=games'
        },
        ai: {
            x: 69, y: 35, name: 'AI Lab', kicker: 'Generative AI',
            title: 'From a prompt to a possibility.',
            description: 'I explore how generative AI can help people create personal worlds, characters, and stories, with people participating in the creative process.',
            works: [
                ['IUI 2026 · Full Paper', 'From Prompt to Presence', 'Co-creating personalised emotional sanctuaries in VR with generative AI.', 'https://dl.acm.org/doi/full/10.1145/3742413.3789067'],
                ['CHI Play 2024', 'Sketchar', 'Supporting character design and illustration prototyping with generative AI.', 'https://dl.acm.org/doi/10.1145/3677102']
            ], more: 'More AI research', href: 'research.html?theme=llm'
        },
        interaction: {
            x: 26, y: 79, name: 'Interaction Studio', kicker: 'Human–agent interaction',
            title: 'An agent. A person. A connection.',
            description: 'How do people and intelligent agents work together? I investigate human–agent interaction, AI-assisted research, and collaboration in virtual reality.',
            works: [
                ['CHI 2026 · Full Paper', 'AI of Oz', 'AI assistance for human moderation in Wizard of Oz studies.', 'https://dl.acm.org/doi/full/10.1145/3772318.3791324'],
                ['CHI 2024 · Extended Abstract', 'Virtual Triplets', 'Mixed-modal synchronous and asynchronous collaboration in VR.', 'https://dl.acm.org/doi/10.1145/3613905.3648143']
            ], more: 'More interaction research', href: 'research.html?theme=hai'
        },
        journey: {
            x: 74, y: 81, name: 'Story House', kicker: 'About me',
            title: 'Game designer. Researcher. Always a player.',
            description: 'I’m Ruoyu Wen, a PhD candidate at the University of Canterbury. My path connects game design, human–agent interaction, and research across cultures.',
            works: [
                ['RESEARCH & PRACTICE', 'From game design to human-centered AI', 'Lead AI Game Designer at MICROFEEL and visiting researcher at the University of Augsburg.', 'experience.html'],
                ['EDUCATION', 'China → Sweden → New Zealand', 'Communication and Information Science at HUST, Game Design at Uppsala, and Product Design at Canterbury.', 'education.html']
            ], more: 'Read my full story', href: 'about.html'
        }
    };
    const order = Object.keys(places);
    const player = document.getElementById('player-token');
    const status = document.getElementById('exploration-status');
    const field = document.getElementById('field-content');
    const welcome = field.innerHTML;
    const next = document.getElementById('next-place');
    const colourArt = document.getElementById('island-colour');
    const sketchArt = map.querySelector('.island-art');
    const sketchDescription = sketchArt.alt;
    let colourReady = colourArt.complete && colourArt.naturalWidth > 0;
    const keys = new Set();
    let position = { x: 50, y: 52 }, target = null, active = null, frame = null, previousTime = 0, toastTimer;
    let visited = new Set();
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
        if (Array.isArray(saved)) visited = new Set(saved.filter(key => Object.hasOwn(places, key)));
    } catch { /* Exploration also works with browser storage disabled. */ }
    function save() {
        try { sessionStorage.setItem(storageKey, JSON.stringify([...visited])); } catch { /* Optional session progress. */ }
    }
    function renderPlayer() {
        player.style.left = `${position.x}%`;
        player.style.top = `${position.y}%`;
    }
    function updateReward() {
        const unlocked = visited.size === order.length && colourReady;
        map.classList.toggle('is-complete', unlocked);
        document.getElementById('colour-reward-note').hidden = !unlocked;
        document.getElementById('completion-title').textContent = unlocked ? 'Colour unlocked.' : 'All four places explored.';
        sketchArt.alt = unlocked ? 'The explored island is now in colour, with softly coloured buildings, green trees, and pale blue water.' : sketchDescription;
    }
    colourArt.addEventListener('load', () => {
        colourReady = true;
        updateReward();
        if (visited.size === order.length) status.textContent = 'All four places explored. The island is now in colour.';
    });
    colourArt.addEventListener('error', () => {
        colourReady = false;
        updateReward(); // Keep the original map usable if the colour asset cannot load.
    });
    function updateProgress() {
        const count = visited.size;
        document.getElementById('visited-count').textContent = `${count} / 4`;
        document.querySelector('.journey-progress').setAttribute('aria-valuenow', String(count));
        document.getElementById('journey-progress-fill').style.width = `${count * 25}%`;
        document.getElementById('journey-complete').hidden = count !== 4;
        updateReward();
        document.querySelectorAll('[data-visit]').forEach(button => {
            const key = button.dataset.visit;
            button.classList.toggle('collected', visited.has(key));
            button.setAttribute('aria-label', `${visited.has(key) ? 'Revisit' : 'Visit'} ${places[key].name}${visited.has(key) ? ', stamp collected' : ''}`);
        });
        document.querySelectorAll('[data-station]').forEach(station => station.classList.toggle('visited', visited.has(station.dataset.station)));
        next.textContent = count === 4 ? 'Visit another place →' : 'Explore the next place →';
    }
    function arrive(key) {
        if (active === key) return;
        const place = places[key];
        const firstVisit = !visited.has(key);
        active = key;
        visited.add(key);
        save();
        document.querySelector('.host-intro')?.remove();
        document.getElementById('field-kicker').textContent = place.kicker;
        document.getElementById('field-title').textContent = place.title;
        document.getElementById('field-description').textContent = place.description;
        const works = document.getElementById('field-works');
        works.replaceChildren();
        place.works.forEach(([venue, title, description, href]) => {
            const link = document.createElement('a');
            link.className = 'field-work'; link.href = href;
            if (href.startsWith('https://')) { link.target = '_blank'; link.rel = 'noopener'; }
            const label = document.createElement('small'); label.textContent = venue;
            const heading = document.createElement('strong'); heading.textContent = `${title} ↗`;
            const note = document.createElement('span'); note.textContent = description;
            link.append(label, heading, note); works.append(link);
        });
        const more = document.getElementById('field-more');
        more.textContent = `${place.more} ↗`; more.href = place.href;
        const notes = document.querySelector('.field-notes');
        notes.dataset.place = key;
        notes.scrollTop = 0;
        document.querySelectorAll('[data-station]').forEach(station => {
            const current = station.dataset.station === key;
            station.classList.toggle('current', current);
            if (current) station.setAttribute('aria-current', 'location');
            else station.removeAttribute('aria-current');
        });
        updateProgress();
        const rewardUnlocked = firstVisit && visited.size === order.length && colourReady;
        status.textContent = `${place.name}. ${place.title} ${firstVisit ? 'New exploration stamp collected.' : ''} ${visited.size} of 4 places explored. ${rewardUnlocked ? 'Colour unlocked. The island is now in colour.' : 'Read the related work in Your Field Notes.'}`;
        if (firstVisit) {
            const toast = document.getElementById('arrival-toast');
            toast.textContent = rewardUnlocked ? '✦ All four places explored — colour unlocked' : `✦ ${place.name} discovered`;
            toast.classList.add('visible'); clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('visible'), rewardUnlocked ? 6000 : 2400);
        }
    }
    function detectPlace() {
        const nearby = order.find(key => Math.hypot(position.x - places[key].x, (position.y - places[key].y) / 1.5) < 5);
        if (nearby) arrive(nearby);
    }
    function stopFrame() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; previousTime = 0; player.classList.remove('walking');
    }
    function animate(time) {
        frame = null;
        const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
        previousTime = time;
        let dx = 0, dy = 0;
        if (keys.has('left')) dx--; if (keys.has('right')) dx++;
        if (keys.has('up')) dy--; if (keys.has('down')) dy++;
        if (dx || dy) {
            target = null;
            const length = Math.hypot(dx, dy);
            position.x += dx / length * 24 * dt;
            position.y += dy / length * 36 * dt;
        } else if (target) {
            const deltaX = target.x - position.x, deltaY = (target.y - position.y) / 1.5;
            const distance = Math.hypot(deltaX, deltaY), step = 36 * dt;
            if (distance <= step || reduced.matches) {
                position = { x: target.x, y: target.y };
                const key = target.key; target = null;
                if (key) arrive(key);
            } else {
                position.x += deltaX / distance * step;
                position.y += deltaY / distance * step * 1.5;
            }
        }
        position.x = Math.max(10, Math.min(90, position.x));
        position.y = Math.max(13, Math.min(88, position.y));
        renderPlayer(); detectPlace();
        if (keys.size || target) {
            player.classList.toggle('walking', !reduced.matches);
            frame = requestAnimationFrame(animate);
        } else stopFrame();
    }
    function startFrame() { if (frame === null) { previousTime = 0; frame = requestAnimationFrame(animate); } }
    function travel(key) {
        if (!Object.hasOwn(places, key)) return;
        keys.clear(); target = { x: places[key].x, y: places[key].y, key };
        status.textContent = `Walking to ${places[key].name}.`;
        startFrame();
    }
    function nextPlace() { travel(order.find(item => !visited.has(item)) || order[(order.indexOf(active) + 1) % order.length]); }
    document.querySelectorAll('[data-station]').forEach(station => station.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); travel(station.dataset.station);
    }));
    document.querySelectorAll('[data-visit]').forEach(button => button.addEventListener('click', () => travel(button.dataset.visit)));
    document.getElementById('guide-button').addEventListener('click', nextPlace);
    next.addEventListener('click', nextPlace);
    map.addEventListener('click', event => {
        if (event.target.closest('a, button')) return;
        const rect = map.getBoundingClientRect(); keys.clear();
        target = { x: Math.max(10, Math.min(90, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(13, Math.min(88, (event.clientY - rect.top) / rect.height * 100)) };
        map.focus({ preventScroll: true }); startFrame();
    });
    const directions = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
    map.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        const direction = directions[event.key] || directions[event.key.toLowerCase()];
        if (!direction) return;
        event.preventDefault(); keys.add(direction); startFrame();
    });
    window.addEventListener('keyup', event => keys.delete(directions[event.key] || directions[event.key.toLowerCase()]));
    map.addEventListener('focusout', () => keys.clear());
    window.addEventListener('blur', () => { keys.clear(); target = null; stopFrame(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); target = null; stopFrame(); } });
    document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => {
        const direction = button.dataset.move;
        target = {
            x: Math.max(10, Math.min(90, position.x + (direction === 'left' ? -8 : direction === 'right' ? 8 : 0))),
            y: Math.max(13, Math.min(88, position.y + (direction === 'up' ? -12 : direction === 'down' ? 12 : 0)))
        }; startFrame();
    }));
    document.getElementById('restart-journey').addEventListener('click', () => {
        keys.clear(); target = null; active = null; visited.clear(); stopFrame();
        position = { x: 50, y: 52 }; field.innerHTML = welcome;
        document.querySelector('.field-notes').removeAttribute('data-place');
        document.querySelectorAll('[data-station]').forEach(station => { station.classList.remove('current'); station.removeAttribute('aria-current'); });
        clearTimeout(toastTimer); document.getElementById('arrival-toast').classList.remove('visible');
        renderPlayer(); updateProgress(); save(); next.textContent = 'Let’s start with games →';
        status.textContent = 'A fresh journey. Choose any place to explore.';
    });
    document.body.classList.add('exploration-ready');
    renderPlayer(); updateProgress();
    if (!visited.size) next.textContent = 'Let’s start with games →';
})();
