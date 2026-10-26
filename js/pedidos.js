/* =============================================================================
   pedidos.js: as peças de um PEDIDO de cargo que as duas páginas mostram igual.

   - titulo: o nome do cargo pedido no idioma da tela;
   - gradeDe: a grade que vale agora (a da aprovação ou a da pré-aprovação);
   - documento: a folha do cargo pedido, igual à do catálogo;
   - linhaDoTempo: o histórico, do mais novo para o mais antigo;
   - recado: em uma frase, o que aconteceu e o que vem agora (para quem pediu).
   ============================================================================= */
window.PEDIDOS = (function () {
  'use strict';
  const C = window.CATALOGO, DOC = window.DOCUMENTO, esc = window.CONTEXTO.esc;

  const titulo = (r, ctx) => (ctx.lang === 'en' ? r.pacote.nomeEn : r.pacote.nomePt) || r.pacote.nomePt;
  const outroTitulo = (r, ctx) => (ctx.lang === 'en' ? r.pacote.nomePt : r.pacote.nomeEn) || '';
  const gradeDe = r => r.decisao ? r.decisao.grade : r.preAprovado ? r.preAprovado.grade : null;

  function documento(r, ctx) {
    return DOC.folha(DOC.dePacote(r.pacote, ctx, { codigo: r.codigo, grade: gradeDe(r), cbo: r.decisao ? r.decisao.cbo : null }), ctx);
  }

  // A linha do tempo: um ponto por passo, com quando, quem (e em que papel) e a nota.
  function linhaDoTempo(r, ctx) {
    const T = ctx.T;
    return '<ol class="hist" data-testid="linha-do-tempo">' + r.historico.slice().reverse().map(e =>
      `<li class="hist-${e.acao}"><span class="hist-ponto" aria-hidden="true"></span><div><b>${esc(T('h_' + e.acao, { v: e.versao, g: e.grade }))}</b>` +
      `<small>${ctx.dataHora(e.em)} · ${esc(T('papel_' + e.papel))} · ${esc(e.quem)}</small>` +
      `${e.nota ? `<span class="hist-nota">"${esc(ctx.texto(e.nota))}"</span>` : ''}</div></li>`).join('') + '</ol>';
  }

  // Para quem pediu: o que aconteceu, numa frase, e o que fazer agora.
  function recado(r, ctx) {
    const T = ctx.T;
    if (r.status === 'analise') return { txt: T('rec_analise'), nota: '' };
    if (r.status === 'alteracao') return { txt: T('rec_alteracao', { n: r.devolucao ? r.devolucao.por : '' }), nota: r.devolucao ? ctx.texto(r.devolucao.nota) : '' };
    if (r.status === 'aprovado') return { txt: T('rec_aprovado', { g: r.decisao.grade, c: r.decisao.cargoCodigo, d: ctx.data(r.decisao.em) }), nota: '' };
    return { txt: T('rec_reprovado', { n: r.reprovacao.por }), nota: ctx.texto(r.reprovacao.nota) };
  }

  // Cargos do catálogo parecidos com o pedido (o RH confere antes de criar outro).
  function parecidos(r, ctx, limite) {
    const p = r.pacote;
    const pseudo = { codigo: r.codigo, area: p.area, nivel: p.nivel, nome: [p.nomePt, p.nomeEn], grade: gradeDe(r) || C.sugerirGrade(p.area, p.nivel).grade };
    return DOC.listaParecidos(DOC.parecidos(pseudo, limite || 4), ctx);
  }

  return { titulo, outroTitulo, gradeDe, documento, linhaDoTempo, recado, parecidos };
})();
