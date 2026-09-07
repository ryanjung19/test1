const PROJECTS = [
  {
    id: 'serin-black-night',
    creator: 'SERIN',
    title: 'BLACK NIGHT',
    subtitle: 'Special Fan Meeting',
    status: 'ON SALE',
    statusClass: 'sale',
    date: '2026. 09. 12 (SAT) 19:00',
    shortDate: 'SEP 12 · SEOUL',
    venue: 'VASSMENT ONE · SEOUL',
    category: 'FAN MEETING',
    tags: ['FAN MEETING', 'SPECIAL', 'PHOTO'],
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=86',
    hero: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1600&q=90',
    description: '가까운 순간이 더 특별해지는 밤. 토크, 포토 세션과 한정 팬 경험을 하나의 프로젝트로 구성했습니다.',
    capacity: 80,
    program: [
      ['19:00', 'CHECK-IN'],
      ['19:30', 'TALK & Q&A'],
      ['20:10', 'PHOTO SESSION'],
      ['21:00', 'MEET & GREET'],
      ['21:40', 'CLOSING']
    ]
  },
  {
    id: 'hayun-photo-day',
    creator: 'HAYUN',
    title: 'PRIVATE PHOTO DAY',
    subtitle: 'Photo Event',
    status: 'ON SALE',
    statusClass: 'sale',
    date: '2026. 09. 26 (SAT) 14:00',
    shortDate: 'SEP 26 · SEOUL',
    venue: 'VASSMENT ONE · SEOUL',
    category: 'PHOTO EVENT',
    tags: ['PHOTO EVENT', 'MEET & GREET'],
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=86',
    hero: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1600&q=90',
    description: '팬과 크리에이터가 함께 만드는 소규모 포토 프로젝트. 세션별 정원제로 운영됩니다.',
    capacity: 48,
    program: [['14:00','CHECK-IN'],['14:20','PHOTO SESSION A'],['15:20','TALK'],['16:00','PHOTO SESSION B']]
  },
  {
    id: 'mina-fall-in-mina',
    creator: 'MINA',
    title: 'FALL IN MINA',
    subtitle: 'Live Project',
    status: 'COMING SOON',
    statusClass: 'soon',
    date: '2026. 10. 10 (SAT) 18:00',
    shortDate: 'OCT 10 · SEOUL',
    venue: 'SEOUL · VENUE TBA',
    category: 'LIVE',
    tags: ['FAN MEETING', 'LIVE'],
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=86',
    hero: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=90',
    description: '토크와 라이브 퍼포먼스를 결합한 팬 프로젝트. 상세 판매 일정은 추후 공개됩니다.',
    capacity: 100,
    program: [['18:00','OPEN'],['18:30','TALK'],['19:00','LIVE'],['20:00','SPECIAL SESSION']]
  },
  {
    id: 'yuna-sweet-moment',
    creator: 'YUNA',
    title: 'SWEET MOMENT',
    subtitle: 'Special Project',
    status: 'SOLD OUT',
    statusClass: 'sold',
    date: '2026. 08. 15 (SAT) 16:00',
    shortDate: 'AUG 15 · SEOUL',
    venue: 'VASSMENT ONE · SEOUL',
    category: 'SPECIAL',
    tags: ['FAN MEETING', 'SPECIAL'],
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=86',
    hero: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=90',
    description: '완료된 프로젝트도 MEETSET의 포트폴리오로 남습니다. 지난 순간을 다시 확인하세요.',
    capacity: 60,
    program: [['16:00','OPEN'],['16:30','TALK'],['17:10','PHOTO'],['18:00','CLOSING']]
  }
];

const TICKETS = [
  { id: 'general', name: 'GENERAL', price: 99000, desc: '입장 · 토크 · 그룹 포토' },
  { id: 'vip', name: 'VIP', price: 249000, desc: 'GENERAL 포함 · 1:1 포토 · 사인 포토' },
  { id: 'vvip', name: 'VVIP', price: 399000, desc: 'VIP 포함 · 프리미엄 세션 · 애프터 토크' }
];

const ADDONS = [
  { id: 'cheki', name: '일반 체키', price: 30000 },
  { id: 'premium-cheki', name: '프리미엄 체키', price: 50000 },
  { id: 'photo-5min', name: '5분 촬영권', price: 50000 },
  { id: 'talk', name: '1:1 Talk', price: 50000 },
  { id: 'voice', name: 'Voice Message', price: 40000 },
  { id: 'signed-photo', name: 'Signed Photo', price: 30000 }
];

const app = document.getElementById('app');
let drawerOpen = false;
let selectedTicket = TICKETS[0].id;
let selectedAddons = new Set();
let checkoutProject = PROJECTS[0];

const won = value => `₩${value.toLocaleString('ko-KR')}`;
const route = () => location.hash.replace(/^#\/?/, '') || 'home';
const go = path => { drawerOpen = false; location.hash = path; };
const icon = name => ({ home:'⌂', projects:'▣', creators:'◎', my:'♙', search:'⌕', menu:'☰', close:'×', calendar:'◷', pin:'⌖', arrow:'→' }[name] || '•');

function brand() {
  return `<button class="brand" data-go="home" aria-label="MEETSET Home"><span class="brand-main">MEET<span class="accent">SET</span></span><span class="brand-sub">Fan Meets Real Moments</span></button>`;
}

function header(active) {
  return `<header class="header"><div class="container header-inner">
    ${brand()}
    <nav class="desktop-nav" aria-label="Primary navigation">
      ${navLink('home','Home',active)}${navLink('projects','Projects',active)}${navLink('creators','Creators',active)}${navLink('about','About',active)}
    </nav>
    <div class="header-actions">
      <button class="icon-button" aria-label="Search">${icon('search')}</button><span class="lang">KR⌄</span>
      <button class="login-link" data-go="my">Log in</button><button class="primary-small" data-go="work">Sign up</button>
      <button class="icon-button mobile-menu-button" id="menuButton" aria-label="Menu">${icon('menu')}</button>
    </div>
  </div></header>`;
}

function navLink(path, label, active) {
  return `<button class="nav-link ${active===path?'active':''}" data-go="${path}">${label}</button>`;
}

function footer() {
  return `<footer class="footer"><div class="container footer-grid">
    <div><div class="footer-brand">MEET<span class="accent">SET</span></div><p>Fan Meets Real Moments</p></div>
    <div><h4>Service</h4><button data-go="projects">Projects</button><button data-go="creators">Creators</button><button data-go="about">About</button></div>
    <div><h4>Support</h4><p>공지사항</p><p>이용약관</p><p>개인정보처리방침</p><p>FAQ</p></div>
    <div><h4>J&COMPANY</h4><p>제이앤컴퍼니</p><p>사업자등록번호 · 통신판매업신고번호 · 대표자 · 주소는 론칭 전 실제 정보로 교체</p><p>contact@meetset.kr</p></div>
  </div><div class="container footer-bottom">© 2026 MEETSET. Operated by J&Company. All rights reserved.</div></footer>`;
}

function mobileBottom(active) {
  const items = [['home','home','홈'],['projects','projects','프로젝트'],['creators','creators','크리에이터'],['my','my','MY']];
  return `<nav class="mobile-bottom">${items.map(([path,ico,label])=>`<button data-go="${path}" class="${active===path?'active':''}"><span class="nav-ico">${icon(ico)}</span><span>${label}</span></button>`).join('')}</nav>`;
}

function drawer() {
  if (!drawerOpen) return '';
  return `<div class="mobile-drawer" id="drawerBackdrop"><div class="drawer-panel"><div class="drawer-top">${brand()}<button class="icon-button" id="drawerClose">${icon('close')}</button></div>
    ${[['home','Home'],['projects','Projects'],['creators','Creators'],['about','About'],['work','Work with MEETSET'],['my','MY Tickets']].map(([p,l])=>`<button class="drawer-link" data-go="${p}">${l}</button>`).join('')}
  </div></div>`;
}

function shell(content, active='home') {
  app.innerHTML = `<div class="site-shell">${header(active)}<main>${content}</main>${footer()}${mobileBottom(active)}${drawer()}</div>`;
  bindGlobal();
}

function projectCard(p) {
  return `<article class="project-card" data-project="${p.id}">
    <div class="project-image"><img src="${p.image}" alt="${p.creator} ${p.title}" loading="lazy"><span class="status ${p.statusClass}">${p.status}</span></div>
    <div class="card-body"><div class="creator">${p.creator}</div><div class="project-name">${p.title}</div>
      <div class="project-meta"><div class="meta-row">${icon('calendar')} ${p.date.split(' ')[0]} ${p.date.split(' ')[1]} ${p.date.split(' ')[2]}</div><div class="meta-row">${icon('pin')} ${p.venue}</div></div>
      <div class="tags">${p.tags.slice(0,2).map(t=>`<span class="tag">#${t}</span>`).join('')}</div>
    </div></article>`;
}

function renderHome() {
  shell(`
    <section class="hero"><div class="container hero-content"><div class="hero-kicker">SPECIAL FAN MEETING</div><h1 class="hero-title">Closer<br>Than <span>Ever.</span></h1><p class="hero-copy">좋아하는 순간이, 더 특별해지니까.</p><button class="cta cta-pink" data-project="serin-black-night">View Project ${icon('arrow')}</button></div><div class="hero-script">Real<br>Moments<br>Together</div><div class="hero-meta">MEETSET<br>FAN EXPERIENCES</div></section>
    <section class="section section-white"><div class="container"><div class="section-head"><div><h2 class="section-title">Upcoming Projects</h2><p class="section-desc">좋아하는 크리에이터와, 특별한 순간을 만나는 공간</p></div><button class="text-link" data-go="projects">View All ${icon('arrow')}</button></div><div class="project-grid">${PROJECTS.map(projectCard).join('')}</div></div></section>
    <section class="category-strip"><div class="container categories">${[['🎟','Fan Meetings','더 가까이, 더 특별하게'],['◉','Photo Events','잊지 못할 한 장의 순간'],['♫','Live & Showcase','무대 위, 새로운 매력'],['♡','Special Projects','지금, 여기서만 가능한 경험']].map(c=>`<div class="category"><div class="category-icon">${c[0]}</div><h3>${c[1]}</h3><p>${c[2]}</p></div>`).join('')}</div></section>
    <section class="split"><div class="story-panel"><div class="story-content"><h2 class="story-title">More than an Event<br>A Story We Create Together</h2><p class="story-copy">MEETSET은 크리에이터와 팬이 직접 만나 진짜 순간을 만드는 팬 경험 프로젝트 플랫폼입니다.</p><button class="cta cta-pink" data-go="about">About MEETSET ${icon('arrow')}</button></div></div><div class="work-panel"><h2>Work with MEETSET</h2><p>당신의 특별한 프로젝트를 함께 만들어보세요.</p><div class="work-cards"><div class="work-card">◎<strong>크리에이터</strong><span>팬과 만나는 새로운 기회</span></div><div class="work-card">▦<strong>기획사 / 매니지먼트</strong><span>기획부터 운영까지</span></div><div class="work-card">◇<strong>브랜드 / 협업</strong><span>특별한 프로젝트 제안</span></div></div><button class="cta cta-dark full" data-go="work">프로젝트 제안하기 ${icon('arrow')}</button></div></section>
  `, 'home');
  bindProjectCards();
}

function renderProjects() {
  const categories = ['ALL','FAN MEETING','PHOTO EVENT','LIVE','SHOWCASE','SPECIAL'];
  shell(`<section class="page-hero"><div class="container"><h1 class="page-title">Projects</h1><p class="page-subtitle">다양한 크리에이터와 특별한 순간을 만나보세요.</p></div></section><section class="section"><div class="container"><div class="filters">${categories.map((c,i)=>`<button class="filter ${i===0?'active':''}" data-filter="${c}">${c}</button>`).join('')}</div><div class="project-grid" id="projectGrid">${PROJECTS.map(projectCard).join('')}</div></div></section>`, 'projects');
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    const f=btn.dataset.filter; document.getElementById('projectGrid').innerHTML=PROJECTS.filter(p=>f==='ALL'||p.category===f).map(projectCard).join(''); bindProjectCards();
  }));
  bindProjectCards();
}

function renderCreators() {
  shell(`<section class="page-hero"><div class="container"><h1 class="page-title">Creators</h1><p class="page-subtitle">MEETSET과 함께하는 크리에이터를 만나보세요.</p></div></section><section class="section"><div class="container"><div class="project-grid">${PROJECTS.map(p=>`<article class="project-card" data-project="${p.id}"><div class="project-image"><img src="${p.image}" alt="${p.creator}"></div><div class="card-body"><div class="creator">${p.creator}</div><div class="project-name">${p.category}</div><div class="tags"><span class="tag">VIEW PROJECT</span></div></div></article>`).join('')}</div></div></section>`, 'creators');
  bindProjectCards();
}

function renderAbout() {
  shell(`<section class="detail"><div class="detail-hero"><div class="detail-media"><img src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=88" alt="MEETSET live moment"></div><div class="detail-info"><div class="detail-creator">MEETSET</div><h1 class="detail-title">Fan Meets<br>Real Moments.</h1><p class="detail-copy">MEETSET은 J&Company가 기획·판매·운영하는 팬 경험 프로젝트 브랜드입니다. 팬미팅, 포토 이벤트, 라이브, 쇼케이스를 프로젝트 단위로 만들고, 장소는 프로젝트에 가장 적합한 베뉴를 선택합니다.</p><div class="detail-actions"><button class="cta cta-pink" data-go="projects">Explore Projects ${icon('arrow')}</button><button class="cta cta-dark" data-go="work">Work with us</button></div></div></div></section>`, 'about');
}

function renderProject(id) {
  const p = PROJECTS.find(x=>x.id===id) || PROJECTS[0]; checkoutProject = p; selectedTicket = TICKETS[0].id; selectedAddons = new Set();
  shell(`<section class="detail"><div class="detail-hero"><div class="detail-media"><img src="${p.hero}" alt="${p.creator} ${p.title}"></div><div class="detail-info"><div class="detail-creator">${p.creator}</div><h1 class="detail-title">${p.title}</h1><p class="detail-copy">${p.description}</p><div class="detail-facts"><div>${icon('calendar')} ${p.date}</div><div>${icon('pin')} ${p.venue}</div><div>◎ CAPACITY ${p.capacity}</div></div><div class="tags">${p.tags.map(t=>`<span class="tag">#${t}</span>`).join('')}</div></div></div>
    <div class="container detail-content"><div class="detail-columns"><div><section class="content-block"><h2>About</h2><p>${p.description} 프로젝트별 프로그램과 판매상품은 출연자·기획 조건에 따라 다르게 구성됩니다.</p></section><section class="content-block"><h2>Program</h2><div class="program">${p.program.map(r=>`<div class="program-row"><div class="program-time">${r[0]}</div><div class="program-name">${r[1]}</div></div>`).join('')}</div></section><section class="content-block"><h2>Event Guide</h2><p>입장 시 모바일 QR 티켓을 확인합니다. 운영시간과 프로그램은 현장 상황에 따라 일부 조정될 수 있습니다. Experience 상품은 수량이 한정될 수 있습니다.</p></section></div><aside>${purchaseCard(p)}</aside></div></div></section>`, 'projects');
  bindPurchase();
}

function purchaseCard(p) {
  const disabled = p.status !== 'ON SALE';
  return `<div class="purchase-card"><h3>Ticket</h3>${TICKETS.map((t,i)=>`<div class="ticket-option ${i===0?'selected':''}" data-ticket="${t.id}"><div class="ticket-head"><span class="ticket-title">${t.name}</span><span class="ticket-price">${won(t.price)}</span></div><div class="ticket-desc">${t.desc}</div></div>`).join('')}<hr class="purchase-divider"><h3>Experience</h3>${ADDONS.map(a=>`<label class="addon-option"><input type="checkbox" value="${a.id}"><div class="addon-row" style="flex:1"><span class="addon-title">${a.name}</span><span class="ticket-price">+${won(a.price)}</span></div></label>`).join('')}<div class="total-row"><span>Total</span><strong class="total-price" id="totalPrice">${won(TICKETS[0].price)}</strong></div><button class="cta ${disabled?'cta-dark':'cta-pink'} full" id="buyButton" ${disabled?'disabled':''}>${disabled?p.status:'Buy Ticket'} ${disabled?'':icon('arrow')}</button></div>`;
}

function bindPurchase() {
  document.querySelectorAll('[data-ticket]').forEach(el=>el.addEventListener('click',()=>{ selectedTicket=el.dataset.ticket; document.querySelectorAll('[data-ticket]').forEach(x=>x.classList.toggle('selected',x===el)); updateTotal(); }));
  document.querySelectorAll('.addon-option input').forEach(input=>input.addEventListener('change',()=>{ input.checked?selectedAddons.add(input.value):selectedAddons.delete(input.value); updateTotal(); }));
  const buy=document.getElementById('buyButton'); if(buy&&!buy.disabled) buy.addEventListener('click',openCheckout);
}

function currentTotal() { const ticket=TICKETS.find(t=>t.id===selectedTicket); return ticket.price + ADDONS.filter(a=>selectedAddons.has(a.id)).reduce((s,a)=>s+a.price,0); }
function updateTotal() { const e=document.getElementById('totalPrice'); if(e)e.textContent=won(currentTotal()); }

function openCheckout() {
  const ticket=TICKETS.find(t=>t.id===selectedTicket); const addons=ADDONS.filter(a=>selectedAddons.has(a.id));
  const modal=document.createElement('div'); modal.className='modal-backdrop'; modal.id='checkoutModal';
  modal.innerHTML=`<div class="modal"><div class="modal-head"><h3>Checkout</h3><button class="icon-button" id="closeModal">${icon('close')}</button></div><div class="modal-body"><div class="notice">현재 V1에서는 결제 UX를 검증하기 위한 데모 모드입니다. 실제 PG 승인 후 J&Company 명의 결제 어댑터를 연결합니다.</div><div class="checkout-summary"><div class="checkout-summary-row"><strong>${checkoutProject.creator} · ${checkoutProject.title}</strong><span></span></div><div class="checkout-summary-row"><span>${ticket.name}</span><strong>${won(ticket.price)}</strong></div>${addons.map(a=>`<div class="checkout-summary-row"><span>${a.name}</span><strong>+${won(a.price)}</strong></div>`).join('')}<div class="checkout-summary-row" style="border-top:1px solid #ddd;padding-top:10px;margin-top:10px"><strong>Total</strong><strong>${won(currentTotal())}</strong></div></div><div class="form-grid"><div class="field"><label>이름</label><input id="buyerName" placeholder="홍길동"></div><div class="field"><label>휴대전화</label><input id="buyerPhone" placeholder="010-0000-0000"></div><div class="field full-row"><label>이메일</label><input id="buyerEmail" type="email" placeholder="name@example.com"></div></div><button class="cta cta-pink full" id="demoPay" style="margin-top:18px">Demo 결제 완료 ${icon('arrow')}</button></div></div>`;
  document.body.appendChild(modal); document.getElementById('closeModal').onclick=()=>modal.remove(); modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()}); document.getElementById('demoPay').onclick=completeDemoOrder;
}

function completeDemoOrder() {
  const name=document.getElementById('buyerName').value.trim()||'MEETSET Guest';
  const ticket=TICKETS.find(t=>t.id===selectedTicket); const orderNo=`MS${Date.now().toString().slice(-10)}`;
  const order={orderNo,name,projectId:checkoutProject.id,ticket:ticket.name,total:currentTotal(),createdAt:new Date().toISOString()};
  localStorage.setItem('meetset-demo-order',JSON.stringify(order));
  const modal=document.getElementById('checkoutModal'); modal.innerHTML=`<div class="modal"><div class="confirm"><div class="confirm-check">✓</div><h2>예약이 완료되었습니다!</h2><p style="color:#bfc1c7">소중한 순간을 함께합니다.<br>이벤트 당일, MEETSET에서 만나요.</p><div style="background:white;color:#111;border-radius:16px;padding:16px;text-align:left;margin-top:24px"><strong>${checkoutProject.creator}</strong><div style="font-size:12px;margin-top:3px">${checkoutProject.title}</div><p style="font-size:11px;color:#666">${checkoutProject.date}<br>${checkoutProject.venue}</p><div style="font-size:11px;color:#777">예약번호</div><strong>${orderNo}</strong><div class="qr-box" id="qrCode"></div></div><button class="cta cta-pink full" id="goMy">티켓 보관하기</button><button class="cta full" style="background:transparent;color:white;border:1px solid #555;margin-top:8px" id="closeDone">홈으로 돌아가기</button></div></div>`;
  setTimeout(()=>{ if(window.QRCode) new QRCode(document.getElementById('qrCode'),{text:orderNo,width:150,height:150}); },50);
  document.getElementById('goMy').onclick=()=>{modal.remove();go('my')}; document.getElementById('closeDone').onclick=()=>{modal.remove();go('home')};
}

function renderMy() {
  let order=null; try{order=JSON.parse(localStorage.getItem('meetset-demo-order'))}catch(e){}
  let content='';
  if(order){ const p=PROJECTS.find(x=>x.id===order.projectId)||PROJECTS[0]; content=`<div class="ticket-card"><div class="ticket-thumb"><img src="${p.image}" alt="${p.creator}"></div><div class="ticket-info"><h3>${p.creator} · ${p.title}</h3><p>${p.date}</p><p>${p.venue}</p><p>${order.ticket} · ${won(order.total)}</p></div><div class="ticket-actions"><button class="secondary-btn" id="showQr">QR 티켓</button><button class="secondary-btn" data-project="${p.id}">상세보기</button></div></div>`; }
  else content=`<div class="empty-state"><h3>아직 보관된 티켓이 없습니다.</h3><p>프로젝트를 선택하고 데모 예약을 완료하면 QR 티켓이 이곳에 표시됩니다.</p><button class="cta cta-pink" data-go="projects">프로젝트 보기 ${icon('arrow')}</button></div>`;
  shell(`<section class="page-hero"><div class="container"><h1 class="page-title">MY</h1><p class="page-subtitle">티켓과 예약 내역을 한곳에서 관리합니다.</p></div></section><div class="container my-layout"><aside class="my-sidebar"><button class="active">내 티켓</button><button>주문 내역</button><button>관심 프로젝트</button></aside><section><h2 style="margin-top:0">예정된 이벤트</h2>${content}</section></div>`, 'my');
  bindProjectCards();
  const qrBtn=document.getElementById('showQr'); if(qrBtn&&order) qrBtn.onclick=()=>showTicketModal(order);
}

function showTicketModal(order){ const modal=document.createElement('div'); modal.className='modal-backdrop'; modal.innerHTML=`<div class="modal"><div class="confirm"><div class="brand-main">MEET<span style="color:#ff6f95">SET</span></div><h3 style="margin-top:26px">${order.ticket} TICKET</h3><div class="qr-box" id="ticketQr"></div><strong>${order.orderNo}</strong><p style="color:#bfc1c7;font-size:12px">현장 체크인 시 이 QR을 제시하세요.</p><button class="cta cta-pink full" id="ticketClose">닫기</button></div></div>`; document.body.appendChild(modal); if(window.QRCode)new QRCode(document.getElementById('ticketQr'),{text:order.orderNo,width:150,height:150}); document.getElementById('ticketClose').onclick=()=>modal.remove(); }

function renderWork() {
  shell(`<section class="work-page"><div class="container work-layout"><div class="work-intro"><div class="detail-creator">WORK WITH MEETSET</div><h1>Make a Project<br>Worth Meeting For.</h1><p>크리에이터, 기획사, 매니지먼트, 브랜드와 함께 팬이 실제로 참여하는 프로젝트를 만듭니다. 제안 내용은 J&Company 운영팀의 리드로 접수됩니다.</p></div><form class="form-card" id="workForm"><div class="form-grid"><div class="field"><label>이름 / 활동명 *</label><input required placeholder="예: SERIN"></div><div class="field"><label>소속사 / 회사명</label><input placeholder="예: J&Company"></div><div class="field full-row"><label>SNS 링크 *</label><input required placeholder="https://instagram.com/yourname"></div><div class="field"><label>예상 팬 규모</label><input placeholder="예: 100명"></div><div class="field"><label>희망 프로젝트 유형 *</label><select required><option>팬미팅</option><option>포토 이벤트</option><option>라이브</option><option>쇼케이스</option><option>브랜드 협업</option></select></div><div class="field"><label>희망 시기</label><input placeholder="예: 2026년 10월"></div><div class="field"><label>연락처 *</label><input required placeholder="전화 또는 이메일"></div><div class="field full-row"><label>프로젝트 설명</label><textarea placeholder="기획 의도, 희망 프로그램, 예상 인원 등을 적어주세요."></textarea></div></div><button class="cta cta-dark full" type="submit" style="margin-top:18px">프로젝트 제안하기 ${icon('arrow')}</button></form></div></section>`, 'work');
  document.getElementById('workForm').addEventListener('submit',e=>{e.preventDefault(); alert('V1 데모: 제안서가 접수되었습니다. 실제 운영판에서는 CRM/API로 전송됩니다.'); e.target.reset();});
}

function bindProjectCards(){ document.querySelectorAll('[data-project]').forEach(el=>el.addEventListener('click',e=>{ if(e.target.closest('button')) return; go(`project/${el.dataset.project}`); })); }

function bindGlobal(){
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
  const menu=document.getElementById('menuButton'); if(menu)menu.onclick=()=>{drawerOpen=true;render()};
  const close=document.getElementById('drawerClose'); if(close)close.onclick=()=>{drawerOpen=false;render()};
  const back=document.getElementById('drawerBackdrop'); if(back)back.onclick=e=>{if(e.target===back){drawerOpen=false;render()}};
}

function render(){
  const r=route();
  if(r==='home') return renderHome();
  if(r==='projects') return renderProjects();
  if(r==='creators') return renderCreators();
  if(r==='about') return renderAbout();
  if(r==='my') return renderMy();
  if(r==='work') return renderWork();
  if(r.startsWith('project/')) return renderProject(r.split('/')[1]);
  renderHome();
}

window.addEventListener('hashchange',render);
window.addEventListener('DOMContentLoaded',render);
