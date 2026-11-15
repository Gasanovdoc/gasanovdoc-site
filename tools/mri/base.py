import nibabel as nib, numpy as np, os, nilearn
from scipy import ndimage as ndi
from PIL import Image
P=os.path.join(os.path.dirname(nilearn.__file__),'datasets','data')
def L(n): return nib.load(P+f'/mni_icbm152_{n}_tal_nlin_sym_09a_converted.nii.gz')
T1n=L('t1'); A=T1n.affine; INV=np.linalg.inv(A)
VOL={'t1':T1n.get_fdata().astype(np.float32)/255.,'gm':L('gm').get_fdata().astype(np.float32),'wm':L('wm').get_fdata().astype(np.float32)}
VOL['gm']/=VOL['gm'].max(); VOL['wm']/=VOL['wm'].max()
def vox(x,y,z): return np.round(INV@[x,y,z,1])[:3].astype(int)
def sl(vol,plane,mm):
    v=VOL[vol]
    if plane=='sag': a=v[vox(mm,0,0)[0],:,:]
    elif plane=='cor': a=v[:,vox(0,mm,0)[1],:]
    else: a=v[:,:,vox(0,0,mm)[2]]
    a=np.rot90(a).copy()
    if plane=='sag': a=a[:,::-1].copy()   # face to the left, as on radiology viewers
    return a
SEQ={ # wm, gm, csf, inner_table, diploe, outer_table, fat, skin
 't1':  (0.86,0.56,0.08,0.05,0.62,0.05,0.88,0.45),
 't2':  (0.36,0.56,0.95,0.04,0.55,0.04,0.80,0.40),
 'flair':(0.42,0.62,0.06,0.04,0.50,0.04,0.78,0.40),
 'swi':  (0.50,0.42,0.62,0.05,0.35,0.05,0.55,0.40),
}
class Head:
    def __init__(s,plane,mm,up=4,seed=1):
        s.plane,s.up=plane,up
        z=lambda a: ndi.zoom(a,up,order=3)
        s.t1=np.clip(z(sl('t1',plane,mm)),0,1); s.gm=np.clip(z(sl('gm',plane,mm)),0,1); s.wm=np.clip(z(sl('wm',plane,mm)),0,1)
        brain=(s.t1>0.07)
        brain=ndi.binary_opening(brain,iterations=up)
        lab,n=ndi.label(brain); 
        if n>1:
            sizes=ndi.sum(brain,lab,range(1,n+1)); brain=np.isin(lab,1+np.where(sizes>sizes.max()*0.02)[0])
        s.brain=brain
        hull=ndi.binary_fill_holes(ndi.binary_closing(np.pad(brain,40*up),structure=disk(9*up)))[40*up:-40*up,40*up:-40*up]
        s.hull=ndi.gaussian_filter((hull|brain).astype(np.float32),2.5*up)>0.5
        s.brain=ndi.gaussian_filter(s.brain.astype(np.float32),1.2*up)>0.5
        s.rng=np.random.default_rng(seed)
        s.dist=ndi.distance_transform_edt(~s.hull)/up
        w=ndi.gaussian_filter(s.rng.standard_normal(s.t1.shape),12*up)
        s.thick=1+(w/np.abs(w).max())*0.25
        s.les=[]   # lesion maps: list of (map, {seq: value}) applied in order
    def tissue(s,seq):
        wm,gm,csf,it,dp,ot,fat,skin=SEQ[seq]
        g=s.gm; w=s.wm
        pc=np.clip(1-g-w,0,1)
        img=w*wm+g*gm+pc*csf
        img=np.where(s.hull,img,0)
        img=np.where(s.hull&~s.brain, csf, img)
        d=s.dist/s.thick
        prof=[(0,csf),(0.4,it),(1.8,it),(2.4,dp),(5.6,dp),(6.2,ot),(7.4,ot),(8.0,fat),(11.5,fat*0.95),(12.2,skin),(13.6,skin),(14.2,0)]
        xs=[p[0] for p in prof]; ys=[p[1] for p in prof]
        out=np.interp(d,xs,ys)
        tex=1+0.10*ndi.gaussian_filter(s.rng.standard_normal(d.shape),1.5*s.up/4)
        patch=ndi.gaussian_filter(s.rng.standard_normal(d.shape),5*s.up); patch=0.55+0.45*np.clip(patch/np.abs(patch).max()*2,-1,1)
        dipm=(d>1.8)&(d<6.2)
        out=np.where(dipm,out*patch,out)
        img=np.where(s.hull,img,out*tex)
        return img
    def add(s,m,vals): s.les.append((m,vals))
    def render(s,seq,sharpen=0.8,noise=0.03):
        img=s.tissue(seq)
        for m,vals in s.les:
            m=m*s.hull
            if seq in vals:
                v=vals[seq]
                if callable(v): img=v(img,m)
                else:
                    tex=1+0.14*ndi.gaussian_filter(s.rng.standard_normal(img.shape),3*s.up/4)+0.08*ndi.gaussian_filter(s.rng.standard_normal(img.shape),9*s.up/4)
                    img=img*(1-m)+np.clip(v*tex,0,1)*m
        bl=ndi.gaussian_filter(img,1.2*s.up/4); img=img+(img-bl)*sharpen
        rng=s.rng
        n1=ndi.gaussian_filter(rng.standard_normal(img.shape),0.8)*noise
        img=np.abs(img+n1*(img>0.02)+rng.standard_normal(img.shape)*0.01)
        return np.clip(img,0,1)
def disk(r):
    r=int(r); y,x=np.ogrid[-r:r+1,-r:r+1]; return x*x+y*y<=r*r
def blobmask(shape,cx,cy,r,irr=0.15,seed=0,soft=1.5,aspect=1.0,rot=0):
    rng=np.random.default_rng(seed)
    yy,xx=np.mgrid[0:shape[0],0:shape[1]].astype(np.float32)
    dx=xx-cx; dy=yy-cy
    c,sn=np.cos(rot),np.sin(rot); dx,dy=dx*c+dy*sn,-dx*sn+dy*c
    dy=dy/aspect
    t=np.arctan2(dy,dx); rr=np.hypot(dx,dy)
    R=r*(1+sum(irr*rng.uniform(.4,1)*np.sin(k*t+rng.uniform(0,6.28))*w for k,w in ((2,1.0),(3,0.7),(5,0.25),(8,0.1))))
    return np.clip((R-rr)/soft+0.5,0,1)
def save(img,path,crop=None):
    if crop: y0,y1,x0,x1=crop; img=img[y0:y1,x0:x1]
    Image.fromarray((np.clip(img,0,1)*255).astype('uint8')).save(path)

def push(h,cx,cy,r,strength):
    """radial mass effect: displace brain tissue away from (cx,cy)."""
    yy,xx=np.mgrid[0:h.t1.shape[0],0:h.t1.shape[1]].astype(np.float32)
    dx=xx-cx; dy=yy-cy; d=np.hypot(dx,dy)+1e-3
    f=strength*np.exp(-np.maximum(d-r,0)/ (r*1.6)) * np.clip(d/r,0,1)
    sx=xx-dx/d*f; sy=yy-dy/d*f
    for k in ('t1','gm','wm'):
        setattr(h,k,ndi.map_coordinates(getattr(h,k),[sy,sx],order=1))
    b=ndi.map_coordinates(h.brain.astype(np.float32),[sy,sx],order=1)>0.5
    h.brain=b&h.hull
def wm_shaped(h,m,power=1.0):
    return np.clip(m*(0.25+0.75*h.wm**power),0,1)

from PIL import ImageDraw
def lines_mask(shape,polylines,width):
    im=Image.new('L',(shape[1],shape[0]),0); d=ImageDraw.Draw(im)
    for pl,w in polylines: d.line(pl,fill=255,width=w,joint='curve')
    return ndi.gaussian_filter(np.asarray(im,np.float32)/255.,1.5)
