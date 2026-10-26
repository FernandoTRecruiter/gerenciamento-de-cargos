/* =============================================================================
   tela-organograma.js: o organograma de CARGOS como mapa de carreira.

   Cada ponto é um cargo. Duas vistas do mesmo dado:
   - ESCADA: cada coluna é uma família; quanto mais alto, maior a grade. Os cargos
     de entrada (aprendiz, estágio) ficam na base.
   - ÓRBITA: a entrada fica no centro e a grade cresce para fora; cada família é
     um raio, com o nome por fora do arco.
   As linhas são as TRILHAS de carreira dentro da família (catalogo.js). Clicar num
   ponto acende o caminho inteiro (de onde se vem e para onde se vai) e abre o
   detalhe logo abaixo do título.

   Como o desenho é feito (simples de propósito):
   1. tudo é calculado num quadro de 1000 x 700 "unidades";
   2. pontos e textos são HTML posicionados em % desse quadro; linhas e faixas são
      um SVG com o mesmo tamanho;
   3. ZOOM = deixar o quadro maior dentro de uma caixa com rolagem. Ponto e texto
      continuam do mesmo tamanho; só a distância entre eles cresce.
   ============================================================================= */
window.TELAS = window.TELAS || {};
window.TELAS.organograma = (function () {
  'use strict';
  const C = window.CATALOGO, O = window.OCUPACAO, TR = window.TRADUTOR, esc = window.GRAFICOS.esc;
  const UW = 1000, UH = 700;
  const COLS = C.AREAS_ORDEM.concat(['dir']);          // 8 famílias + a diretoria
  const ZOOMS = [1, 1.4, 2, 2.8, 4];
  const E = { vista: 'escada', faixa: 'grade', sel: null, q: '', z: innerWidth < 700 ? 2 : 0, ajuda: false };
  const pct = (v, total) => (v / total * 100).toFixed(3) + '%';
  const f = v => v.toFixed(1);

  // ---------------------------------------------------------------- 1. geometria
  // Cada cargo vira um ponto com a posição nas duas vistas. Cargos na mesma
  // família e grade ficam lado a lado (18 unidades entre eles).
  function geometria() {
    const cargos = C.todos().filter(c => COLS.includes(c.area));
    const G = Math.max(16, ...cargos.map(c => c.grade));
    const X0 = 120, X1 = 950, TOPO = 80, BASE = UH - 26;
    const colX = k => X0 + k * (X1 - X0) / (COLS.length - 1);
    const altG = (BASE - TOPO) / G, yG = g => BASE - (g - 0.5) * altG;
    const CX = UW / 2, CY = UH / 2 + 6, R0 = 30, RMAX = UH / 2 - 64, anel = (RMAX - R0) / G;
    const rG = g => R0 + (g - 0.5) * anel, ang = k => (-90 + k * 360 / COLS.length) * Math.PI / 180;
    const celulas = {};
    const nos = cargos.map(cg => ({ cg, k: COLS.indexOf(cg.area), g: cg.grade, r: O.resumo(cg.codigo) }))
      .sort((a, b) => a.k - b.k || a.g - b.g || (a.cg.codigo < b.cg.codigo ? -1 : 1));
    nos.forEach(n => { (celulas[n.k + '|' + n.g] = celulas[n.k + '|' + n.g] || []).push(n); });
    Object.values(celulas).forEach(l => l.forEach((n, i) => {
      const lado = (i - (l.length - 1) / 2) * 18;
      n.ex = colX(n.k) + lado; n.ey = yG(n.g);
      const a = ang(n.k) + lado / rG(n.g);
      n.ox = CX + rG(n.g) * Math.cos(a); n.oy = CY + rG(n.g) * Math.sin(a);
    }));
    const porCod = {};
    nos.forEach(n => { porCod[n.cg.codigo] = n; });
    const trilhas = C.TRILHAS.filter(([a, b]) => porCod[a] && porCod[b]);
    return { nos, porCod, trilhas, G, X0, X1, TOPO, BASE, colX, altG, yG, CX, CY, R0, RMAX, anel, rG, ang };
  }

  // Quem está no caminho do cargo escolhido: para cima (para onde leva) e para baixo (de onde vem).
  function caminho(cod, trilhas) {
    const anda = (de, para) => { const vistos = new Set([cod]), fila = [cod];
      while (fila.length) { const x = fila.shift(); trilhas.forEach(t => { if (t[de] === x && !vistos.has(t[para])) { vistos.add(t[para]); fila.push(t[para]); } }); }
      return vistos; };
    const acima = anda(0, 1), abaixo = anda(1, 0);
    return new Set([...acima, ...abaixo]);
  }

  // ---------------------------------------------------------------- 2. o desenho
  function desenho(ctx) {
    const T = ctx.T, Gm = geometria(), esc_ = E.vista === 'escada';
    const X = n => (esc_ ? n.ex : n.ox), Y = n => (esc_ ? n.ey : n.oy);
    let svg = `<svg class="mapa-svg" viewBox="0 0 ${UW} ${UH}" preserveAspectRatio="none" aria-hidden="true">`, rot = '';
    const rotulo = (x, y, txt, cls) => `<span class="mapa-rot ${cls}" style="left:${pct(x, UW)};top:${pct(y, UH)}">${esc(txt)}</span>`;
    const limites = C.FAIXAS_NIVEL.map(b => b.ate);           // onde muda o nível (linha mais marcada)
    if (esc_) {
      // Faixas: uma linha fina por grade; "por nível", a linha da troca de nível é a marcada.
      for (let g = 0; g <= Gm.G; g++) {
        const y = Gm.BASE - g * Gm.altG, forte = E.faixa === 'nivel' && (g === 0 || limites.includes(g));
        if (E.faixa === 'grade' || forte || g === Gm.G) svg += `<line class="${forte ? 'faixa-forte' : 'faixa'}" x1="${Gm.X0 - 58}" x2="${UW - 8}" y1="${f(y)}" y2="${f(y)}"/>`;
      }
      for (let g = 1; g <= Gm.G; g++) rot += rotulo(Gm.X0 - 64, Gm.yG(g), 'G' + g, 'rot-grade');
      if (E.faixa === 'nivel') C.FAIXAS_NIVEL.forEach(b => {
        if (b.de > Gm.G) return;
        rot += rotulo(Gm.X0 - 50, (Gm.yG(b.de) + Gm.yG(Math.min(b.ate, Gm.G))) / 2, C.L(b.nome, ctx.lang), 'rot-marca');
      });
      // Chave fina de cada grupo sobre as suas colunas, e o nome de cada família.
      C.GRUPOS.forEach(gr => {
        const ks = gr.areas.map(a => COLS.indexOf(a)), x0 = Gm.colX(Math.min(...ks)) - 42, x1 = Gm.colX(Math.max(...ks)) + 42;
        svg += `<path class="chave" d="M${f(x0)} 30 V22 H${f(x1)} V30"/>`;
        rot += rotulo((x0 + x1) / 2, 14, C.L(gr.nome, ctx.lang), 'rot-grupo');
      });
      COLS.forEach((a, k) => { rot += rotulo(Gm.colX(k), 50, ctx.nomeArea(a), 'rot-area'); });
    } else {
      // Órbita: um anel por grade (ou por nível) e a família por fora do arco.
      for (let g = 0; g <= Gm.G; g++) {
        const r = Gm.R0 + g * Gm.anel, forte = E.faixa === 'nivel' && (g === 0 || limites.includes(g));
        if (E.faixa === 'grade' || forte || g === Gm.G) svg += `<circle class="${forte || g === 0 ? 'faixa-forte' : 'faixa'}" cx="${Gm.CX}" cy="${Gm.CY}" r="${f(r)}"/>`;
      }
      const raio = -70 * Math.PI / 180;                       // os nomes das faixas correm neste raio, entre duas famílias
      if (E.faixa === 'grade') for (let g = 2; g <= Gm.G; g += 2) rot += rotulo(Gm.CX + Gm.rG(g) * Math.cos(raio), Gm.CY + Gm.rG(g) * Math.sin(raio), 'G' + g, 'rot-grade rot-anel');
      else C.FAIXAS_NIVEL.forEach(b => {
        if (b.de > Gm.G) return;
        const r = (Gm.rG(b.de) + Gm.rG(Math.min(b.ate, Gm.G))) / 2;
        rot += rotulo(Gm.CX + r * Math.cos(raio), Gm.CY + r * Math.sin(raio), C.L(b.nome, ctx.lang), 'rot-marca rot-anel');
      });
      if (E.faixa === 'grade') rot += rotulo(Gm.CX, Gm.CY, T('org_centro'), 'rot-centro');   // "por nível", a faixa Entrada já diz
      const RA = Gm.RMAX + 12, meio = (180 / COLS.length - 5) * Math.PI / 180;
      COLS.forEach((a, k) => {
        const a0 = Gm.ang(k) - meio, a1 = Gm.ang(k) + meio;
        svg += `<path class="arco" d="M${f(Gm.CX + RA * Math.cos(a0))} ${f(Gm.CY + RA * Math.sin(a0))} A${RA} ${RA} 0 0 1 ${f(Gm.CX + RA * Math.cos(a1))} ${f(Gm.CY + RA * Math.sin(a1))}"/>`;
        const c = Math.cos(Gm.ang(k)), lado = Math.abs(c) < 0.3 ? 'lado-meio' : c > 0 ? 'lado-dir' : 'lado-esq';
        const rr = RA + 16 + (lado === 'lado-meio' ? 4 : 0);
        rot += rotulo(Gm.CX + rr * Math.cos(Gm.ang(k)), Gm.CY + rr * Math.sin(Gm.ang(k)), ctx.nomeArea(a), 'rot-area rot-fora ' + lado);
      });
    }
    // As trilhas (curva suave na Escada; reta na Órbita).
    Gm.trilhas.forEach(([a, b]) => {
      const p = Gm.porCod[a], q = Gm.porCod[b];
      const d = esc_ && Math.abs(X(p) - X(q)) > 1
        ? `M${f(X(p))} ${f(Y(p))} C${f(X(p))} ${f((Y(p) + Y(q)) / 2)} ${f(X(q))} ${f((Y(p) + Y(q)) / 2)} ${f(X(q))} ${f(Y(q))}`
        : `M${f(X(p))} ${f(Y(p))} L${f(X(q))} ${f(Y(q))}`;
      svg += `<path class="trilha" data-de="${a}" data-para="${b}" pathLength="1" d="${d}"/>`;   // pathLength=1: o desenho do caminho vai de 0 a 1
    });
    svg += '</svg>';
    const nos = Gm.nos.map(n => {
      const pessoas = n.r.n === 1 ? T('org_pessoa') : n.r.n ? T('org_pessoas', { n: n.r.n }) : T('org_sem');
      const nome = C.L(n.cg.nome, ctx.lang);
      return `<button class="no${n.r.n ? '' : ' sem-gente'}${n.r.nVagas ? ' com-vaga' : ''}" data-acao="org:sel" data-cargo="${n.cg.codigo}"` +
        ` style="left:${pct(X(n), UW)};top:${pct(Y(n), UH)}" data-tip="${esc(nome + ' · G' + n.g + ' · ' + ctx.nomeArea(n.cg.area) + ' · ' + pessoas)}"` +
        ` aria-label="${esc(nome + ', G' + n.g + ', ' + pessoas)}"></button>`;
    }).join('');
    window.__mapa = { vista: E.vista, faixa: E.faixa, nos: Gm.nos.length, trilhas: Gm.trilhas.length, zoom: ZOOMS[E.z] };
    return { svg, rot, nos, Gm };
  }

  // ---------------------------------------------------------------- 3. o detalhe do cargo escolhido
  function detalhe(ctx, Gm) {
    const T = ctx.T, n = E.sel && Gm.porCod[E.sel];
    if (!n) return '';
    const cg = n.cg, r = n.r;
    const chips = cods => cods.length ? cods.map(c => `<button class="pilula" data-acao="org:sel" data-cargo="${c}">${esc(ctx.nomeCargo(c))} <b>G${C.porCodigo(c).grade}</b></button>`).join('')
      : `<span class="txt-fraco">${esc(T('org_nenhum'))}</span>`;
    const proximos = Gm.trilhas.filter(t => t[0] === cg.codigo).map(t => t[1]);
    const vemDe = Gm.trilhas.filter(t => t[1] === cg.codigo).map(t => t[0]);
    return `<section class="cartao org-det" data-testid="org-detalhe"><div class="org-det-cab"><div><span class="eyebrow">${esc(cg.codigo)}</span>` +
      `<h3>${esc(C.L(cg.nome, ctx.lang))}</h3><p lang="${ctx.langOutra}">${esc(C.L(cg.nome, ctx.lang === 'en' ? 'pt' : 'en'))}</p></div>` +
      `<div class="org-det-acoes"><button class="botao primario" data-doc="${cg.codigo}">${esc(T('org_abrir_ficha'))}</button>` +
      `<button class="botao leve" data-acao="org:limpar">${esc(T('org_limpar'))}</button></div></div>` +
      `<div class="org-det-fatos"><span class="chip neutro">${esc(ctx.nomeArea(cg.area))}</span><span class="chip neutro">${esc(ctx.nomeNivel(cg.nivel))}</span>` +
      `<span class="chip acc">G${cg.grade}</span><span>${esc(r.n === 1 ? T('org_pessoa') : r.n ? T('org_pessoas', { n: r.n }) : T('org_sem'))}</span>` +
      `${r.nVagas ? `<span class="org-vaga">${esc(T(r.nVagas === 1 ? 'org_vaga' : 'org_vagas', { n: r.nVagas }))}</span>` : ''}</div>` +
      `<div class="org-det-trilhas"><div><span class="campo-rot">${esc(T('org_proximos'))}</span><div class="chips-filtro">${chips(proximos)}</div></div>` +
      `<div><span class="campo-rot">${esc(T('org_vem_de'))}</span><div class="chips-filtro">${chips(vemDe)}</div></div></div></section>`;
  }

  // ---------------------------------------------------------------- 4. a tela
  function render(ctx) {
    const T = ctx.T;
    const seg = (nome, valor, opcoes) => `<div class="seg-botoes" role="group">` + opcoes.map(([v, rot]) =>
      `<button class="${valor === v ? 'ativo' : ''}" data-acao="org:${nome}" data-valor="${v}" aria-pressed="${valor === v}">${esc(T(rot))}</button>`).join('') + '</div>';
    return `<div class="tela-cab org-tit"><div><h2 class="tela-titulo">${esc(T('org_titulo'))}</h2><p class="tela-sub">${esc(T('org_sub'))}</p></div>` +
      `<button class="botao leve" data-acao="org:ajuda" aria-expanded="${E.ajuda}">? ${esc(T('org_como_ler'))}</button></div>` +
      (E.ajuda ? `<div class="cartao org-ajuda"><p>${esc(T('org_ajuda_1'))}</p><p>${esc(T('org_ajuda_2'))}</p><p>${esc(T('org_ajuda_3'))}</p></div>` : '') +
      `<div id="org-detalhe"></div>` +
      `<div class="org-barra">${seg('vista', E.vista, [['escada', 'org_escada'], ['orbita', 'org_orbita']])}` +
      `<span class="campo-rot org-faixa-rot">${esc(T('org_faixas'))}</span>${seg('faixa', E.faixa, [['grade', 'org_por_grade'], ['nivel', 'org_por_nivel']])}` +
      `<label class="org-busca"><input type="search" class="busca" data-campo="org:busca" value="${esc(E.q)}" placeholder="${esc(T('org_buscar'))}" aria-label="${esc(T('org_buscar'))}"><span id="org-achados" class="tb-conta"></span></label>` +
      `<div class="org-zoom"><span class="mono" id="org-pct">${Math.round(ZOOMS[E.z] * 100)}%</span><div class="seg-botoes">` +
      `<button data-acao="org:menos" aria-label="${esc(T('org_afastar'))}">−</button><button data-acao="org:mais" aria-label="${esc(T('org_aproximar'))}">+</button>` +
      `<button data-acao="org:ajustar">${esc(T('org_ajustar'))}</button></div></div></div>` +
      `<div class="mapa-caixa" id="mapa-caixa" data-testid="mapa"><div class="mapa-palco" id="mapa-palco"></div></div>` +
      `<p class="org-leg"><span class="leg"><i class="lg-no"></i>${esc(T('org_leg_no'))}</span><span class="leg"><i class="lg-no sem-gente"></i>${esc(T('org_leg_vazio'))}</span>` +
      `<span class="leg"><i class="lg-no com-vaga"></i>${esc(T('org_leg_vaga'))}</span><span class="leg"><i class="lg-linha"></i>${esc(T('org_leg_trilha'))}</span>` +
      `<span class="leg"><i class="lg-linha acesa"></i>${esc(T('org_leg_aceso'))}</span></p>`;
  }

  let ctxAtual = null, GmAtual = null, zAgora = null, animZoom = 0, animArraste = 0, ultimoSel = null;
  const parado = () => window.CONTEXTO.semAnimacao();    // ?foto=1 ou "menos movimento" no sistema

  // Desenha o mapa. Com "deslizar" (troca de Escada e Órbita, ou das faixas), os pontos
  // que já estão na tela só mudam de lugar: o CSS anima left/top e eles deslizam até o
  // lugar novo; linhas e nomes são trocados e voltam esmaecendo.
  function desenharMapa(deslizar) {
    const palco = document.getElementById('mapa-palco'), caixa = document.getElementById('mapa-caixa');
    if (!palco || !ctxAtual) return;
    const { svg, rot, nos, Gm } = desenho(ctxAtual);
    GmAtual = Gm;
    zAgora = ZOOMS[E.z];
    palco.style.setProperty('--z', zAgora);      // o CSS faz a conta: largura = zoom x quadro que cabe na caixa
    const antigos = deslizar ? palco.querySelectorAll('.no') : [];
    if (antigos.length) {
      const porCod = {};
      antigos.forEach(b => { porCod[b.dataset.cargo] = b; });
      const molde = document.createElement('div');
      molde.innerHTML = nos;
      molde.querySelectorAll('.no').forEach(n => { const b = porCod[n.dataset.cargo]; if (b) { b.style.left = n.style.left; b.style.top = n.style.top; } });
      palco.querySelector('.mapa-svg').outerHTML = svg;
      palco.querySelector('.mapa-rotulos').innerHTML = rot;
      palco.classList.remove('trocando'); void palco.offsetWidth; palco.classList.add('trocando');
    } else {
      palco.innerHTML = svg + `<div class="mapa-rotulos">${rot}</div><div class="mapa-nos">${nos}</div>`;
    }
    palco.style.setProperty('--u', (1000 / palco.offsetWidth).toFixed(4));   // o traço das trilhas não engorda com o zoom
    caixa.classList.toggle('arrastavel', E.z > 0);
    destacar();
  }

  // Acende o caminho do escolhido e marca os achados da busca (sem redesenhar o mapa).
  function destacar() {
    const ctx = ctxAtual, Gm = GmAtual;
    if (!ctx || !Gm) return;
    const aceso = E.sel ? caminho(E.sel, Gm.trilhas) : null;
    const q = TR.semAcento(E.q.trim());
    const achados = q ? Gm.nos.filter(n => TR.semAcento(n.cg.nome[0] + ' ' + n.cg.nome[1] + ' ' + n.cg.codigo).includes(q)).map(n => n.cg.codigo) : null;
    // Quantos passos cada cargo aceso está do escolhido: o caminho se desenha dele para fora.
    const dist = {};
    if (aceso) {
      dist[E.sel] = 0;
      const fila = [E.sel];
      while (fila.length) {
        const x = fila.shift();
        Gm.trilhas.forEach(([a, b]) => {
          if (!aceso.has(a) || !aceso.has(b)) return;
          const y = a === x ? b : b === x ? a : null;
          if (y && dist[y] == null) { dist[y] = dist[x] + 1; fila.push(y); }
        });
      }
    }
    document.querySelectorAll('#mapa-palco .no').forEach(b => {
      const c = b.dataset.cargo;
      b.classList.toggle('escolhido', c === E.sel);
      b.classList.toggle('aceso', !!aceso && aceso.has(c));
      b.classList.toggle('achado', !!achados && achados.includes(c));
      b.classList.toggle('apagado', (!!aceso && !aceso.has(c)) || (!!achados && !achados.includes(c)));
    });
    document.querySelectorAll('#mapa-palco .trilha').forEach(p => {
      const ok = !!aceso && aceso.has(p.dataset.de) && aceso.has(p.dataset.para);
      p.classList.toggle('acesa', ok);
      p.classList.toggle('apagada', !!(aceso || achados) && !ok);
      if (ok) {
        const da = dist[p.dataset.de], dp = dist[p.dataset.para];
        p.style.setProperty('--ordem', Math.min(da, dp));
        p.classList.toggle('reversa', dp < da);      // a ponta mais perto do escolhido é o fim: desenha do fim
      }
    });
    // Outro cargo escolhido: as linhas que já estavam acesas também se desenham de novo.
    if (E.sel !== ultimoSel && !parado()) {
      document.querySelectorAll('#mapa-palco .trilha.acesa').forEach(p => p.getAnimations().forEach(a => { a.cancel(); a.play(); }));
    }
    ultimoSel = E.sel;
    const conta = document.getElementById('org-achados');
    if (conta) conta.textContent = achados ? ctx.T('org_achados', { n: achados.length }) : '';
    // O detalhe só é refeito quando o escolhido muda (assim ele entra com a transição uma vez).
    const det = document.getElementById('org-detalhe');
    if (det && det.dataset.de !== (E.sel || '')) { det.innerHTML = detalhe(ctx, Gm); det.dataset.de = E.sel || ''; }
    window.__mapa.sel = E.sel; window.__mapa.acesos = aceso ? aceso.size : 0; window.__mapa.achados = achados ? achados.length : null;
  }

  // Passar o mouse num ponto: os vizinhos diretos crescem um pouco e as linhas até eles acendem.
  function realca(cod) {
    document.querySelectorAll('#mapa-palco .vizinho, #mapa-palco .realce').forEach(e => e.classList.remove('vizinho', 'realce'));
    if (!cod || !GmAtual) return;
    GmAtual.trilhas.forEach(([a, b]) => {
      if (a !== cod && b !== cod) return;
      const outro = document.querySelector(`#mapa-palco .no[data-cargo="${a === cod ? b : a}"]`);
      const linha = document.querySelector(`#mapa-palco .trilha[data-de="${a}"][data-para="${b}"]`);
      if (outro) outro.classList.add('vizinho');
      if (linha) linha.classList.add('realce');
    });
  }

  function montar(ctx) {
    ctxAtual = ctx;
    desenharMapa(false);
    const caixa = document.getElementById('mapa-caixa'), palco = document.getElementById('mapa-palco');
    if (!caixa || !palco) return;
    // Arrastar para olhar o mapa quando ele está maior que a caixa. Ao soltar em
    // movimento, ele ainda desliza um pouco e para devagar (velocidade x 0,92 por quadro).
    caixa.addEventListener('pointerdown', ev => {
      if (E.z === 0 || ev.target.closest('.no') || (ev.button !== undefined && ev.button !== 0)) return;
      cancelAnimationFrame(animArraste);
      let ux = ev.clientX, uy = ev.clientY, ut = performance.now(), vx = 0, vy = 0;
      caixa.classList.add('arrastando');
      const mexe = e => {
        const t = performance.now(), dt = Math.max(8, t - ut);
        caixa.scrollLeft -= e.clientX - ux; caixa.scrollTop -= e.clientY - uy;
        vx = (e.clientX - ux) / dt; vy = (e.clientY - uy) / dt; ux = e.clientX; uy = e.clientY; ut = t;
      };
      const solta = () => {
        removeEventListener('pointermove', mexe); removeEventListener('pointerup', solta);
        caixa.classList.remove('arrastando');
        if (parado() || performance.now() - ut > 80) return;      // parou antes de soltar: sem embalo
        let px = vx * 16, py = vy * 16;
        const desliza = () => {
          if (Math.abs(px) < 0.4 && Math.abs(py) < 0.4) return;
          caixa.scrollLeft -= px; caixa.scrollTop -= py; px *= 0.92; py *= 0.92;
          animArraste = requestAnimationFrame(desliza);
        };
        animArraste = requestAnimationFrame(desliza);
      };
      addEventListener('pointermove', mexe); addEventListener('pointerup', solta);
    });
    palco.addEventListener('mouseover', ev => { const b = ev.target.closest && ev.target.closest('.no'); if (b) realca(b.dataset.cargo); });
    palco.addEventListener('mouseout', ev => {
      const b = ev.target.closest && ev.target.closest('.no');
      if (b && !(ev.relatedTarget && b.contains(ev.relatedTarget))) realca(null);
    });
  }

  // Zoom suave mantendo o meio da caixa no lugar: guarda que ponto do quadro (em fração,
  // de 0 a 1) está no meio e, a cada quadro da animação (~0,3 s), cresce um pouco e rola até ele.
  function zoom(novo) {
    const caixa = document.getElementById('mapa-caixa'), palco = document.getElementById('mapa-palco');
    E.z = Math.max(0, Math.min(ZOOMS.length - 1, novo));
    window.__mapa.zoom = ZOOMS[E.z];
    const pct = document.getElementById('org-pct');
    if (pct) pct.textContent = Math.round(ZOOMS[E.z] * 100) + '%';
    if (!caixa || !palco) return;
    caixa.classList.toggle('arrastavel', E.z > 0);
    const fx = (caixa.scrollLeft + caixa.clientWidth / 2 - palco.offsetLeft) / palco.offsetWidth;
    const fy = (caixa.scrollTop + caixa.clientHeight / 2 - palco.offsetTop) / palco.offsetHeight;
    const z0 = zAgora == null ? ZOOMS[E.z] : zAgora, z1 = ZOOMS[E.z];
    const aplica = z => {
      zAgora = z;
      palco.style.setProperty('--z', z);
      palco.style.setProperty('--u', (1000 / palco.offsetWidth).toFixed(4));
      caixa.scrollLeft = fx * palco.offsetWidth + palco.offsetLeft - caixa.clientWidth / 2;
      caixa.scrollTop = fy * palco.offsetHeight + palco.offsetTop - caixa.clientHeight / 2;
    };
    cancelAnimationFrame(animZoom);
    if (parado() || z0 === z1) { aplica(z1); return; }
    const t0 = performance.now(), dur = 320;
    const passo = agora => {
      const k = Math.min(1, (agora - t0) / dur), e = 1 - Math.pow(1 - k, 3);    // começa rápido e chega devagar
      aplica(z0 + (z1 - z0) * e);
      if (k < 1) animZoom = requestAnimationFrame(passo);
    };
    animZoom = requestAnimationFrame(passo);
  }

  // Liga o botão escolhido de um seletor sem redesenhar a tela (quem anima a troca é o mapa).
  function marcaSeg(nome, valor) {
    document.querySelectorAll(`[data-acao="org:${nome}"]`).forEach(b => {
      const on = b.dataset.valor === valor;
      b.classList.toggle('ativo', on); b.setAttribute('aria-pressed', on);
    });
  }

  function acao(nome, el, ctx) {
    ctxAtual = ctx;
    if (nome === 'sel') {
      E.sel = el.dataset.cargo; destacar();
      document.getElementById('org-detalhe').scrollIntoView({ block: 'nearest', behavior: parado() ? 'auto' : 'smooth' });
      return;
    }
    if (nome === 'limpar') { E.sel = null; destacar(); return; }
    if (nome === 'vista' || nome === 'faixa') {
      if (E[nome] === el.dataset.valor) return;
      E[nome] = el.dataset.valor; marcaSeg(nome, E[nome]); desenharMapa(true);
      return;
    }
    if (nome === 'ajuda') { E.ajuda = !E.ajuda; ctx.desenhar(); return; }
    if (nome === 'mais') return zoom(E.z + 1);
    if (nome === 'menos') return zoom(E.z - 1);
    if (nome === 'ajustar') return zoom(0);
  }
  function campo(nome, el, ctx) {
    ctxAtual = ctx;
    if (nome === 'busca') { E.q = el.value; destacar(); }
  }
  // Enter na busca escolhe o primeiro achado.
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || !ev.target.matches || !ev.target.matches('[data-campo="org:busca"]') || !GmAtual) return;
    const q = TR.semAcento(E.q.trim());
    const n = q && GmAtual.nos.find(x => TR.semAcento(x.cg.nome[0] + ' ' + x.cg.nome[1] + ' ' + x.cg.codigo).includes(q));
    if (n) { E.sel = n.cg.codigo; destacar(); }
  });

  return { render, montar, acao, campo, estado: E };
})();
