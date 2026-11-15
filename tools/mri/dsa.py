import numpy as np, math, random
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
W,H=800,760; S=3
CX,CY,RX,RY=430,370,315,285
def canvas(): im=Image.new('L',(W*S,H*S),0); return im,ImageDraw.Draw(im)
def dot(d,x,y,w,v=255):
    r=max(w*S/2,0.6); d.ellipse([x*S-r,y*S-r,x*S+r,y*S+r],fill=v)
def spline(pts,n=12):
    P=[pts[0]]+pts+[pts[-1]]; out=[]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=[np.array(p,float) for p in P[i-1:i+3]]
        n=max(4,int(np.hypot(*(p2-p1))*1.5))
        for t in np.linspace(0,1,n,endpoint=False):
            out.append(0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t**3))
    out.append(np.array(pts[-1],float)); return out
def path(d,pts,w0,w1=None):
    sp=spline(pts); w1=w0 if w1 is None else w1
    for i,p in enumerate(sp): dot(d,p[0],p[1],w0+(w1-w0)*i/len(sp))
    return sp
def inside(x,y,m=0.92): return ((x-CX)/RX)**2+((y-CY)/RY)**2<m
def vessel(d,x,y,a,w,L,rng,depth,curl=0.08,side=0.035):
    step=2.5; n=int(L/step)
    for i in range(n):
        a+=rng.gauss(0,curl)
        if not inside(x,y):
            ta=math.atan2(CY-y,CX-x); a+=0.12*math.sin(ta-a); w*=0.97
        x+=step*math.cos(a); y+=step*math.sin(a)
        dot(d,x,y,w)
        w*=0.994
        if depth>0 and w>0.55 and rng.random()<side:
            vessel(d,x,y,a+rng.choice([-1,1])*rng.uniform(0.4,1.1),w*rng.uniform(0.5,0.75),L*rng.uniform(0.35,0.7),rng,depth-1,curl*1.15,side)
        if w<0.45: break
    if depth>0 and w>0.6:
        for k in range(2):
            vessel(d,x,y,a+(k-0.5)*rng.uniform(0.5,1.0),w*0.7,L*0.55,rng,depth-1,curl*1.1,side)
def base_tree(d,rng,variant):
    thin=0.4 if variant=='moya' else 1.0
    ica=[(470,770),(468,700),(462,650),(468,610),(452,585),(420,590),(402,566),(415,536),(432,512)]
    if variant=='moya':
        path(d,ica[:6],8.5,6.5); path(d,ica[5:],6.5,2.2)
    else: path(d,ica,8.5,7.0)
    x,y=ica[-1]
    # MCA: trunk back, then candelabra of branches up/back
    mca=path(d,[(x,y),(470,500),(510,488)],5.5*thin,5*thin)
    for k in range(7):
        a=-1.55+k*0.27+rng.uniform(-.08,.08)
        vessel(d,510,488,a,3.4*thin,rng.uniform(260,380),rng,4,0.07,0.03)
    # ACA + pericallosal
    aca=path(d,[(x,y),(405,470),(372,415),(368,360),(392,305),(445,268),(520,245),(610,240),(690,262)],4.2*thin,2.6*thin)
    for i in range(10,len(aca)-1,14):
        p=aca[i]; q=aca[i+1]; a=math.atan2(q[1]-p[1],q[0]-p[0])
        vessel(d,p[0],p[1],a-1.3,2.0*thin,rng.uniform(80,160),rng,3,0.08,0.03)
    # PCom/PCA
    vessel(d,420,540,0.15,2.6*thin,330,rng,3,0.07,0.025)
def background(rng):
    bg=0.82+ndi.gaussian_filter(rng.standard_normal((H,W)),30)*0.3
    yy,xx=np.mgrid[0:H,0:W]
    r=np.hypot((xx-CX)/(RX+18),(yy-CY)/(RY+18))
    bg-=np.exp(-((r-1)**2)/0.0012)*0.05
    return bg
def finish(im,rng,blush=None):
    m=np.asarray(im.resize((W,H),Image.LANCZOS),np.float32)/255.
    m=ndi.gaussian_filter(m,0.8)
    img=background(rng)
    if blush is not None: img*= (1-blush)
    img*=(1-0.78*np.clip(m,0,1))
    img+=ndi.gaussian_filter(rng.standard_normal(img.shape),0.7)*0.02
    return np.clip(img,0,1)
def blushmap(cx,cy,rx,ry,amt):
    yy,xx=np.mgrid[0:H,0:W]; return amt*np.exp(-(((xx-cx)/rx)**2+((yy-cy)/ry)**2))
def save(a,p): Image.fromarray((a*255).astype('uint8')).save(p)
def make(variant,seed=5):
    rng=random.Random(seed); nr=np.random.default_rng(seed)
    im,d=canvas(); base_tree(d,rng,variant)
    bl=blushmap(560,330,230,170,0.06)
    if variant=='avm':
        cx,cy=640,330
        path(d,[(510,488),(560,430),(605,380),(625,350)],5.0,4.2)
        for i in range(150):
            a=rng.uniform(0,6.28); rr=rng.uniform(0,40)
            vessel(d,cx+rr*math.cos(a),cy+rr*math.sin(a)*0.8,rng.uniform(0,6.28),rng.uniform(1.4,2.6),rng.uniform(25,55),rng,0,0.35,0)
        path(d,[(650,300),(672,240),(668,175),(630,125),(560,92)],7.5,9)
        path(d,[(560,92),(470,80),(360,88),(260,115),(180,160),(140,210)],10,10)
        bl=bl+blushmap(cx,cy,45,38,0.25)
    if variant=='moya':
        for i in range(260):
            x0=432+rng.uniform(-30,30); y0=505+rng.uniform(-25,25)
            vessel(d,x0,y0,rng.uniform(-3.1,0.0),rng.uniform(0.5,1.1),rng.uniform(30,90),rng,1,0.3,0.02)
        bl=bl*0.5+blushmap(432,500,70,55,0.18)
    return finish(im,nr,bl)
for v in ['normal','avm','moya']: save(make(v),f'out/dsa_{v}.png')
