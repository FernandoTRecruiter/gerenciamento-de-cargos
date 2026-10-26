/* =============================================================================
   armazem.js: as requisições de cargo novo e as REGRAS do fluxo de aprovação.

   Onde ficam: no próprio navegador (localStorage). Sem servidor: a demo é
   uma simulação e ninguém mais vê o que você faz aqui. Se o navegador não
   deixar guardar (janela privada, bloqueio), tudo funciona na memória e some
   ao recarregar; a tela avisa.

   O fluxo, com os papéis:
     Gestor pede ............................ Em análise
     Analista de RH pré-aprova com a grade .. Em análise (pré-aprovado)
     Master aprova .......................... Aprovado: o cargo entra no catálogo
     Analista ou Master devolvem ............ Em alteração: o gestor edita e reenvia
     Master reprova ......................... Reprovado
   As regras moram SÓ aqui (PODE + as checagens de cada função): a tela pergunta
   e mostra o motivo quando a ação não vale.
   ============================================================================= */
window.ARMAZEM = (function () {
  'use strict';
  const CHAVE = 'paoli-cargos-requisicoes-v1';
  const O = window.OCUPACAO;

  // Quem pode fazer cada ação (a tela usa a mesma tabela para mostrar os botões).
  const PODE = {
    criar: ['gestor'], reenviar: ['gestor'],
    preAprovar: ['analista'], aprovar: ['master'],
    devolver: ['analista', 'master'], reprovar: ['master']
  };

  // Passo 1: ler e gravar sem quebrar quando o navegador recusa.
  let persistente = true;
  let lista = null;
  function ler() {
    try {
      const txt = localStorage.getItem(CHAVE);
      return txt ? JSON.parse(txt) : null;
    } catch (e) { persistente = false; return null; }
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); persistente = true; } catch (e) { persistente = false; }
  }
  // A OUTRA página (o formulário ou o painel, em outra aba do navegador) gravou:
  // relê a lista e avisa quem quer saber. O que esta página grava ela já redesenha.
  const ouvintes = [];
  window.addEventListener('storage', e => {
    if (e.key !== CHAVE) return;
    const novo = ler();
    if (!Array.isArray(novo)) return;
    lista = novo;
    ouvintes.forEach(fn => { try { fn(); } catch (err) { /* um ouvinte com defeito não derruba os outros */ } });
  });

  // Passo 2: os exemplos (8 pedidos, um de cada situação, de 5 gestores fictícios).
  // Conteúdo escrito à mão, em português, como um gestor escreveria, e a tradução em
  // "en" (assim a tela em inglês não mistura idioma). Recados do RH: [português, inglês].
  function exemplos() {
    const quem = O.quemOcupa, P = O.personas, C = window.CATALOGO, RED = window.REDATOR;
    const gestor = P.gestor, tec = quem('CG-601'), com = quem('CG-401'), log = quem('CG-301'), fin = quem('CG-501');
    const an = { papel: 'analista', quem: P.analista.nome }, ms = { papel: 'master', quem: P.master.nome };
    const sol = p => ({ id: p.id, nome: p.nome, cargo: p.cargo });
    const h = (em, papel, quemNome, acao, extra) => Object.assign({ em, papel, quem: quemNome, acao, versao: 1 }, extra || {});
    const base = { idiomas: false, idi: [], viagens: 0, turnos: false, cnh: 'nao', extras: [], idioma: 'pt', enFonte: 'glossario' };
    const R = (codigo, s, pacote, status, hist, extra) => Object.assign({
      codigo, versao: 1, status, solicitante: sol(s), pacote: Object.assign({}, base, pacote),
      preAprovado: null, decisao: null, devolucao: null, reprovacao: null, historico: hist,
      criadoEm: hist[0].em, atualizadoEm: hist[hist.length - 1].em, exemplo: true
    }, extra || {});
    // Missão, responsabilidades e descrição nos dois idiomas (a descrição sai do redator,
    // com o nome do chefe tirado do catálogo em cada língua).
    const textos = (area, nivel, reportaA, m, r, mEn, rEn, outrosEn) => {
      const sup = C.porCodigo(reportaA).nome;
      return {
        area, nivel, reportaA, missao: m, resp: r, descricao: RED.compor({ area, nivel, resp: r, superiorNome: sup[0] }, 'pt'),
        en: Object.assign({ missao: mEn, resp: rEn, descricao: RED.compor({ area, nivel, resp: rEn, superiorNome: sup[1] }, 'en') }, outrosEn || {})
      };
    };
    const out = [];

    let nota = ['Mesma grade dos técnicos de processo.', 'Same grade as the process technicians.'];
    out.push(R('REQ-0001', gestor, Object.assign({ nomePt: 'Técnico(a) de Segurança do Trabalho', nomeEn: 'Occupational Safety Technician',
      esc: 'tecnico', formacao: 'Segurança do Trabalho', exp: 1, turnos: true, extras: ['Registro profissional de técnico de segurança do trabalho ativo'],
      comp: ['seguranca', 'comunicacao', 'integridade', 'organizacao'] }, textos('ops', 'tcn', 'CG-101',
      'Prevenir acidentes na fábrica, orientando as equipes e verificando se as regras de segurança são seguidas em cada turno.',
      ['Fazer inspeções de segurança nas linhas e registrar as condições inseguras', 'Conduzir os diálogos diários de segurança com as equipes',
        'Investigar os incidentes e acompanhar as ações corretivas', 'Controlar a entrega e a validade dos equipamentos de proteção'],
      'Prevent accidents in the plant by guiding the teams and checking that the safety rules are followed on every shift.',
      ['Run safety inspections on the lines and log unsafe conditions', 'Lead the daily safety talks with the teams',
        'Investigate incidents and follow up on corrective actions', 'Control the issue and expiry dates of protective equipment'],
      { formacao: 'Occupational Safety', extras: ['Active professional registration as an occupational safety technician'] })), 'aprovado',
      [h('2026-08-18T09:12:00', 'gestor', gestor.nome, 'enviado'),
        h('2026-08-20T14:30:00', an.papel, an.quem, 'pre_aprovado', { grade: 7, nota }),
        h('2026-08-25T10:05:00', ms.papel, ms.quem, 'aprovado', { grade: 7 })],
      { preAprovado: { grade: 7, nota, por: an.quem, em: '2026-08-20T14:30:00' },
        decisao: { grade: 7, cbo: '3516-05', nota: '', por: ms.quem, em: '2026-08-25T10:05:00', cargoCodigo: 'CG-112' } }));

    out.push(R('REQ-0002', gestor, Object.assign({ nomePt: 'Analista de Sustentabilidade', nomeEn: 'Sustainability Analyst',
      esc: 'superior', formacao: 'Engenharia Ambiental ou áreas afins', exp: 2, idiomas: true, idi: [['ingles', 'intermediario']], viagens: 1,
      comp: ['analitico', 'melhoria', 'comunicacao', 'integridade'] }, textos('ops', 'ana', 'CG-101',
      'Medir e reduzir o impacto ambiental da fábrica, com metas de energia, água e resíduos acompanhadas todo mês.',
      ['Montar o inventário de emissões e os indicadores de energia, água e resíduos', 'Propor projetos de redução de consumo e acompanhar os ganhos',
        'Preparar os relatórios de sustentabilidade pedidos pelos clientes', 'Apoiar as auditorias ambientais da fábrica'],
      'Measure and reduce the environmental impact of the plant, with energy, water and waste targets tracked every month.',
      ['Build the emissions inventory and the energy, water and waste indicators', 'Propose projects to cut consumption and track the savings',
        'Prepare the sustainability reports requested by customers', 'Support the environmental audits of the plant'],
      { formacao: 'Environmental Engineering or related fields' })), 'analise',
      [h('2026-09-22T16:40:00', 'gestor', gestor.nome, 'enviado')]));

    nota = ['As responsabilidades estão quase iguais às de Operador(a) de Produção I. Explique o que muda no envase (produto, máquina, controle de peso) ou use o cargo que já existe.',
      'The responsibilities are almost the same as Production Operator I. Explain what changes in filling (product, machine, weight control) or use the role that already exists.'];
    out.push(R('REQ-0003', gestor, Object.assign({ nomePt: 'Operador(a) de Envase', nomeEn: 'Filling Operator', esc: 'medio', exp: 1, turnos: true,
      comp: ['seguranca', 'equipe', 'organizacao'] }, textos('ops', 'ope', 'CG-102',
      'Operar a linha de envase com segurança, garantindo o volume certo em cada embalagem.',
      ['Operar a envasadora conforme o procedimento padrão', 'Fazer a troca de produto (setup) da envasadora',
        'Registrar as verificações de peso e de vedação', 'Manter o posto limpo e organizado'],
      'Run the filling line safely, making sure every package gets the right volume.',
      ['Operate the filling machine according to the standard procedure', 'Do the product changeover (setup) on the filling machine',
        'Record the weight and seal checks', 'Keep the workstation clean and organized'])), 'alteracao',
      [h('2026-09-10T08:20:00', 'gestor', gestor.nome, 'enviado'),
        h('2026-09-12T11:05:00', an.papel, an.quem, 'devolvido', { nota })],
      { devolucao: { nota, por: an.quem, papel: 'analista', em: '2026-09-12T11:05:00' } }));

    nota = ['O cargo Coordenador(a) de Produção já cobre a liderança de turno, inclusive à noite. Use esse cargo na vaga.',
      'The Production Coordinator role already covers shift leadership, including at night. Use that role for the opening.'];
    out.push(R('REQ-0004', gestor, Object.assign({ nomePt: 'Supervisor(a) de Turno', nomeEn: 'Shift Supervisor', esc: 'tecnico', exp: 3, turnos: true,
      comp: ['lideranca', 'seguranca', 'resultado'] }, textos('ops', 'coo', 'CG-101',
      'Liderar o turno da noite, respondendo pela produção, pela segurança e pelas pessoas do turno.',
      ['Distribuir as pessoas e as ordens de produção do turno', 'Conduzir a reunião de início de turno', 'Tratar as paradas de linha com a manutenção'],
      'Lead the night shift, answering for production, safety and the people on the shift.',
      ['Assign the people and the production orders of the shift', 'Run the start-of-shift meeting', 'Handle line stoppages together with maintenance'])), 'reprovado',
      [h('2026-08-04T07:50:00', 'gestor', gestor.nome, 'enviado'),
        h('2026-08-07T15:20:00', ms.papel, ms.quem, 'reprovado', { nota })],
      { reprovacao: { nota, por: ms.quem, em: '2026-08-07T15:20:00' } }));

    nota = ['Mesma grade dos especialistas de Tecnologia.', 'Same grade as the Technology specialists.'];
    out.push(R('REQ-0005', tec, Object.assign({ nomePt: 'Engenheiro(a) de Dados', nomeEn: 'Data Engineer',
      esc: 'superior', formacao: 'Computação, Sistemas de Informação ou áreas afins', exp: 4, idiomas: true, idi: [['ingles', 'intermediario']],
      extras: ['SQL avançado e uma linguagem de programação para dados'], comp: ['analitico', 'organizacao', 'aprendizado', 'comunicacao'] }, textos('tec', 'esp', 'CG-601',
      'Construir e manter as rotinas que levam os dados dos sistemas para os painéis, com qualidade e no horário.',
      ['Construir as cargas de dados dos sistemas para o banco analítico', 'Monitorar as cargas e corrigir as falhas antes do início do expediente',
        'Documentar as tabelas e as regras de cada indicador', 'Apoiar os analistas de dados na modelagem'],
      'Build and maintain the routines that bring data from the systems to the dashboards, with quality and on time.',
      ['Build the data loads from the systems into the analytics database', 'Monitor the loads and fix failures before the workday starts',
        'Document the tables and the rules behind each indicator', 'Support the data analysts with modeling'],
      { formacao: 'Computer Science, Information Systems or related fields', extras: ['Advanced SQL and a programming language for data'] })), 'analise',
      [h('2026-09-14T13:00:00', 'gestor', tec.nome, 'enviado'),
        h('2026-09-16T10:12:00', an.papel, an.quem, 'pre_aprovado', { grade: 11, nota })],
      { preAprovado: { grade: 11, nota, por: an.quem, em: '2026-09-16T10:12:00' } }));

    out.push(R('REQ-0006', com, Object.assign({ nomePt: 'Analista de E-commerce', nomeEn: 'E-commerce Analyst',
      esc: 'superior', formacao: 'Marketing, Administração ou áreas afins', exp: 2, comp: ['cliente', 'analitico', 'resultado', 'comunicacao'] }, textos('com', 'ana', 'CG-402',
      'Fazer o canal de vendas online crescer, cuidando do catálogo, dos preços e da experiência do cliente na loja virtual.',
      ['Manter o catálogo de produtos da loja virtual atualizado', 'Acompanhar as vendas, a conversão e o abandono de carrinho',
        'Planejar as campanhas do canal junto com o marketing', 'Tratar os pedidos com problema junto com a logística'],
      'Grow the online sales channel by looking after the catalog, the prices and the customer experience in the online store.',
      ['Keep the product catalog of the online store up to date', 'Track sales, conversion and cart abandonment',
        'Plan the campaigns of the channel together with marketing', 'Handle problem orders together with logistics'],
      { formacao: 'Marketing, Business Administration or related fields' })), 'analise',
      [h('2026-09-25T11:30:00', 'gestor', com.nome, 'enviado')]));

    nota = ['Igual aos analistas de Logística.', 'Same as the Logistics analysts.'];
    out.push(R('REQ-0007', log, Object.assign({ nomePt: 'Planejador(a) de Transportes', nomeEn: 'Transportation Planner',
      esc: 'superior', formacao: 'Logística, Engenharia ou Administração', exp: 2, viagens: 1, comp: ['organizacao', 'analitico', 'negociacao', 'cliente'] }, textos('log', 'ana', 'CG-302',
      'Planejar as rotas e a ocupação dos caminhões para entregar no prazo com o menor custo de frete.',
      ['Montar as rotas diárias de entrega', 'Simular a ocupação dos caminhões antes da expedição', 'Acompanhar o custo de frete por rota',
        'Negociar as janelas de entrega com os clientes'],
      'Plan the routes and the truck loads to deliver on time at the lowest freight cost.',
      ['Build the daily delivery routes', 'Simulate the truck loads before dispatch', 'Track the freight cost per route',
        'Negotiate the delivery windows with customers'],
      { formacao: 'Logistics, Engineering or Business Administration' })), 'aprovado',
      [h('2026-07-28T09:00:00', 'gestor', log.nome, 'enviado'),
        h('2026-07-30T16:45:00', an.papel, an.quem, 'pre_aprovado', { grade: 8, nota }),
        h('2026-08-03T09:30:00', ms.papel, ms.quem, 'aprovado', { grade: 8 })],
      { preAprovado: { grade: 8, nota, por: an.quem, em: '2026-07-30T16:45:00' },
        decisao: { grade: 8, cbo: '3421-25', nota: '', por: ms.quem, em: '2026-08-03T09:30:00', cargoCodigo: 'CG-310' } }));

    nota = ['Mesma grade dos analistas de Finanças.', 'Same grade as the Finance analysts.'];
    out.push(R('REQ-0008', fin, Object.assign({ nomePt: 'Analista de Tesouraria', nomeEn: 'Treasury Analyst',
      esc: 'superior', formacao: 'Economia, Administração ou Ciências Contábeis', exp: 3, comp: ['analitico', 'integridade', 'organizacao'] }, textos('fin', 'ana', 'CG-502',
      'Cuidar da liquidez da empresa, aplicando as sobras de caixa e controlando os empréstimos.',
      ['Acompanhar o saldo diário das contas e aplicar as sobras de caixa', 'Controlar os contratos de empréstimo e as datas de pagamento',
        'Fazer o fechamento de câmbio das importações', 'Preparar o relatório semanal de liquidez'],
      'Look after the liquidity of the company, investing surplus cash and controlling the loans.',
      ['Track the daily account balances and invest surplus cash', 'Control the loan contracts and the payment dates',
        'Close the foreign exchange for imports', 'Prepare the weekly liquidity report'],
      { formacao: 'Economics, Business Administration or Accounting' })), 'analise',
      [h('2026-09-21T10:00:00', 'gestor', fin.nome, 'enviado'),
        h('2026-09-24T15:40:00', an.papel, an.quem, 'pre_aprovado', { grade: 8, nota })],
      { preAprovado: { grade: 8, nota, por: an.quem, em: '2026-09-24T15:40:00' } }));
    return out;
  }

  function carregar() {
    const guardado = ler();
    lista = Array.isArray(guardado) ? guardado : exemplos();
    if (!Array.isArray(guardado)) gravar();
  }
  function restaurar() { lista = exemplos(); gravar(); }

  // Passo 3: consultas.
  const agora = () => new Date().toISOString().slice(0, 19);
  const todas = () => lista.slice().sort((a, b) => (a.codigo < b.codigo ? 1 : -1));
  const porCodigo = c => lista.find(r => r.codigo === c) || null;
  const doSolicitante = id => todas().filter(r => r.solicitante.id === id);
  // Pendente "para mim": o que espera a ação de cada papel.
  function pendentes(papel, idGestor) {
    if (papel === 'analista') return todas().filter(r => r.status === 'analise' && !r.preAprovado);
    if (papel === 'master') return todas().filter(r => r.status === 'analise' && r.preAprovado);
    return todas().filter(r => r.solicitante.id === idGestor && r.status === 'alteracao');
  }
  function proximoCodigo() {
    const n = lista.reduce((mx, r) => Math.max(mx, Number(r.codigo.slice(4)) || 0), 0) + 1;
    return 'REQ-' + String(n).padStart(4, '0');
  }

  // Passo 4: as ações. Cada uma confere papel e situação antes de mudar
  // qualquer coisa e devolve {ok} ou {ok:false, erro:'chave do texto'}.
  function confere(acao, papel, r, statusEsperado) {
    if (!PODE[acao].includes(papel)) return 'e_papel';
    if (r && statusEsperado && r.status !== statusEsperado) return 'e_situacao';
    return null;
  }
  function criar(pacote, persona) {
    const erro = confere('criar', 'gestor');
    if (erro) return { ok: false, erro };
    const em = agora();
    const r = {
      codigo: proximoCodigo(), versao: 1, status: 'analise', solicitante: { id: persona.id, nome: persona.nome, cargo: persona.cargo },
      pacote: JSON.parse(JSON.stringify(pacote)), preAprovado: null, decisao: null, devolucao: null, reprovacao: null,
      historico: [{ em, papel: 'gestor', quem: persona.nome, acao: 'enviado', versao: 1 }], criadoEm: em, atualizadoEm: em
    };
    lista.push(r); gravar();
    return { ok: true, codigo: r.codigo };
  }
  function reenviar(codigo, pacote, persona) {
    const r = porCodigo(codigo);
    if (!r) return { ok: false, erro: 'e_nao_achei' };
    const erro = confere('reenviar', 'gestor', r, 'alteracao') || (r.solicitante.id !== persona.id ? 'e_dono' : null);
    if (erro) return { ok: false, erro };
    r.versao += 1; r.status = 'analise'; r.pacote = JSON.parse(JSON.stringify(pacote)); r.preAprovado = null;
    r.atualizadoEm = agora();
    r.historico.push({ em: r.atualizadoEm, papel: 'gestor', quem: persona.nome, acao: 'reenviado', versao: r.versao });
    gravar();
    return { ok: true, codigo };
  }
  const gradeValida = g => Number.isInteger(Number(g)) && Number(g) >= 1 && Number(g) <= 16;
  function preAprovar(codigo, { grade, nota }, persona) {
    const r = porCodigo(codigo);
    if (!r) return { ok: false, erro: 'e_nao_achei' };
    const erro = confere('preAprovar', 'analista', r, 'analise') || (r.preAprovado ? 'e_ja_pre' : null) || (!gradeValida(grade) ? 'e_grade' : null);
    if (erro) return { ok: false, erro };
    r.atualizadoEm = agora();
    r.preAprovado = { grade: Number(grade), nota: (nota || '').trim(), por: persona.nome, em: r.atualizadoEm };
    r.historico.push({ em: r.atualizadoEm, papel: 'analista', quem: persona.nome, acao: 'pre_aprovado', versao: r.versao, grade: Number(grade), nota: (nota || '').trim() });
    gravar();
    return { ok: true };
  }
  function aprovar(codigo, { grade, cbo, nota }, persona) {
    const r = porCodigo(codigo);
    if (!r) return { ok: false, erro: 'e_nao_achei' };
    const erro = confere('aprovar', 'master', r, 'analise') || (!gradeValida(grade) ? 'e_grade' : null);
    if (erro) return { ok: false, erro };
    r.atualizadoEm = agora();
    const usados = lista.map(x => x.decisao && x.decisao.cargoCodigo).filter(Boolean);
    r.status = 'aprovado';
    r.decisao = { grade: Number(grade), cbo: (cbo || '').trim(), nota: (nota || '').trim(), por: persona.nome, em: r.atualizadoEm,
      cargoCodigo: window.CATALOGO.proximoCodigo(r.pacote.area, usados) };
    r.historico.push({ em: r.atualizadoEm, papel: 'master', quem: persona.nome, acao: 'aprovado', versao: r.versao, grade: Number(grade), nota: (nota || '').trim() });
    gravar();
    return { ok: true, cargo: r.decisao.cargoCodigo };
  }
  function devolver(codigo, { nota }, persona, papel) {
    const r = porCodigo(codigo);
    if (!r) return { ok: false, erro: 'e_nao_achei' };
    const erro = confere('devolver', papel, r, 'analise') || ((nota || '').trim().length < 5 ? 'e_nota' : null);
    if (erro) return { ok: false, erro };
    r.atualizadoEm = agora();
    r.status = 'alteracao'; r.preAprovado = null;
    r.devolucao = { nota: nota.trim(), por: persona.nome, papel, em: r.atualizadoEm };
    r.historico.push({ em: r.atualizadoEm, papel, quem: persona.nome, acao: 'devolvido', versao: r.versao, nota: nota.trim() });
    gravar();
    return { ok: true };
  }
  // Reprovar pede o MOTIVO por escrito (texto livre, obrigatório); não há lista de motivos.
  function reprovar(codigo, { nota }, persona) {
    const r = porCodigo(codigo);
    if (!r) return { ok: false, erro: 'e_nao_achei' };
    const erro = confere('reprovar', 'master', r, 'analise') || ((nota || '').trim().length < 5 ? 'e_motivo' : null);
    if (erro) return { ok: false, erro };
    r.atualizadoEm = agora();
    r.status = 'reprovado';
    r.reprovacao = { nota: nota.trim(), por: persona.nome, em: r.atualizadoEm };
    r.historico.push({ em: r.atualizadoEm, papel: 'master', quem: persona.nome, acao: 'reprovado', versao: r.versao, nota: nota.trim() });
    gravar();
    return { ok: true };
  }

  // Passo 5: requisição aprovada vira cargo do catálogo (sem ocupante, com a grade
  // decidida pelo Master). O texto fica no idioma em que o gestor escreveu.
  function cargosAprovados() {
    return lista.filter(r => r.status === 'aprovado' && r.decisao).map(r => {
      // Pedido com tradução (os exemplos) vira cargo bilíngue; pedido escrito numa língua só fica nela.
      const p = r.pacote, en = p.en || {}, par = (pt, ing) => [pt, ing == null ? pt : ing];
      const pares = (l, lEn) => (l || []).filter(Boolean).map((x, i) => par(x, (lEn || [])[i]));
      return {
        codigo: r.decisao.cargoCodigo, area: p.area, nivel: p.nivel, grade: r.decisao.grade,
        nome: [p.nomePt, p.nomeEn], reportaA: p.reportaA, cbo: r.decisao.cbo || null,
        missao: par(p.missao, en.missao), resp: pares(p.resp, en.resp), descricaoPropria: par(p.descricao, en.descricao),
        req: { esc: p.nivel === 'apr' ? 'apr' : p.nivel === 'est' ? 'est' : p.esc, form: p.formacao ? par(p.formacao, en.formacao) : null, exp: p.exp || 0,
          idi: p.idiomas ? (p.idi || []) : [], via: p.viagens || 0, tur: !!p.turnos, cnh: p.cnh && p.cnh !== 'nao' ? p.cnh : null,
          extra: pares(p.extras, en.extras) },
        comp: p.comp || [], peso: 0, criadoEm: r.decisao.em.slice(0, 10), origem: 'requisicao', requisicao: r.codigo,
        idiomaConteudo: p.en ? null : (p.idioma || 'pt')
      };
    });
  }

  carregar();
  return {
    PODE, todas, porCodigo, doSolicitante, pendentes, proximoCodigo,
    criar, reenviar, preAprovar, aprovar, devolver, reprovar, restaurar, cargosAprovados,
    aoMudar: fn => ouvintes.push(fn),
    get persistente() { return persistente; }
  };
})();
