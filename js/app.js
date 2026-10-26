/* =============================================================================
   app.js: liga o painel. Guarda o estado (aba, idioma, tema, papel), desenha
   cabeçalho + aba, e responde aos cliques.

   Desenho que se repete em todas as abas:
   - o cabeçalho não muda de lugar quando o conteúdo muda;
   - todo número tem um "i" que abre a conta por trás dele;
   - clicar num número, numa barra ou num ponto abre a GAVETA com a lista que
     está por trás (com busca, ordenação e CSV);
   - clicar num cargo, em qualquer lugar, abre o documento dele.
   O formulário de pedido mora em outra página (requisicao.html); o botão
   "Pedir cargo novo" leva até ela, e os pedidos voltam pelo navegador.
   Simples de propósito: muda o estado, redesenha.
   ============================================================================= */
(function () {
  'use strict';
  const D = window.DADOS, C = window.CATALOGO, O = window.OCUPACAO, A = window.ARMAZEM, I = window.I18N, T = I.T;
  const DOC = window.DOCUMENTO, TELAS = window.TELAS, esc = window.CONTEXTO.esc, G = window.GRAFICOS;
  const ABAS = ['geral', 'organograma', 'cargos', 'aprovacao'];
  const PAPEIS = ['gestor', 'analista', 'master'];

  // Passo 1: estado inicial. Quem manda: endereço (?lang=en) > última escolha > padrão.
  const q = new URLSearchParams(location.search), g = window.CONTEXTO.lerPref();
  const escuroSistema = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  const estado = {
    aba: ABAS.includes(q.get('aba')) ? q.get('aba') : (ABAS.includes(g.aba) ? g.aba : 'geral'),
    lang: ['pt', 'en'].includes(q.get('lang')) ? q.get('lang') : (g.lang || 'en'),
    tema: ['claro', 'escuro'].includes(q.get('tema')) ? q.get('tema') : (g.tema || (escuroSistema ? 'escuro' : 'claro')),
    papel: PAPEIS.includes(q.get('papel')) ? q.get('papel') : (PAPEIS.includes(g.papel) ? g.papel : 'analista'),
    tab: Object.assign({}, TELAS.cargos.VAZIO)
  };
  if (q.get('embed') === '1') document.body.classList.add('embed');
  const raiz = document.getElementById('app');

  // Passo 2: o contexto que toda tela recebe (formatos no idioma da tela) + o que é só do painel.
  let contas = {};
  const ctx = Object.assign(window.CONTEXTO.criar(estado), {
    conta(id, titulo, formula, partes, nota) { contas[id] = { titulo, formula, partes, nota }; },
    desenhar: () => desenhar(),
    abrirDoc: cod => abrirDoc(cod),
    abrirReq: cod => abrirReq(cod)
  });
  window.CONTEXTO.montarUi();

  // Passo 3: o menu lateral (sempre no mesmo lugar): pedir cargo, as abas do painel,
  // a data da foto da ocupação, o idioma e o tema. No celular ele vira a faixa de cima.
  function lateral() {
    const pend = A.pendentes(estado.papel, O.personas.gestor.id).length;
    const menu = `<nav class="abas" aria-label="${esc(T('menu_painel'))}"><span class="menu-rot">${esc(T('menu_painel'))}</span>` + ABAS.map(k =>
      `<button data-aba="${k}" class="${estado.aba === k ? 'ativa' : ''}"${estado.aba === k ? ' aria-current="page"' : ''}>${esc(T('aba_' + k))}` +
      `${k === 'aprovacao' && pend ? `<span class="aba-n" data-tip="${esc(T('pend_' + estado.papel))}">${pend}</span>` : ''}</button>`).join('') + '</nav>';
    return ctx.lateral(menu, {
      botao: `<a class="botao primario" href="requisicao.html" data-testid="pedir-cargo">＋ ${esc(T('pedir_cargo'))}</a>`,
      selo: `<div class="selo-data" data-tip="${esc(T('dica_data'))}"><i></i><span>${esc(T('ocupacao_de'))} <b class="mono">${ctx.data(O.dataRef)}</b></span></div>`
    });
  }

  function desenhar() {
    I.lang = estado.lang;
    document.documentElement.lang = estado.lang === 'en' ? 'en' : 'pt-BR';
    document.documentElement.dataset.theme = estado.tema === 'escuro' ? 'dark' : 'light';
    document.title = `${T('titulo')} · ${D.empresa}`;
    contas = {};
    const tela = TELAS[estado.aba];
    const pagina = tela.render(ctx);
    const portfolio = location.protocol === 'file:' ? '../FernandoTRecruiter.github.io/index.html' : 'https://fernandotrecruiter.github.io/';
    raiz.innerHTML = `<div class="casca">${lateral()}<div class="conteudo">` +
      `<div class="corpo${tela.trilho ? '' : ' cheio'}" data-aba="${estado.aba}"><main class="pagina" id="pagina">${pagina}</main><nav class="trilho" aria-label="${esc(T('nesta_pagina'))}"></nav></div>` +
      `<footer class="rodape"><span>${esc(T('rodape'))}</span>${document.body.classList.contains('embed') ? '' : `<a href="${portfolio}">${esc(T('ver_portfolio'))} →</a>`}</footer></div></div>`;
    if (tela.trilho) montarTrilho();
    if (tela.montar) tela.montar(ctx, raiz.querySelector('#pagina'));
    if (gaveta.chave) desenharGaveta();
    window.CONTEXTO.guardarPref({ aba: estado.aba, lang: estado.lang, tema: estado.tema, papel: estado.papel });
    window.__cargos = { estado, ctx, gaveta, contas, versao: 2 };   // para os testes lerem o que a tela mostrou
  }

  // Trilho numerado da visão geral (acende a seção que passou de 35% da tela).
  function montarTrilho() {
    const trilho = raiz.querySelector('.trilho');
    const secoes = [...raiz.querySelectorAll('.secao')];
    trilho.innerHTML = `<span class="trilho-rot">${esc(T('nesta_pagina'))}</span>` +
      secoes.map((s, i) => `<button data-secao="${s.id}"><span class="n">${i + 1}</span>${esc(s.dataset.titulo)}</button>`).join('');
    marcarTrilho();
  }
  function marcarTrilho() {
    const secoes = [...raiz.querySelectorAll('.secao')];
    if (!secoes.length) return;
    let ativa = secoes[0];
    secoes.forEach(s => { if (s.getBoundingClientRect().top <= innerHeight * 0.35) ativa = s; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) ativa = secoes[secoes.length - 1];
    raiz.querySelectorAll('.trilho button').forEach(b => b.classList.toggle('ativo', b.dataset.secao === ativa.id));
  }
  window.addEventListener('scroll', marcarTrilho, { passive: true });

  // Passo 4: a conta por trás do número (o "i").
  const pop = document.createElement('div'); pop.className = 'conta-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); document.body.appendChild(pop);
  function abrirConta(id, botao) {
    const c = contas[id]; if (!c) return;
    pop.innerHTML = `<div class="cp-cab"><span>${esc(T('x_titulo'))} · <b>${esc(c.titulo)}</b></span><button data-fechar-conta aria-label="${esc(T('fechar'))}">✕</button></div>` +
      `<div class="cp-formula">${esc(c.formula)}</div><div class="cp-sub">${esc(T('x_partes'))}</div>` +
      `<table>${c.partes.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="mono">${esc(typeof b === 'number' ? ctx.num(b) : b)}</td></tr>`).join('')}</table>` +
      (c.nota ? `<div class="cp-nota">${esc(c.nota)}</div>` : '');
    pop.hidden = false;
    const r = botao.getBoundingClientRect(), larg = Math.min(360, innerWidth - 24);
    pop.style.width = larg + 'px';
    pop.style.left = Math.max(12, Math.min(r.left, innerWidth - larg - 12)) + 'px';
    pop.style.top = (r.bottom + 8 + pop.offsetHeight > innerHeight ? Math.max(12, r.top - pop.offsetHeight - 8) : r.bottom + 8) + 'px';
  }
  const fecharConta = () => { pop.hidden = true; };
  window.addEventListener('scroll', fecharConta, { passive: true });

  // Passo 5: a GAVETA com a lista por trás de um número.
  const gaveta = { chave: null, busca: '', ordem: { col: '', passo: 0 } };
  // Etapa ordena pelo avanço no funil (oferta > entrevistas > triagem), não pelo nome.
  const ETAPA = { triagem: 1, entrevistas: 2, oferta: 3, contratado: 4 };
  const fundoG = document.createElement('div'); fundoG.className = 'gaveta-fundo'; fundoG.hidden = true; document.body.appendChild(fundoG);
  const elG = document.createElement('aside'); elG.className = 'gaveta'; elG.hidden = true;
  elG.setAttribute('role', 'dialog'); elG.setAttribute('aria-modal', 'true'); elG.setAttribute('aria-labelledby', 'g-tit');
  document.body.appendChild(elG);

  function resolver(chave) {
    const M = window.METRICAS.calcular();   // sempre na hora: uma aprovação pode ter mudado o catálogo
    const [tipo, a] = chave.split(':');
    const lista = (titulo, modelo, itens, ordem) => ({ titulo, modelo, lista: itens, ordem });
    switch (tipo) {
      case 'cargos': return lista(T('l_cargos'), 'cargos', M.cargos);
      case 'cargos-sem': return lista(T('l_sem'), 'cargos', M.semOcupante);
      case 'area': return lista(`${T('col_familia')}: ${ctx.nomeArea(a)}`, 'cargos', M.cargos.filter(cg => cg.area === a));
      case 'nivel': return lista(`${T('col_nivel')}: ${ctx.nomeNivel(a)}`, 'cargos', M.cargos.filter(cg => cg.nivel === a));
      case 'ocup': return lista(T('l_ocup', { d: ctx.data(O.dataRef) }), 'pessoas', M.ocupantes);
      case 'ocup-salario': return lista(T('l_ocup_sal'), 'pessoas', M.ocupantes, ['salario', -1]);
      case 'ocup-fora': return lista(T('l_fora'), 'pessoas', M.abaixo.concat(M.acima), ['cr', 1]);
      case 'grade': return lista(T('l_grade', { g: a }), 'pessoas', M.ocupantes.filter(o => o.grade === Number(a)), ['salario', -1]);
      case 'pos': return lista(T('l_pos', { p: T('pos_' + a) }), 'pessoas', M.ocupantes.filter(o => o.faixaPos === a), ['cr', 1]);
      case 'cargo-ocup': return lista(T('l_cargo_ocup', { c: ctx.nomeCargo(a) }), 'pessoas', O.resumo(a).ocupantes, ['salario', -1]);
      case 'vagas': return lista(T('l_vagas'), 'vagas', M.vagas, ['dias', -1]);
      case 'cargo-vagas': return lista(T('l_cargo_vagas', { c: ctx.nomeCargo(a) }), 'vagas', O.resumo(a).vagas);
      case 'req-abertas': return lista(T('l_req_abertas'), 'reqs', M.reqAbertas);
      case 'req': return lista(T('l_req_status', { s: T('st_' + a) }), 'reqs', M.reqs.filter(r => r.status === a));
      default: return lista(chave, 'cargos', []);
    }
  }
  // Colunas: [chave, rótulo, valor para ordenar, célula, valor do CSV, à direita?, tipo para ordenar]
  function colunas(modelo) {
    const iniciais = n => n.split(' ').map(x => x[0]).slice(0, 2).join('');
    const cargoBt = cod => `<button class="link-cargo" data-doc="${cod}">${esc(ctx.nomeCargo(cod))}</button>`;
    if (modelo === 'pessoas') return [
      ['nome', T('col_nome'), o => o.nome, o => `<span class="avatar-mini" aria-hidden="true">${esc(iniciais(o.nome))}</span>${esc(o.nome)}`, o => o.nome, false, 'texto'],
      ['cargo', T('col_cargo'), o => ctx.nomeCargo(o.cargo), o => cargoBt(o.cargo), o => ctx.nomeCargo(o.cargo), false, 'texto'],
      ['area', T('col_familia'), o => ctx.nomeArea(o.area), o => esc(ctx.nomeArea(o.area)), o => ctx.nomeArea(o.area), false, 'texto'],
      ['unidade', T('col_unidade'), o => I.nome(D.unidades[o.unidade]), o => esc(I.nome(D.unidades[o.unidade])), o => I.nome(D.unidades[o.unidade]), false, 'texto'],
      ['admissao', T('col_admissao'), o => o.admissao, o => `<span class="mono">${ctx.data(o.admissao)}</span>`, o => ctx.data(o.admissao), false, 'data'],
      ['grade', T('col_grade'), o => o.grade, o => `<span class="mono">G${o.grade}</span>`, o => o.grade, true, 'num'],
      ['salario', T('col_salario'), o => o.salario, o => `<span class="mono">${ctx.brl(o.salario)}</span>`, o => o.salario, true, 'num'],
      ['cr', T('col_cr_pessoa'), o => o.cr, o => `<span class="mono${o.faixaPos === 'abaixo' || o.faixaPos === 'acima' ? ' txt-warn' : ''}">${ctx.pct(o.cr, 0)}</span>`, o => (o.cr * 100).toFixed(1), true, 'num'],
      ['pos', T('col_posicao'), o => o.pos, o => esc(T('pos_' + o.faixaPos)), o => T('pos_' + o.faixaPos), false, 'num']
    ];
    if (modelo === 'vagas') return [
      ['id', T('col_vaga'), v => v.id, v => `<span class="mono">${v.id}</span>`, v => v.id, false, 'texto'],
      ['cargo', T('col_cargo'), v => ctx.nomeCargo(v.cargo), v => cargoBt(v.cargo), v => ctx.nomeCargo(v.cargo), false, 'texto'],
      ['unidade', T('col_unidade'), v => I.nome(D.unidades[v.unidade]), v => esc(I.nome(D.unidades[v.unidade])), v => I.nome(D.unidades[v.unidade]), false, 'texto'],
      ['dias', T('col_aberta_ha'), v => v.dias, v => `<span class="mono">${T('n_dias', { n: v.dias })}</span>`, v => v.dias, true, 'num'],
      ['etapa', T('col_etapa'), v => ETAPA[v.etapa], v => `<span class="chip neutro">${esc(T('e_' + v.etapa))}</span>`, v => T('e_' + v.etapa), false, 'num'],
      ['insc', T('col_inscritos'), v => v.inscritos, v => `<span class="mono">${v.inscritos}</span>`, v => v.inscritos, true, 'num']
    ];
    if (modelo === 'reqs') return [
      ['codigo', T('col_codigo'), r => r.codigo, r => `<span class="mono">${r.codigo}</span>`, r => r.codigo, false, 'texto'],
      ['cargo', T('col_cargo'), r => window.PEDIDOS.titulo(r, ctx), r => `<b>${esc(window.PEDIDOS.titulo(r, ctx))}</b>`, r => r.pacote.nomePt, false, 'texto'],
      ['area', T('col_familia'), r => ctx.nomeArea(r.pacote.area), r => esc(ctx.nomeArea(r.pacote.area)), r => ctx.nomeArea(r.pacote.area), false, 'texto'],
      ['status', T('col_situacao'), r => ctx.textoStatus(r.status, 'analista', r), r => ctx.chipStatus(r.status, 'analista', r), r => ctx.textoStatus(r.status, 'analista', r), false, 'texto'],
      ['solic', T('col_solicitante'), r => r.solicitante.nome, r => esc(r.solicitante.nome), r => r.solicitante.nome, false, 'texto'],
      ['atual', T('col_atualizado'), r => r.atualizadoEm, r => `<span class="mono">${ctx.data(r.atualizadoEm)}</span>`, r => ctx.data(r.atualizadoEm), false, 'data']
    ];
    return [
      ['codigo', T('col_codigo'), cg => cg.codigo, cg => `<span class="mono">${cg.codigo}</span>`, cg => cg.codigo, false, 'texto'],
      ['cargo', T('col_cargo'), cg => C.L(cg.nome, estado.lang), cg => `<b>${esc(C.L(cg.nome, estado.lang))}</b>${cg.origem === 'requisicao' ? ` <span class="chip ok">${esc(T('d_novo'))}</span>` : ''}`, cg => C.L(cg.nome, estado.lang), false, 'texto'],
      ['area', T('col_familia'), cg => ctx.nomeArea(cg.area), cg => esc(ctx.nomeArea(cg.area)), cg => ctx.nomeArea(cg.area), false, 'texto'],
      ['nivel', T('col_nivel'), cg => D.niveis[cg.nivel].ordem, cg => esc(ctx.nomeNivel(cg.nivel)), cg => ctx.nomeNivel(cg.nivel), false, 'num'],
      ['grade', T('col_grade'), cg => cg.grade, cg => `<span class="mono">G${cg.grade}</span>`, cg => cg.grade, true, 'num'],
      ['n', T('col_pessoas'), cg => O.resumo(cg.codigo).n, cg => `<span class="mono">${O.resumo(cg.codigo).n}</span>`, cg => O.resumo(cg.codigo).n, true, 'num'],
      ['vagas', T('col_vagas'), cg => O.resumo(cg.codigo).nVagas, cg => `<span class="mono">${O.resumo(cg.codigo).nVagas}</span>`, cg => O.resumo(cg.codigo).nVagas, true, 'num']
    ];
  }

  function desenharGaveta() {
    const res = resolver(gaveta.chave), cols = colunas(res.modelo);
    const busca = window.TRADUTOR.semAcento(gaveta.busca.trim());
    let lista = res.lista.filter(x => !busca || window.TRADUTOR.semAcento(cols.map(c => String(c[4](x))).join(' ')).includes(busca));
    // Ordem declarada: a que a lista pede (res.ordem, ex.: maior salário primeiro) ou a 1ª coluna A→Z;
    // o cabeçalho reordena por cima dela com a ordenação compartilhada (GRAFICOS.ordenar).
    const colsO = cols.map(c => ({ k: c[0], tipo: c[6], v: c[2] }));
    const declarada = res.ordem ? { col: res.ordem[0], passo: (colsO.find(c => c.k === res.ordem[0]).tipo === 'texto') === (res.ordem[1] > 0) ? 1 : 2 } : { col: colsO[0].k, passo: 1 };
    lista = G.ordenar(G.ordenar(lista, colsO, declarada), colsO, gaveta.ordem);
    gaveta.ultima = { cols, lista, titulo: res.titulo };
    const linhaAttr = x => res.modelo === 'cargos' ? ` class="tr-click" data-doc="${x.codigo}" tabindex="0"` : res.modelo === 'reqs' ? ` class="tr-click" data-req="${x.codigo}" tabindex="0"` : '';
    elG.innerHTML = `<header class="g-cab"><div><div class="eyebrow">${esc(T('g_titulo'))}</div><h2 id="g-tit">${esc(res.titulo)} <span class="chip neutro" data-testid="g-n">${res.lista.length}</span></h2></div>` +
      `<button class="g-x" data-g-fechar aria-label="${esc(T('fechar'))}">✕</button></header>` +
      `<div class="g-barra"><input class="busca" type="search" data-g-busca value="${esc(gaveta.busca)}" placeholder="${esc(T('g_buscar'))}" aria-label="${esc(T('g_buscar'))}">` +
      `<button class="botao leve" data-g-csv>⭳ ${esc(T('exportar_csv'))}</button></div>` +
      `<div class="g-rolagem"><table class="tabela"><thead><tr>${cols.map((c, i) => G.thOrdena(colsO[i], c[1], gaveta.ordem, `data-g-ordem="${c[0]}"`, c[5] ? 'dir' : '')).join('')}</tr></thead><tbody>` +
      (lista.length ? lista.map(x => `<tr${linhaAttr(x)}>${cols.map(c => `<td${c[5] ? ' class="dir"' : ''}>${c[3](x)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="vazio">${esc(T('sem_linhas'))}</td></tr>`) +
      `</tbody></table></div><footer class="g-pe">${esc(T('ficticio_longo'))}</footer>`;
  }
  function abrirLista(chave) {
    const res = resolver(chave);
    Object.assign(gaveta, { chave, busca: '', ordem: { col: '', passo: 0 } });
    desenharGaveta();
    fundoG.hidden = false; elG.hidden = false;
    document.body.classList.add('com-gaveta');
    document.documentElement.classList.add('trava-rolagem');      // a página de trás não rola
    elG.scrollTop = 0;
    const x = elG.querySelector('[data-g-fechar]'); if (x) x.focus();
  }
  function fecharGaveta() {
    if (!gaveta.chave) return false;
    gaveta.chave = null; elG.hidden = true; fundoG.hidden = true;
    document.body.classList.remove('com-gaveta');
    if (!document.body.classList.contains('doc-aberto')) document.documentElement.classList.remove('trava-rolagem');
    return true;
  }
  fundoG.addEventListener('click', fecharGaveta);

  function abrirDoc(codigo) {
    fecharConta();
    if (!DOC.abrir(codigo, ctx)) ctx.toast(T('e_nao_achei'));
  }
  // Um pedido de cargo abre na aba Aprovação, já escolhido na lista.
  function abrirReq(codigo) {
    if (!A.porCodigo(codigo)) return;
    fecharGaveta(); DOC.fechar();
    TELAS.aprovacao.selecionar(codigo);
    estado.aba = 'aprovacao';
    desenhar(); window.scrollTo({ top: 0 });
  }

  // Passo 6: um ouvinte de clique para a página inteira (delegação). O elemento
  // MAIS PERTO do clique decide (um botão dentro de uma linha clicável ganha da linha).
  const ALVOS = '[data-acao],[data-conta],[data-drill],[data-doc],[data-req],[data-aba],[data-lang],[data-tema],[data-secao],[data-g-fechar],[data-g-ordem],[data-g-csv],[data-doc-fechar],[data-doc-imprimir],[data-doc-copiar],[data-fechar-conta]';
  const MODULOS = { apr: 'aprovacao', org: 'organograma', tab: 'cargos', ger: 'geral' };
  document.addEventListener('click', e => {
    const b = e.target.closest(ALVOS);
    if (!b) { if (!e.target.closest('.conta-pop')) fecharConta(); return; }
    if (b.disabled) return;
    if (b.hasAttribute('data-fechar-conta')) return fecharConta();
    if (b.dataset.conta) { e.stopPropagation(); return abrirConta(b.dataset.conta, b); }
    fecharConta();
    if (b.hasAttribute('data-doc-fechar')) return DOC.fechar();
    if (b.hasAttribute('data-doc-imprimir')) return window.print();
    if (b.hasAttribute('data-doc-copiar')) {
      const url = location.href.split('#')[0].split('?')[0] + '?cargo=' + DOC.aberto;
      try { navigator.clipboard.writeText(url).then(() => ctx.toast(T('d_copiado')), () => ctx.toast(url)); } catch (err) { ctx.toast(url); }
      return;
    }
    if (b.hasAttribute('data-g-fechar')) return fecharGaveta();
    if (b.hasAttribute('data-g-csv')) { const u = gaveta.ultima; return ctx.baixarCsv('lista', u.cols.map(c => c[1]), u.lista.map(x => u.cols.map(c => c[4](x)))); }
    if (b.dataset.gOrdem) { gaveta.ordem = G.proximaOrdem(gaveta.ordem, b.dataset.gOrdem); desenharGaveta(); const f = elG.querySelector(`[data-g-ordem="${b.dataset.gOrdem}"]`); if (f) f.focus(); return; }
    if (b.dataset.acao) {
      const [m, nome] = b.dataset.acao.split(':');
      const tela = TELAS[MODULOS[m]];
      if (tela && tela.acao) tela.acao(nome, b, ctx, e);
      return;
    }
    if (b.dataset.drill) { DOC.fechar(); return abrirLista(b.dataset.drill); }
    if (b.dataset.doc) return abrirDoc(b.dataset.doc);
    if (b.dataset.req) return abrirReq(b.dataset.req);
    if (b.dataset.aba) { DOC.fechar(); fecharGaveta(); estado.aba = b.dataset.aba; desenhar(); window.scrollTo({ top: 0 }); return; }
    if (b.dataset.lang) { estado.lang = b.dataset.lang; desenhar(); if (DOC.aberto) abrirDoc(DOC.aberto); return; }
    if (b.hasAttribute('data-tema')) { estado.tema = estado.tema === 'escuro' ? 'claro' : 'escuro'; desenhar(); return; }
    if (b.dataset.secao) { document.getElementById(b.dataset.secao).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  // Campos: texto avisa a cada tecla ("input"); lista e caixa de marcar, ao mudar ("change").
  function aoMudar(e) {
    const el = e.target;
    if (el.matches('[data-g-busca]')) {
      if (e.type !== 'input') return;
      gaveta.busca = el.value; desenharGaveta();
      const nova = elG.querySelector('[data-g-busca]'); nova.focus(); nova.setSelectionRange(nova.value.length, nova.value.length);
      return;
    }
    const alvo = el.closest('[data-campo]');
    if (!alvo) return;
    const ehTexto = (alvo.tagName === 'INPUT' && !['checkbox', 'radio'].includes(alvo.type)) || alvo.tagName === 'TEXTAREA';
    if (ehTexto !== (e.type === 'input')) return;
    const [m, ...resto] = alvo.dataset.campo.split(':');
    const tela = TELAS[MODULOS[m]];
    if (tela && tela.campo) tela.campo(resto.join(':'), alvo, ctx, e.type);
  }
  document.addEventListener('input', aoMudar);
  document.addEventListener('change', aoMudar);

  // Teclado: Esc fecha o que estiver por cima; Enter abre linha e barra clicáveis.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!pop.hidden) return fecharConta();
      if (DOC.fechar()) return;
      fecharGaveta();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const linha = e.target.closest && e.target.closest('tr[data-doc], tr[data-req], .lb-linha[data-drill], .fx-linha[data-drill]');
      if (linha && linha === e.target) { e.preventDefault(); linha.click(); }
    }
  });

  // O formulário (outra aba do navegador) mandou ou reenviou um pedido: o painel acompanha.
  A.aoMudar(() => desenhar());

  // Passo 7: abrir já com um cargo ou pedido na tela (?cargo=CG-104, #cargo=CG-104, ?req=REQ-0005).
  if (q.get('req') && A.porCodigo(q.get('req'))) { TELAS.aprovacao.selecionar(q.get('req')); estado.aba = 'aprovacao'; }
  desenhar();
  const doHash = (location.hash.match(/cargo=([A-Z0-9-]+)/) || [])[1];
  const pedido = q.get('cargo') || doHash;
  if (pedido) abrirDoc(pedido);
})();
