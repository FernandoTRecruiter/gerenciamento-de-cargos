/* =============================================================================
   contexto.js: o que as DUAS páginas usam igual (o app e o formulário).

   Por que separado: o painel (index.html) e a página do formulário
   (requisicao.html) mostram datas, dinheiro, situação de pedido e avisos do
   mesmo jeito. Escrito uma vez aqui, os dois não divergem.
   - criar(estado): as funções de formato no idioma da tela (o "contexto");
   - montarUi(): o balão de dica (data-tip), o aviso rápido e o CSV;
   - lerPref / guardarPref: idioma e tema guardados no navegador, valendo nas
     duas páginas (a mesma chave).
   ============================================================================= */
window.CONTEXTO = (function () {
  'use strict';
  const PREF = 'paoli-cargos-pref';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Ícone desenhado aqui mesmo: um caminho de carreira (quatro cargos ligados, subindo).
  const ICONE = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 29L18 20L24 24L32 12" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>' +
    '<circle cx="9" cy="29" r="3.2" fill="currentColor"/><circle cx="18" cy="20" r="3.2" fill="currentColor"/><circle cx="24" cy="24" r="3.2" fill="currentColor"/>' +
    '<circle cx="32" cy="12" r="4.2" fill="currentColor"/></svg>';

  // Movimento: some com ?foto=1 (fotos da documentação) e para quem pediu menos movimento ao sistema.
  if (new URLSearchParams(location.search).get('foto') === '1') document.documentElement.classList.add('sem-animacao');
  const semAnimacao = () => document.documentElement.classList.contains('sem-animacao') ||
    !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Preferências: lidas e gravadas sem quebrar quando o navegador recusa (janela privada).
  function lerPref() { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch (e) { return {}; } }
  function guardarPref(parte) {
    try { localStorage.setItem(PREF, JSON.stringify(Object.assign(lerPref(), parte))); } catch (e) { /* sem armazenamento: tudo bem */ }
  }

  function criar(estado) {
    const I = window.I18N, T = I.T, D = window.DADOS, C = window.CATALOGO;
    const loc = () => I.locale();
    const paraData = v => (v instanceof Date ? v : new Date(String(v).length <= 10 ? v + 'T12:00:00' : v));
    return {
      T, I, C, D, O: window.OCUPACAO, A: window.ARMAZEM, estado, ICONE, esc,
      get lang() { return estado.lang; },
      num: (v, dec) => v == null ? '-' : Number(v).toLocaleString(loc(), { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }),
      pct: (v, dec) => v == null ? '-' : (v * 100).toLocaleString(loc(), { minimumFractionDigits: dec == null ? 1 : dec, maximumFractionDigits: dec == null ? 1 : dec }) + '%',
      brl: v => v == null ? '-' : Number(v).toLocaleString(loc(), { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
      brlCurto: v => 'R$ ' + (v >= 1000 ? (v / 1000).toLocaleString(loc(), { maximumFractionDigits: 1 }) + (estado.lang === 'en' ? 'K' : ' mil') : v),
      data: v => v ? paraData(v).toLocaleDateString(loc(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
      dataHora: v => v ? paraData(v).toLocaleString(loc(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
      nomeArea: a => I.nome(D.areas[a]),
      nomeNivel: n => I.nome(D.niveis[n]),
      nomeCargo: cod => { const cg = C.porCodigo(cod); return cg ? C.L(cg.nome, estado.lang) : cod; },
      // Situação do pedido: o gestor vê "Em análise" mesmo depois da pré-aprovação;
      // o RH vê a etapa. Cor sempre com ícone e texto (nunca cor sozinha).
      chipStatus(st, papel, r) {
        const ICO = { analise: '◷', alteracao: '↺', aprovado: '✓', reprovado: '✕', pre: '◑' };
        const CLS = { analise: 'neutro', alteracao: 'warn', aprovado: 'ok', reprovado: 'bad', pre: 'acc' };
        if (st === 'pre') return `<span class="chip acc">${ICO.pre} ${esc(T('st_pre_curto'))}</span>`;
        let h = `<span class="chip ${CLS[st]}" data-status="${st}">${ICO[st]} ${esc(T('st_' + st))}</span>`;
        if (st === 'analise' && r && r.preAprovado && papel && papel !== 'gestor') h += ` <span class="chip acc" data-status="pre">${ICO.pre} ${esc(T('st_pre', { g: r.preAprovado.grade }))}</span>`;
        return h;
      },
      textoStatus: (st, papel, r) => T('st_' + st) + (st === 'analise' && r && r.preAprovado && papel !== 'gestor' ? ' (' + T('st_pre', { g: r.preAprovado.grade }) + ')' : ''),
      // Texto que pode vir nos dois idiomas ([português, inglês]) ou num só (o que a pessoa escreveu).
      texto: v => Array.isArray(v) ? (estado.lang === 'en' ? v[1] || v[0] : v[0]) : (v || ''),
      // Trecho no OUTRO idioma (o nome do cargo na outra língua) vai marcado com lang=:
      // o leitor de tela pronuncia certo e o teste de idioma sabe que é de propósito.
      get langOutra() { return estado.lang === 'en' ? 'pt-BR' : 'en'; },
      lateral: (menu, opc) => lateral(estado, menu, opc),
      semAnimacao, toast, baixarCsv
    };
  }

  // O menu lateral das duas páginas: a marca, o botão (se houver), o menu que cada
  // página manda e, embaixo, a data da foto, o idioma e o tema.
  function lateral(estado, menu, opc) {
    opc = opc || {};
    const T = window.I18N.T, e = estado;
    const marca = `<span class="icone">${ICONE}</span><div class="marca-txt">` +
      `<h1>${esc(T('titulo'))}</h1><div class="empresa">${esc(window.DADOS.empresa)} · ${esc(T('ficticio_curto'))}</div></div>`;
    return `<aside class="lateral">` +
      (opc.marcaLink ? `<a class="marca" href="${opc.marcaLink}" data-testid="voltar-painel" title="${esc(T('rq_voltar_painel'))}">${marca}</a>` : `<div class="marca">${marca}</div>`) +
      (opc.botao || '') + menu +
      `<div class="lateral-pe">${opc.selo || ''}<div class="lateral-linha"><div class="seg-botoes" role="group" aria-label="${esc(T('idioma'))}">` +
      `<button data-lang="pt" class="${e.lang === 'pt' ? 'ativo' : ''}">PT</button><button data-lang="en" class="${e.lang === 'en' ? 'ativo' : ''}">EN</button></div>` +
      `<button class="botao leve" data-tema>${e.tema === 'escuro' ? '☀ ' + esc(T('tema_claro')) : '☾ ' + esc(T('tema_escuro'))}</button></div></div></aside>`;
  }

  // ---------------------------------------------------------------- UI comum
  let dica = null, elToast = null, relogio = null;
  function montarUi() {
    if (dica) return;
    // Balão de dica: qualquer elemento com data-tip mostra o texto ao passar o mouse.
    dica = document.createElement('div'); dica.className = 'dica'; document.body.appendChild(dica);
    document.addEventListener('mousemove', e => {
      const alvo = e.target.closest && e.target.closest('[data-tip]');
      if (!alvo) { dica.classList.remove('visivel'); return; }
      dica.textContent = alvo.dataset.tip;
      dica.classList.add('visivel');
      const x = Math.max(8, Math.min(e.clientX + 14, innerWidth - dica.offsetWidth - 8));
      const y = e.clientY + 18 + dica.offsetHeight > innerHeight ? e.clientY - dica.offsetHeight - 12 : e.clientY + 18;
      dica.style.transform = `translate(${x}px, ${y}px)`;
    });
    // Aviso rápido no pé da tela (some sozinho).
    elToast = document.createElement('div'); elToast.className = 'toast'; elToast.hidden = true; elToast.setAttribute('role', 'status');
    document.body.appendChild(elToast);
  }
  function toast(msg, acao) {
    if (!elToast) montarUi();
    elToast.innerHTML = `<span>${esc(msg)}</span>${acao ? `<button class="link" data-doc="${esc(acao.doc)}">${esc(acao.rotulo)}</button>` : ''}`;
    elToast.hidden = false;
    clearTimeout(relogio);
    relogio = setTimeout(() => { elToast.hidden = true; }, 6000);
  }
  // CSV com ponto e vírgula e BOM: abre certinho no Excel em português.
  function baixarCsv(nome, cab, linhas) {
    const csv = '﻿' + [cab].concat(linhas).map(l => l.map(v => {
      v = String(v == null ? '' : v);
      return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }).join(';')).join('\r\n');
    window.__ultimoCsv = { nome, linhas: linhas.length, texto: csv };   // os testes leem daqui
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'cargos-' + nome + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { toast(window.I18N.T('csv_falhou')); }
  }

  return { criar, montarUi, lerPref, guardarPref, esc, ICONE, semAnimacao };
})();
