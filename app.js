(() => {
const P = window.PF, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dom = id => P.domains.find(x => x.id === id), tool = id => P.tools.find(x => x.id === id), proj = id => P.projects.find(x => x.id === id);
const dcol = id => dom(id).c, dname = id => dom(id).n.replace('\n', ' ');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toolIcon(t, size = 17) {
  if (t.tile) { const [l, c] = t.tile; const inner = l === '▮' ? '<path d="M8 17V11M12 17V7M16 17v-4" stroke="#1a1a1a" stroke-width="2.4" stroke-linecap="round"/>' : `<text x="12" y="16.3" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Arial,Helvetica,sans-serif">${l}</text>`; return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4.5" fill="${c}"/>${inner}</svg>`; }
  if (t.brand && P.icons[t.brand]) { const i = P.icons[t.brand]; return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path fill="${i.c}" d="${i.d}"/></svg>`; }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P.glyphs[t.glyph] || P.glyphs.doc}</svg>`;
}

/* ================= SYSTEMS MAP ================= */
const map = $('#map'), svg = $('#links');
$('#col-d').insertAdjacentHTML('beforeend', P.domains.map(d => `<button class="node dom" data-k="d:${d.id}" style="--c:${d.c}" type="button"><span class="dot"></span><span class="t">${esc(d.n).replace('\n', '<br>')}</span></button>`).join(''));
$('#col-s').insertAdjacentHTML('beforeend', P.projects.map(s => `<button class="node sys" data-k="s:${s.id}" style="--c:${dcol(s.d[0])}" type="button"><span class="dot"></span><span class="t">${esc(s.n)}<small>${esc(s.sub)}</small></span></button>`).join(''));
$('#col-t').insertAdjacentHTML('beforeend', P.tools.map(t => `<button class="node tool" data-k="t:${t.id}" type="button"><span class="logo-ic">${toolIcon(t)}</span><span class="t">${esc(t.n)}</span></button>`).join(''));
$('#mapstats').innerHTML = [[P.projects.length, 'Systems & projects'], [P.tools.length, 'Tools & methods'], [P.domains.length, 'Business areas'], [P.projects.filter(p => p.live).length, 'Live in daily use']].map(([v, k]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');

function anchor(el, side) {
  const m = map.getBoundingClientRect(), d = el.querySelector('.dot,.logo-ic').getBoundingClientRect();
  if (side === 'text') { const t = el.querySelector('.t').getBoundingClientRect(); return [t.right - m.left + 12, d.top + d.height / 2 - m.top]; }
  return [(side === 'r' ? d.right : d.left) - m.left, d.top + d.height / 2 - m.top];
}
function draw() {
  const m = map.getBoundingClientRect(); if (!m.width) return;
  svg.setAttribute('viewBox', `0 0 ${m.width} ${m.height}`);
  let h = '';
  P.projects.forEach(s => {
    const se = map.querySelector(`[data-k="s:${s.id}"]`); const [sx, sy] = anchor(se, 'l'); const [rx, ry] = anchor(se, 'text');
    s.d.forEach(did => { const [dx, dy] = anchor(map.querySelector(`[data-k="d:${did}"]`), 'r'); const mx = (dx + sx) / 2;
      h += `<path data-s="${s.id}" data-o="d:${did}" stroke="${dcol(did)}" d="M${dx},${dy} C${mx},${dy} ${mx},${sy} ${sx},${sy}"/>`; });
    s.t.forEach(tid => { const [tx, ty] = anchor(map.querySelector(`[data-k="t:${tid}"]`), 'l'); const mx = (rx + tx) / 2;
      h += `<path data-s="${s.id}" data-o="t:${tid}" stroke="${dcol(s.d[0])}" d="M${rx},${ry} C${mx},${ry} ${mx},${ty} ${tx},${ty}"/>`; });
  });
  svg.innerHTML = h; paint();
}

let pinned = null, hover = null;
function related(k) {
  if (!k) return null; const [ty, id] = k.split(':'); const on = new Set([k]); let sys;
  if (ty === 's') sys = [id]; else if (ty === 'd') sys = P.projects.filter(s => s.d.includes(id)).map(s => s.id); else sys = P.projects.filter(s => s.t.includes(id)).map(s => s.id);
  sys.forEach(sid => { const s = proj(sid); on.add('s:' + sid);
    if (ty === 'd') on.add(k); else s.d.forEach(d => on.add('d:' + d));
    if (ty === 't') on.add(k); else s.t.forEach(t => on.add('t:' + t)); });
  return { on, sys, ty, id };
}
function paint() {
  const R = related(hover || pinned);
  map.classList.toggle('hl', !!R);
  map.querySelectorAll('.node').forEach(n => n.classList.toggle('on', !!R && R.on.has(n.dataset.k)));
  svg.querySelectorAll('path').forEach(p => {
    let on = !!R && R.sys.includes(p.dataset.s) && R.on.has(p.dataset.o);
    if (on && R.ty === 'd' && p.dataset.o.startsWith('d:')) on = p.dataset.o === 'd:' + R.id;
    if (on && R.ty === 't' && p.dataset.o.startsWith('t:')) on = p.dataset.o === 't:' + R.id;
    p.classList.toggle('on', on);
  });
  const P2 = related(pinned);
  const cards = $('#cards'); cards.classList.toggle('hl', !!P2);
  cards.querySelectorAll('.card').forEach(c => c.classList.toggle('on', !!P2 && P2.sys.includes(c.dataset.s)));
  const fs = $('#fsel'); if (fs) fs.value = pinned && pinned.startsWith('t:') ? pinned : '';
  $('#count').textContent = P2 ? `${P2.sys.length} of ${P.projects.length} projects highlighted` : `${P.projects.length} projects`;
  $('#clear').hidden = !pinned;
  detail(P2);
}
function detail(R) {
  const el = $('#detail'); el.hidden = !R;
  if (!R) { el.innerHTML = ''; return; }
  if (R.ty === 's') { const s = proj(R.id); el.style.setProperty('--c', dcol(s.d[0]));
    el.innerHTML = `<div><span class="pill">${esc(s.type)} · ${s.d.map(dname).join(' / ')}</span><h3>${esc(s.n)}</h3><p>${esc(s.summary)}</p>
      <div class="tags">${s.t.map(t => `<span class="tag">${toolIcon(tool(t), 13)}${esc(tool(t).n)}</span>`).join('')}</div>
      <div class="cta"><a class="btn primary" href="#project-${s.id}">Open case study →</a></div></div>
      <div><p class="mini">Key capabilities</p><ul>${s.results.slice(0, 4).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`; return; }
  const name = R.ty === 'd' ? dname(R.id) : tool(R.id).n; el.style.setProperty('--c', R.ty === 'd' ? dcol(R.id) : 'var(--primary)');
  el.innerHTML = `<div><span class="pill">${R.ty === 'd' ? 'Business area' : 'Tool · Technology · Method'}</span><h3>${esc(name)}</h3><p>${R.sys.length} project${R.sys.length > 1 ? 's' : ''} connect${R.sys.length > 1 ? '' : 's'} to ${esc(name)}. Pick one to see its full story.</p></div>
    <div><p class="mini">Linked projects</p><ul>${R.sys.map(id => `<li><button class="linkish" data-go="s:${id}">${esc(proj(id).n)}</button></li>`).join('')}</ul></div>`;
}
function pin(k) { pinned = pinned === k ? null : k; hover = null; paint(); }
map.addEventListener('mouseover', e => { const n = e.target.closest('.node'); if (n && n.dataset.k !== hover) { hover = n.dataset.k; paint(); } });
map.addEventListener('mouseleave', () => { hover = null; paint(); });
map.addEventListener('focusin', e => { const n = e.target.closest('.node'); if (n) { hover = n.dataset.k; paint(); } });
map.addEventListener('focusout', () => { hover = null; paint(); });
map.addEventListener('click', e => { const n = e.target.closest('.node'); if (n) pin(n.dataset.k); });
$('#clear').onclick = () => { pinned = null; paint(); };
$('#detail').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { pinned = g.dataset.go; paint(); } });

/* ================= PROJECT CARDS ================= */
const TYPES = ['Company project', 'Business analysis', 'Data analytics']; let typeF = '';
$('#filters').innerHTML = `<button class="fchip" type="button" data-y="" style="--c:var(--primary)" aria-pressed="true"><i></i>All projects</button>` + TYPES.map((t, i) => `<button class="fchip" type="button" data-y="${t}" style="--c:${['var(--primary)', '#6553c4', '#2f5fbf'][i]}" aria-pressed="false"><i></i>${t} <small style="color:var(--muted)">(${P.projects.filter(p => p.type === t).length})</small></button>`).join('') +
  `<select class="fsel" id="fsel" aria-label="Filter by tool"><option value="">Any tool or method</option>${P.tools.map(t => `<option value="t:${t.id}">${esc(t.n)}</option>`).join('')}</select><span class="count" id="count"></span>`;
$('#filters').addEventListener('click', e => { const f = e.target.closest('[data-y]'); if (!f) return; typeF = f.dataset.y; $$('[data-y]').forEach(b => b.setAttribute('aria-pressed', b === f)); $$('#cards .card').forEach(c => c.hidden = !!typeF && proj(c.dataset.s).type !== typeF); });
$('#fsel').addEventListener('change', e => { pinned = e.target.value || null; paint(); });
$('#cards').innerHTML = P.projects.map((s, i) => `<article class="card" data-s="${s.id}" style="--c:${dcol(s.d[0])}">
  <div class="top"><span class="d">${String(i + 1).padStart(2, '0')} / ${esc(s.type)}</span><span class="w">${esc(s.w)}</span></div>
  <h3>${esc(s.n)}</h3>
  <p class="s">${esc(s.summary)}</p>
  <dl>${s.kpis.map(k => `<div><dt>${esc(k[1])}</dt><dd>${esc(k[0])}</dd></div>`).join('')}</dl>
  <div class="tags">${s.t.map(t => `<span class="tag">${toolIcon(tool(t), 13)}${esc(tool(t).n)}</span>`).join('')}</div>
  ${s.live ? '<div class="live">● Live and in daily use</div>' : ''}
  <div class="acts"><a class="btn" href="#project-${s.id}">View case study →</a>${s.links && s.links.tableau ? `<a class="btn" href="${esc(s.links.tableau)}" target="_blank" rel="noopener">Open in Tableau ↗</a>` : ''}${s.links && s.links.github ? `<a class="btn" href="${esc(s.links.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}<button class="btn" type="button" data-map="${s.id}">Show in map</button></div>
</article>`).join('');
$('#cards').addEventListener('click', e => {
  const b = e.target.closest('[data-map]'); if (b) { pinned = 's:' + b.dataset.map; paint(); $('#systems').scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); return; }
  if (e.target.closest('a,button')) return;
  const c = e.target.closest('.card'); if (c) location.hash = 'project-' + c.dataset.s;
});

/* ================= CERTIFICATES ================= */
const certCat = c => c.cat;
const fmtDate = d => { if (!d) return ''; const [y, m] = d.split('-'); return new Date(+y, +m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' }); };
const certImg = (c, t) => c.img + (t ? '-t' : '') + '.webp';
const verLine = c => c.verify ? 'Online verification available' : (c.id || 'Certificate on file');
function certCard(c) {
  const k = P.certs.indexOf(c), dt = fmtDate(c.date);
  return `<article class="cert"><button class="thumb" type="button" data-cv="${k}" aria-label="View certificate: ${esc(c.t)}"><img src="${certImg(c, 1)}" alt="" loading="lazy"><span class="zoom">View</span></button><div class="body">
    <div class="row"><span class="cat">${esc(c.cat)}</span></div>
    <h3>${esc(c.t)}</h3>
    <div class="tags">${c.skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
    <div class="acts"><button type="button" data-cv="${k}">View certificate</button>${c.verify ? `<a class="v" href="${esc(c.verify)}" target="_blank" rel="noopener">Verify ↗</a>` : ''}</div>
  </div></article>`;
}
/* certificate viewer */
const cvBox = $('#cv');
function openCert(k) {
  const c = P.certs[k]; if (!c) return; const dt = fmtDate(c.date);
  cvBox.querySelector('img').src = certImg(c); cvBox.querySelector('img').alt = 'Certificate: ' + c.t;
  cvBox.querySelector('.cv-t').textContent = c.t;
  cvBox.querySelector('.cv-m').textContent = c.iss + (dt ? ' · ' + dt : '') + ' · ' + verLine(c);
  const v = cvBox.querySelector('.cv-v'); v.hidden = !c.verify; if (c.verify) v.href = c.verify;
  cvBox.dataset.k = k; cvBox.hidden = false; document.body.style.overflow = 'hidden'; cvBox.querySelector('.cv-x').focus();
}
function closeCert() { cvBox.hidden = true; document.body.style.overflow = ''; }
document.addEventListener('click', e => { const b = e.target.closest('[data-cv]'); if (b) { openCert(+b.dataset.cv); return; }
  if (!cvBox.hidden && (e.target === cvBox || e.target.closest('.cv-x'))) closeCert(); });
document.addEventListener('keydown', e => { if (cvBox.hidden) return; if (e.key === 'Escape') closeCert();
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') openCert((+cvBox.dataset.k + (e.key === 'ArrowRight' ? 1 : -1) + P.certs.length) % P.certs.length); });
cvBox.querySelector('.cv-p').onclick = () => openCert((+cvBox.dataset.k - 1 + P.certs.length) % P.certs.length);
cvBox.querySelector('.cv-n').onclick = () => openCert((+cvBox.dataset.k + 1) % P.certs.length);
$('#cert-featured').innerHTML = P.certs.filter(c => c.feat).slice(0, 8).map(c => certCard(c)).join('');
$('#cert-total').textContent = P.certs.length;
const issuers = [...new Set(P.certs.map(c => c.iss))].sort(), cats = [...new Set(P.certs.map(certCat))].sort();
$('#cert-summary').innerHTML = `<div><b>${P.certs.length}</b><span>Certifications earned</span></div><div><b>${issuers.length}</b><span>Issuers represented</span></div><div><b>${P.certs.filter(c => c.verify).length}</b><span>Verifiable online</span></div>`;
$('#c-iss').innerHTML = `<option value="">All issuers</option>` + issuers.map(i => `<option>${esc(i)}</option>`).join('');
$('#c-cat').innerHTML = `<option value="">All categories</option>` + cats.map(i => `<option>${esc(i)}</option>`).join('');
const PAGE = 6; let shown = PAGE;
function renderCerts() {
  const q = $('#c-q').value.trim().toLowerCase(), iss = $('#c-iss').value, cat = $('#c-cat').value, so = $('#c-sort').value;
  let list = P.certs.filter(c => (!q || (c.t + ' ' + c.iss + ' ' + c.skills.join(' ')).toLowerCase().includes(q)) && (!iss || c.iss === iss) && (!cat || c.cat === cat));
  const key = c => c.date || '0000';
  list.sort(so === 'new' ? (a, b) => key(b).localeCompare(key(a)) : so === 'old' ? (a, b) => key(a).localeCompare(key(b)) : so === 'az' ? (a, b) => a.t.localeCompare(b.t) : (a, b) => a.iss.localeCompare(b.iss));
  const vis = list.slice(0, shown);
  $('#cert-all').innerHTML = vis.map(c => certCard(c)).join('') || '<p style="color:var(--muted)">No certificates match. Try clearing the filters.</p>';
  const label = { new: 'Newest first', old: 'Oldest first', az: 'Title A–Z', iss: 'Issuer A–Z' }[so];
  $('#c-status').textContent = `Showing ${vis.length} of ${list.length} matching certificates · ${label} · ${Math.max(0, list.length - vis.length)} remaining`;
  $('#c-more').hidden = vis.length >= list.length;
}
['#c-q', '#c-iss', '#c-cat', '#c-sort'].forEach(s => $(s).addEventListener('input', () => { shown = PAGE; renderCerts(); }));
$('#c-more').onclick = () => { shown += PAGE; renderCerts(); };
$('#c-clear').onclick = () => { $('#c-q').value = ''; $('#c-iss').value = ''; $('#c-cat').value = ''; $('#c-sort').value = 'new'; shown = PAGE; renderCerts(); };

/* ================= PROJECT CASE STUDY VIEW ================= */
function renderProject(id) {
  const s = proj(id); if (!s) return false; const i = P.projects.indexOf(s), next = P.projects[(i + 1) % P.projects.length];
  const v = $('#view-project'); v.style.setProperty('--c', dcol(s.d[0]));
  v.innerHTML = `<div class="wrap ph">
      <div class="crumb"><button type="button" data-home="projects">← All projects</button><span>/ ${esc(s.n)}</span></div>
      <p class="eyebrow">${String(i + 1).padStart(2, '0')} / ${esc(s.type)} · ${s.d.map(dname).join(' · ')}</p>
      <h1>${esc(s.n)}</h1>
      <p class="lead">${esc(s.summary)}</p>
      <div class="cta">${s.links && s.links.powerbi ? `<a class="btn primary" href="${esc(s.links.powerbi)}" target="_blank" rel="noopener">Open in Power BI ↗</a>` : ''}${s.links && s.links.tableau ? `<a class="btn primary" href="${esc(s.links.tableau)}" target="_blank" rel="noopener">Open in Tableau Public ↗</a>` : ''}${s.links && s.links.github ? `<a class="btn primary" href="${esc(s.links.github)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-gh"/></svg>View on GitHub ↗</a>` : ''}${s.links && s.links.jira ? `<a class="btn" href="${esc(s.links.jira)}" target="_blank" rel="noopener">View Jira board ↗</a>` : ''}<a class="btn primary" href="https://wa.me/971569674878?text=${encodeURIComponent('Hi Jayasuriya, I saw your project "' + s.n + '" and would like to discuss it.')}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-wa"/></svg>Discuss this project</a><a class="btn" href="Jayasuriya_J_Resume.pdf" target="_blank" rel="noopener">View CV</a></div>
      ${s.live ? '<p class="note2">● Live and in daily use. Internal tool, so screens with company data are not shown.</p>' : ''}
      <dl class="facts">${s.facts.map(f => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl>
      <figure class="exhibit" style="margin-left:0;margin-right:0">
        <div class="flow"><span class="lab a">AS-IS · before</span><div class="steps2">${s.asis.map(x => `<span>${esc(x)}</span>`).join('<i>→</i>')}</div></div>
        <div class="flow tobe"><span class="lab b">TO-BE · after</span><div class="steps2">${s.tobe.map(x => `<span>${esc(x)}</span>`).join('<i>→</i>')}</div></div>
        <figcaption class="cap2">${esc(s.exhibitCap)}</figcaption>
      </figure>
    </div>
    <nav class="ptabs" aria-label="Case study sections"><div class="wrap"><a href="#p-results" data-ptab>Results</a><a href="#p-problem" data-ptab>The Problem</a><a href="#p-approach" data-ptab>The Approach</a><a href="#p-decisions" data-ptab>Decision Log</a><a href="#p-notes" data-ptab>Field Notes</a></div></nav>
    <div class="wrap">
      <section class="pblock" id="p-results"><h2>What the business gained</h2><div>
        <dl class="kpis">${s.kpis.map(k => `<div><dd>${esc(k[0])}</dd><dt>${esc(k[1])}</dt></div>`).join('')}</dl>
        <div class="two"><div><h3>Outcomes</h3><ul>${s.results.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div class="box"><h3>Project evidence</h3><p>Tools, technology and methods used:</p><div class="tags">${s.t.map(t => `<span class="tag">${toolIcon(tool(t), 13)}${esc(tool(t).n)}</span>`).join('')}</div>
          <p style="margin-top:16px">Business area: ${s.d.map(dname).join(', ')}.</p><button class="linkish" type="button" data-showmap="${s.id}">See it in the systems map →</button></div></div>
      </div></section>
      <section class="pblock" id="p-problem"><h2>The business problem</h2><div>
        <p style="font-size:1.08rem;color:var(--ink)">${esc(s.problem)}</p>
        <div class="two" style="margin-top:24px"><div class="box"><h3>Objectives</h3><ul>${s.objectives.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div class="box"><h3>Business questions</h3><ol>${s.questions.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div></div>
      </div></section>
      <section class="pblock" id="p-approach"><h2>The approach</h2><div>
        <ol>${s.approach.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
      </div></section>
      <section class="pblock" id="p-decisions"><h2>Decision log</h2><div class="dlog">
        ${s.decisions.map((d, k) => `<div class="grp"><dl>
          <div class="r"><dt>Decision ${k + 1}</dt><dd>${esc(d.d)}</dd></div><div class="r"><dt>Trade-off</dt><dd>${esc(d.t)}</dd></div>
          <div class="r"><dt>Observation</dt><dd>${esc(d.o)}</dd></div><div class="r"><dt>Lesson</dt><dd>${esc(d.l)}</dd></div></dl></div>`).join('')}
      </div></section>
      <section class="pblock" id="p-notes"><div class="notes"><h3>Field notes</h3><p>Lessons from this project I now use in every delivery.</p><ul>${s.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div></section>
      <div class="pnext"><button class="btn" type="button" data-home="projects">← Back to projects</button><a class="btn primary" href="#project-${next.id}">Next project: ${esc(next.n)} →</a></div>
    </div>`;
  return true;
}
document.addEventListener('click', e => {
  const h = e.target.closest('[data-home]'); if (h) { e.preventDefault(); location.hash = h.dataset.home; return; }
  const m = e.target.closest('[data-showmap]'); if (m) { pinned = 's:' + m.dataset.showmap; location.hash = 'systems'; setTimeout(paint, 60); return; }
  const t = e.target.closest('[data-ptab]'); if (t) { e.preventDefault(); const el = document.querySelector(t.getAttribute('href')); el && el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }
});

/* ================= ROUTING ================= */
const views = { home: $('#view-home'), project: $('#view-project'), certs: $('#view-certs') };
function show(name) { Object.entries(views).forEach(([k, v]) => v.hidden = k !== name); }
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith('project-') && renderProject(h.slice(8))) { show('project'); scrollTo(0, 0); spyProject(); setActive(null); return; }
  if (h === 'certificates') { show('certs'); shown = PAGE; renderCerts(); scrollTo(0, 0); setActive('certifications'); return; }
  const wasHidden = views.home.hidden; show('home');
  if (wasHidden) draw();
  const el = h && document.getElementById(h);
  if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: wasHidden || RM ? 'auto' : 'smooth' }));
  else if (wasHidden) scrollTo(0, 0);
}
addEventListener('hashchange', route);

/* ================= SCROLL SPY (nav underline) ================= */
const spyLinks = $$('[data-spy]');
function setActive(id) { spyLinks.forEach(a => a.classList.toggle('active', a.dataset.spy === id)); }
const spyTargets = ['home', 'about', 'skills', 'process', 'evidence', 'systems', 'projects', 'certifications', 'principles', 'contact'];
const spyMap = { process: 'skills', evidence: 'skills', principles: 'certifications' };
function spy() {
  if (views.home.hidden) return;
  const y = innerHeight * 0.35; let cur = 'home';
  for (const id of spyTargets) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= y) cur = id; }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = 'contact';
  setActive(spyMap[cur] || cur);
}
function spyProject() {
  if (views.project.hidden) return; const tabs = $$('[data-ptab]'); let cur = tabs[0];
  tabs.forEach(t => { const el = document.querySelector(t.getAttribute('href')); if (el && el.getBoundingClientRect().top <= innerHeight * 0.3) cur = t; });
  tabs.forEach(t => t.classList.toggle('active', t === cur));
}
const tl = $$('.timeline li');
function spyTimeline() {
  if (views.home.hidden || !tl.length) return; let cur = tl[0];
  tl.forEach(li => { if (li.getBoundingClientRect().top <= innerHeight * 0.55) cur = li; });
  tl.forEach(li => li.classList.toggle('cur', li === cur));
}
addEventListener('scroll', () => { spy(); spyProject(); spyTimeline(); }, { passive: true });

/* ================= MENU, COPY, THEME ================= */
const menu = $('#menu'), burger = $('#burger');
burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
$('#copy').addEventListener('click', () => { const t = $('#toast'), a = $('#addr');
  const ok = () => t.textContent = 'Email address copied.';
  const fb = () => { const r = document.createRange(); r.selectNodeContents(a); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); t.textContent = 'Selected. Press Ctrl+C to copy.'; };
  try { navigator.clipboard.writeText(a.textContent).then(ok, fb); } catch (e) { fb(); } });

const root = document.documentElement, tbtn = $('#theme'), ico = $('#theme-ico');
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z', SUN = 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z';
let saved = null; try { saved = localStorage.getItem('jj-theme'); } catch (e) {}
function setTheme(t) { root.dataset.theme = t; ico.setAttribute('d', t === 'dark' ? SUN : MOON); tbtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); try { localStorage.setItem('jj-theme', t); } catch (e) {} if (t === 'dark') startStars(); }
tbtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

const cv = $('#stars'), cx = cv.getContext('2d'); let st = [], W = 0, H = 0, running = false, shoot = null, nextShoot = 0;
function size() { const pr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * pr; cv.height = H * pr; cx.setTransform(pr, 0, 0, pr, 0, 0);
  st = Array.from({ length: Math.min(560, Math.round(W * H / 2600)) }, () => { const z = Math.pow(Math.random(), 2); return { x: Math.random() * W, y: Math.random() * H, z, r: .3 + z * 1.3, p: Math.random() * 6.3, s: .5 + Math.random() * 2, w: Math.random() < .15 }; }); }
function startStars() { if (running) return; running = true; requestAnimationFrame(loop); }
function loop(now) {
  if (root.dataset.theme !== 'dark') { running = false; cx.clearRect(0, 0, W, H); return; }
  cx.clearRect(0, 0, W, H);
  const g = cx.createRadialGradient(W * .8, H * .15, 0, W * .8, H * .15, Math.max(W, H) * .7); g.addColorStop(0, 'rgba(90,80,170,.16)'); g.addColorStop(1, 'rgba(90,80,170,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  const g2 = cx.createRadialGradient(W * .1, H * .9, 0, W * .1, H * .9, Math.max(W, H) * .6); g2.addColorStop(0, 'rgba(40,120,170,.1)'); g2.addColorStop(1, 'rgba(40,120,170,0)'); cx.fillStyle = g2; cx.fillRect(0, 0, W, H);
  const t = now / 1000, off = scrollY;
  for (const s of st) { const y = ((s.y - off * s.z * .25) % H + H) % H, a = (.25 + s.z * .75) * (RM ? 1 : .7 + .3 * Math.sin(t * s.s + s.p));
    cx.fillStyle = s.w ? `rgba(255,226,190,${a})` : `rgba(225,232,255,${a})`; cx.beginPath(); cx.arc(s.x, y, s.r, 0, 6.283); cx.fill(); }
  if (!RM) { if (!shoot && now > nextShoot) { shoot = { x: Math.random() * W * .7, y: Math.random() * H * .35, l: 1 }; nextShoot = now + 7000 + Math.random() * 8000; }
    if (shoot) { shoot.x += 11; shoot.y += 4.5; shoot.l -= .018; const gr = cx.createLinearGradient(shoot.x - 120, shoot.y - 49, shoot.x, shoot.y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(235,240,255,${Math.max(0, shoot.l)})`);
      cx.strokeStyle = gr; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(shoot.x - 120, shoot.y - 49); cx.lineTo(shoot.x, shoot.y); cx.stroke(); if (shoot.l <= 0) shoot = null; } }
  if (RM) { running = false; return; }
  requestAnimationFrame(loop);
}
size(); addEventListener('resize', () => { size(); draw(); });
setTheme(saved === 'dark' ? 'dark' : 'light');

/* ================= START ================= */
draw(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
new ResizeObserver(() => draw()).observe(map);
renderCerts(); route(); spy(); spyTimeline();
})();
