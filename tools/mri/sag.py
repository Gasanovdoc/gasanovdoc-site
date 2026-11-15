from base import *
from PIL import ImageDraw
OX,OY=140,260
h=Head('sag',1,seed=21)
push(h,540-OX,575,28,22)
img=np.pad(h.render('t1',noise=0.025),((0,OY),(OX,0)))
brain=np.pad(h.brain,((0,OY),(OX,0)))
Hh,Ww=img.shape
rng=np.random.default_rng(3)
def poly(pts,blur=1.2):
    im=Image.new('L',(Ww,Hh),0); ImageDraw.Draw(im).polygon(pts,fill=255)
    return ndi.gaussian_filter(np.asarray(im,np.float32)/255.,blur)
def ell(x0,y0,x1,y1,blur=1.5):
    im=Image.new('L',(Ww,Hh),0); ImageDraw.Draw(im).ellipse([x0,y0,x1,y1],fill=255)
    return ndi.gaussian_filter(np.asarray(im,np.float32)/255.,blur)
def line(pts,w,blur=1.2):
    im=Image.new('L',(Ww,Hh),0); ImageDraw.Draw(im).line(pts,fill=255,width=w,joint='curve')
    return ndi.gaussian_filter(np.asarray(im,np.float32)/255.,blur)
def tex(s=2,a=0.12): return 1+a*ndi.gaussian_filter(rng.standard_normal((Hh,Ww)),s)
def paint(m,v,protect=True):
    global img
    if protect: m=m*(1-ndi.gaussian_filter(brain.astype(np.float32),1.0))
    img=img*(1-m)+np.clip(v*tex(),0,1)*m
face=[(198,560),(206,600),(196,640),(150,700),(108,760),(118,782),(176,792),(166,830),(178,850),(166,872),(186,930),(250,965),(330,985),(430,1016),(880,1016),(880,780),(700,770),(700,770),(640,560),(580,585),(530,600),(480,596),(300,588),(215,548)]
fm=poly(face,4)
mott=lambda: 0.30+0.18*ndi.gaussian_filter(rng.standard_normal((Hh,Ww)),6)/0.08
paint(fm,0.36)
bd=ndi.distance_transform_edt(~brain)
paint(ndi.gaussian_filter(((bd<5)&(bd>0)).astype(np.float32),1.2)*fm,0.07)
# skull base bone (mottled marrow) band under anterior cranial fossa and around sphenoid
bonem=poly([(240,620),(500,615),(560,640),(560,700),(430,800),(430,700),(240,700)],5)
paint(bonem,0.46)
img=img*(1-bonem*0.3*np.clip(ndi.gaussian_filter(rng.standard_normal(img.shape),4)*3,0,1))
# frontal sinus
paint(blobmask((Hh,Ww),232,565,26,irr=0.15,seed=4,soft=4,aspect=1.6),0.05,False)
# nasal cavity air (organic) + turbinates
nas=blobmask((Hh,Ww),320,725,120,irr=0.08,seed=5,soft=8,aspect=0.5,rot=0.05)
paint(nas,0.06)
for i,(x,y,r) in enumerate([(330,690,85),(325,730,95),(320,768,92)]):
    paint(blobmask((Hh,Ww),x,y,r,irr=0.12,seed=10+i,soft=7,aspect=0.14,rot=0.03)*nas,0.24)
# sphenoid sinus (air) – organic with septation
sph=blobmask((Hh,Ww),500,690,55,irr=0.12,seed=6,soft=5,aspect=0.75)
paint(sph,0.05)
# clivus: cortex + marrow
paint(poly([(585,600),(600,620),(612,700),(625,800),(640,860),(600,860),(560,760),(555,650)],3),0.06)   # prepontine CSF
paint(poly([(560,640),(580,630),(590,700),(605,790),(575,800),(545,740),(548,680)],2),0.08)
cl=poly([(565,650),(578,642),(585,700),(597,780),(580,785),(556,735),(556,680)],3)
paint(cl,0.62)
img=img*(1-cl*0.25*np.clip(ndi.gaussian_filter(rng.standard_normal(img.shape),3)*4,0,1))
# sella floor/dorsum (thin dark cortical bone)
paint(line([(500,620),(510,640),(540,648),(566,640),(574,612)],7,1.5),0.07,False)
# pharynx + palate (soft, partially in crop)
paint(line([(180,800),(445,802)],14,2.5),0.55)
# soften painted region
sm=ndi.gaussian_filter(img,1.6); w=fm*(1-ndi.gaussian_filter(brain.astype(np.float32),2))
img=img*(1-w)+sm*w
img=np.clip(img+ndi.gaussian_filter(rng.standard_normal(img.shape),0.8)*0.03*w,0,1)
# adenoma (T1 + contrast): snowman shape in sella extending up, chiasm draped over it
ad=np.maximum(blobmask((Hh,Ww),540,614,29,irr=0.05,seed=2,soft=4),blobmask((Hh,Ww),537,582,24,irr=0.06,seed=3,soft=4))
paint(ad,0.74,False)
paint(line([(500,545),(522,538),(552,536),(575,546)],8,1.5),0.55,False)
save(img,'out/sag_adenoma.png',crop=(430,790,330,790)); save(img,'out/sag_full.png')
