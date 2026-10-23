(function(){
  var CASES=[{"k": "cranio", "t": "Дефект костей черепа", "d": "Краниопластика: обширный дефект закрыт индивидуальной титановой пластиной.", "cb": "До краниопластики", "ca": "Титановая пластина"}, {"k": "mening", "t": "Менингиома", "d": "Удаление опухоли. До операции — менингиома на МРТ с контрастом, после — контрольная КТ.", "cb": "МРТ с контрастом", "ca": "Контрольная КТ"}, {"k": "cea2d", "t": "Бляшка сонной артерии", "d": "Каротидная эндартерэктомия. Бляшка с кальцинатами сужает артерию, после операции просвет восстановлен.", "cb": "КТ-ангиография", "ca": "После эндартерэктомии"}, {"k": "cea3d", "t": "Стеноз сонной артерии", "d": "Каротидная эндартерэктомия на объёмной реконструкции: до и после удаления бляшки.", "cb": "3D-реконструкция", "ca": "После эндартерэктомии"}, {"k": "aneurysm", "t": "Аневризма артерии головного мозга", "d": "Микрохирургическое клипирование. До операции на 3D-КТ-ангиографии видна аневризма, после — клипса, аневризма выключена из кровотока.", "cb": "3D-КТ-ангиография", "ca": "После клипирования"}, {"k": "bypass", "t": "Реваскуляризация мозга (ЭИКМА)", "d": "Экстра-интракраниальный микроанастомоз: ветвь поверхностной височной артерии подшита к артерии мозга.", "cb": "До операции", "ca": "После анастомоза"}];
  var cur=0,pair=document.getElementById('pair'),chipsEl=document.querySelectorAll('.chip');
  function show(i){
    cur=(i+CASES.length)%CASES.length;var c=CASES[cur];
    chipsEl.forEach(function(x){x.setAttribute('aria-pressed',x.dataset.i==cur?'true':'false')});
    chipsEl[cur].scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
    pair.classList.add('fade');
    setTimeout(function(){
      document.getElementById('ib').src='/media/cases/'+c.k+'-before.webp';document.getElementById('ia').src='/media/cases/'+c.k+'-after.webp';
      document.getElementById('ib').alt=c.t+': снимок до операции';document.getElementById('ia').alt=c.t+': снимок после операции';
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
  var f=document.getElementById('reqForm');
  f.addEventListener('submit',function(e){e.preventDefault();f.classList.add('sent')});

  var v=document.getElementById('heroVideo');
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){v.removeAttribute('autoplay');v.pause()}
  else{var p=v.play();if(p&&p.catch)p.catch(function(){})}
})();
