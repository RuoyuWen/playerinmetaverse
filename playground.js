/* Four small, local interaction studies. Research links never depend on completion. */
(() => {
    'use strict';
    const stage = document.getElementById('playground-stage');
    if (!stage) return;
    const canvas = document.getElementById('research-canvas');
    const dialog = document.getElementById('experiment-dialog');
    const surface = document.getElementById('experiment-surface');
    const feedback = document.getElementById('experiment-feedback');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const storageKey = 'ruoyu-research-playground-v1';
    const topics = {
        play: { color: '#b85376', label: 'Games & play', title: 'What keeps us playing?', description: 'I explore player motivation, embodied interaction, and alternate reality games. This little collection exercise introduces autonomy, competence, and relatedness: three lenses in my work on player motivation.', href: 'research.html?theme=games', works: [
            ['CHI 2024 · Extended abstract', 'Listen to the Sword', 'https://dl.acm.org/doi/full/10.1145/3613905.3648109'],
            ['DiGRA 2024', 'Motivational Landscapes of ARG Players', 'https://dl.digra.org/index.php/dl/article/view/2228'],
            ['Playable game & level editor', 'Chicken Frontier', 'games/chicken-frontier/']
        ] },
        create: { color: '#6563c5', label: 'Generative worlds', title: 'From intention to experience.', description: 'How can people shape a virtual world that feels personal? I study human–AI co-creation and emotional sanctuaries in VR. Here, three authored visual states offer a small sketch of that interaction; this demo does not call an AI model.', href: 'research.html?theme=llm', works: [
            ['IUI 2026 · Full paper', 'From Prompt to Presence', 'https://dl.acm.org/doi/full/10.1145/3742413.3789067'],
            ['CHI Play 2024', 'Sketchar', 'https://dl.acm.org/doi/10.1145/3677102']
        ] },
        connect: { color: '#25837e', label: 'People & agents', title: 'A shared rhythm. Human agency.', description: 'I investigate how people and intelligent agents work together, including AI assistance for human moderation. The two waves are a playful metaphor: change your input, see its consequence, and find alignment.', href: 'research.html?theme=hai', works: [
            ['CHI 2026 · Full paper', 'AI of Oz', 'https://dl.acm.org/doi/full/10.1145/3772318.3791324'],
            ['CHI 2024 · Extended abstract', 'Virtual Triplets', 'https://dl.acm.org/doi/10.1145/3613905.3648143']
        ] },
        meet: { color: '#a47432', label: 'The person behind it', title: 'A researcher. Always a player.', description: 'I’m Ruoyu Wen. My path connects communication and information science, game design, and HCI research. I bring the curiosity of a player into the systems I design and the questions I ask.', href: 'about.html', works: [
            ['Education', 'China → Sweden → New Zealand', 'education.html'],
            ['Research & practice', 'Game design, human–agent interaction, and VR', 'experience.html'],
            ['Curriculum vitae', 'Read my CV', 'Ruoyu_Wen_CV.pdf']
        ] }
    };
    const order = Object.keys(topics);
    let discovered = new Set(), active = null, returnFocus = null;
    let collected = new Set(), mood = 'calm', rhythm = 18, journey = 0;
    let paused = motion.matches, visible = true, frame = 0, time = 0, lastTime = 0;
    let width = 700, height = 650, pointer = { x: 0, y: 0 }, influence = { x: 0, y: 0 };
    let burst = 0;
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
        document.getElementById('passport-note').textContent = complete ? 'All four connected. This little sculpture is yours to keep.' : 'Four small experiments. Take your own route.';
        stage.classList.toggle('all-discovered', complete);
    }
    function complete(key, message) {
        feedback.textContent = message;
        if (discovered.has(key)) return;
        discovered.add(key); burst = 1;
        try { sessionStorage.setItem(storageKey, JSON.stringify([...discovered])); } catch { /* Optional persistence. */ }
        updateProgress();
        announce(`${topics[key].label} discovered. ${discovered.size} of 4. ${discovered.size === 4 ? 'Your exploration artwork is ready to save.' : ''}`);
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
    function renderMeet() {
        intro('Follow the thread.', 'Connect the journey in order: China, Sweden, then New Zealand.');
        const stops = element('div', 'journey-stops');
        const route = [['China', 'Communication & information'], ['Sweden', 'Game design'], ['New Zealand', 'HCI research']];
        [1, 0, 2].forEach(index => {
            const [country, subject] = route[index];
            const btn = element('button', '', country); btn.type = 'button'; btn.append(element('small', '', subject)); btn.setAttribute('aria-pressed', String(index < journey));
            btn.addEventListener('click', () => {
                if (index < journey) { feedback.textContent = `${country} · ${subject}`; return; }
                if (index !== journey) { feedback.textContent = `Start with ${route[journey][0]}. Each place adds a new perspective.`; return; }
                journey++; btn.setAttribute('aria-pressed', 'true'); feedback.textContent = `${country} · ${subject}`;
                if (journey === 3) complete('meet', 'A connected journey: communication, game design, and human–computer interaction.');
            }); stops.append(btn);
        }); surface.append(stops);
    }
    const renderers = { play: renderPlay, create: renderCreate, connect: renderConnect, meet: renderMeet };
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
        document.getElementById('experiment-more').textContent = key === 'meet' ? 'More about me ↗' : 'Explore the research ↗';
        surface.replaceChildren(); feedback.textContent = discovered.has(key) ? 'Already discovered. You can keep experimenting.' : '';
        renderers[key]();
        const works = document.getElementById('experiment-works'); works.replaceChildren();
        topic.works.forEach(([venue, title, href]) => {
            const link = element('a', 'experiment-work'); link.href = href;
            if (href.startsWith('https:') || href.endsWith('.pdf')) { link.target = '_blank'; link.rel = 'noopener'; }
            link.append(element('small', '', venue), element('strong', '', title + ' ↗')); works.append(link);
        });
        if (!dialog.open) { dialog.showModal(); document.body.style.overflow = 'hidden'; }
        dialog.scrollTop = 0; document.getElementById('close-experiment').focus(); draw();
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
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; active = null; returnFocus?.focus(); draw(); });
    document.getElementById('reset-exploration').addEventListener('click', () => {
        discovered.clear(); collected.clear(); journey = 0; rhythm = 18; mood = 'calm'; burst = 0;
        try { sessionStorage.removeItem(storageKey); } catch { /* Optional persistence. */ }
        updateProgress(); announce('A fresh exploration. Choose any subject.'); draw();
        document.getElementById('begin-exploring').focus();
    });

    // A lit parametric ribbon, drawn locally without an image or 3D dependency.
    const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
    const norm = a => { const n = Math.hypot(...a) || 1; return a.map(v => v/n); };
    const center = t => { const r = 1 + .31 * Math.cos(3*t); return [r*Math.cos(2*t), r*Math.sin(2*t), .54*Math.sin(3*t)]; };
    const segments = 150, sides = 16, mesh = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments * Math.PI*2, c = center(t), next = center(t + .001);
        const tangent = norm(next.map((v,k) => v-c[k]));
        const n = norm(cross(tangent, [0,0,1])), b = norm(cross(tangent,n));
        const row = [];
        for (let j = 0; j <= sides; j++) {
            const a = j/sides * Math.PI*2, normal = n.map((v,k) => v*Math.cos(a) + b[k]*Math.sin(a));
            row.push({ point: c.map((v,k) => v + normal[k]*.24), normal });
        } mesh.push(row);
    }
    function createMaterialRenderer() {
        const layer = document.createElement('canvas');
        let gl;
        try { gl = layer.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch { return null; }
        if (!gl) return null;
        const vertex = `attribute vec3 position; attribute vec3 normal; attribute float along;
            uniform vec2 angles; uniform vec2 dimensions; uniform float scale;
            varying vec3 n; varying float u;
            vec3 turn(vec3 p) { float cx=cos(angles.x),sx=sin(angles.x),cy=cos(angles.y),sy=sin(angles.y); vec3 q=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);return vec3(q.x*cy+q.z*sy,q.y,-q.x*sy+q.z*cy); }
            void main(){vec3 p=turn(position);n=turn(normal);u=along;float w=4.8-p.z;gl_Position=vec4(p.x*scale*9.6/dimensions.x,-p.y*scale*9.6/dimensions.y+0.06*w,-p.z*.5,w);}`;
        const fragment = `precision mediump float; varying vec3 n; varying float u; uniform float hue; uniform float complete;
            vec3 hsl(vec3 c){vec3 rgb=clamp(abs(mod(c.x*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return c.z+c.y*(rgb-.5)*(1.-abs(2.*c.z-1.));}
            void main(){vec3 normal=normalize(n);float light=max(0.,dot(normal,normalize(vec3(-.6,-.9,1.5))));float spec=pow(max(0.,dot(normal,normalize(vec3(-.35,-.5,1.8)))),32.);float h=hue+sin(u*6.28318)*mix(22.,95.,complete);vec3 col=hsl(vec3(h/360.,.34+light*.12,.30+light*.43));col=mix(col,vec3(.96,.97,1.),spec*.85);gl_FragColor=vec4(col,1.);}`;
        function shader(type, source) { const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Material unavailable');return s; }
        try {
            const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
            if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
            gl.useProgram(program);
            const data=[];
            for(let i=0;i<segments;i++)for(let j=0;j<sides;j++)for(const [a,b] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]])data.push(...mesh[a][b].point,...mesh[a][b].normal,a/segments);
            const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
            for(const [name,size,offset]of [['position',3,0],['normal',3,12],['along',1,24]]){const at=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,28,offset);}
            const uniforms={};for(const name of ['angles','dimensions','scale','hue','complete'])uniforms[name]=gl.getUniformLocation(program,name);
            gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
            return (ax,ay,scale,hue,complete) => {
                if(gl.isContextLost())return false;
                if(layer.width!==canvas.width || layer.height!==canvas.height){layer.width=canvas.width;layer.height=canvas.height;gl.viewport(0,0,layer.width,layer.height);}
                gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(uniforms.angles,ax,ay);gl.uniform2f(uniforms.dimensions,width,height);gl.uniform1f(uniforms.scale,scale);gl.uniform1f(uniforms.hue,hue);gl.uniform1f(uniforms.complete,complete?1:0);gl.drawArrays(gl.TRIANGLES,0,data.length/7);ctx.drawImage(layer,0,0,width,height);return true;
            };
        } catch { return null; }
    }
    const renderMaterial = ctx ? createMaterialRenderer() : null;
    function rotate(p, ax, ay) {
        const y = p[1]*Math.cos(ax)-p[2]*Math.sin(ax), z = p[1]*Math.sin(ax)+p[2]*Math.cos(ax);
        return [p[0]*Math.cos(ay)+z*Math.sin(ay), y, -p[0]*Math.sin(ay)+z*Math.cos(ay)];
    }
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0,0,width,height);
        const cx = width*.5, cy = height*.47, scale = Math.min(width*.21,height*.21);
        // Sparse orbital paths tie the artwork to its four entrances.
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(-.35);
        ctx.strokeStyle = '#6a78961b'; ctx.lineWidth = 1;
        for (const factor of [1.07,1.26]) { ctx.beginPath(); ctx.ellipse(0,0,scale*1.64*factor,scale*.85*factor,0,0,Math.PI*2); ctx.stroke(); }
        ctx.restore();
        const shadow = ctx.createRadialGradient(cx,cy+scale*1.22,0,cx,cy+scale*1.22,scale*.9);
        shadow.addColorStop(0,'#525b8a25'); shadow.addColorStop(1,'#525b8a00');
        ctx.save(); ctx.translate(cx,cy+scale*1.22); ctx.scale(1,.2); ctx.translate(-cx,-cy-scale*1.22); ctx.fillStyle = shadow; ctx.fillRect(cx-scale,cy+scale*.22,scale*2,scale*2); ctx.restore();
        const ax = -.35 + influence.y*.3, ay = .35 + time*.13 + influence.x*.55;
        const hues = {play:333,create:244,connect:175,meet:39};
        const materialDrawn = renderMaterial && renderMaterial(ax,ay,scale,discovered.size===4?215:(hues[active]||237),discovered.size===4);
        if (!materialDrawn) {
        const transformed = mesh.map(row => row.map(v => ({ p: rotate(v.point,ax,ay), n: rotate(v.normal,ax,ay) })));
        const faces = [];
        for (let i=0;i<segments;i++) for(let j=0;j<sides;j++) {
            const vertices = [transformed[i][j],transformed[i+1][j],transformed[i+1][j+1],transformed[i][j+1]];
            const n = norm(vertices.reduce((a,v) => a.map((x,k)=>x+v.n[k]),[0,0,0]));
            faces.push({ vertices, n, depth: vertices.reduce((a,v)=>a+v.p[2],0)/4, u:i/segments, v:j/sides });
        }
        faces.sort((a,b)=>a.depth-b.depth);
        const light = norm([-.6,-.9,1.5]);
        for(const face of faces) {
            const diffuse = Math.max(0,dot(face.n,light));
            const shine = Math.pow(Math.max(0,dot(face.n,norm([-.35,-.5,1.8]))),22);
            const hue = discovered.size===4 ? 215+Math.sin(face.u*Math.PI*2)*95 : (hues[active] || 237) + Math.sin(face.u*Math.PI*2)*22;
            const saturation = 38+diffuse*14;
            const luminance = 38+diffuse*38+shine*20;
            const color = `hsl(${hue} ${saturation}% ${Math.min(96,luminance)}%)`;
            ctx.beginPath(); face.vertices.forEach((v,k) => { const perspective=4.8/(4.8-v.p[2]); const x=cx+v.p[0]*scale*perspective, y=cy+v.p[1]*scale*perspective; k ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }); ctx.closePath();
            ctx.fillStyle=color; ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=.5; ctx.stroke();
        }
        }
        // Four small orbiting beads respond to the collection state.
        order.forEach((key,i) => {
            const angle = -.9 + i*Math.PI*.5 + time*.08;
            const x = cx + Math.cos(angle)*scale*1.57, y = cy + Math.sin(angle)*scale*1.2;
            const r=discovered.has(key)?7:4;
            ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=discovered.has(key)?topics[key].color:'#abb4c7';ctx.fill();
        });
        if(burst>0) { ctx.beginPath();ctx.arc(cx,cy,scale*(1.4+(1-burst)*.7),0,Math.PI*2);ctx.strokeStyle=`rgba(100,105,190,${burst*.25})`;ctx.lineWidth=1;ctx.stroke(); }
    }
    function resize() {
        const rect=stage.getBoundingClientRect(); width=Math.max(1,rect.width);height=Math.max(1,rect.height);
        const ratio=Math.min(window.devicePixelRatio || 1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
        if(ctx) ctx.setTransform(ratio,0,0,ratio,0,0); draw();
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
    document.getElementById('motion-toggle').addEventListener('click',()=>{paused=!paused;updateMotion();});
    motion.addEventListener('change',()=>{paused=motion.matches;updateMotion();draw();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
    if('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();},{threshold:0}).observe(stage);
    if('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize',resize);
    document.getElementById('save-art').addEventListener('click',()=>{
        if(!ctx) { announce('Artwork export is unavailable in this browser. Your discoveries are saved for this session.'); return; }
        const output=document.createElement('canvas');output.width=1400;output.height=1500;const pen=output.getContext('2d');
        if(!pen) return;
        pen.fillStyle='#edf0f5';pen.fillRect(0,0,1400,1500);
        const s=Math.min(1400/canvas.width,1180/canvas.height);pen.drawImage(canvas,(1400-canvas.width*s)/2,70,canvas.width*s,canvas.height*s);
        pen.fillStyle='#282d40';pen.font='48px sans-serif';pen.fillText('A little curiosity, connected.',90,1310);
        pen.fillStyle='#636d80';pen.font='24px sans-serif';pen.fillText('Play · Create · Connect · Meet',90,1370);pen.fillText('Ruoyu Wen — playerinmetaverse.tech',90,1415);
        output.toBlob(blob=>{
            if(!blob){announce('The image could not be saved. Please try again.');return;}
            const url=URL.createObjectURL(blob),link=document.createElement('a');link.download='ruoyu-wen-your-exploration.png';link.href=url;document.body.append(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),60000);announce('Your exploration artwork is ready to download.');
        },'image/png');
    });
    updateProgress();resize();updateMotion();
})();
