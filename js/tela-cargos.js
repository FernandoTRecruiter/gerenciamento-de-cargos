/* =============================================================================
   tela-cargos.js: a TABELA de cargos (busca, filtros, ordenação, CSV).

   Clicar numa linha abre o documento do cargo. Ao digitar na busca, só o corpo
   da tabela é redesenhado: a caixa de busca não perde o foco nem o cursor.
   ============================================================================= */
window.TELAS = window.TELAS || {};
window.TELAS.cargos = (function () {
  'use strict';
  const C = window.CATALOGO, O = window.OCUPACAO, TR = window.TRADUTOR, esc = window.GRAFICOS.esc;
  const VAZIO = { busca: '', area: '', nivel: '', grade: '', sem: false, vaga: false, ordem: { col: '', passo: 0 } };

  // As colunas: [chave, rótulo, valor para ordenar, célula HTML, valor do CSV, alinhado à direita?, tipo para ordenar]
  function colunas(ctx) {
    const T = ctx.T, r = cg => O.resumo(cg.codigo), f = cg => C.faixa(cg.grade);
    return [
      ['codigo', T('col_codigo'), cg => cg.codigo, cg => `<span class="mono">${cg.codigo}</span>`, cg => cg.codigo, false, 'texto'],
      ['cargo', T('col_cargo'), cg => C.L(cg.nome, ctx.lang),
        cg => `<b class="tb-nome">${esc(C.L(cg.nome, ctx.lang))}</b>${cg.origem === 'requisicao' ? ` <span class="chip ok">${esc(T('d_novo'))}</span>` : ''}<small class="tb-sub" lang="${ctx.langOutra}">${esc(C.L(cg.nome, ctx.lang === 'en' ? 'pt' : 'en'))}</small>`,
        cg => C.L(cg.nome, ctx.lang), false, 'texto'],
      ['area', T('col_familia'), cg => ctx.nomeArea(cg.area), cg => esc(ctx.nomeArea(cg.area)), cg => ctx.nomeArea(cg.area), false, 'texto'],
      ['nivel', T('col_nivel'), cg => window.DADOS.niveis[cg.nivel].ordem, cg => esc(ctx.nomeNivel(cg.nivel)), cg => ctx.nomeNivel(cg.nivel), false, 'num'],
      ['grade', T('col_grade'), cg => cg.grade, cg => `<span class="mono">G${cg.grade}</span>`, cg => cg.grade, true, 'num'],
      ['faixa', T('col_faixa'), cg => f(cg).min, cg => `<span class="mono">${ctx.brl(f(cg).min)}<span class="tb-sub">${esc(T('a_ate'))} ${ctx.brl(f(cg).max)}</span></span>`   /* faixa em 2 linhas: a tabela cabe em 1440 px */, cg => f(cg).min + ' ' + T('a_ate') + ' ' + f(cg).max, true, 'num'],
      ['n', T('col_pessoas'), cg => r(cg).n, cg => `<span class="mono">${r(cg).n}</span>`, cg => r(cg).n, true, 'num'],
      ['vagas', T('col_vagas'), cg => r(cg).nVagas, cg => r(cg).nVagas ? `<span class="chip acc">${r(cg).nVagas}</span>` : '<span class="mono txt-fraco">0</span>', cg => r(cg).nVagas, true, 'num'],
      ['media', T('col_media'), cg => r(cg).media, cg => r(cg).media == null ? '<span class="txt-fraco">-</span>' : `<span class="mono">${ctx.brl(r(cg).media)}</span>`, cg => r(cg).media == null ? '' : Math.round(r(cg).media), true, 'num'],
      ['cr', T('col_cr'), cg => r(cg).crMedio, cg => r(cg).crMedio == null ? '<span class="txt-fraco">-</span>' : `<span class="mono">${ctx.pct(r(cg).crMedio, 0)}</span>`, cg => r(cg).crMedio == null ? '' : (r(cg).crMedio * 100).toFixed(1), true, 'num']
    ];
  }

  // As linhas depois de busca e filtros, já ordenadas.
  function linhas(ctx) {
    const f = ctx.estado.tab;
    const busca = TR.semAcento(f.busca.trim());
    let lista = C.todos().filter(cg =>
      (!busca || TR.semAcento(cg.codigo + ' ' + cg.nome[0] + ' ' + cg.nome[1]).includes(busca)) &&
      (!f.area || cg.area === f.area) && (!f.nivel || cg.nivel === f.nivel) && (!f.grade || String(cg.grade) === f.grade) &&
      (!f.sem || O.resumo(cg.codigo).n === 0) && (!f.vaga || O.resumo(cg.codigo).nVagas > 0));
    // Ordem declarada: pelo código (CG-101, CG-102...); o cabeçalho reordena por cima dela.
    const cols = paraOrdenar(colunas(ctx));
    return window.GRAFICOS.ordenar(window.GRAFICOS.ordenar(lista, cols, { col: 'codigo', passo: 1 }), cols, f.ordem);
  }

  // As colunas no formato da ordenação compartilhada (GRAFICOS.ordenar): chave, tipo e valor.
  const paraOrdenar = cols => cols.map(c => ({ k: c[0], tipo: c[6], v: c[2] }));

  function corpo(ctx) {
    const T = ctx.T, f = ctx.estado.tab, cols = colunas(ctx), lista = linhas(ctx);
    return `<table class="tabela" data-testid="tabela-cargos"><thead><tr>${cols.map(c =>
      window.GRAFICOS.thOrdena({ k: c[0], tipo: c[6] }, c[1], f.ordem, `data-acao="tab:ordem" data-col="${c[0]}"`, c[5] ? 'dir' : '')).join('')}</tr></thead><tbody>` +
      (lista.length ? lista.map(cg => `<tr class="tr-click${O.resumo(cg.codigo).n ? '' : ' tr-vazio'}" data-doc="${cg.codigo}" tabindex="0">${cols.map(c => `<td${c[5] ? ' class="dir"' : ''}>${c[3](cg)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${cols.length}" class="vazio">${esc(T('sem_linhas'))}</td></tr>`) + '</tbody></table>';
  }

  function render(ctx) {
    const T = ctx.T, f = ctx.estado.tab;
    const algum = Object.keys(VAZIO).some(k => k !== 'ordem' && f[k] !== VAZIO[k]);
    const opc = (campo, lista, rot) => `<label class="filtro"><span>${esc(rot)}</span><select data-campo="tab:${campo}"><option value="">${esc(T('todos'))}</option>` +
      lista.map(([v, t]) => `<option value="${v}"${f[campo] === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('') + '</select></label>';
    const grades = [...new Set(C.todos().map(cg => cg.grade))].sort((a, b) => a - b);
    let h = `<div class="tela-cab"><div><h2 class="tela-titulo">${esc(T('cargos_titulo'))}</h2><p class="tela-sub">${esc(T('cargos_sub'))}</p></div></div>`;
    h += `<div class="cartao tabela-cartao"><div class="tb-filtros">` +
      `<label class="filtro filtro-busca"><span>${esc(T('buscar'))}</span><input type="search" class="busca" data-campo="tab:busca" value="${esc(f.busca)}" placeholder="${esc(T('buscar_ph'))}" aria-label="${esc(T('buscar'))}"></label>` +
      opc('area', C.AREAS_ORDEM.concat(['dir']).map(a => [a, ctx.nomeArea(a)]), T('col_familia')) +
      opc('nivel', C.NIVEIS_DESC.map(n => [n, ctx.nomeNivel(n)]), T('col_nivel')) +
      opc('grade', grades.map(g => [String(g), 'G' + g]), T('col_grade')) +
      `<label class="interruptor"><input type="checkbox" data-campo="tab:sem"${f.sem ? ' checked' : ''}><span>${esc(T('so_sem'))}</span></label>` +
      `<label class="interruptor"><input type="checkbox" data-campo="tab:vaga"${f.vaga ? ' checked' : ''}><span>${esc(T('so_vaga'))}</span></label>` +
      `<div class="tb-acoes"><button class="botao limpar${algum ? ' ativo' : ''}" data-acao="tab:limpar"${algum ? '' : ' disabled'}>✕ ${esc(T('limpar'))}</button>` +
      `<button class="botao" data-acao="tab:csv">⭳ ${esc(T('exportar_csv'))}</button></div></div>` +
      `<div class="tb-info"><span class="tb-conta" data-testid="conta-cargos">${esc(T('n_cargos', { n: linhas(ctx).length }))}</span><span class="txt-fraco">${esc(T('clique_doc'))}</span></div>` +
      `<div class="tb-rolagem" id="tab-corpo">${corpo(ctx)}</div></div>`;
    return h;
  }

  // Só o corpo e a contagem mudam ao digitar (o foco fica na busca).
  function atualizar(ctx) {
    const raiz = document.getElementById('tab-corpo');
    if (!raiz) return ctx.desenhar();
    raiz.innerHTML = corpo(ctx);
    const conta = document.querySelector('[data-testid="conta-cargos"]');
    if (conta) conta.textContent = ctx.T('n_cargos', { n: linhas(ctx).length });
    const f = ctx.estado.tab, algum = Object.keys(VAZIO).some(k => k !== 'ordem' && f[k] !== VAZIO[k]);
    const limpar = document.querySelector('[data-acao="tab:limpar"]');
    if (limpar) { limpar.disabled = !algum; limpar.classList.toggle('ativo', algum); }
  }

  // Depois de reordenar, o foco volta ao mesmo cabeçalho (o corpo da tabela foi refeito).
  function focarCabecalho(k) { const b = document.querySelector(`[data-acao="tab:ordem"][data-col="${k}"]`); if (b) b.focus(); }

  function campo(nome, el, ctx) {
    const f = ctx.estado.tab;
    f[nome] = el.type === 'checkbox' ? el.checked : el.value;
    atualizar(ctx);
  }
  function acao(nome, el, ctx) {
    const f = ctx.estado.tab;
    if (nome === 'ordem') { f.ordem = window.GRAFICOS.proximaOrdem(f.ordem, el.dataset.col); atualizar(ctx); focarCabecalho(el.dataset.col); }
    if (nome === 'limpar') { Object.assign(f, VAZIO, { ordem: f.ordem }); ctx.desenhar(); }
    if (nome === 'csv') {
      const cols = colunas(ctx);
      ctx.baixarCsv('cargos', cols.map(c => c[1]), linhas(ctx).map(cg => cols.map(c => c[4](cg))));
    }
  }

  return { render, campo, acao, VAZIO };
})();
