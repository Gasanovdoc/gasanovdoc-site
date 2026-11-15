import os,re,sys,shutil,json
src=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','dist'); root=sys.argv[1]
shutil.rmtree(root,ignore_errors=True); shutil.copytree(src,root)
def rel(path, depth):
    pre='../'*depth or './'
    p=path.lstrip('/'); h=''
    if '#' in p: p,h=p.split('#',1); h='#'+h
    if p=='' or p.endswith('/'): p+='index.html'
    return pre+p+h
for dp,_,fs in os.walk(root):
    for f in fs:
        fp=os.path.join(dp,f); depth=os.path.relpath(fp,root).count('/')
        if f.endswith('.woff') or f.startswith('sitemap') or f=='robots.txt': os.remove(fp); continue
        if not f.endswith(('.html','.css','.js')): continue
        s=open(fp).read()
        if f.endswith('.html'):
            s=re.sub(r'(href|src|poster)="(/(?!/)[^"]*)"',lambda m:f'{m.group(1)}="{rel(m.group(2),depth)}"',s).replace('_astro/','assets/')
        elif f.endswith('.css'): s=s.replace('url(/_astro/','url(')
        elif f=='home.js':
            s=s.replace("(function(){","(function(){var BASE=(document.currentScript&&document.currentScript.src||'').replace(/js\\/home\\.js.*$/,'');",1).replace("'/media/","BASE+'media/")
        open(fp,'w').write(s)
os.rename(os.path.join(root,'_astro'),os.path.join(root,'assets'))
out={}
for dp,_,fs in os.walk(root):
    for f in fs:
        r=os.path.relpath(os.path.join(dp,f),root)
        if r!='index.html' and (f.endswith(('.html','.css','.js','.pdf'))): out[r]=r
print(json.dumps(out,ensure_ascii=False))
