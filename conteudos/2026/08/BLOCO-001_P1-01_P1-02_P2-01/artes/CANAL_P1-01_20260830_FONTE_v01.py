from pathlib import Path
from io import BytesIO
import urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[5]
BLOCK = ROOT / "conteudos/2026/08/BLOCO-001_P1-01_P1-02_P2-01/artes"
ASSETS = ROOT / "assets/marca"
BLOCK.mkdir(parents=True, exist_ok=True)

AZUL = "#2C5F8A"
AZUL_ESCURO = "#1E4363"
AZUL_CLARO = "#DCE8F0"
LARANJA = "#E8935A"
LARANJA_ESCURO = "#C96E36"
GRAFITE = "#3A3A3A"
BRANCO = "#FFFFFF"
GELO = "#F7F7F5"
AMARELO = "#F0B429"

FONT_DIR = ROOT / ".cache_fonts"
FONT_DIR.mkdir(exist_ok=True)

def download(url, name):
    p = FONT_DIR / name
    if not p.exists():
        try:
            urllib.request.urlretrieve(url, p)
        except Exception:
            return None
    return p if p.exists() else None

space = download("https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf", "SpaceGrotesk.ttf")
inter = download("https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf", "Inter.ttf")
mono = download("https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf", "IBMPlexMono-Regular.ttf")

def f(path, size):
    try:
        return ImageFont.truetype(str(path), size=size)
    except Exception:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size=size)

def bold(path, size):
    try:
        font = ImageFont.truetype(str(path), size=size)
        try:
            font.set_variation_by_name("Bold")
        except Exception:
            pass
        return font
    except Exception:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size=size)

def fit_logo(img, box, max_w, max_h):
    logo = Image.open(ASSETS / "logo-secundario.png").convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    ratio = min(max_w/logo.width, max_h/logo.height)
    logo = logo.resize((int(logo.width*ratio), int(logo.height*ratio)), Image.Resampling.LANCZOS)
    x,y = box
    img.alpha_composite(logo, (x, y))
    return logo.size

def dots(draw, x, y, cols=5, rows=3, gap=22, r=5):
    for j in range(rows):
        for i in range(cols):
            cx=x+i*gap; cy=y+j*gap
            draw.ellipse((cx-r,cy-r,cx+r,cy+r), fill=AMARELO)

def wrap(draw, text, font, max_width):
    words=text.split()
    lines=[]; cur=""
    for w in words:
        test=(cur+" "+w).strip()
        if draw.textbbox((0,0), test, font=font)[2] <= max_width:
            cur=test
        else:
            if cur: lines.append(cur)
            cur=w
    if cur: lines.append(cur)
    return lines

def service_icon(draw, cx, cy, kind, scale=1.0):
    r=int(46*scale)
    draw.ellipse((cx-r,cy-r,cx+r,cy+r), outline=AZUL_ESCURO, width=max(2,int(3*scale)), fill=BRANCO)
    w=max(2,int(3*scale))
    if kind=="print":
        draw.rectangle((cx-20*scale,cy-18*scale,cx+20*scale,cy+14*scale), outline=AZUL_ESCURO,width=w)
        draw.rectangle((cx-14*scale,cy+6*scale,cx+14*scale,cy+24*scale), outline=AZUL_ESCURO,width=w)
    elif kind=="photo":
        draw.rounded_rectangle((cx-24*scale,cy-16*scale,cx+24*scale,cy+20*scale), radius=int(5*scale), outline=AZUL_ESCURO,width=w)
        draw.ellipse((cx-9*scale,cy-6*scale,cx+9*scale,cy+12*scale), outline=AZUL_ESCURO,width=w)
    elif kind=="digital":
        draw.rectangle((cx-19*scale,cy-24*scale,cx+19*scale,cy+24*scale), outline=AZUL_ESCURO,width=w)
        for yy in (-10,0,10):
            draw.line((cx-10*scale,cy+yy,cx+10*scale,cy+yy), fill=AZUL_ESCURO,width=w)
    elif kind=="gift":
        draw.rectangle((cx-22*scale,cy-8*scale,cx+22*scale,cy+24*scale), outline=AZUL_ESCURO,width=w)
        draw.line((cx,cy-8*scale,cx,cy+24*scale), fill=AZUL_ESCURO,width=w)
        draw.arc((cx-20*scale,cy-26*scale,cx,cy-4*scale),180,360, fill=AZUL_ESCURO,width=w)
        draw.arc((cx,cy-26*scale,cx+20*scale,cy-4*scale),180,360, fill=AZUL_ESCURO,width=w)
    elif kind=="visual":
        draw.rectangle((cx-25*scale,cy-18*scale,cx+25*scale,cy+18*scale), outline=AZUL_ESCURO,width=w)
        draw.line((cx-15*scale,cy+8*scale,cx-3*scale,cy-3*scale,cx+8*scale,cy+6*scale,cx+18*scale,cy-6*scale), fill=AZUL_ESCURO,width=w)
    elif kind=="finish":
        draw.rectangle((cx-18*scale,cy-25*scale,cx+21*scale,cy+25*scale), outline=AZUL_ESCURO,width=w)
        for yy in range(-20,21,10):
            draw.ellipse((cx-25*scale,cy+yy-2*scale,cx-19*scale,cy+yy+4*scale), fill=AZUL_ESCURO)

SERVICES = [
    ("print","IMPRESSÃO\nE XEROX"),
    ("photo","FOTOS E\nREVELAÇÃO"),
    ("digital","SERVIÇOS\nDIGITAIS"),
    ("gift","PERSONALIZADOS\nE PRESENTES"),
    ("visual","COMUNICAÇÃO\nVISUAL"),
    ("finish","ACABAMENTOS\nE ENCADERNAÇÃO"),
]

def channel():
    img=Image.new("RGBA",(1080,1080),GELO)
    d=ImageDraw.Draw(img)
    # white institutional header
    d.rectangle((0,0,1080,250),fill=BRANCO)
    fit_logo(img,(56,50),580,150)
    # blue hero with curved white/blue geometry
    d.rounded_rectangle((-45,220,760,700), radius=85, fill=AZUL_ESCURO)
    d.polygon([(820,0),(1080,0),(1080,700),(900,700),(735,520)], fill=AZUL)
    dots(d,930,52,5,3,23,5)
    title1=bold(space,72); title2=bold(space,72)
    d.text((58,300),"PAPEL E DIGITAL,",font=title1,fill=BRANCO)
    d.text((58,385),"SEM COMPLICAÇÃO.",font=title2,fill=LARANJA)
    d.line((60,478,545,478), fill=LARANJA, width=5)
    dots(d,570,475,4,1,24,5)
    body_b=bold(inter,31); body=f(inter,30)
    d.text((60,520),"Chegou o Canal da JS Gráfica.",font=body_b,fill=BRANCO)
    d.text((60,563),"Papel, digital e personalizados",font=body,fill=BRANCO)
    d.text((60,602),"para resolver o dia a dia no",font=body,fill=BRANCO)
    d.text((60,641),"Ibura, Recife.",font=body_b,fill=LARANJA)
    # right visual - service system, not a second logo
    d.ellipse((690,205,1050,565), fill=BRANCO, outline=AZUL_ESCURO, width=8)
    d.text((795,245),"O QUE\nA GENTE\nRESOLVE",font=bold(space,38),fill=AZUL_ESCURO,spacing=6,align="center")
    d.line((760,405,980,405), fill=AZUL_CLARO,width=4)
    d.text((760,425),"IMPRESSÃO • DIGITAL\nPERSONALIZADOS",font=bold(inter,20),fill=LARANJA_ESCURO,align="center")
    # service strip
    y0=735
    for i,(kind,label) in enumerate(SERVICES):
        cx=90+i*180
        service_icon(d,cx,y0,kind,0.82)
        ft=bold(inter,16)
        lines=label.split("\n")
        yy=y0+52
        for ln in lines:
            tw=d.textbbox((0,0),ln,font=ft)[2]
            d.text((cx-tw/2,yy),ln,font=ft,fill=AZUL_ESCURO)
            yy+=20
    # CTA
    d.rounded_rectangle((76,900,1004,980),radius=40,fill=BRANCO,outline=AZUL_CLARO,width=2)
    d.ellipse((105,918,145,958),fill="#25D366")
    d.text((175,917),"ACOMPANHE POR AQUI.",font=bold(space,25),fill=AZUL_ESCURO)
    d.text((500,920),"Para pedir, fale com a equipe no WhatsApp.",font=f(inter,22),fill=GRAFITE)
    # footer
    d.rectangle((0,1000,1080,1080),fill=AZUL)
    d.text((60,1020),"IBURA, RECIFE",font=bold(mono,24),fill=AMARELO)
    d.text((300,1020),"•  JS GRÁFICA",font=f(mono,22),fill=BRANCO)
    return img.convert("RGB")

def status():
    img=Image.new("RGBA",(1080,1920),GELO)
    d=ImageDraw.Draw(img)
    # safe top
    d.rectangle((0,0,1080,340),fill=BRANCO)
    fit_logo(img,(150,110),780,165)
    dots(d,70,74,4,3,22,5); dots(d,920,74,4,3,22,5)
    # hero
    d.rounded_rectangle((45,370,1035,1120), radius=80, fill=AZUL_ESCURO)
    d.polygon([(830,370),(1035,370),(1035,1120),(880,1120),(740,950)],fill=AZUL)
    ft1=bold(space,94)
    d.text((105,460),"PAPEL E",font=ft1,fill=BRANCO)
    d.text((105,560),"DIGITAL,",font=ft1,fill=BRANCO)
    d.text((105,675),"SEM",font=ft1,fill=LARANJA)
    d.text((105,775),"COMPLICAÇÃO.",font=bold(space,75),fill=LARANJA)
    d.line((105,885,590,885),fill=LARANJA,width=6); dots(d,620,882,4,1,24,5)
    d.text((105,930),"Chegou o Canal da JS Gráfica.",font=bold(inter,33),fill=BRANCO)
    d.text((105,980),"Papel, digital e personalizados",font=f(inter,31),fill=BRANCO)
    d.text((105,1022),"para resolver o dia a dia no",font=f(inter,31),fill=BRANCO)
    d.text((105,1064),"Ibura, Recife.",font=bold(inter,31),fill=LARANJA)
    # services
    start=1225
    for i,(kind,label) in enumerate(SERVICES):
        y=start+i*86
        service_icon(d,125,y,kind,0.58)
        d.text((185,y-24),label.replace("\n"," "),font=bold(inter,22),fill=AZUL_ESCURO)
        if i<5:
            d.line((185,y+34,935,y+34),fill=AZUL_CLARO,width=2)
    # CTA
    d.rounded_rectangle((85,1720,995,1810),radius=45,fill=BRANCO,outline=AZUL_CLARO,width=2)
    d.ellipse((115,1742,160,1787),fill="#25D366")
    d.text((190,1735),"ACOMPANHE POR AQUI.",font=bold(space,28),fill=AZUL_ESCURO)
    d.text((190,1772),"Para pedir, fale com a equipe no WhatsApp.",font=f(inter,22),fill=GRAFITE)
    # safe bottom
    d.rectangle((0,1840,1080,1920),fill=AZUL)
    d.text((105,1862),"IBURA, RECIFE",font=bold(mono,25),fill=AMARELO)
    d.text((360,1862),"• JS GRÁFICA",font=f(mono,23),fill=BRANCO)
    return img.convert("RGB")

def save_all():
    a=channel()
    s=status()
    a.save(BLOCK/"CANAL_P1-01_20260830_ARTE_v01.png", optimize=True)
    a.save(BLOCK/"CANAL_P1-01_20260830_ARTE_v01.jpg", quality=92, optimize=True, progressive=True)
    s.save(BLOCK/"CANAL_P1-01_20260830_STATUS_v01.png", optimize=True)
    s.save(BLOCK/"CANAL_P1-01_20260830_STATUS_v01.jpg", quality=92, optimize=True, progressive=True)

if __name__=="__main__":
    save_all()
