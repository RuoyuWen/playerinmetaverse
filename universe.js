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
    const appearanceKey = 'ruoyu-universe-interests-v1';
    // Titles, venues, and links come from the portfolio's publication list.
    // The visual descriptions below are interpretations for this map, not research findings.
    const projects = {
        sword: { title:'Listen to the Sword', venue:'CHI 2024 · Extended abstract', href:'https://dl.acm.org/doi/full/10.1145/3613905.3648109', description:'Using breathing and spatial audio for Wuxia games. This work explores embodied interaction through breath and sound.', visual:'Concentric light rings evoke breathing and spatial audio.', color:'#e9c48e', rgb:[224,180,110], arms:2, effect:'breath', seed:71 },
        arg: { title:'Motivational Landscapes of ARG Players', venue:'DiGRA 2024', href:'https://dl.digra.org/index.php/dl/article/view/2228', description:'Understanding alternate reality game players through Self-Determination Theory, with autonomy, competence, and relatedness as lenses on motivation.', visual:'Three connected stars represent autonomy, competence, and relatedness.', color:'#b8d6a2', rgb:[152,185,126], arms:3, effect:'triplets', seed:163 },
        light: { title:'I Light U Up', venue:'SIGGRAPH Asia 2024 · Art paper', href:'https://dl.acm.org/doi/full/10.1145/3680530.3695446', description:'Exploring an emergent narrative paradigm through light and generative AI.', visual:'A path of light links bright nodes, echoing the work’s light-based narrative theme.', color:'#f2b7ce', rgb:[225,137,177], arms:5, effect:'light', seed:283 },
        presence: { title:'From Prompt to Presence', venue:'IUI 2026 · Full paper', href:'https://dl.acm.org/doi/full/10.1145/3742413.3789067', description:'Co-creating personalised emotional sanctuaries in VR with generative AI. The work connects personalisation, immersive environments, and human–AI co-creation.', visual:'A soft violet halo encloses the galaxy like an emotional sanctuary.', color:'#bba1f7', rgb:[157,117,225], arms:3, effect:'sanctuary', seed:317 },
        sketchar: { title:'Sketchar', venue:'CHI Play 2024', href:'https://dl.acm.org/doi/10.1145/3677102', description:'Supporting character design and illustration prototyping using generative AI.', visual:'Fine, offset contours recall the iterative lines of a character sketch.', color:'#8fd5ef', rgb:[104,192,221], arms:2, effect:'sketch', seed:421 },
        oz: { title:'AI of Oz', venue:'CHI 2026 · Full paper', href:'https://dl.acm.org/doi/full/10.1145/3772318.3791324', description:'Enhancing Wizard of Oz studies in HCI with AI assistance for human moderation.', visual:'A central star and a supporting companion evoke a human moderator assisted by AI.', color:'#83cdc9', rgb:[91,182,187], arms:2, effect:'moderation', seed:501 },
        triplets: { title:'Virtual Triplets', venue:'CHI 2024 · Extended abstract', href:'https://dl.acm.org/doi/10.1145/3613905.3648143', description:'Mixed-modal synchronous and asynchronous collaboration with human–agent interaction in VR.', visual:'Three linked stars and a shared orbit echo the project’s collaborative theme.', color:'#9bbdf8', rgb:[104,147,225], arms:3, effect:'triplets', seed:613 },
        prompt: { title:'Can AI Prompt Humans?', venue:'CHI 2025 · Full paper', href:'https://scholar.google.com/citations?user=TssKzFIAAAAJ&hl=en', scholar:true, description:'Multimodal agents prompt players’ game actions and show consequences to raise sustainability awareness.', visual:'A branching light path evokes the connection between prompts, actions, and consequences.', color:'#c7d998', rgb:[167,194,117], arms:4, effect:'light', seed:727 },
        lingua: { title:'GenLinguaScape', venue:'ISMAR 2025 · Adjunct', href:'https://scholar.google.com/citations?user=TssKzFIAAAAJ&hl=en', scholar:true, description:'Enabling user-defined VR scenarios for communicative language practice.', visual:'Layered orbital spaces evoke the different VR scenarios used for language practice.', color:'#9bcce9', rgb:[119,175,213], arms:4, effect:'layers', seed:911 }
    };
    const topics = {
        play: {color:'#e1b47d',label:'Games & play',title:'Explore games through my work.',description:'Embodied play, player motivation, and emergent narrative.',href:'research.html?theme=games',works:['sword','arg','light']},
        create: {color:'#bba1f7',label:'AI & co-creation',title:'Explore co-creation through my work.',description:'Personal worlds, character design, and narratives shaped with generative AI.',href:'research.html?theme=llm',works:['presence','sketchar','light']},
        connect: {color:'#83cdc9',label:'People & agents',title:'Explore human–agent interaction.',description:'Human moderation, collaboration, and the relationship between prompts and actions.',href:'research.html?theme=hai',works:['oz','triplets','prompt']},
        space: {color:'#8aaff6',label:'VR & extended reality',title:'Explore immersive experiences.',description:'Emotional sanctuaries, collaboration, and language practice in virtual environments.',href:'research.html?theme=vr',works:['presence','triplets','lingua']}
    };
    // Explicit editorial matches: every visitor-facing interest has a research basis.
    const interests = {
        play: [
            {project:'sword',label:'Embodied play',hint:'Body, breath & sound',reason:'You chose embodied play. This project uses breathing and spatial audio as ways to interact with a Wuxia game.'},
            {project:'arg',label:'Player motivation',hint:'Why we keep playing',reason:'You chose player motivation. This study examines ARG players through autonomy, competence, and relatedness.'},
            {project:'light',label:'Interactive stories',hint:'Narratives that emerge',reason:'You chose interactive stories. This work explores emergent narrative through light and generative AI.'}
        ],
        create: [
            {project:'presence',label:'Personal worlds',hint:'Spaces that feel like you',reason:'You chose personal worlds. This project explores co-creating personalised emotional sanctuaries in VR with generative AI.'},
            {project:'sketchar',label:'Character design',hint:'From idea to illustration',reason:'You chose character design. Sketchar supports character design and illustration prototyping with generative AI.'},
            {project:'light',label:'Story creation',hint:'Light, AI & narrative',reason:'You chose story creation. This work connects light-based interaction with generative AI and emergent narrative.'}
        ],
        connect: [
            {project:'oz',label:'Human control',hint:'AI that supports people',reason:'You chose human control. AI of Oz investigates AI assistance for the human moderator in Wizard of Oz studies.'},
            {project:'triplets',label:'Working together',hint:'People & agents in VR',reason:'You chose working together. Virtual Triplets explores synchronous and asynchronous collaboration with human–agent interaction in VR.'},
            {project:'prompt',label:'AI guidance',hint:'Prompts, actions & effects',reason:'You chose AI guidance. This work studies agents prompting game actions and showing consequences to raise sustainability awareness.'}
        ],
        space: [
            {project:'presence',label:'Wellbeing',hint:'A personal sanctuary',reason:'You chose wellbeing. This project focuses on co-creating personalised emotional sanctuaries in VR.'},
            {project:'triplets',label:'Collaboration',hint:'Sharing a virtual space',reason:'You chose collaboration. Virtual Triplets explores mixed-modal collaboration and human–agent interaction in VR.'},
            {project:'lingua',label:'Language practice',hint:'Learning through scenarios',reason:'You chose language practice. GenLinguaScape enables user-defined VR scenarios for communicative language practice.'}
        ]
    };
    const questions={play:'What draws you to play?',create:'What would you like to create?',connect:'How should people and AI interact?',space:'What would you explore in VR?'};
    const order = Object.keys(topics);
    let discovered = new Set(), active = null, returnFocus = null;
    const selectedWorks = Object.fromEntries(order.map(key=>[key,null]));
    let previewCanvas = null, appearancePersistence = '';
    try {
        let stored=null;
        try { stored=localStorage.getItem(appearanceKey); } catch { /* Try session storage below. */ }
        if(!stored)try { stored=sessionStorage.getItem(appearanceKey); } catch { /* Optional storage. */ }
        const saved=JSON.parse(stored||'null');
        if(saved&&typeof saved==='object')for(const key of order)if(topics[key].works.includes(saved[key]))selectedWorks[key]=saved[key];
    } catch { /* A fresh map is usable even without saved choices. */ }
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
    function selectedProject(key){return projects[selectedWorks[key]]||null;}
    function selectedInterest(key){return interests[key].find(option=>option.project===selectedWorks[key])||null;}
    function appearanceSummary(key) {
        const work=selectedProject(key);
        return work ? work.visual : 'Choose an interest to discover a related work.';
    }
    function saveAppearance() {
        const value=JSON.stringify(selectedWorks);
        appearancePersistence='Changes last while this page is open.';
        try { sessionStorage.setItem(appearanceKey,value);appearancePersistence='Saved for this browser session.'; } catch { /* Optional persistence. */ }
        try { localStorage.setItem(appearanceKey,value);appearancePersistence='Saved in this browser.'; } catch { /* Session fallback. */ }
    }
    function updateProjectDetails(key){
        const work=selectedProject(key),topic=topics[key],interest=selectedInterest(key);
        dialog.querySelector('.notes-label').textContent=work?'Recommended for you':'Find your next discovery';
        document.getElementById('experiment-title').textContent=work?work.title:topic.title;
        document.getElementById('experiment-description').textContent=work?work.description:topic.description+' Choose what interests you on the left to find a related project.';
        const details=document.getElementById('experiment-works');details.replaceChildren();
        if(work){
            const link=element('a','experiment-work');link.href=work.href;link.target='_blank';link.rel='noopener';
            link.append(element('small','',work.venue),element('strong','',work.scholar?'Find this work on Google Scholar ↗':'Read this paper ↗'));
            const match=element('div','recommendation-reason');match.append(element('strong','','Why this work'),element('p','',interest.reason));
            details.append(match,link);
        } else details.append(element('p','project-visual-note','Your interest connects to a work in this galaxy. Try another choice to discover a different project.'));
    }
    function applyAppearance(key) {
        saveAppearance();
        const work=selectedProject(key);
        feedback.textContent=(work?'Recommended: '+work.title+'. ':'Interest cleared. ')+appearancePersistence;
        const caption=surface.querySelector('.galaxy-preview-caption');if(caption)caption.textContent=appearanceSummary(key);
        updateProjectDetails(key);updateAppearanceColors();draw();drawPreview();
    }
    function addGalaxyPreview(key) {
        const figure=element('figure','galaxy-preview');
        previewCanvas=element('canvas');previewCanvas.width=800;previewCanvas.height=360;
        previewCanvas.setAttribute('aria-hidden','true');
        figure.append(previewCanvas,element('figcaption','galaxy-preview-caption',appearanceSummary(key)));
        const actions=element('div','galaxy-preview-actions');
        const back=element('button','','View in my universe');back.type='button';back.addEventListener('click',()=>dialog.close());
        const reset=element('button','','Clear selection');reset.type='button';
        reset.addEventListener('click',()=>{
            selectedWorks[key]=null;
            surface.querySelectorAll('.project-choice').forEach(btn=>btn.setAttribute('aria-pressed','false'));
            applyAppearance(key);
        });
        actions.append(back,reset);figure.append(actions);surface.append(figure);
    }
    function renderTopic(key){
        intro(questions[key], 'Choose an interest. Discover a related work and reshape your galaxy.');
        addGalaxyPreview(key);
        const choices=element('div','project-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','Your interests in '+topics[key].label);
        for(const option of interests[key]){
            const id=option.project,btn=element('button','project-choice');btn.type='button';btn.dataset.project=id;
            btn.setAttribute('aria-pressed',String(selectedWorks[key]===id));btn.setAttribute('aria-controls','experiment-title experiment-description experiment-works');
            btn.append(element('strong','',option.label),element('small','',option.hint));
            btn.addEventListener('click',()=>{
                selectedWorks[key]=id;
                choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
                applyAppearance(key);
            });choices.append(btn);
        }
        surface.append(choices);updateProjectDetails(key);
    }
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
        surface.replaceChildren(); feedback.textContent = 'Your interests guide the recommendations. Try a different choice to explore more.';
        renderTopic(key);
        clearTimeout(pendingEntry);
        stage.classList.add('is-travelling');
        stage.setAttribute('aria-busy','true');
        announce(`Entering the ${topic.label} galaxy.`);
        const reveal=()=>{
            pendingEntry=0;
            if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}
            complete(key,selectedProject(key)?'Recommended: '+selectedProject(key).title+'.':'Your interests guide the recommendations. Try a different choice to explore more.');
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
        discovered.clear(); order.forEach(key=>selectedWorks[key]=null); burst = 0;
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
        return selectedProject(key)?.color || topics[key].color;
    }
    function updateAppearanceColors(){
        document.querySelectorAll('[data-open]').forEach(el=>{
            const key=el.dataset.open;el.style.setProperty('--topic-color',appearanceColor(key));
            const caption=el.querySelector('.node-copy > span');
            if(caption){
                if(!el.dataset.originalCaption)el.dataset.originalCaption=caption.textContent;
                caption.textContent=selectedProject(key)?.title||el.dataset.originalCaption;
            }
        });
        if(active)dialog.style.setProperty('--topic-color',appearanceColor(active));
    }
    function appearanceTexture(key){
        const work=selectedProject(key),id=selectedWorks[key];
        if(!work)return galaxyData[key].texture;
        if(!customTextures.has(id))customTextures.set(id,galaxyTexture(work.seed,work.rgb,work.arms));
        return customTextures.get(id);
    }
    function paintGalaxy(pen,key,r){
        const g=galaxyData[key],color=appearanceColor(key),texture=appearanceTexture(key),work=selectedProject(key),effect=work?.effect;
        pen.save();pen.rotate(g.angle+Math.sin(galaxyClocks[key]*(.035+order.indexOf(key)*.008))*.24);
        pen.globalCompositeOperation='lighter';
        pen.save();
        if(effect==='sketch')pen.scale(.8,.8);
        if(texture)pen.drawImage(texture,-r*1.27,-r*1.27,r*2.54,r*2.54);
        pen.restore();
        const glow=(x,y,size,tint)=>{
            const halo=pen.createRadialGradient(x,y,0,x,y,size);
            halo.addColorStop(0,'#fff9ef');halo.addColorStop(.12,tint);halo.addColorStop(.4,tint+'66');halo.addColorStop(1,tint+'00');
            pen.fillStyle=halo;pen.fillRect(x-size,y-size,size*2,size*2);
        };
        const orbit=(rx,ry,angle,alpha=.5)=>{pen.beginPath();pen.ellipse(0,0,rx,ry,angle,0,Math.PI*2);pen.strokeStyle=color;pen.lineWidth=.8;pen.save();pen.globalAlpha*=alpha;pen.stroke();pen.restore();};
        if(effect==='breath'){
            const breathe=1+Math.sin(time*.65)*.05;
            orbit(r*.45*breathe,r*.22*breathe,0,.7);orbit(r*.72*breathe,r*.35*breathe,0,.35);
        }
        if(effect==='triplets'){
            orbit(r*.85,r*.39,0,.4);
            const pts=[-.6,1.5,3.3].map(a=>[Math.cos(a)*r*.85,Math.sin(a)*r*.39]);
            pen.beginPath();pts.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));pen.closePath();pen.strokeStyle=color+'77';pen.lineWidth=.8;pen.stroke();
            pts.forEach(([x,y])=>glow(x,y,r*.08,color));
        }
        if(effect==='moderation'){
            glow(0,0,r*.19,color);orbit(r*.66,r*.3,0,.6);glow(r*.58,-r*.14,r*.09,'#c8d5ff');
        }
        if(effect==='sanctuary'){
            orbit(r*.78,r*.45,0,.4);glow(0,0,r*.36,color);
        }
        if(effect==='sketch'||effect==='layers'){
            orbit(r*.86,r*.48,-.12,.6);orbit(r*.65,r*.38,.35,.65);
            if(effect==='sketch')orbit(r*.72,r*.3,-.35,.4);
        }
        if(effect==='light'){
            const pts=[[-.7,.18],[-.32,-.2],[.1,.05],[.42,-.29],[.73,.08]];
            pen.beginPath();pts.forEach(([x,y],i)=>i?pen.lineTo(x*r,y*r):pen.moveTo(x*r,y*r));pen.strokeStyle=color+'aa';pen.lineWidth=1;pen.stroke();
            pts.forEach(([x,y],i)=>glow(x*r,y*r,r*(i===2?.1:.055),color));
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
            const p=galaxyPosition(key),selectedKey=active===key||hovered===key;
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
        for(const key of order){
            const p=galaxyPosition(key),x=offset+p.x*pixelRatio*scale,y=(p.y+p.r*.55)*pixelRatio*scale;
            pen.font='18px sans-serif';pen.fillStyle=appearanceColor(key);pen.textAlign='center';pen.fillText(topics[key].label,x,y);
            const work=selectedProject(key);if(work){pen.font='13px sans-serif';pen.fillText(work.title,x,y+23);}
        }
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
