/* =============================================================================
   tela-aprovacao.js: a fila de pedidos de cargo e a decisão, em MODO SIMULAÇÃO.

   Duas colunas: à esquerda a lista (situação, quem pediu, quando); à direita o
   pedido escolhido, com as ações do papel, o documento e a linha do tempo.
   O seletor de papel (Gestor, Analista de RH, Master) troca quem você é.

   Regra de tela: nenhuma ação vale com um clique só. Pré-aprovar, aprovar,
   pedir alteração e reprovar abrem uma CONFIRMAÇÃO que diz o que vai acontecer
   e pede o texto onde ele é obrigatório (o comentário de pedir alteração e o
   motivo de reprovar, escrito livre). As regras de quem pode o quê moram no
   armazem.js; aqui só se pergunta e desenha.
   ============================================================================= */
window.TELAS = window.TELAS || {};
window.TELAS.aprovacao = (function () {
  'use strict';
  const C = window.CATALOGO, A = window.ARMAZEM, P = window.PEDIDOS, esc = window.GRAFICOS.esc;
  const PAPEIS = ['gestor', 'analista', 'master'];
  // filtro: null = o padrão do papel; sel: o pedido aberto; confirmar: a ação esperando o "sim";
  // rasc: o que já foi escolhido em cada pedido (grade, CBO), para não sumir ao redesenhar.
  const E = { filtro: null, sel: null, confirmar: null, rasc: {} };

  const persona = (ctx, papel) => ctx.O.personas[papel];
  const daVez = (ctx, papel) => papel === 'gestor' ? A.doSolicitante(persona(ctx, 'gestor').id) : A.todas();
  const filtroAtual = papel => E.filtro || (papel === 'gestor' ? 'todos' : 'pendentes');
  function filtrar(lista, f, ctx, papel) {
    if (f === 'pendentes') return A.pendentes(papel, persona(ctx, 'gestor').id);
    if (f === 'todos') return lista;
    return lista.filter(r => r.status === f);
  }
  function rascunho(r) {
    if (!E.rasc[r.codigo]) {
      const sug = C.sugerirGrade(r.pacote.area, r.pacote.nivel).grade;
      E.rasc[r.codigo] = { grade: String(r.preAprovado ? r.preAprovado.grade : sug), cbo: '' };
    }
    return E.rasc[r.codigo];
  }

  // ---------------------------------------------------------------- a lista
  function item(r, ctx, papel) {
    return `<button class="apr-item${r.codigo === E.sel ? ' ativo' : ''}" data-acao="apr:abrir" data-codigo="${r.codigo}" data-req-item="${r.codigo}">` +
      `<span class="apr-item-topo"><span class="mono">${r.codigo}</span>${ctx.chipStatus(r.status, papel, r)}</span>` +
      `<b>${esc(P.titulo(r, ctx))}</b><small>${esc(r.solicitante.nome)} · ${ctx.data(r.atualizadoEm)}</small></button>`;
  }

  // ---------------------------------------------------------------- a decisão
  function opcoesGrade(ctx, marcada) {
    return Object.keys(C.GRADES).map(g => `<option value="${g}"${String(g) === String(marcada) ? ' selected' : ''}>G${g} · ${ctx.brl(C.GRADES[g].min)} ${ctx.T('a_ate')} ${ctx.brl(C.GRADES[g].max)}</option>`).join('');
  }
  function confirmacao(r, ctx) {
    const T = ctx.T, c = E.confirmar, g = rascunho(r).grade;
    // Um campo de texto só: rótulo, se é obrigatório e a dica de dentro.
    const nota = (rotulo, ph, obrig) => `<label class="sub-rot"><span>${esc(T(rotulo))}${obrig ? '' : ` <small>${esc(T('opcional'))}</small>`}</span>` +
      `<textarea rows="3" data-nota maxlength="500" placeholder="${esc(T(ph))}"></textarea></label>`;
    let corpo = '';
    if (c.acao === 'preaprovar') corpo = `<p>${esc(T('conf_pre', { c: r.codigo, g }))}</p>` + nota('comentario', 'ph_nota_rh', false);
    if (c.acao === 'aprovar') corpo = `<p>${esc(T('conf_aprovar', { c: r.codigo, n: C.proximoCodigo(r.pacote.area), g }))}</p>` + nota('comentario', 'ph_nota_rh', false);
    if (c.acao === 'devolver') corpo = `<p>${esc(T('conf_devolver', { c: r.codigo }))}</p>` + nota('apr_motivo_txt', 'ph_nota', true);
    if (c.acao === 'reprovar') corpo = `<p>${esc(T('conf_reprovar', { c: r.codigo }))}</p>` + nota('apr_motivo_rep', 'ph_motivo_rep', true);
    return `<div class="apr-confirma${c.acao === 'reprovar' ? ' perigo' : ''}" data-testid="apr-confirma" role="group">${corpo}<p class="decisao-erro" role="alert"></p>` +
      `<div class="decisao-botoes"><button class="botao ${c.acao === 'reprovar' ? 'perigo' : 'primario'}" data-acao="apr:confirmar" data-codigo="${r.codigo}">${esc(T('bt_conf_' + c.acao))}</button>` +
      `<button class="botao leve" data-acao="apr:cancelar">${esc(T('cancelar'))}</button></div></div>`;
  }
  function acoes(r, ctx, papel) {
    const T = ctx.T;
    if (E.confirmar && E.confirmar.codigo === r.codigo) return confirmacao(r, ctx);
    const bt = (tipo, cls) => `<button class="botao ${cls || ''}" data-acao="apr:pedir" data-tipo="${tipo}" data-codigo="${r.codigo}">${esc(T('bt_' + tipo))}</button>`;
    const sug = C.sugerirGrade(r.pacote.area, r.pacote.nivel);
    const porque = esc(T('sug_' + sug.porque, { g: sug.grade, a: ctx.nomeArea(r.pacote.area), n: ctx.nomeNivel(r.pacote.nivel), q: sug.n }));
    const grade = rotulo => `<label class="sub-rot"><span>${esc(T(rotulo))}</span><select data-campo="apr:grade" data-codigo="${r.codigo}">${opcoesGrade(ctx, rascunho(r).grade)}</select></label>`;
    if (r.status === 'analise' && papel === 'analista' && !r.preAprovado) {
      return `<div class="apr-acoes"><p class="apr-vez">${esc(T('vez_analista'))}</p>${grade('grade_proposta')}<p class="campo-ajuda">${porque}</p>` +
        `<div class="decisao-botoes">${bt('preaprovar', 'primario')}${bt('devolver')}</div></div>`;
    }
    if (r.status === 'analise' && papel === 'master') {
      const pre = r.preAprovado ? `${ctx.chipStatus('pre')} ${esc(T('pre_por', { g: r.preAprovado.grade, n: r.preAprovado.por, d: ctx.data(r.preAprovado.em) }))}` : esc(T('sem_pre'));
      return `<div class="apr-acoes"><p class="apr-vez">${esc(T('vez_master'))}</p><p class="dec-pre">${pre}</p>` +
        `<div class="duas-col">${grade('grade_final')}<label class="sub-rot"><span>${esc(T('cbo_rot'))} <small>${esc(T('opcional'))}</small></span>` +
        `<input type="text" data-campo="apr:cbo" data-codigo="${r.codigo}" maxlength="9" placeholder="0000-00" value="${esc(rascunho(r).cbo)}"></label></div>` +
        `<p class="campo-ajuda">${porque}</p><div class="decisao-botoes">${bt('aprovar', 'primario')}${bt('devolver')}${bt('reprovar', 'perigo')}</div></div>`;
    }
    // Sem ação para este papel agora: o que aconteceu, e o que vem a seguir.
    const rec = P.recado(r, ctx);
    let extra = rec.nota ? `<blockquote class="dec-nota">${esc(rec.nota)}</blockquote>` : '';
    if (r.status === 'analise' && papel === 'analista') rec.txt = T('info_aguarda_master', { g: r.preAprovado.grade });
    if (r.status === 'alteracao' && papel === 'gestor') extra += `<div class="decisao-botoes"><a class="botao primario" href="requisicao.html?editar=${r.codigo}">${esc(T('bt_editar_reenviar'))}</a></div>`;
    if (r.status === 'aprovado') extra += `<div class="decisao-botoes"><button class="botao" data-doc="${r.decisao.cargoCodigo}">${esc(T('ver_cargo_criado'))}</button></div>`;
    return `<div class="apr-acoes so-info"><p>${esc(rec.txt)}</p>${extra}</div>`;
  }

  function detalhe(r, ctx, papel) {
    const T = ctx.T;
    if (!r) return `<div class="apr-vazio"><p>${esc(T('apr_escolha'))}</p></div>`;
    return `<article class="apr-pedido" data-testid="apr-detalhe" data-codigo="${r.codigo}">` +
      `<header class="apr-pedido-cab"><span class="eyebrow">${r.codigo} · v${r.versao}</span><h3>${esc(P.titulo(r, ctx))}</h3>` +
      `<p class="txt-fraco" lang="${ctx.langOutra}">${esc(P.outroTitulo(r, ctx))}</p><div class="apr-chips">${ctx.chipStatus(r.status, papel, r)}` +
      `<span class="chip neutro">${esc(ctx.nomeArea(r.pacote.area))}</span><span class="chip neutro">${esc(ctx.nomeNivel(r.pacote.nivel))}</span></div>` +
      `<p class="apr-quem">${esc(T('pedido_por', { n: r.solicitante.nome, c: ctx.nomeCargo(r.solicitante.cargo), d: ctx.data(r.criadoEm) }))}</p></header>` +
      acoes(r, ctx, papel) +
      `<section class="apr-bloco"><h4>${esc(T('historico'))}</h4>${P.linhaDoTempo(r, ctx)}</section>` +
      (papel !== 'gestor' ? `<details class="apr-bloco"><summary>${esc(T('parecidos_catalogo'))}</summary><p class="campo-ajuda">${esc(T('parecidos_ajuda'))}</p>${P.parecidos(r, ctx)}</details>` : '') +
      `<section class="apr-bloco"><h4>${esc(T('documento_pedido'))}</h4>${P.documento(r, ctx)}</section></article>`;
  }

  // ---------------------------------------------------------------- a tela
  function render(ctx) {
    const T = ctx.T, papel = ctx.estado.papel, eu = persona(ctx, papel);
    const lista = daVez(ctx, papel), f = filtroAtual(papel), mostrados = filtrar(lista, f, ctx, papel);
    if (!E.sel || !A.porCodigo(E.sel)) E.sel = mostrados.length ? mostrados[0].codigo : null;
    const conta = k => filtrar(lista, k, ctx, papel).length;
    const chips = (papel === 'gestor' ? [] : ['pendentes']).concat(['todos', 'analise', 'alteracao', 'aprovado', 'reprovado']);
    let h = `<div class="tela-cab"><div><h2 class="tela-titulo">${esc(T('apr_titulo'))}</h2><p class="tela-sub">${esc(T('apr_sub'))}</p></div></div>`;
    h += `<div class="papel-faixa" data-testid="faixa-demo"><span class="demo-selo">${esc(T('demo_selo'))}</span>` +
      `<div class="papel-escolha"><span class="campo-rot">${esc(T('papel_rot'))}</span><div class="seg-botoes" role="radiogroup" aria-label="${esc(T('papel_rot'))}">` +
      PAPEIS.map(p => `<button role="radio" aria-checked="${papel === p}" class="${papel === p ? 'ativo' : ''}" data-acao="apr:papel" data-valor="${p}">${esc(T('papel_' + p))}</button>`).join('') +
      `</div></div><p class="papel-quem"><b>${esc(eu.nome)}</b>, ${esc(ctx.nomeCargo(eu.cargo))}<br><small>${esc(T('papel_faz_' + papel))}</small></p>` +
      `<button class="botao leve" data-acao="apr:restaurar" data-tip="${esc(T('demo_txt'))}">${esc(T('restaurar'))}</button></div>`;
    if (!A.persistente) h += `<div class="aviso">${esc(T('sem_armazenamento'))}</div>`;
    h += `<div class="chips-filtro apr-filtros">` + chips.map(k => `<button class="pilula${f === k ? ' ativa' : ''}" data-acao="apr:filtro" data-valor="${k}">` +
      `${esc(k === 'pendentes' ? T('pend_' + papel) : k === 'todos' ? T('todos') : T('st_' + k))} <b>${conta(k)}</b></button>`).join('') +
      `<button class="botao leve apr-csv" data-acao="apr:csv">⭳ ${esc(T('exportar_csv'))}</button></div>`;
    h += `<div class="apr-grade"><nav class="apr-lista" aria-label="${esc(T('apr_lista'))}" data-testid="apr-lista">` +
      (mostrados.length ? mostrados.map(r => item(r, ctx, papel)).join('') : `<p class="vazio-txt">${esc(T(f === 'pendentes' ? 'nada_pendente' : 'sem_linhas'))}</p>`) +
      `</nav><div class="apr-detalhe">${detalhe(A.porCodigo(E.sel), ctx, papel)}</div></div>`;
    return h;
  }

  // ---------------------------------------------------------------- as ações
  function acao(nome, el, ctx) {
    const T = ctx.T, papel = ctx.estado.papel;
    const redesenha = () => ctx.desenhar();
    if (nome === 'papel') { ctx.estado.papel = el.dataset.valor; Object.assign(E, { filtro: null, sel: null, confirmar: null }); return redesenha(); }
    if (nome === 'filtro') { Object.assign(E, { filtro: el.dataset.valor, sel: null, confirmar: null }); return redesenha(); }
    if (nome === 'abrir') {
      Object.assign(E, { sel: el.dataset.codigo, confirmar: null }); redesenha();
      const d = document.querySelector('.apr-detalhe');
      if (d && innerWidth < 900) d.scrollIntoView({ block: 'start' });
      return;
    }
    if (nome === 'restaurar') { A.restaurar(); Object.assign(E, { filtro: null, sel: null, confirmar: null, rasc: {} }); ctx.toast(T('restaurado')); return redesenha(); }
    if (nome === 'pedir') {
      E.confirmar = { acao: el.dataset.tipo, codigo: el.dataset.codigo }; redesenha();
      const campo = document.querySelector('.apr-confirma textarea, .apr-confirma select');
      if (campo) campo.focus();
      return;
    }
    if (nome === 'cancelar') { E.confirmar = null; return redesenha(); }
    if (nome === 'csv') {
      const lista = filtrar(daVez(ctx, papel), filtroAtual(papel), ctx, papel);
      ctx.baixarCsv('aprovacao', ['col_codigo', 'col_cargo', 'col_cargo_en', 'col_familia', 'col_nivel', 'col_situacao', 'col_grade', 'col_solicitante', 'col_versao', 'col_enviado', 'col_atualizado'].map(k => T(k)),
        lista.map(r => [r.codigo, r.pacote.nomePt, r.pacote.nomeEn, ctx.nomeArea(r.pacote.area), ctx.nomeNivel(r.pacote.nivel), ctx.textoStatus(r.status, papel, r),
          P.gradeDe(r) ? 'G' + P.gradeDe(r) : '', r.solicitante.nome, r.versao, ctx.data(r.criadoEm), ctx.data(r.atualizadoEm)]));
      return;
    }
    if (nome === 'confirmar') {
      const c = E.confirmar, caixa = el.closest('.apr-confirma');
      if (!c || !caixa) return;
      const val = sel => { const x = caixa.querySelector(sel); return x ? x.value : ''; };
      const r = A.porCodigo(c.codigo), eu = persona(ctx, papel), rasc = rascunho(r);
      let res;
      if (c.acao === 'preaprovar') res = A.preAprovar(c.codigo, { grade: rasc.grade, nota: val('[data-nota]') }, eu);
      if (c.acao === 'aprovar') res = A.aprovar(c.codigo, { grade: rasc.grade, cbo: rasc.cbo, nota: val('[data-nota]') }, eu);
      if (c.acao === 'devolver') res = A.devolver(c.codigo, { nota: val('[data-nota]') }, eu, papel);
      if (c.acao === 'reprovar') res = A.reprovar(c.codigo, { nota: val('[data-nota]') }, eu);
      if (!res.ok) { caixa.querySelector('.decisao-erro').textContent = T(res.erro); return; }
      E.confirmar = null;
      ctx.toast(T('ok_' + c.acao, { c: c.codigo, g: rasc.grade, n: res.cargo || '' }), res.cargo ? { rotulo: T('ver_cargo_criado'), doc: res.cargo } : null);
      return redesenha();
    }
  }
  function campo(nome, el) {
    const r = A.porCodigo(el.dataset.codigo);
    if (!r) return;
    if (nome === 'grade') rascunho(r).grade = el.value;
    if (nome === 'cbo') rascunho(r).cbo = el.value;
  }
  // Abrir um pedido vindo de outra tela (lista por trás de um número, endereço ?req=).
  function selecionar(codigo) { Object.assign(E, { filtro: 'todos', sel: codigo, confirmar: null }); }

  return { render, acao, campo, selecionar };
})();
