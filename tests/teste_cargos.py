# -*- coding: utf-8 -*-
"""
teste_cargos.py: bateria da demo de Gerenciamento de Cargos, num navegador de verdade.

Por que um navegador de verdade (Edge ou Chrome sem tela, pelo protocolo do DevTools):
a demo é HTML + JavaScript; só abrindo a página dá para saber se ela desenha, se
os números batem e se os cliques fazem o que prometem. Cada checagem imprime OK ou
FALHA com o número que decidiu.

O que prova:
  1. abre sem erro de JavaScript nas 4 abas do painel e na página do formulário (as 4
     etapas e Minhas requisições), em PT e EN, no claro e no escuro, mais a ficha, a
     lista por trás de um número, o detalhe do mapa e a confirmação da aprovação
     (e nenhuma chave de texto faltando nem travessão na tela)
     1d. idioma: na tela em inglês, nenhuma palavra nem acento de português; na tela em
     português, nenhum rótulo em inglês (fora nomes de pessoas e o nome do cargo na
     outra língua, que vai marcado com lang= de propósito)
  2. os números da visão geral batem com uma conta feita do zero a partir do catálogo
  3. o "i" abre a conta e o clique no número abre a lista com o mesmo total
  4. a ficha do cargo abre pelo mapa (detalhe > Abrir o documento) e pela tabela; Esc fecha;
     4b. com ela aberta a página de trás não rola, e ela rola por dentro até as assinaturas
  5. mapa de carreiras: um ponto por cargo e uma linha por trilha; na Escada a altura é
     a grade e a coluna é a família; na Órbita a distância do centro é a grade
  6. mapa: clicar acende o caminho inteiro e abre o detalhe; faixas por nível e por
     grade; a busca marca os achados; o zoom aumenta o quadro e Ajustar volta;
     movimento: os pontos deslizam entre Escada e Órbita, o caminho se desenha, o
     detalhe entra com transição, o mouse acende os vizinhos; com ?foto=1 nada se mexe
  7. a tabela filtra pela busca sem perder o foco e exporta o CSV com todas as linhas
     7o. toda tabela ordena pelo cabeçalho (número decrescente, inverte, 3º clique volta à ordem
     original linha por linha, texto A-Z, aria-sort, contagem igual); a ordem fica depois da busca
     e do idioma; a linha ordenada abre o cargo certo
  8. requisito pede do candidato: nenhum começa com "O cargo", "A vaga"...
  9. modelo = só pedidos da própria pessoa (e vira um pedido NOVO)
 10. aviso de descrição igual com outro título (não trava; pedido reprovado não conta)
 11. fluxo inteiro: o botão "Pedir cargo novo" abre a página; o pedido enviado aparece
     em Minhas requisições; no painel, cada decisão pede confirmação; Analista pré-aprova
     (G9), Master aprova, o cargo entra no catálogo e o gestor vê Aprovado na página
 12. pedir alteração exige comentário e o gestor reenvia pela página (versão 2);
     reprovar exige o motivo escrito (texto livre, sem lista); Cancelar não muda nada
 13. painel e página conversam pelo navegador: pedido gravado em outra aba aparece sem recarregar
 14. imprimir mostra só a folha do documento
 15. celular (390 px): nada vaza para o lado, no painel e na página do formulário

Resistência: com a máquina carregada, a ligação com o navegador às vezes cai ("socket is
already closed"). Aí a checagem abre o navegador de novo e roda mais UMA vez antes de
reprovar; por isso cada checagem começa do zero (dados de fábrica), sem depender da anterior.

Rodar:  pip install websocket-client   e depois   python tests/teste_cargos.py
Sai com código 1 se algo falhar. Precisa de Edge ou Chrome (ou NAVEGADOR=/caminho).
"""
import json, os, pathlib, re, sys, traceback
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__))
from cdp_util import Edge

RAIZ = pathlib.Path(__file__).resolve().parent.parent
URL = (RAIZ / "index.html").as_uri()
FORM = (RAIZ / "requisicao.html").as_uri()
ABAS = ["geral", "organograma", "cargos", "aprovacao"]
TRAVESSAO = chr(0x2014)                                # o travessão que a tela não pode ter (escrito por código)
CHAVE_FALTANDO = re.compile(r"\[[a-z][a-z_0-9]*\]")   # chave sem texto aparece na tela como [chave]
falhas, saida = [], []


# ---------------------------------------------------------------- resultado e resistência
def checa(nome, cond, detalhe=""):
    """Guarda o resultado; ele só é impresso quando a checagem inteira termina
    (se o navegador cair no meio, o que foi guardado é jogado fora e a checagem repete)."""
    saida.append((("OK    " if cond else "FALHA ") + nome + (f"  [{detalhe}]" if detalhe else ""), cond, nome))


def despeja():
    for linha, ok, nome in saida:
        print(linha)
        if not ok:
            falhas.append(nome)
    saida.clear()


QUEDA = ("socket is already closed", "connection to remote host was lost", "edge não abriu a porta", "connection reset",
         "broken pipe", "connection aborted", "websocketconnectionclosed", "websockettimeout")


def caiu(erro):
    """O erro é o navegador que caiu (e não o app que errou)?"""
    texto = (type(erro).__name__ + " " + str(erro)).lower()
    return any(q in texto for q in QUEDA)


class Sessao:
    """O navegador da bateria. Se a ligação com ele cair, fecha o que sobrou e abre outro."""
    def __init__(self, largura, altura):
        self.w, self.h, self.ed, self.erros_antigos = largura, altura, None, []

    def abre(self):
        for vez in (1, 2):
            try:
                self.ed = Edge(self.w, self.h).__enter__()
                return
            except Exception as erro:
                if vez == 2 or not caiu(erro):
                    raise

    def fecha(self):
        if not self.ed:
            return
        try:
            self.erros_antigos += erros_js(self.ed)
        except Exception:
            pass
        try:
            self.ed.__exit__(None, None, None)
        except Exception:
            pass
        self.ed = None

    def reabre(self):
        self.fecha()
        self.abre()

    def erros(self):
        return self.erros_antigos + (erros_js(self.ed) if self.ed else [])


def rodar(nome, funcao, sessao):
    """Roda uma checagem. Se o NAVEGADOR cair, abre de novo e repete uma vez. Se a checagem
    quebrar por outro motivo (elemento sumiu, botão desligado...), vira FALHA com o motivo
    e a linha do teste onde parou; as outras checagens continuam."""
    for vez in (1, 2):
        try:
            funcao(sessao.ed)
            break
        except Exception as erro:
            if vez == 1 and caiu(erro):
                saida.clear()
                print(f"AVISO {nome} a ligação com o navegador caiu ({type(erro).__name__}); abrindo de novo e repetindo a checagem")
                sessao.reabre()
                continue
            onde = [f.lineno for f in traceback.extract_tb(erro.__traceback__) if f.filename.endswith("teste_cargos.py")]
            checa(nome + " (quebrou no meio)", False, f"{type(erro).__name__}: {str(erro)[:300]} (linha {onde[-1] if onde else '?'})")
            break
    despeja()


# ---------------------------------------------------------------- ajudantes
# Espera a página NOVA ficar pronta. Antes de navegar, a página velha ganha uma
# marca (window.__velha); a espera só aceita a página sem a marca. Sem isso, com a
# máquina carregada, quem respondia "pronto" era a página ANTERIOR, ainda na tela.
PRONTO = """new Promise(r => { const t0 = Date.now(); (function v(){
  if (!window.__velha && (window.__cargos || window.__form) && document.querySelector('.abas')) r(Date.now() - t0);
  else if (Date.now() - t0 > 30000) r(-1); else setTimeout(v, 80); })(); })"""


def abrir(ed, consulta, limpa=False, pagina=URL):
    for _ in range(2 if limpa else 1):
        try:
            ed.js("window.__velha = true")
        except Exception as erro:
            if caiu(erro):
                raise
        ed.ir(pagina + consulta, espera=0.2)
        if ed.js(PRONTO) < 0:
            raise RuntimeError("a página não ficou pronta em 30 s: " + consulta)
        if limpa:   # a 1a volta apaga o que estava guardado; a 2a abre com os 8 pedidos de fábrica
            ed.js("localStorage.clear()")
            limpa = False
    ed.esperar(0.15)


def segue(ed, seletor):
    """Clica num link que troca de página (painel <-> formulário) e espera a página nova."""
    ed.js("window.__velha = true")
    clica(ed, seletor, espera=0.2)
    if ed.js(PRONTO) < 0:
        raise RuntimeError("a página do link não ficou pronta: " + seletor)
    ed.esperar(0.15)


def faz(ed, codigo, espera=0.2):
    """Roda um trecho de JS dentro de uma função (cada trecho tem o próprio escopo)."""
    return ed.js("(function(){" + codigo + "})()", espera=espera)


def clica(ed, seletor, espera=0.25):
    """Clica como a pessoa: o elemento tem de existir E estar ligado
    (clicar num botão desligado não faz nada e não dá erro, então a gente recusa)."""
    r = faz(ed, f"const e=document.querySelector({json.dumps(seletor)}); if(!e) return 'sumiu'; if(e.disabled) return 'desligado'; e.click(); return 'ok';", espera)
    if r != "ok":
        raise RuntimeError(f"não deu para clicar em {seletor}: {r}")


def digita(ed, seletor, texto, evento="input"):
    r = faz(ed, f"const e=document.querySelector({json.dumps(seletor)}); if(!e) return 'sumiu'; e.focus(); e.value={json.dumps(texto)}; e.dispatchEvent(new Event({json.dumps(evento)},{{bubbles:true}})); return 'ok';")
    if r != "ok":
        raise RuntimeError(f"não achei o campo {seletor}")


def escolhe(ed, seletor, valor):
    digita(ed, seletor, valor, "change")


def marca(ed, seletor):
    r = faz(ed, f"const e=document.querySelector({json.dumps(seletor)}); if(!e) return 'sumiu'; e.checked=true; e.dispatchEvent(new Event('change',{{bubbles:true}})); return 'ok';")
    if r != "ok":
        raise RuntimeError(f"não achei a caixa {seletor}")


def texto(ed, seletor):
    return faz(ed, f"const e=document.querySelector({json.dumps(seletor)}); return e ? e.innerText : ''")


def visivel(ed, seletor):
    """Visível de verdade: existe, não está com display:none e ocupa espaço na tela."""
    return faz(ed, f"const e=document.querySelector({json.dumps(seletor)}); if(!e) return false; "
                   "const r=e.getBoundingClientRect(); return getComputedStyle(e).display!=='none' && r.width>0 && r.height>0;")


def erros_js(ed):
    """Erros de JavaScript da página. Falha de rede da fonte do Google (sem internet) não é erro do app."""
    return [e for e in ed.erros() if "fonts.googleapis" not in e and "fonts.gstatic" not in e]


def esc(ed):
    ed.js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))", espera=0.2)


def status(ed, codigo):
    return faz(ed, f"const r=window.ARMAZEM.porCodigo('{codigo}'); return r ? r.status : null")


# O formulário: etapa 1 preenchida e o caminho até a revisão.
def form_etapa1(ed, nome="Analista de Sustentabilidade Industrial", area="ops", nivel="ana"):
    digita(ed, "#f-nomePt", nome)
    escolhe(ed, "#f-area", area)
    escolhe(ed, "#f-nivel", nivel)


def form_ate_revisao(ed):
    clica(ed, "#bt-proximo")
    clica(ed, '[data-acao="rq:preencher"]')
    clica(ed, "#bt-proximo")
    clica(ed, "#bt-proximo")


# ---------------------------------------------------------------- as checagens
# Idioma: lê o texto que está NA TELA (o que tem lang= é de outra língua de propósito e
# sai da conta, como as iniciais decorativas, aria-hidden), tira os nomes de pessoas (são iguais nas duas línguas) e procura, na tela
# em inglês, acento ou palavra comum do português; na tela em português, rótulo em inglês.
IDIOMA = r"""(function(sel, lang){
  const el = document.querySelector(sel); if (!el) return ['(sem ' + sel + ')'];
  const st = document.createElement('style'); st.textContent = '[lang]:not(html), [aria-hidden="true"] {display:none!important}';
  document.head.appendChild(st);
  let t = ' ' + el.innerText.replace(/\s+/g, ' ') + ' ';
  st.remove();
  const D = window.DADOS, A = window.ARMAZEM, O = window.OCUPACAO;
  const nomes = new Set([D.empresa, 'Master']);   // Master: o nome do papel, igual nas duas línguas (veio do pedido original)
  D.pessoas.forEach(p => nomes.add(p.nome));
  Object.values(O.personas).forEach(p => nomes.add(p.nome));
  A.todas().forEach(r => { nomes.add(r.solicitante.nome); r.historico.forEach(h => nomes.add(h.quem)); });
  [...nomes].filter(Boolean).sort((a, b) => b.length - a.length).forEach(n => { t = t.split(n).join(' # '); });
  const re = lang === 'en'
    ? /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]|\b(de|da|das|dos|para|com|não|uma|pelo|pela|nas|nos|aos|sem|cargo|cargos|pedido|pedidos|vaga|vagas|pessoa|pessoas|faixa|setor)\b/gi
    : /\b(the|and|of|with|from|by|role|roles|request|requests|search|export|close|print|copy|next|back|submit|clear|ladder|orbit|people|person|manager|analyst|approve|approved|reject|rejected|pending|overview|catalog|career|step|steps|level|levels|open|view|edit|cancel|confirm|zoom|download|you|your)\b/gi;
  const out = []; let m;
  while ((m = re.exec(t)) && out.length < 3) out.push('...' + t.slice(Math.max(0, m.index - 24), m.index + m[0].length + 24).trim() + '...');
  return out;
})"""


def t1_sem_erro(ed):
    ruins, mistura = [], []

    def olha(onde, sel, lang, minimo=200):
        txt = texto(ed, sel)
        if CHAVE_FALTANDO.findall(txt):
            ruins.append(f"{onde}: {CHAVE_FALTANDO.findall(txt)[:3]}")
        if TRAVESSAO in txt:
            ruins.append(f"{onde}: travessão")
        if len(txt) < minimo:
            ruins.append(f"{onde}: quase vazia ({len(txt)} letras)")
        achou = ed.js(IDIOMA + f"({json.dumps(sel)}, {json.dumps(lang)})")
        if achou:
            mistura.append(f"{onde}: {achou}")

    abrir(ed, "?aba=geral&lang=pt&tema=claro", limpa=True)
    for lang in ("pt", "en"):
        for tema in ("claro", "escuro"):
            q = f"lang={lang}&tema={tema}"
            for aba in ABAS:
                abrir(ed, f"?aba={aba}&{q}")
                olha(f"{lang}/{tema}/{aba}", "body", lang)
            abrir(ed, f"?aba=organograma&{q}")
            clica(ed, '.no[data-cargo="CG-106"]')
            olha(f"{lang}/{tema}: detalhe do mapa", "#org-detalhe", lang, 80)
            abrir(ed, f"?aba=cargos&{q}&cargo=CG-306")
            olha(f"{lang}/{tema}: ficha", ".doc-modal", lang)
            abrir(ed, f"?aba=geral&{q}")
            clica(ed, '[data-kpi="ocup"] .num-drill')
            olha(f"{lang}/{tema}: lista", ".gaveta", lang)
            abrir(ed, f"?aba=aprovacao&{q}&papel=master&req=REQ-0005")
            clica(ed, '[data-acao="apr:pedir"][data-tipo="reprovar"]')
            olha(f"{lang}/{tema}: confirmação", '[data-testid="apr-confirma"]', lang, 60)
            abrir(ed, f"?{q}", pagina=FORM)
            clica(ed, '[data-acao="rq:verModelo"]')
            form_etapa1(ed)
            olha(f"{lang}/{tema}: formulário 1", "body", lang)
            for n in (2, 3, 4):
                if n == 2:
                    clica(ed, "#bt-proximo")
                    clica(ed, '[data-acao="rq:preencher"]')
                else:
                    clica(ed, "#bt-proximo")
                olha(f"{lang}/{tema}: formulário {n}", "body", lang)
            abrir(ed, f"?{q}&ver=minhas", pagina=FORM)
            olha(f"{lang}/{tema}: minhas", "body", lang)
            if tema == "escuro":
                continue
            # Só no claro (o idioma não muda com o tema): cada situação de pedido, o cargo
            # criado por um pedido e a edição de um pedido devolvido.
            for papel, req in (("master", "REQ-0001"), ("gestor", "REQ-0003"), ("master", "REQ-0004"), ("analista", "REQ-0002")):
                abrir(ed, f"?aba=aprovacao&{q}&papel={papel}&req={req}")
                olha(f"{lang}: aprovação {req} ({papel})", '[data-testid="apr-detalhe"]', lang)
            abrir(ed, f"?aba=cargos&{q}&cargo=CG-112")
            olha(f"{lang}: ficha do cargo criado por pedido", ".doc-modal", lang)
            for req in ("REQ-0003", "REQ-0004"):
                abrir(ed, f"?{q}&ver=minhas", pagina=FORM)
                clica(ed, f'[data-testid="lista-minhas"] [data-req-item="{req}"]')
                olha(f"{lang}: minhas {req}", '[data-testid="minha-detalhe"]', lang)
            abrir(ed, f"?{q}&editar=REQ-0003", pagina=FORM)
            olha(f"{lang}: editar e reenviar", "body", lang)
    erros = erros_js(ed)
    checa("1. sem erro de JS: 4 abas e página do formulário x PT/EN x claro/escuro (mais ficha, lista, mapa e confirmação)", not erros, "; ".join(erros[:3]))
    checa("1b. nenhuma chave de texto faltando e nenhum travessão", not ruins, "; ".join(ruins[:4]))
    checa("1d. idioma: em EN nenhuma palavra ou acento de português; em PT nenhum rótulo em inglês (fora nomes próprios e o nome na outra língua, marcado)",
          not mistura, " | ".join(mistura[:5]))


def t2_numeros(ed):
    abrir(ed, "?aba=geral&lang=pt&tema=claro", limpa=True)
    # A conta "do zero": lê os dados crus e calcula aqui, sem usar metricas.js.
    esperado = json.loads(faz(ed, """
      const C = window.CATALOGO, O = window.OCUPACAO, A = window.ARMAZEM, D = window.DADOS;
      const aprovados = A.todas().filter(r => r.status === 'aprovado');
      const todos = C.CARGOS.map(c => c.codigo).concat(aprovados.map(r => r.decisao.cargoCodigo));
      const ref = D.dataRef;
      const ativos = D.pessoas.filter(p => p.admissao <= ref && (!p.desligamento || p.desligamento > ref)).length;
      const somaPorCargo = todos.reduce((s, c) => s + O.resumo(c).n, 0);
      const sal = O.ocupantes.map(o => o.salario);
      const media = sal.reduce((s, v) => s + v, 0) / sal.length;
      const cr = O.ocupantes.reduce((s, o) => s + o.salario / C.GRADES[o.grade].med, 0) / O.ocupantes.length;
      const vagas = D.vagas.filter(v => v.status === 'aberta').length;
      const reqAbertas = A.todas().filter(r => r.status === 'analise' || r.status === 'alteracao').length;
      const sem = todos.filter(c => O.resumo(c).n === 0).length;
      const brl = v => Number(v).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0});
      const pct = v => (v * 100).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%';
      return JSON.stringify({cargos: String(todos.length), ocup: String(O.ocupantes.length), ativos, somaPorCargo,
        abertas: vagas + ' / ' + reqAbertas, salario: brl(media), dispersao: pct(cr), sem: String(sem)});"""))
    tela = json.loads(faz(ed, """
      const n = id => document.querySelector('[data-kpi="' + id + '"] .h-num').childNodes[0].textContent.trim();
      const abertas = [...document.querySelectorAll('[data-kpi="abertas"] .num-drill')].map(b => b.textContent.trim()).join(' / ');
      return JSON.stringify({cargos: n('cargos'), ocup: n('ocup'), abertas, salario: n('salario'), dispersao: n('dispersao'), sem: n('sem')});"""))
    diferentes = {k: (tela[k], esperado[k]) for k in ("cargos", "ocup", "abertas", "salario", "dispersao", "sem") if tela[k] != esperado[k]}
    checa("2. os 6 números da visão geral = conta feita do zero a partir do catálogo", not diferentes,
          str(diferentes) if diferentes else json.dumps(tela, ensure_ascii=False))
    checa("2b. todo colaborador ativo tem um cargo (ocupantes = ativos = soma por cargo)",
          int(esperado["ocup"]) == esperado["ativos"] == esperado["somaPorCargo"], f"{esperado['ocup']} / {esperado['ativos']} / {esperado['somaPorCargo']}")
    soma = faz(ed, "return [...document.querySelectorAll('#s-composicao .cartao:first-child .lb-val')].reduce((s,e)=>s+parseInt(e.textContent),0)")
    checa("2c. 'por família' soma os cargos do catálogo", str(soma) == esperado["cargos"], f"{soma} x {esperado['cargos']}")


def t3_conta_e_lista(ed):
    abrir(ed, "?aba=geral&lang=pt&tema=claro", limpa=True)
    total = faz(ed, "return window.OCUPACAO.ocupantes.length")
    clica(ed, '[data-conta="dispersao"]')
    conta = faz(ed, "const p=document.querySelector('.conta-pop'); return !p.hidden && p.querySelector('.cp-formula').textContent.length > 20")
    esc(ed)
    clica(ed, '[data-kpi="ocup"] .num-drill')
    linhas = faz(ed, "return document.querySelectorAll('.gaveta tbody tr').length")
    clica(ed, "[data-g-csv]")
    csv = json.loads(faz(ed, "return JSON.stringify(window.__ultimoCsv || {})"))
    esc(ed)
    fechou = faz(ed, "return getComputedStyle(document.querySelector('.gaveta')).display === 'none'")
    checa("3. o i abre a conta; clicar no número abre a lista com o mesmo total; CSV com as mesmas linhas; Esc fecha",
          conta and linhas == total and csv.get("linhas") == linhas and fechou,
          f"conta={conta} lista={linhas} de {total} csv={csv.get('linhas')} fechou={fechou}")


def t4_ficha(ed):
    abrir(ed, "?aba=organograma&lang=pt&tema=claro", limpa=True)
    nome_cat = faz(ed, "return window.CATALOGO.porCodigo('CG-205').nome[0]")
    clica(ed, '.no[data-cargo="CG-205"]')
    no_detalhe = texto(ed, '[data-testid="org-detalhe"] h3')
    clica(ed, '[data-testid="org-detalhe"] [data-doc="CG-205"]')
    pelo_mapa = faz(ed, "const m=document.querySelector('.doc-modal'); return m && getComputedStyle(m).display!=='none' ? m.querySelector('.doc-nome').textContent : null")
    secoes = faz(ed, "return [...document.querySelectorAll('.doc-modal .doc-sec')].map(s=>s.dataset.sec).join(',')")
    esc(ed)
    fechou = faz(ed, "return getComputedStyle(document.querySelector('.doc-modal')).display === 'none'")
    abrir(ed, "?aba=cargos&lang=pt&tema=claro")
    clica(ed, 'tr[data-doc="CG-104"]')
    pela_tabela = faz(ed, "return document.querySelector('.doc-modal .doc-nome').textContent")
    esc(ed)
    # A janela rola POR DENTRO até o fim (com o aviso de "tem mais" sumindo) e a página de trás fica parada.
    abrir(ed, "?aba=cargos&lang=pt&tema=claro")
    faz(ed, "window.scrollTo(0, 300)")
    clica(ed, 'tr[data-doc="CG-104"]')
    r = json.loads(faz(ed, """const c = document.querySelector('[data-testid=doc-rolagem]'), m = document.querySelector('.doc-modal');
      const antes = {foco: document.activeElement === c, mais: m.classList.contains('tem-mais'), sobra: c.scrollHeight > c.clientHeight + 50, y: scrollY,
        trava: getComputedStyle(document.documentElement).overflow === 'hidden' || getComputedStyle(document.body).overflow === 'hidden'};
      return JSON.stringify(antes);"""))
    # Roda do mouse de verdade: no fundo escuro (a página de trás não pode andar) e em cima do documento (ele anda até o fim).
    ed.cmd("Input.dispatchMouseEvent", type="mouseWheel", x=8, y=450, deltaX=0, deltaY=600)
    for _ in range(12):
        ed.cmd("Input.dispatchMouseEvent", type="mouseWheel", x=600, y=500, deltaX=0, deltaY=700)
    ed.esperar(0.6)
    r["yDepois"] = faz(ed, "return scrollY")
    fim = json.loads(faz(ed, """const c = document.querySelector('[data-testid=doc-rolagem]'), a = document.querySelector('.doc-ass').getBoundingClientRect(), b = c.getBoundingClientRect();
      return JSON.stringify({noFim: c.scrollTop + c.clientHeight >= c.scrollHeight - 2, assVisivel: a.top >= b.top - 1 && a.bottom <= b.bottom + 1,
        mais: document.querySelector('.doc-modal').classList.contains('tem-mais'), rubricas: [...document.querySelectorAll('.doc-rubrica')].filter(e => e.textContent.trim()).length});"""))
    esc(ed)
    solta = faz(ed, "return getComputedStyle(document.documentElement).overflow !== 'hidden' && getComputedStyle(document.body).overflow !== 'hidden'")
    checa("4b. documento: a página de trás não rola com ele aberto; ele rola por dentro até o fim (foco nele, aviso de 'tem mais' que some no fim) e termina nas assinaturas; Esc destrava",
          r["foco"] and r["mais"] and r["sobra"] and r["trava"] and r["yDepois"] == r["y"] and fim["noFim"] and fim["assVisivel"] and not fim["mais"] and fim["rubricas"] == 2 and solta,
          f"abrir={r} fim={fim} destravou={solta}")
    checa("4. a ficha abre pelo mapa (detalhe > Abrir o documento) e pela tabela, com as 5 seções; Esc fecha",
          no_detalhe == nome_cat and pelo_mapa == nome_cat and pela_tabela == "Analista de PCP" and secoes == "missao,descricao,resp,req,comp" and fechou,
          f"detalhe='{no_detalhe}' mapa='{pelo_mapa}' tabela='{pela_tabela}' seções={secoes} fechou={fechou}")


def t5_mapa_desenho(ed):
    abrir(ed, "?aba=organograma&lang=pt&tema=claro", limpa=True)
    e = json.loads(faz(ed, """
      const C = window.CATALOGO, nos = [...document.querySelectorAll('#mapa-palco .no')];
      const pos = nos.map(b => { const c = C.porCodigo(b.dataset.cargo); return {x: parseFloat(b.style.left), y: parseFloat(b.style.top), g: c.grade, a: c.area}; });
      const yPorG = {}; pos.forEach(p => (yPorG[p.g] = yPorG[p.g] || new Set()).add(p.y.toFixed(2)));
      const gs = Object.keys(yPorG).map(Number).sort((a, b) => a - b);
      const mesmaAltura = gs.every(g => yPorG[g].size === 1);
      const sobe = gs.every((g, i) => i === 0 || [...yPorG[g]][0] < [...yPorG[gs[i - 1]]][0]);
      const xMedio = C.AREAS_ORDEM.concat(['dir']).map(a => { const l = pos.filter(p => p.a === a); return l.reduce((s, p) => s + p.x, 0) / l.length; });
      const colunas = xMedio.every((x, i) => i === 0 || x > xMedio[i - 1]);
      return JSON.stringify({nos: nos.length, cargos: C.todos().length, trilhas: document.querySelectorAll('#mapa-palco .trilha').length,
        trilhasCat: C.TRILHAS.length, mapa: window.__mapa.nos, mesmaAltura, sobe, colunas,
        familias: document.querySelectorAll('.rot-area').length, grupos: document.querySelectorAll('.rot-grupo').length});"""))
    checa("5. Escada: um ponto por cargo e uma linha por trilha; mesma grade = mesma altura, grade maior = mais alto; coluna = família, na ordem",
          e["nos"] == e["cargos"] == e["mapa"] and e["nos"] > 50 and e["trilhas"] == e["trilhasCat"] > 50 and e["mesmaAltura"] and e["sobe"]
          and e["colunas"] and e["familias"] == 9 and e["grupos"] == 4, json.dumps(e))
    clica(ed, '[data-acao="org:vista"][data-valor="orbita"]')
    o = json.loads(faz(ed, """
      const C = window.CATALOGO, nos = [...document.querySelectorAll('#mapa-palco .no')];
      const d = b => Math.hypot(parseFloat(b.style.left) / 100 * 1000 - 500, parseFloat(b.style.top) / 100 * 700 - 356);
      const porG = {}; nos.forEach(b => { const g = C.porCodigo(b.dataset.cargo).grade; (porG[g] = porG[g] || []).push(d(b)); });
      const gs = Object.keys(porG).map(Number).sort((a, b) => a - b);
      const mesmoAnel = gs.every(g => Math.max(...porG[g]) - Math.min(...porG[g]) < 0.5);
      const cresce = gs.every((g, i) => i === 0 || porG[g][0] > porG[gs[i - 1]][0]);
      return JSON.stringify({vista: window.__mapa.vista, nos: nos.length, trilhas: document.querySelectorAll('#mapa-palco .trilha').length,
        mesmoAnel, cresce, fora: document.querySelectorAll('.rot-area.rot-fora').length});"""))
    checa("5b. Órbita: os mesmos pontos e linhas; mesma grade = mesmo anel e grade maior = mais longe do centro; família por fora do arco",
          o["vista"] == "orbita" and o["nos"] == e["nos"] and o["trilhas"] == e["trilhas"] and o["mesmoAnel"] and o["cresce"] and o["fora"] == 9, json.dumps(o))


def t6_mapa_cliques(ed):
    abrir(ed, "?aba=organograma&lang=pt&tema=claro", limpa=True)
    # O caminho esperado, calculado aqui a partir das trilhas do catálogo (sem usar a tela).
    esperado = json.loads(faz(ed, """
      const T = window.CATALOGO.TRILHAS, cod = 'CG-106';
      const anda = (de, para) => { const v = new Set([cod]), f = [cod]; while (f.length) { const x = f.shift();
        T.forEach(t => { if (t[de] === x && !v.has(t[para])) { v.add(t[para]); f.push(t[para]); } }); } return v; };
      const todos = new Set([...anda(0, 1), ...anda(1, 0)]);
      const linhas = T.filter(t => todos.has(t[0]) && todos.has(t[1])).length;
      return JSON.stringify({acesos: todos.size, linhas, prox: T.filter(t => t[0] === cod).map(t => t[1]).sort(), vem: T.filter(t => t[1] === cod).map(t => t[0]).sort()});"""))
    clica(ed, '.no[data-cargo="CG-106"]')
    tela = json.loads(faz(ed, """
      const det = document.querySelector('[data-testid=org-detalhe]'), blocos = det ? [...det.querySelectorAll('.org-det-trilhas > div')] : [];
      const ordem = [...document.querySelectorAll('.tela-cab, #org-detalhe, .org-barra, #mapa-caixa')].map(e => e.id || e.className.split(' ')[0]);
      return JSON.stringify({sel: window.__mapa.sel, escolhido: document.querySelectorAll('.no.escolhido').length,
        acesos: document.querySelectorAll('.no.aceso').length, linhas: document.querySelectorAll('.trilha.acesa').length,
        apagados: document.querySelectorAll('.no.apagado').length, total: document.querySelectorAll('.no').length,
        prox: blocos[0] ? [...blocos[0].querySelectorAll('[data-cargo]')].map(b => b.dataset.cargo).sort() : null,
        vem: blocos[1] ? [...blocos[1].querySelectorAll('[data-cargo]')].map(b => b.dataset.cargo).sort() : null, ordem});"""))
    checa("6. clicar num ponto acende o caminho inteiro (de onde vem e para onde leva) e abre o detalhe logo abaixo do título",
          tela["sel"] == "CG-106" and tela["escolhido"] == 1 and tela["acesos"] == esperado["acesos"] >= 4 and tela["linhas"] == esperado["linhas"]
          and tela["apagados"] == tela["total"] - tela["acesos"] and tela["prox"] == esperado["prox"] and tela["vem"] == esperado["vem"]
          and tela["ordem"] == ["tela-cab", "org-detalhe", "org-barra", "mapa-caixa"],
          f"tela={json.dumps(tela)} esperado={json.dumps(esperado)}")
    # Faixas: por nível, os nomes dos níveis como marca-d'água; o escolhido continua aceso.
    clica(ed, '[data-acao="org:faixa"][data-valor="nivel"]')
    marcas = json.loads(faz(ed, "return JSON.stringify([...document.querySelectorAll('.rot-marca')].map(e => e.textContent))"))
    nomes = json.loads(faz(ed, "return JSON.stringify(window.CATALOGO.FAIXAS_NIVEL.map(b => b.nome[0]))"))
    continua = faz(ed, "return window.__mapa.sel === 'CG-106' && document.querySelectorAll('.no.escolhido').length === 1")
    clica(ed, '[data-acao="org:faixa"][data-valor="grade"]')
    por_grade = json.loads(faz(ed, "return JSON.stringify({g: document.querySelectorAll('.rot-grade').length, marcas: document.querySelectorAll('.rot-marca').length})"))
    checa("6b. Faixas: por nível mostra os 6 níveis (marca-d'água); por grade, G1 a G16; o cargo escolhido continua aceso",
          marcas == nomes and len(nomes) == 6 and continua and por_grade == {"g": 16, "marcas": 0}, f"marcas={marcas} grade={por_grade} continua={continua}")
    # Busca: marca os achados e diz quantos, sem perder o foco; Enter escolhe o primeiro.
    clica(ed, '[data-acao="org:limpar"]')
    digita(ed, '[data-campo="org:busca"]', "analista")
    n_esperado = faz(ed, "return window.CATALOGO.todos().filter(c => window.TRADUTOR.semAcento(c.nome[0] + ' ' + c.nome[1] + ' ' + c.codigo).includes('analista')).length")
    b = json.loads(faz(ed, """return JSON.stringify({achados: window.__mapa.achados, marcados: document.querySelectorAll('.no.achado').length,
      conta: document.getElementById('org-achados').textContent, foco: !!document.activeElement && document.activeElement.matches('[data-campo="org:busca"]'),
      detalhe: document.getElementById('org-detalhe').children.length})"""))
    faz(ed, "document.querySelector('[data-campo=\"org:busca\"]').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))")
    escolhido = faz(ed, "const s = window.__mapa.sel; return s && window.TRADUTOR.semAcento(window.CATALOGO.porCodigo(s).nome[0]).includes('analista') ? s : null")
    checa("6c. busca marca os achados e diz quantos, sem perder o foco; Enter escolhe o primeiro achado",
          b["achados"] == b["marcados"] == n_esperado > 3 and str(n_esperado) in b["conta"] and b["foco"] and b["detalhe"] == 0 and escolhido,
          f"busca={json.dumps(b, ensure_ascii=False)} esperado={n_esperado} enter={escolhido}")
    clica(ed, '[data-acao="org:limpar"]')                  # sem cargo escolhido (o escolhido fica maior de propósito)
    medida = """const p = document.getElementById('mapa-palco'), c = document.getElementById('mapa-caixa');
      return JSON.stringify({w: p.offsetWidth, rola: c.scrollWidth > c.clientWidth + 10, pct: document.getElementById('org-pct').textContent,
        n: document.querySelectorAll('#mapa-palco .no').length, ponto: document.querySelector('#mapa-palco .no').getBoundingClientRect().width});"""
    z0 = json.loads(faz(ed, medida))
    clica(ed, '[data-acao="org:mais"]', espera=0.7)          # o zoom anima (~0,3 s): mede depois que ele chega
    z1 = json.loads(faz(ed, medida))
    clica(ed, '[data-acao="org:mais"]', espera=0.7)
    z2 = json.loads(faz(ed, medida))
    clica(ed, '[data-acao="org:ajustar"]', espera=0.7)
    z3 = json.loads(faz(ed, medida))
    checa("6d. zoom suave: + aumenta o quadro (140%, depois 200%) e a caixa rola; o ponto não engorda; Ajustar volta a 100%",
          abs(z1["w"] - 1.4 * z0["w"]) <= 2 and abs(z2["w"] - 2 * z0["w"]) <= 2 and z3["w"] == z0["w"] and z1["rola"] and z1["pct"] == "140%"
          and z3["pct"] == "100%" and z2["n"] == z3["n"] == e_total(ed) and round(z2["ponto"]) == 14, json.dumps([z0, z1, z2, z3]))


def t6e_movimento(ed):
    abrir(ed, "?aba=organograma&lang=pt&tema=claro", limpa=True)
    m = json.loads(faz(ed, """
      const b = document.querySelector('#mapa-palco .no[data-cargo="CG-106"]'); b.__marca = 'mesmo';
      const antes = b.style.left + ' ' + b.style.top;
      document.querySelector('[data-acao="org:vista"][data-valor="orbita"]').click();
      const b2 = document.querySelector('#mapa-palco .no[data-cargo="CG-106"]'), cs = getComputedStyle(b2);
      return JSON.stringify({mesmo: b2.__marca === 'mesmo', mudou: (b2.style.left + ' ' + b2.style.top) !== antes,
        desliza: /left/.test(cs.transitionProperty) && Math.max(...cs.transitionDuration.split(',').map(parseFloat)) >= 0.5,
        esmaece: document.getElementById('mapa-palco').classList.contains('trocando'),
        botao: document.querySelector('[data-acao="org:vista"][data-valor="orbita"]').classList.contains('ativo')});"""))
    clica(ed, '.no[data-cargo="CG-106"]')
    d = json.loads(faz(ed, """
      const acesas = [...document.querySelectorAll('#mapa-palco .trilha.acesa')];
      const ordens = acesas.map(x => +x.style.getPropertyValue('--ordem'));
      return JSON.stringify({nomes: [...new Set(acesas.map(x => getComputedStyle(x).animationName))], comprimento: acesas[0].getAttribute('pathLength'),
        ordens: [Math.min(...ordens), Math.max(...ordens)], detalhe: getComputedStyle(document.querySelector('.org-det')).animationName});"""))
    h = json.loads(faz(ed, """
      const cod = 'CG-104', T = window.CATALOGO.TRILHAS;
      const viz = [...new Set(T.filter(t => t[0] === cod || t[1] === cod).map(t => t[0] === cod ? t[1] : t[0]))].sort();
      const b = document.querySelector('#mapa-palco .no[data-cargo="' + cod + '"]');
      b.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
      const acesos = [...document.querySelectorAll('#mapa-palco .no.vizinho')].map(x => x.dataset.cargo).sort();
      const linhas = document.querySelectorAll('#mapa-palco .trilha.realce').length;
      b.dispatchEvent(new MouseEvent('mouseout', {bubbles: true, relatedTarget: document.body}));
      return JSON.stringify({iguais: JSON.stringify(acesos) === JSON.stringify(viz), n: acesos.length, linhas,
        sobra: document.querySelectorAll('#mapa-palco .vizinho, #mapa-palco .realce').length});"""))
    abrir(ed, "?aba=organograma&lang=pt&tema=claro&foto=1")
    f = json.loads(faz(ed, """const b = document.querySelector('#mapa-palco .no'), p = document.getElementById('mapa-palco');
      const w0 = p.offsetWidth; document.querySelector('[data-acao="org:mais"]').click();
      return JSON.stringify({dur: getComputedStyle(b).transitionDuration, w0, w1: p.offsetWidth});"""))
    parado = all(float(x) == 0 for x in f["dur"].replace("s", "").split(","))
    checa("6e. movimento: Escada → Órbita com os MESMOS pontos deslizando; o caminho se desenha a partir do escolhido; o detalhe entra com transição; o mouse acende os vizinhos; com ?foto=1 nada anima",
          m["mesmo"] and m["mudou"] and m["desliza"] and m["esmaece"] and m["botao"]
          and set(d["nomes"]) <= {"desenha", "desenha-volta"} and d["comprimento"] == "1" and d["ordens"][0] == 0 and d["ordens"][1] >= 1 and d["detalhe"] == "entra"
          and h["iguais"] and h["n"] >= 1 and h["linhas"] == h["n"] and h["sobra"] == 0 and parado and abs(f["w1"] - 1.4 * f["w0"]) <= 2,
          f"troca={m} caminho={d} mouse={h} foto={f}")


def e_total(ed):
    return faz(ed, "return window.CATALOGO.todos().length")


def t7_tabela(ed):
    abrir(ed, "?aba=cargos&lang=pt&tema=claro", limpa=True)
    total = faz(ed, "return document.querySelectorAll('[data-testid=tabela-cargos] tbody tr').length")
    digita(ed, '[data-campo="tab:busca"]', "analista")
    filtrado = faz(ed, "return document.querySelectorAll('[data-testid=tabela-cargos] tbody tr').length")
    foco = faz(ed, "return !!document.activeElement && document.activeElement.matches('[data-campo=\"tab:busca\"]')")
    digita(ed, '[data-campo="tab:busca"]', "")
    clica(ed, '[data-acao="tab:csv"]')
    csv = json.loads(faz(ed, "return JSON.stringify(window.__ultimoCsv)"))
    checa("7. busca filtra sem perder o foco; CSV da tabela sai com todas as linhas e o cabeçalho",
          0 < filtrado < total and foco and csv["linhas"] == total and csv["texto"].count("\r\n") == total,
          f"{total} -> {filtrado}, foco={foco}, csv={csv['linhas']}")


# ---------------------------------------------------------------- 7o. ordenar pelo cabeçalho
# A sonda da ordem (a mesma régua da bateria do dashboard de pessoas): clica num cabeçalho de número
# e confere maior primeiro, depois invertido, depois a ordem original LINHA POR LINHA; clica num de
# texto e confere A-Z; aria-sort só na coluna ativa; a contagem de linhas nunca muda.
JS_ORDEM = r"""
window.__ord = {
  // Valor de uma célula pelo tipo: texto como está; número no formato do Brasil (1.234,5);
  // data dd/mm/aaaa vira o instante; hora HH:MM vira minutos. Sem número = vazio (null).
  val(t, tipo) {
    t = (t || '').trim();
    if (tipo === 'texto') return t;
    if (tipo === 'data') {
      let m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) return +new Date(+m[3], m[2] - 1, +m[1]);
      m = t.match(/(\d{1,2}):(\d{2})/); if (m) return m[1] * 60 + +m[2];
      return null;
    }
    const s = t.replace(/[^\d,.\-]/g, '');
    if (!/\d/.test(s)) return null;
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  },
  // A lista está em ordem? sentido 1 = crescente (A→Z), -1 = decrescente; vazio só no fim.
  ok(vals, tipo, sentido) {
    const v = vals.map(x => this.val(x, tipo)), vz = x => x == null || x === '' || (typeof x === 'number' && isNaN(x));
    let jaVazio = false;
    for (let i = 0; i < v.length; i++) {
      if (vz(v[i])) { jaVazio = true; continue; }
      if (jaVazio) return false;
      if (i > 0) {
        const c = tipo === 'texto' ? String(v[i - 1]).localeCompare(String(v[i]), 'pt', { sensitivity: 'base', numeric: true }) : v[i - 1] - v[i];
        if (c * sentido > 0) return false;
      }
    }
    return true;
  },
  // O retrato da tabela: o texto de cada linha, a coluna pedida e quem tem aria-sort.
  ler(sel, col) {
    const t = document.querySelector(sel);
    if (!t) return null;
    const linhas = [...t.querySelectorAll('tr')].filter(r => r.querySelector('td') && !r.querySelector('td[colspan]'));
    return { linhas: linhas.map(r => r.innerText), vals: linhas.map(r => r.cells[col] ? r.cells[col].innerText : ''),
      aria: [...t.querySelectorAll('th[aria-sort]')].map(th => [th.cellIndex, th.getAttribute('aria-sort')]) };
  },
  clicar(sel, col) { document.querySelector(sel).querySelectorAll('th')[col].querySelector('button').click(); }
};
"""


def ler_ordem(ed, sel, col):
    return json.loads(ed.js("JSON.stringify(window.__ord.ler(%s, %d))" % (json.dumps(sel), col)))


def em_ordem(ed, vals, tipo, sentido):
    return bool(ed.js("window.__ord.ok(%s, %s, %d)" % (json.dumps(vals), json.dumps(tipo), sentido)))


def clicar_ordem(ed, sel, col, espera=0.25):
    ed.js("window.__ord.clicar(%s, %d)" % (json.dumps(sel), col), espera=espera)


def confere(ed, sel, num, txt, depois=None):
    """Roda o ciclo inteiro numa tabela e devolve (tudo_certo, detalhe).
    sel = seletor da <table>; num = (índice, tipo) de uma coluna de número/data/hora;
    txt = índice de uma coluna de texto; depois = função que liga um filtro ou busca (ou troca de
    idioma/aba) com a tabela já ordenada pelo texto e devolve o seletor da tabela depois disso."""
    ed.js(JS_ORDEM)
    (ci, tipo), erros = num, []
    a = ler_ordem(ed, sel, ci)
    if not a or len(a["linhas"]) < 2:
        return False, f"{sel}: tabela com {0 if not a else len(a['linhas'])} linha(s), não dá para conferir a ordem"
    n0, orig = len(a["linhas"]), a["linhas"]
    clicar_ordem(ed, sel, ci)
    b = ler_ordem(ed, sel, ci)
    if not (em_ordem(ed, b["vals"], tipo, -1) and b["aria"] == [[ci, "descending"]] and len(b["linhas"]) == n0):
        erros.append(f"1º clique: decrescente={em_ordem(ed, b['vals'], tipo, -1)} aria={b['aria']} linhas {n0}->{len(b['linhas'])}")
    clicar_ordem(ed, sel, ci)
    c = ler_ordem(ed, sel, ci)
    if not (em_ordem(ed, c["vals"], tipo, 1) and c["aria"] == [[ci, "ascending"]] and len(c["linhas"]) == n0):
        erros.append(f"2º clique: crescente={em_ordem(ed, c['vals'], tipo, 1)} aria={c['aria']}")
    if b["vals"] == c["vals"] and len(set(b["vals"])) > 1:
        erros.append("2º clique não inverteu")
    clicar_ordem(ed, sel, ci)
    d = ler_ordem(ed, sel, ci)
    if not (d["linhas"] == orig and d["aria"] == []):
        erros.append(f"3º clique: voltou à ordem original={d['linhas'] == orig} aria={d['aria']}")
    clicar_ordem(ed, sel, txt)
    e = ler_ordem(ed, sel, txt)
    if not (em_ordem(ed, e["vals"], "texto", 1) and e["aria"] == [[txt, "ascending"]] and len(e["linhas"]) == n0):
        erros.append(f"texto: A-Z={em_ordem(ed, e['vals'], 'texto', 1)} aria={e['aria']}")
    if depois:
        ed.js(JS_ORDEM)
        sel2 = depois() or sel
        ed.js(JS_ORDEM)
        f = ler_ordem(ed, sel2, txt)
        if not f or not (em_ordem(ed, f["vals"], "texto", 1) and f["aria"] == [[txt, "ascending"]]):
            erros.append(f"depois do filtro/busca a ordem não ficou: {f and f['aria']}")
        nf = len(f["linhas"]) if f else 0
    clicar_ate_limpar(ed, sel if not depois else sel2, txt)
    return not erros, f"{sel}: {n0} linhas" + (f", {nf} depois do filtro" if depois else "") + ("; " + "; ".join(erros) if erros else "")


def clicar_ate_limpar(ed, sel, col):
    """Deixa a tabela na ordem original de novo (2 cliques depois do 1º), para a próxima checagem."""
    ed.js(JS_ORDEM)
    for _ in range(2):
        if ler_ordem(ed, sel, col)["aria"]:
            clicar_ordem(ed, sel, col)


def t7o_ordem(ed):
    abrir(ed, "?aba=cargos&lang=pt&tema=claro", limpa=True)
    TAB = "[data-testid=tabela-cargos]"
    conta = texto(ed, "[data-testid=conta-cargos]")
    ok_t, det_t = confere(ed, TAB, (8, "num"), 2, lambda: digita(ed, '[data-campo="tab:busca"]', "analista"))
    digita(ed, '[data-campo="tab:busca"]', "")
    conta2 = texto(ed, "[data-testid=conta-cargos]")   # ordenada por Família e sem a busca: a contagem é a de antes
    # linha clicável depois de ordenar: a 1ª linha (maior média salarial) abre o documento DAQUELE cargo
    ed.js(JS_ORDEM)
    clicar_ordem(ed, TAB, 8)
    cod = faz(ed, "return document.querySelector('[data-testid=tabela-cargos] tbody tr').dataset.doc")
    faz(ed, "document.querySelector('[data-testid=tabela-cargos] tbody tr').click()", 0.5)
    abriu = faz(ed, "return window.DOCUMENTO.aberto") == cod
    esc(ed)
    if abriu:   # foto da tabela ordenada (claro, 1440): cargos pela média salarial, maior primeiro
        faz(ed, "document.documentElement.style.scrollBehavior='auto'; document.querySelector('[data-testid=tabela-cargos]').scrollIntoView({block:'start'}); window.scrollBy(0,-120)", 0.4)
        os.makedirs(RAIZ / "tests" / "fotos", exist_ok=True)
        ed.foto(str(RAIZ / "tests" / "fotos" / "ordem_cargos.png"))
    clicar_ate_limpar(ed, TAB, 8)
    # "Cargos sem ocupante" (Visão geral): a ordem fica depois de trocar o idioma
    abrir(ed, "?aba=geral&lang=pt&tema=claro")
    ok_s, det_s = confere(ed, "#sem-corpo table", (4, "num"), 2, lambda: clica(ed, "[data-lang=en]", 0.5))
    clica(ed, "[data-lang=pt]", 0.5)
    # a lista por trás de um número (grade): ordena e a busca dela mantém a ordem; o total do título não muda
    clica(ed, '[data-drill^="grade:"]', 0.5)
    n = texto(ed, "[data-testid=g-n]")
    # a busca da lista: o cargo da última linha (filtra de verdade, sobra menos gente)
    parte = lambda: faz(ed, "return [...document.querySelectorAll('.gaveta tbody tr')].pop().cells[1].innerText.trim()")
    ok_g, det_g = confere(ed, ".gaveta table", (6, "num"), 2, lambda: digita(ed, "[data-g-busca]", parte()))
    n2 = texto(ed, "[data-testid=g-n]")
    esc(ed)
    controle = not ed.js("window.__ord.ok(['3','10','2'],'num',-1)") and bool(ed.js("window.__ord.ok(['CG-2','CG-10',''],'texto',1)"))
    checa("7o. tabelas ordenam pelo cabeçalho (Cargos, Cargos sem ocupante, lista por trás do número): número decrescente, inverte, "
          "3º clique volta linha por linha, texto A-Z, aria-sort; a ordem fica depois da busca e do idioma; linha ordenada abre o cargo certo",
          ok_t and ok_s and ok_g and abriu and conta == conta2 and n == n2 and controle,
          f"{det_t} | {det_s} | {det_g} | linha abre {cod}={abriu} | contagem {conta}={conta2}, lista {n}={n2} | controle={controle}")


def t8_requisito(ed):
    abrir(ed, "?aba=geral&lang=pt&tema=claro", limpa=True)
    r = json.loads(faz(ed, """
      const C = window.CATALOGO, ruim = /^(o cargo|a vaga|a função|a funcao|the role|the job|the position)\\b/i;
      const out = [];
      C.CARGOS.forEach(c => C.requisitos(c.nivel, c.req).forEach(r => { if (ruim.test(r.txt[0]) || ruim.test(r.txt[1])) out.push(c.codigo); }));
      C.VIAGENS.forEach(v => { if (v.req && (ruim.test(v.req[0]) || ruim.test(v.req[1]))) out.push('viagens'); });
      const vistos = C.CARGOS.reduce((s, c) => s + C.requisitos(c.nivel, c.req).length, 0);
      return JSON.stringify({ruins: out, vistos});"""))
    checa("8. requisito pede do candidato: nenhum começa com 'O cargo', 'A vaga'...", not r["ruins"] and r["vistos"] > 150,
          f"requisitos olhados {r['vistos']}, ruins {r['ruins']}")


def t9_modelo(ed):
    abrir(ed, "?lang=pt&tema=claro", limpa=True, pagina=FORM)
    clica(ed, '[data-acao="rq:verModelo"]')
    opcoes = json.loads(faz(ed, "return JSON.stringify([...document.querySelectorAll('#f-modelo option')].map(o=>o.value).filter(Boolean))"))
    meus = json.loads(faz(ed, "return JSON.stringify(window.ARMAZEM.doSolicitante(window.OCUPACAO.personas.gestor.id).map(r=>r.codigo))"))
    de_outros = json.loads(faz(ed, "return JSON.stringify(window.ARMAZEM.todas().filter(r=>r.solicitante.id!==window.OCUPACAO.personas.gestor.id).map(r=>r.codigo))"))
    escolhe(ed, "#f-modelo", "REQ-0002")
    clica(ed, '[data-acao="rq:usarModelo"]')
    novo = json.loads(faz(ed, "return JSON.stringify({nome: window.__form.F.nomePt, reenviando: window.__form.F.reenviando, original: window.ARMAZEM.porCodigo('REQ-0002').pacote.nomePt})"))
    checa("9. modelo = só pedidos da própria pessoa; usar um modelo preenche um pedido NOVO (não mexe no original)",
          opcoes and sorted(opcoes) == sorted(meus) and not set(opcoes) & set(de_outros) and de_outros
          and novo["nome"] == novo["original"] and novo["reenviando"] is None,
          f"opções {opcoes} | de outros {de_outros} | {json.dumps(novo, ensure_ascii=False)}")


def t10_descricao_igual(ed):
    abrir(ed, "?lang=pt&tema=claro", limpa=True, pagina=FORM)
    form_etapa1(ed, "Especialista em Sustentabilidade", "ops", "esp")
    clica(ed, "#bt-proximo")
    clica(ed, '[data-acao="rq:preencher"]')            # missão e responsabilidades prontas: o Continuar só depende da descrição
    clica(ed, '[data-acao="rq:descManual"]')
    desc_0002 = faz(ed, "return window.ARMAZEM.porCodigo('REQ-0002').pacote.descricao")
    digita(ed, "#f-descricao", desc_0002.upper().replace(" ", "  "))   # a mesma, com caixa e espaço diferentes
    aviso = visivel(ed, '[data-testid="aviso-desc-igual"]')
    aviso_txt = texto(ed, '[data-testid="aviso-desc-igual"]')
    nao_trava = aviso and faz(ed, "return !document.getElementById('bt-proximo').disabled")
    digita(ed, "#f-descricao", desc_0002 + " Também cuida do inventário de carbono.")
    some = not visivel(ed, '[data-testid="aviso-desc-igual"]')
    desc_0004 = faz(ed, "return window.ARMAZEM.porCodigo('REQ-0004').pacote.descricao")   # REQ-0004 está reprovado
    digita(ed, "#f-descricao", desc_0004)
    reprovado_nao = not visivel(ed, '[data-testid="aviso-desc-igual"]') and status(ed, "REQ-0004") == "reprovado"
    checa("10. descrição igual a outro pedido seu com outro título: aviso (não trava); some ao mudar; reprovado não conta",
          aviso and "REQ-0002" in aviso_txt and nao_trava and some and reprovado_nao,
          f"aviso={aviso} nao_trava={nao_trava} some={some} reprovado_nao_conta={reprovado_nao}")


def t11_fluxo(ed):
    abrir(ed, "?aba=geral&lang=pt&tema=claro", limpa=True)
    antes = e_total(ed)
    segue(ed, '[data-testid="pedir-cargo"]')                       # o botão do painel abre a página do formulário
    na_pagina = faz(ed, "return location.pathname.endsWith('requisicao.html') && !!window.__form")
    form_etapa1(ed)
    en = texto(ed, '[data-testid="nome-en"]')
    chefe = faz(ed, "return document.getElementById('f-reportaA').value")
    pulou = faz(ed, "document.querySelector('.rq-passo[data-n=\"4\"]').click(); return window.__form.F.etapa")
    if pulou != 1:   # se pulou (defeito), volta para a etapa 1: a falha sai no 11a e o resto do fluxo ainda é testado
        faz(ed, "document.querySelector('.rq-passo[data-n=\"1\"]').click()")
    clica(ed, "#bt-proximo")
    clica(ed, '[data-acao="rq:preencher"]')
    desc = texto(ed, '[data-testid="desc-auto"]')
    clica(ed, "#bt-proximo")
    padroes = json.loads(faz(ed, "const F=window.__form.F; return JSON.stringify({esc: F.esc, exp: F.exp, comp: F.comp.length, req: document.querySelectorAll('#rq-lista-req li').length})"))
    clica(ed, "#bt-proximo")
    previa = texto(ed, ".rq-previa .doc-nome")
    travado = faz(ed, "return document.getElementById('bt-enviar').disabled")
    marca(ed, "#f-termo")
    clica(ed, "#bt-enviar")
    conf = texto(ed, '[data-testid="confirmacao"] h2')
    codigo = (re.search(r"REQ-\d{4}", conf) or [""])[0]
    clica(ed, '[data-acao="rq:verMinhas"]')
    nas_minhas = faz(ed, f"const e=document.querySelector('[data-testid=lista-minhas] [data-req-item=\"{codigo}\"] [data-status]'); return e ? e.dataset.status : null")
    checa("11a. 'Pedir cargo novo' abre a página; inglês e chefe saem sozinhos; não pula etapa; descrição pronta; padrões do nível; termo trava o envio; o pedido aparece em Minhas",
          na_pagina and en == "Industrial Sustainability Analyst" and chefe and pulou == 1 and len(desc) > 80 and padroes["esc"] and padroes["exp"] is not None
          and padroes["comp"] >= 3 and padroes["req"] >= 2 and previa == "Analista de Sustentabilidade Industrial" and travado and codigo and nas_minhas == "analise",
          f"página={na_pagina} en='{en}' chefe={chefe} etapa_depois_de_pular={pulou} desc={len(desc)} padrões={padroes} prévia='{previa}' travado={travado} código={codigo} situação={nas_minhas}")
    # No painel, como Analista de RH: pré-aprovar pede confirmação; só o "Confirmar" grava.
    abrir(ed, "?aba=aprovacao&lang=pt&tema=claro&papel=analista")
    na_fila = faz(ed, f"return !!document.querySelector('[data-testid=apr-lista] [data-req-item=\"{codigo}\"]')")
    clica(ed, f'[data-testid="apr-lista"] [data-req-item="{codigo}"]')
    escolhe(ed, '[data-testid="apr-detalhe"] [data-campo="apr:grade"]', "9")
    clica(ed, '[data-acao="apr:pedir"][data-tipo="preaprovar"]')
    pediu = visivel(ed, '[data-testid="apr-confirma"]') and faz(ed, f"return window.ARMAZEM.porCodigo('{codigo}').preAprovado === null")
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:confirmar"]')
    pre = json.loads(faz(ed, f"const r=window.ARMAZEM.porCodigo('{codigo}'); return JSON.stringify({{st:r.status, g:r.preAprovado && r.preAprovado.grade}})"))
    # Master: a grade vem da pré-aprovação; aprovar também pede confirmação.
    clica(ed, '[data-acao="apr:papel"][data-valor="master"]')
    clica(ed, f'[data-testid="apr-lista"] [data-req-item="{codigo}"]')
    grade_vinda = faz(ed, "return document.querySelector('[data-testid=apr-detalhe] [data-campo=\"apr:grade\"]').value")
    clica(ed, '[data-acao="apr:pedir"][data-tipo="aprovar"]')
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:confirmar"]')
    final = json.loads(faz(ed, f"const r=window.ARMAZEM.porCodigo('{codigo}'); return JSON.stringify({{st:r.status, cargo:r.decisao && r.decisao.cargoCodigo, g:r.decisao && r.decisao.grade, hist:r.historico.map(h=>h.acao)}})"))
    linha_tempo = faz(ed, "return document.querySelectorAll('[data-testid=apr-detalhe] [data-testid=linha-do-tempo] li').length")
    depois = e_total(ed)
    clica(ed, '[data-aba="cargos"]')
    digita(ed, '[data-campo="tab:busca"]', "Sustentabilidade Industrial")
    na_tabela = faz(ed, f"return !!document.querySelector('[data-testid=tabela-cargos] tr[data-doc=\"{final['cargo']}\"]')")
    abrir(ed, "?lang=pt&tema=claro&ver=minhas", pagina=FORM)
    gestor_ve = faz(ed, f"const e=document.querySelector('[data-testid=lista-minhas] [data-req-item=\"{codigo}\"] [data-status]'); return e ? e.dataset.status : null")
    checa("11b. no painel: pré-aprovar e aprovar pedem confirmação; Analista pré-aprova (G9), Master aprova com a mesma grade, o cargo entra no catálogo e o gestor vê Aprovado na página",
          na_fila and pediu and pre == {"st": "analise", "g": 9} and grade_vinda == "9" and final["st"] == "aprovado" and final["g"] == 9
          and final["hist"] == ["enviado", "pre_aprovado", "aprovado"] and linha_tempo == 3 and depois == antes + 1 and na_tabela and gestor_ve == "aprovado",
          f"fila={na_fila} confirmação={pediu} pré={pre} master_recebeu=G{grade_vinda} final={final} linha_do_tempo={linha_tempo} catálogo {antes}->{depois} tabela={na_tabela} gestor={gestor_ve}")


def t12_alteracao_e_reprovacao(ed):
    abrir(ed, "?aba=aprovacao&lang=pt&tema=claro&papel=analista&req=REQ-0002", limpa=True)
    clica(ed, '[data-acao="apr:pedir"][data-tipo="devolver"]')
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:confirmar"]')
    erro_sem_nota = texto(ed, '[data-testid="apr-confirma"] .decisao-erro')
    continua = status(ed, "REQ-0002")
    digita(ed, '[data-testid="apr-confirma"] [data-nota]', "Inclua as metas de energia e água que o cargo vai acompanhar.")
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:confirmar"]')
    devolvido = status(ed, "REQ-0002")
    clica(ed, '[data-acao="apr:papel"][data-valor="gestor"]')
    clica(ed, '[data-testid="apr-lista"] [data-req-item="REQ-0002"]')
    segue(ed, '[data-testid="apr-detalhe"] a[href*="editar=REQ-0002"]')    # "Editar e reenviar" leva à página do formulário
    editando = faz(ed, "return window.__form.F.reenviando")
    pedido_rh = texto(ed, ".aviso-reenvio")
    for _ in range(3):
        clica(ed, "#bt-proximo")
    marca(ed, "#f-termo")
    clica(ed, "#bt-enviar")
    r2 = json.loads(faz(ed, "const r=window.ARMAZEM.porCodigo('REQ-0002'); return JSON.stringify({st:r.status, v:r.versao, ult:r.historico[r.historico.length-1].acao})"))
    checa("12. pedir alteração exige comentário; o gestor abre 'Editar e reenviar' na página do formulário, vê o pedido do RH e reenvia (Em análise, versão 2)",
          bool(erro_sem_nota) and continua == "analise" and devolvido == "alteracao" and editando == "REQ-0002" and "energia" in pedido_rh
          and r2 == {"st": "analise", "v": 2, "ult": "reenviado"},
          f"erro='{erro_sem_nota}' antes={continua} depois={devolvido} editando={editando} final={r2}")
    abrir(ed, "?aba=aprovacao&lang=pt&tema=claro&papel=master&req=REQ-0006")
    antes = status(ed, "REQ-0006")
    clica(ed, '[data-acao="apr:pedir"][data-tipo="reprovar"]')
    sem_lista = faz(ed, "return !document.querySelector('[data-testid=apr-confirma] select')")   # o motivo é só texto livre
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:confirmar"]')
    erro = texto(ed, '[data-testid="apr-confirma"] .decisao-erro')
    meio = status(ed, "REQ-0006")
    motivo = "Sem orçamento aprovado para a posição neste ano."
    digita(ed, '[data-testid="apr-confirma"] [data-nota]', motivo)
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:confirmar"]')
    rep = json.loads(faz(ed, "const r=window.ARMAZEM.porCodigo('REQ-0006'); return JSON.stringify({st:r.status, txt:r.reprovacao && r.reprovacao.nota})"))
    abrir(ed, "?aba=aprovacao&lang=pt&tema=claro&papel=master&req=REQ-0008")
    clica(ed, '[data-acao="apr:pedir"][data-tipo="aprovar"]')
    abriu = visivel(ed, '[data-testid="apr-confirma"]')
    clica(ed, '[data-testid="apr-confirma"] [data-acao="apr:cancelar"]')
    cancelou = not visivel(ed, '[data-testid="apr-confirma"]') and status(ed, "REQ-0008") == "analise"
    # O gestor lê o motivo escrito (REQ-0004 é um pedido dele, reprovado na fábrica).
    abrir(ed, "?lang=pt&tema=claro&ver=minhas", pagina=FORM)
    clica(ed, '[data-testid="lista-minhas"] [data-req-item="REQ-0004"]')
    gestor_le = texto(ed, '[data-testid="minha-detalhe"] .dec-nota') == faz(ed, "const n = window.ARMAZEM.porCodigo('REQ-0004').reprovacao.nota; return Array.isArray(n) ? n[0] : n")
    checa("12b. reprovar pede o motivo por escrito, sem lista de motivos (sem ele não confirma); o gestor lê o motivo; Cancelar não muda nada",
          antes == "analise" and sem_lista and erro and meio == "analise" and rep == {"st": "reprovado", "txt": motivo} and gestor_le and abriu and cancelou,
          f"antes={antes} sem_lista={sem_lista} erro_sem_motivo='{erro}' meio={meio} final={rep} gestor_lê={gestor_le} cancelar={abriu}/{cancelou}")


def t13_conversa(ed):
    abrir(ed, "?aba=aprovacao&lang=pt&tema=claro&papel=analista", limpa=True)
    antes = faz(ed, "return window.ARMAZEM.pendentes('analista').length")
    # Faz o que a outra aba (a página do formulário) faz ao enviar: grava a lista no
    # navegador; o navegador avisa as outras abas com o evento "storage".
    faz(ed, """const K = 'paoli-cargos-requisicoes-v1';
      const l = JSON.parse(localStorage.getItem(K) || 'null') || window.ARMAZEM.todas();
      const novo = JSON.parse(JSON.stringify(l.find(r => r.codigo === 'REQ-0002')));
      novo.codigo = 'REQ-0099'; novo.pacote.nomePt = 'Analista de Teste de Sincronia'; novo.exemplo = false;
      l.push(novo); localStorage.setItem(K, JSON.stringify(l));
      window.dispatchEvent(new StorageEvent('storage', {key: K}));""", espera=0.4)
    depois = json.loads(faz(ed, """return JSON.stringify({item: !!document.querySelector('[data-testid=apr-lista] [data-req-item="REQ-0099"]'),
      pend: window.ARMAZEM.pendentes('analista').length, selo: (document.querySelector('.aba-n') || {}).textContent})"""))
    checa("13. painel e página conversam pelo navegador: pedido gravado em outra aba entra na fila e no selo da aba sem recarregar",
          depois["item"] and depois["pend"] == antes + 1 and depois["selo"] == str(antes + 1), f"antes={antes} depois={depois}")


def t14_impressao(ed):
    abrir(ed, "?aba=cargos&lang=pt&tema=escuro&cargo=CG-104", limpa=True)
    ed.cmd("Emulation.setEmulatedMedia", media="print")
    try:
        impresso = json.loads(faz(ed, """return JSON.stringify({app: getComputedStyle(document.getElementById('app')).display,
          folha: getComputedStyle(document.querySelector('.doc-folha')).display, lado: getComputedStyle(document.querySelector('.doc-lado')).display,
          barra: getComputedStyle(document.querySelector('.doc-barra')).display, ass: getComputedStyle(document.querySelector('.doc-ass')).display,
          fundo: getComputedStyle(document.querySelector('.doc-folha')).backgroundColor})"""))
    finally:
        ed.cmd("Emulation.setEmulatedMedia", media="")
    checa("14. imprimir mostra só a folha (sem a tela de trás, sem a coluna do lado), em fundo branco e com as assinaturas",
          impresso["app"] == "none" and impresso["folha"] != "none" and impresso["lado"] == "none" and impresso["barra"] == "none"
          and impresso["ass"] != "none" and impresso["fundo"] == "rgb(255, 255, 255)", json.dumps(impresso))


def t15_celular(ed):
    # Mede contra os 390 px PEDIDOS: no modo celular o navegador pode alargar a janela
    # para caber o conteúdo, e aí comparar com a própria janela não acusa nada.
    vazou = []

    def mede(onde):
        sw, iw = ed.js("[document.documentElement.scrollWidth, innerWidth]")
        if sw > 390 or iw != 390:
            vazou.append(f"{onde}: página {sw}, janela {iw}")

    abrir(ed, "?aba=geral&lang=pt&tema=claro", limpa=True)
    for aba in ABAS:
        abrir(ed, f"?aba={aba}&lang=pt&tema=claro")
        mede(aba)
    abrir(ed, "?aba=organograma&lang=en&tema=escuro")
    clica(ed, '.no[data-cargo="CG-106"]')
    mede("mapa com detalhe")
    clica(ed, '[data-acao="org:mais"]')
    mede("mapa com zoom")
    abrir(ed, "?aba=cargos&lang=en&tema=escuro&cargo=CG-104")
    mede("ficha")
    janela = ed.js("[document.querySelector('.doc-janela').scrollWidth, document.querySelector('.doc-janela').clientWidth]")
    if janela[0] > janela[1] + 1:
        vazou.append(f"ficha por dentro: {janela}")
    abrir(ed, "?aba=geral&lang=pt&tema=claro")
    clica(ed, '[data-kpi="ocup"] .num-drill')
    mede("lista")
    abrir(ed, "?aba=aprovacao&lang=pt&tema=claro&papel=master&req=REQ-0005")
    clica(ed, '[data-acao="apr:pedir"][data-tipo="reprovar"]')
    mede("aprovação com confirmação")
    abrir(ed, "?lang=pt&tema=claro", pagina=FORM)
    form_etapa1(ed, "Analista de Tesouraria Sênior", "fin", "ana")
    mede("formulário, etapa 1")
    form_ate_revisao(ed)
    mede("formulário, revisão")
    abrir(ed, "?lang=en&tema=escuro&ver=minhas", pagina=FORM)
    mede("minhas requisições")
    checa("15. celular (390 px): nada vaza para o lado (4 abas, mapa com zoom, ficha, lista, aprovação, formulário e Minhas)", not vazou, "; ".join(vazou))
    checa("15b. sem erro de JS no celular", not erros_js(ed), "; ".join(erros_js(ed)[:3]))


# ---------------------------------------------------------------- a rodada
def rodada(largura, altura, checagens, nome_erros=None):
    s = Sessao(largura, altura)
    s.abre()
    try:
        for nome, funcao in checagens:
            rodar(nome, funcao, s)
        if nome_erros:
            erros = s.erros()
            checa(nome_erros, not erros, "; ".join(erros[:3]))
            despeja()
    finally:
        s.fecha()


rodada(1440, 900, [("1.", t1_sem_erro), ("2.", t2_numeros), ("3.", t3_conta_e_lista), ("4.", t4_ficha), ("5.", t5_mapa_desenho),
                   ("6.", t6_mapa_cliques), ("6e.", t6e_movimento), ("7.", t7_tabela), ("7o.", t7o_ordem), ("8.", t8_requisito), ("9.", t9_modelo), ("10.", t10_descricao_igual),
                   ("11.", t11_fluxo), ("12.", t12_alteracao_e_reprovacao), ("13.", t13_conversa), ("14.", t14_impressao)],
       "1c. nenhum erro de JS durante os fluxos")
rodada(390, 844, [("15.", t15_celular)])

print("\nRESULTADO:", "TUDO OK" if not falhas else f"{len(falhas)} FALHA(S)")
sys.exit(1 if falhas else 0)
