from pathlib import Path
import urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).parent
ASSETS = ROOT / "assets/marca"

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

def download(url, filename):
    path = FONT_DIR / filename
    if not path.exists():
        urllib.request.urlretrieve(url, path)
    return path

SPACE = download("https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf", "SpaceGrotesk.ttf")
INTER = download("https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf", "Inter.ttf")
MONO = download("https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf", "IBMPlexMono-Regular.ttf")

def font(path, size):
    return ImageFont.truetype(str(path), size=size)

def logo(canvas, x, y, max_w=470, max_h=130):
    mark = Image.open(ASSETS / "logo-secundario.png").convert("RGBA")
    box = mark.getbbox()
    if box:
        mark = mark.crop(box)
    scale = min(max_w / mark.width, max_h / mark.height)
    mark = mark.resize((int(mark.width * scale), int(mark.height * scale)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, (x, y))

def dots(d, x, y, cols=4, rows=2, gap=21):
    for row in range(rows):
        for col in range(cols):
            cx, cy = x + col * gap, y + row * gap
            d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=AMARELO)

def speech(d, cx, cy, scale=1):
    w = int(72 * scale); h = int(54 * scale); line = max(3, int(4 * scale))
    d.rounded_rectangle((cx-w//2, cy-h//2, cx+w//2, cy+h//2), radius=int(14*scale), outline=AZUL_ESCURO, width=line, fill=BRANCO)
    d.polygon([(cx-int(13*scale), cy+h//2), (cx-int(2*scale), cy+h//2), (cx-int(12*scale), cy+int(34*scale))], fill=BRANCO, outline=AZUL_ESCURO)
    for dx in (-17, 0, 17):
        d.ellipse((cx+int(dx*scale)-3, cy-3, cx+int(dx*scale)+3, cy+3), fill=AZUL_ESCURO)

def document(d, cx, cy, scale=1, duplicate=False):
    w = int(105*scale); h = int(135*scale); line=max(3,int(4*scale))
    if duplicate:
        d.rounded_rectangle((cx-w//2-21*scale, cy-h//2+18*scale, cx+w//2-21*scale, cy+h//2+18*scale), radius=int(8*scale), outline=AZUL_CLARO, width=line, fill=BRANCO)
    d.rounded_rectangle((cx-w//2, cy-h//2, cx+w//2, cy+h//2), radius=int(8*scale), outline=AZUL_ESCURO, width=line, fill=BRANCO)
    d.line((cx-int(30*scale),cy-int(22*scale),cx+int(28*scale),cy-int(22*scale)),fill=LARANJA_ESCURO,width=line)
    d.line((cx-int(30*scale),cy,cx+int(28*scale),cy),fill=AZUL_ESCURO,width=line)
    d.line((cx-int(30*scale),cy+int(22*scale),cx+int(10*scale),cy+int(22*scale)),fill=AZUL_ESCURO,width=line)

def step_card(d, x, y, n, title, body, height=170, title_size=31, body_size=24):
    d.rounded_rectangle((x,y,x+890,y+height),radius=28,fill=BRANCO,outline=AZUL_CLARO,width=3)
    circle=max(56, min(84, height-36)); cy=y+height//2
    d.ellipse((x+34,cy-circle//2,x+34+circle,cy+circle//2),fill=AZUL)
    nfont=font(SPACE,max(30,min(42,circle//2)))
    tw=d.textbbox((0,0),str(n),font=nfont)[2]
    d.text((x+34+circle/2-tw/2,cy-(d.textbbox((0,0),str(n),font=nfont)[3]-d.textbbox((0,0),str(n),font=nfont)[1])/2),str(n),font=nfont,fill=BRANCO)
    d.text((x+150,y+18),title,font=font(SPACE,title_size),fill=AZUL_ESCURO)
    d.text((x+150,y+height-43),body,font=font(INTER,body_size),fill=GRAFITE)

def save_pair(img, stem):
    rgb=img.convert("RGB")
    rgb.save(OUT / f"{stem}.png", optimize=True)
    rgb.save(OUT / f"{stem}.jpg", quality=92, optimize=True, progressive=True)

def p1_02_channel():
    img=Image.new("RGBA",(1080,1080),GELO); d=ImageDraw.Draw(img)
    d.rectangle((0,0,1080,210),fill=BRANCO); logo(img,55,45); dots(d,930,60)
    d.rounded_rectangle((45,245,1035,875),radius=68,fill=AZUL_ESCURO)
    d.polygon([(820,245),(1035,245),(1035,875),(900,875),(750,680)],fill=AZUL)
    d.text((85,285),"PRECISA RESOLVER",font=font(SPACE,46),fill=BRANCO)
    d.text((85,340),"ALGUMA COISA?",font=font(SPACE,46),fill=LARANJA)
    step_card(d,95,430,1,"CONTE O QUE PRECISA.","Envie uma mensagem para a equipe.",height=115,title_size=24,body_size=18)
    step_card(d,95,565,2,"ENVIE ARQUIVO OU FOTO.","Quando você já tiver o material.",height=115,title_size=24,body_size=18)
    step_card(d,95,700,3,"A EQUIPE ORIENTA.","O próximo passo é confirmado com você.",height=115,title_size=24,body_size=18)
    d.rounded_rectangle((80,915,1000,995),radius=38,fill=BRANCO)
    speech(d,130,955,.62)
    d.text((190,934),"FALE COM A EQUIPE",font=font(SPACE,24),fill=AZUL_ESCURO)
    d.text((190,966),"no WhatsApp ou no atendimento no balcão.",font=font(INTER,20),fill=GRAFITE)
    return img

def p1_02_status():
    img=Image.new("RGBA",(1080,1920),GELO); d=ImageDraw.Draw(img)
    d.rectangle((0,0,1080,310),fill=BRANCO); logo(img,150,90,780,150); dots(d,70,70); dots(d,925,70)
    d.rounded_rectangle((45,350,1035,760),radius=68,fill=AZUL_ESCURO)
    d.polygon([(810,350),(1035,350),(1035,760),(900,760),(735,625)],fill=AZUL)
    d.text((90,435),"PRECISA",font=font(SPACE,82),fill=BRANCO)
    d.text((90,535),"RESOLVER",font=font(SPACE,82),fill=BRANCO)
    d.text((90,635),"ALGUMA COISA?",font=font(SPACE,58),fill=LARANJA)
    step_card(d,95,845,1,"CONTE O QUE PRECISA.","Mande uma mensagem para a equipe.")
    step_card(d,95,1045,2,"ENVIE ARQUIVO OU FOTO.","Quando você já tiver o material.")
    step_card(d,95,1245,3,"A EQUIPE ORIENTA.","O próximo passo é confirmado com você.")
    d.rounded_rectangle((85,1585,995,1690),radius=42,fill=BRANCO,outline=AZUL_CLARO,width=2)
    speech(d,140,1638,.7)
    d.text((205,1612),"CHAME A JS GRÁFICA",font=font(SPACE,29),fill=AZUL_ESCURO)
    d.text((205,1650),"WhatsApp ou atendimento no balcão.",font=font(INTER,23),fill=GRAFITE)
    d.rectangle((0,1840,1080,1920),fill=AZUL)
    d.text((90,1865),"IBURA, RECIFE",font=font(MONO,26),fill=AMARELO)
    return img

def p2_01_channel():
    img=Image.new("RGBA",(1080,1080),GELO); d=ImageDraw.Draw(img)
    d.rectangle((0,0,1080,210),fill=BRANCO); logo(img,55,45); dots(d,930,60)
    d.rounded_rectangle((45,245,1035,790),radius=68,fill=AZUL_ESCURO)
    d.polygon([(820,245),(1035,245),(1035,790),(900,790),(735,620)],fill=AZUL)
    d.text((85,305),"IMPRIMIR OU",font=font(SPACE,63),fill=BRANCO)
    d.text((85,380),"TIRAR XEROX?",font=font(SPACE,63),fill=LARANJA)
    d.text((85,485),"Impressão e xerox para",font=font(INTER,29),fill=BRANCO)
    d.text((85,527),"as tarefas do dia a dia.",font=font(INTER,29),fill=BRANCO)
    d.ellipse((680,350,975,645),fill=BRANCO,outline=AZUL_CLARO,width=6)
    document(d,827,492,1.35,True)
    d.rounded_rectangle((80,850,1000,950),radius=42,fill=BRANCO,outline=AZUL_CLARO,width=2)
    d.text((120,872),"TRAGA OU ENVIE SEU ARQUIVO.",font=font(SPACE,28),fill=AZUL_ESCURO)
    d.text((120,912),"Fale com a equipe para orientação.",font=font(INTER,23),fill=GRAFITE)
    d.rectangle((0,1000,1080,1080),fill=AZUL)
    d.text((60,1024),"IBURA, RECIFE",font=font(MONO,24),fill=AMARELO)
    return img

def p2_01_status():
    img=Image.new("RGBA",(1080,1920),GELO); d=ImageDraw.Draw(img)
    d.rectangle((0,0,1080,310),fill=BRANCO); logo(img,150,90,780,150); dots(d,70,70); dots(d,925,70)
    d.rounded_rectangle((45,350,1035,1050),radius=68,fill=AZUL_ESCURO)
    d.polygon([(810,350),(1035,350),(1035,1050),(900,1050),(735,870)],fill=AZUL)
    d.text((90,445),"IMPRIMIR",font=font(SPACE,83),fill=BRANCO)
    d.text((90,545),"OU TIRAR",font=font(SPACE,83),fill=BRANCO)
    d.text((90,645),"XEROX?",font=font(SPACE,83),fill=LARANJA)
    d.text((90,775),"Impressão e xerox para",font=font(INTER,31),fill=BRANCO)
    d.text((90,820),"as tarefas do dia a dia.",font=font(INTER,31),fill=BRANCO)
    d.ellipse((325,1150,755,1580),fill=BRANCO,outline=AZUL_CLARO,width=8)
    document(d,540,1365,1.7,True)
    d.rounded_rectangle((85,1660,995,1760),radius=42,fill=BRANCO,outline=AZUL_CLARO,width=2)
    d.text((125,1680),"TRAGA OU ENVIE SEU ARQUIVO.",font=font(SPACE,26),fill=AZUL_ESCURO)
    d.text((125,1718),"Fale com a equipe para orientação.",font=font(INTER,22),fill=GRAFITE)
    d.rectangle((0,1840,1080,1920),fill=AZUL)
    d.text((90,1865),"IBURA, RECIFE",font=font(MONO,26),fill=AMARELO)
    return img

if __name__ == "__main__":
    save_pair(p1_02_channel(), "CANAL_P1-02_20260830_ARTE_v01")
    save_pair(p1_02_status(), "CANAL_P1-02_20260830_STATUS_v01")
    save_pair(p2_01_channel(), "CANAL_P2-01_20260830_ARTE_v01")
    save_pair(p2_01_status(), "CANAL_P2-01_20260830_STATUS_v01")
