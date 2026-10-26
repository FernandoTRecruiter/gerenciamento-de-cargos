/* =============================================================================
   metricas.js: TODA conta da visão geral mora aqui, longe do desenho da tela.

   Por que separado: a tela só mostra. O "i" de cada número lê o MESMO objeto
   que o cartão, então não existe conta paralela (o teste automático confere
   o cartão contra uma conta feita do zero a partir do catálogo).
   ============================================================================= */
window.METRICAS = (function () {
  'use strict';
  const C = window.CATALOGO, O = window.OCUPACAO, A = window.ARMAZEM;
  const soma = l => l.reduce((s, v) => s + v, 0);
  const media = l => (l.length ? soma(l) / l.length : null);
  function mediana(l) {
    if (!l.length) return null;
    const o = l.slice().sort((a, b) => a - b), m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  }

  function calcular() {
    // Passo 1: o catálogo de hoje = base + cargos criados por requisição aprovada.
    const cargos = C.todos();
    const resumo = {};
    cargos.forEach(cg => { resumo[cg.codigo] = O.resumo(cg.codigo); });
    const criados = cargos.filter(cg => cg.origem === 'requisicao');

    // Passo 2: ocupantes e salário (fictício).
    const ocup = O.ocupantes;
    const salarios = ocup.map(o => o.salario);
    const ocupados = cargos.filter(cg => resumo[cg.codigo].n > 0);
    const abaixo = ocup.filter(o => o.faixaPos === 'abaixo'), acima = ocup.filter(o => o.faixaPos === 'acima');
    const porPosicao = { abaixo: 0, q1: 0, q2: 0, q3: 0, q4: 0, acima: 0 };
    ocup.forEach(o => { porPosicao[o.faixaPos] += 1; });

    // Passo 3: cargos sem ninguém (e quantos deles já têm vaga aberta).
    const semOcupante = cargos.filter(cg => resumo[cg.codigo].n === 0);
    const semComVaga = semOcupante.filter(cg => resumo[cg.codigo].nVagas > 0);

    // Passo 4: distribuição por família (área) e por nível.
    const familias = C.AREAS_ORDEM.concat(['dir']);
    const porArea = {}, porNivel = {};
    familias.forEach(a => { porArea[a] = { cargos: 0, ocupantes: 0 }; });
    C.NIVEIS_DESC.forEach(n => { porNivel[n] = { cargos: 0, ocupantes: 0 }; });
    cargos.forEach(cg => {
      porArea[cg.area].cargos += 1; porArea[cg.area].ocupantes += resumo[cg.codigo].n;
      porNivel[cg.nivel].cargos += 1; porNivel[cg.nivel].ocupantes += resumo[cg.codigo].n;
    });

    // Passo 5: faixas por grade (só as grades que têm cargo no catálogo).
    const grades = [...new Set(cargos.map(cg => cg.grade))].sort((a, b) => a - b).map(g => {
      const doGrade = ocup.filter(o => o.grade === g);
      return {
        grade: g, faixa: C.faixa(g), cargos: cargos.filter(cg => cg.grade === g), ocupantes: doGrade,
        media: media(doGrade.map(o => o.salario)), crMedio: media(doGrade.map(o => o.cr)),
        fora: doGrade.filter(o => o.faixaPos === 'abaixo' || o.faixaPos === 'acima').length
      };
    });

    // Passo 6: pedidos de cargo novo por situação.
    const reqs = A.todas();
    const porStatus = { analise: 0, alteracao: 0, aprovado: 0, reprovado: 0 };
    reqs.forEach(r => { porStatus[r.status] += 1; });
    const reqAbertas = reqs.filter(r => r.status === 'analise' || r.status === 'alteracao');

    return {
      cargos, resumo, base: C.CARGOS.length, criados,
      ocupantes: ocup, nOcup: ocup.length, ativos: O.ativos, ocupados, mediaPorCargo: ocupados.length ? ocup.length / ocupados.length : 0,
      somaSal: soma(salarios), mediaSal: media(salarios), medianaSal: mediana(salarios),
      crMedio: media(ocup.map(o => o.cr)), abaixo, acima, dentro: ocup.length - abaixo.length - acima.length, porPosicao,
      semOcupante, semComVaga, vagas: O.vagas,
      porArea, porNivel, grades,
      reqs, porStatus, reqAbertas, preAprovadas: reqs.filter(r => r.status === 'analise' && r.preAprovado)
    };
  }
  return { calcular, media, mediana };
})();
