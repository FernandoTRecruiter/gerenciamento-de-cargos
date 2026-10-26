/* =============================================================================
   traducao.js: traduz o NOME do cargo de português para inglês, sem internet.

   Por que sem serviço de tradução: a demo roda em qualquer lugar (até offline)
   e o nome de cargo é um texto curto e previsível. Duas fontes, nesta ordem:
   1. o PAR do catálogo: se o cargo já existe, o inglês oficial ganha de tudo
      (a marca de nível, como "II" ou "Sênior", é tirada antes e devolvida depois);
   2. o GLOSSÁRIO: palavra por palavra, trocando a ordem como o inglês pede
      ("Analista de Qualidade" -> "Quality Analyst").
   Se sobrar UMA palavra que o glossário não conhece, ele não chuta: devolve
   qual é a palavra, e a tela pede para a pessoa escrever o inglês.
   ============================================================================= */
window.TRADUTOR = (function () {
  'use strict';
  const C = window.CATALOGO;
  const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Marca de gênero "(a)" e marcas de nível no fim do nome.
  const tiraGenero = s => s.replace(/\((a|o|as|os)\)/gi, '').replace(/\s+/g, ' ').trim();
  const NIVEL = { i: 'I', ii: 'II', iii: 'III', iv: 'IV', junior: 'Junior', jr: 'Junior', pleno: 'Mid-level', senior: 'Senior', sr: 'Senior' };
  function separaNivel(nome) {
    const partes = tiraGenero(nome).split(' ');
    const ult = semAcento(partes[partes.length - 1] || '').replace('.', '');
    if (partes.length > 1 && NIVEL[ult]) return { base: partes.slice(0, -1).join(' '), nivel: NIVEL[ult] };
    return { base: partes.join(' '), nivel: '' };
  }
  const chave = nome => semAcento(separaNivel(nome).base);
  // Em inglês a senioridade vem ANTES ("Senior Buyer") e o numeral romano, depois ("Operator II").
  const comNivel = (en, nivel) => !nivel ? en : /^(I|II|III|IV)$/.test(nivel) ? en + ' ' + nivel : nivel + ' ' + en;

  // Quem é o "núcleo" do título (masculino e feminino apontam para o mesmo inglês).
  const NUCLEOS = {
    analista: 'Analyst', tecnico: 'Technician', tecnica: 'Technician', auxiliar: 'Assistant', assistente: 'Assistant',
    operador: 'Operator', operadora: 'Operator', coordenador: 'Coordinator', coordenadora: 'Coordinator',
    gerente: 'Manager', diretor: 'Director', diretora: 'Director', especialista: 'Specialist',
    supervisor: 'Supervisor', supervisora: 'Supervisor', engenheiro: 'Engineer', engenheira: 'Engineer',
    aprendiz: 'Apprentice', estagiario: 'Intern', estagiaria: 'Intern', conferente: 'Checker',
    comprador: 'Buyer', compradora: 'Buyer', advogado: 'Lawyer', advogada: 'Lawyer', executivo: 'Executive', executiva: 'Executive',
    consultor: 'Consultant', consultora: 'Consultant', planejador: 'Planner', planejadora: 'Planner', lider: 'Lead',
    inspetor: 'Inspector', inspetora: 'Inspector', mecanico: 'Mechanic', mecanica: 'Mechanic', eletricista: 'Electrician',
    motorista: 'Driver', desenvolvedor: 'Developer', desenvolvedora: 'Developer', cientista: 'Scientist',
    arquiteto: 'Architect', arquiteta: 'Architect', designer: 'Designer', recepcionista: 'Receptionist',
    secretario: 'Secretary', secretaria: 'Secretary', almoxarife: 'Storekeeper', enfermeiro: 'Nurse', enfermeira: 'Nurse',
    vendedor: 'Salesperson', vendedora: 'Salesperson', representante: 'Representative', programador: 'Programmer',
    programadora: 'Programmer', administrador: 'Administrator', administradora: 'Administrator', contador: 'Accountant',
    contadora: 'Accountant', economista: 'Economist', psicologo: 'Psychologist', psicologa: 'Psychologist',
    agente: 'Agent', atendente: 'Attendant', controlador: 'Controller', controladora: 'Controller', gestor: 'Manager', gestora: 'Manager',
    instrutor: 'Instructor', instrutora: 'Instructor', ajudante: 'Helper', soldador: 'Welder', soldadora: 'Welder',
    laboratorista: 'Lab Technician', promotor: 'Promoter', promotora: 'Promoter', redator: 'Writer', redatora: 'Writer'
  };
  // Expressões que viram uma coisa só em inglês (procuradas antes das palavras).
  const EXPRESSOES = {
    'seguranca do trabalho': 'Occupational Safety', 'seguranca da informacao': 'Information Security', 'saude ocupacional': 'Occupational Health',
    'recursos humanos': 'Human Resources', 'departamento pessoal': 'Payroll', 'recrutamento e selecao': 'Recruiting',
    'treinamento e desenvolvimento': 'Learning and Development', 'cargos e salarios': 'Compensation',
    'melhoria continua': 'Continuous Improvement', 'centro de distribuicao': 'Distribution Center', 'logistica reversa': 'Reverse Logistics',
    'comercio exterior': 'Foreign Trade', 'meio ambiente': 'Environmental', 'grandes contas': 'Key Account', 'ciencia de dados': 'Data Science',
    'tecnologia da informacao': 'Information Technology', 'atendimento ao cliente': 'Customer Service', 'sucesso do cliente': 'Customer Success',
    'controle de qualidade': 'Quality Control', 'planejamento financeiro': 'Financial Planning', 'contas a pagar': 'Accounts Payable',
    'contas a receber': 'Accounts Receivable', 'business partner de rh': 'HR Business Partner', 'business partner': 'Business Partner',
    'midias sociais': 'Social Media', 'inteligencia de mercado': 'Market Intelligence', 'pesquisa e desenvolvimento': 'Research and Development',
    'e-commerce': 'E-commerce', 'pcp': 'Production Planning', 'pcm': 'Maintenance Planning'
  };
  const PALAVRAS = {
    producao: 'Production', qualidade: 'Quality', manutencao: 'Maintenance', logistica: 'Logistics', vendas: 'Sales', venda: 'Sales',
    marketing: 'Marketing', financas: 'Finance', financeiro: 'Financial', financeira: 'Financial', contabil: 'Accounting', fiscal: 'Tax',
    tributario: 'Tax', tributaria: 'Tax', juridico: 'Legal', juridica: 'Legal', compliance: 'Compliance', dados: 'Data', sistemas: 'Systems',
    sistema: 'Systems', suporte: 'Support', infraestrutura: 'Infrastructure', redes: 'Network', rede: 'Network', nuvem: 'Cloud',
    seguranca: 'Safety', sustentabilidade: 'Sustainability', ambiental: 'Environmental', processos: 'Process', processo: 'Process',
    projetos: 'Project', projeto: 'Project', planejamento: 'Planning', compras: 'Purchasing', suprimentos: 'Procurement',
    transportes: 'Transportation', transporte: 'Transportation', expedicao: 'Shipping', estoque: 'Inventory', armazem: 'Warehouse',
    envase: 'Filling', embalagem: 'Packaging', automacao: 'Automation', mecanica: 'Mechanical', eletrica: 'Electrical',
    eletronica: 'Electronics', eletroeletronica: 'Electrical and Electronics', eletrotecnica: 'Electrical', confiabilidade: 'Reliability',
    treinamento: 'Training', desenvolvimento: 'Development', remuneracao: 'Compensation', beneficios: 'Benefits', recrutamento: 'Recruiting',
    selecao: 'Selection', pessoas: 'People', cultura: 'Culture', comunicacao: 'Communications', comercial: 'Sales', exportacao: 'Export',
    importacao: 'Import', tesouraria: 'Treasury', custos: 'Cost', custo: 'Cost', orcamento: 'Budget', controladoria: 'Controllership',
    auditoria: 'Audit', credito: 'Credit', cobranca: 'Collections', faturamento: 'Billing', atendimento: 'Service', cliente: 'Customer',
    clientes: 'Customer', contas: 'Account', turno: 'Shift', obras: 'Construction', engenharia: 'Engineering', laboratorio: 'Laboratory',
    pesquisa: 'Research', inovacao: 'Innovation', produto: 'Product', produtos: 'Product', digital: 'Digital', conteudo: 'Content',
    eventos: 'Events', frota: 'Fleet', patrimonio: 'Asset', inteligencia: 'Intelligence', mercado: 'Market', negocios: 'Business',
    estrategia: 'Strategy', administrativo: 'Administrative', administrativa: 'Administrative', industrial: 'Industrial',
    operacoes: 'Operations', operacional: 'Operations', tecnologia: 'Technology', informacao: 'Information', trabalho: 'Work',
    ti: 'IT', rh: 'HR', dp: 'Payroll', sst: 'Occupational Health and Safety', ehs: 'EHS', ux: 'UX', bi: 'BI', crm: 'CRM', erp: 'ERP',
    governanca: 'Governance', riscos: 'Risk', risco: 'Risk', contratos: 'Contracts', contrato: 'Contracts', relacionamento: 'Relationship',
    parcerias: 'Partnerships', relacoes: 'Relations', trabalhistas: 'Labor', trabalhista: 'Labor', reversa: 'Reverse', interno: 'Internal',
    interna: 'Internal', externo: 'External', externa: 'External', regional: 'Regional', nacional: 'National', geral: 'General',
    software: 'Software', hardware: 'Hardware', ecommerce: 'E-commerce', utilidades: 'Utilities', energia: 'Energy', agua: 'Water',
    efluentes: 'Wastewater', residuos: 'Waste', pintura: 'Painting', solda: 'Welding', usinagem: 'Machining', ferramentaria: 'Tooling',
    caldeiraria: 'Boilermaking', limpeza: 'Cleaning', portaria: 'Front Desk', recepcao: 'Reception', cozinha: 'Kitchen'
  };
  // Adjetivos: em português vêm depois do substantivo; em inglês, antes.
  const ADJETIVOS = new Set(['financeiro', 'financeira', 'contabil', 'fiscal', 'tributario', 'tributaria', 'juridico', 'juridica',
    'comercial', 'ambiental', 'administrativo', 'administrativa', 'industrial', 'operacional', 'reversa', 'interno', 'interna',
    'externo', 'externa', 'regional', 'nacional', 'geral', 'digital', 'mecanica', 'eletrica', 'eletronica', 'trabalhista', 'trabalhistas']);
  const LIGA = new Set(['de', 'do', 'da', 'dos', 'das', 'em', 'para', 'no', 'na']);

  // Traduz uma sequência de palavras (o que vem depois do "de").
  function traduzTrecho(palavras) {
    if (!palavras.length) return { ok: true, en: '' };
    const k = palavras.map(semAcento).join(' ');
    if (EXPRESSOES[k]) return { ok: true, en: EXPRESSOES[k] };
    // "X de Y" vira "Y X"; "X e Y" vira "X and Y".
    const iLiga = palavras.findIndex(p => LIGA.has(semAcento(p)));
    if (iLiga > 0) {
      const a = traduzTrecho(palavras.slice(0, iLiga)), b = traduzTrecho(palavras.slice(iLiga + 1));
      if (!a.ok) return a;
      if (!b.ok) return b;
      return { ok: true, en: (b.en + ' ' + a.en).trim() };
    }
    const iE = palavras.findIndex(p => semAcento(p) === 'e');
    if (iE > 0) {
      const a = traduzTrecho(palavras.slice(0, iE)), b = traduzTrecho(palavras.slice(iE + 1));
      if (!a.ok) return a;
      if (!b.ok) return b;
      return { ok: true, en: a.en + ' and ' + b.en };
    }
    const fora = palavras.find(p => !PALAVRAS[semAcento(p)] && !EXPRESSOES[semAcento(p)]);
    if (fora) return { ok: false, falta: fora };
    const en = palavras.map(p => PALAVRAS[semAcento(p)] || EXPRESSOES[semAcento(p)]);
    // Substantivo + adjetivo ("Logística Reversa") inverte a ordem.
    if (palavras.length === 2 && ADJETIVOS.has(semAcento(palavras[1]))) en.reverse();
    return { ok: true, en: en.join(' ') };
  }

  // A tradução: {ok, en, fonte: 'catalogo'|'glossario', codigo} ou {ok:false, falta}.
  function traduzir(nomePt) {
    const nome = (nomePt || '').trim();
    if (nome.length < 2) return { ok: false, vazio: true };
    const { base, nivel } = separaNivel(nome);
    const k = semAcento(base);
    // 1. O par do catálogo ganha de tudo.
    const doCatalogo = C.todos().find(cg => chave(cg.nome[0]) === k);
    if (doCatalogo) {
      return { ok: true, en: comNivel(separaNivel(doCatalogo.nome[1]).base, nivel), fonte: 'catalogo', codigo: doCatalogo.codigo };
    }
    // 2. Glossário: núcleo + adjetivos + "de" + complemento.
    const palavras = base.split(' ').filter(Boolean);
    const nucleo = NUCLEOS[semAcento(palavras[0])];
    if (!nucleo) return { ok: false, falta: palavras[0] };
    let i = 1;
    const adjs = [];
    while (i < palavras.length && !LIGA.has(semAcento(palavras[i])) && semAcento(palavras[i]) !== 'e') {
      const w = PALAVRAS[semAcento(palavras[i])];
      if (!w) return { ok: false, falta: palavras[i] };
      adjs.push(w);
      i += 1;
    }
    let comp = { ok: true, en: '' };
    if (i < palavras.length) comp = traduzTrecho(palavras.slice(i + 1));
    if (!comp.ok) return comp;
    const en = comNivel([adjs.join(' '), comp.en, nucleo].filter(Boolean).join(' '), nivel);
    return { ok: true, en, fonte: 'glossario' };
  }

  // Volta do inglês para o português só pelo catálogo (o glossário é de mão única).
  function doIngles(nomeEn) {
    const { base } = separaNivel(nomeEn || '');
    const k = semAcento(base);
    const cg = k && C.todos().find(x => semAcento(separaNivel(x.nome[1]).base) === k);
    return cg ? { ok: true, pt: cg.nome[0], codigo: cg.codigo } : { ok: false };
  }

  return { traduzir, doIngles, chave, semAcento, tiraGenero, separaNivel };
})();
