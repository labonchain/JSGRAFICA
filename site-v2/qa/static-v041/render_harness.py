from __future__ import annotations
import html, json, pathlib, subprocess, shutil
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIXTURE = json.loads((ROOT / 'qa/fixtures/storefront-v040.json').read_text())
CSS = (ROOT / 'src/app/globals.css').read_text().replace('@import "tailwindcss";', '')
OUT = ROOT / 'qa/static-v041/generated'
SHOTS = ROOT / 'qa/screenshots-v0.4.1'
OUT.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)

AREAS = [
    ('▤','Impressões','Documentos, coloridas e papéis especiais.'),
    ('◉','Fotos','3×4, formatos fotográficos e Polaroid.'),
    ('▥','Acabamentos','Encadernação e plastificação.'),
    ('◫','Personalizados / Comunicação Visual','Arte, topo de bolo, banners, adesivos e mais.'),
    ('⌘','Serviços Digitais e Documentos','Documentos, consultas, cadastros e atendimento digital.'),
    ('▧','Papelaria / Conveniência','Itens disponíveis no atendimento da gráfica.'),
    ('↻','Recargas','Recargas cadastradas no catálogo público.'),
    ('▣','Produtos Digitais','Área própria do catálogo digital.'),
]

PRINT_GROUPS=['Documentos / Xerox','Coloridas','Papel Adesivo','Papel Cartão','Papel Couchê','Papel Fotográfico','Panfletos e Cartões']

def e(v): return html.escape(str(v))
def brl(v): return f"R$ {v:,.2f}".replace(',', 'X').replace('.', ',').replace('X','.')

def header():
    return '''<header class="site-header"><div class="container header-inner"><a class="brand">JS <span>Gráfica</span></a><nav class="desktop-nav"><a>Produtos e Serviços</a><a>Produtos Digitais</a><a>Serviços</a><a>Personalizados</a><a>Portfólio</a><a>Contato</a></nav><details class="mobile-nav"><summary>Menu</summary></details><a class="button whatsapp header-cta">WhatsApp</a></div></header>'''

def breadcrumb(*parts):
    lis=''.join(f'<li>{e(p)}</li>' for p in parts)
    return f'<nav class="breadcrumbs container"><ol>{lis}</ol></nav>'

def intro(eyebrow,title,text):
    return f'<section class="store-page-intro container"><p class="eyebrow">{e(eyebrow)}</p><h1>{e(title)}</h1><p>{e(text)}</p></section>'

def source_note():
    return '<div class="store-source-note"><strong>Dados de QA</strong><span>Fixture isolada do v0.4.0; produção continua dependente das RPCs públicas.</span></div>'

def catalog(items, groups=None, limit=None, query=''):
    if limit: items=items[:limit]
    group_opts=''.join(f'<option>{e(g)}</option>' for g in (groups or sorted({i["group"] for i in items})))
    cards=[]
    for i in items:
        cards.append(f'''<article class="store-product-card"><div class="store-product-cover"><span>{e(i['group'])}</span><b>{e(i['name'])}</b>{f"<small>{e(i.get('meta',''))}</small>" if i.get('meta') else ''}</div><div class="store-product-info"><small>{e(i['code'])}</small><strong>{brl(i['price'])}</strong><div>{'<a class="button primary store-button">Ver detalhes</a>' if i.get('href') else ''}<a class="button secondary store-button">Pedir este serviço</a></div></div></article>''')
    return f'''<div class="store-catalog-live"><div class="store-catalog-search"><span>⌕</span><input value="{e(query)}" placeholder="Buscar produto ou serviço..."><button>{'Limpar' if query else 'Buscar'}</button></div><div class="store-live-controls"><label>Filtrar<select><option>Todos</option>{group_opts}</select></label><label>Ordenar<select><option>Nome A–Z</option><option>Menor preço</option><option>Maior preço</option></select></label></div><p class="store-result-count">{len(items)} itens</p><div class="store-product-grid">{''.join(cards)}</div></div>'''

def hub_grid():
    return '<nav class="store-hub-grid">'+''.join(f'<a><span>{icon}</span><div><h2>{e(title)}</h2><p>{e(text)}</p><b>Ver opções →</b></div></a>' for icon,title,text in AREAS)+'</nav>'

def subcats(groups):
    return '<nav class="store-subcat-grid">'+''.join(f'<a><span>{e(g)}</span><b>{"Ver opções →" if g in ("Papel Couchê","Encadernação") else "Filtrar abaixo ↓"}</b></a>' for g in groups)+'</nav>'

def wrap(body, width=390, height=844):
    mobile = ''
    if width < 700:
        mobile = '''
        .desktop-nav{display:none!important}.mobile-nav{display:block!important}.header-inner{display:grid!important;grid-template-columns:auto 1fr auto!important;gap:8px!important}.brand{font-size:18px!important}.header-cta{padding:9px 12px!important}.store-hub-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.store-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.store-subcat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.store-service-detail{grid-template-columns:1fr!important}.store-service-visual{min-height:230px!important}.store-live-controls{grid-template-columns:1fr 1fr!important}.store-facts{grid-template-columns:repeat(2,minmax(0,1fr))!important}.container{width:auto!important;max-width:none!important;margin-left:16px!important;margin-right:16px!important}.store-page-intro{padding-top:28px!important}.store-product-cover{min-height:145px!important}
        '''
    extra=f'''<style>@page{{size:{width}px {height}px;margin:0}} html,body{{width:{width}px;margin:0;overflow:hidden}} .site-header{{position:relative}} .store-product-card,.store-hub-grid>a,.store-subcat-grid>a,.store-variant-panel,.store-order-panel{{break-inside:avoid}} footer{{display:none}} {mobile}</style>'''
    return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style>{extra}</head><body>{header()}{body}</body></html>'

def save(name, body, width=390, height=844):
    html_path=OUT/f'{name}-{width}.html'; pdf_path=OUT/f'{name}-{width}.pdf'
    html_path.write_text(wrap(body,width,height))
    subprocess.run(['weasyprint','-m','screen',str(html_path),str(pdf_path)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    prefix=OUT/f'{name}-{width}-page'
    subprocess.run(['pdftoppm','-png','-r','96',str(pdf_path),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    pages=sorted(OUT.glob(f'{name}-{width}-page-*.png'))
    images=[Image.open(p).convert('RGB') for p in pages]
    canvas=Image.new('RGB',(max(i.width for i in images),sum(i.height for i in images)),'white')
    y=0
    for im in images:
        canvas.paste(im,(0,y)); y+=im.height
    out=SHOTS/f'{name}-{"mobile" if width<700 else "desktop"}.png'
    canvas.save(out,optimize=True)
    for im in images: im.close()
    return out

# 01 hub
hub_body=breadcrumb('Início','Produtos e Serviços')+intro('Catálogo da JS Gráfica','Produtos e Serviços','Encontre impressões, fotos, acabamentos, personalizados, serviços digitais e outras opções públicas sem precisar conhecer as categorias internas do cadastro.')+f'<section class="store-section container">{hub_grid()}</section>'+f'<section class="store-section store-catalog-section container"><div class="store-section-title"><div><p class="eyebrow">Busca no catálogo</p><h2>O que você procura?</h2></div></div>{source_note()}{catalog(FIXTURE,limit=12)}</section>'
save('01-hub-produtos-servicos',hub_body)
save('01-hub-produtos-servicos',hub_body,1365,900)

# 02 prints
prints=[i for i in FIXTURE if i['area']=='impressoes' or i['group']=='Papel Fotográfico']
body=breadcrumb('Início','Produtos e Serviços','Impressões')+intro('Produtos e Serviços','Impressões','Documentos, impressões coloridas e papéis especiais organizados em categorias públicas fáceis de entender.')+f'<section class="store-section container">{subcats(PRINT_GROUPS)}</section>'+f'<section class="store-section container">{source_note()}{catalog(prints,PRINT_GROUPS,limit=14)}</section>'
save('02-impressoes',body)

# 03 Couche selector
couche=[i for i in FIXTURE if i['group']=='Papel Couchê']
selected=next(i for i in couche if i.get('attributes',{}).get('format')=='A3' and i.get('attributes',{}).get('weight')=='300g' and i.get('attributes',{}).get('sides')=='frente e verso')
variant=f'''<section class="store-variant-panel"><div class="store-variant-step"><b>1. Formato</b><div><button>A4</button><button class="active">A3</button></div></div><div class="store-variant-step"><b>2. Gramatura</b><div><button>90g</button><button>250g</button><button class="active">300g</button></div></div><div class="store-variant-step"><b>3. Impressão</b><div><button>só frente</button><button class="active">frente e verso</button></div></div><div class="store-variant-result"><small>{selected['code']}</small><h2>{e(selected['name'])}</h2><strong>{brl(selected['price'])}</strong><a class="button whatsapp">Pedir pelo WhatsApp</a></div></section>'''
body=breadcrumb('Início','Produtos e Serviços','Impressões','Papel Couchê')+intro('Impressões','Papel Couchê','Escolha formato, gramatura e tipo de impressão. O seletor evita mostrar várias combinações quase idênticas como cards separados.')+f'<section class="store-section container">{source_note()}{variant}</section>'
save('03-papel-couche',body)

# 04 photos
photos=[i for i in FIXTURE if i['area']=='fotos']
body=breadcrumb('Início','Produtos e Serviços','Fotos')+intro('Produtos e Serviços','Fotos','Fotos 3×4, formatos fotográficos, Polaroid e impressão em papel fotográfico disponíveis conforme a fonte pública.')+f'<section class="store-section container">{source_note()}{catalog(photos)}</section>'
save('04-fotos',body)

# 05 finishes
fin=[i for i in FIXTURE if i['area']=='acabamentos']
body=breadcrumb('Início','Produtos e Serviços','Acabamentos')+intro('Produtos e Serviços','Acabamentos','Finalize seus materiais com encadernação ou plastificação, sem misturar faixas e formatos.')+f'<section class="store-section container">{subcats(["Encadernação","Plastificação"])}</section>'+f'<section class="store-section container">{source_note()}{catalog(fin,["Encadernação","Plastificação"])}</section>'
save('05-acabamentos',body)

# 06 binding
binding=[i for i in FIXTURE if i['group']=='Encadernação']
body=breadcrumb('Início','Produtos e Serviços','Acabamentos','Encadernação')+intro('Acabamentos','Encadernação','Selecione a faixa correspondente à quantidade de folhas do seu material.')+f'<section class="store-section container">{source_note()}{catalog(binding,["Encadernação"])}</section>'
save('06-encadernacao',body)

# 07 personalized
personal=[i for i in FIXTURE if i['area']=='personalizados']
body=breadcrumb('Início','Produtos e Serviços','Personalizados')+intro('Personalizados / Comunicação Visual','Sua ideia, do seu jeito','Escolha uma oferta pública e envie o pedido para personalização ou orçamento pelo WhatsApp contextual.')+f'<section class="store-section container">{source_note()}{catalog(personal,limit=12)}</section>'
save('07-personalizados',body)

# 08 digital
digital=[i for i in FIXTURE if i['area']=='digitais']
body=breadcrumb('Início','Produtos e Serviços','Serviços Digitais')+intro('Atendimento digital','Serviços Digitais e Documentos','Escolha o atendimento necessário e envie sua solicitação com o contexto do serviço. A página pública não exige que o cliente conheça termos internos do cadastro.')+f'<section class="store-section container">{source_note()}{catalog(digital,limit=10)}</section>'
save('08-servicos-digitais',body)

# 09 adhesive detail
adh=[i for i in FIXTURE if i['group']=='Papel Adesivo' and i.get('attributes',{}).get('format')=='A4' and i.get('attributes',{}).get('weight')=='192g']
opts=''.join(f'<label><input type="radio"><span><span>{e(i.get("attributes",{}).get("cut"))}</span><b>{brl(i["price"])}</b></span></label>' for i in adh)
order=f'''<section class="store-order-panel"><fieldset><legend>Acabamento / opção</legend>{opts}</fieldset><label class="store-quantity-field">Quantidade a informar<input value="1"></label><div class="store-order-total"><span>Valor unitário</span><strong>{brl(adh[0]['price'])}</strong></div><a class="button whatsapp full">Pedir pelo WhatsApp</a></section>'''
body=breadcrumb('Início','Produtos e Serviços','Impressões','Papel Adesivo A4 192g')+f'''<section class="store-section container store-service-detail"><div class="store-service-visual"><span>Papel Adesivo</span><b>A4<br>192g</b><small>Imagem demonstrativa da categoria — asset oficial entra pela camada pública.</small></div><div><p class="eyebrow">Impressão · Papel Adesivo</p><h1>Impressão Papel Adesivo A4 192g</h1><p class="store-detail-copy">Impressão em papel adesivo no formato A4. As opções de acabamento e os valores abaixo vêm da fonte ativa utilizada neste ambiente.</p><dl class="store-facts"><div><dt>Formato</dt><dd>A4</dd></div><div><dt>Material</dt><dd>Papel adesivo 192g</dd></div><div><dt>Acabamento</dt><dd>Conforme opções publicadas</dd></div></dl>{source_note()}{order}</div></section>'''
save('09-papel-adesivo-detalhe',body)

# 10 services
services=[i for i in FIXTURE if i['area'] in ('impressoes','fotos','acabamentos','digitais','personalizados')][:16]
service_areas=[('▤','Impressões e Xerox','Documentos, P&B, coloridas e papéis especiais.'),('◉','Fotos','3×4 e formatos fotográficos.'),('▥','Encadernação','Faixas organizadas por quantidade de folhas.'),('▰','Plastificação','Pequena, média, A4 e A3 conforme fonte pública.'),('⌘','Serviços Digitais','Documentos, cadastros e demandas digitais.'),('⌕','Documentos e Consultas','2ª via, CPF, SCPC, Serasa e demais itens publicados.'),('◫','Personalizados','Criação, topo de bolo e itens personalizados.'),('◆','Comunicação Visual','Banners, lonas e adesivos conforme catálogo público.')]
sg='<nav class="store-hub-grid">'+''.join(f'<a><span>{a}</span><div><h2>{e(t)}</h2><p>{e(x)}</p><b>Ver serviços →</b></div></a>' for a,t,x in service_areas)+'</nav>'
body=breadcrumb('Início','Serviços')+intro('Atendimento da JS Gráfica','Serviços','Escolha uma área, encontre o serviço e envie o pedido pelo WhatsApp com o item identificado.')+f'<section class="store-section container">{sg}</section>'+f'<section class="store-section container"><div class="store-section-title"><div><p class="eyebrow">Catálogo de atendimento</p><h2>Encontre um serviço</h2></div></div>{source_note()}{catalog(services,limit=12)}</section>'
save('10-servicos-revisada',body)

# 11 empty + 12 error source states
body=breadcrumb('Início','Produtos e Serviços')+intro('Catálogo da JS Gráfica','Produtos e Serviços','Estado vazio seguro quando a fonte pública não retorna itens elegíveis.')+f'<section class="store-section container">{hub_grid()}<section class="empty-state store-source-state"><h2>Nenhum item público disponível</h2><p>Nenhum item público compatível foi retornado pelo read-model.</p></section></section>'
save('11-estado-vazio',body)
body=breadcrumb('Início','Produtos e Serviços')+intro('Catálogo da JS Gráfica','Produtos e Serviços','Estado explícito de erro sem fallback silencioso para fixture.')+f'<section class="store-section container">{hub_grid()}<section class="empty-state store-source-state"><h2>Catálogo temporariamente indisponível</h2><p>Falha de comunicação com a fonte pública do catálogo.</p></section></section>'
save('12-estado-erro',body)

print('generated', len(list(SHOTS.glob('*.png'))), 'screenshots')
