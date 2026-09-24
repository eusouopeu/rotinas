#!/usr/bin/env python3
"""Regras legadas por classe — ferramenta de migração para Tailwind.

uso: python3 webapp/scripts/regras-legadas.py webapp/src/screens/Metas.tsx [outros.tsx ...]

Lista, para cada classe usada nos arquivos, TODAS as regras do app.css que a
tocam (com linha e contexto @media), inclusive as que só valem dentro de outro
seletor (`.set-secao-body > .stat-card`). É o levantamento do que o utilitário
novo precisa reproduzir. Só lê o app.css; não altera nada."""
import re, sys
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
css = open(os.path.join(RAIZ, 'app.css')).read()
css_nc = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)

# parse simples de regras com contexto @media
regras = []  # (contexto, seletor, corpo, linha)
def parse(txt, base, ctx):
    i = 0
    while i < len(txt):
        j = txt.find('{', i)
        if j < 0: break
        sel = txt[i:j].strip()
        depth = 1; k = j + 1
        while k < len(txt) and depth:
            if txt[k] == '{': depth += 1
            elif txt[k] == '}': depth -= 1
            k += 1
        corpo = txt[j+1:k-1]
        linha = css.count('\n', 0, base + i + (len(txt[i:j]) - len(txt[i:j].lstrip()))) + 1
        if sel.startswith('@media') or sel.startswith('@supports'):
            parse(corpo, base + j + 1, ctx + [sel])
        elif not sel.startswith('@'):
            regras.append((' > '.join(ctx), sel, corpo.strip(), linha))
        i = k
parse(css_nc, 0, [])

usadas = set()
for f in sys.argv[1:]:
    src = open(f).read()
    for m in re.finditer(r'className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})', src):
        for t in filter(None, m.groups()):
            for c in re.findall(r'[a-zA-Z][\w-]*', re.sub(r'\$\{[^}]*\}', ' ', t)): usadas.add(c)
    for m in re.finditer(r'"((?:[a-zA-Z][\w-]*)(?: [a-zA-Z][\w-]*)*)"', src):
        for c in m.group(1).split(): usadas.add(c)
classes_css = set(re.findall(r'\.([a-zA-Z][\w-]*)', css_nc))
usadas &= classes_css
for c in sorted(usadas):
    print(f'\n##### .{c}')
    for ctx, sel, corpo, ln in regras:
        if re.search(r'\.' + re.escape(c) + r'(?![\w-])', sel):
            corpo1 = re.sub(r'\s+', ' ', corpo)
            print(f'  L{ln}{" ["+ctx+"]" if ctx else ""} {re.sub(chr(10)+" *"," ",sel)} {{ {corpo1} }}')
