from base import *
out='out/'; os.makedirs(out,exist_ok=True)
def edema(h,cx,cy,r,seed,amt=0.62):
    e=blobmask(h.t1.shape,cx,cy,r,irr=0.3,seed=seed,soft=r*0.35)
    e=np.clip(e*(h.wm**2.2)*1.6,0,1)
    return ndi.gaussian_filter(e,3)
dark=lambda k: (lambda img,m: img*(1-m*k))
# 1a benign
h=Head('ax',28,seed=2); H,W=h.t1.shape
cx,cy,r=560,300,60
push(h,cx,cy,r,46)
h.add(blobmask((H,W),cx,cy,r+5,irr=0.03,seed=3,soft=4),{'t1':0.10})   # CSF cleft
h.add(blobmask((H,W),cx,cy,r,irr=0.04,seed=3,soft=5),{'t1':0.82})
save(h.render('t1'),out+'benign_t1c.png')
# 1b malignant
h=Head('ax',28,seed=4)
cx,cy,r=545,330,56
push(h,cx,cy,r,26)
h.add(edema(h,cx,cy,r*2.6,5),{'t1':dark(0.42),'flair':lambda img,m: img*(1-m)+0.85*m})
h.add(blobmask((H,W),cx,cy,r,irr=0.14,seed=6,soft=6),{'t1':0.84,'flair':0.7})
h.add(blobmask((H,W),cx+7,cy+5,r*0.6,irr=0.2,seed=7,soft=7),{'t1':0.24,'flair':0.6})
save(h.render('t1'),out+'malig_t1c.png')
# 2 glioma FLAIR
h=Head('ax',24,seed=8)
cx,cy=545,360
push(h,cx,cy,60,12)
inf=np.clip(blobmask((H,W),cx,cy,135,irr=0.3,seed=10,soft=40)*(0.35+0.65*h.wm**1.5),0,1)
h.add(ndi.gaussian_filter(inf,4)*0.75,{'flair':lambda img,m: img*(1-m)+0.88*m})
h.add(blobmask((H,W),cx,cy,72,irr=0.2,seed=9,soft=12),{'flair':0.86})
save(h.render('flair'),out+'glioma_flair.png')
# 3 metastases
h=Head('ax',32,seed=11)
for (x,y,r,s) in [(300,250,20,1),(560,380,28,2),(420,620,15,3)]:
    h.add(edema(h,x,y,r*3.6,20+s),{'t1':dark(0.42)})
    h.add(blobmask((H,W),x,y,r,irr=0.06,seed=30+s,soft=4),{'t1':0.86})
    h.add(blobmask((H,W),x,y,r*0.42,irr=0.1,seed=40+s,soft=4),{'t1':0.32})
save(h.render('t1'),out+'mets_t1c.png')
