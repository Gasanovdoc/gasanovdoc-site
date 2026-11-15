from base import *
import random
out='out/'
# Cavernoma: T2 + SWI
def cav_maps(h,cx,cy,seed):
    H,W=h.t1.shape; rng=np.random.default_rng(seed)
    pops=[]
    for i in range(22):
        t=rng.uniform(0,6.28); rr=rng.uniform(0,24)
        x,y=cx+rr*np.cos(t),cy+rr*np.sin(t); r=rng.uniform(6,11)
        pops.append((blobmask((H,W),x,y,r,irr=0.1,seed=seed+i,soft=3),rng.choice([0.95,0.8,0.4,0.6,0.25])))
    outer=blobmask((H,W),cx,cy,40,irr=0.1,seed=seed+50,soft=4)
    inner=blobmask((H,W),cx,cy,33,irr=0.1,seed=seed+50,soft=4)
    random.seed(seed); vx,vy=cx+62,cy-58; pl=[]
    for i in range(7):
        a=random.uniform(2.6,4.6); L=random.uniform(25,42)
        pl.append(([(vx+L*np.cos(a),vy+L*np.sin(a)),(vx+L*0.5*np.cos(a)+random.uniform(-4,4),vy+L*0.5*np.sin(a)),(vx,vy)],2))
    pl.append(([(vx,vy),(vx+18,vy-22),(vx+30,vy-55),(vx+34,vy-85)],4))
    dva=ndi.gaussian_filter(lines_mask((H,W),pl,2),1.2)*h.brain
    return pops,outer,inner,dva
for seq,name in [('t2','cav_t2'),('swi','cav_swi')]:
    h=Head('ax',14,seed=12); cx,cy=520,420
    pops,outer,inner,dva=cav_maps(h,cx,cy,100)
    if seq=='t2':
        h.add(outer,{'t2':0.12})
        h.add(inner,{'t2':0.55})
        for m,v in pops: h.add(m*inner,{'t2':v})
        h.add(dva*0.8,{'t2':0.18})
    else:
        h.add(blobmask(h.t1.shape,cx,cy,36,irr=0.12,seed=7,soft=9),{'swi':0.04})
        h.add(dva,{'swi':0.08})
    save(h.render(seq),out+name+'.png')
# Neurinoma: axial T1+C at CPA
h=Head('ax',-28,seed=13); H,W=h.t1.shape
cx,cy=468,528
push(h,cx,cy,28,18)
h.add(blobmask((H,W),cx,cy,30,irr=0.06,seed=4,soft=4),{'t1':0.84})
h.add(blobmask((H,W),cx+32,cy-22,12,irr=0.05,seed=5,soft=3,aspect=0.55,rot=-0.6),{'t1':0.84})
save(h.render('t1'),out+'schw_t1c.png')
