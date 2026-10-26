(function(){
  var CASES=[{"k": "cranio", "t": "Дефект костей черепа", "d": "Краниопластика: обширный дефект закрыт индивидуальной титановой пластиной.", "cb": "До краниопластики", "ca": "Титановая пластина"}, {"k": "mening", "t": "Менингиома", "d": "Удаление опухоли. До операции — менингиома на МРТ с контрастом, после — контрольная КТ.", "cb": "МРТ с контрастом", "ca": "Контрольная КТ"}, {"k": "cea2d", "t": "Бляшка сонной артерии", "d": "Каротидная эндартерэктомия. Бляшка с кальцинатами сужает артерию, после операции просвет восстановлен.", "cb": "КТ-ангиография", "ca": "После эндартерэктомии"}, {"k": "cea3d", "t": "Стеноз сонной артерии", "d": "Каротидная эндартерэктомия на объёмной реконструкции: до и после удаления бляшки.", "cb": "3D-реконструкция", "ca": "После эндартерэктомии"}, {"k": "aneurysm", "t": "Аневризма артерии головного мозга", "d": "Микрохирургическое клипирование. До операции на 3D-КТ-ангиографии видна аневризма, после — клипса, аневризма выключена из кровотока.", "cb": "3D-КТ-ангиография", "ca": "После клипирования"}, {"k": "bypass", "t": "Реваскуляризация мозга (ЭИКМА)", "d": "Экстра-интракраниальный микроанастомоз: ветвь поверхностной височной артерии подшита к артерии мозга.", "cb": "До операции", "ca": "После анастомоза"}];
  var EN=[{"k":"cranio","t":"Skull defect","d":"Cranioplasty: a large defect closed with a custom titanium implant.","cb":"Before cranioplasty","ca":"Titanium implant"},{"k":"mening","t":"Meningioma","d":"Tumour removal. Before surgery: meningioma on contrast MRI; after: follow-up CT.","cb":"Contrast MRI","ca":"Follow-up CT"},{"k":"cea2d","t":"Carotid plaque","d":"Carotid endarterectomy. A calcified plaque narrows the artery; after surgery the lumen is restored.","cb":"CT angiography","ca":"After endarterectomy"},{"k":"cea3d","t":"Carotid stenosis","d":"Carotid endarterectomy on 3D reconstruction: before and after plaque removal.","cb":"3D reconstruction","ca":"After endarterectomy"},{"k":"aneurysm","t":"Cerebral artery aneurysm","d":"Microsurgical clipping. The aneurysm is visible on 3D CT angiography before surgery; afterwards a clip excludes it from the circulation.","cb":"3D CT angiography","ca":"After clipping"},{"k":"bypass","t":"Cerebral revascularization (EC-IC bypass)","d":"Extracranial-intracranial bypass: a branch of the superficial temporal artery is connected to a brain artery.","cb":"Before surgery","ca":"After bypass"}];
  var isEn=document.documentElement.lang==='en';if(isEn)CASES=EN;
  var L=isEn?{b:': scan before surgery',a:': scan after surgery'}:{b:': снимок до операции',a:': снимок после операции'};
  var cur=0,pair=document.getElementById('pair'),chipsEl=document.querySelectorAll('.chip');
  function show(i){
    cur=(i+CASES.length)%CASES.length;var c=CASES[cur];
    chipsEl.forEach(function(x){x.setAttribute('aria-pressed',x.dataset.i==cur?'true':'false')});
    chipsEl[cur].scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
    pair.classList.add('fade');
    setTimeout(function(){
      document.getElementById('ib').src='/media/cases/'+c.k+'-before.webp';document.getElementById('ia').src='/media/cases/'+c.k+'-after.webp';
      document.getElementById('ib').alt=c.t+L.b;document.getElementById('ia').alt=c.t+L.a;
      document.getElementById('cb').textContent=c.cb;document.getElementById('ca').textContent=c.ca;
      document.getElementById('ct').textContent=c.t;document.getElementById('cd').textContent=c.d;
      document.getElementById('count').textContent=(cur+1)+' / '+CASES.length;
      pair.classList.remove('fade');
    },200);
  }
  chipsEl.forEach(function(x){x.addEventListener('click',function(){show(+x.dataset.i)})});
  document.getElementById('prev').addEventListener('click',function(){show(cur-1)});
  document.getElementById('next').addEventListener('click',function(){show(cur+1)});
  var sx=null;pair.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
  pair.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)show(cur+(dx<0?1:-1));sx=null});
  ['mening','cea2d','cea3d','aneurysm','bypass'].forEach(function(k){['before','after'].forEach(function(t){var i=new Image();i.src='/media/cases/'+k+'-'+t+'.webp'})});
  var f=document.getElementById('reqForm'),msg=document.getElementById('formMsg'),btn=f.querySelector('button[type=submit]');
  var T=isEn?{name:'Please tell me your name.',contact:'Enter an email, Telegram @username or WhatsApp number.',badContact:'Check the contact: it should be an email (name@mail.com), a Telegram @username or a phone number.',badPhone:'Check the phone number: 10–15 digits, for example +7 963 050-35-39.',ok:'Please tick the consent box.',send:'Sending…',done:'Thank you! Your request has been received. I will reply personally, usually within a few days.',err:'Could not send the request. Please try again or write to me on Telegram: @gasanov_doc',again:'Your request has already been sent. Send another one?',yes:'Yes, send',no:'No'}
            :{name:'Укажите, как к вам обращаться.',contact:'Укажите почту, Telegram или номер телефона.',badContact:'Проверьте контакт: нужна почта (name@mail.ru) или имя пользователя Telegram (@username).',badPhone:'Проверьте номер телефона: 10–15 цифр, например +7 963 050-35-39.',ok:'Отметьте согласие на обработку данных.',send:'Отправляю…',done:'Спасибо! Заявка получена. Я отвечу лично, обычно в течение нескольких дней.',err:'Не удалось отправить заявку. Попробуйте ещё раз или напишите мне в Telegram: @gasanov_doc',again:'Заявка уже отправлена. Отправить ещё одну?',yes:'Да, отправить',no:'Нет'};
  var E=f.elements, val=function(k){return (E[k].value||'').trim()};
  var reEmail=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, reTg=/^(@|https?:\/\/t\.me\/|t\.me\/)?[A-Za-z][A-Za-z0-9_]{4,31}$/;
  function digits(x){return x.replace(/[^\d]/g,'')}
  function phoneOk(x){var d=digits(x);if(!/^[+\d\s()\-.]+$/.test(x))return false;if(d.length<10||d.length>15)return false;if(/^[78]/.test(d)&&d.length!==11&&!/^\+/.test(x))return false;return true}
  function contactOk(x){return reEmail.test(x)||reTg.test(x)||phoneOk(x)}
  function say(t,kind){msg.textContent=t;msg.className='form-msg '+(kind||'')}
  function mark(k,bad){E[k].classList.toggle('invalid',!!bad);E[k].setAttribute('aria-invalid',bad?'true':'false')}
  ['name','contact','phone'].forEach(function(k){E[k].addEventListener('input',function(){mark(k,false)})});
  function sentRecently(){try{return Date.now()-Number(localStorage.getItem('zayavkaSent')||0)<864e5}catch(e){return f.classList.contains('sent')}}
  function check(){
    var name=val('name'),c=val('contact'),ph=val('phone');
    ['name','contact','phone'].forEach(function(k){mark(k,false)});
    if(!name){mark('name',1);E['name'].focus();return T.name}
    if(!c&&!ph){mark('contact',1);E['contact'].focus();return T.contact}
    if(c&&!contactOk(c)){mark('contact',1);E['contact'].focus();return T.badContact}
    if(ph&&!phoneOk(ph)){mark('phone',1);E['phone'].focus();return T.badPhone}
    if(!E['consent'].checked)return T.ok;
    return '';
  }
  function send(){
    var d={name:val('name'),contact:val('contact'),phone:val('phone'),link:val('link'),text:val('text'),consent:E['consent'].checked,website:E['website'].value,lang:isEn?'en':'ru'};
    btn.disabled=true;say(T.send);
    fetch('/api/zayavka',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
      .then(function(r){if(!r.ok)throw 0;return r.json()})
      .then(function(){f.classList.add('sent');try{localStorage.setItem('zayavkaSent',String(Date.now()))}catch(e){};say(T.done,'ok');if(window.goal)goal('zayavka_sent')})
      .catch(function(){say(T.err,'err')})
      .then(function(){btn.disabled=false});
  }
  function askAgain(){
    msg.className='form-msg ask';msg.textContent='';
    var p=document.createElement('span');p.textContent=T.again;
    var y=document.createElement('button');y.type='button';y.className='btn btn-fill';y.textContent=T.yes;
    var n=document.createElement('button');n.type='button';n.className='btn btn-line';n.textContent=T.no;
    var w=document.createElement('span');w.className='ask-btns';w.appendChild(y);w.appendChild(n);
    msg.appendChild(p);msg.appendChild(w);
    y.onclick=function(){send()};
    n.onclick=function(){say(T.done,'ok')};
  }
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var err=check(); if(err){say(err,'err');return}
    if(sentRecently()){askAgain();return}
    send();
  });

  var v=document.getElementById('heroVideo');
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){v.removeAttribute('autoplay');v.pause()}
  else{var p=v.play();if(p&&p.catch)p.catch(function(){})}
})();
