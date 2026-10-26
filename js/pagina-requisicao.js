/* =============================================================================
   pagina-requisicao.js: a PÁGINA do formulário (requisicao.html), separada do painel.

   Quem usa é o gestor que precisa de um cargo novo; por isso a página mostra
   pouca coisa de cada vez, em 4 etapas:
     1. O cargo          nome (o inglês sai sozinho), família, nível e chefe
     2. O que faz        missão e responsabilidades; a descrição sai pronta delas
     3. O que se pede    escolaridade, experiência e competências já vêm com o padrão
                         do nível; o resto fica em "Mais requisitos", fechado
     4. Revisar e enviar o documento como o RH vai receber, o termo e o envio
   Regras que valem aqui (vieram do app de trabalho que inspirou a demo):
   - não dá para pular etapa; requisito pede do candidato, nunca descreve o cargo;
   - modelo = só pedidos da própria pessoa;
   - descrição igual à de outro pedido seu com outro título: aviso, sem travar
     (pedido reprovado não conta);
   - termo em 4 pontos: Análise, Resultado, Dúvidas, Responsabilidade.
   Conversa com o painel pelo próprio navegador (localStorage): o pedido enviado
   aqui aparece na aba Aprovação do painel, e a decisão de lá aparece aqui.
   ============================================================================= */
(function () {
  'use strict';
  const C = window.CATALOGO, A = window.ARMAZEM, TR = window.TRADUTOR, RED = window.REDATOR, DOC = window.DOCUMENTO, P = window.PEDIDOS;
  const I = window.I18N, T = I.T, esc = window.CONTEXTO.esc;
  const q = new URLSearchParams(location.search), pref = window.CONTEXTO.lerPref();
  const escuroSistema = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  const estado = {
    lang: ['pt', 'en'].includes(q.get('lang')) ? q.get('lang') : (pref.lang || 'en'),
    tema: ['claro', 'escuro'].includes(q.get('tema')) ? q.get('tema') : (pref.tema || (escuroSistema ? 'escuro' : 'claro')),
    vista: q.get('ver') === 'minhas' ? 'minhas' : 'nova'
  };
  const ctx = window.CONTEXTO.criar(estado);
  window.CONTEXTO.montarUi();
  const raiz = document.getElementById('app');
  const eu = window.OCUPACAO.personas.gestor;
  const ordem = n => window.DADOS.niveis[n].ordem;
  const NIVEIS_FORM = C.NIVEIS_ASC.filter(n => n !== 'dir');     // diretoria não se pede por aqui
  const ETAPAS = ['et_cargo', 'et_faz', 'et_pede', 'et_revisar'];
  const MAX_RESP = 8, MAX_EXTRAS = 4;

  // ---------------------------------------------------------------- o estado do formulário
  const NOVO = () => ({
    etapa: 1, reenviando: null, verModelo: false, modelo: '',
    nomePt: '', nomeEn: '', enFonte: null, enFalta: null, editaEn: false,
    area: '', nivel: '', reportaA: '',
    missao: '', resp: ['', '', ''], descricao: '', descManual: false,
    esc: '', formacao: '', exp: null, idioma: '', idiomaNivel: 'intermediario', viagens: 0, turnos: false, cnh: 'nao',
    extras: [''], comp: [], padroes: false, termo: false, idiomaConteudo: null
  });
  let F = NOVO(), enviado = null, minhaSel = null, focoDepois = null;

  const norm = s => TR.semAcento(String(s || '')).replace(/\s+/g, ' ').trim();
  const cheios = l => (l || []).filter(x => (x || '').trim());
  const fixa = () => F.nivel === 'apr' || F.nivel === 'est';          // aprendiz e estágio: a lei define a escolaridade
  const langTexto = () => F.idiomaConteudo || estado.lang;

  // A descrição: escrita pela pessoa, ou montada das responsabilidades (o padrão).
  function descricao() {
    if (F.descManual) return F.descricao.trim();
    const sup = F.reportaA ? C.porCodigo(F.reportaA) : null;
    return RED.compor({ area: F.area, nivel: F.nivel, resp: cheios(F.resp), superiorNome: sup ? C.L(sup.nome, langTexto()) : '' }, langTexto());
  }

  // O que falta em cada etapa (os nomes aparecem em "Falta: ...").
  function faltas(n) {
    const f = [];
    if (n === 1) {
      if (F.nomePt.trim().length < 3) f.push('fl_nome_pt');
      if (F.nomeEn.trim().length < 3) f.push('fl_nome_en');
      if (!F.area) f.push('fl_area');
      if (!F.nivel) f.push('fl_nivel');
      if (!F.reportaA) f.push('fl_reporta');
    }
    if (n === 2) {
      if (F.missao.trim().length < 20) f.push('fl_missao');
      if (cheios(F.resp).length < 3) f.push('fl_resp');
      if (descricao().length < 80) f.push('fl_descricao');
    }
    if (n === 3) {
      if (!fixa() && !F.esc) f.push('fl_esc');
      if (F.exp == null) f.push('fl_exp');
      if (F.comp.length < 3) f.push('fl_comp');
    }
    if (n === 4 && !F.termo) f.push('fl_termo');
    return f;
  }
  const etapaOk = n => !faltas(n).length;
  const liberada = n => [1, 2, 3].slice(0, n - 1).every(etapaOk);
  const pronto = () => [1, 2, 3, 4].every(etapaOk);

  // O pedido no formato guardado (o mesmo que o documento e a aprovação leem).
  function pacote() {
    return {
      nomePt: F.nomePt.trim(), nomeEn: F.nomeEn.trim(), enFonte: F.enFonte, area: F.area, nivel: F.nivel, reportaA: F.reportaA,
      missao: F.missao.trim(), resp: cheios(F.resp).map(x => x.trim()), descricao: descricao(),
      esc: fixa() ? F.nivel : F.esc, formacao: F.formacao.trim(), exp: F.exp || 0,
      idiomas: !!F.idioma, idi: F.idioma ? [[F.idioma, F.idiomaNivel || 'intermediario']] : [], viagens: Number(F.viagens) || 0,
      turnos: !!F.turnos, cnh: F.cnh || 'nao', extras: cheios(F.extras).map(x => x.trim()), comp: F.comp.slice(), idioma: langTexto()
    };
  }
  function carregarPacote(p0) {
    // Pedido com tradução (os exemplos): com a tela em inglês, o texto vem em inglês.
    const p = estado.lang === 'en' && p0.en ? Object.assign({}, p0, p0.en, { idioma: 'en' }) : p0;
    Object.assign(F, {
      nomePt: p.nomePt || '', nomeEn: p.nomeEn || '', enFonte: p.enFonte || 'manual', enFalta: null,
      area: p.area || '', nivel: p.nivel || '', reportaA: p.reportaA || '',
      missao: p.missao || '', resp: p.resp && p.resp.length ? p.resp.slice() : ['', '', ''],
      descricao: p.descricao || '', descManual: true,                 // guarda o texto que já foi escrito, tal como está
      esc: ['apr', 'est'].includes(p.esc) ? '' : (p.esc || ''), formacao: p.formacao || '', exp: p.exp == null ? null : p.exp,
      idioma: p.idi && p.idi[0] ? p.idi[0][0] : '', idiomaNivel: p.idi && p.idi[0] ? p.idi[0][1] : 'intermediario',
      viagens: p.viagens || 0, turnos: !!p.turnos, cnh: p.cnh || 'nao', extras: p.extras && p.extras.length ? p.extras.slice() : [''],
      comp: (p.comp || []).slice(), padroes: true, termo: false, idiomaConteudo: p.idioma || null
    });
  }

  // Padrões do nível na etapa 3 (só uma vez; depois vale o que a pessoa escolher).
  function aplicarPadroes() {
    if (F.padroes || !F.nivel) return;
    const info = C.NIVEIS_INFO[F.nivel] || C.NIVEIS_INFO.ana;
    if (!F.esc && info.escMin) F.esc = info.escMin;
    if (F.exp == null) F.exp = info.expPadrao;
    if (!F.comp.length) F.comp = RED.preencherRequisitos({ nivel: F.nivel, area: F.area, comp: [] }).comp || [];
    F.turnos = ['ops', 'man', 'log'].includes(F.area) && ['ope', 'tcn', 'coo'].includes(F.nivel);
    F.padroes = true;
  }

  // Os avisos: nenhum trava o envio, todos ajudam a decidir.
  function avisos() {
    const meus = A.doSolicitante(eu.id).filter(r => r.codigo !== F.reenviando);
    const out = {};
    const t = TR.traduzir(F.nomePt);
    if (t.ok && t.fonte === 'catalogo') out.noCatalogo = C.porCodigo(t.codigo);
    const chave = TR.chave(F.nomePt);
    if (chave) out.repetido = meus.find(r => (r.status === 'analise' || r.status === 'alteracao') && TR.chave(r.pacote.nomePt) === chave) || null;
    const d = norm(descricao());
    if (d.length >= 20) out.descIgual = meus.find(r => r.status !== 'reprovado' && norm(r.pacote.descricao) === d &&
      (norm(r.pacote.nomePt) !== norm(F.nomePt) || norm(r.pacote.nomeEn) !== norm(F.nomeEn))) || null;
    return out;
  }
  function avisosNomeHtml(av) {
    let h = '';
    if (av.noCatalogo) h += `<div class="aviso" data-testid="aviso-catalogo">${esc(T('av_catalogo', { n: C.L(av.noCatalogo.nome, estado.lang), c: av.noCatalogo.codigo }))} <button class="link" data-doc="${av.noCatalogo.codigo}">${esc(T('ver_documento'))}</button></div>`;
    if (av.repetido) h += `<div class="aviso" data-testid="aviso-repetido">${esc(T('av_repetido', { c: av.repetido.codigo, s: T('st_' + av.repetido.status).toLowerCase() }))}</div>`;
    return h;
  }
  const avisoDescHtml = av => av.descIgual
    ? `<div class="aviso aviso-desc-igual" data-testid="aviso-desc-igual" role="status"><b>${esc(T('av_desc_titulo'))}</b> ${esc(T('av_desc', { c: av.descIgual.codigo, n: P.titulo(av.descIgual, ctx) }))}</div>` : '';

  // ---------------------------------------------------------------- o desenho
  // Um campo: rótulo, a ajuda curta logo embaixo (lida ANTES de preencher) e o campo.
  const campo = (id, rotulo, corpo, ajuda, para) => `<div class="rq-campo" data-bloco="${id}"><label class="rq-rot"${para ? ` for="${para}"` : ''}>${esc(rotulo)}</label>` +
    `${ajuda ? `<p class="rq-ajuda">${esc(ajuda)}</p>` : ''}${corpo}</div>`;
  const select = (id, nome, opcoes, valor) => `<select id="${id}" data-campo="rq:${nome}">` + opcoes.map(([v, t, off]) =>
    `<option value="${esc(v)}"${String(valor) === String(v) ? ' selected' : ''}${off ? ' disabled' : ''}>${esc(t)}</option>`).join('') + '</select>';
  function opcoesChefe() {
    if (!F.area || !F.nivel) return [];
    return C.todos().filter(cg => (cg.area === F.area && ordem(cg.nivel) > ordem(F.nivel)) || cg.area === 'dir')
      .sort((a, b) => (a.area === 'dir') - (b.area === 'dir') || ordem(a.nivel) - ordem(b.nivel) || b.grade - a.grade);
  }
  // Chefe sugerido: o líder mais próximo acima, na mesma família.
  function sugerirChefe() {
    if (F.reportaA || !F.area || !F.nivel) return;
    const ops = opcoesChefe(), lider = ops.find(cg => cg.area === F.area && window.DADOS.niveis[cg.nivel].lider);
    const op = lider || ops.find(cg => cg.area === F.area) || ops[0];
    if (op) F.reportaA = op.codigo;
  }
  function linhaIngles() {
    if (F.editaEn || F.enFalta) {
      return `<input id="f-nomeEn" type="text" maxlength="80" data-campo="rq:nomeEn" value="${esc(F.nomeEn)}" placeholder="${esc(T('ph_nome_en'))}" aria-label="${esc(T('f_nome_en'))}">` +
        (F.enFalta ? `<p class="rq-ajuda en-falta">${esc(T('en_falta', { w: F.enFalta }))}</p>` : '');
    }
    if (!F.nomeEn) return `<p class="rq-ajuda">${esc(T('en_auto'))}</p>`;
    return `<p class="rq-en"><span>${esc(T('f_nome_en'))}:</span> <b data-testid="nome-en" lang="en">${esc(F.nomeEn)}</b> <small>${esc(T('en_' + F.enFonte))}</small> ` +
      `<button class="link" data-acao="rq:editaEn">${esc(T('editar'))}</button></p>`;
  }

  function etapa1() {
    const meus = A.doSolicitante(eu.id);
    let h = '';
    if (!F.reenviando && meus.length) {
      h += F.verModelo
        ? `<div class="rq-modelo"><label class="rq-rot" for="f-modelo">${esc(T('origem_minha'))}</label><div class="rq-linha">` +
          select('f-modelo', 'modelo', [['', T('escolha')]].concat(meus.map(r => [r.codigo, r.codigo + ' · ' + P.titulo(r, ctx) + ' · ' + T('st_' + r.status)])), F.modelo) +
          `<button class="botao" data-acao="rq:usarModelo"${F.modelo ? '' : ' disabled'}>${esc(T('usar_modelo'))}</button></div><p class="rq-ajuda">${esc(T('origem_ajuda'))}</p></div>`
        : `<button class="link rq-modelo-link" data-acao="rq:verModelo">${esc(T('rq_comecar_de'))}</button>`;
    }
    h += campo('nome', T('f_nome'), `<input id="f-nomePt" type="text" maxlength="80" data-campo="rq:nomePt" value="${esc(F.nomePt)}" placeholder="${esc(T('ph_nome_pt'))}" autocomplete="off">` +
      `<div id="rq-en">${linhaIngles()}</div><div id="rq-avisos-nome">${avisosNomeHtml(avisos())}</div>`, T('rq_ajuda_nome'), 'f-nomePt');
    h += campo('area', T('f_area'), select('f-area', 'area', [['', T('escolha')]].concat(C.AREAS_ORDEM.map(a => [a, ctx.nomeArea(a)])), F.area), T('rq_ajuda_area'), 'f-area');
    h += campo('nivel', T('f_nivel'), select('f-nivel', 'nivel', [['', T('escolha')]].concat(NIVEIS_FORM.map(n => [n, ctx.nomeNivel(n)])), F.nivel),
      F.nivel ? C.L(C.NIVEIS_INFO[F.nivel].desc, estado.lang) : T('rq_ajuda_nivel'), 'f-nivel');
    const ops = opcoesChefe();
    h += campo('reporta', T('f_reporta'), ops.length
      ? select('f-reportaA', 'reportaA', [['', T('escolha')]].concat(ops.map(cg => [cg.codigo, C.L(cg.nome, estado.lang) + ' · ' + ctx.nomeNivel(cg.nivel)])), F.reportaA)
      : `<p class="rq-ajuda">${esc(T('reporta_antes'))}</p>`, ops.length ? T('rq_ajuda_chefe') : '', 'f-reportaA');
    return h;
  }

  function etapa2() {
    let h = `<div class="rq-ferramenta"><button class="botao destaque" data-acao="rq:preencher">✦ ${esc(T('preencher'))}</button><p class="rq-ajuda">${esc(T('preencher_ajuda'))}</p></div>`;
    h += campo('missao', T('f_missao'), `<textarea id="f-missao" rows="2" maxlength="300" data-campo="rq:missao" placeholder="${esc(T('ph_missao'))}">${esc(F.missao)}</textarea>` +
      `<span class="contador" id="cont-missao"></span>`, T('rq_ajuda_missao'), 'f-missao');
    h += campo('resp', T('f_resp'), `<ol class="rq-lista" id="lista-resp">` + F.resp.map((r, i) =>
      `<li><span class="rq-num">${i + 1}</span><input id="f-resp-${i}" type="text" maxlength="160" data-campo="rq:resp:${i}" value="${esc(r)}" placeholder="${esc(T('ph_resp'))}" aria-label="${esc(T('f_resp'))} ${i + 1}">` +
      `<button class="x-item" data-acao="rq:delResp" data-i="${i}" aria-label="${esc(T('remover'))}"${F.resp.length <= 1 ? ' disabled' : ''}>✕</button></li>`).join('') + '</ol>' +
      `<div class="rq-linha-pe"><button class="botao leve" data-acao="rq:addResp"${F.resp.length >= MAX_RESP ? ' disabled' : ''}>+ ${esc(T('add_resp'))}</button><span class="contador" id="cont-resp"></span></div>`,
      T('rq_ajuda_resp'));
    h += campo('descricao', T('f_descricao'), F.descManual
      ? `<textarea id="f-descricao" rows="5" maxlength="1200" data-campo="rq:descricao">${esc(F.descricao)}</textarea><div class="rq-linha-pe">` +
        `<button class="link" data-acao="rq:descAuto">${esc(T('rq_desc_auto'))}</button><span class="contador" id="cont-desc"></span></div>`
      : `<div class="rq-desc-auto"><p id="rq-desc-txt" data-testid="desc-auto">${esc(descricao())}</p><button class="link" data-acao="rq:descManual">${esc(T('rq_desc_minha'))}</button></div>`,
      F.descManual ? T('rq_ajuda_desc_manual') : T('rq_ajuda_desc_auto'), 'f-descricao') + `<div id="rq-aviso-desc">${avisoDescHtml(avisos())}</div>`;
    return h;
  }

  // A lista de requisitos como vai sair no documento (saem dos campos; nunca descrevem o cargo).
  function listaRequisitos() {
    const p = pacote();
    const lista = C.requisitos(p.nivel, { esc: p.esc, form: p.formacao ? [p.formacao, p.formacao] : null, exp: p.exp, idi: p.idi,
      via: p.viagens, tur: p.turnos, cnh: p.cnh !== 'nao' ? p.cnh : null, extra: p.extras });
    return `<ul class="doc-chk">${lista.map(r => `<li>${esc(C.L(r.txt, estado.lang))}</li>`).join('')}</ul>`;
  }
  function etapa3() {
    const info = C.NIVEIS_INFO[F.nivel] || C.NIVEIS_INFO.ana;
    let h = '';
    if (fixa()) h += `<div class="rq-campo"><span class="rq-rot">${esc(T('f_esc'))}</span><p class="rq-fixo">${esc(T(F.nivel === 'apr' ? 'esc_fixa_apr' : 'esc_fixa_est'))}</p></div>`;
    else {
      const piso = info.escMin ? C.ESCOLARIDADE[info.escMin].ordem : 0;
      h += campo('esc', T('f_esc'), select('f-esc', 'esc', Object.keys(C.ESCOLARIDADE).map(k => [k, C.L(C.ESCOLARIDADE[k].rot, estado.lang) +
        (C.ESCOLARIDADE[k].ordem < piso ? ' · ' + T('abaixo_piso', { n: ctx.nomeNivel(F.nivel) }) : ''), C.ESCOLARIDADE[k].ordem < piso]), F.esc),
        piso > 1 ? T('piso_nivel', { n: ctx.nomeNivel(F.nivel), e: C.L(C.ESCOLARIDADE[info.escMin].rot, estado.lang).toLowerCase() }) : '', 'f-esc');
    }
    if (F.nivel !== 'apr' && (fixa() || ['tecnico', 'superior', 'pos'].includes(F.esc))) {
      h += campo('formacao', T(F.nivel === 'est' ? 'f_formacao_est' : 'f_formacao') + ' (' + T('opcional') + ')',
        `<input id="f-formacao" type="text" maxlength="120" data-campo="rq:formacao" value="${esc(F.formacao)}" placeholder="${esc(T('ph_formacao'))}">`, '', 'f-formacao');
    }
    h += campo('exp', T('f_exp'), select('f-exp', 'exp', C.EXPERIENCIA.map(n => [n, n === 0 ? T('exp_zero') : T(n === 1 ? 'exp_1' : 'exp_n', { n })]), F.exp), '', 'f-exp');
    h += campo('comp', T('f_comp'), `<div class="comps">` + Object.keys(C.COMPETENCIAS).map(k => {
      const on = F.comp.includes(k), cheio = F.comp.length >= 5 && !on;
      return `<button type="button" class="comp${on ? ' ativo' : ''}" aria-pressed="${on}" data-acao="rq:comp" data-valor="${k}"${cheio ? ' disabled' : ''} data-tip="${esc(C.L(C.COMPETENCIAS[k][1], estado.lang))}">${esc(C.L(C.COMPETENCIAS[k][0], estado.lang))}</button>`;
    }).join('') + `</div>`, T('rq_ajuda_comp'));
    // O resto fica fechado: quase nenhum cargo precisa mudar estes padrões.
    const ativos = [F.idioma, Number(F.viagens) > 0, F.turnos, F.cnh !== 'nao', cheios(F.extras).length].filter(Boolean).length;
    h += `<details class="rq-mais"${F.maisAberto ? ' open' : ''} data-acao-details="rq:mais"><summary>${esc(T('rq_mais'))}${ativos ? ` <span class="chip acc">${ativos}</span>` : ''}</summary><div class="rq-mais-corpo">` +
      campo('idioma', T('f_idiomas'), `<div class="rq-linha">${select('f-idioma', 'idioma', [['', T('exp_zero')]].concat(Object.keys(C.IDIOMAS).map(k => [k, C.L(C.IDIOMAS[k], estado.lang)])), F.idioma)}` +
        (F.idioma ? select('f-idiomaNivel', 'idiomaNivel', Object.keys(C.NIVEIS_IDIOMA).map(k => [k, C.L(C.NIVEIS_IDIOMA[k], estado.lang)]), F.idiomaNivel) : '') + '</div>', '', 'f-idioma') +
      campo('viagens', T('f_viagens'), select('f-viagens', 'viagens', C.VIAGENS.map((v, i) => [i, C.L(v.rot, estado.lang) + ' · ' + C.L(v.dica, estado.lang)]), F.viagens), '', 'f-viagens') +
      `<div class="rq-campo"><label class="rq-check"><input type="checkbox" data-campo="rq:turnos"${F.turnos ? ' checked' : ''}> ${esc(T('rq_turnos'))}</label></div>` +
      campo('cnh', T('f_cnh'), select('f-cnh', 'cnh', [['nao', T('cnh_nao')]].concat(C.CNH.map(k => [k, T('cnh_cat', { c: k })])), F.cnh), '', 'f-cnh') +
      campo('extras', T('f_extras'), `<ul class="rq-lista" id="lista-extras">` + F.extras.map((x, i) =>
        `<li><input id="f-extra-${i}" type="text" maxlength="160" data-campo="rq:extras:${i}" value="${esc(x)}" placeholder="${esc(T('ph_extra'))}" aria-label="${esc(T('f_extras'))} ${i + 1}">` +
        `<button class="x-item" data-acao="rq:delExtra" data-i="${i}" aria-label="${esc(T('remover'))}"${F.extras.length <= 1 ? ' disabled' : ''}>✕</button></li>`).join('') + '</ul>' +
        `<button class="botao leve" data-acao="rq:addExtra"${F.extras.length >= MAX_EXTRAS ? ' disabled' : ''}>+ ${esc(T('add_extra'))}</button><div id="dica-extra"></div>`, T('dica_extras')) +
      '</div></details>';
    h += `<div class="rq-saida"><span class="rq-rot">${esc(T('rq_vai_sair'))}</span><div id="rq-lista-req">${listaRequisitos()}</div></div>`;
    return h;
  }

  function etapa4() {
    const av = avisos();
    return `<div id="rq-avisos-fim">${avisoDescHtml(av)}${avisosNomeHtml(av)}</div><p class="rq-ajuda rq-ajuda-doc">${esc(T('previa_ajuda'))}</p>` +
      `<div class="rq-previa">${DOC.folha(DOC.dePacote(pacote(), ctx, { codigo: F.reenviando }), ctx)}</div>` +
      `<div class="rq-termo"><span class="rq-rot">${esc(T('rq_termo_tit'))}</span><ul>${['t_analise', 't_resultado', 't_duvidas', 't_resp'].map(k =>
        `<li><b>${esc(T(k + '_tit'))}.</b> ${esc(T(k))}</li>`).join('')}</ul>` +
      `<label class="rq-check rq-termo-ok"><input type="checkbox" id="f-termo" data-campo="rq:termo"${F.termo ? ' checked' : ''}> ${esc(T('termo_ok'))}</label></div>`;
  }

  function formulario() {
    let h = '';
    if (F.reenviando) {
      const r = A.porCodigo(F.reenviando);
      h += `<div class="aviso aviso-reenvio"><b>${esc(T('reenvio_tit', { c: F.reenviando, v: (r ? r.versao : 1) + 1 }))}</b>` +
        `${r && r.devolucao ? `<span>${esc(T('reenvio_pedido'))} "${esc(ctx.texto(r.devolucao.nota))}"</span>` : ''}<button class="link" data-acao="rq:cancelarReenvio">${esc(T('reenvio_cancelar'))}</button></div>`;
    }
    h += `<ol class="rq-passos" aria-label="${esc(T('etapas'))}">` + ETAPAS.map((k, i) =>
      `<li><button class="rq-passo" data-acao="rq:etapa" data-etapa="${i + 1}" data-n="${i + 1}"><span class="rq-passo-n">${i + 1}</span><span class="rq-passo-txt">${esc(T(k))}</span></button></li>`).join('') + '</ol>';
    const corpo = [etapa1, etapa2, etapa3, etapa4][F.etapa - 1]();
    h += `<section class="cartao rq-cartao" data-etapa="${F.etapa}"><header class="rq-cab"><span class="eyebrow">${esc(T('etapa_de4', { n: F.etapa }))}</span>` +
      `<h2>${esc(T(ETAPAS[F.etapa - 1]))}</h2><p>${esc(T(ETAPAS[F.etapa - 1] + '_sub'))}</p></header>${corpo}</section>`;
    h += `<div class="rq-nav"><button class="botao" data-acao="rq:voltar"${F.etapa === 1 ? ' disabled' : ''}>← ${esc(T('voltar'))}</button><span class="rq-falta" id="rq-falta"></span>` +
      (F.etapa < 4 ? `<button class="botao primario" id="bt-proximo" data-acao="rq:proximo">${esc(T('continuar'))} →</button>`
        : `<button class="botao primario" id="bt-enviar" data-acao="rq:enviar">${esc(T(F.reenviando ? 'reenviar' : 'enviar'))}</button>`) + '</div>';
    return h;
  }

  function confirmacao() {
    return `<section class="cartao confirmacao" data-testid="confirmacao"><div class="conf-icone" aria-hidden="true">✓</div>` +
      `<h2>${esc(T(enviado.reenvio ? 'conf_reenviada' : 'conf_enviada', { c: enviado.codigo }))}</h2><p>${ctx.chipStatus('analise', 'gestor')}</p>` +
      `<p class="conf-txt">${esc(T('conf_txt'))}</p><div class="conf-acoes"><button class="botao primario" data-acao="rq:verMinhas">${esc(T('ver_minhas'))}</button>` +
      `<button class="botao" data-acao="rq:outra">${esc(T('fazer_outra'))}</button><a class="botao leve" href="index.html?aba=aprovacao">${esc(T('ver_outro_lado'))} →</a></div></section>`;
  }

  function minhas() {
    const lista = A.doSolicitante(eu.id);
    if (!lista.length) return `<div class="cartao"><p class="vazio-txt">${esc(T('minhas_vazio'))}</p></div>`;
    if (!minhaSel || !lista.some(r => r.codigo === minhaSel)) minhaSel = lista[0].codigo;
    const r = A.porCodigo(minhaSel), rec = P.recado(r, ctx);
    const itens = lista.map(x => `<button class="apr-item${x.codigo === minhaSel ? ' ativo' : ''}" data-acao="rq:ver" data-codigo="${x.codigo}" data-req-item="${x.codigo}">` +
      `<span class="apr-item-topo"><span class="mono">${x.codigo}</span>${ctx.chipStatus(x.status, 'gestor', x)}</span><b>${esc(P.titulo(x, ctx))}</b>` +
      `<small>v${x.versao} · ${ctx.data(x.atualizadoEm)}</small></button>`).join('');
    return `<div class="apr-grade"><nav class="apr-lista" data-testid="lista-minhas" aria-label="${esc(T('vista_minhas'))}">${itens}</nav>` +
      `<div class="apr-detalhe"><article class="apr-pedido" data-testid="minha-detalhe" data-codigo="${r.codigo}"><header class="apr-pedido-cab"><span class="eyebrow">${r.codigo} · v${r.versao}</span>` +
      `<h3>${esc(P.titulo(r, ctx))}</h3><div class="apr-chips">${ctx.chipStatus(r.status, 'gestor', r)}</div></header>` +
      `<div class="apr-acoes so-info"><p>${esc(rec.txt)}</p>${rec.nota ? `<blockquote class="dec-nota">${esc(rec.nota)}</blockquote>` : ''}` +
      (r.status === 'alteracao' ? `<div class="decisao-botoes"><button class="botao primario" data-acao="rq:editar" data-codigo="${r.codigo}">${esc(T('bt_editar_reenviar'))}</button></div>` : '') +
      (r.status === 'reprovado' ? `<p class="campo-ajuda">${esc(T('duvidas_rh'))}</p>` : '') +
      (r.status === 'aprovado' ? `<div class="decisao-botoes"><button class="botao" data-doc="${r.decisao.cargoCodigo}">${esc(T('ver_cargo_criado'))}</button></div>` : '') + '</div>' +
      `<section class="apr-bloco"><h4>${esc(T('historico'))}</h4>${P.linhaDoTempo(r, ctx)}</section>` +
      `<section class="apr-bloco"><h4>${esc(T('documento_pedido'))}</h4>${P.documento(r, ctx)}</section></article></div></div>`;
  }

  function desenhar() {
    I.lang = estado.lang;
    document.documentElement.lang = estado.lang === 'en' ? 'en' : 'pt-BR';
    document.documentElement.dataset.theme = estado.tema === 'escuro' ? 'dark' : 'light';
    document.title = `${T('rq_titulo')} · ${window.DADOS.empresa}`;
    const nMinhas = A.doSolicitante(eu.id).length, nAlt = A.pendentes('gestor', eu.id).length;
    // O mesmo menu lateral do painel: em cima, as duas vistas desta página; embaixo, o caminho de volta.
    const menu = `<nav class="abas" aria-label="${esc(T('rq_titulo'))}"><span class="menu-rot">${esc(T('rq_titulo'))}</span>` +
      `<button class="${estado.vista === 'nova' ? 'ativa' : ''}" data-vista="nova">${esc(T(F.reenviando ? 'vista_editando' : 'vista_nova'))}</button>` +
      `<button class="${estado.vista === 'minhas' ? 'ativa' : ''}" data-vista="minhas" data-testid="aba-minhas">${esc(T('vista_minhas'))}` +
      `${nAlt ? `<span class="ponto-alerta" title="${esc(T('n_alteracao', { n: nAlt }))}"></span>` : ''}<span class="aba-n">${nMinhas}</span></button></nav>` +
      `<nav class="abas abas-links" aria-label="${esc(T('menu_painel'))}"><span class="menu-rot">${esc(T('menu_painel'))}</span>` +
      ['geral', 'organograma', 'cargos', 'aprovacao'].map(k => `<a href="index.html?aba=${k}">${esc(T('aba_' + k))}</a>`).join('') + '</nav>';
    raiz.innerHTML = `<div class="casca">${ctx.lateral(menu, { marcaLink: 'index.html' })}<div class="conteudo">` +
      `<div class="tela-cab"><div><h2 class="tela-titulo">${esc(T('rq_titulo'))}</h2><p class="tela-sub rq-persona">${esc(T('rq_voce', { n: eu.nome, c: ctx.nomeCargo(eu.cargo) }))}</p></div></div>` +
      `<main class="rq-pagina${estado.vista === 'minhas' ? ' rq-larga' : ''}">${estado.vista === 'minhas' ? minhas() : enviado ? confirmacao() : formulario()}</main>` +
      `<footer class="rodape"><span>${esc(T('rodape'))}</span></footer></div></div>`;
    atualizar();
    if (focoDepois) {
      const el = document.querySelector(focoDepois);
      if (el) { el.focus(); if (el.setSelectionRange && typeof el.value === 'string') el.setSelectionRange(el.value.length, el.value.length); }
      focoDepois = null;
    }
    window.CONTEXTO.guardarPref({ lang: estado.lang, tema: estado.tema });
    window.__form = { estado, F, enviado };     // para os testes lerem
  }

  // Só as partes que dependem do texto (o cursor nunca pula enquanto se digita).
  function atualizar() {
    if (estado.vista !== 'nova' || enviado) return;
    const $ = s => document.querySelector(s);
    document.querySelectorAll('.rq-passo').forEach(b => {
      const n = Number(b.dataset.n), livre = liberada(n);
      b.classList.toggle('atual', n === F.etapa);
      b.classList.toggle('feita', n < F.etapa && etapaOk(n));
      b.classList.toggle('travada', !livre);
      b.setAttribute('aria-current', n === F.etapa ? 'step' : 'false');
    });
    const falta = faltas(F.etapa);
    if ($('#rq-falta')) $('#rq-falta').textContent = falta.length ? T('falta', { f: falta.map(k => T(k)).join(', ') }) : (F.etapa === 4 ? T('pronto') : '');
    if ($('#bt-proximo')) $('#bt-proximo').disabled = !!falta.length;
    if ($('#bt-enviar')) $('#bt-enviar').disabled = !pronto();
    if ($('#cont-missao')) $('#cont-missao').textContent = T('n_caracteres', { n: F.missao.trim().length, min: 20 });
    if ($('#cont-resp')) $('#cont-resp').textContent = T('n_resp', { n: cheios(F.resp).length, max: MAX_RESP });
    if ($('#cont-desc')) $('#cont-desc').textContent = T('n_caracteres_max', { n: F.descricao.trim().length, min: 80, max: 1200 });
    if ($('#rq-desc-txt')) $('#rq-desc-txt').textContent = descricao();
    const av = avisos();
    if ($('#rq-avisos-nome')) $('#rq-avisos-nome').innerHTML = avisosNomeHtml(av);
    if ($('#rq-aviso-desc')) $('#rq-aviso-desc').innerHTML = avisoDescHtml(av);
    if ($('#rq-lista-req')) $('#rq-lista-req').innerHTML = listaRequisitos();
    if ($('#dica-extra')) $('#dica-extra').innerHTML = cheios(F.extras).some(x => /^(o cargo|a vaga|a função|o colaborador|the role|the job|the position)\b/i.test(x.trim()))
      ? `<div class="aviso">${esc(T('av_requisito'))}</div>` : '';
  }

  // O nome em inglês acompanha o português enquanto a pessoa não escrever o dela.
  function traduzirNome() {
    if (F.enFonte === 'manual') return;
    const r = TR.traduzir(F.nomePt);
    if (r.ok) { F.nomeEn = r.en; F.enFonte = r.fonte; F.enFalta = null; }
    else { F.nomeEn = ''; F.enFonte = null; F.enFalta = r.vazio ? null : r.falta; }
    const caixa = document.getElementById('rq-en');
    if (caixa && !F.editaEn) caixa.innerHTML = linhaIngles();
  }

  // ---------------------------------------------------------------- os eventos
  function aoMudar(nome, el, tipo) {
    const [chave, i, j] = nome.split(':');
    const texto = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox');
    if (texto !== (tipo === 'input')) return;
    if (chave === 'nomePt') { F.nomePt = el.value; traduzirNome(); }
    else if (chave === 'nomeEn') { F.nomeEn = el.value; F.enFonte = el.value.trim() ? 'manual' : null; F.enFalta = el.value.trim() ? null : F.enFalta; }
    else if (chave === 'resp' || chave === 'extras') { F[chave][Number(i)] = el.value; F.idiomaConteudo = F.idiomaConteudo || estado.lang; }
    else if (chave === 'termo') F.termo = el.checked;
    else if (chave === 'turnos') F.turnos = el.checked;
    else if (chave === 'missao' || chave === 'descricao' || chave === 'formacao') { F[chave] = el.value; if (chave !== 'formacao') F.idiomaConteudo = F.idiomaConteudo || estado.lang; }
    else {
      // Listas de escolha: mudam a estrutura da etapa, então redesenha.
      F[chave] = ['exp', 'viagens'].includes(chave) ? Number(el.value) : el.value;
      if (chave === 'area' || chave === 'nivel') {
        if (F.reportaA && !opcoesChefe().some(cg => cg.codigo === F.reportaA)) F.reportaA = '';
        sugerirChefe();
        const piso = (C.NIVEIS_INFO[F.nivel] || {}).escMin;
        if (F.esc && piso && C.ESCOLARIDADE[F.esc].ordem < C.ESCOLARIDADE[piso].ordem) F.esc = piso;
      }
      if (chave === 'esc' && !['tecnico', 'superior', 'pos'].includes(F.esc)) F.formacao = '';
      if (chave === 'idioma') F.maisAberto = true;
      focoDepois = '#' + el.id;
      return desenhar();
    }
    atualizar();
  }

  function acao(nome, el) {
    const redesenha = foco => { focoDepois = foco || null; desenhar(); };
    switch (nome) {
      case 'etapa': {
        const n = Number(el.dataset.etapa);
        if (!liberada(n)) { ctx.toast(T('etapa_bloqueada', { n: [1, 2, 3].find(k => k < n && !etapaOk(k)) })); return; }
        F.etapa = n; if (n === 3) aplicarPadroes(); redesenha(); scrollTo({ top: 0 }); return;
      }
      case 'voltar': if (F.etapa > 1) { F.etapa -= 1; redesenha(); scrollTo({ top: 0 }); } return;
      case 'proximo':
        if (etapaOk(F.etapa) && F.etapa < 4) { F.etapa += 1; if (F.etapa === 3) aplicarPadroes(); redesenha(); scrollTo({ top: 0 }); }
        return;
      case 'verModelo': F.verModelo = true; return redesenha('#f-modelo');
      case 'usarModelo': {
        const r = A.porCodigo(F.modelo);
        if (!r || r.solicitante.id !== eu.id) return;          // modelo só da própria pessoa
        F = NOVO(); carregarPacote(r.pacote);
        ctx.toast(T('modelo_carregado', { c: r.codigo }));
        return redesenha('#f-nomePt');
      }
      case 'editaEn': F.editaEn = true; return redesenha('#f-nomeEn');
      case 'preencher': {
        const novo = RED.preencherConteudo({ nomePt: F.nomePt, nomeEn: F.nomeEn, area: F.area, nivel: F.nivel, reportaA: F.reportaA, missao: F.missao, resp: F.resp, descricao: 'x' }, estado.lang);
        const feito = [];
        if (novo.missao) { F.missao = novo.missao; feito.push(T('f_missao').toLowerCase()); }
        if (novo.resp) { F.resp = novo.resp; feito.push(T('n_resp_curto', { n: novo.resp.length })); }
        F.idiomaConteudo = F.idiomaConteudo || estado.lang;
        ctx.toast(feito.length ? T('preenchi', { o: feito.join(', ') }) : T('nada_vazio'));
        return redesenha();
      }
      case 'addResp': if (F.resp.length < MAX_RESP) { F.resp.push(''); return redesenha('#f-resp-' + (F.resp.length - 1)); } return;
      case 'delResp': F.resp.splice(Number(el.dataset.i), 1); if (!F.resp.length) F.resp.push(''); return redesenha();
      case 'addExtra': if (F.extras.length < MAX_EXTRAS) { F.extras.push(''); F.maisAberto = true; return redesenha('#f-extra-' + (F.extras.length - 1)); } return;
      case 'delExtra': F.extras.splice(Number(el.dataset.i), 1); if (!F.extras.length) F.extras.push(''); return redesenha();
      case 'descManual': F.descricao = descricao(); F.descManual = true; return redesenha('#f-descricao');
      case 'descAuto': F.descManual = false; return redesenha();
      case 'comp': {
        const k = el.dataset.valor, i = F.comp.indexOf(k);
        if (i >= 0) F.comp.splice(i, 1); else if (F.comp.length < 5) F.comp.push(k);
        return redesenha();
      }
      case 'cancelarReenvio': F = NOVO(); return redesenha();
      case 'enviar': {
        if (!pronto()) { atualizar(); return; }
        const p = pacote();
        const r = F.reenviando ? A.reenviar(F.reenviando, p, eu) : A.criar(p, eu);
        if (!r.ok) { ctx.toast(T(r.erro)); return; }
        enviado = { codigo: r.codigo, reenvio: !!F.reenviando };
        F = NOVO();
        return redesenha();
      }
      case 'outra': enviado = null; F = NOVO(); estado.vista = 'nova'; return redesenha('#f-nomePt');
      case 'verMinhas': minhaSel = enviado ? enviado.codigo : minhaSel; enviado = null; F = NOVO(); estado.vista = 'minhas'; return redesenha();
      case 'ver': minhaSel = el.dataset.codigo; return redesenha();
      case 'editar': return editar(el.dataset.codigo);
    }
  }

  // O gestor abre o pedido devolvido no formulário (versão nova do MESMO pedido).
  function editar(codigo) {
    const r = A.porCodigo(codigo);
    if (!r || r.status !== 'alteracao' || r.solicitante.id !== eu.id) { ctx.toast(T('rq_nao_editavel')); return; }
    F = NOVO(); carregarPacote(r.pacote); F.reenviando = codigo; F.etapa = 1;
    enviado = null; estado.vista = 'nova'; focoDepois = '#f-nomePt';
    desenhar();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-acao],[data-doc],[data-doc-fechar],[data-doc-imprimir],[data-doc-copiar],[data-lang],[data-tema],[data-vista]');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-doc-fechar')) return DOC.fechar();
    if (b.hasAttribute('data-doc-imprimir')) return print();
    if (b.hasAttribute('data-doc-copiar')) { ctx.toast(location.href.split('?')[0].replace('requisicao.html', 'index.html') + '?cargo=' + DOC.aberto); return; }
    if (b.dataset.doc) return DOC.abrir(b.dataset.doc, ctx);
    if (b.dataset.lang) { estado.lang = b.dataset.lang; return desenhar(); }
    if (b.hasAttribute('data-tema')) { estado.tema = estado.tema === 'escuro' ? 'claro' : 'escuro'; return desenhar(); }
    if (b.dataset.vista) { estado.vista = b.dataset.vista; if (estado.vista === 'nova') enviado = null; return desenhar(); }
    const [m, nome] = b.dataset.acao.split(':');
    if (m === 'rq') acao(nome, b);
  });
  const mudou = e => { const el = e.target.closest && e.target.closest('[data-campo^="rq:"]'); if (el) aoMudar(el.dataset.campo.slice(3), el, e.type); };
  document.addEventListener('input', mudou);
  document.addEventListener('change', mudou);
  // "Mais requisitos" lembra se estava aberto (redesenhar não o fecha).
  document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('.rq-mais')) F.maisAberto = e.target.open; }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') DOC.fechar(); });
  // O painel mudou um pedido em outra aba do navegador: a lista daqui acompanha.
  A.aoMudar(() => { if (estado.vista === 'minhas' || enviado) desenhar(); });

  desenhar();
  if (q.get('editar')) editar(q.get('editar'));
})();
