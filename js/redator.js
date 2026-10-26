/* =============================================================================
   redator.js: o "Preencher para mim" e o parágrafo da descrição do cargo.

   NÃO é inteligência artificial: é montagem por modelo de frases, dentro do
   arquivo, sem internet e sem chave. Funciona assim:
   1. tira do nome do cargo o assunto dele ("Analista de Sustentabilidade" ->
      "sustentabilidade"); sem assunto no nome, usa o da área ("produção");
   2. escolhe as frases-modelo pelo NÍVEL (quem executa escreve diferente de
      quem analisa ou lidera) e encaixa o assunto em cada uma;
   3. a descrição é sempre um parágrafo corrido: família e nível, as três
      primeiras responsabilidades e a quem o cargo responde.
   A mesma função compor() escreve a descrição dos cargos do catálogo, então o
   documento de um cargo novo sai no mesmo formato dos que já existem.
   ============================================================================= */
window.REDATOR = (function () {
  'use strict';
  const C = window.CATALOGO, TR = window.TRADUTOR;
  const idx = lang => (lang === 'en' ? 1 : 0);

  // Assunto padrão de cada área, para nome sem "de ..." ("Analista Financeiro").
  const ASSUNTO_DA_AREA = {
    ops: ['produção', 'production'], man: ['manutenção', 'maintenance'], log: ['logística', 'logistics'],
    com: ['vendas', 'sales'], fin: ['finanças', 'finance'], tec: ['tecnologia', 'technology'],
    pes: ['pessoas', 'people'], jur: ['assuntos jurídicos', 'legal affairs'], dir: ['gestão', 'management']
  };
  // Sigla fica em caixa alta; o resto vai para minúscula (o assunto entra no meio da frase).
  const minuscula = w => (/^[A-Z0-9&]{2,6}$/.test(w) ? w : w.toLowerCase());

  // Passo 1: o assunto do cargo a partir do nome (português ou inglês).
  function assunto(nome, area, lang) {
    const padrao = (ASSUNTO_DA_AREA[area] || ASSUNTO_DA_AREA.ops)[idx(lang)];
    if (!nome || !nome.trim()) return padrao;
    const base = TR.separaNivel(nome).base;
    const palavras = base.split(' ').filter(Boolean);
    if (lang === 'en') {
      const iOf = palavras.findIndex(p => p.toLowerCase() === 'of');
      const resto = iOf >= 0 ? palavras.slice(iOf + 1) : palavras.slice(0, -1);
      return resto.length ? resto.map(minuscula).join(' ') : padrao;
    }
    const iLiga = palavras.findIndex((p, i) => i > 0 && /^(de|do|da|dos|das|em)$/i.test(p));
    return iLiga > 0 && palavras[iLiga + 1] ? palavras.slice(iLiga + 1).map(minuscula).join(' ') : padrao;
  }

  // Passo 2: frases-modelo. {a} = assunto do cargo.
  const MISSAO = {
    apr: ['Aprender na prática as rotinas de {a}, com um tutor e o programa de aprendizagem.', 'Learn {a} routines on the job, with a mentor and the apprenticeship program.'],
    est: ['Apoiar a equipe nas rotinas de {a} enquanto aplica na prática o que aprende no curso.', 'Support the team in {a} routines while putting coursework into practice.'],
    ope: ['Executar as atividades de {a} com segurança, qualidade e no ritmo planejado.', 'Carry out {a} activities safely, on quality and at the planned pace.'],
    tcn: ['Garantir a parte técnica das atividades de {a}, seguindo normas e procedimentos.', 'Ensure the technical side of {a} activities, following standards and procedures.'],
    ana: ['Analisar e melhorar os processos de {a}, entregando informação confiável para as decisões da área.', "Analyze and improve {a} processes, delivering reliable information for the team's decisions."],
    esp: ['Ser a referência técnica em {a}, resolvendo os casos complexos e orientando a equipe.', 'Be the technical reference in {a}, solving complex cases and guiding the team.'],
    coo: ['Coordenar a equipe de {a}, garantindo metas, segurança e o desenvolvimento das pessoas.', 'Coordinate the {a} team, ensuring targets, safety and people development.'],
    ger: ['Liderar a área de {a}, definindo prioridades, metas e o desenvolvimento da equipe em linha com a estratégia da empresa.', 'Lead the {a} area, setting priorities, targets and team development in line with company strategy.'],
    dir: ['Dirigir as áreas de {a}, respondendo pelos resultados e pela estratégia junto com o CEO.', 'Direct the {a} areas, owning results and strategy together with the CEO.']
  };
  const RESP = {
    base: [['Apoiar a equipe nas rotinas de {a}, com orientação', 'Support the team in {a} routines, with guidance'],
      ['Organizar os documentos, as planilhas e os materiais de {a}', 'Organize {a} documents, spreadsheets and materials'],
      ['Registrar as atividades feitas e tirar dúvidas com o responsável', 'Record completed tasks and check questions with the supervisor']],
    exec: [['Executar as atividades de {a} conforme os procedimentos da empresa', 'Carry out {a} activities according to company procedures'],
      ['Registrar as inspeções e os resultados das atividades de {a}', 'Record inspections and results of {a} activities'],
      ['Comunicar ao líder, na hora, qualquer desvio ou problema de {a}', 'Report any {a} deviation or problem to the leader right away'],
      ['Manter os equipamentos e a área de trabalho limpos e organizados', 'Keep equipment and the work area clean and organized']],
    ana: [['Levantar e analisar os dados de {a}, apontando causas e oportunidades', 'Gather and analyze {a} data, pointing out causes and opportunities'],
      ['Montar e acompanhar os indicadores de {a}', 'Build and track {a} indicators'],
      ['Mapear e padronizar os processos de {a}', 'Map and standardize {a} processes'],
      ['Preparar relatórios e recomendações sobre {a} para a liderança', 'Prepare {a} reports and recommendations for leadership']],
    lid: [['Definir com a equipe as metas e as prioridades de {a}', 'Set {a} targets and priorities with the team'],
      ['Acompanhar os indicadores de {a} e agir rápido nos desvios', 'Track {a} indicators and act quickly on deviations'],
      ['Garantir que a equipe trabalhe com segurança e dentro das políticas da empresa', 'Make sure the team works safely and within company policies']]
  };
  const RESP_EXTRA = {
    esp: ['Orientar os colegas e ser a referência técnica em {a}', 'Coach peers and act as the technical reference in {a}'],
    ger: ['Gerir o orçamento e os recursos de {a}', 'Manage the {a} budget and resources'],
    dir: ['Gerir o orçamento e os recursos de {a}', 'Manage the {a} budget and resources']
  };
  // Uma frase com o jeito de cada área.
  const RESP_DA_AREA = {
    ops: ['Trabalhar junto com a produção para que as melhorias cheguem ao chão de fábrica', 'Work with production so improvements reach the shop floor'],
    man: ['Garantir que nenhuma intervenção comece sem o bloqueio de energias', 'Ensure no intervention starts without energy lockout'],
    log: ['Cuidar para que materiais e pedidos estejam no lugar certo, na hora certa', 'Make sure materials and orders are in the right place at the right time'],
    com: ['Manter o cliente informado e responder no prazo combinado', 'Keep the customer informed and respond within the agreed time'],
    fin: ['Seguir a política de alçadas e manter os registros prontos para auditoria', 'Follow the approval policy and keep records audit-ready'],
    tec: ['Documentar as soluções e seguir as regras de segurança da informação', 'Document solutions and follow information security rules'],
    pes: ['Tratar os dados dos colaboradores com sigilo e dentro da lei de proteção de dados', 'Handle employee data confidentially and in line with data protection law'],
    jur: ['Registrar pareceres e prazos de forma rastreável', 'Record opinions and deadlines in a traceable way'],
    dir: ['Garantir que as decisões sigam o código de conduta da empresa', 'Ensure decisions follow the company code of conduct']
  };
  const COMP_DO_TIER = {
    base: ['aprendizado', 'equipe', 'organizacao'],
    exec: ['seguranca', 'equipe', 'organizacao', 'melhoria'],
    ana: ['analitico', 'comunicacao', 'organizacao', 'melhoria'],
    lid: ['lideranca', 'resultado', 'comunicacao', 'integridade']
  };

  const encaixa = (modelo, a) => modelo.split('{a}').join(a);
  const inicioMinusculo = s => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  const comPonto = s => (/[.!?]$/.test(s.trim()) ? s.trim() : s.trim() + '.');

  // Passo 3: o parágrafo. Abre com família e nível (a missão já tem seção própria
  // no documento, então não se repete aqui), segue com as 3 primeiras
  // responsabilidades e fecha com a quem o cargo responde.
  function compor(o, lang) {
    const D = window.DADOS;
    const lista = (o.resp || []).map(r => (r || '').trim()).filter(Boolean).slice(0, 3).map(r => inicioMinusculo(r.replace(/[.;]+$/, '')));
    const juntar = l => (l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + (lang === 'en' ? ' and ' : ' e ') + l[l.length - 1]);
    const fam = o.area && D.areas[o.area] ? D.areas[o.area][lang === 'en' ? 'en' : 'pt'] : '';
    const niv = o.nivel && D.niveis[o.nivel] ? D.niveis[o.nivel][lang === 'en' ? 'en' : 'pt'] : '';
    const partes = [];
    if (o.area === 'dir') partes.push(lang === 'en' ? 'Board-level role.' : 'Cargo da diretoria.');
    else if (fam && niv) partes.push(lang === 'en' ? `${fam} role at ${niv} level.` : `Cargo da família ${fam}, nível ${niv}.`);
    if (lista.length) partes.push(lang === 'en' ? `Whoever holds it is expected to ${juntar(lista)}.` : `Cabe a quem o ocupa ${juntar(lista)}.`);
    partes.push(o.superiorNome
      ? (lang === 'en' ? `Reports to the ${o.superiorNome}.` : `Responde ao cargo de ${o.superiorNome}.`)
      : (lang === 'en' ? 'Reports to the board of directors.' : 'Responde ao conselho de administração.'));
    return partes.join(' ');
  }

  // A descrição de um cargo do catálogo (ou criado por requisição) no idioma pedido.
  function descricaoDoCargo(cg, lang) {
    if (cg.descricaoPropria) return C.L(cg.descricaoPropria, lang);
    const sup = cg.reportaA ? C.porCodigo(cg.reportaA) : null;
    return compor({ area: cg.area, nivel: cg.nivel, resp: C.responsabilidades(cg).map(r => C.L(r, lang)), superiorNome: sup ? C.L(sup.nome, lang) : '' }, lang);
  }

  // "Preencher para mim" do passo 2: missão, responsabilidades e descrição.
  // Só gera o que está VAZIO; o que a pessoa escreveu fica como está.
  function preencherConteudo(f, lang) {
    const nivel = f.nivel || 'ana', tier = C.tierDe(nivel), i = idx(lang);
    const a = assunto(lang === 'en' ? f.nomeEn : f.nomePt, f.area, lang);
    const out = {};
    if (!(f.missao || '').trim()) out.missao = encaixa(MISSAO[nivel][i], a);
    const jaTem = (f.resp || []).filter(r => (r || '').trim());
    if (jaTem.length < 3) {
      const modelos = RESP[tier].slice();
      if (RESP_EXTRA[nivel]) modelos.push(RESP_EXTRA[nivel]);
      modelos.push(RESP_DA_AREA[f.area] || RESP_DA_AREA.ops);
      modelos.push(C.RESP_DO_TIER[tier]);
      const novas = modelos.map(m => encaixa(m[i], a)).filter(t => !jaTem.includes(t));
      out.resp = jaTem.concat(novas).slice(0, 7);
    }
    if (!(f.descricao || '').trim()) {
      const sup = f.reportaA ? C.porCodigo(f.reportaA) : null;
      out.descricao = compor({ area: f.area, nivel: f.nivel, resp: out.resp || jaTem, superiorNome: sup ? C.L(sup.nome, lang) : '' }, lang);
    }
    return out;
  }

  // "Preencher para mim" do passo 3: os campos de requisito ainda sem resposta
  // recebem o padrão do nível (o mínimo de escolaridade, os anos de experiência...).
  function preencherRequisitos(f) {
    const info = C.NIVEIS_INFO[f.nivel] || C.NIVEIS_INFO.ana, tier = info.tier;
    const out = {};
    if (!f.esc && info.escMin) out.esc = info.escMin;
    if (f.exp == null) out.exp = info.expPadrao;
    if (f.idiomas == null) out.idiomas = false;
    if (f.viagens == null) out.viagens = 0;
    if (f.turnos == null) out.turnos = ['ops', 'man', 'log'].includes(f.area) && ['ope', 'tcn', 'coo'].includes(f.nivel);
    if (f.cnh == null) out.cnh = 'nao';
    if (!(f.comp || []).length) {
      const sug = COMP_DO_TIER[tier].slice();
      if (['ops', 'man', 'log'].includes(f.area) && !sug.includes('seguranca')) sug.splice(1, 0, 'seguranca');
      out.comp = sug.slice(0, 5);
    }
    return out;
  }

  return { assunto, compor, descricaoDoCargo, preencherConteudo, preencherRequisitos };
})();
