#!/usr/bin/env python3
"""Copy the licensed asset packs into public/assets and compose the two station scenes.

The packs are NOT in the repo (their licenses forbid redistributing raw files).
Each teammate buys/downloads them and runs:

  pip install pillow numpy py7zr
  python scripts/setup_assets.py --portraits cozy-space-portraits.zip \
      --icons cozy-space-icons-ui.zip --marsbase Mars_Base.7z --bg mountains.png

Every argument accepts a .zip, a .7z or an already extracted folder.
"""
import argparse, pathlib, random, shutil, sys, tempfile, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'assets'
W, H, HOR = 1280, 720, 232
MB = None
BG_PATH = None


def unpack(p, tmp):
    p = pathlib.Path(p)
    if p.is_dir():
        return p
    d = pathlib.Path(tempfile.mkdtemp(dir=tmp))
    if p.suffix.lower() == '.zip':
        with zipfile.ZipFile(p) as z:
            for m in z.namelist():
                if m.startswith('/') or '..' in pathlib.PurePosixPath(m).parts:
                    sys.exit(f'Unsafe path in {p}: {m}')
            z.extractall(d)
    elif p.suffix.lower() == '.7z':
        import py7zr
        with py7zr.SevenZipFile(p) as z:
            z.extractall(d)
    else:
        sys.exit(f'Expected a folder, .zip or .7z: {p}')
    return d


def find_dir(root, must):
    hits = sorted(root.rglob(must), key=lambda f: ('4x' not in f.parts, len(f.parts)))
    if hits:
        return hits[0].parent
    sys.exit(f'Could not find {must} under {root}')


def load(n, s=1.0):
    im = Image.open(MB / n).convert('RGBA'); im = im.crop(im.getbbox())
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS if s < 1 else Image.NEAREST)


def hexc(h): return np.array([int(h[i:i+2],16) for i in (1,3,5)],float)
def noise(w,h,sx,sy,seed):
    r=np.random.default_rng(seed); a=r.random((max(2,h//sy),max(2,w//sx)))
    return np.array(Image.fromarray((a*255).astype('uint8')).resize((w,h),Image.BICUBIC),float)/255
def build(out,sky0,sky1,mt,gr,haze,hz,sun,sunr,hero,seed=7,grade=(.92,.06),glow=None):
    # sky
    a=np.zeros((H,W,3)); 
    bands=18
    for y in range(HOR+20):
        t=int(y/(HOR+20)*bands)/bands; a[y,:]=hexc(sky0)*(1-t)+hexc(sky1)*t
    img=Image.fromarray(a.astype('uint8')).convert('RGBA'); d=ImageDraw.Draw(img,'RGBA')
    sx,sy=930,92
    G0=Image.new('RGBA',(W,H),(0,0,0,0)); DG=ImageDraw.Draw(G0)
    DG.ellipse([sx-sunr*3,sy-sunr*3,sx+sunr*3,sy+sunr*3],fill=(*sun,90))
    img.alpha_composite(G0.filter(ImageFilter.GaussianBlur(sunr*1.6)))
    d=ImageDraw.Draw(img); d.ellipse([sx-sunr,sy-sunr,sx+sunr,sy+sunr],fill=(*sun,255))
    # mountains from user's background strip, tinted to pack palette
    bg=Image.open(BG_PATH).convert('RGBA').crop((0,40,1280,215))
    arr=np.array(bg,float); lum=(arr[...,:3].mean(2,keepdims=True))/170
    arr[...,:3]=np.clip(lum*hexc(mt),0,255)
    bg=Image.fromarray(arr.astype('uint8'),'RGBA'); img.alpha_composite(bg,(0,HOR-160))
    # far haze over mountains
    # ground
    gh=(H-HOR)//3; gw=W//3
    n=(0.55*noise(gw,gh,46,7,seed)+0.3*noise(gw,gh,16,4,seed+1)+0.15*noise(gw,gh,5,2,seed+2))
    yy=np.linspace(0,1,gh)[:,None]; v=np.clip((n-.28)/.44,0,1)*.75+yy*.25
    q=np.round(v*6)/6
    c0,c1=hexc(gr[0]),hexc(gr[1]); g=c0[None,None,:]*(1-q[...,None])+c1[None,None,:]*q[...,None]
    r=np.random.default_rng(seed+3); mask=r.random((gh,gw))<.05; g[mask]*=.92
    ga=Image.fromarray(g.astype('uint8')).resize((gw*3,gh*3),Image.NEAREST).convert('RGBA'); img.paste(ga,(0,HOR)); 
    L=Image.new('RGBA',(W,H),(0,0,0,0)); D=ImageDraw.Draw(L); hc0=tuple(int(x) for x in hexc(mt))
    D.rectangle([0,HOR-10,W,HOR+12],fill=(*hc0,190)); img.alpha_composite(L.filter(ImageFilter.GaussianBlur(9)))
    random.seed(seed)
    def fx(im):
        rgb=ImageEnhance.Color(im.convert('RGB')).enhance(grade[0]); o=Image.new('RGB',im.size,tuple(int(x) for x in hexc(haze)))
        rgb=Image.blend(rgb,o,grade[1]); rgb.putalpha(im.getchannel('A')); return rgb
    def shadow(cx,fy,w,al=120,long_=.55):
        L=Image.new('RGBA',(W,H),(0,0,0,0)); D=ImageDraw.Draw(L)
        D.polygon([(cx-w*.46,fy-5),(cx+w*.46,fy-5),(cx+w*(.46+long_),fy+w*.13),(cx-w*.3+w*long_,fy+w*.13)],fill=(24,8,6,int(al*.62)))
        D.ellipse([cx-w*.54,fy-w*.07,cx+w*.54,fy+w*.075],fill=(24,8,6,al))
        img.alpha_composite(L.filter(ImageFilter.GaussianBlur(5)))
    def put(n,cx,fy,s,al=120,sh=True,sq=1.0):
        im=load(n,s)
        if sq!=1: im=im.resize((im.width,int(im.height*sq)))
        if sh: shadow(cx,fy,im.width,al)
        c=fx(im); img.alpha_composite(c,(int(cx-im.width/2),int(fy-im.height)))
    # base pad and tracks
    L=Image.new('RGBA',(W,H),(0,0,0,0)); D=ImageDraw.Draw(L)
    dk=tuple(int(x) for x in hexc(gr[0])*.74)
    D.ellipse([95,395,1230,548],fill=(*dk,120))
    for pts in ([(640,520),(520,590),(380,720)],[(1000,490),(1120,560),(1240,620)],[(170,500),(70,560),(0,590)]):
        D.line(pts,fill=(*dk,170),width=22)
    img.alpha_composite(L.filter(ImageFilter.GaussianBlur(7)))
    # scattered rocks and craters, far to near, outside the pad
    rocks=['Mars_rock_1.png','Mars_rock_2.png','Mars_rock_3.png','Mars_rock_4.png','mar_rocks_1.png','Mars_rock_5.png','Mars_rock_6.png']
    items=[]
    for i in range(46):
        y=random.randint(HOR+22,700); x=random.randint(0,1280)
        if 80<x<1240 and 345<y<535: continue
        items.append((y,x,random.choice(rocks)))
    for x,y,n,s in ((70,330,'crater_1.png',.7),(1190,318,'crater_2.png',.62),(250,640,'crater_3.png',1.15)): put(n,x,y,s,sh=False,sq=.42)
    for y,x,n in sorted(items):
        t=(y-HOR)/(H-HOR); put(n,x,y,.22+.8*t,al=90)
    # pipes between buildings (ground level)
    L=Image.new('RGBA',(W,H),(0,0,0,0)); D=ImageDraw.Draw(L)
    for pts in ([(1000,475),(905,462),(860,440)],[(640,410),(530,428),(430,440)],[(430,445),(330,458),(270,456)],[(1105,478),(1040,474)]):
        D.line(pts,fill=(38,36,48,255),width=4); D.line([(a,b-2) for a,b in pts],fill=(120,122,136,255),width=1)
    img.alpha_composite(L)
    # buildings far to near
    for n,cx,fy,s,al in sorted(hero,key=lambda z:z[2]): put(n,cx,fy,s,al)
    # dust streaks and overall haze with depth
    L=Image.new('RGBA',(W,H),(0,0,0,0)); D=ImageDraw.Draw(L); hc=tuple(int(x) for x in hexc(haze))
    for i in range(10):
        y=random.randint(HOR+30,640); x=random.randint(-200,1100); D.ellipse([x,y,x+random.randint(240,620),y+random.randint(6,18)],fill=(*hc,int(26+hz*70)))
    img.alpha_composite(L.filter(ImageFilter.GaussianBlur(5)))
    out_a=np.array(img.convert('RGB'),float); ys=np.arange(H)[:,None,None]
    depth=np.clip(1-(ys-HOR)/(H-HOR),0,1); depth[ys[:,0,0]<HOR]=1
    al=hz*(.28+.62*depth); out_a=out_a*(1-al)+hexc(haze)[None,None,:]*al
    if glow:
        Lg=np.zeros((H,W)); 
        Yg,Xg=np.ogrid[:H,:W]
        for cx,cy,r0,p in glow: Lg+=p*np.exp(-(((Xg-cx)/r0)**2+((Yg-cy)/(r0*.7))**2))
        out_a+=Lg[...,None]*np.array([255,178,92.])
    # vignette
    xs=np.linspace(-1,1,W)[None,:,None]; yv=np.linspace(-1,1,H)[:,None,None]; out_a*=1-.2*(xs**2*.6+yv**2*.5)
    Image.fromarray(np.clip(out_a,0,255).astype('uint8')).save(out)

LAYOUT = [('Mars_Communications_Building.png', 640, 412, .92, 130), ('MARS_OXYGEN_PLANT.png', 850, 452, .62, 120),
          ('Mars_Laboratory_building.png', 430, 452, .62, 120), ('Mars_Greenhouse_Buildings.png', 640, 512, .78, 120),
          ('Mars_Habitat_buildings_3.png', 270, 470, .62, 110), ('Mars_Habitat_buildings_1.png', 160, 500, .62, 110),
          ('Large_Water_Tank.png', 1000, 492, .95, 100), ('Large_Mars_Solar_Panel_1.png', 1105, 496, .95, 90),
          ('Large_Mars_Solar_Panel_1.png', 1195, 508, .95, 90), ('Small_Mars_Solar_Panel.png', 1090, 420, .7, 60),
          ('Small_Mars_Solar_Panel.png', 1160, 424, .7, 60), ('mars_lights.png', 530, 520, .7, 60), ('mars_lights.png', 770, 520, .7, 60)]


def main():
    global MB, BG_PATH
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--portraits', required=True); a.add_argument('--icons', required=True)
    a.add_argument('--marsbase', required=True); a.add_argument('--bg', required=True, help='mountain strip PNG (no water)')
    o = a.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        por = find_dir(unpack(o.portraits, tmp), 'captain-ada-neutral.png')
        ico = find_dir(unpack(o.icons, tmp), 'icon-heart.png')
        MB = find_dir(unpack(o.marsbase, tmp), 'Mars_Communications_Building.png')
        BG_PATH = pathlib.Path(o.bg)
        for sub in ('portraits', 'icons', 'marsbase', 'scenes'):
            (OUT / sub).mkdir(parents=True, exist_ok=True)
        # prefer the 4x folder when the pack ships several sizes
        por_ui = find_dir(por.parent.parent, 'dialog-box-light.png')
        ico_ui = find_dir(ico.parent.parent, 'panel-dark.png')
        (OUT / 'ui').mkdir(parents=True, exist_ok=True)
        for src, dst, pat in ((por, 'portraits', '*.png'), (ico, 'icons', 'icon-*.png'), (MB, 'marsbase', '*.png'),
                              (por_ui, 'ui', '*.png'), (ico_ui, 'ui', '*.png')):
            for f in src.glob(pat):
                shutil.copy2(f, OUT / dst / f.name)
        print('copied', *(f'{d}: {len(list((OUT / d).glob("*.png")))}' for d in ('portraits', 'icons', 'marsbase', 'ui')))
        S = OUT / 'scenes'
        build(S / 'clear.png', '#C98F5E', '#E9C291', '#B56A47', ('#8E4426', '#C4703C'), '#D9A878', .10, (255, 246, 226), 9, LAYOUT)
        build(S / 'storm.png', '#4A2A28', '#8A5238', '#6D3F2E', ('#4E2519', '#7E4427'), '#7C4A33', .40, (226, 190, 150), 6, LAYOUT,
              seed=9, grade=(.78, .10), glow=[(530, 492, 70, .42), (770, 492, 70, .42), (640, 370, 105, .3), (430, 420, 60, .22), (850, 410, 60, .22)])
        for png in S.glob('*.png'):
            Image.open(png).save(png.with_suffix('.webp'), 'WEBP', quality=88, method=6)
            png.unlink()  # the game loads the 5x smaller WebP
        print('scenes:', *sorted(p.name for p in S.iterdir()))


if __name__ == '__main__':
    main()
