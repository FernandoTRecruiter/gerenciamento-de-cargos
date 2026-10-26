/* =============================================================================
   tela-geral.js: a VISÃO GERAL (o painel dos cargos).

   Lida de cima para baixo: onde estamos -> do que o catálogo é feito ->
   quanto se paga em cada grade -> o que está vazio -> o que está sendo pedido.
   Regra que vale para a tela toda: todo número tem o "i" com a conta e quase
   tudo é clicável (data-drill), abrindo a lista que está por trás do número.
   ============================================================================= */
window.TELAS = window.TELAS || {};
window.TELAS.geral = (function () {
  'use strict';
  const G = window.GRAFICOS, esc = G.esc, C = window.CATALOGO;

  // Um indicador ("herói"): rótulo + "i", número (clicável), linha de apoio.
  function heroi(ctx, o) {
    const num = o.drill ? `<button class="num-drill" data-drill="${o.drill}" data-tip="${esc(ctx.T('clique_lista'))}">${o.numero}</button>` : o.numero;
    return `<div class="heroi${o.escuro ? ' escuro' : ''}" data-kpi="${o.id}">` +
      `<div class="h-rot"><span>${esc(o.rotulo)}</span><button class="info" data-conta="${o.id}" aria-label="${esc(ctx.T('x_titulo'))}: ${esc(o.rotulo)}">i</button></div>` +
      `<div class="h-num">${num}${o.chip ? ` <span class="chip ${o.chip[0]}">${esc(o.chip[1])}</span>` : ''}</div>` +
      `<div class="h-sub">${o.sub || ''}</div></div>`;
  }
  const secao = (id, titulo, sub, corpo) =>
    `<section class="secao" id="s-${id}" data-titulo="${esc(titulo)}"><header class="s-cab"><h2>${esc(titulo)}</h2>${sub ? `<p>${sub}</p>` : ''}</header>${corpo}</section>`;
  const cartao = (titulo, corpo, extra) => `<div class="cartao${extra ? ' ' + extra : ''}">${titulo ? `<h3>${esc(titulo)}</h3>` : ''}${corpo}</div>`;
  // Ordem escolhida no cabeçalho da tabela "Cargos sem ocupante" (col vazia = a ordem do catálogo).
  const E = { ordem: { col: '', passo: 0 } };

  // A tabela "Cargos sem ocupante", com o cabeçalho que ordena (a ordenação é a do app, GRAFICOS.ordenar).
  function tabelaSem(ctx, M) {
    const T = ctx.T, res = cg => M.resumo[cg.codigo];
    const cols = [['codigo', 'col_codigo', 'texto', cg => cg.codigo], ['cargo', 'col_cargo', 'texto', cg => ctx.nomeCargo(cg.codigo)], ['area', 'col_familia', 'texto', cg => ctx.nomeArea(cg.area)],
      ['nivel', 'col_nivel', 'num', cg => window.DADOS.niveis[cg.nivel].ordem], ['grade', 'col_grade', 'num', cg => cg.grade, 'dir'], ['vagas', 'col_vagas', 'num', cg => res(cg).nVagas, 'dir'],
      ['criado', 'col_criado', 'data', cg => cg.criadoEm]].map(([k, t, tipo, v, classe]) => ({ k, t, tipo, v, classe: classe || '' }));
    const sem = G.ordenar(M.semOcupante, cols, E.ordem);
    return `<table class="tabela"><thead><tr>${cols.map(c => G.thOrdena(c, T(c.t), E.ordem, `data-acao="ger:ordem" data-col="${c.k}"`, c.classe)).join('')}</tr></thead><tbody>` +
      sem.map(cg => `<tr class="tr-click" data-doc="${cg.codigo}" tabindex="0"><td class="mono">${cg.codigo}</td><td><b>${esc(ctx.nomeCargo(cg.codigo))}</b>${cg.origem === 'requisicao' ? ` <span class="chip ok">${esc(T('d_novo'))}</span>` : ''}</td>` +
        `<td>${esc(ctx.nomeArea(cg.area))}</td><td>${esc(ctx.nomeNivel(cg.nivel))}</td><td class="dir mono">G${cg.grade}</td>` +
        `<td class="dir mono">${res(cg).nVagas ? `<span class="chip acc">${res(cg).nVagas}</span>` : '0'}</td><td class="mono">${ctx.data(cg.criadoEm)}</td></tr>`).join('') + '</tbody></table>';
  }
  // Clique no cabeçalho: refaz só a tabela (a página não pula) e devolve o foco ao mesmo botão.
  function acao(nome, el, ctx) {
    if (nome !== 'ordem' || !ctx.ultimo) return;
    E.ordem = G.proximaOrdem(E.ordem, el.dataset.col);
    const caixa = document.getElementById('sem-corpo');
    if (!caixa) return ctx.desenhar();
    caixa.innerHTML = tabelaSem(ctx, ctx.ultimo);
    const b = caixa.querySelector(`[data-col="${el.dataset.col}"]`); if (b) b.focus();
  }

  function render(ctx) {
    const T = ctx.T, M = window.METRICAS.calcular();
    ctx.ultimo = M;
    const dataRef = ctx.data(ctx.O.dataRef);

    // As contas por trás de cada número (o "i").
    ctx.conta('cargos', T('k_cargos'), T('x_cargos'), [[T('x_base'), M.base], [T('x_criados'), M.criados.length], [T('resultado'), M.cargos.length]]);
    ctx.conta('ocup', T('k_ocup'), T('x_ocup'), [[T('x_ativos', { d: dataRef }), M.ativos], [T('x_com_cargo'), M.nOcup],
      [T('x_cargos_ocupados'), M.ocupados.length], [T('x_media_por_cargo'), ctx.num(M.mediaPorCargo, 1)]]);
    ctx.conta('abertas', T('k_abertas'), T('x_abertas'), [[T('x_vagas'), M.vagas.length], [T('x_req_analise'), M.porStatus.analise],
      [T('x_req_alteracao'), M.porStatus.alteracao]], T('x_abertas_nota'));
    ctx.conta('salario', T('k_salario'), T('x_salario'), [[T('x_soma'), ctx.brl(M.somaSal)], [T('k_ocup'), M.nOcup],
      [T('resultado'), ctx.brl(M.mediaSal)], [T('mediana'), ctx.brl(M.medianaSal)]], T('x_ficticio'));
    ctx.conta('dispersao', T('k_dispersao'), T('x_dispersao'), [[T('k_ocup'), M.nOcup], [T('x_cr_medio'), ctx.pct(M.crMedio, 1)],
      [T('x_abaixo'), M.abaixo.length], [T('x_acima'), M.acima.length], [T('x_dentro'), M.dentro]], T('x_dispersao_nota'));
    ctx.conta('sem', T('k_sem'), T('x_sem'), [[T('k_cargos'), M.cargos.length], [T('x_com_ocupante'), M.ocupados.length],
      [T('resultado'), M.semOcupante.length], [T('x_sem_com_vaga'), M.semComVaga.length]]);

    // 1. Onde estamos: seis números e o resumo em frases.
    const fora = M.abaixo.length + M.acima.length;
    let h = '<div class="herois h3">' +
      heroi(ctx, { id: 'cargos', escuro: true, rotulo: T('k_cargos'), drill: 'cargos', numero: ctx.num(M.cargos.length),
        sub: T('s_cargos', { f: Object.values(M.porArea).filter(a => a.cargos).length, n: M.criados.length }) }) +
      heroi(ctx, { id: 'ocup', rotulo: T('k_ocup'), drill: 'ocup', numero: ctx.num(M.nOcup),
        sub: T('s_ocup', { m: ctx.num(M.mediaPorCargo, 1) }) }) +
      heroi(ctx, { id: 'abertas', rotulo: T('k_abertas'),
        numero: `<button class="num-drill" data-drill="vagas" data-tip="${esc(T('s_vagas_tip'))}">${M.vagas.length}</button> <span class="barra-sep">/</span> ` +
          `<button class="num-drill" data-drill="req-abertas" data-tip="${esc(T('s_req_tip'))}">${M.reqAbertas.length}</button>`,
        sub: T('s_abertas') }) +
      heroi(ctx, { id: 'salario', rotulo: T('k_salario'), drill: 'ocup-salario', numero: ctx.brl(M.mediaSal),
        sub: T('s_salario', { m: ctx.brl(M.medianaSal) }) }) +
      heroi(ctx, { id: 'dispersao', rotulo: T('k_dispersao'), drill: 'ocup-fora', numero: ctx.pct(M.crMedio, 1),
        chip: fora ? ['warn', T('s_fora_chip', { n: fora })] : ['ok', T('s_dentro_chip')],
        sub: T('s_dispersao', { a: M.abaixo.length, b: M.acima.length }) }) +
      heroi(ctx, { id: 'sem', rotulo: T('k_sem'), drill: 'cargos-sem', numero: ctx.num(M.semOcupante.length),
        sub: T('s_sem', { v: M.semComVaga.length }) }) + '</div>';
    // Resumo em frases: cada uma leva à lista que a prova.
    const maiorArea = Object.entries(M.porArea).sort((a, b) => b[1].ocupantes - a[1].ocupantes)[0];
    const maiorGrade = M.grades.slice().sort((a, b) => b.ocupantes.length - a.ocupantes.length)[0];
    const frases = [
      [T('ins_familia', { a: ctx.nomeArea(maiorArea[0]), c: maiorArea[1].cargos, p: maiorArea[1].ocupantes, pc: ctx.pct(maiorArea[1].ocupantes / (M.nOcup || 1), 0) }), 'area:' + maiorArea[0]],
      [T('ins_grade', { g: maiorGrade.grade, n: maiorGrade.ocupantes.length, f: ctx.brl(maiorGrade.faixa.min), t: ctx.brl(maiorGrade.faixa.max) }), 'grade:' + maiorGrade.grade],
      [T(fora === 1 ? 'ins_fora_1' : 'ins_fora', { n: fora, a: M.abaixo.length, b: M.acima.length }), 'ocup-fora'],
      [T('ins_sem', { n: M.semOcupante.length, v: M.semComVaga.length }), 'cargos-sem'],
      [T('ins_pedidos', { n: M.porStatus.analise, p: M.preAprovadas.length, a: M.porStatus.alteracao }), 'req-abertas']
    ];
    h += cartao(T('s_resumo'), '<ul class="insights">' + frases.map(([t, d]) =>
      `<li><button class="ins" data-drill="${d}">${esc(t)}<span aria-hidden="true">→</span></button></li>`).join('') + '</ul>', 'resumo-cartao');
    let out = `<div class="tela-cab"><div><h2 class="tela-titulo">${esc(T('aba_geral'))}</h2><p class="tela-sub">${esc(T('geral_sub'))}</p></div></div>` +
      secao('onde', T('sec_onde'), esc(T('sec_onde_sub', { d: dataRef })), h);

    // 2. Do que o catálogo é feito: família e nível (cargos e pessoas).
    const itensArea = C.AREAS_ORDEM.concat(['dir']).map(a => ({ rotulo: ctx.nomeArea(a), valor: M.porArea[a].cargos,
      extra: T('n_pessoas', { n: M.porArea[a].ocupantes }), drill: 'area:' + a,
      tip: T('tip_area', { a: ctx.nomeArea(a), c: M.porArea[a].cargos, p: M.porArea[a].ocupantes }) }));
    const itensNivel = C.NIVEIS_DESC.map(n => ({ rotulo: ctx.nomeNivel(n), valor: M.porNivel[n].cargos,
      extra: T('n_pessoas', { n: M.porNivel[n].ocupantes }), drill: 'nivel:' + n,
      tip: T('tip_area', { a: ctx.nomeNivel(n), c: M.porNivel[n].cargos, p: M.porNivel[n].ocupantes }) }));
    out += secao('composicao', T('sec_composicao'), `${esc(T('sec_composicao_sub'))} · <span class="dica-clique">${esc(T('clique_lista'))}</span>`,
      '<div class="grade2">' + cartao(T('c_por_familia'), G.listaBarras(itensArea)) + cartao(T('c_por_nivel'), G.listaBarras(itensNivel)) + '</div>');

    // 3. Faixas salariais por grade + posição de cada pessoa dentro da faixa.
    const linhas = M.grades.map(g => ({
      grade: g.grade, faixa: g.faixa, media: g.media, drill: g.ocupantes.length ? 'grade:' + g.grade : null,
      sub: T('n_cargos_pessoas', { c: g.cargos.length, p: g.ocupantes.length }),
      tip: T('tip_grade', { g: g.grade, min: ctx.brl(g.faixa.min), med: ctx.brl(g.faixa.med), max: ctx.brl(g.faixa.max), p: g.ocupantes.length }),
      tipMedia: T('tip_media', { v: g.media ? ctx.brl(g.media) : '-' }),
      pontos: g.ocupantes.map(o => ({ v: o.salario, fora: o.faixaPos === 'abaixo' || o.faixaPos === 'acima',
        tip: `${o.nome} · ${ctx.nomeCargo(o.cargo)} · ${ctx.brl(o.salario)} (${ctx.pct(o.cr, 0)})` })),
      direitaHtml: g.ocupantes.length ? `<b class="mono">${ctx.brl(g.media)}</b><small>CR ${ctx.pct(g.crMedio, 0)}${g.fora ? ` · <span class="txt-warn">${g.fora} ${esc(T('fora_curto'))}</span>` : ''}</small>`
        : `<small>${esc(T('sem_pessoas'))}</small>`
    }));
    const pos = M.porPosicao;
    const partes = [['abaixo', 'warn'], ['q1', 'o1'], ['q2', 'o2'], ['q3', 'o3'], ['q4', 'o4'], ['acima', 'warn']]
      .map(([k, cls]) => ({ rotulo: T('pos_' + k), valor: pos[k], classe: cls, drill: 'pos:' + k }));
    out += secao('faixas', T('sec_faixas'), esc(T('sec_faixas_sub')),
      cartao('', G.faixas(linhas, { fmtEixo: v => ctx.brlCurto(v), leg: { banda: T('leg_banda'), medio: T('leg_medio'), media: T('leg_media'), ponto: T('leg_ponto'), fora: T('leg_fora') } }), 'cartao-faixas') +
      cartao(T('c_posicao'), G.segmentos(partes, { nota: T('nota_posicao') })));

    // 4. Cargos sem ocupante (com a vaga, quando já existe).
    const sem = M.semOcupante;
    const tabelaSemHtml = sem.length ? `<div class="tb-rolagem" id="sem-corpo">${tabelaSem(ctx, M)}</div>` : `<p class="vazio-txt">${esc(T('sem_cargo_vazio'))}</p>`;
    out += secao('sem', T('sec_sem'), esc(T('sec_sem_sub')), cartao('', tabelaSemHtml, 'tabela-cartao'));

    // 5. Pedidos de cargo novo por situação.
    const itensStatus = ['analise', 'alteracao', 'aprovado', 'reprovado'].map(s => ({
      rotulo: T('st_' + s), rotuloHtml: ctx.chipStatus(s) + (s === 'analise' && M.preAprovadas.length ? ` <small class="lb-nota">${esc(T('n_pre', { n: M.preAprovadas.length }))}</small>` : ''),
      valor: M.porStatus[s], drill: 'req:' + s, extra: ctx.pct(M.porStatus[s] / (M.reqs.length || 1), 0)
    }));
    out += secao('pedidos', T('sec_pedidos'), esc(T('sec_pedidos_sub')),
      cartao('', G.listaBarras(itensStatus) + `<div class="cartao-pe"><button class="botao" data-aba="aprovacao">${esc(T('abrir_aprovacao'))} →</button>` +
        `<a class="botao leve" href="requisicao.html">${esc(T('abrir_requisicao'))} →</a></div>`));
    return out;
  }

  return { render, acao, trilho: true };
})();
