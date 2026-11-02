/* A local, interactive research universe. Each galaxy is an accessible research entrance. */
(() => {
    'use strict';
    const stage = document.getElementById('playground-stage');
    if (!stage) return;
    const canvas = document.getElementById('research-canvas');
    const dialog = document.getElementById('experiment-dialog');
    const surface = document.getElementById('experiment-surface');
    const feedback = document.getElementById('experiment-feedback');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const storageKey = 'ruoyu-research-universe-v1';
    const topics = {
        play: { color: '#e1b47d', label: 'Games & play', title: 'What keeps us playing?', description: 'I explore player motivation, embodied interaction, and alternate reality games. This optional collection exercise introduces autonomy, competence, and relatedness: three lenses in my work on player motivation.', href: 'research.html?theme=games', works: [
            ['CHI 2024 · Extended abstract', 'Listen to the Sword', 'https://dl.acm.org/doi/full/10.1145/3613905.3648109'],
            ['DiGRA 2024', 'Motivational Landscapes of ARG Players', 'https://dl.digra.org/index.php/dl/article/view/2228'],
            ['Playable game & level editor', 'Chicken Frontier', 'games/chicken-frontier/']
        ] },
        create: { color: '#bba1f7', label: 'AI & co-creation', title: 'From intention to experience.', description: 'How can people shape a virtual world that feels personal? I study human–AI co-creation and emotional sanctuaries in VR. The three authored visual states here are an interactive sketch of intention and feedback.', href: 'research.html?theme=llm', works: [
            ['IUI 2026 · Full paper', 'From Prompt to Presence', 'https://dl.acm.org/doi/full/10.1145/3742413.3789067'],
            ['CHI Play 2024', 'Sketchar', 'https://dl.acm.org/doi/10.1145/3677102']
        ] },
        connect: { color: '#83cdc9', label: 'People & agents', title: 'A shared rhythm. Human agency.', description: 'I investigate how people and intelligent agents work together, including AI assistance for human moderation. The two waves are a playful metaphor: change your input, see its consequence, and find alignment.', href: 'research.html?theme=hai', works: [
            ['CHI 2026 · Full paper', 'AI of Oz', 'https://dl.acm.org/doi/full/10.1145/3772318.3791324'],
            ['CHI 2024 · Extended abstract', 'Virtual Triplets', 'https://dl.acm.org/doi/10.1145/3613905.3648143']
        ] },
        space: { color: '#8aaff6', label: 'VR & extended reality', title: 'Interaction beyond the screen.', description: 'I explore presence, spatial interaction, and collaboration in virtual environments. Move the depth control to pull this small scene apart: a simple sketch of how space can become part of an interface.', href: 'research.html?theme=vr', works: [
            ['CHI 2024 · Extended abstract', 'Virtual Triplets', 'https://dl.acm.org/doi/10.1145/3613905.3648143'],
            ['IUI 2026 · Full paper', 'From Prompt to Presence', 'https://dl.acm.org/doi/full/10.1145/3742413.3789067'],
            ['VR / XR research', 'Explore immersive environments and collaboration', 'research.html?theme=vr']
        ] }
    };
    const order = Object.keys(topics);
    let discovered = new Set(), active = null, returnFocus = null;
    let collected = new Set(), mood = 'calm', rhythm = 18, depth = 0;
    let paused = motion.matches, visible = true, frame = 0, time = 0, lastTime = 0;
    let width = 700, height = 650, pointer = { x: 0, y: 0 }, influence = { x: 0, y: 0 };
    let burst = 0;
    let hovered = null, pendingEntry = 0;
    let camera = { x: .5, y: .5, zoom: 1 };
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
        if (Array.isArray(saved)) discovered = new Set(saved.filter(k => order.includes(k)));
    } catch { /* Storage is optional. */ }
    let ctx;
    try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
    if (!ctx) document.querySelector('.canvas-fallback').hidden = false;

    function announce(message) { document.getElementById('exploration-status').textContent = message; }
    function updateProgress() {
        document.getElementById('discovery-count').textContent = `${discovered.size} / 4`;
        document.querySelectorAll('[data-open]').forEach(el => {
            const done = discovered.has(el.dataset.open);
            el.classList.toggle('discovered', done);
            if (el.tagName === 'BUTTON') el.setAttribute('aria-label', `${done ? 'Revisit' : 'Explore'} ${topics[el.dataset.open].label}${done ? ', discovered' : ''}`);
        });
        const complete = discovered.size === 4;
        document.getElementById('completion-actions').hidden = !complete;
        document.getElementById('passport-note').textContent = complete ? 'Four galaxies connected. Your star chart is ready.' : 'Follow a galaxy. Find a new perspective.';
        stage.classList.toggle('all-discovered', complete);
    }
    function complete(key, message) {
        feedback.textContent = message;
        if (discovered.has(key)) return;
        discovered.add(key); burst = 1;
        try { sessionStorage.setItem(storageKey, JSON.stringify([...discovered])); } catch { /* Optional persistence. */ }
        updateProgress();
        announce(`${topics[key].label} explored. ${discovered.size} of 4 galaxies. ${discovered.size === 4 ? 'Your star chart is ready to save.' : ''}`);
        draw();
    }
    function element(tag, cls, text) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (text) el.textContent = text;
        return el;
    }
    function intro(title, hint) {
        surface.append(element('p', 'experiment-prompt', title), element('p', 'experiment-hint', hint));
    }
    function renderPlay() {
        intro('A reason to keep playing.', 'Collect the three motivations. There is no timer, and no wrong order.');
        const field = element('div', 'play-targets');
        [['Choice', 'Autonomy: having a say in how you play.'], ['Mastery', 'Competence: seeing yourself become more capable.'], ['Connection', 'Relatedness: feeling connected to others.']].forEach(([label, note]) => {
            const btn = element('button', 'play-target', label); btn.type = 'button';
            btn.setAttribute('aria-pressed', String(collected.has(label)));
            btn.addEventListener('click', () => {
                collected.add(label); btn.setAttribute('aria-pressed', 'true'); feedback.textContent = note;
                if (collected.size === 3) complete('play', 'Autonomy, competence, relatedness. Three motivations collected.');
            }); field.append(btn);
        }); surface.append(field);
    }
    function renderCreate() {
        intro('What should a world feel like?', 'Choose an intention and watch the form respond.');
        const sculpture = element('div', 'mood-sculpture'); sculpture.dataset.mood = mood; sculpture.setAttribute('aria-hidden', 'true');
        const choices = element('div', 'mood-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'World intention');
        ['calm', 'wonder', 'focus'].forEach(value => {
            const btn = element('button', '', value[0].toUpperCase() + value.slice(1)); btn.type = 'button'; btn.setAttribute('aria-pressed', String(value === mood));
            btn.addEventListener('click', () => {
                mood = value; sculpture.dataset.mood = value;
                choices.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
                complete('create', `${btn.textContent}: your intention changes the form. Try another to compare.`);
            }); choices.append(btn);
        }); surface.append(sculpture, choices);
    }
    function wavePath(phase) {
        let d = '';
        for (let x = 0; x <= 360; x += 4) d += `${x ? 'L' : 'M'}${x} ${70 + Math.sin(x / 39 + phase) * 31} `;
        return d;
    }
    function renderConnect() {
        intro('Find a shared rhythm.', 'Slide your signal until the two waves align. The darker line is yours.');
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 360 140'); svg.classList.add('wave-view'); svg.setAttribute('aria-hidden', 'true');
        const reference = document.createElementNS(ns, 'path'); reference.setAttribute('d', wavePath(0)); reference.classList.add('wave-reference');
        const yours = document.createElementNS(ns, 'path'); yours.classList.add('wave-player'); svg.append(reference, yours);
        const label = element('label', 'tuning-label', 'Your signal'); label.htmlFor = 'rhythm-tuner';
        const output = element('span', '', ''); label.append(output);
        const input = element('input'); input.id = 'rhythm-tuner'; input.type = 'range'; input.min = '0'; input.max = '100'; input.value = rhythm; input.step = '1';
        const update = (user) => {
            rhythm = Number(input.value); const distance = Math.abs(rhythm - 58);
            yours.setAttribute('d', wavePath((rhythm - 58) / 20)); output.textContent = distance <= 3 ? 'In sync' : distance < 15 ? 'Getting closer' : 'Out of phase';
            input.setAttribute('aria-valuetext', `${rhythm}, ${output.textContent}`);
            if (user && distance <= 3) complete('connect', 'In sync. Small inputs, visible consequences, shared understanding.');
        };
        input.addEventListener('input', () => update(true)); update(false); surface.append(svg, label, input);
    }
    function renderSpace() {
        intro('Give the interface some space.', 'Move from a flat composition into a layered scene.');
        const scene = element('div','depth-scene'), world = element('div','depth-world');
        scene.setAttribute('aria-hidden','true');
        ['Environment','Shared space','Your perspective'].forEach(name=>world.append(element('div','depth-plane',name)));
        scene.append(world);
        const label=element('label','tuning-label','Scene depth');label.htmlFor='depth-control';
        const output=element('span');label.append(output);
        const input=element('input');input.type='range';input.id='depth-control';input.min='0';input.max='100';input.value=depth;
        const update=user=>{depth=Number(input.value);world.style.setProperty('--depth',depth*.65);output.textContent=depth<20?'Flat':depth<65?'Opening up':'Spatial';input.setAttribute('aria-valuetext',`${depth}, ${output.textContent}`);if(user)feedback.textContent=depth>65?'Depth becomes part of the interaction. Explore the work on presence and collaboration.':'Keep adjusting to see the relationship between the layers.';};
        input.addEventListener('input',()=>update(true));update(false);surface.append(scene,label,input);
    }
    const renderers = { play: renderPlay, create: renderCreate, connect: renderConnect, space: renderSpace };
    function openTopic(key, trigger) {
        if (!topics[key]) return;
        if (typeof dialog.showModal !== 'function') { window.location.href = topics[key].href; return; }
        active = key; const topic = topics[key];
        if (!dialog.open) returnFocus = trigger || document.activeElement;
        dialog.style.setProperty('--topic-color', topic.color);
        document.getElementById('lab-category').textContent = topic.label;
        document.getElementById('experiment-title').textContent = topic.title;
        document.getElementById('experiment-description').textContent = topic.description;
        document.getElementById('experiment-more').href = topic.href;
        document.getElementById('experiment-more').textContent = 'All research in this galaxy ↗';
        surface.replaceChildren(); feedback.textContent = 'An optional interaction sketch. The research is ready to explore.';
        renderers[key]();
        const works = document.getElementById('experiment-works'); works.replaceChildren();
        topic.works.forEach(([venue, title, href]) => {
            const link = element('a', 'experiment-work'); link.href = href;
            if (href.startsWith('https:') || href.endsWith('.pdf')) { link.target = '_blank'; link.rel = 'noopener'; }
            link.append(element('small', '', venue), element('strong', '', title + ' ↗')); works.append(link);
        });
        clearTimeout(pendingEntry);
        stage.classList.add('is-travelling');
        stage.setAttribute('aria-busy','true');
        announce(`Entering the ${topic.label} galaxy.`);
        const reveal=()=>{
            pendingEntry=0;
            if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}
            complete(key,'An optional interaction sketch. The research is ready to explore.');
            stage.removeAttribute('aria-busy');dialog.scrollTop=0;document.getElementById('close-experiment').focus();draw();
        };
        if(dialog.open || paused || motion.matches || !ctx)reveal();else pendingEntry=setTimeout(reveal,550);
        draw();
    }
    document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (typeof dialog.showModal !== 'function') return;
        event.preventDefault(); openTopic(el.dataset.open, el);
    }));
    document.getElementById('begin-exploring').addEventListener('click', event => openTopic(order.find(k => !discovered.has(k)) || 'play', event.currentTarget));
    document.getElementById('next-experiment').addEventListener('click', () => {
        const next = order.find(k => k !== active && !discovered.has(k)) || order[(order.indexOf(active) + 1) % order.length];
        openTopic(next);
    });
    document.getElementById('close-experiment').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    function returnToUniverse(){clearTimeout(pendingEntry);pendingEntry=0;stage.classList.remove('is-travelling');stage.removeAttribute('aria-busy');document.body.style.overflow='';active=null;returnFocus?.focus();draw();}
    dialog.addEventListener('close',returnToUniverse);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pendingEntry)returnToUniverse();});
    document.getElementById('reset-exploration').addEventListener('click', () => {
        discovered.clear(); collected.clear(); depth = 0; rhythm = 18; mood = 'calm'; burst = 0;
        try { sessionStorage.removeItem(storageKey); } catch { /* Optional persistence. */ }
        updateProgress(); announce('A fresh exploration. Choose any subject.'); draw();
        document.getElementById('begin-exploring').focus();
    });

    // Seeded spiral galaxies are rendered once into textures; the starfield stays lightweight.
    function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function galaxyTexture(seed, rgb, arms) {
        if(!ctx)return null;
        const layer=document.createElement('canvas');layer.width=1024;layer.height=1024;
        const p=layer.getContext('2d');if(!p)return null;
        const rand=random(seed), normal=()=>Math.sqrt(-2*Math.log(Math.max(.0001,rand())))*Math.cos(rand()*Math.PI*2);
        const tint=(alpha,bright=0)=>`rgba(${Math.min(255,rgb[0]+bright)},${Math.min(255,rgb[1]+bright)},${Math.min(255,rgb[2]+bright)},${alpha})`;
        p.translate(512,512);p.globalCompositeOperation='lighter';
        const halo=p.createRadialGradient(0,0,10,0,0,430);
        halo.addColorStop(0,tint(.1));halo.addColorStop(.4,tint(.035));halo.addColorStop(1,tint(0));p.fillStyle=halo;p.fillRect(-512,-512,1024,1024);
        for(let i=0;i<280;i++){
            const r=Math.pow(rand(),.7)*390,a=(i%arms)/arms*Math.PI*2+r*.017+normal()*.21;
            const x=Math.cos(a)*r,y=Math.sin(a)*r*.51,s=16+rand()*29;
            const cloud=p.createRadialGradient(x,y,0,x,y,s);cloud.addColorStop(0,tint(.035));cloud.addColorStop(1,tint(0));
            p.fillStyle=cloud;p.fillRect(x-s,y-s,s*2,s*2);
        }
        for(let i=0;i<10500;i++){
            const r=Math.pow(rand(),.72)*410,a=(i%arms)/arms*Math.PI*2+r*.017+normal()*(.085+r/3500);
            const x=Math.cos(a)*r+normal()*6,y=Math.sin(a)*r*.51+normal()*4,inner=1-r/420;
            p.globalAlpha=.18+rand()*.5;
            p.fillStyle=inner>.65?'#fff0db':tint(1,rand()*55);
            const size=.35+Math.pow(rand(),7)*1.6;
            p.beginPath();p.arc(x,y,size,0,Math.PI*2);p.fill();
        }
        p.globalAlpha=1;
        const core=p.createRadialGradient(0,0,0,0,0,100);
        core.addColorStop(0,'#fff6e8ee');core.addColorStop(.06,'#fff1dbbb');core.addColorStop(.2,tint(.5,70));core.addColorStop(.52,tint(.14));core.addColorStop(1,tint(0));
        p.save();p.scale(1,.58);p.fillStyle=core;p.fillRect(-110,-110,220,220);p.restore();
        return layer;
    }
    const galaxyData={
        play:{rgb:[224,165,99],angle:-.38,arms:2,seed:71},
        create:{rgb:[157,117,225],angle:.32,arms:3,seed:317},
        connect:{rgb:[91,182,187],angle:-.18,arms:2,seed:501},
        space:{rgb:[104,147,225],angle:.48,arms:4,seed:911}
    };
    for(const key of order)galaxyData[key].texture=galaxyTexture(galaxyData[key].seed,galaxyData[key].rgb,galaxyData[key].arms);
    const randomStar=random(2526);
    const stars=Array.from({length:780},()=>({x:randomStar(),y:randomStar(),r:.25+Math.pow(randomStar(),5)*1.2,a:.12+randomStar()*.65,phase:randomStar()*Math.PI*2}));
    function galaxyPosition(key){
        const mobile=width<=800;
        const positions=mobile?{play:[.26,.41],create:[.73,.54],connect:[.28,.66],space:[.72,.76]}:{play:[.24,.54],create:[.68,.34],connect:[.80,.68],space:[.48,.76]};
        const [x,y]=positions[key];
        return{x:x*width,y:y*height,r:mobile?Math.min(132,width*.28):Math.min(width*.125,185)};
    }
    function placeLabels(){
        document.querySelectorAll('.research-node').forEach(el=>{
            const pos=galaxyPosition(el.dataset.open);
            el.style.left=pos.x+'px';el.style.top=(pos.y+pos.r*.42)+'px';
            el.style.setProperty('--hit-size',pos.r*1.75+'px');
        });
    }
    function draw(){
        if(!ctx)return;
        const selected=active?galaxyPosition(active):null;
        const target={x:selected?selected.x/width:.5,y:selected?selected.y/height:.5,zoom:selected?1.65:1};
        if(paused||motion.matches){camera=target;}else{camera.x+=(target.x-camera.x)*.085;camera.y+=(target.y-camera.y)*.085;camera.zoom+=(target.zoom-camera.zoom)*.085;}
        ctx.fillStyle='#050913';ctx.fillRect(0,0,width,height);
        const ambient=ctx.createRadialGradient(width*.63,height*.52,0,width*.63,height*.52,width*.65);
        ambient.addColorStop(0,'#13203955');ambient.addColorStop(.5,'#0e132c44');ambient.addColorStop(1,'#05091300');ctx.fillStyle=ambient;ctx.fillRect(0,0,width,height);
        // Stars gently shift with the pointer; there is no scrolling or flashing backdrop.
        for(let i=0;i<stars.length;i++){
            const s=stars[i],x=s.x*width+influence.x*(4+s.r*9),y=s.y*height+influence.y*(3+s.r*7);
            const twinkle=i%9===0&&!paused? .82+Math.sin(time*.45+s.phase)*.18:1;
            ctx.globalAlpha=s.a*twinkle;ctx.fillStyle=i%7===0?'#91b5ed':'#d7e1f6';ctx.fillRect(x,y,s.r,s.r);
            if(s.r>1.2&&i%3===0){ctx.globalAlpha=s.a*.16;ctx.fillRect(x-3,y+.3,7,.5);ctx.fillRect(x+.3,y-3,.5,7);}
        }
        ctx.globalAlpha=1;
        ctx.save();ctx.translate(width*.5,height*.5);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x*width,-camera.y*height);
        const visited=[...discovered];
        if(visited.length>1){
            ctx.beginPath();visited.forEach((key,i)=>{const p=galaxyPosition(key);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
            if(visited.length===4)ctx.closePath();
            ctx.strokeStyle='#8da7db38';ctx.lineWidth=.7;ctx.setLineDash([2,7]);ctx.stroke();ctx.setLineDash([]);
        }
        for(const key of order){
            const p=galaxyPosition(key),g=galaxyData[key],selectedKey=active===key||hovered===key;
            ctx.save();ctx.translate(p.x+influence.x*7,p.y+influence.y*5);ctx.rotate(g.angle+time*.004);
            ctx.globalCompositeOperation='lighter';
            ctx.globalAlpha=active&&active!==key?.35:selectedKey?1:.85;
            if(g.texture)ctx.drawImage(g.texture,-p.r*1.27,-p.r*1.27,p.r*2.54,p.r*2.54);
            ctx.restore();
            if(selectedKey||discovered.has(key)){
                ctx.beginPath();ctx.arc(p.x,p.y,p.r*.74,Math.PI*1.10,Math.PI*1.42);ctx.strokeStyle=topics[key].color+(selectedKey?'88':'44');ctx.lineWidth=.7;ctx.stroke();
                ctx.beginPath();ctx.arc(p.x,p.y,p.r*.74,Math.PI*.10,Math.PI*.22);ctx.stroke();
            }
        }
        ctx.restore();ctx.globalAlpha=1;
    }
    function resize() {
        const rect=stage.getBoundingClientRect(); width=Math.max(1,rect.width);height=Math.max(1,rect.height);
        const ratio=Math.min(window.devicePixelRatio || 1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
        if(ctx) ctx.setTransform(ratio,0,0,ratio,0,0); placeLabels(); draw();
    }
    function tick(stamp) {
        frame=0; if(paused || !visible || document.hidden) { lastTime=0; return; }
        // 30 fps is sufficient for this quiet sculpture, including high-DPI mobile screens.
        if(stamp-lastTime>=32) {
            const delta=lastTime?Math.min((stamp-lastTime)/1000,.06):.033;lastTime=stamp;time+=delta;
            influence.x+=(pointer.x-influence.x)*.12;influence.y+=(pointer.y-influence.y)*.12;
            burst=Math.max(0,burst-delta*.7);draw();
        }
        frame=requestAnimationFrame(tick);
    }
    function start() { if(ctx && !frame && !paused && visible && !document.hidden) frame=requestAnimationFrame(tick); }
    function updateMotion() {
        const btn=document.getElementById('motion-toggle');btn.textContent=paused?'Resume motion':'Pause motion';btn.setAttribute('aria-pressed',String(paused));
        if(paused) { cancelAnimationFrame(frame);frame=0;lastTime=0; } else start();
    }
    stage.addEventListener('pointermove',event=>{
        if(paused || motion.matches) return;
        const rect=stage.getBoundingClientRect();pointer={x:(event.clientX-rect.left)/width-.5,y:(event.clientY-rect.top)/height-.5};
    },{passive:true});
    stage.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
    document.querySelectorAll('.research-node').forEach(link=>{
        const highlight=()=>{hovered=link.dataset.open;draw();};
        const clear=()=>{hovered=null;draw();};
        link.addEventListener('pointerenter',highlight);link.addEventListener('focus',highlight);
        link.addEventListener('pointerleave',clear);link.addEventListener('blur',clear);
    });
    document.getElementById('motion-toggle').addEventListener('click',()=>{paused=!paused;updateMotion();});
    motion.addEventListener('change',()=>{paused=motion.matches;updateMotion();draw();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
    if('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();},{threshold:0}).observe(stage);
    if('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize',resize);
    document.getElementById('save-art').addEventListener('click',()=>{
        if(!ctx) { announce('Star chart export is unavailable in this browser. Your discoveries are saved for this session.'); return; }
        camera={x:.5,y:.5,zoom:1};draw();
        const output=document.createElement('canvas');output.width=1600;output.height=1300;const pen=output.getContext('2d');
        if(!pen) return;
        pen.fillStyle='#050913';pen.fillRect(0,0,1600,1300);
        const scale=Math.min(1600/canvas.width,1050/canvas.height),offset=(1600-canvas.width*scale)/2;pen.drawImage(canvas,offset,0,canvas.width*scale,canvas.height*scale);
        const pixelRatio=canvas.width/width;
        for(const key of order){const p=galaxyPosition(key);pen.font='18px sans-serif';pen.fillStyle=topics[key].color;pen.textAlign='center';pen.fillText(topics[key].label,offset+p.x*pixelRatio*scale,(p.y+p.r*.55)*pixelRatio*scale);}
        pen.textAlign='left';pen.fillStyle='#e1e9fc';pen.font='42px sans-serif';pen.fillText('Four galaxies. A connected research universe.',80,1140);
        pen.fillStyle='#8e9fbd';pen.font='23px sans-serif';pen.fillText('Ruoyu Wen · HCI / Games / AI / XR',80,1195);pen.fillText('playerinmetaverse.tech',80,1240);
        output.toBlob(blob=>{
            if(!blob){announce('The image could not be saved. Please try again.');return;}
            const url=URL.createObjectURL(blob),link=document.createElement('a');link.download='ruoyu-wen-your-star-chart.png';link.href=url;document.body.append(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),60000);announce('Your star chart is ready to download.');
        },'image/png');
    });
    updateProgress();resize();updateMotion();
})();
