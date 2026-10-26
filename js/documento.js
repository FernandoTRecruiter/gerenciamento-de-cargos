/* =============================================================================
   documento.js: o DOCUMENTO do cargo (a descrição de cargo) e a janela da ficha.

   Um desenho só para três usos, para o documento nunca mudar de cara:
   - a ficha de um cargo do catálogo (com ocupação e cargos parecidos ao lado);
   - a prévia do formulário de requisição (o gestor vê o documento antes de enviar);
   - a análise do RH na aprovação.
   Imprimir sai só a folha: o @media print do CSS esconde o resto da tela.
   ============================================================================= */
window.DOCUMENTO = (function () {
  'use strict';
  const C = window.CATALOGO, O = window.OCUPACAO, R = window.REDATOR, TR = window.TRADUTOR;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Passo 1: transformar cargo OU requisição num "modelo" de documento único.
  function deCargo(cg, ctx) {
    const lang = ctx.lang;
    return {
      tipo: 'cargo', codigo: cg.codigo, nome: C.L(cg.nome, lang), nomeOutro: C.L(cg.nome, lang === 'en' ? 'pt' : 'en'),
      area: cg.area, nivel: cg.nivel, grade: cg.grade, cbo: cg.cbo, reportaA: cg.reportaA,
      lidera: C.subordinados(cg.codigo).map(x => x.codigo),
      missao: C.L(cg.missao, lang), descricao: R.descricaoDoCargo(cg, lang),
      resp: C.responsabilidades(cg).map(r => C.L(r, lang)),
      req: C.requisitos(cg.nivel, cg.req).map(r => C.L(r.txt, lang)),
      comp: cg.comp || [], novo: cg.origem === 'requisicao', requisicao: cg.requisicao || null, criadoEm: cg.criadoEm,
      idiomaConteudo: cg.idiomaConteudo || null
    };
  }
  // pacote = o que o formulário junta (ou o que está guardado na requisição).
  function dePacote(p0, ctx, extra) {
    extra = extra || {};
    // Pedido com tradução (os exemplos): na tela em inglês, usa o texto em inglês.
    const p = ctx.lang === 'en' && p0.en ? Object.assign({}, p0, p0.en, { idioma: 'en' }) : p0;
    const req = C.requisitos(p.nivel, {
      esc: p.nivel === 'apr' ? 'apr' : p.nivel === 'est' ? 'est' : p.esc, form: p.formacao ? [p.formacao, p.formacao] : null,
      exp: p.exp || 0, idi: p.idiomas ? (p.idi || []).filter(x => x[0] && x[1]) : [], via: p.viagens || 0, tur: !!p.turnos,
      cnh: p.cnh && p.cnh !== 'nao' ? p.cnh : null, extra: (p.extras || []).filter(x => (x || '').trim())
    }).map(r => C.L(r.txt, ctx.lang));   // a frase gerada segue a tela; o texto livre fica como foi escrito
    return {
      tipo: 'requisicao', codigo: extra.codigo || null, nome: (ctx.lang === 'en' ? p.nomeEn : p.nomePt) || p.nomePt || p.nomeEn || '',
      nomeOutro: (ctx.lang === 'en' ? p.nomePt : p.nomeEn) || '',
      area: p.area, nivel: p.nivel, grade: extra.grade || null, cbo: extra.cbo || null, reportaA: p.reportaA,
      lidera: [], missao: p.missao || '', descricao: p.descricao || '', resp: (p.resp || []).filter(x => (x || '').trim()),
      req, comp: p.comp || [], novo: false, idiomaConteudo: p.idioma || 'pt'
    };
  }

  // Passo 2: a folha. Campos vazios aparecem como "a preencher", nunca somem
  // (assim a prévia mostra o que falta).
  function folha(m, ctx, opc) {
    opc = opc || {};
    const T = ctx.T;
    const falta = `<span class="doc-falta">${esc(T('d_a_preencher'))}</span>`;
    const area = m.area ? ctx.nomeArea(m.area) : falta, nivel = m.nivel ? ctx.nomeNivel(m.nivel) : falta;
    const f = m.grade ? C.faixa(m.grade) : null;
    const sup = m.reportaA ? C.porCodigo(m.reportaA) : null;
    const linkCargo = cg => cg ? `<button class="doc-link" data-doc="${esc(cg.codigo)}">${esc(C.L(cg.nome, ctx.lang))}</button>` : '';
    const ehReq = m.tipo === 'requisicao';
    const campo = (rot, val, cls) => `<div class="doc-campo${cls ? ' ' + cls : ''}"><dt>${esc(rot)}</dt><dd>${val}</dd></div>`;
    let h = `<article class="doc-folha" data-doc-codigo="${esc(m.codigo || '')}" data-testid="doc-folha">`;
    h += `<header class="doc-cab"><div class="doc-marca"><span class="doc-logo" aria-hidden="true">${ctx.ICONE}</span><span>${esc(ctx.D.empresa)}<br><small>${esc(T('d_marca'))}</small></span></div>` +
      `<div class="doc-cod mono">${m.codigo ? esc(m.codigo) : esc(T('d_cod_envio'))}</div></header>`;
    h += `<div class="doc-titulo"><h2 class="doc-nome">${m.nome ? esc(m.nome) : falta}</h2>` +
      `${m.nomeOutro ? `<div class="doc-en" lang="${ctx.langOutra}">${esc(m.nomeOutro)}</div>` : ''}` +
      `<div class="doc-chips"><span class="chip neutro">${area}</span><span class="chip neutro">${nivel}</span>` +
      `${m.grade ? `<span class="chip acc">G${m.grade}</span>` : ''}${m.novo ? `<span class="chip ok">${esc(T('d_novo'))}</span>` : ''}</div></div>`;
    h += '<dl class="doc-campos">' +
      campo(T('d_familia'), area) + campo(T('d_nivel'), nivel) +
      campo(T('d_grade'), m.grade ? `<b class="mono">G${m.grade}</b>` : `<span class="doc-rh">${esc(T('d_grade_rh'))}</span>`) +
      campo(T('d_faixa'), f ? `<span class="mono">${ctx.brl(f.min)} · ${ctx.brl(f.med)} · ${ctx.brl(f.max)}</span><small>${esc(T('d_faixa_leg'))}</small>` : `<span class="doc-rh">${esc(T('d_faixa_rh'))}</span>`, 'largo') +
      campo(T('d_cbo'), m.cbo ? `<span class="mono">${esc(m.cbo)}</span> <small>${esc(T('d_exemplo'))}</small>` : `<span class="doc-rh">${esc(T('d_cbo_rh'))}</span>`) +
      campo(T('d_reporta'), sup ? linkCargo(sup) : (m.reportaA === null && m.tipo === 'cargo' ? esc(T('d_conselho')) : falta), m.lidera.length ? '' : 'inteiro') +
      (m.lidera.length ? campo(T('d_lidera'), m.lidera.map(c => linkCargo(C.porCodigo(c))).join('<span class="doc-sep">·</span>'), 'largo') : '') +
      '</dl>';
    if (m.idiomaConteudo && m.idiomaConteudo !== ctx.lang && (ehReq || m.novo)) h += `<p class="doc-nota-idioma">${esc(T(m.idiomaConteudo === 'en' ? 'd_conteudo_en' : 'd_conteudo_pt'))}</p>`;
    if (m.novo && m.requisicao) h += `<p class="doc-nota-idioma">${esc(T('d_criado_req', { c: m.requisicao, d: ctx.data(m.criadoEm) }))}</p>`;
    if (opc.avisoHtml) h += opc.avisoHtml;
    const sec = (titulo, corpo, id) => `<section class="doc-sec"${id ? ` data-sec="${id}"` : ''}><h3>${esc(titulo)}</h3>${corpo}</section>`;
    // Texto escrito noutra língua (pedido de quem escreveu em português, visto em inglês) vai marcado com lang=.
    const outra = m.idiomaConteudo && m.idiomaConteudo !== ctx.lang ? ` lang="${m.idiomaConteudo === 'en' ? 'en' : 'pt-BR'}"` : '';
    h += sec(T('d_missao'), m.missao ? `<p${outra}>${esc(m.missao)}</p>` : `<p>${falta}</p>`, 'missao');
    h += sec(T('d_descricao'), m.descricao ? `<p${outra}>${esc(m.descricao)}</p>` : `<p>${falta}</p>`, 'descricao');
    h += sec(T('d_resp'), m.resp.length ? `<ol class="doc-lista"${outra}>${m.resp.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` : `<p>${falta}</p>`, 'resp');
    h += sec(T('d_req'), m.req.length ? `<ul class="doc-chk">${m.req.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : `<p>${falta}</p>`, 'req');
    h += sec(T('d_comp'), m.comp.length ? `<dl class="doc-comp">${m.comp.filter(k => C.COMPETENCIAS[k]).map(k => `<div><dt>${esc(C.L(C.COMPETENCIAS[k][0], ctx.lang))}</dt><dd>${esc(C.L(C.COMPETENCIAS[k][1], ctx.lang))}</dd></div>`).join('')}</dl>` : `<p>${falta}</p>`, 'comp');
    // Assinaturas (fictícias): quem elaborou e quem aprovou o cargo, com a assinatura "à mão"
    // numa fonte cursiva. Pedido ainda não aprovado mostra as linhas em branco.
    const P = ctx.O.personas, assinado = m.tipo === 'cargo';
    const ass = (rot, p) => `<div class="doc-ass-item"><span class="doc-rubrica" aria-hidden="true">${assinado ? esc(p.nome) : ''}</span>` +
      `<span class="doc-ass-linha"></span><b>${esc(T(rot))}</b><small>${assinado ? esc(p.nome) + ' · ' + esc(ctx.nomeCargo(p.cargo)) + (m.criadoEm ? ' · ' + ctx.data(m.criadoEm) : '') : esc(T('d_ass_pendente'))}</small></div>`;
    h += `<footer class="doc-pe"><div class="doc-ass">${ass('d_ass_elaborado', P.analista)}${ass('d_ass_aprovado', P.master)}` +
      `<div class="doc-ass-item"><span class="doc-rubrica"></span><span class="doc-ass-linha"></span><b>${esc(T('d_ass_colab'))}</b><small>${esc(T('d_data'))}: ____/____/______</small></div></div>` +
      `<p>${esc(T('d_pe_ficticio'))}</p></footer></article>`;
    return h;
  }

  // Passo 3: cargos parecidos, cada um com o PORQUÊ (o RH decide melhor sabendo).
  const PALAVRA_GENERICA = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'em', 'a', 'o', 'analista', 'tecnico', 'tecnica', 'auxiliar', 'operador',
    'operadora', 'coordenador', 'coordenadora', 'gerente', 'diretor', 'diretora', 'especialista', 'estagiario', 'estagiaria', 'aprendiz',
    'i', 'ii', 'iii', 'iv', 'junior', 'pleno', 'senior', 'ceo']);
  const palavras = nome => new Set(TR.semAcento(TR.tiraGenero(nome || '')).replace(/[()]/g, ' ').split(/[\s/-]+/).filter(w => w.length > 2 && !PALAVRA_GENERICA.has(w)));
  function parecidos(alvo, limite) {
    const ordem = n => window.DADOS.niveis[n].ordem;
    const meu = palavras(C.L(alvo.nome, 'pt'));
    const out = [], vistos = new Set([alvo.codigo]);
    const poe = (cg, porque) => { if (!vistos.has(cg.codigo)) { vistos.add(cg.codigo); out.push({ cg, porque }); } };
    const lista = C.todos();
    lista.filter(x => x.area === alvo.area && x.nivel === alvo.nivel).forEach(x => poe(x, 'familia_nivel'));
    lista.filter(x => meu.size && [...palavras(C.L(x.nome, 'pt'))].some(w => meu.has(w))).forEach(x => poe(x, 'nome'));
    lista.filter(x => x.area === alvo.area && alvo.nivel && Math.abs(ordem(x.nivel) - ordem(alvo.nivel)) === 1)
      .forEach(x => poe(x, ordem(x.nivel) > ordem(alvo.nivel) ? 'acima' : 'abaixo'));
    if (alvo.grade) lista.filter(x => x.grade === alvo.grade && x.area !== alvo.area).forEach(x => poe(x, 'grade'));
    return out.slice(0, limite || 6);
  }
  function listaParecidos(itens, ctx) {
    if (!itens.length) return `<p class="lado-vazio">${esc(ctx.T('d_sem_parecidos'))}</p>`;
    return '<ul class="parecidos">' + itens.map(({ cg, porque }) =>
      `<li><button class="parecido" data-doc="${esc(cg.codigo)}"><span class="mono">${esc(cg.codigo)}</span><b>${esc(C.L(cg.nome, ctx.lang))}</b>` +
      `<small>${esc(ctx.T('d_p_' + porque))} · ${esc(ctx.nomeNivel(cg.nivel))} · G${cg.grade}</small></button></li>`).join('') + '</ul>';
  }

  // Passo 4: a coluna do lado (só na tela): ocupação e parecidos.
  function lado(cg, ctx) {
    const T = ctx.T, r = O.resumo(cg.codigo);
    const linha = (rot, val) => `<div class="lado-linha"><span>${esc(rot)}</span><b class="mono">${val}</b></div>`;
    let h = `<section class="lado-bloco"><h3>${esc(T('d_ocupacao'))}</h3>` +
      linha(T('d_ocupantes'), ctx.num(r.n)) + linha(T('d_media'), r.media == null ? '-' : ctx.brl(r.media)) +
      linha(T('d_cr'), r.crMedio == null ? '-' : ctx.pct(r.crMedio, 0)) + linha(T('d_vagas'), ctx.num(r.nVagas));
    h += r.n ? `<button class="botao" data-drill="cargo-ocup:${esc(cg.codigo)}">${esc(T('d_ver_ocupantes'))} →</button>`
      : `<p class="lado-vazio">${esc(T('d_sem_ocupante', { d: ctx.data(O.dataRef) }))}</p>`;
    if (r.nVagas) h += `<button class="botao leve" data-drill="cargo-vagas:${esc(cg.codigo)}">${esc(T('d_ver_vagas'))} →</button>`;
    h += '</section>';
    h += `<section class="lado-bloco"><h3>${esc(T('d_parecidos'))}</h3>${listaParecidos(parecidos(cg), ctx)}</section>`;
    return h;
  }

  // Passo 5: a janela. Fica no <body>, por cima de tudo (até da gaveta).
  let janela = null, aberto = null;
  function garanteJanela() {
    if (janela) return janela;
    janela = document.createElement('div');
    janela.className = 'doc-modal';
    janela.hidden = true;
    janela.setAttribute('role', 'dialog');
    janela.setAttribute('aria-modal', 'true');
    document.body.appendChild(janela);
    return janela;
  }
  // Página de trás parada enquanto a janela está aberta (html e body: um dos dois é quem rola).
  function travaPagina(sim) {
    document.body.classList.toggle('doc-aberto', sim);
    document.documentElement.classList.toggle('trava-rolagem', sim || document.body.classList.contains('com-gaveta'));
  }
  function abrir(codigo, ctx) {
    const cg = C.porCodigo(codigo);
    if (!cg) return false;
    aberto = codigo;
    const T = ctx.T, j = garanteJanela();
    j.setAttribute('aria-label', C.L(cg.nome, ctx.lang));
    j.innerHTML = `<div class="doc-fundo" data-doc-fechar></div><div class="doc-janela">` +
      `<div class="doc-barra"><span class="eyebrow">${esc(T('d_ficha'))} · ${esc(cg.codigo)}</span><span class="doc-acoes">` +
      `<button class="botao" data-doc-imprimir>⎙ ${esc(T('d_imprimir'))}</button>` +
      `<button class="botao leve" data-doc-copiar>${esc(T('d_copiar'))}</button>` +
      `<button class="g-x" data-doc-fechar aria-label="${esc(T('d_fechar'))}">✕</button></span></div>` +
      `<div class="doc-corpo" tabindex="0" data-testid="doc-rolagem">${folha(deCargo(cg, ctx), ctx)}<aside class="doc-lado">${lado(cg, ctx)}</aside></div>` +
      `<div class="doc-mais" aria-hidden="true"><span>↓ ${esc(T('d_mais'))}</span></div></div>`;
    j.hidden = false;
    travaPagina(true);
    try { history.replaceState(null, '', location.pathname + location.search + '#cargo=' + codigo); } catch (e) { /* file:// em alguns navegadores */ }
    // O foco vai para o corpo do documento: roda do mouse, setas, Page Down e toque rolam ELE.
    const corpo = j.querySelector('.doc-corpo');
    corpo.scrollTop = 0;
    const mostraMais = () => j.classList.toggle('tem-mais', corpo.scrollTop + corpo.clientHeight < corpo.scrollHeight - 8);
    corpo.addEventListener('scroll', mostraMais, { passive: true });
    mostraMais();
    corpo.focus({ preventScroll: true });
    return true;
  }
  function fechar() {
    if (!janela || janela.hidden) return false;
    janela.hidden = true; aberto = null;
    travaPagina(false);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* idem */ }
    return true;
  }

  return { deCargo, dePacote, folha, parecidos, listaParecidos, abrir, fechar, get aberto() { return aberto; } };
})();
