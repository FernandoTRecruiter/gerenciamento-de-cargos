/* =============================================================================
   catalogo.js: o catálogo de cargos FICTÍCIO da C. & Paoli corp.

   O que mora aqui (tudo em português e inglês, nesta ordem: [pt, en]):
   1. GRADES: a tabela salarial por grade (mínimo, ponto médio, máximo).
   2. NIVEIS_INFO: o que cada nível significa e os mínimos que ele exige.
   3. OPCOES: as respostas possíveis dos campos de requisito (escolaridade,
      idioma, viagens...). Cada opção tem DOIS textos: o rótulo da tela e a frase
      que vira requisito, sempre do lado do candidato ("Disponibilidade para...").
   4. COMPETENCIAS: o dicionário de competências, com a definição de cada uma.
   5. CARGOS: os 67 cargos, com missão, responsabilidades e requisitos.
   6. TRILHAS, GRUPOS e FAIXAS_NIVEL: o que o organograma (Escada e Órbita) desenha.

   Por que os requisitos de cada cargo usam os MESMOS campos do formulário de
   requisição: o documento de um cargo do catálogo e o de um cargo pedido pelo
   gestor saem da mesma função. Um requisito nunca descreve o cargo; ele diz o
   que se pede da pessoa.

   Para plugar o SEU catálogo: troque GRADES e CARGOS mantendo os nomes dos campos
   (o README tem o formato). Áreas e níveis vêm do dados.js.
   ============================================================================= */
window.CATALOGO = (function () {
  'use strict';
  const D = window.DADOS;

  // ---------------------------------------------------------------- 1. GRADES
  // Escala genérica de 1 a 16. O ponto médio sobe ~20% por grade; a faixa vai
  // de 80% a 120% do ponto médio (aprendiz e estágio: 90% a 110%, valor quase fixo).
  // Valores em reais por mês, FICTÍCIOS.
  const MEDIOS = { 1: 1500, 2: 2000, 3: 2400, 4: 2900, 5: 3500, 6: 4200, 7: 5100, 8: 6200,
    9: 7500, 10: 9100, 11: 11000, 12: 13300, 13: 16100, 14: 19500, 15: 26000, 16: 34000 };
  const arred = v => Math.round(v / 10) * 10;
  const GRADES = {};
  Object.keys(MEDIOS).forEach(g => {
    const m = MEDIOS[g], aberta = Number(g) <= 2 ? 0.1 : 0.2;
    GRADES[g] = { grade: Number(g), min: arred(m * (1 - aberta)), med: m, max: arred(m * (1 + aberta)) };
  });

  // ---------------------------------------------------------------- 2. NÍVEIS
  // tier agrupa os níveis que escrevem parecido (o redator usa):
  // base = em formação; exec = executa; ana = analisa; lid = lidera.
  // escMin = escolaridade mínima aceita no formulário; expPadrao = sugestão de anos.
  const NIVEIS_INFO = {
    apr: { tier: 'base', gradePadrao: 1, escMin: null, expPadrao: 0,
      desc: ['Jovem em formação pela Lei da Aprendizagem: aprende a função com um tutor.', 'Young apprentice under the Apprenticeship Law: learns the job with a mentor.'] },
    est: { tier: 'base', gradePadrao: 2, escMin: null, expPadrao: 0,
      desc: ['Estudante: apoia a área enquanto aprende.', 'Student: supports the team while learning.'] },
    ope: { tier: 'exec', gradePadrao: 4, escMin: 'fund', expPadrao: 0,
      desc: ['Executa atividades padronizadas, com procedimento definido.', 'Performs standardized tasks with a defined procedure.'] },
    tcn: { tier: 'exec', gradePadrao: 6, escMin: 'tecnico', expPadrao: 1,
      desc: ['Aplica conhecimento técnico de curso específico e resolve problemas da rotina.', 'Applies technical-school knowledge and solves day-to-day problems.'] },
    ana: { tier: 'ana', gradePadrao: 8, escMin: 'superior', expPadrao: 2,
      desc: ['Analisa, propõe e conduz processos, com autonomia na rotina.', 'Analyzes, proposes and runs processes, autonomous in the routine.'] },
    esp: { tier: 'ana', gradePadrao: 11, escMin: 'superior', expPadrao: 5,
      desc: ['Referência técnica: resolve os casos complexos e orienta outras pessoas.', 'Technical reference: solves complex cases and guides others.'] },
    coo: { tier: 'lid', gradePadrao: 12, escMin: 'tecnico', expPadrao: 3,
      desc: ['Lidera uma equipe no dia a dia e responde pelas metas dela.', 'Leads a team day to day and owns its targets.'] },
    ger: { tier: 'lid', gradePadrao: 14, escMin: 'superior', expPadrao: 5,
      desc: ['Responde por uma área inteira: pessoas, orçamento e estratégia.', 'Owns a whole area: people, budget and strategy.'] },
    dir: { tier: 'lid', gradePadrao: 15, escMin: 'superior', expPadrao: 10,
      desc: ['Responde por várias áreas e pela estratégia, junto com o CEO.', 'Owns several areas and the strategy, together with the CEO.'] }
  };
  // Ordem de cima para baixo (organograma) e de baixo para cima (formulário).
  const NIVEIS_DESC = ['dir', 'ger', 'coo', 'esp', 'ana', 'tcn', 'ope', 'est', 'apr'];
  const NIVEIS_ASC = NIVEIS_DESC.slice().reverse();
  // Ordem das colunas do organograma: cada diretoria fica em cima das suas áreas.
  const AREAS_ORDEM = ['ops', 'man', 'log', 'com', 'fin', 'tec', 'pes', 'jur'];

  // ---------------------------------------------------------------- 3. OPÇÕES
  // rot = o que a tela mostra; req = a frase que entra em "Requisitos do candidato".
  const ESCOLARIDADE = {
    fund: { ordem: 1, rot: ['Ensino fundamental', 'Elementary school'], req: ['Ensino fundamental completo', 'Completed elementary school'] },
    medio: { ordem: 2, rot: ['Ensino médio', 'High school'], req: ['Ensino médio completo', 'Completed high school'] },
    tecnico: { ordem: 3, rot: ['Curso técnico', 'Technical course'], req: ['Curso técnico completo', 'Completed technical course'], com: [' em ', ' in '] },
    superior: { ordem: 4, rot: ['Ensino superior', "Bachelor's degree"], req: ['Ensino superior completo', "Bachelor's degree"], com: [' em ', ' in '] },
    pos: { ordem: 5, rot: ['Pós-graduação', 'Postgraduate degree'], req: ['Pós-graduação completa', 'Postgraduate degree'], com: [' em ', ' in '] }
  };
  // Aprendiz e estagiário não escolhem escolaridade: a lei e o contrato já dizem.
  const ESCOLARIDADE_FIXA = {
    apr: [['Ter entre 14 e 24 anos, conforme a Lei da Aprendizagem', 'Be 14 to 24 years old, as set by the Apprenticeship Law'],
      ['Estar matriculado(a) na escola, se ainda não concluiu o ensino médio', 'Be enrolled in school if high school is not yet completed']],
    est: [['Estar cursando ensino superior', "Be currently enrolled in a bachelor's program"]]
  };
  const EXPERIENCIA = [0, 1, 2, 3, 5, 8, 10];
  const IDIOMAS = {
    ingles: ['Inglês', 'English'], espanhol: ['Espanhol', 'Spanish'], frances: ['Francês', 'French'],
    alemao: ['Alemão', 'German'], mandarim: ['Mandarim', 'Mandarin'], libras: ['Libras', 'Brazilian Sign Language (Libras)']
  };
  const NIVEIS_IDIOMA = {
    basico: ['básico', 'Basic'], intermediario: ['intermediário', 'Intermediate'],
    avancado: ['avançado', 'Advanced'], fluente: ['fluente', 'Fluent']
  };
  const VIAGENS = [
    { rot: ['Não viaja', 'No travel'], dica: ['O trabalho acontece na unidade.', 'The work happens on site.'], req: null },
    { rot: ['Eventuais', 'Occasional'], dica: ['Algumas viagens por ano.', 'A few trips a year.'], req: ['Disponibilidade para viagens eventuais', 'Availability for occasional travel'] },
    { rot: ['Frequentes', 'Frequent'], dica: ['Viagens todo mês.', 'Trips every month.'], req: ['Disponibilidade para viagens frequentes', 'Availability for frequent travel'] },
    { rot: ['Constantes', 'Constant'], dica: ['A maior parte do tempo em viagem.', 'Most of the time on the road.'], req: ['Disponibilidade para viagens constantes', 'Availability for constant travel'] }
  ];
  const TURNOS_REQ = ['Disponibilidade para trabalhar em turnos, inclusive à noite', 'Availability for shift work, including nights'];
  const CNH = ['A', 'B', 'C', 'D', 'E'];

  // ---------------------------------------------------------------- 4. COMPETÊNCIAS
  const COMPETENCIAS = {
    seguranca: [['Segurança em primeiro lugar', 'Safety first'], ['Cumpre e cobra as regras de segurança, mesmo com o prazo apertado.', 'Follows and enforces safety rules, even under deadline pressure.']],
    comunicacao: [['Comunicação clara', 'Clear communication'], ['Explica de forma simples e confere se a mensagem foi entendida.', 'Explains things simply and checks the message landed.']],
    equipe: [['Trabalho em equipe', 'Teamwork'], ['Divide informação, pede ajuda e ajuda os colegas a entregar.', 'Shares information, asks for help and helps peers deliver.']],
    cliente: [['Foco no cliente', 'Customer focus'], ['Entende o que o cliente (interno ou externo) precisa e responde no prazo.', 'Understands what the customer (internal or external) needs and responds on time.']],
    resultado: [['Orientação a resultados', 'Results orientation'], ['Assume metas, acompanha os números e corrige o rumo cedo.', 'Owns targets, tracks the numbers and corrects course early.']],
    analitico: [['Pensamento analítico', 'Analytical thinking'], ['Separa fato de opinião e usa dados para achar a causa.', 'Separates fact from opinion and uses data to find the cause.']],
    organizacao: [['Organização e planejamento', 'Planning and organization'], ['Planeja a rotina, prioriza e cumpre o combinado.', 'Plans the routine, prioritizes and keeps commitments.']],
    aprendizado: [['Aprendizado contínuo', 'Continuous learning'], ['Busca aprender, aceita feedback e compartilha o que sabe.', 'Seeks to learn, takes feedback and shares what they know.']],
    lideranca: [['Liderança de pessoas', 'People leadership'], ['Dá direção, feedback e espaço para a equipe crescer.', 'Gives direction, feedback and room for the team to grow.']],
    negocio: [['Visão do negócio', 'Business acumen'], ['Entende como a sua área gera resultado para a empresa.', 'Understands how their area creates value for the company.']],
    negociacao: [['Negociação e influência', 'Negotiation and influence'], ['Constrói acordos bons para os dois lados e defende posições com argumentos.', 'Builds win-win agreements and defends positions with arguments.']],
    melhoria: [['Melhoria contínua', 'Continuous improvement'], ['Questiona o jeito de fazer e propõe formas mais simples e seguras.', 'Questions how things are done and proposes simpler, safer ways.']],
    integridade: [['Ética e integridade', 'Ethics and integrity'], ['Age com transparência e segue as regras mesmo quando ninguém está vendo.', 'Acts transparently and follows the rules even when no one is watching.']]
  };

  // Uma responsabilidade comum a todo cargo do mesmo tier (entra no fim da lista).
  const RESP_DO_TIER = {
    base: ['Participar dos treinamentos e das reuniões da área', 'Take part in team training and meetings'],
    exec: ['Cumprir as normas de segurança e usar os equipamentos de proteção exigidos na função', 'Follow safety rules and wear the protective equipment required for the job'],
    ana: ['Propor melhorias com base em dados e acompanhar os resultados', 'Propose data-based improvements and follow up on the results'],
    lid: ['Desenvolver a equipe com feedback frequente e plano de desenvolvimento', 'Develop the team with frequent feedback and development plans']
  };

  // ---------------------------------------------------------------- 5. CARGOS
  // c(código, área, nível, grade, nome, reporta a, CBO, missão, responsabilidades,
  //   requisitos, competências, extras)
  // requisitos = { esc, form, exp, idi, via, tur, cnh, extra } (os campos do formulário).
  // peso = quanto do grupo (área + nível) este cargo leva na distribuição da demo;
  // peso 0 = cargo criado há pouco, ainda sem ninguém.
  const CARGOS = [];
  function c(codigo, area, nivel, grade, nome, reportaA, cbo, missao, resp, req, comp, extras) {
    CARGOS.push(Object.assign({ codigo, area, nivel, grade, nome, reportaA, cbo, missao, resp,
      req: Object.assign({ esc: null, form: null, exp: 0, idi: [], via: 0, tur: false, cnh: null, extra: [] }, req),
      comp, peso: 1, criadoEm: '2023-01-02', origem: 'catalogo' }, extras || {}));
  }

  // ---- Diretoria
  c('CG-001', 'dir', 'dir', 16, ['Diretor(a) Presidente (CEO)', 'Chief Executive Officer (CEO)'], null, '1210-10',
    ['Conduzir a empresa para crescer com resultado, segurança e integridade, definindo a estratégia junto com o conselho.', 'Lead the company to grow with results, safety and integrity, setting strategy together with the board.'],
    [['Definir a estratégia e as metas anuais com o conselho', 'Set strategy and annual targets with the board'],
      ['Acompanhar os resultados de todas as diretorias', 'Track the results of every division'],
      ['Representar a empresa junto a clientes, parceiros e investidores', 'Represent the company before customers, partners and investors']],
    { esc: 'pos', form: ['gestão de negócios (MBA)', 'business management (MBA)'], exp: 15, idi: [['ingles', 'fluente']], via: 2,
      extra: [['Vivência como executivo(a) principal de empresa industrial', 'Track record as the top executive of an industrial company']] },
    ['negocio', 'lideranca', 'integridade', 'negociacao', 'resultado']);
  c('CG-002', 'dir', 'dir', 15, ['Diretor(a) de Operações', 'Operations Director'], 'CG-001', '1222-05',
    ['Garantir que a fábrica, a manutenção e a logística entreguem o plano com segurança, qualidade e custo competitivo.', 'Ensure the plant, maintenance and logistics deliver the plan safely, on quality and at a competitive cost.'],
    [['Garantir o plano de produção com segurança, qualidade e custo', 'Deliver the production plan safely, on quality and on cost'],
      ['Aprovar os investimentos em máquinas e melhorias da fábrica', 'Approve investments in plant machinery and improvements'],
      ['Conduzir os indicadores de segurança das operações', 'Own the safety indicators of operations']],
    { esc: 'superior', form: ['Engenharia', 'Engineering'], exp: 12, idi: [['ingles', 'avancado']], via: 1,
      extra: [['Experiência em gestão de operações industriais', 'Experience running industrial operations']] },
    ['lideranca', 'seguranca', 'resultado', 'negocio', 'integridade']);
  c('CG-003', 'dir', 'dir', 15, ['Diretor(a) Comercial', 'Sales Director'], 'CG-001', '1233-05',
    ['Fazer a receita crescer com margem saudável, cuidando da relação com os clientes e da força de vendas.', 'Grow revenue with healthy margins, caring for customer relationships and the sales force.'],
    [['Definir metas de vendas por canal e região', 'Set sales targets by channel and region'],
      ['Negociar com os maiores clientes da carteira', 'Negotiate with the largest accounts'],
      ['Acompanhar margem, preço e inadimplência', 'Monitor margin, pricing and delinquency']],
    { esc: 'superior', form: ['Administração, Marketing ou Engenharia', 'Business, Marketing or Engineering'], exp: 12, idi: [['ingles', 'avancado']], via: 2,
      extra: [['Experiência em gestão comercial B2B', 'Experience in B2B sales management']] },
    ['lideranca', 'negociacao', 'cliente', 'resultado', 'negocio']);
  c('CG-004', 'dir', 'dir', 15, ['Diretor(a) Administrativo(a) e Financeiro(a)', 'Finance and Administration Director'], 'CG-001', '1231-10',
    ['Dar às áreas de apoio (finanças, tecnologia, pessoas e jurídico) a direção para servir bem ao negócio, com caixa saudável e riscos sob controle.', 'Give the support areas (finance, technology, people and legal) the direction to serve the business well, with healthy cash and risks under control.'],
    [['Aprovar o orçamento anual e acompanhar a execução', 'Approve the annual budget and follow its execution'],
      ['Garantir a saúde do caixa e o cumprimento fiscal', 'Safeguard cash health and tax compliance'],
      ['Conduzir as áreas de apoio para servir bem às operações', 'Run the support areas so they serve operations well']],
    { esc: 'superior', form: ['Ciências Contábeis, Economia ou Administração', 'Accounting, Economics or Business'], exp: 12, idi: [['ingles', 'avancado']], via: 1,
      extra: [['Experiência em finanças corporativas e gestão de áreas de apoio', 'Experience in corporate finance and managing support functions']] },
    ['lideranca', 'integridade', 'analitico', 'negocio', 'resultado']);

  // ---- Operações (a fábrica)
  c('CG-101', 'ops', 'ger', 14, ['Gerente de Operações', 'Operations Manager'], 'CG-002', '1412-05',
    ['Liderar a produção da fábrica para entregar o volume planejado com segurança, qualidade e o menor custo possível.', 'Lead plant production to deliver the planned volume safely, on quality and at the lowest possible cost.'],
    [['Planejar a capacidade da fábrica para o mês e o ano', 'Plan plant capacity for the month and the year'],
      ['Acompanhar produtividade, perdas e custo por unidade', 'Track productivity, losses and unit cost'],
      ['Garantir que segurança e qualidade venham antes do volume', 'Make sure safety and quality come before volume']],
    { esc: 'superior', form: ['Engenharia de Produção, Química ou Mecânica', 'Production, Chemical or Mechanical Engineering'], exp: 8, via: 1,
      extra: [['Experiência em gestão de produção industrial', 'Experience managing industrial production']] },
    ['lideranca', 'resultado', 'seguranca', 'negocio', 'melhoria']);
  c('CG-102', 'ops', 'coo', 12, ['Coordenador(a) de Produção', 'Production Coordinator'], 'CG-101', '3911-25',
    ['Coordenar a produção de um turno, garantindo pessoas, máquinas e materiais no lugar certo para cumprir o plano.', "Coordinate one shift's production, making sure people, machines and materials are in place to meet the plan."],
    [['Distribuir as pessoas e as ordens de produção do turno', 'Assign people and production orders for the shift'],
      ['Conduzir a reunião de início de turno com os indicadores do dia', "Run the shift start meeting with the day's indicators"],
      ['Tratar desvios de qualidade e paradas junto com a manutenção', 'Handle quality deviations and stoppages together with maintenance']],
    { esc: 'tecnico', form: ['Processos Industriais ou áreas afins', 'Industrial Processes or related fields'], exp: 3, tur: true,
      extra: [['Experiência em liderança de equipes de produção', 'Experience leading production teams']] },
    ['lideranca', 'seguranca', 'comunicacao', 'resultado', 'organizacao']);
  c('CG-103', 'ops', 'esp', 11, ['Especialista em Melhoria Contínua', 'Continuous Improvement Specialist'], 'CG-101', '2149-05',
    ['Reduzir perdas e simplificar os processos da fábrica com método, dados e o envolvimento de quem faz.', 'Reduce losses and simplify plant processes with method, data and the involvement of the people doing the work.'],
    [['Conduzir projetos de redução de perdas com método estruturado (PDCA, Lean)', 'Lead loss-reduction projects with a structured method (PDCA, Lean)'],
      ['Treinar líderes e operadores em ferramentas de melhoria', 'Train leaders and operators in improvement tools'],
      ['Medir e comprovar os ganhos de cada projeto', 'Measure and prove the gains of each project']],
    { esc: 'superior', form: ['Engenharia', 'Engineering'], exp: 5,
      extra: [['Certificação Green Belt ou Black Belt em Lean Seis Sigma', 'Lean Six Sigma Green Belt or Black Belt certification']] },
    ['melhoria', 'analitico', 'comunicacao', 'resultado', 'aprendizado']);
  c('CG-104', 'ops', 'ana', 8, ['Analista de PCP', 'Production Planning Analyst'], 'CG-102', '3911-25',
    ['Planejar e controlar a produção para que a fábrica produza o que o cliente precisa, no prazo e sem estoque parado.', 'Plan and control production so the plant makes what customers need, on time and without idle inventory.'],
    [['Montar o plano semanal de produção a partir da previsão de vendas', 'Build the weekly production plan from the sales forecast'],
      ['Calcular a necessidade de materiais e avisar compras com antecedência', 'Calculate material needs and alert purchasing in advance'],
      ['Acompanhar o plano contra o realizado e replanejar quando preciso', 'Track plan versus actual and replan when needed']],
    { esc: 'superior', form: ['Engenharia de Produção ou Administração', 'Production Engineering or Business'], exp: 2,
      extra: [['Conhecimento de planejamento de materiais (MRP) e Excel avançado', 'Knowledge of material requirements planning (MRP) and advanced Excel']] },
    ['analitico', 'organizacao', 'comunicacao', 'cliente']);
  c('CG-105', 'ops', 'ana', 8, ['Analista de Qualidade', 'Quality Analyst'], 'CG-102', '3912-05',
    ['Garantir que o produto chegue ao cliente dentro da especificação, tratando as causas dos problemas de qualidade.', 'Ensure the product reaches customers within specification by tackling the root causes of quality problems.'],
    [['Analisar as reclamações de clientes e conduzir a análise de causa', 'Analyze customer complaints and lead root-cause analysis'],
      ['Manter os planos de inspeção e as especificações atualizados', 'Keep inspection plans and specifications up to date'],
      ['Preparar a fábrica para auditorias internas e de certificação', 'Prepare the plant for internal and certification audits']],
    { esc: 'superior', form: ['Engenharia, Química ou áreas afins', 'Engineering, Chemistry or related fields'], exp: 2,
      extra: [['Conhecimento da norma ISO 9001 e de ferramentas da qualidade', 'Knowledge of ISO 9001 and quality tools']] },
    ['analitico', 'integridade', 'cliente', 'melhoria']);
  c('CG-106', 'ops', 'tcn', 7, ['Técnico(a) de Processos', 'Process Technician'], 'CG-102', '3115-05',
    ['Manter os parâmetros das linhas de produção estáveis e dentro do padrão técnico.', 'Keep production line parameters stable and within the technical standard.'],
    [['Ajustar e registrar os parâmetros das linhas de produção', 'Adjust and record production line parameters'],
      ['Apoiar a partida de novos produtos e os testes de linha', 'Support new product start-ups and line trials'],
      ['Investigar variações de processo e propor correções', 'Investigate process variation and propose fixes']],
    { esc: 'tecnico', form: ['Química, Mecânica ou Processos Industriais', 'Chemistry, Mechanics or Industrial Processes'], exp: 1, tur: true },
    ['analitico', 'seguranca', 'melhoria', 'equipe']);
  c('CG-107', 'ops', 'tcn', 6, ['Técnico(a) de Qualidade', 'Quality Technician'], 'CG-102', '3912-05',
    ['Inspecionar materiais e produtos para que nada fora da especificação siga adiante.', 'Inspect materials and products so nothing out of specification moves forward.'],
    [['Inspecionar matérias-primas e produtos conforme o plano', 'Inspect raw materials and products per the plan'],
      ['Registrar não conformidades e separar o material suspeito', 'Record nonconformities and quarantine suspect material'],
      ['Calibrar e conservar os instrumentos de medição', 'Calibrate and care for measuring instruments']],
    { esc: 'tecnico', form: ['Química, Alimentos ou Qualidade', 'Chemistry, Food or Quality'], exp: 1, tur: true },
    ['integridade', 'organizacao', 'seguranca', 'equipe']);
  c('CG-108', 'ops', 'ope', 5, ['Operador(a) de Produção II', 'Production Operator II'], 'CG-102', '7842-05',
    ['Operar e ajustar as linhas de produção com autonomia, servindo de referência para os operadores do turno.', "Run and adjust production lines autonomously, serving as a reference for the shift's operators."],
    [['Operar e ajustar as máquinas da linha conforme o procedimento padrão', 'Run and adjust line machinery per the standard procedure'],
      ['Fazer a troca de produto (setup) com o mínimo de parada', 'Perform product changeovers with minimal downtime'],
      ['Orientar os operadores novos no posto de trabalho', 'Coach new operators at the workstation']],
    { esc: 'medio', exp: 2, tur: true, extra: [['Experiência em setup e ajuste de máquinas', 'Experience in machine setup and adjustment']] },
    ['seguranca', 'equipe', 'melhoria', 'aprendizado'], { peso: 12 });
  c('CG-109', 'ops', 'ope', 4, ['Operador(a) de Produção I', 'Production Operator I'], 'CG-102', '7842-05',
    ['Operar as máquinas da linha com segurança, qualidade e no ritmo planejado.', 'Run line machinery safely, on quality and at the planned pace.'],
    [['Operar as máquinas da linha conforme o procedimento padrão', 'Run line machinery per the standard procedure'],
      ['Fazer as verificações de qualidade do posto e registrar os resultados', 'Perform workstation quality checks and record the results'],
      ['Manter o posto limpo e organizado (5S)', 'Keep the workstation clean and organized (5S)']],
    { esc: 'medio', exp: 0, tur: true },
    ['seguranca', 'equipe', 'organizacao', 'aprendizado'], { peso: 15 });
  c('CG-110', 'ops', 'ope', 3, ['Auxiliar de Produção', 'Production Assistant'], 'CG-102', '7842-05',
    ['Manter a linha abastecida e os produtos embalados, para que a produção não pare.', 'Keep the line supplied and products packed so production never stops.'],
    [['Abastecer a linha com materiais e embalagens', 'Supply the line with materials and packaging'],
      ['Embalar, etiquetar e paletizar os produtos acabados', 'Pack, label and palletize finished goods'],
      ['Separar e descartar resíduos conforme a coleta seletiva', 'Sort and dispose of waste per the recycling program']],
    { esc: 'fund', exp: 0, tur: true },
    ['seguranca', 'equipe', 'organizacao'], { peso: 10 });
  c('CG-111', 'ops', 'apr', 1, ['Aprendiz de Produção', 'Production Apprentice'], 'CG-102', '7842-05',
    ['Aprender na prática a rotina de uma linha de produção, com tutor e o programa de aprendizagem.', 'Learn the routine of a production line on the job, with a mentor and the apprenticeship program.'],
    [['Acompanhar os operadores nas atividades da linha', 'Shadow operators in line activities'],
      ['Executar tarefas simples do posto com supervisão', 'Perform simple workstation tasks under supervision'],
      ['Participar das aulas do programa de aprendizagem', 'Attend the apprenticeship program classes']],
    { esc: 'apr' }, ['aprendizado', 'seguranca', 'equipe']);

  // ---- Manutenção
  c('CG-201', 'man', 'ger', 14, ['Gerente de Manutenção', 'Maintenance Manager'], 'CG-002', '1412-10',
    ['Garantir máquinas e instalações disponíveis e seguras, com o menor custo de manutenção ao longo da vida dos equipamentos.', "Keep machines and facilities available and safe at the lowest maintenance cost over the equipment's life."],
    [['Definir a estratégia de manutenção preventiva e preditiva', 'Set the preventive and predictive maintenance strategy'],
      ['Gerir o orçamento de manutenção e o estoque de peças', 'Manage the maintenance budget and spare-parts stock'],
      ['Acompanhar a disponibilidade das máquinas e o tempo médio entre falhas', 'Track machine availability and mean time between failures']],
    { esc: 'superior', form: ['Engenharia Mecânica, Elétrica ou de Produção', 'Mechanical, Electrical or Production Engineering'], exp: 8 },
    ['lideranca', 'resultado', 'seguranca', 'analitico', 'negocio']);
  c('CG-202', 'man', 'coo', 12, ['Coordenador(a) de Manutenção', 'Maintenance Coordinator'], 'CG-201', '9101-15',
    ['Coordenar a equipe de manutenção do turno para que as ordens de serviço sejam executadas com segurança e no prazo.', "Coordinate the shift's maintenance team so work orders are done safely and on time."],
    [['Programar as ordens de serviço da semana com a produção', "Schedule the week's work orders with production"],
      ['Distribuir os técnicos e acompanhar a execução das ordens', 'Assign technicians and follow work-order execution'],
      ['Garantir o bloqueio e a etiquetagem de energias em toda intervenção', 'Ensure lockout-tagout on every intervention']],
    { esc: 'tecnico', form: ['Mecânica, Eletrotécnica ou Eletromecânica', 'Mechanics, Electrical or Electromechanics'], exp: 3, tur: true,
      extra: [['Experiência em liderança de equipes de manutenção', 'Experience leading maintenance teams']] },
    ['lideranca', 'seguranca', 'organizacao', 'comunicacao']);
  c('CG-203', 'man', 'esp', 11, ['Especialista em Confiabilidade', 'Reliability Specialist'], 'CG-201', '2144-05',
    ['Aumentar o tempo entre falhas dos equipamentos críticos com análise de causa e manutenção preditiva.', 'Increase the time between failures of critical equipment through root-cause analysis and predictive maintenance.'],
    [['Analisar falhas recorrentes e definir ações de bloqueio', 'Analyze recurring failures and define containment actions'],
      ['Montar os planos de manutenção preditiva (vibração, termografia)', 'Build predictive maintenance plans (vibration, thermography)'],
      ['Calcular e divulgar os indicadores de confiabilidade', 'Calculate and share reliability indicators']],
    { esc: 'superior', form: ['Engenharia Mecânica ou Elétrica', 'Mechanical or Electrical Engineering'], exp: 5,
      extra: [['Experiência com análise de falhas (RCA, FMEA)', 'Experience with failure analysis (RCA, FMEA)']] },
    ['analitico', 'melhoria', 'comunicacao', 'aprendizado']);
  c('CG-204', 'man', 'esp', 11, ['Especialista em Automação', 'Automation Specialist'], 'CG-201', '2021-10',
    ['Automatizar e manter os sistemas de controle da fábrica, tornando as linhas mais seguras e produtivas.', 'Automate and maintain plant control systems, making lines safer and more productive.'],
    [['Programar e manter os controladores lógicos (CLP) das linhas', "Program and maintain the lines' programmable logic controllers (PLC)"],
      ['Conduzir projetos de automação de postos manuais', 'Lead projects to automate manual workstations'],
      ['Padronizar a documentação elétrica e de software das máquinas', 'Standardize electrical and software documentation of machines']],
    { esc: 'superior', form: ['Engenharia de Controle e Automação ou Elétrica', 'Control and Automation or Electrical Engineering'], exp: 5,
      idi: [['ingles', 'intermediario']], extra: [['Experiência com programação de CLP e redes industriais', 'Experience with PLC programming and industrial networks']] },
    ['analitico', 'melhoria', 'seguranca', 'aprendizado'], { peso: 0, criadoEm: '2026-07-15' });
  c('CG-205', 'man', 'ana', 8, ['Analista de Planejamento de Manutenção', 'Maintenance Planning Analyst'], 'CG-202', '3911-15',
    ['Planejar a manutenção para que cada intervenção aconteça na hora certa, com peças e pessoas disponíveis.', 'Plan maintenance so every intervention happens at the right time, with parts and people available.'],
    [['Planejar as ordens preventivas com materiais e mão de obra', 'Plan preventive work orders with materials and labor'],
      ['Manter o cadastro de equipamentos e planos no sistema', 'Keep equipment records and plans up to date in the system'],
      ['Emitir os relatórios de pendências e de cumprimento do plano', 'Issue backlog and plan-compliance reports']],
    { esc: 'superior', form: ['Engenharia ou Administração', 'Engineering or Business'], exp: 2,
      extra: [['Conhecimento de sistema de gestão da manutenção', 'Knowledge of a computerized maintenance management system (CMMS)']] },
    ['organizacao', 'analitico', 'comunicacao', 'cliente']);
  c('CG-206', 'man', 'tcn', 7, ['Técnico(a) em Mecânica', 'Mechanical Technician'], 'CG-202', '3141-10',
    ['Manter os sistemas mecânicos das máquinas funcionando com segurança e confiabilidade.', "Keep the machines' mechanical systems running safely and reliably."],
    [['Executar a manutenção preventiva e corretiva em sistemas mecânicos', 'Perform preventive and corrective maintenance on mechanical systems'],
      ['Diagnosticar falhas em rolamentos, redutores e transmissões', 'Diagnose failures in bearings, gearboxes and drives'],
      ['Registrar os serviços executados na ordem de serviço', 'Record completed work on the work order']],
    { esc: 'tecnico', form: ['Mecânica ou Eletromecânica', 'Mechanics or Electromechanics'], exp: 1, tur: true,
      extra: [['Certificado NR-12 (segurança em máquinas)', 'NR-12 machine safety certificate']] },
    ['seguranca', 'analitico', 'equipe', 'aprendizado'], { peso: 12 });
  c('CG-207', 'man', 'tcn', 7, ['Técnico(a) em Eletroeletrônica', 'Electrical and Electronics Technician'], 'CG-202', '3131-05',
    ['Manter os sistemas elétricos e eletrônicos das máquinas funcionando com segurança.', "Keep the machines' electrical and electronic systems running safely."],
    [['Executar a manutenção em painéis, motores e inversores', 'Maintain panels, motors and drives'],
      ['Diagnosticar falhas em sensores e circuitos de comando', 'Diagnose faults in sensors and control circuits'],
      ['Seguir os procedimentos de trabalho em eletricidade', 'Follow electrical work procedures']],
    { esc: 'tecnico', form: ['Eletrotécnica ou Eletroeletrônica', 'Electrical or Electronics'], exp: 1, tur: true,
      extra: [['Certificado NR-10 (segurança em eletricidade)', 'NR-10 electrical safety certificate']] },
    ['seguranca', 'analitico', 'equipe', 'aprendizado'], { peso: 10 });
  c('CG-208', 'man', 'ope', 4, ['Auxiliar de Manutenção', 'Maintenance Assistant'], 'CG-202', '9113-05',
    ['Apoiar os técnicos para que a manutenção aconteça rápido, limpa e organizada.', 'Support technicians so maintenance happens fast, clean and organized.'],
    [['Preparar ferramentas, peças e a área de trabalho para os técnicos', 'Prepare tools, parts and the work area for technicians'],
      ['Executar a lubrificação e a limpeza técnica dos equipamentos', 'Carry out lubrication and technical cleaning of equipment'],
      ['Controlar a entrada e a saída de ferramentas da oficina', 'Control tool check-in and check-out in the workshop']],
    { esc: 'medio', exp: 0, tur: true }, ['seguranca', 'equipe', 'organizacao']);
  c('CG-209', 'man', 'apr', 1, ['Aprendiz de Manutenção', 'Maintenance Apprentice'], 'CG-202', '9113-05',
    ['Aprender na prática a rotina de manutenção industrial, com tutor e o programa de aprendizagem.', 'Learn the industrial maintenance routine on the job, with a mentor and the apprenticeship program.'],
    [['Acompanhar os técnicos nas ordens de manutenção', 'Shadow technicians on maintenance work orders'],
      ['Organizar ferramentas e peças da oficina com supervisão', 'Organize workshop tools and parts under supervision'],
      ['Participar das aulas do programa de aprendizagem', 'Attend the apprenticeship program classes']],
    { esc: 'apr' }, ['aprendizado', 'seguranca', 'equipe']);

  // ---- Logística
  c('CG-301', 'log', 'ger', 14, ['Gerente de Logística e Suprimentos', 'Logistics and Procurement Manager'], 'CG-002', '1416-05',
    ['Garantir que materiais cheguem à fábrica e produtos cheguem aos clientes no prazo, com o menor custo logístico.', 'Ensure materials reach the plant and products reach customers on time, at the lowest logistics cost.'],
    [['Garantir o abastecimento da fábrica e a entrega aos clientes', 'Ensure plant supply and customer deliveries'],
      ['Negociar os contratos de transporte e de fornecedores estratégicos', 'Negotiate transport and strategic supplier contracts'],
      ['Acompanhar nível de serviço, estoque e custo logístico', 'Track service level, inventory and logistics cost']],
    { esc: 'superior', form: ['Administração, Engenharia ou Logística', 'Business, Engineering or Logistics'], exp: 8, via: 1 },
    ['lideranca', 'negociacao', 'resultado', 'negocio', 'cliente']);
  c('CG-302', 'log', 'coo', 11, ['Coordenador(a) do Centro de Distribuição', 'Distribution Center Coordinator'], 'CG-301', '4141-15',
    ['Coordenar o centro de distribuição para receber, guardar e expedir certo, no prazo e com segurança.', 'Coordinate the distribution center to receive, store and ship correctly, on time and safely.'],
    [['Organizar o recebimento, a armazenagem e a expedição do dia', "Organize the day's receiving, storage and shipping"],
      ['Acompanhar a acuracidade do estoque e o prazo de entrega', 'Track inventory accuracy and delivery lead time'],
      ['Garantir a segurança na movimentação de cargas', 'Ensure safe material handling']],
    { esc: 'tecnico', form: ['Logística ou áreas afins', 'Logistics or related fields'], exp: 3,
      extra: [['Experiência em liderança de armazém ou centro de distribuição', 'Experience leading a warehouse or distribution center']] },
    ['lideranca', 'organizacao', 'seguranca', 'cliente']);
  c('CG-303', 'log', 'ana', 8, ['Analista de Logística', 'Logistics Analyst'], 'CG-302', '2522-05',
    ['Planejar o transporte para que cada entrega chegue no prazo pelo menor custo.', 'Plan transportation so every delivery arrives on time at the lowest cost.'],
    [['Programar as cargas e contratar o frete de cada rota', 'Schedule loads and book freight for each route'],
      ['Acompanhar as entregas e tratar as ocorrências com as transportadoras', 'Track deliveries and handle issues with carriers'],
      ['Conferir e aprovar as faturas de frete', 'Check and approve freight invoices']],
    { esc: 'superior', form: ['Logística, Administração ou Engenharia', 'Logistics, Business or Engineering'], exp: 2,
      extra: [['Conhecimento de sistema de gestão de transporte (TMS)', 'Knowledge of a transportation management system (TMS)']] },
    ['organizacao', 'analitico', 'negociacao', 'cliente'], { peso: 4 });
  c('CG-304', 'log', 'ana', 8, ['Analista de Suprimentos', 'Procurement Analyst'], 'CG-301', '3542-05',
    ['Comprar materiais e serviços com qualidade, prazo e preço competitivo, cuidando da relação com os fornecedores.', 'Buy materials and services with quality, on time and at a competitive price, caring for supplier relationships.'],
    [['Cotar, negociar e emitir os pedidos de compra', 'Request quotes, negotiate and issue purchase orders'],
      ['Desenvolver e avaliar os fornecedores', 'Develop and evaluate suppliers'],
      ['Acompanhar os prazos de entrega e cobrar atrasos', 'Follow up delivery dates and chase delays']],
    { esc: 'superior', form: ['Administração ou Engenharia', 'Business or Engineering'], exp: 2, via: 1,
      extra: [['Experiência em compras industriais', 'Experience in industrial purchasing']] },
    ['negociacao', 'integridade', 'organizacao', 'analitico'], { peso: 3 });
  c('CG-305', 'log', 'tcn', 6, ['Técnico(a) em Logística', 'Logistics Technician'], 'CG-302', '3912-30',
    ['Manter o estoque do armazém correto, organizado e fácil de encontrar.', 'Keep warehouse inventory accurate, organized and easy to find.'],
    [['Fazer os inventários rotativos e investigar divergências', 'Run cycle counts and investigate discrepancies'],
      ['Lançar as entradas e saídas de materiais no sistema', 'Post material receipts and issues in the system'],
      ['Organizar o endereçamento e a identificação do armazém', 'Organize warehouse locations and labeling']],
    { esc: 'tecnico', form: ['Logística', 'Logistics'], exp: 1 }, ['organizacao', 'integridade', 'equipe']);
  c('CG-306', 'log', 'ope', 5, ['Operador(a) de Empilhadeira', 'Forklift Operator'], 'CG-302', '7822-20',
    ['Movimentar as cargas do armazém com segurança e no tempo certo.', 'Move warehouse loads safely and on time.'],
    [['Carregar e descarregar caminhões com segurança', 'Load and unload trucks safely'],
      ['Movimentar e armazenar paletes nos endereços corretos', 'Move and store pallets in the right locations'],
      ['Fazer o checklist diário da empilhadeira', 'Perform the daily forklift checklist']],
    { esc: 'medio', exp: 1, tur: true, extra: [['Curso de operador de empilhadeira (NR-11) válido', 'Valid forklift operator course (NR-11)']] },
    ['seguranca', 'organizacao', 'equipe'], { peso: 5 });
  c('CG-307', 'log', 'ope', 4, ['Conferente', 'Warehouse Checker'], 'CG-302', '4141-25',
    ['Garantir que o que entra e o que sai do armazém esteja certo em quantidade e estado.', 'Make sure what enters and leaves the warehouse is right in quantity and condition.'],
    [['Conferir a quantidade e o estado das mercadorias recebidas e expedidas', 'Check quantity and condition of received and shipped goods'],
      ['Registrar divergências e avarias com foto e observação', 'Record discrepancies and damage with photo and notes'],
      ['Separar os pedidos conforme a lista de separação', 'Pick orders according to the pick list']],
    { esc: 'medio', exp: 1, tur: true }, ['integridade', 'organizacao', 'equipe'], { peso: 4 });
  c('CG-308', 'log', 'ope', 3, ['Auxiliar de Logística', 'Logistics Assistant'], 'CG-302', '7841-05',
    ['Separar e embalar os pedidos para que saiam completos e no prazo.', 'Pick and pack orders so they ship complete and on time.'],
    [['Separar e embalar os pedidos para expedição', 'Pick and pack orders for shipping'],
      ['Etiquetar os volumes e organizar a área de expedição', 'Label packages and organize the shipping area'],
      ['Apoiar o recebimento de cargas', 'Support inbound receiving']],
    { esc: 'fund', exp: 0, tur: true }, ['seguranca', 'equipe', 'organizacao'], { peso: 6 });
  c('CG-309', 'log', 'apr', 1, ['Aprendiz de Logística', 'Logistics Apprentice'], 'CG-302', '4141-05',
    ['Aprender na prática a rotina de um centro de distribuição, com tutor e o programa de aprendizagem.', 'Learn the routine of a distribution center on the job, with a mentor and the apprenticeship program.'],
    [['Acompanhar as rotinas de recebimento e expedição', 'Shadow receiving and shipping routines'],
      ['Apoiar a organização do armazém com supervisão', 'Help organize the warehouse under supervision'],
      ['Participar das aulas do programa de aprendizagem', 'Attend the apprenticeship program classes']],
    { esc: 'apr' }, ['aprendizado', 'seguranca', 'equipe']);

  // ---- Comercial
  c('CG-401', 'com', 'ger', 14, ['Gerente Comercial', 'Sales Manager'], 'CG-003', '1423-05',
    ['Liderar a equipe de vendas para bater as metas de receita e margem, com clientes satisfeitos.', 'Lead the sales team to hit revenue and margin targets with satisfied customers.'],
    [['Desdobrar as metas de vendas por canal e por vendedor', 'Break sales targets down by channel and seller'],
      ['Acompanhar o funil de vendas e a previsão do mês', 'Track the sales pipeline and the monthly forecast'],
      ['Negociar condições especiais com clientes estratégicos', 'Negotiate special terms with strategic accounts']],
    { esc: 'superior', form: ['Administração, Marketing ou Engenharia', 'Business, Marketing or Engineering'], exp: 8,
      idi: [['ingles', 'intermediario']], via: 2, cnh: 'B' },
    ['lideranca', 'negociacao', 'resultado', 'cliente', 'negocio']);
  c('CG-402', 'com', 'coo', 12, ['Coordenador(a) Comercial', 'Sales Coordinator'], 'CG-401', '3541-25',
    ['Coordenar a equipe de vendas internas para atender bem a carteira e cumprir as metas do mês.', 'Coordinate the inside sales team to serve the portfolio well and meet monthly targets.'],
    [['Acompanhar a carteira e as visitas da equipe', "Follow the team's accounts and visits"],
      ['Treinar a equipe em produto e em técnicas de negociação', 'Train the team on product and negotiation techniques'],
      ['Aprovar descontos dentro da política comercial', 'Approve discounts within the sales policy']],
    { esc: 'superior', form: ['Administração ou Marketing', 'Business or Marketing'], exp: 3,
      extra: [['Experiência em liderança de equipe comercial', 'Experience leading a sales team']] },
    ['lideranca', 'negociacao', 'cliente', 'comunicacao']);
  c('CG-403', 'com', 'esp', 11, ['Especialista em Grandes Contas', 'Key Account Specialist'], 'CG-401', '3541-30',
    ['Fazer crescer o negócio com as maiores redes clientes, com planos conjuntos e negociação ganha-ganha.', 'Grow business with the largest retail accounts through joint plans and win-win negotiation.'],
    [['Conduzir o plano de negócios anual de cada grande conta', 'Run the annual business plan for each key account'],
      ['Negociar contratos, verbas e ações promocionais', 'Negotiate contracts, trade budgets and promotions'],
      ['Acompanhar o giro e a falta de produto nas lojas do cliente', "Track sell-out and stock-outs in the customer's stores"]],
    { esc: 'superior', form: ['Administração ou Marketing', 'Business or Marketing'], exp: 5, via: 2, cnh: 'B',
      extra: [['Experiência com grandes redes de varejo', 'Experience with large retail chains']] },
    ['negociacao', 'cliente', 'negocio', 'resultado']);
  c('CG-404', 'com', 'ana', 9, ['Executivo(a) de Vendas', 'Account Executive'], 'CG-402', '3541-25',
    ['Conquistar e manter clientes de médio porte, levando a venda do primeiro contato ao pós-venda.', 'Win and keep mid-sized customers, taking the sale from first contact to after-sales.'],
    [['Prospectar clientes e conduzir as negociações até o fechamento', 'Prospect customers and lead negotiations to close'],
      ['Manter a carteira atualizada no CRM', 'Keep the account portfolio up to date in the CRM'],
      ['Visitar clientes e acompanhar a satisfação pós-venda', 'Visit customers and follow after-sales satisfaction']],
    { esc: 'superior', form: ['Administração, Marketing ou áreas afins', 'Business, Marketing or related fields'], exp: 2, via: 2, cnh: 'B' },
    ['negociacao', 'cliente', 'resultado', 'comunicacao'], { peso: 8 });
  c('CG-405', 'com', 'ana', 8, ['Analista Comercial', 'Sales Analyst'], 'CG-402', '2521-05',
    ['Dar à equipe de vendas pedidos bem cadastrados e números confiáveis para decidir.', 'Give the sales team well-entered orders and reliable numbers to decide on.'],
    [['Cadastrar os pedidos e acompanhar o faturamento', 'Enter orders and follow invoicing'],
      ['Montar os relatórios de vendas por cliente e por produto', 'Build sales reports by customer and product'],
      ['Atender os clientes em dúvidas sobre pedidos e prazos', 'Answer customer questions about orders and lead times']],
    { esc: 'superior', form: ['Administração ou áreas afins', 'Business or related fields'], exp: 1,
      extra: [['Excel avançado e experiência com CRM', 'Advanced Excel and CRM experience']] },
    ['cliente', 'analitico', 'organizacao', 'comunicacao'], { peso: 8 });
  c('CG-406', 'com', 'ana', 8, ['Analista de Marketing', 'Marketing Analyst'], 'CG-401', '2531-15',
    ['Fortalecer a marca e gerar demanda com campanhas medidas pelo resultado.', 'Strengthen the brand and generate demand with campaigns measured by results.'],
    [['Planejar as campanhas e os materiais de ponto de venda', 'Plan campaigns and point-of-sale materials'],
      ['Acompanhar os resultados das ações e o retorno de cada uma', 'Track campaign results and the return of each'],
      ['Cuidar do conteúdo da marca nos canais digitais', 'Manage brand content on digital channels']],
    { esc: 'superior', form: ['Marketing, Publicidade ou Administração', 'Marketing, Advertising or Business'], exp: 2 },
    ['cliente', 'comunicacao', 'analitico', 'melhoria'], { peso: 4 });
  c('CG-407', 'com', 'est', 2, ['Estagiário(a) Comercial', 'Sales Intern'], 'CG-402', '2521-05',
    ['Apoiar a rotina comercial enquanto aplica na prática o que aprende no curso.', 'Support the sales routine while putting coursework into practice.'],
    [['Apoiar o cadastro de pedidos e de clientes', 'Support order and customer data entry'],
      ['Atualizar as planilhas e os relatórios de vendas', 'Update sales spreadsheets and reports'],
      ['Participar das reuniões da equipe e dos treinamentos', 'Join team meetings and training']],
    { esc: 'est', form: ['Administração, Marketing ou áreas afins', 'Business, Marketing or related fields'] },
    ['aprendizado', 'cliente', 'organizacao']);

  // ---- Financeiro
  c('CG-501', 'fin', 'ger', 14, ['Gerente Financeiro(a)', 'Finance Manager'], 'CG-004', '1421-15',
    ['Garantir números confiáveis, caixa saudável e impostos em dia, apoiando a diretoria nas decisões.', 'Ensure reliable numbers, healthy cash and taxes up to date, supporting leadership decisions.'],
    [['Fechar o resultado mensal e explicar as variações', 'Close the monthly results and explain variances'],
      ['Gerir o fluxo de caixa e o relacionamento com os bancos', 'Manage cash flow and banking relationships'],
      ['Garantir o cumprimento das obrigações fiscais', 'Ensure tax compliance']],
    { esc: 'superior', form: ['Ciências Contábeis, Economia ou Administração', 'Accounting, Economics or Business'], exp: 8, idi: [['ingles', 'intermediario']] },
    ['lideranca', 'analitico', 'integridade', 'negocio', 'resultado']);
  c('CG-502', 'fin', 'coo', 12, ['Coordenador(a) de Controladoria', 'Controllership Coordinator'], 'CG-501', '2522-10',
    ['Coordenar o fechamento contábil e o orçamento para que a empresa saiba, todo mês, onde ganha e onde perde.', 'Coordinate the accounting close and budget so the company knows, every month, where it gains and loses.'],
    [['Coordenar o calendário de fechamento contábil', 'Coordinate the accounting close calendar'],
      ['Consolidar o orçamento anual com as áreas', 'Consolidate the annual budget with the departments'],
      ['Revisar as conciliações e os relatórios gerenciais', 'Review reconciliations and management reports']],
    { esc: 'superior', form: ['Ciências Contábeis', 'Accounting'], exp: 4,
      extra: [['Registro ativo no Conselho Regional de Contabilidade (CRC)', 'Active registration with the Regional Accounting Council (CRC)']] },
    ['lideranca', 'analitico', 'integridade', 'organizacao']);
  c('CG-503', 'fin', 'esp', 11, ['Especialista em Planejamento Financeiro', 'Financial Planning Specialist'], 'CG-501', '2525-05',
    ['Projetar os resultados da empresa e mostrar o impacto financeiro de cada decisão.', 'Forecast company results and show the financial impact of each decision.'],
    [['Construir os modelos de projeção de receita e de custo', 'Build revenue and cost forecasting models'],
      ['Analisar a rentabilidade por produto e por cliente', 'Analyze profitability by product and customer'],
      ['Apoiar a diretoria nas decisões de investimento', 'Support leadership on investment decisions']],
    { esc: 'superior', form: ['Economia, Administração ou Engenharia', 'Economics, Business or Engineering'], exp: 5, idi: [['ingles', 'intermediario']],
      extra: [['Experiência em planejamento financeiro e modelagem', 'Experience in financial planning and modeling']] },
    ['analitico', 'negocio', 'comunicacao', 'integridade']);
  c('CG-504', 'fin', 'ana', 8, ['Analista Financeiro(a)', 'Financial Analyst'], 'CG-502', '2525-05',
    ['Cuidar das contas a pagar, a receber e do caixa para que nenhum compromisso atrase.', 'Manage payables, receivables and cash so no commitment is late.'],
    [['Programar os pagamentos e conciliar as contas bancárias', 'Schedule payments and reconcile bank accounts'],
      ['Acompanhar os recebimentos e cobrar os clientes em atraso', 'Track collections and chase overdue customers'],
      ['Projetar o fluxo de caixa das próximas semanas', 'Forecast cash flow for the coming weeks']],
    { esc: 'superior', form: ['Administração, Economia ou Ciências Contábeis', 'Business, Economics or Accounting'], exp: 2, extra: [['Excel avançado', 'Advanced Excel']] },
    ['organizacao', 'integridade', 'analitico', 'comunicacao'], { peso: 9 });
  c('CG-505', 'fin', 'ana', 8, ['Analista Contábil', 'Accounting Analyst'], 'CG-502', '2522-10',
    ['Registrar os fatos contábeis com precisão e no prazo do fechamento.', 'Record accounting events accurately and within the close deadline.'],
    [['Fazer os lançamentos e as conciliações contábeis', 'Post journal entries and reconcile accounts'],
      ['Preparar as demonstrações financeiras mensais', 'Prepare monthly financial statements'],
      ['Atender as auditorias externas', 'Support external audits']],
    { esc: 'superior', form: ['Ciências Contábeis', 'Accounting'], exp: 2 }, ['integridade', 'organizacao', 'analitico'], { peso: 8 });
  c('CG-506', 'fin', 'ana', 8, ['Analista Fiscal', 'Tax Analyst'], 'CG-502', '2522-10',
    ['Calcular e pagar os impostos corretamente, evitando multas e aproveitando os créditos de direito.', 'Calculate and pay taxes correctly, avoiding fines and using the credits the company is entitled to.'],
    [['Apurar os impostos diretos e indiretos', 'Calculate direct and indirect taxes'],
      ['Entregar as obrigações acessórias no prazo', 'File ancillary tax obligations on time'],
      ['Revisar a classificação fiscal dos produtos', 'Review the tax classification of products']],
    { esc: 'superior', form: ['Ciências Contábeis ou Direito', 'Accounting or Law'], exp: 2,
      extra: [['Conhecimento dos impostos indiretos (ICMS, IPI, PIS e COFINS)', 'Knowledge of Brazilian indirect taxes (ICMS, IPI, PIS and COFINS)']] },
    ['integridade', 'analitico', 'organizacao', 'aprendizado'], { peso: 5 });
  c('CG-507', 'fin', 'est', 2, ['Estagiário(a) de Finanças', 'Finance Intern'], 'CG-502', '2525-05',
    ['Apoiar a rotina financeira enquanto aplica na prática o que aprende no curso.', 'Support the finance routine while putting coursework into practice.'],
    [['Apoiar as conciliações e os lançamentos', 'Support reconciliations and entries'],
      ['Organizar os documentos fiscais e financeiros', 'Organize tax and financial documents'],
      ['Atualizar as planilhas de controle', 'Update control spreadsheets']],
    { esc: 'est', form: ['Ciências Contábeis, Economia ou Administração', 'Accounting, Economics or Business'] },
    ['aprendizado', 'organizacao', 'integridade']);

  // ---- Tecnologia
  c('CG-601', 'tec', 'ger', 14, ['Gerente de Tecnologia', 'Technology Manager'], 'CG-004', '1425-05',
    ['Garantir sistemas, infraestrutura e dados que funcionam, protegidos e a serviço das áreas de negócio.', 'Ensure systems, infrastructure and data that work, are protected and serve the business areas.'],
    [['Definir o plano de tecnologia junto com as áreas de negócio', 'Set the technology roadmap with the business areas'],
      ['Gerir os contratos de software, nuvem e suporte', 'Manage software, cloud and support contracts'],
      ['Garantir a segurança da informação e a continuidade dos sistemas', 'Ensure information security and system continuity']],
    { esc: 'superior', form: ['Computação, Sistemas de Informação ou Engenharia', 'Computer Science, Information Systems or Engineering'], exp: 8, idi: [['ingles', 'avancado']] },
    ['lideranca', 'negocio', 'resultado', 'integridade', 'comunicacao']);
  c('CG-602', 'tec', 'coo', 12, ['Coordenador(a) de Tecnologia', 'Technology Coordinator'], 'CG-601', '1425-25',
    ['Coordenar o suporte e a operação dos sistemas para que as áreas tenham respostas rápidas e confiáveis.', 'Coordinate support and systems operations so the business gets fast, reliable answers.'],
    [['Acompanhar a fila de chamados e os prazos de atendimento', 'Track the ticket queue and service times'],
      ['Priorizar as demandas de sistemas com as áreas', 'Prioritize systems requests with the business'],
      ['Distribuir o trabalho da equipe técnica conforme a prioridade', "Assign the technical team's work by priority"]],
    { esc: 'superior', form: ['Computação ou Sistemas de Informação', 'Computer Science or Information Systems'], exp: 3,
      extra: [['Experiência em liderança de equipes de tecnologia', 'Experience leading technology teams']] },
    ['lideranca', 'cliente', 'organizacao', 'comunicacao']);
  c('CG-603', 'tec', 'esp', 11, ['Especialista em Infraestrutura e Nuvem', 'Infrastructure and Cloud Specialist'], 'CG-601', '2123-05',
    ['Manter a infraestrutura de redes, servidores e nuvem disponível, segura e com custo sob controle.', 'Keep network, server and cloud infrastructure available, secure and cost-controlled.'],
    [['Desenhar e manter a arquitetura de nuvem e de redes', 'Design and maintain cloud and network architecture'],
      ['Automatizar as rotinas de implantação e de cópia de segurança', 'Automate deployment and backup routines'],
      ['Monitorar a disponibilidade e o custo da nuvem', 'Monitor cloud availability and cost']],
    { esc: 'superior', form: ['Computação, Redes ou áreas afins', 'Computer Science, Networking or related fields'], exp: 5, idi: [['ingles', 'intermediario']],
      extra: [['Certificação em nuvem pública (nível associado ou superior)', 'Public cloud certification (associate level or above)']] },
    ['analitico', 'integridade', 'aprendizado', 'melhoria'], { peso: 4 });
  c('CG-604', 'tec', 'esp', 11, ['Especialista em Desenvolvimento', 'Software Development Specialist'], 'CG-601', '2124-05',
    ['Construir e integrar os sistemas da empresa com qualidade de código e segurança.', 'Build and integrate company systems with code quality and security.'],
    [['Desenvolver as integrações entre o sistema de gestão e outras plataformas', 'Build integrations between the ERP and other platforms'],
      ['Revisar o código da equipe e definir padrões', "Review the team's code and set standards"],
      ['Apoiar a escolha de soluções e de fornecedores de software', 'Support the choice of software solutions and vendors']],
    { esc: 'superior', form: ['Computação ou Sistemas de Informação', 'Computer Science or Information Systems'], exp: 5, idi: [['ingles', 'intermediario']],
      extra: [['Experiência com desenvolvimento web e integração por API', 'Experience with web development and API integration']] },
    ['analitico', 'aprendizado', 'comunicacao', 'melhoria'], { peso: 5 });
  c('CG-605', 'tec', 'ana', 7, ['Analista de Suporte', 'IT Support Analyst'], 'CG-602', '3172-10',
    ['Resolver os problemas de tecnologia dos colaboradores no primeiro contato, sempre que possível.', "Solve employees' technology problems at first contact whenever possible."],
    [['Atender os chamados de equipamento, programas e acessos', 'Handle hardware, software and access tickets'],
      ['Preparar e manter os computadores e celulares da empresa', 'Set up and maintain company computers and phones'],
      ['Documentar as soluções na base de conhecimento', 'Document solutions in the knowledge base']],
    { esc: 'superior', form: ['Computação, Redes ou áreas afins', 'Computer Science, Networking or related fields'], exp: 1 },
    ['cliente', 'comunicacao', 'organizacao', 'aprendizado']);
  c('CG-606', 'tec', 'ana', 8, ['Analista de Sistemas', 'Systems Analyst'], 'CG-602', '2124-05',
    ['Fazer o sistema de gestão atender às necessidades das áreas, com mudanças testadas e documentadas.', 'Make the ERP meet business needs, with tested and documented changes.'],
    [['Levantar as necessidades das áreas e configurar o sistema de gestão', 'Gather business requirements and configure the ERP'],
      ['Testar e documentar as melhorias antes de liberar', 'Test and document changes before release'],
      ['Treinar os usuários nas novas funcionalidades', 'Train users on new features']],
    { esc: 'superior', form: ['Sistemas de Informação ou áreas afins', 'Information Systems or related fields'], exp: 2,
      extra: [['Experiência com sistemas de gestão (ERP)', 'Experience with ERP systems']] },
    ['analitico', 'cliente', 'comunicacao', 'organizacao']);
  c('CG-607', 'tec', 'ana', 9, ['Analista de Dados', 'Data Analyst'], 'CG-602', '2112-05',
    ['Transformar os dados da empresa em indicadores confiáveis e fáceis de entender.', 'Turn company data into reliable, easy-to-understand indicators.'],
    [['Construir painéis de indicadores para as áreas', 'Build indicator dashboards for business areas'],
      ['Escrever consultas SQL e garantir a qualidade dos dados', 'Write SQL queries and ensure data quality'],
      ['Explicar os números às lideranças de forma simples', 'Explain the numbers to leaders in plain language']],
    { esc: 'superior', form: ['Estatística, Computação, Engenharia ou áreas afins', 'Statistics, Computer Science, Engineering or related fields'], exp: 2,
      idi: [['ingles', 'intermediario']], extra: [['SQL e uma ferramenta de visualização de dados', 'SQL and a data visualization tool']] },
    ['analitico', 'comunicacao', 'cliente', 'aprendizado']);
  c('CG-608', 'tec', 'est', 2, ['Estagiário(a) de Tecnologia', 'Technology Intern'], 'CG-602', '3172-10',
    ['Apoiar a rotina de tecnologia enquanto aplica na prática o que aprende no curso.', 'Support the technology routine while putting coursework into practice.'],
    [['Apoiar o atendimento de chamados simples', 'Help with simple support tickets'],
      ['Atualizar o inventário de equipamentos', 'Keep the equipment inventory up to date'],
      ['Participar dos projetos da área com orientação', 'Join team projects with guidance']],
    { esc: 'est', form: ['Computação, Sistemas de Informação ou áreas afins', 'Computer Science, Information Systems or related fields'] },
    ['aprendizado', 'cliente', 'organizacao']);

  // ---- Pessoas e Cultura
  c('CG-701', 'pes', 'ger', 14, ['Gerente de Pessoas e Cultura', 'People and Culture Manager'], 'CG-004', '1422-05',
    ['Atrair, desenvolver e reter as pessoas que a empresa precisa, cuidando da cultura e de uma remuneração justa.', 'Attract, develop and retain the people the company needs, caring for culture and fair pay.'],
    [['Conduzir o plano anual de pessoas: atração, desenvolvimento e retenção', 'Run the annual people plan: hiring, development and retention'],
      ['Aprovar a estrutura de cargos e a política de remuneração', 'Approve the job structure and the pay policy'],
      ['Apoiar as lideranças nas decisões sobre as equipes', 'Advise leaders on team decisions']],
    { esc: 'superior', form: ['Psicologia, Administração ou Gestão de RH', 'Psychology, Business or HR Management'], exp: 8 },
    ['lideranca', 'comunicacao', 'integridade', 'negocio', 'negociacao']);
  c('CG-702', 'pes', 'coo', 12, ['Coordenador(a) de Pessoas', 'People Coordinator'], 'CG-701', '1422-05',
    ['Coordenar folha, benefícios e seleção para que cada colaborador seja bem atendido e a lei seja cumprida.', 'Coordinate payroll, benefits and recruiting so every employee is well served and the law is followed.'],
    [['Coordenar o calendário da folha e dos benefícios', 'Coordinate the payroll and benefits calendar'],
      ['Acompanhar os processos seletivos em andamento', 'Follow open hiring processes'],
      ['Garantir o cumprimento da legislação trabalhista', 'Ensure labor-law compliance']],
    { esc: 'superior', form: ['Psicologia, Administração ou Gestão de RH', 'Psychology, Business or HR Management'], exp: 3,
      extra: [['Experiência em liderança de equipe de RH', 'Experience leading an HR team']] },
    ['lideranca', 'organizacao', 'integridade', 'comunicacao']);
  c('CG-703', 'pes', 'esp', 11, ['Business Partner de RH', 'HR Business Partner'], 'CG-701', '2524-05',
    ['Ser o parceiro de RH das lideranças, transformando os desafios da área em ações sobre pessoas.', 'Be the HR partner to business leaders, turning area challenges into people actions.'],
    [['Apoiar os líderes em feedback, desempenho e sucessão', 'Support leaders on feedback, performance and succession'],
      ['Analisar os indicadores de rotatividade e de clima da área', 'Analyze turnover and engagement indicators'],
      ['Conduzir planos de ação de pessoas com as gerências', 'Run people action plans with managers']],
    { esc: 'superior', form: ['Psicologia, Administração ou Gestão de RH', 'Psychology, Business or HR Management'], exp: 5, via: 1 },
    ['comunicacao', 'negocio', 'negociacao', 'integridade']);
  c('CG-704', 'pes', 'ana', 7, ['Analista de Departamento Pessoal', 'Payroll Analyst'], 'CG-702', '4110-10',
    ['Pagar cada colaborador certo e no dia, com os registros trabalhistas em ordem.', 'Pay every employee correctly and on time, with employment records in order.'],
    [['Processar a folha mensal, as férias e as rescisões', 'Process monthly payroll, vacations and terminations'],
      ['Enviar os eventos trabalhistas ao governo no prazo', 'Submit employment events to the government on time'],
      ['Atender os colaboradores em dúvidas de folha e benefícios', 'Answer employee questions on pay and benefits']],
    { esc: 'superior', form: ['Gestão de RH, Administração ou Ciências Contábeis', 'HR Management, Business or Accounting'], exp: 2,
      extra: [['Experiência com folha de pagamento e eSocial', 'Experience with payroll and eSocial filings']] },
    ['organizacao', 'integridade', 'cliente', 'comunicacao'], { peso: 4 });
  c('CG-705', 'pes', 'ana', 7, ['Analista de Recrutamento e Seleção', 'Recruiting Analyst'], 'CG-702', '2524-05',
    ['Encontrar e selecionar as pessoas certas para cada vaga, com boa experiência para quem se candidata.', 'Find and select the right people for each vacancy, with a good experience for candidates.'],
    [['Abrir as vagas e divulgar nos canais certos para cada perfil', 'Open vacancies and post them on the right channels for each profile'],
      ['Conduzir triagens e entrevistas por competências', 'Run screenings and competency-based interviews'],
      ['Acompanhar o tempo de contratação e a experiência do candidato', 'Track time to hire and candidate experience']],
    { esc: 'superior', form: ['Psicologia ou Gestão de RH', 'Psychology or HR Management'], exp: 2,
      extra: [['Experiência com entrevista por competências', 'Experience with competency-based interviewing']] },
    ['comunicacao', 'cliente', 'organizacao', 'integridade'], { peso: 4 });
  c('CG-706', 'pes', 'ana', 8, ['Analista de Remuneração', 'Compensation Analyst'], 'CG-702', '2524-05',
    ['Manter a estrutura de cargos e salários justa por dentro e competitiva com o mercado.', 'Keep the job and salary structure internally fair and competitive with the market.'],
    [['Manter o catálogo de cargos e as descrições atualizados', 'Keep the job catalog and descriptions up to date'],
      ['Analisar os pedidos de cargo novo e propor a grade', 'Review new job requests and propose the grade'],
      ['Comparar a tabela salarial com pesquisas de mercado', 'Compare the salary table with market surveys']],
    { esc: 'superior', form: ['Administração, Economia ou Gestão de RH', 'Business, Economics or HR Management'], exp: 2,
      extra: [['Experiência com estrutura de cargos e salários', 'Experience with job and salary structures']] },
    ['analitico', 'integridade', 'comunicacao', 'negocio'], { peso: 3 });
  c('CG-707', 'pes', 'est', 2, ['Estagiário(a) de Pessoas', 'People Intern'], 'CG-702', '2524-05',
    ['Apoiar a rotina de pessoas e cultura enquanto aplica na prática o que aprende no curso.', 'Support the people and culture routine while putting coursework into practice.'],
    [['Apoiar a triagem de currículos e o agendamento de entrevistas', 'Support résumé screening and interview scheduling'],
      ['Organizar os materiais de integração e de treinamento', 'Prepare onboarding and training materials'],
      ['Atualizar as planilhas de controle de RH', 'Update HR control spreadsheets']],
    { esc: 'est', form: ['Psicologia, Administração ou Gestão de RH', 'Psychology, Business or HR Management'] },
    ['aprendizado', 'comunicacao', 'organizacao']);

  // ---- Jurídico
  c('CG-801', 'jur', 'ger', 14, ['Gerente Jurídico(a)', 'Legal Manager'], 'CG-004', '1423-30',
    ['Proteger a empresa de riscos jurídicos e manter o negócio dentro da lei e do código de conduta.', 'Protect the company from legal risk and keep the business within the law and the code of conduct.'],
    [['Orientar a diretoria sobre os riscos jurídicos das decisões', 'Advise leadership on the legal risks of decisions'],
      ['Acompanhar os processos e os escritórios externos', 'Oversee lawsuits and outside counsel'],
      ['Manter o programa de integridade da empresa', "Maintain the company's integrity program"]],
    { esc: 'superior', form: ['Direito', 'Law'], exp: 8, idi: [['ingles', 'avancado']],
      extra: [['Inscrição ativa na Ordem dos Advogados do Brasil (OAB)', 'Active membership in the Brazilian Bar Association (OAB)']] },
    ['integridade', 'negociacao', 'negocio', 'lideranca', 'comunicacao']);
  c('CG-802', 'jur', 'coo', 12, ['Coordenador(a) Jurídico(a)', 'Legal Coordinator'], 'CG-801', '2410-05',
    ['Coordenar contratos e processos para que nenhum prazo se perca e os riscos sejam conhecidos.', 'Coordinate contracts and cases so no deadline is missed and risks are known.'],
    [['Distribuir e revisar os contratos analisados pela equipe', 'Assign and review contracts handled by the team'],
      ['Acompanhar os prazos processuais e as audiências', 'Track court deadlines and hearings'],
      ['Padronizar os modelos de contrato', 'Standardize contract templates']],
    { esc: 'superior', form: ['Direito', 'Law'], exp: 4,
      extra: [['Inscrição ativa na Ordem dos Advogados do Brasil (OAB)', 'Active membership in the Brazilian Bar Association (OAB)']] },
    ['lideranca', 'integridade', 'organizacao', 'negociacao']);
  c('CG-803', 'jur', 'esp', 11, ['Advogado(a) Sênior', 'Senior Lawyer'], 'CG-801', '2410-05',
    ['Conduzir os temas jurídicos mais complexos e orientar a equipe nas decisões de maior risco.', 'Handle the most complex legal matters and guide the team on the highest-risk decisions.'],
    [['Conduzir negociações e contratos complexos', 'Lead complex negotiations and contracts'],
      ['Elaborar pareceres sobre temas trabalhistas e tributários', 'Write legal opinions on labor and tax matters'],
      ['Orientar os advogados e analistas da equipe', "Guide the team's lawyers and analysts"]],
    { esc: 'pos', form: ['Direito Empresarial, Trabalhista ou Tributário', 'Business, Labor or Tax Law'], exp: 6,
      extra: [['Inscrição ativa na Ordem dos Advogados do Brasil (OAB)', 'Active membership in the Brazilian Bar Association (OAB)']] },
    ['integridade', 'negociacao', 'analitico', 'comunicacao']);
  c('CG-804', 'jur', 'ana', 9, ['Advogado(a)', 'Lawyer'], 'CG-802', '2410-05',
    ['Cuidar dos contratos e processos do dia a dia com segurança jurídica e no prazo.', 'Handle day-to-day contracts and cases with legal certainty and on time.'],
    [['Analisar e redigir os contratos com clientes e fornecedores', 'Review and draft customer and supplier contracts'],
      ['Acompanhar os processos e preparar os subsídios para a defesa', 'Follow lawsuits and prepare defense materials'],
      ['Responder às consultas jurídicas das áreas', 'Answer legal questions from the business']],
    { esc: 'superior', form: ['Direito', 'Law'], exp: 2,
      extra: [['Inscrição ativa na Ordem dos Advogados do Brasil (OAB)', 'Active membership in the Brazilian Bar Association (OAB)']] },
    ['integridade', 'analitico', 'comunicacao', 'organizacao'], { peso: 3 });
  c('CG-805', 'jur', 'ana', 8, ['Analista de Compliance', 'Compliance Analyst'], 'CG-802', '2521-05',
    ['Manter vivo o programa de integridade, com prevenção, treinamento e apuração de denúncias.', 'Keep the integrity program alive through prevention, training and investigation of reports.'],
    [['Conduzir os treinamentos sobre o código de conduta', 'Run code of conduct training'],
      ['Analisar terceiros antes da contratação (due diligence)', 'Screen third parties before hiring (due diligence)'],
      ['Apurar as denúncias recebidas pelo canal de ética', 'Investigate reports received through the ethics hotline']],
    { esc: 'superior', form: ['Direito, Administração ou áreas afins', 'Law, Business or related fields'], exp: 2,
      extra: [['Conhecimento da Lei Anticorrupção (Lei 12.846/2013)', 'Knowledge of the Brazilian Anti-Corruption Law (Law 12,846/2013)']] },
    ['integridade', 'analitico', 'comunicacao', 'organizacao'], { peso: 1 });

  // ---------------------------------------------------------------- 6. TRILHAS DE CARREIRA
  // Para onde cada cargo costuma levar, DENTRO da mesma família ([de, para]).
  // Mudar de família é transferência e fica fora do mapa (de propósito: o mapa
  // mostra a escada de cada área). Cargo sem trilha aparece sozinho no mapa.
  const TRILHAS = [
    ['CG-111', 'CG-110'], ['CG-110', 'CG-109'], ['CG-109', 'CG-108'], ['CG-108', 'CG-107'], ['CG-108', 'CG-106'],
    ['CG-107', 'CG-105'], ['CG-106', 'CG-104'], ['CG-106', 'CG-102'], ['CG-105', 'CG-103'], ['CG-104', 'CG-103'],
    ['CG-103', 'CG-101'], ['CG-102', 'CG-101'],
    ['CG-209', 'CG-208'], ['CG-208', 'CG-207'], ['CG-208', 'CG-206'], ['CG-206', 'CG-205'], ['CG-206', 'CG-203'],
    ['CG-207', 'CG-204'], ['CG-206', 'CG-202'], ['CG-205', 'CG-202'], ['CG-203', 'CG-201'], ['CG-204', 'CG-201'], ['CG-202', 'CG-201'],
    ['CG-309', 'CG-308'], ['CG-308', 'CG-307'], ['CG-307', 'CG-306'], ['CG-307', 'CG-305'], ['CG-305', 'CG-303'],
    ['CG-305', 'CG-302'], ['CG-303', 'CG-302'], ['CG-304', 'CG-301'], ['CG-302', 'CG-301'],
    ['CG-407', 'CG-405'], ['CG-407', 'CG-406'], ['CG-405', 'CG-404'], ['CG-404', 'CG-403'], ['CG-404', 'CG-402'],
    ['CG-403', 'CG-401'], ['CG-402', 'CG-401'],
    ['CG-507', 'CG-504'], ['CG-507', 'CG-505'], ['CG-507', 'CG-506'], ['CG-504', 'CG-503'], ['CG-505', 'CG-502'],
    ['CG-506', 'CG-502'], ['CG-503', 'CG-501'], ['CG-502', 'CG-501'],
    ['CG-608', 'CG-605'], ['CG-608', 'CG-606'], ['CG-608', 'CG-607'], ['CG-605', 'CG-606'], ['CG-605', 'CG-603'],
    ['CG-606', 'CG-604'], ['CG-607', 'CG-604'], ['CG-606', 'CG-602'], ['CG-603', 'CG-601'], ['CG-604', 'CG-601'], ['CG-602', 'CG-601'],
    ['CG-707', 'CG-704'], ['CG-707', 'CG-705'], ['CG-704', 'CG-706'], ['CG-705', 'CG-703'], ['CG-706', 'CG-703'],
    ['CG-706', 'CG-702'], ['CG-703', 'CG-701'], ['CG-702', 'CG-701'],
    ['CG-804', 'CG-803'], ['CG-804', 'CG-802'], ['CG-805', 'CG-802'], ['CG-803', 'CG-801'], ['CG-802', 'CG-801'],
    ['CG-002', 'CG-001'], ['CG-003', 'CG-001'], ['CG-004', 'CG-001']
  ];
  // Famílias reunidas sob cada diretoria (a chave fina sobre as colunas do mapa).
  const GRUPOS = [
    { id: 'fab', nome: ['Operações industriais', 'Industrial operations'], areas: ['ops', 'man', 'log'] },
    { id: 'mer', nome: ['Mercado', 'Market'], areas: ['com'] },
    { id: 'apo', nome: ['Apoio', 'Support'], areas: ['fin', 'tec', 'pes', 'jur'] },
    { id: 'dir', nome: ['Diretoria', 'Board'], areas: ['dir'] }
  ];
  // As faixas "por nível" do mapa: intervalos de grade com o nome do degrau.
  const FAIXAS_NIVEL = [
    { de: 1, ate: 2, nome: ['Entrada', 'Entry'] }, { de: 3, ate: 5, nome: ['Operacional', 'Operational'] },
    { de: 6, ate: 9, nome: ['Técnico e analista', 'Technician and analyst'] },
    { de: 10, ate: 12, nome: ['Especialista e coordenação', 'Specialist and coordination'] },
    { de: 13, ate: 14, nome: ['Gerência', 'Management'] }, { de: 15, ate: 16, nome: ['Diretoria', 'Board'] }
  ];

  // ---------------------------------------------------------------- AJUDANTES
  const L = (par, lang) => (Array.isArray(par) ? par[lang === 'en' ? 1 : 0] : par);
  const tierDe = nivel => (NIVEIS_INFO[nivel] || NIVEIS_INFO.ana).tier;

  // A lista de requisitos sai dos CAMPOS (mesma regra para catálogo e requisição).
  // Devolve [{txt:[pt,en], origem:'esc'|'exp'|...}] na ordem em que aparecem no documento.
  function requisitos(nivel, r) {
    const out = [];
    if (nivel === 'apr' || r.esc === 'apr') ESCOLARIDADE_FIXA.apr.forEach(t => out.push({ txt: t, origem: 'esc' }));
    else if (nivel === 'est' || r.esc === 'est') {
      const f = r.form;
      out.push({ txt: f ? [ESCOLARIDADE_FIXA.est[0][0] + ' em ' + L(f, 'pt'), ESCOLARIDADE_FIXA.est[0][1] + ' in ' + L(f, 'en')] : ESCOLARIDADE_FIXA.est[0], origem: 'esc' });
    } else if (r.esc && ESCOLARIDADE[r.esc]) {
      const e = ESCOLARIDADE[r.esc], f = r.form;
      const pt = e.req[0] + (f && e.com ? e.com[0] + L(f, 'pt') : ''), en = e.req[1] + (f && e.com ? e.com[1] + L(f, 'en') : '');
      out.push({ txt: [pt, en], origem: 'esc' });
    }
    if (r.exp > 0) out.push({ txt: [`Experiência de pelo menos ${r.exp} ${r.exp === 1 ? 'ano' : 'anos'} em função semelhante`, `At least ${r.exp} ${r.exp === 1 ? 'year' : 'years'} of experience in a similar role`], origem: 'exp' });
    (r.idi || []).forEach(([idioma, nivelI]) => {
      if (!IDIOMAS[idioma] || !NIVEIS_IDIOMA[nivelI]) return;
      out.push({ txt: [`${IDIOMAS[idioma][0]} em nível ${NIVEIS_IDIOMA[nivelI][0]}`, `${NIVEIS_IDIOMA[nivelI][1]} ${IDIOMAS[idioma][1]}`], origem: 'idi' });
    });
    if (r.via && VIAGENS[r.via] && VIAGENS[r.via].req) out.push({ txt: VIAGENS[r.via].req, origem: 'via' });
    if (r.tur) out.push({ txt: TURNOS_REQ, origem: 'tur' });
    if (r.cnh && CNH.includes(r.cnh)) out.push({ txt: [`Carteira de habilitação categoria ${r.cnh}`, `Category ${r.cnh} driver's license`], origem: 'cnh' });
    (r.extra || []).forEach(t => { if (t && (Array.isArray(t) ? t[0] : t).trim()) out.push({ txt: Array.isArray(t) ? t : [t, t], origem: 'extra' }); });
    return out;
  }

  // Responsabilidades do documento: as específicas + a do tier.
  const responsabilidades = cg => cg.resp.concat(cg.origem === 'catalogo' ? [RESP_DO_TIER[tierDe(cg.nivel)]] : []);

  // Cargos criados por requisição aprovada entram aqui (o armazem.js monta).
  // todos() = catálogo base + aprovados, sempre na mesma ordem (código).
  function todos() {
    const extras = window.ARMAZEM ? window.ARMAZEM.cargosAprovados() : [];
    return CARGOS.concat(extras);
  }
  function porCodigo(codigo) { return todos().find(x => x.codigo === codigo) || null; }
  const subordinados = codigo => todos().filter(x => x.reportaA === codigo);

  // Próximo código livre de uma área (cargo novo aprovado ganha o número seguinte).
  const PREFIXO = { dir: 0, ops: 1, man: 2, log: 3, com: 4, fin: 5, tec: 6, pes: 7, jur: 8 };
  function proximoCodigo(area, usados) {
    const base = PREFIXO[area] * 100;
    const ocupados = new Set(todos().map(x => x.codigo).concat(usados || []));
    for (let n = base + 1; n < base + 100; n++) {
      const cod = 'CG-' + String(n).padStart(3, '0');
      if (!ocupados.has(cod)) return cod;
    }
    return 'CG-' + area.toUpperCase() + '-' + Date.now();
  }

  // Grade sugerida para um cargo novo: a mais comum na mesma família e nível;
  // senão, a mais comum no nível; senão, a padrão do nível. Devolve o porquê.
  function sugerirGrade(area, nivel) {
    const moda = lista => {
      const n = {};
      lista.forEach(g => { n[g] = (n[g] || 0) + 1; });
      return Number(Object.keys(n).sort((a, b) => n[b] - n[a] || a - b)[0]);
    };
    const mesmo = CARGOS.filter(x => x.area === area && x.nivel === nivel);
    if (mesmo.length) return { grade: moda(mesmo.map(x => x.grade)), porque: 'familia', n: mesmo.length };
    const nivelIgual = CARGOS.filter(x => x.nivel === nivel);
    if (nivelIgual.length) return { grade: moda(nivelIgual.map(x => x.grade)), porque: 'nivel', n: nivelIgual.length };
    return { grade: (NIVEIS_INFO[nivel] || {}).gradePadrao || 8, porque: 'padrao', n: 0 };
  }

  return {
    GRADES, NIVEIS_INFO, NIVEIS_DESC, NIVEIS_ASC, AREAS_ORDEM, ESCOLARIDADE, ESCOLARIDADE_FIXA, EXPERIENCIA,
    IDIOMAS, NIVEIS_IDIOMA, VIAGENS, CNH, COMPETENCIAS, RESP_DO_TIER, CARGOS, TRILHAS, GRUPOS, FAIXAS_NIVEL,
    areas: D.areas, niveis: D.niveis,
    L, tierDe, requisitos, responsabilidades, todos, porCodigo, subordinados, proximoCodigo, sugerirGrade,
    faixa: g => GRADES[g] || null
  };
})();
