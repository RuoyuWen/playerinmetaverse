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
    const appearanceKey = 'ruoyu-universe-appearance-v1';
    const topics = {
        play: { color: '#e1b47d', label: 'Games & play', title: 'What keeps us playing?', description: 'I explore player motivation, embodied interaction, and alternate reality games. Shape this galaxy through autonomy, competence, and relatedness: three lenses in my work on player motivation.', href: 'research.html?theme=games', works: [
            ['CHI 2024 · Extended abstract', 'Listen to the Sword', 'https://dl.acm.org/doi/full/10.1145/3613905.3648109'],
            ['DiGRA 2024', 'Motivational Landscapes of ARG Players', 'https://dl.digra.org/index.php/dl/article/view/2228']
        ] },
        create: { color: '#bba1f7', label: 'AI & co-creation', title: 'From intention to experience.', description: 'How can people shape a virtual world that feels personal? I study human–AI co-creation and emotional sanctuaries in VR. The three authored visual states here are an interactive sketch of intention and feedback.', href: 'research.html?theme=llm', works: [
            ['IUI 2026 · Full paper', 'From Prompt to Presence', 'https://dl.acm.org/doi/full/10.1145/3742413.3789067'],
            ['CHI Play 2024', 'Sketchar', 'https://dl.acm.org/doi/10.1145/3677102']
        ] },
        connect: { color: '#83cdc9', label: 'People & agents', title: 'A shared rhythm. Human agency.', description: 'I investigate how people and intelligent agents work together, including AI assistance for human moderation. The two waves are a playful metaphor: change your input, see its consequence, and find alignment.', href: 'research.html?theme=hai', works: [
            ['CHI 2026 · Full paper', 'AI of Oz', 'https://dl.acm.org/doi/full/10.1145/3772318.3791324'],
            ['CHI 2024 · Extended abstract', 'Virtual Triplets', 'https://dl.acm.org/doi/10.1145/3613905.3648143']
        ] },
        space: { color: '#8aaff6', label: 'VR & extended reality', title: 'Interaction beyond the screen.', description: 'I explore presence, spatial interaction, and collaboration in virtual environments. Unfold this galaxy with the depth control: a simple sketch of how space can become part of an interface.', href: 'research.html?theme=vr', works: [
            ['CHI 2024 · Extended abstract', 'Virtual Triplets', 'https://dl.acm.org/doi/10.1145/3613905.3648143'],
            ['IUI 2026 · Full paper', 'From Prompt to Presence', 'https://dl.acm.org/doi/full/10.1145/3742413.3789067'],
            ['VR / XR research', 'Explore immersive environments and collaboration', 'research.html?theme=vr']
        ] }
    };
    const order = Object.keys(topics);
    let discovered = new Set(), active = null, returnFocus = null;
    let collected = new Set(), mood = 'calm', rhythm = 18, depth = 0;
    let previewCanvas = null, appearancePersistence = '';
    try {
        let stored=null;
        try { stored=localStorage.getItem(appearanceKey); } catch { /* Try session storage below. */ }
        if(!stored)try { stored=sessionStorage.getItem(appearanceKey); } catch { /* Storage is optional. */ }
        const saved = JSON.parse(stored || 'null');
        if (saved && typeof saved === 'object') {
            if (Array.isArray(saved.play)) collected = new Set(saved.play.filter(v => ['Choice','Mastery','Connection'].includes(v)));
            if (['calm','wonder','focus'].includes(saved.mood)) mood = saved.mood;
            if (Number.isFinite(saved.rhythm)) rhythm = Math.max(0,Math.min(100,saved.rhythm));
            if (Number.isFinite(saved.depth)) depth = Math.max(0,Math.min(100,saved.depth));
        }
    } catch { /* Personalisation also works without storage. */ }
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
    function appearanceSummary(key) {
        if(key==='play')return collected.size ? [...collected].map(v=>({Choice:'Open spiral arms',Mastery:'Luminous core',Connection:'Linked companion stars'}[v])).join(' · ') : 'An amber spiral. Choose what draws you to play.';
        if(key==='create')return {calm:'Calm · a soft lavender spiral',wonder:'Wonder · a rose nebula with five arms',focus:'Focus · a compact, icy-blue spiral'}[mood];
        if(key==='connect')return Math.abs(rhythm-58)<=3?'In sync · two stars share an aligned orbit':`Signal ${rhythm} · two stars trace different orbits`;
        return depth<20?'Flat · a narrow, edge-on galaxy':depth<65?'Opening up · the orbital layers separate':'Spatial · an open galaxy with layered orbits';
    }
    function saveAppearance() {
        const value=JSON.stringify({play:[...collected],mood,rhythm,depth});
        appearancePersistence='Changes last while this page is open.';
        try { sessionStorage.setItem(appearanceKey,value);appearancePersistence='Saved for this browser session.'; } catch { /* Optional persistence. */ }
        try { localStorage.setItem(appearanceKey,value);appearancePersistence='Saved in this browser.'; } catch { /* Session fallback remains available. */ }
    }
    function applyAppearance(key) {
        saveAppearance();
        const summary=appearanceSummary(key);
        feedback.textContent=summary+'. '+appearancePersistence;
        const caption=surface.querySelector('.galaxy-preview-caption');if(caption)caption.textContent=summary;
        updateAppearanceColors();draw();drawPreview();
    }
    function addGalaxyPreview(key) {
        const figure=element('figure','galaxy-preview');
        previewCanvas=element('canvas');previewCanvas.width=800;previewCanvas.height=360;
        previewCanvas.setAttribute('aria-hidden','true');
        figure.append(previewCanvas,element('figcaption','galaxy-preview-caption',appearanceSummary(key)));
        const actions=element('div','galaxy-preview-actions');
        const back=element('button','','View in my universe');back.type='button';back.addEventListener('click',()=>dialog.close());
        const reset=element('button','','Reset this galaxy');reset.type='button';
        reset.addEventListener('click',()=>{
            if(key==='play')collected.clear();if(key==='create')mood='calm';if(key==='connect')rhythm=18;if(key==='space')depth=0;
            surface.replaceChildren();renderers[key]();applyAppearance(key);surface.querySelector('.galaxy-preview-actions button:last-child').focus();
        });
        actions.append(back,reset);figure.append(actions);surface.append(figure);
    }
    function renderPlay() {
        intro('What draws you to play?', 'Mix your motivations. Each choice reshapes this galaxy. Tap again to undo.');
        addGalaxyPreview('play');
        const field = element('div', 'play-targets');
        [['Choice', 'Autonomy: having a say in how you play.'], ['Mastery', 'Competence: seeing yourself become more capable.'], ['Connection', 'Relatedness: feeling connected to others.']].forEach(([label, note]) => {
            const btn = element('button', 'play-target', label); btn.type = 'button';
            btn.setAttribute('aria-pressed', String(collected.has(label)));
            btn.addEventListener('click', () => {
                if(collected.has(label))collected.delete(label);else collected.add(label);
                btn.setAttribute('aria-pressed', String(collected.has(label)));applyAppearance('play');
                feedback.textContent=note+' '+(collected.has(label)?'Added to your galaxy. ':'Removed from your galaxy. ')+appearancePersistence;
            }); field.append(btn);
        }); surface.append(field);
    }
    function renderCreate() {
        intro('What should a world feel like?', 'Choose an intention. Its colour and shape become part of your universe.');
        addGalaxyPreview('create');
        const choices = element('div', 'mood-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', 'World intention');
        ['calm', 'wonder', 'focus'].forEach(value => {
            const btn = element('button', '', value[0].toUpperCase() + value.slice(1)); btn.type = 'button'; btn.setAttribute('aria-pressed', String(value === mood));
            btn.addEventListener('click', () => {
                mood = value;
                choices.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
                applyAppearance('create');
            }); choices.append(btn);
        }); surface.append(choices);
    }
    function wavePath(phase) {
        let d = '';
        for (let x = 0; x <= 360; x += 4) d += `${x ? 'L' : 'M'}${x} ${70 + Math.sin(x / 39 + phase) * 31} `;
        return d;
    }
    function renderConnect() {
        intro('Find a shared rhythm.', 'Tune the bright signal. The two companion stars move into alignment.');
        addGalaxyPreview('connect');
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
            if (user) applyAppearance('connect');
        };
        input.addEventListener('input', () => update(true)); update(false); surface.append(svg, label, input);
    }
    function renderSpace() {
        intro('Give the interface some space.', 'Unfold the galaxy from an edge-on view into layered orbits.');
        addGalaxyPreview('space');
        const label=element('label','tuning-label','Scene depth');label.htmlFor='depth-control';
        const output=element('span');label.append(output);
        const input=element('input');input.type='range';input.id='depth-control';input.min='0';input.max='100';input.value=depth;
        const update=user=>{depth=Number(input.value);output.textContent=depth<20?'Flat':depth<65?'Opening up':'Spatial';input.setAttribute('aria-valuetext',`${depth}, ${output.textContent}`);if(user)applyAppearance('space');};
        input.addEventListener('input',()=>update(true));update(false);surface.append(label,input);
    }
    const renderers = { play: renderPlay, create: renderCreate, connect: renderConnect, space: renderSpace };
    function openTopic(key, trigger) {
        if (!topics[key]) return;
        if (typeof dialog.showModal !== 'function') { window.location.href = topics[key].href; return; }
        active = key; const topic = topics[key];
        if (!dialog.open) returnFocus = trigger || document.activeElement;
        dialog.style.setProperty('--topic-color', appearanceColor(key));
        document.getElementById('lab-category').textContent = topic.label;
        document.getElementById('experiment-title').textContent = topic.title;
        document.getElementById('experiment-description').textContent = topic.description;
        document.getElementById('experiment-more').href = topic.href;
        document.getElementById('experiment-more').textContent = 'All research in this galaxy ↗';
        surface.replaceChildren(); feedback.textContent = 'Shape this galaxy. Your choices stay with you when you return home.';
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
            complete(key,'Shape this galaxy. Your choices stay with you when you return home.');
            stage.removeAttribute('aria-busy');dialog.scrollTop=0;document.getElementById('close-experiment').focus();draw();drawPreview();
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
        try { localStorage.removeItem(appearanceKey); } catch { /* Optional persistence. */ }
        try { sessionStorage.removeItem(appearanceKey); } catch { /* Optional persistence. */ }
        updateAppearanceColors();
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
    const customTextures=new Map();
    function appearanceColor(key){
        return key==='create'?{calm:'#bba1f7',wonder:'#efa4cd',focus:'#8fd5ef'}[mood]:topics[key].color;
    }
    function updateAppearanceColors(){
        document.querySelectorAll('[data-open]').forEach(el=>el.style.setProperty('--topic-color',appearanceColor(el.dataset.open)));
        if(active)dialog.style.setProperty('--topic-color',appearanceColor(active));
    }
    function appearanceTexture(key){
        const variant=key==='create'?mood:key==='play'&&collected.has('Choice')?'open':'default';
        if(variant==='default'||variant==='calm')return galaxyData[key].texture;
        const id=key+variant;
        if(!customTextures.has(id)){
            const g=galaxyData[key],rgb=variant==='wonder'?[225,123,176]:variant==='focus'?[104,192,221]:g.rgb;
            customTextures.set(id,galaxyTexture(g.seed,rgb,variant==='wonder'?5:variant==='open'?4:2));
        }
        return customTextures.get(id);
    }
    function paintGalaxy(pen,key,r){
        const g=galaxyData[key],color=appearanceColor(key),texture=appearanceTexture(key);
        pen.save();pen.rotate(g.angle+Math.sin(galaxyClocks[key]*(.035+order.indexOf(key)*.008))*.24);
        pen.globalCompositeOperation='lighter';
        pen.save();
        if(key==='space')pen.scale(1,.42+depth/100*.72);
        if(key==='create'&&mood==='focus')pen.scale(.77,.7);
        if(texture)pen.drawImage(texture,-r*1.27,-r*1.27,r*2.54,r*2.54);
        pen.restore();
        const glow=(x,y,size,tint)=>{
            const halo=pen.createRadialGradient(x,y,0,x,y,size);
            halo.addColorStop(0,'#fff9ef');halo.addColorStop(.12,tint);halo.addColorStop(.4,tint+'66');halo.addColorStop(1,tint+'00');
            pen.fillStyle=halo;pen.fillRect(x-size,y-size,size*2,size*2);
        };
        const orbit=(rx,ry,angle,alpha=.5)=>{pen.beginPath();pen.ellipse(0,0,rx,ry,angle,0,Math.PI*2);pen.strokeStyle=color;pen.lineWidth=.8;pen.save();pen.globalAlpha*=alpha;pen.stroke();pen.restore();};
        if(key==='play'){
            if(collected.has('Mastery')){glow(0,0,r*.28,'#ffd18a');orbit(r*.3,r*.15,0,.6);}
            if(collected.has('Connection')){
                orbit(r*.85,r*.39,0,.4);
                const pts=[-.6,1.5,3.3].map(a=>[Math.cos(a)*r*.85,Math.sin(a)*r*.39]);
                pen.beginPath();pts.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));pen.closePath();pen.strokeStyle='#e1b47d55';pen.lineWidth=.7;pen.stroke();
                pts.forEach(([x,y])=>glow(x,y,r*.075,'#ffe0a2'));
            }
        }
        if(key==='connect'){
            const phase=(rhythm-58)/100*1.8,separation=.05+Math.abs(rhythm-58)/100*.3;
            orbit(r*.78,r*.32,phase,.65);orbit(r*.78,r*.32,-phase,.45);
            glow(-r*.38,-r*separation,r*.12,'#a0eee4');glow(r*.38,r*separation,r*.12,'#b4c8ff');
        }
        if(key==='space'&&depth>0){
            const z=depth/100;
            orbit(r*.86,r*(.12+z*.38),-.12,z*.6);orbit(r*.65,r*(.1+z*.28),.35,z*.65);
            glow(r*.65,r*z*.24,r*.045,'#c1dbff');
        }
        pen.restore();
    }
    function drawPreview(){
        if(!active||!previewCanvas||!dialog.open)return;
        let pen;try{pen=previewCanvas.getContext('2d');}catch{return;}if(!pen)return;
        pen.clearRect(0,0,800,360);pen.save();pen.translate(400,180);paintGalaxy(pen,active,245);pen.restore();
    }
    const randomStar=random(2526);
    const stars=Array.from({length:2600},()=>({x:randomStar(),y:randomStar(),r:.35+Math.pow(randomStar(),4)*1.6,a:.24+randomStar()*.66,phase:randomStar()*Math.PI*2,depth:.2+randomStar()*.8,color:['#d7e1f6','#a8caff','#f6dbc0'][Math.floor(randomStar()*3)]}));
    const galaxyClocks=Object.fromEntries(order.map(key=>[key,0]));
    const galaxyLinks=[...document.querySelectorAll('.research-node')];
    const meteorRandom=random(828), meteors=[];
    let nextMeteor=1.2;
    function advanceUniverse(delta){
        // Hold a targeted galaxy still so pointer and keyboard users can select it easily.
        for(const key of order)if(key!==hovered&&key!==active)galaxyClocks[key]+=delta;
        for(let i=meteors.length-1;i>=0;i--){meteors[i].age+=delta;if(meteors[i].age>=meteors[i].life)meteors.splice(i,1);}
        if(time>=nextMeteor){
            meteors.push({x:.2+meteorRandom()*.65,y:.08+meteorRandom()*.4,age:0,life:1.4+meteorRandom()*.6,angle:.43+meteorRandom()*.2,speed:300+meteorRandom()*170});
            nextMeteor=time+4.5+meteorRandom()*5;
        }
    }
    function galaxyPosition(key){
        const mobile=width<=800;
        const positions=mobile?{play:[.26,.41],create:[.73,.54],connect:[.28,.66],space:[.72,.76]}:{play:[.24,.54],create:[.68,.34],connect:[.80,.68],space:[.48,.76]};
        const [x,y]=positions[key];
        const phase=order.indexOf(key)*1.7,t=galaxyClocks[key];
        const driftX=(Math.sin(t*.09+phase)-Math.sin(phase))*(mobile?5:17);
        const driftY=(Math.cos(t*.07+phase)-Math.cos(phase))*(mobile?3:11);
        return{x:x*width+driftX+influence.x*7,y:y*height+driftY+influence.y*5,r:mobile?Math.min(132,width*.28):Math.min(width*.125,185)};
    }
    function placeLabels(){
        galaxyLinks.forEach(el=>{
            const pos=galaxyPosition(el.dataset.open);
            el.style.left=pos.x+'px';el.style.top=(pos.y+pos.r*.42)+'px';
            el.style.setProperty('--hit-size',pos.r*1.75+'px');
        });
    }
    function drawMeteors(){
        // Decorative only: short, tapered trails, with no hit targets or flashing bursts.
        if(motion.matches)return;
        for(const meteor of meteors){
            const progress=meteor.age/meteor.life,fade=Math.sin(progress*Math.PI)*.8;
            const distance=meteor.age*meteor.speed*(width<=800?.65:1);
            const dx=Math.cos(meteor.angle),dy=Math.sin(meteor.angle);
            const x=meteor.x*width+distance*dx,y=meteor.y*height+distance*dy;
            const length=Math.min(distance, width<=800?100:190),tx=x-dx*length,ty=y-dy*length;
            const trail=ctx.createLinearGradient(tx,ty,x,y);
            trail.addColorStop(0,'#8cbdff00');trail.addColorStop(.7,'#9fcaff55');trail.addColorStop(1,'#e8f3ff');
            ctx.globalAlpha=fade;ctx.strokeStyle=trail;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
            ctx.fillStyle='#eaf5ff';ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }
    function draw(){
        if(!ctx)return;
        const selected=active?galaxyPosition(active):null;
        const target={x:selected?selected.x/width:.5,y:selected?selected.y/height:.5,zoom:selected?1.65:1};
        if(paused||motion.matches){camera=target;}else{camera.x+=(target.x-camera.x)*.085;camera.y+=(target.y-camera.y)*.085;camera.zoom+=(target.zoom-camera.zoom)*.085;}
        ctx.fillStyle='#050913';ctx.fillRect(0,0,width,height);
        const ambient=ctx.createRadialGradient(width*.63,height*.52,0,width*.63,height*.52,width*.65);
        ambient.addColorStop(0,'#13203955');ambient.addColorStop(.5,'#0e132c44');ambient.addColorStop(1,'#05091300');ctx.fillStyle=ambient;ctx.fillRect(0,0,width,height);
        // Depth layers drift at different speeds. Density scales with the visible area.
        const starCount=Math.min(stars.length,Math.max(700,Math.round(width*height/570)));
        for(let i=0;i<starCount;i++){
            const s=stars[i],x=((s.x*width+time*s.depth*.7+influence.x*(4+s.depth*17))%width+width)%width,y=((s.y*height+time*s.depth*.18+influence.y*(3+s.depth*12))%height+height)%height;
            const twinkle=.83+Math.sin(time*(.3+s.depth*.2)+s.phase)*.17;
            ctx.globalAlpha=s.a*twinkle;ctx.fillStyle=s.color;ctx.fillRect(x,y,s.r,s.r);
            if(s.r>1.6){ctx.globalAlpha=s.a*twinkle*.22;ctx.fillRect(x-4,y+s.r/2,9,.6);ctx.fillRect(x+s.r/2,y-4,.6,9);}
        }
        ctx.globalAlpha=1;
        drawMeteors();
        placeLabels();
        ctx.save();ctx.translate(width*.5,height*.5);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x*width,-camera.y*height);
        const visited=[...discovered];
        if(visited.length>1){
            ctx.beginPath();visited.forEach((key,i)=>{const p=galaxyPosition(key);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
            if(visited.length===4)ctx.closePath();
            ctx.strokeStyle='#8da7db38';ctx.lineWidth=.7;ctx.setLineDash([2,7]);ctx.stroke();ctx.setLineDash([]);
        }
        for(const key of order){
            const p=galaxyPosition(key),g=galaxyData[key],selectedKey=active===key||hovered===key;
            ctx.save();ctx.translate(p.x,p.y);
            ctx.globalAlpha=active&&active!==key?.35:selectedKey?1:.85;
            paintGalaxy(ctx,key,p.r);
            ctx.restore();
            if(selectedKey||discovered.has(key)){
                ctx.beginPath();ctx.arc(p.x,p.y,p.r*.74,Math.PI*1.10,Math.PI*1.42);ctx.strokeStyle=appearanceColor(key)+(selectedKey?'88':'44');ctx.lineWidth=.7;ctx.stroke();
                ctx.beginPath();ctx.arc(p.x,p.y,p.r*.74,Math.PI*.10,Math.PI*.22);ctx.stroke();
            }
        }
        ctx.restore();ctx.globalAlpha=1;drawPreview();
    }
    function resize() {
        const rect=stage.getBoundingClientRect(); width=Math.max(1,rect.width);height=Math.max(1,rect.height);
        const ratio=Math.min(window.devicePixelRatio || 1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
        if(ctx) ctx.setTransform(ratio,0,0,ratio,0,0); placeLabels(); draw();
    }
    function tick(stamp) {
        frame=0; if(paused || !visible || document.hidden) { lastTime=0; return; }
        // Cap decorative motion at 30 fps, including high-DPI mobile screens.
        if(stamp-lastTime>=32) {
            const delta=lastTime?Math.min((stamp-lastTime)/1000,.06):.033;lastTime=stamp;time+=delta;
            influence.x+=(pointer.x-influence.x)*.12;influence.y+=(pointer.y-influence.y)*.12;
            burst=Math.max(0,burst-delta*.7);advanceUniverse(delta);draw();
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
        for(const key of order){const p=galaxyPosition(key);pen.font='18px sans-serif';pen.fillStyle=appearanceColor(key);pen.textAlign='center';pen.fillText(topics[key].label,offset+p.x*pixelRatio*scale,(p.y+p.r*.55)*pixelRatio*scale);}
        pen.textAlign='left';pen.fillStyle='#e1e9fc';pen.font='42px sans-serif';pen.fillText('A research universe, shaped by you.',80,1140);
        pen.fillStyle='#8e9fbd';pen.font='23px sans-serif';pen.fillText('Ruoyu Wen · HCI / Games / AI / XR',80,1195);pen.fillText('playerinmetaverse.tech',80,1240);
        output.toBlob(blob=>{
            if(!blob){announce('The image could not be saved. Please try again.');return;}
            const url=URL.createObjectURL(blob),link=document.createElement('a');link.download='ruoyu-wen-your-star-chart.png';link.href=url;document.body.append(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),60000);announce('Your star chart is ready to download.');
        },'image/png');
    });
    updateAppearanceColors();updateProgress();resize();updateMotion();
})();
