/* =============================================================================
   graficos.js: gráficos feitos à mão em HTML e CSS, sem biblioteca.

   Por que HTML e não SVG com viewBox: no celular um SVG encolhe junto com o
   texto (12 px viram 5 px). Em HTML a barra encolhe e a letra continua legível.
   Toda função devolve TEXTO (HTML); quem põe na tela é o app.js.
   Regras de desenho: uma cor de destaque; âmbar só para "fora da faixa";
   o número escrito sempre ao lado da forma (quem lê com pressa lê o número).
   ============================================================================= */
window.GRAFICOS = (function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 1) A barra ATRÁS do rótulo ("por X"): linha limpa, valor e extra em colunas fixas.
  function listaBarras(itens, o) {
    o = o || {};
    const max = Math.max(1, ...itens.map(i => i.valor));
    return '<div class="lb">' + itens.map(i =>
      `<div class="lb-linha${i.drill ? ' clicavel' : ''}"${i.tip ? ` data-tip="${esc(i.tip)}"` : ''}${i.drill ? ` data-drill="${esc(i.drill)}" role="button" tabindex="0"` : ''}>` +
      `<div class="lb-rot"><span class="lb-fundo" style="width:${(i.valor / max * 100).toFixed(1)}%"></span><span class="lb-txt">${i.rotuloHtml || esc(i.rotulo)}</span></div>` +
      `<div class="lb-val">${esc(o.fmt ? o.fmt(i.valor) : i.valor)}</div>` +
      `<div class="lb-extra">${i.extra ? esc(i.extra) : ''}</div></div>`).join('') + '</div>';
  }

  // 2) Faixas salariais por grade, em escala logarítmica: cada faixa (80% a 120%
  //    do ponto médio) ocupa a mesma largura, e as grades sobem em escada.
  //    Faixa = barra clara; ponto médio = traço; média dos ocupantes = losango;
  //    cada ocupante = um ponto (âmbar quando está fora da faixa).
  function faixas(linhas, o) {
    const valores = [];
    linhas.forEach(l => { valores.push(l.faixa.min, l.faixa.max); l.pontos.forEach(p => valores.push(p.v)); });
    const lo = Math.log(Math.min(...valores) * 0.9), hi = Math.log(Math.max(...valores) * 1.06);
    const x = v => ((Math.log(v) - lo) / (hi - lo) * 100).toFixed(2);
    // Espalha os pontos na altura da linha de um jeito fixo (sempre o mesmo desenho).
    const altura = i => 5 + ((i * 7919) % 17) * 1.12;
    let h = '<div class="fx">';
    linhas.forEach(l => {
      const f = l.faixa;
      h += `<div class="fx-linha${l.drill ? ' clicavel' : ''}" data-tip="${esc(l.tip)}"${l.drill ? ` data-drill="${esc(l.drill)}" role="button" tabindex="0"` : ''}>` +
        `<div class="fx-rot"><b class="mono">G${l.grade}</b><small>${esc(l.sub)}</small></div><div class="fx-trilho">` +
        `<span class="fx-banda" style="left:${x(f.min)}%;width:${(x(f.max) - x(f.min)).toFixed(2)}%"></span>` +
        `<span class="fx-medio" style="left:${x(f.med)}%"></span>` +
        l.pontos.map((p, i) => `<span class="fx-ponto${p.fora ? ' fora' : ''}" style="left:${x(p.v)}%;top:${altura(i).toFixed(1)}px" data-tip="${esc(p.tip)}"></span>`).join('') +
        (l.media ? `<span class="fx-media" style="left:${x(l.media)}%" data-tip="${esc(l.tipMedia)}"></span>` : '') +
        `</div><div class="fx-val">${l.direitaHtml || ''}</div></div>`;
    });
    // Eixo: só valores "redondos" que caem dentro da escala.
    const marcas = [1000, 2000, 5000, 10000, 20000, 40000].filter(v => Math.log(v) >= lo && Math.log(v) <= hi);
    h += `<div class="fx-eixo"><div></div><div class="fx-marcas">${marcas.map(v => `<span style="left:${x(v)}%">${esc(o.fmtEixo(v))}</span>`).join('')}</div><div></div></div>`;
    h += `<div class="leg-linha"><span class="leg"><i class="lg-banda"></i>${esc(o.leg.banda)}</span><span class="leg"><i class="lg-medio"></i>${esc(o.leg.medio)}</span>` +
      `<span class="leg"><i class="lg-media"></i>${esc(o.leg.media)}</span><span class="leg"><i class="lg-ponto"></i>${esc(o.leg.ponto)}</span>` +
      `<span class="leg"><i class="lg-ponto fora"></i>${esc(o.leg.fora)}</span></div>`;
    return h + '</div>';
  }

  // 3) Uma barra empilhada que soma 100% (posição na faixa). Cada pedaço abre
  //    a lista de quem está nele. O número só entra no pedaço quando cabe.
  function segmentos(partes, o) {
    const tot = partes.reduce((s, p) => s + p.valor, 0) || 1;
    return `<div class="sg"><div class="sg-barra">` + partes.filter(p => p.valor).map(p =>
      `<button class="sg-p ${p.classe}" style="flex-grow:${p.valor}" data-drill="${esc(p.drill)}" data-tip="${esc(p.rotulo + ': ' + p.valor + ' (' + Math.round(p.valor / tot * 100) + '%)')}">` +
      `${p.valor / tot >= 0.09 ? `<span>${p.valor}</span>` : ''}</button>`).join('') + '</div>' +
      `<div class="sg-leg">${partes.map(p => `<button class="sg-item" data-drill="${esc(p.drill)}"><i class="sg-p ${p.classe}"></i>${esc(p.rotulo)} <b class="mono">${p.valor}</b></button>`).join('')}</div>` +
      (o && o.nota ? `<p class="nota-cartao">${esc(o.nota)}</p>` : '') + '</div>';
  }

  // 4) Ordenação de TODA tabela do app (um lugar só, para todas ordenarem igual).
  // Cada coluna diz o tipo: 'texto' (A→Z no 1º clique), 'num' ou 'data' (maior/mais novo
  // primeiro no 1º clique). O estado de uma tabela é { col, passo }: passo 1 = 1º clique,
  // passo 2 = invertido, col vazia = a ordem declarada (a que a tabela já vem).
  const vazioOrd = v => v == null || v === '' || (typeof v === 'number' && isNaN(v));
  // Por quê: "CG-2" antes de "CG-10" e "Área" junto de "area" (sem caixa nem acento).
  const cmpTexto = (a, b) => String(a).localeCompare(String(b), 'pt', { sensitivity: 'base', numeric: true });
  // Devolve uma CÓPIA ordenada; vazio vai para o fim nas duas direções e o empate
  // mantém a ordem declarada (por isso o índice original entra no desempate).
  function ordenar(lista, cols, ordem) {
    const c = ordem && ordem.col && cols.find(x => x.k === ordem.col);
    if (!c) return lista.slice();
    const sentido = (c.tipo === 'texto' ? 1 : -1) * (ordem.passo === 2 ? -1 : 1);
    const valor = x => { const v = c.v(x); return c.tipo === 'texto' || vazioOrd(v) ? v : +v; };   // data vira número (o instante)
    return lista.map((x, i) => ({ x, i, v: valor(x) }))
      .sort((p, q) => {
        const vp = vazioOrd(p.v), vq = vazioOrd(q.v);
        if (vp || vq) return vp && vq ? p.i - q.i : vp ? 1 : -1;
        return (c.tipo === 'texto' ? cmpTexto(p.v, q.v) : p.v - q.v) * sentido || p.i - q.i;
      }).map(o => o.x);
  }
  // O clique no cabeçalho: 1º clique, inverte, volta à ordem declarada.
  function proximaOrdem(ordem, k) {
    if (!ordem || ordem.col !== k) return { col: k, passo: 1 };
    return ordem.passo === 1 ? { col: k, passo: 2 } : { col: '', passo: 0 };
  }
  // O <th> com o <button> (teclado de graça), a seta (pelo CSS) e o aria-sort na coluna ativa.
  // extras = os atributos que o ouvinte de clique daquela tabela procura (ex.: data-g-ordem="nome").
  function thOrdena(c, rotulo, ordem, extras, classe) {
    const ativo = !!(ordem && ordem.col === c.k);
    const sobe = ativo && ((c.tipo === 'texto') === (ordem.passo === 1));
    return `<th${classe ? ` class="${classe}"` : ''}${ativo ? ` aria-sort="${sobe ? 'ascending' : 'descending'}"` : ''}>` +
      `<button type="button" ${extras} class="${ativo ? 'ativo ' + (sobe ? 'asc' : 'desc') : ''}">${esc(rotulo)}</button></th>`;
  }

  return { esc, listaBarras, faixas, segmentos, ordenar, proximaOrdem, thOrdena };
})();
