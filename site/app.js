
(function(){
  var root = document.querySelector('.fhnet');
  if(!root) return;
  var canvas = root.querySelector('.fhnet-canvas');
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* deterministic sprawl */
  var seed = 20260715;
  function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  var N = 60, nodes = [], edges = [], i, j;
  for(i = 0; i < N; i++){
    nodes.push({ x: .05 + .9 * rnd(), y: .06 + .88 * rnd(),
                 r: 1.3 + 1.8 * rnd(), a: .16 + .3 * rnd(), d: rnd(), hub:false });
  }
  /* a few deliberate hubs with many spokes: the shape of a real LinkedIn graph */
  var hubs = [5, 27, 44];
  for(var hh = 0; hh < hubs.length; hh++){
    var hi = hubs[hh];
    nodes[hi].hub = true; nodes[hi].r = 3.3 + 1.5 * rnd(); nodes[hi].a = .5 + .2 * rnd();
    var want = 7 + Math.floor(rnd() * 5), got = 0;
    for(i = 0; i < N && got < want; i++){
      if(i === hi) continue;
      var hx = nodes[i].x - nodes[hi].x, hy = nodes[i].y - nodes[hi].y;
      if(Math.sqrt(hx*hx + hy*hy) < .36 && rnd() < .72){ edges.push({ a: hi, b: i, d: rnd() }); got++; }
    }
  }
  /* faint peripheral links between everyone else */
  for(i = 0; i < N; i++){
    for(j = i + 1; j < N; j++){
      var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
      if(Math.sqrt(dx*dx + dy*dy) < .12 && rnd() < .26 && edges.length < 78){
        edges.push({ a: i, b: j, d: rnd() });
      }
    }
  }

  var W = 0, H = 0;
  function fit(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, W * dpr);
    canvas.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

  function draw(t){
    ctx.clearRect(0, 0, W, H);
    var k;
    for(k = 0; k < edges.length; k++){
      var e = edges[k];
      var p = clamp01((t - (.2 + e.d * .45)) / .3);
      if(p <= 0) continue;
      var A = nodes[e.a], B = nodes[e.b];
      ctx.strokeStyle = 'rgba(90,100,112,' + (.14 * p).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(A.x * W, A.y * H);
      ctx.lineTo(A.x * W + (B.x - A.x) * W * p, A.y * H + (B.y - A.y) * H * p);
      ctx.stroke();
    }
    for(k = 0; k < N; k++){
      var n = nodes[k];
      var q = clamp01((t - n.d * .5) / .35);
      if(q <= 0) continue;
      ctx.fillStyle = 'rgba(90,100,112,' + (n.a * q).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(n.x * W, n.y * H, n.r * (.6 + .4 * q), 0, 6.2832);
      ctx.fill();
    }
  }

  var raf = 0, started = false, done = false, t0 = 0, DUR = 1700;
  function frame(now){
    var t = clamp01((now - t0) / DUR);
    draw(t);
    if(t < 1){ raf = requestAnimationFrame(frame); }
    else { done = true; }
  }
  function finish(){
    if(done) return;
    cancelAnimationFrame(raf);
    fit(); draw(1); done = true;
  }

  if(reduced){
    fit(); draw(1);
    window.addEventListener('resize', function(){ fit(); draw(1); });
    return;
  }

  root.classList.add('fhnet-armed');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting && !started){
        started = true;
        root.classList.add('fhnet-in');
        fit();
        t0 = performance.now();
        raf = requestAnimationFrame(frame);
      } else if(!en.isIntersecting && started && !done){
        finish(); /* scrolled away mid-draw: rest at final state */
      }
      if(done) io.disconnect();
    });
  }, { threshold: .3 });
  io.observe(root);

  document.addEventListener('visibilitychange', function(){
    if(document.hidden && started) finish();
  });
  window.addEventListener('resize', function(){
    if(done){ fit(); draw(1); }
  });
})();


/* ---- */


(function(){
  "use strict";
  var root=document.querySelector('.fh2'); if(!root) return;
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id){ return document.getElementById(id); }
  function fmt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); }

  /* ---- count-up (rAF, one-shot) ---- */
  function countUp(el,to,dur,suffix){
    suffix=suffix||'';
    if(reduced){ el.textContent=fmt(to)+suffix; return; }
    var t0=null;
    function step(ts){
      if(t0===null) t0=ts;
      var p=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-p,4);
      el.textContent=fmt(Math.round(to*e))+suffix;
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- sparkline builder (SVG, 2px line, endpoint dot, soft area) ---- */
  function buildSpark(svg){
    var data=svg.getAttribute('data-series').split(',').map(Number);
    var vb=svg.viewBox.baseVal, w=vb.width, h=vb.height, pad=3;
    var min=Math.min.apply(null,data), max=Math.max.apply(null,data), span=(max-min)||1;
    var pts=data.map(function(v,i){
      var x=pad+(i/(data.length-1))*(w-2*pad);
      var y=h-pad-((v-min)/span)*(h-2*pad);
      return [ +x.toFixed(1), +y.toFixed(1) ];
    });
    var ns='http://www.w3.org/2000/svg';
    var area=document.createElementNS(ns,'path');
    area.setAttribute('class','ar');
    area.setAttribute('d','M'+pts.map(function(p){return p[0]+' '+p[1];}).join(' L ')+' L '+pts[pts.length-1][0]+' '+(h-1)+' L '+pts[0][0]+' '+(h-1)+' Z');
    svg.appendChild(area);
    var pl=document.createElementNS(ns,'polyline');
    pl.setAttribute('points',pts.map(function(p){return p.join(',');}).join(' '));
    svg.appendChild(pl);
    var len=0; for(var i=1;i<pts.length;i++){ len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); }
    svg.style.setProperty('--len',Math.ceil(len));
    var dot=document.createElementNS(ns,'circle');
    dot.setAttribute('class','dot'); dot.setAttribute('r','2.6');
    dot.setAttribute('cx',pts[pts.length-1][0]); dot.setAttribute('cy',pts[pts.length-1][1]);
    svg.appendChild(dot);
  }
  var sparks=root.querySelectorAll('.spark');
  for(var si=0; si<sparks.length; si++) buildSpark(sparks[si]);

  /* ================= 1 · THE WIRE ================= */
  var listVal=4213;
  var POOL=[
    ["A VP Product","Figma","#F24E1E","F",false],
    ["A Staff Engineer","Stripe","#635BFF","S",false],
    ["A Principal Engineer","Datadog","#632CA6","D",false],
    ["A Group PM","Ramp","#FFD400","R",true],
    ["An Eng Director","Notion","#191919","N",false],
    ["A Design Lead","Linear","#5E6AD2","L",false],
    ["A Founding Engineer","Vercel","#0B0B0B","V",false],
    ["A Data Scientist","Plaid","#0E0E0E","P",false],
    ["A Head of Platform","Stripe","#635BFF","S",false],
    ["A Staff Designer","Figma","#F24E1E","F",false]
  ];
  var feed=$('wfeed'), poolIdx=0, MAXROWS=5;
  function ago(ms){
    var m=Math.round(ms/60000);
    if(m<1) return 'just now';
    return m+' min ago';
  }
  function wireRow(p,ageMs,isNew){
    var row=document.createElement('div');
    row.className='wrow'+(isNew?' new':'');
    row.dataset.ts=String(Date.now()-ageMs);
    row.innerHTML='<span class="who"><span class="logo sm'+(p[4]?' dark':'')+'" style="--c:'+p[2]+'">'+p[3]+'</span>'+p[0]+' <span class="at">at '+p[1]+'</span></span><span class="when">'+ago(ageMs)+'</span>';
    return row;
  }
  /* seed */
  var seedAges=[2,7,13,19,26];
  for(var w0=0; w0<seedAges.length; w0++){ feed.appendChild(wireRow(POOL[(poolIdx++)%POOL.length],seedAges[w0]*60000,false)); }
  function tickWire(){
    var p=POOL[(poolIdx++)%POOL.length];
    feed.insertBefore(wireRow(p,0,true),feed.firstChild);
    while(feed.children.length>MAXROWS) feed.removeChild(feed.lastChild);
    var rows=feed.children;
    for(var r=0;r<rows.length;r++){ rows[r].querySelector('.when').textContent=ago(Date.now()-Number(rows[r].dataset.ts)); }
    /* the headline number moves with the wire */
    listVal++;
    var k=$('k-list'); k.textContent=fmt(listVal);
    k.classList.add('pulse'); setTimeout(function(){ k.classList.remove('pulse'); },600);
  }
  var wireTimer=null, wireVisible=false;
  function setWire(on){
    if(reduced) return;
    if(on && !wireTimer){ wireTimer=setInterval(tickWire,6000); }
    if(!on && wireTimer){ clearInterval(wireTimer); wireTimer=null; }
  }
  document.addEventListener('visibilitychange',function(){ setWire(!document.hidden && wireVisible); });

  function startWire(){
    countUp($('k-list'),4213,1400);
    countUp($('k-cos'),312,1200);
    countUp($('k-staff'),62,1100);
    countUp($('k-seats'),41,1000);
    $('k-meter').style.width='62%';
    var ds=root.querySelectorAll('#fh2-wire .spark.draw');
    for(var i=0;i<ds.length;i++) ds[i].classList.add('go');
    wireVisible=true; setWire(true);
  }

  /* ================= 2 · THE COMPANY RACE ================= */
  var SCALE=25, ROWH=58;
  var COS=[
    {n:"Stripe", m:23, c:"#635BFF", l:"S", wk:4, t:[16,17,19,20,21,22,23]},
    {n:"Figma",  m:18, c:"#F24E1E", l:"F", wk:3, t:[13,14,15,15,16,17,18]},
    {n:"Datadog",m:14, c:"#632CA6", l:"D", wk:1, t:[12,13,13,13,14,14,14]},
    {n:"Notion", m:12, c:"#191919", l:"N", wk:5, t:[6,7,8,9,10,11,12], hot:true},
    {n:"Linear", m:10, c:"#5E6AD2", l:"L", wk:2, t:[8,8,9,9,9,10,10]},
    {n:"Vercel", m:8,  c:"#0B0B0B", l:"V", wk:1, t:[7,7,7,8,8,8,8]},
    {n:"Ramp",   m:7,  c:"#FFD400", l:"R", dark:true, wk:3, t:[4,4,5,5,6,7,7]},
    {n:"Plaid",  m:5,  c:"#0E0E0E", l:"P", wk:1, t:[4,4,4,5,5,5,5]}
  ];
  var rbody=$('rbody');
  rbody.style.height=(COS.length*ROWH)+'px';

  function statusHTML(co){
    if(co.m>=10) return '<span class="open">Table open</span>';
    var left=10-co.m;
    return '<span class="'+(left<=3?'near':'')+'">'+left+' to unlock</span>';
  }
  function buildRace(){
    COS.forEach(function(co,i){
      co.pos=i;
      var row=document.createElement('div');
      row.className='rrow'+(co.hot?' hot':'');
      row.innerHTML=
        '<div class="rrank"><span class="rk">'+('0'+(i+1)).slice(-2)+'</span><span class="up">&#9650;1</span></div>'+
        '<div class="rco"><span class="logo'+(co.dark?' dark':'')+'" style="--c:'+co.c+'">'+co.l+'</span>'+co.n+(co.hot?'<span class="risr">fastest riser</span>':'')+'</div>'+
        '<div class="rmem"><span class="mm">'+co.m+'</span><span class="wk">+'+co.wk+' wk</span></div>'+
        '<div class="rtrack"><div class="rfill"></div><i class="rthresh"></i></div>'+
        '<div class="rspark"><svg class="spark" data-series="'+co.t.join(',')+'" width="72" height="26" viewBox="0 0 72 26" aria-hidden="true"></svg></div>'+
        '<div class="rstat">'+statusHTML(co)+'</div>';
      row.style.transform='translateY('+(i*ROWH)+'px)';
      co.el=row; co.fill=row.querySelector('.rfill'); co.mm=row.querySelector('.mm');
      co.rk=row.querySelector('.rk'); co.up=row.querySelector('.up'); co.st=row.querySelector('.rstat');
      buildSpark(row.querySelector('.spark'));
      rbody.appendChild(row);
    });
  }
  buildRace();

  function layoutRace(animate){
    var sorted=COS.slice().sort(function(a,b){ return (b.m-a.m)||(a.pos-b.pos); });
    sorted.forEach(function(co,i){
      co.el.style.transform='translateY('+(i*ROWH)+'px)';
      co.rk.textContent=('0'+(i+1)).slice(-2);
      if(animate && i<co.pos){
        co.el.classList.add('flash'); co.up.classList.add('on');
        setTimeout(function(){ co.el.classList.remove('flash'); co.up.classList.remove('on'); },2600);
      }
      co.pos=i;
    });
  }
  function setBars(){
    COS.forEach(function(co){ co.fill.style.width=(co.m/SCALE*100)+'%'; });
  }
  function bump(name){
    var co=null; for(var i=0;i<COS.length;i++){ if(COS[i].n===name) co=COS[i]; }
    if(!co) return;
    co.m++; co.mm.textContent=co.m; co.st.innerHTML=statusHTML(co);
    setBars(); layoutRace(true);
  }
  function startRace(){
    if(reduced){
      /* collapse the live events to their final state */
      COS.forEach(function(co){ if(co.n==='Notion') co.m=15; if(co.n==='Ramp') co.m=9; co.mm.textContent=co.m; co.st.innerHTML=statusHTML(co); });
      setBars(); layoutRace(false);
      return;
    }
    /* bars grow in, staggered */
    COS.forEach(function(co,i){ co.fill.style.transitionDelay=(i*70)+'ms'; });
    requestAnimationFrame(function(){ requestAnimationFrame(setBars); });
    setTimeout(function(){ COS.forEach(function(co){ co.fill.style.transitionDelay='0ms'; }); },1600);
    /* then the board moves: Notion runs down Datadog, Ramp closes on ten */
    setTimeout(function(){ bump('Ramp');   },2200);
    setTimeout(function(){ bump('Notion'); },3400);
    setTimeout(function(){ bump('Notion'); },4600);
    setTimeout(function(){ bump('Notion'); },5900);  /* 15: overtakes Datadog, rows swap */
    setTimeout(function(){ bump('Ramp');   },7400);  /* 9: “1 to unlock” */
  }

  /* ================= 3 · THE TELLS ================= */
  var METRICS=["Aggression","Bluff rate","Fold discipline","Read accuracy","Tilt control"];
  var ROLES={
    "Founders":  { ar:"The Maniacs",  v:[87,74,31,55,42], q:"Bluff 3&times; more than anyone at the table. Shocking no one." },
    "Engineers": { ar:"The Rocks",    v:[38,22,91,61,88], q:"Modelled the EV pre-flop and won&rsquo;t argue with it." },
    "Designers": { ar:"The Readers",  v:[52,48,57,88,63], q:"They clock the tell you didn&rsquo;t know you had." },
    "Product":   { ar:"The Optimists",v:[66,58,44,70,51], q:"Overvalue marginal hands, chase the narrative, ship it anyway." },
    "Data":      { ar:"The House",    v:[45,35,79,76,93], q:"Quietly winning every season. Everybody&rsquo;s a little annoyed." }
  };
  var roleNames=Object.keys(ROLES);
  var slotA="Founders", slotB="Engineers", nextSlot="A";
  var chipsBox=$('chips'), drows=$('drows'), duelRefs=[];

  roleNames.forEach(function(name){
    var b=document.createElement('button');
    b.type='button'; b.className='chip'; b.dataset.role=name;
    b.innerHTML=name; b.setAttribute('aria-pressed','false');
    b.addEventListener('click',function(){ pick(name); });
    chipsBox.appendChild(b);
  });

  METRICS.forEach(function(m){
    var row=document.createElement('div'); row.className='drow';
    row.innerHTML=
      '<span class="dval wL"></span>'+
      '<div class="dtrack"><div class="dbar L"></div></div>'+
      '<div class="dmet">'+m+'</div>'+
      '<div class="dtrack"><div class="dbar R"></div></div>'+
      '<span class="dval wR"></span>';
    drows.appendChild(row);
    duelRefs.push({
      vL:row.querySelector('.wL'), vR:row.querySelector('.wR'),
      bL:row.querySelector('.dbar.L'), bR:row.querySelector('.dbar.R')
    });
  });

  function renderDuel(animateFromZero){
    var A=ROLES[slotA], B=ROLES[slotB];
    $('dnmL').textContent=slotA; $('darL').innerHTML='&ldquo;'+A.ar+'&rdquo;'; $('dqL').innerHTML=A.q;
    $('dnmR').textContent=slotB; $('darR').innerHTML='&ldquo;'+B.ar+'&rdquo;'; $('dqR').innerHTML=B.q;
    var gap=0, gi=0;
    METRICS.forEach(function(m,i){
      var a=A.v[i], b=B.v[i], r=duelRefs[i];
      r.vL.textContent=a; r.vR.textContent=b;
      r.vL.classList.toggle('win',a>=b); r.vR.classList.toggle('win',b>=a);
      var wa=a+'%', wb=b+'%';
      if(animateFromZero && !reduced){
        r.bL.style.width='0%'; r.bR.style.width='0%';
        requestAnimationFrame(function(){ requestAnimationFrame(function(){ r.bL.style.width=wa; r.bR.style.width=wb; }); });
      } else { r.bL.style.width=wa; r.bR.style.width=wb; }
      if(Math.abs(a-b)>gap){ gap=Math.abs(a-b); gi=i; }
    });
    var leader=A.v[gi]>B.v[gi]?slotA:slotB;
    $('dverdict').innerHTML='<b>WIDEST GAP &middot; '+METRICS[gi].toUpperCase()+'</b>: '+leader+' by '+gap+' points. The table notices.';
    $('duel-sr').textContent=slotA+' versus '+slotB+'. '+METRICS.map(function(m,i){ return m+': '+A.v[i]+' to '+B.v[i]; }).join('. ')+'.';
    var chips=chipsBox.children;
    for(var c=0;c<chips.length;c++){
      var nm=chips[c].dataset.role;
      chips[c].classList.toggle('a',nm===slotA);
      chips[c].classList.toggle('b',nm===slotB);
      chips[c].setAttribute('aria-pressed',(nm===slotA||nm===slotB)?'true':'false');
      chips[c].innerHTML=(nm===slotA?'&#9824; ':'')+(nm===slotB?'&#9670; ':'')+nm;
    }
  }
  function pick(name){
    if(name===slotA||name===slotB) return;
    if(nextSlot==='A'){ slotA=name; nextSlot='B'; } else { slotB=name; nextSlot='A'; }
    renderDuel(false);
  }
  renderDuel(false); /* static values pre-reveal; animated on reveal */

  /* ================= 4 · YOUR STANDING ================= */
  function polar(cx,cy,r,deg){
    var rad=deg*Math.PI/180;
    return [ cx+r*Math.cos(rad), cy-r*Math.sin(rad) ];
  }
  function buildGauge(){
    var r=84, a0=200, a1=-20, sweep=a0-a1; /* 220 degrees over the top */
    var p0=polar(100,100,r,a0), p1=polar(100,100,r,a1);
    var d='M'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+' A'+r+' '+r+' 0 1 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1);
    var len=r*sweep*Math.PI/180;
    var frac=1840/2400;
    var t=$('garcT'), f=$('garcF');
    t.setAttribute('d',d); f.setAttribute('d',d);
    f.style.strokeDasharray=len.toFixed(1);
    f.style.strokeDashoffset=len.toFixed(1);
    f.dataset.final=(len*(1-frac)).toFixed(1);
    if(reduced){ f.style.strokeDashoffset=f.dataset.final; }
  }
  buildGauge();

  function buildBell(){
    var svg=$('bell'), ns='http://www.w3.org/2000/svg';
    var w=280, h=84, base=h-8, top=14, N=90;
    var line=[], area=[];
    for(var i=0;i<=N;i++){
      var z=(i/N)*6-3, y=Math.exp(-z*z/2);
      var px=+((i/N)*w).toFixed(1), py=+(base-y*(base-top)).toFixed(1);
      line.push(px+' '+py); area.push([px,py]);
    }
    var under=document.createElementNS(ns,'path');
    under.setAttribute('d','M'+line.join(' L ')+' L '+w+' '+base+' L 0 '+base+' Z');
    under.setAttribute('fill','rgba(127,191,152,.13)');
    svg.appendChild(under);
    /* the top-8% region (z >= 1.405) in brass */
    var cutX=((1.405+3)/6)*w, seg=[];
    for(var j=0;j<=N;j++){ if(area[j][0]>=cutX) seg.push(area[j][0]+' '+area[j][1]); }
    var zone=document.createElementNS(ns,'path');
    zone.setAttribute('d','M'+cutX.toFixed(1)+' '+base+' L '+seg.join(' L ')+' L '+w+' '+base+' Z');
    zone.setAttribute('fill','rgba(201,174,110,.55)');
    svg.appendChild(zone);
    var curve=document.createElementNS(ns,'path');
    curve.setAttribute('d','M'+line.join(' L '));
    curve.setAttribute('fill','none'); curve.setAttribute('stroke','#7FBF98'); curve.setAttribute('stroke-width','2');
    svg.appendChild(curve);
    var mk=document.createElementNS(ns,'line');
    mk.setAttribute('x1',cutX); mk.setAttribute('x2',cutX); mk.setAttribute('y1',base+4); mk.setAttribute('y2',top+6);
    mk.setAttribute('stroke','#C9AE6E'); mk.setAttribute('stroke-width','2'); mk.setAttribute('stroke-linecap','round');
    svg.appendChild(mk);
    var bl=document.createElementNS(ns,'line');
    bl.setAttribute('x1',0); bl.setAttribute('x2',w); bl.setAttribute('y1',base); bl.setAttribute('y2',base);
    bl.setAttribute('stroke','rgba(244,240,230,.25)'); bl.setAttribute('stroke-width','1');
    svg.appendChild(bl);
  }
  buildBell();

  function startStanding(){
    var f=$('garcF');
    if(reduced){ f.style.strokeDashoffset=f.dataset.final; }
    else{ requestAnimationFrame(function(){ requestAnimationFrame(function(){ f.style.strokeDashoffset=f.dataset.final; }); }); }
    countUp($('g-rate'),1840,1500);
    countUp($('i-hands'),612,1200);
    countUp($('i-reads'),71,1100,'%');
    countUp($('i-conn'),19,900);
    var ds=root.querySelectorAll('#fh2-stand .spark.draw');
    for(var i=0;i<ds.length;i++) ds[i].classList.add('go');
  }

  /* ================= reveal orchestration ================= */
  var started={};
  function startSection(id){
    if(started[id]) return; started[id]=true;
    if(id==='fh2-wire') startWire();
    if(id==='fh2-race') startRace();
    if(id==='fh2-tells') renderDuel(true);
    if(id==='fh2-stand') startStanding();
  }
  var sections=root.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.target.id==='fh2-wire'){ wireVisible=e.isIntersecting; setWire(wireVisible && !document.hidden); }
        if(e.isIntersecting){ e.target.classList.add('in'); startSection(e.target.id); }
      });
    },{threshold:.18});
    for(var s=0;s<sections.length;s++) io.observe(sections[s]);
  } else {
    for(var s2=0;s2<sections.length;s2++){ sections[s2].classList.add('in'); startSection(sections[s2].id); }
  }
  if(reduced){
    /* collapse everything to final state immediately */
    for(var s3=0;s3<sections.length;s3++){ sections[s3].classList.add('in'); startSection(sections[s3].id); }
  }
})();


/* ---- */


(function(){
  var root = document.querySelector('.fhfriend');
  if(!root) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced) return; /* markup already rests in the final connected state */

  root.classList.add('fhf-armed');

  var msgs = root.querySelectorAll('.fhf-log .fhf-msg:not(.fhf-typing)');
  var typing = root.querySelector('.fhf-typing');
  var addBtn = root.querySelector('.fhf-add');
  var timers = [], connected = false, running = false, inView = false, autoTimer = 0;
  var beats = [150, 900, 1700, 2500, 3350];

  function at(ms, fn){ timers.push(setTimeout(fn, ms)); }
  function clearAll(){ timers.forEach(clearTimeout); timers = []; clearTimeout(autoTimer); }

  function reset(){
    for(var i = 0; i < msgs.length; i++) msgs[i].classList.remove('fhf-on');
    typing.classList.remove('fhf-on');
    root.classList.remove('fhf-invite-on', 'fhf-linkvisible', 'fhf-connected');
    connected = false;
  }

  function connect(){
    if(connected) return;
    connected = true;
    clearTimeout(autoTimer);
    /* reveal the stage first, force a reflow, then transition */
    root.classList.add('fhf-linkvisible');
    void root.offsetHeight;
    root.classList.add('fhf-connected');
    at(5400, cycleEnd); /* hold the connected moment, then loop */
  }

  function cycleEnd(){
    running = false;
    if(!inView) return;              /* stopped: resumes when scrolled back */
    reset();
    setTimeout(function(){ if(inView && !running) startCycle(); }, 850);
  }

  function startCycle(){
    running = true;
    clearAll();
    reset();
    for(var i = 0; i < msgs.length - 1 && i < beats.length; i++){
      (function(el, t){ at(t, function(){ el.classList.add('fhf-on'); }); })(msgs[i], beats[i]);
    }
    at(4300, function(){ typing.classList.add('fhf-on'); });
    at(5500, function(){
      typing.classList.remove('fhf-on');
      msgs[msgs.length - 1].classList.add('fhf-on');
    });
    at(6350, function(){
      root.classList.add('fhf-invite-on');
      autoTimer = setTimeout(connect, 2400); /* resolves on its own if untapped */
    });
  }

  addBtn.addEventListener('click', connect);

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      inView = en.isIntersecting;
      if(inView && !running) startCycle();   /* start / resume when in view */
    });
  }, { threshold: .4 });
  io.observe(root);

  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ clearAll(); running = false; }   /* pause when tab hidden */
    else if(inView && !running){ startCycle(); }
  });
})();


/* ---- */


(function(){
  var root=document.querySelector('.fh'); if(!root) return;
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var flip=document.getElementById('flip'), interacted=false;
  function setFlipped(s){ flip.classList.toggle('flipped', s); flip.setAttribute('aria-pressed', s?'true':'false'); var f=flip.querySelectorAll('.face'); f[0].setAttribute('aria-hidden', s?'true':'false'); f[1].setAttribute('aria-hidden', s?'false':'true'); }
  function toggleFlip(){ interacted=true; setFlipped(!flip.classList.contains('flipped')); }
  flip.addEventListener('click', toggleFlip);
  flip.addEventListener('keydown', function(e){ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggleFlip(); } });
  if(!reduced){ var auto=setInterval(function(){ if(interacted){ clearInterval(auto); return; } setFlipped(!flip.classList.contains('flipped')); }, 4200); }

  /* invite attribution: /?seat=CODE marks this signup as taking a seat at CODE's table */
  var seatCode='';
  try{ seatCode=(new URLSearchParams(location.search).get('seat')||'').toLowerCase().slice(0,16); }catch(e){}

  function wire(id){ var form=document.getElementById(id); if(!form) return;
    form.addEventListener('submit', function(e){ e.preventDefault();
      var email=form.querySelector('input');
      if(!email.value||email.value.indexOf('@')<1){ email.focus(); return; }
      var btn=form.querySelector('button'); btn.disabled=true; btn.textContent='Dealing you in…';
      fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:email.value.trim(),seat:seatCode})})
      .then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
      .then(function(d){
        if(d && d.ok){
          var msg=document.createElement('p'); msg.className='confirm'; msg.setAttribute('role','status');
          msg.textContent = d.already
            ? 'You already have a seat. Check your inbox for your table link.'
            : 'One more step: we sent a confirmation to your inbox. Tap it and Seat 1 of 6 is yours. You are not in a line, you are filling a table. Tel Aviv deals first.';
          form.replaceWith(msg);
        } else {
          btn.disabled=false; btn.textContent=id==='form-hero'?'Join the waitlist':'Request a seat';
          var err=form.querySelector('.formerr');
          if(!err){ err=document.createElement('p'); err.className='fnote formerr'; err.setAttribute('role','alert'); form.appendChild(err); }
          err.textContent='That did not go through. Check the email and try again.';
        }
      })
      .catch(function(){
        btn.disabled=false; btn.textContent=id==='form-hero'?'Join the waitlist':'Request a seat';
        var err=form.querySelector('.formerr');
        if(!err){ err=document.createElement('p'); err.className='fnote formerr'; err.setAttribute('role','alert'); form.appendChild(err); }
        err.textContent='Could not reach the room. Try again in a minute.';
      });
    });
  }
  wire('form-hero'); wire('form-seat');

  /* invitee framing: someone is holding a seat for whoever lands on ?seat= */
  if(seatCode){
    var hero=document.querySelector('.hero .hbody');
    if(hero){
      var hold=document.createElement('p');
      hold.className='fnote'; hold.style.color='var(--brass)';
      hold.textContent='A seat at a friend’s table is being held for you. Sign up and it is yours.';
      var f=document.getElementById('form-hero');
      if(f) hero.insertBefore(hold,f);
    }
  }

  root.querySelectorAll('[data-scroll]').forEach(function(b){ b.addEventListener('click', function(){ var t=document.querySelector(b.getAttribute('data-scroll')); if(t) t.scrollIntoView(reduced?{}:{behavior:'smooth'}); }); });

  /* keep the top bar visible while scrolling, tuck it away once the closing CTA arrives */
  var topbar=document.getElementById('topbar'), seat=document.getElementById('seat');
  if(topbar && seat && 'IntersectionObserver' in window){
    var tio=new IntersectionObserver(function(en){ en.forEach(function(e){ topbar.classList.toggle('tuck', e.isIntersecting); }); }, {threshold:.01});
    tio.observe(seat);
  }

  if('IntersectionObserver' in window && !reduced){
    var io=new IntersectionObserver(function(en){ en.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); if(e.target.id==='drift') e.target.classList.add('on'); io.unobserve(e.target); } }); }, {threshold:.2});
    root.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  } else {
    root.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); }); var d=document.getElementById('drift'); if(d) d.classList.add('on');
  }
})();
