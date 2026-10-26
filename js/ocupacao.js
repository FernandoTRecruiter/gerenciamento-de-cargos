/* =============================================================================
   ocupacao.js: quem ocupa cada cargo, quanto ganha (fictício) e as vagas abertas.

   A pergunta que este arquivo responde: "na data de referência, quantas pessoas
   estão em cada cargo do catálogo e onde o salário delas cai dentro da faixa?"

   Passo a passo:
   1. pega quem está ativo no dados.js na data de referência;
   2. dentro de cada grupo (área + nível), reparte as pessoas entre os cargos do
      grupo pelo "peso" de cada cargo (quem tem mais tempo de casa vai para o
      cargo de grade maior, como na vida real);
   3. sorteia um salário dentro (quase sempre) da faixa da grade, subindo com o
      tempo de casa; alguns poucos ficam fora da faixa de propósito, porque isso
      acontece nas empresas e é o que a "dispersão" precisa mostrar;
   4. liga cada vaga aberta do dados.js a um cargo do mesmo grupo;
   5. escolhe as pessoas fictícias que fazem os papéis da demonstração.

   Com dado de verdade, este arquivo some: basta entregar a mesma lista de
   ocupantes (formato no README) e a tela não muda.
   ============================================================================= */
window.OCUPACAO = (function () {
  'use strict';
  const D = window.DADOS, C = window.CATALOGO;
  const REF = D.dataRef;
  const DIA = 864e5;

  // Sorteio com semente própria (não mexe na sequência do dados.js).
  function semente(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = semente(20261022);
  const arred10 = v => Math.round(v / 10) * 10;

  // Passo 1: ativos na data de referência.
  const ativos = D.pessoas.filter(p => p.admissao <= REF && (!p.desligamento || p.desligamento > REF));

  // Passo 2: repartir cada grupo pelos pesos (método do maior resto: a soma bate sempre).
  const grupos = {};
  ativos.forEach(p => { (grupos[p.area + '|' + p.nivel] = grupos[p.area + '|' + p.nivel] || []).push(p); });
  const ordemNivel = n => D.niveis[n].ordem;
  function cargosDoGrupo(area, nivel) {
    const doGrupo = C.CARGOS.filter(x => x.area === area && x.nivel === nivel);
    const comPeso = doGrupo.filter(x => x.peso > 0);
    if (comPeso.length) return comPeso;
    if (doGrupo.length) return doGrupo;
    // Grupo sem cargo no catálogo: o cargo da mesma área com o nível mais próximo.
    const daArea = C.CARGOS.filter(x => x.area === area);
    daArea.sort((a, b) => Math.abs(ordemNivel(a.nivel) - ordemNivel(nivel)) - Math.abs(ordemNivel(b.nivel) - ordemNivel(nivel)));
    return daArea.length ? [daArea[0]] : [];
  }
  const cargoDe = {};   // id da pessoa -> código do cargo
  Object.keys(grupos).forEach(chave => {
    const [area, nivel] = chave.split('|');
    const pessoas = grupos[chave].slice().sort((a, b) => a.admissao - b.admissao || (a.id < b.id ? -1 : 1));
    const cargos = cargosDoGrupo(area, nivel).slice().sort((a, b) => b.grade - a.grade || (a.codigo < b.codigo ? -1 : 1));
    if (!cargos.length) return;
    const pesoTot = cargos.reduce((s, x) => s + (x.peso || 1), 0);
    const cotas = cargos.map(x => {
      const exato = pessoas.length * (x.peso || 1) / pesoTot;
      return { x, n: Math.floor(exato), resto: exato - Math.floor(exato) };
    });
    let falta = pessoas.length - cotas.reduce((s, q) => s + q.n, 0);
    cotas.slice().sort((a, b) => b.resto - a.resto).forEach(q => { if (falta > 0) { q.n += 1; falta -= 1; } });
    let i = 0;
    cotas.forEach(q => { for (let k = 0; k < q.n; k++) cargoDe[pessoas[i++].id] = q.x.codigo; });
  });

  // Passo 3: salário fictício. Compa-ratio (salário ÷ ponto médio) sobe com o tempo
  // de casa; ~3% abaixo do mínimo e ~3% acima do máximo, de propósito.
  const ocupantes = ativos.filter(p => cargoDe[p.id]).map(p => {
    const cg = C.CARGOS.find(x => x.codigo === cargoDe[p.id]);
    const f = C.GRADES[cg.grade];
    const casa = (REF - p.admissao) / (365.25 * DIA);
    let cr;
    if (cg.grade <= 2) cr = 0.95 + R() * 0.1;              // bolsa de aprendiz e estágio: quase fixa
    else {
      const sorte = R();
      if (sorte < 0.03) cr = 0.72 + R() * 0.06;             // abaixo do mínimo (80%)
      else if (sorte > 0.97) cr = 1.22 + R() * 0.07;        // acima do máximo (120%)
      else cr = Math.min(1.18, Math.max(0.81, 0.86 + 0.032 * Math.min(casa, 9) + (R() - 0.5) * 0.1));
    }
    const salario = arred10(f.med * cr);
    return {
      id: p.id, nome: p.nome, cargo: cg.codigo, area: cg.area, nivel: cg.nivel, grade: cg.grade,
      unidade: p.unidade, admissao: p.admissao, casa, salario,
      cr: salario / f.med,
      pos: (salario - f.min) / (f.max - f.min)   // posição na faixa: 0 = mínimo, 1 = máximo
    };
  });
  // Faixa da posição: fora (abaixo/acima) ou o quartil dentro da faixa.
  ocupantes.forEach(o => {
    o.faixaPos = o.pos < 0 ? 'abaixo' : o.pos > 1 ? 'acima' : o.pos < 0.25 ? 'q1' : o.pos < 0.5 ? 'q2' : o.pos < 0.75 ? 'q3' : 'q4';
  });

  // Passo 4: cada vaga aberta vai para um cargo do mesmo grupo. Primeiro o cargo
  // novo ainda sem ninguém (foi criado para ser preenchido); depois o que tem
  // menos vagas em relação ao seu peso.
  const vagas = [];
  const vagasPorCargo = {};
  D.vagas.filter(v => v.status === 'aberta').forEach(v => {
    const doGrupo = C.CARGOS.filter(x => x.area === v.area && x.nivel === v.nivel);
    const lista = doGrupo.length ? doGrupo : cargosDoGrupo(v.area, v.nivel);
    if (!lista.length) return;
    const novoSemVaga = lista.find(x => x.peso === 0 && !vagasPorCargo[x.codigo]);
    const alvo = novoSemVaga || lista.slice().sort((a, b) =>
      ((vagasPorCargo[a.codigo] || 0) / (a.peso || 1)) - ((vagasPorCargo[b.codigo] || 0) / (b.peso || 1)) || b.peso - a.peso)[0];
    vagasPorCargo[alvo.codigo] = (vagasPorCargo[alvo.codigo] || 0) + 1;
    vagas.push({ id: v.id, cargo: alvo.codigo, area: v.area, nivel: v.nivel, unidade: v.unidade,
      abertura: v.abertura, dias: Math.round((REF - v.abertura) / DIA), etapa: v.etapa, inscritos: v.inscritos });
  });

  // Passo 5: resumo por cargo (o que tabela, organograma e documento mostram).
  const porCargo = {};
  ocupantes.forEach(o => {
    const r = porCargo[o.cargo] = porCargo[o.cargo] || { ocupantes: [], vagas: [] };
    r.ocupantes.push(o);
  });
  vagas.forEach(v => { (porCargo[v.cargo] = porCargo[v.cargo] || { ocupantes: [], vagas: [] }).vagas.push(v); });
  function resumo(codigo) {
    const r = porCargo[codigo] || { ocupantes: [], vagas: [] };
    const n = r.ocupantes.length;
    const soma = r.ocupantes.reduce((s, o) => s + o.salario, 0);
    return {
      n, ocupantes: r.ocupantes, vagas: r.vagas, nVagas: r.vagas.length,
      media: n ? soma / n : null,
      crMedio: n ? r.ocupantes.reduce((s, o) => s + o.cr, 0) / n : null
    };
  }

  // Passo 6: as pessoas (fictícias) que fazem os papéis da demonstração.
  // Gestor = quem ocupa Gerente de Operações; Analista de RH = Analista de
  // Remuneração; Master = Gerente de Pessoas e Cultura.
  function quemOcupa(codigo) {
    const lista = (porCargo[codigo] || { ocupantes: [] }).ocupantes.slice().sort((a, b) => a.admissao - b.admissao);
    const o = lista[0];
    return o ? { id: o.id, nome: o.nome, cargo: codigo } : { id: 'X-' + codigo, nome: 'Pessoa de exemplo', cargo: codigo };
  }
  const personas = {
    gestor: quemOcupa('CG-101'),
    analista: quemOcupa('CG-706'),
    master: quemOcupa('CG-701')
  };

  return {
    dataRef: REF, ativos: ativos.length, ocupantes, vagas, resumo, quemOcupa, personas,
    semCargo: ativos.filter(p => !cargoDe[p.id]).length
  };
})();
