async function copyLessonText(text){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}}catch(_){}
 const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();
 try{if(!document.execCommand('copy'))throw Error('复制被浏览器拒绝');}finally{area.remove();}
}
document.querySelectorAll('.copy-button[data-copy-target]').forEach(button=>button.addEventListener('click',async()=>{
 const target=document.getElementById(button.dataset.copyTarget),label=button.textContent.trim();
 try{if(!target)throw Error('复制目标不存在');await copyLessonText(target.textContent.trim());button.textContent='已复制';}
 catch(_){button.textContent='复制失败，请手动复制下方文本';if(target){const range=document.createRange();range.selectNodeContents(target);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}}
 setTimeout(()=>button.textContent=label,2000);
}));
// 内嵌图片链接用本地预览打开，避免浏览器阻止data地址新窗口导航。
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a[href^="data:image/"]');if(!link)return;event.preventDefault();
 const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','原图预览');
 overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:48px 16px;';
 const image=document.createElement('img');image.src=link.href;image.alt=link.querySelector('img')?.alt||'原图预览';image.style.cssText='max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;';
 const close=document.createElement('button');close.type='button';close.textContent='关闭原图';close.style.cssText='position:absolute;top:12px;right:16px;padding:10px 16px;font-size:16px;cursor:pointer;';
 const oldOverflow=document.body.style.overflow;const remove=()=>{overlay.remove();document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);link.focus();};const key=e=>{if(e.key==='Escape')remove();};
 close.addEventListener('click',remove);overlay.addEventListener('click',e=>{if(e.target===overlay)remove();});document.addEventListener('keydown',key);overlay.append(image,close);document.body.append(overlay);document.body.style.overflow='hidden';close.focus();
});

// 侧边栏贴边导航交互增强 (ScrollSpy / 收起展开 / 兼容处理)
(function initJumpNav(){
  const nav=document.querySelector('.jump-nav');
  if(!nav)return;

  // 1. 若为 Legacy 模板（无头部与包裹层），动态升级 DOM 结构
  if(!nav.querySelector('.jump-nav-header')){
    const oldLinks=Array.from(nav.querySelectorAll('a'));
    nav.innerHTML=`
      <div class="jump-nav-header">
        <span class="jump-nav-title">📑 本课导读</span>
        <button type="button" class="jump-nav-toggle" aria-label="收起导航" title="收起/展开导航">
          <span class="toggle-icon">‹</span>
        </button>
      </div>
      <div class="jump-nav-body">
        <div class="jump-nav-list"></div>
        <a class="jump-nav-top" href="#top" title="返回顶部">
          <span class="top-icon">↑</span>
          <span class="top-label">回顶部</span>
        </a>
      </div>
    `;
    const list=nav.querySelector('.jump-nav-list');
    oldLinks.forEach((a,idx)=>{
      a.className='jump-nav-link';
      const text=a.textContent.trim();
      const m=text.match(/^(\d{1,2})\s*(.*)$/);
      const idxText=m?m[1]:String(idx).padStart(2,'0');
      const labelText=m?(m[2]||m[1]):text;
      a.innerHTML=`<span class="nav-idx">${idxText}</span><span class="nav-label">${labelText}</span>`;
      list.appendChild(a);
    });
  }

  // 2. 收起 / 展开交互
  const toggleBtn=nav.querySelector('.jump-nav-toggle');
  const storageKey='jumpNavCollapsed';
  if(sessionStorage.getItem(storageKey)==='true'){
    nav.classList.add('is-collapsed');
  }

  function toggleNav(collapsed){
    const willCollapse=typeof collapsed==='boolean'?collapsed:!nav.classList.contains('is-collapsed');
    nav.classList.toggle('is-collapsed',willCollapse);
    sessionStorage.setItem(storageKey,willCollapse?'true':'false');
    if(toggleBtn){
      toggleBtn.title=willCollapse?'展开导航':'收起导航';
      toggleBtn.setAttribute('aria-label',willCollapse?'展开导航':'收起导航');
    }
  }

  if(toggleBtn){
    toggleBtn.addEventListener('click',e=>{
      e.stopPropagation();
      toggleNav();
    });
  }

  // 折叠状态下点击把手区域自动唤出展开
  nav.addEventListener('click',e=>{
    if(nav.classList.contains('is-collapsed')&&!e.target.closest('a')){
      toggleNav(false);
    }
  });

  // 3. ScrollSpy 滚动高亮监听
  const links=Array.from(nav.querySelectorAll('a[href^="#"]')).filter(a=>!a.classList.contains('jump-nav-top')&&a.getAttribute('href')!=='#top');
  const targetMap=new Map();
  links.forEach(a=>{
    const id=a.getAttribute('href').slice(1);
    const target=document.getElementById(id);
    if(target)targetMap.set(target,a);
  });

  const targets=Array.from(targetMap.keys());
  if(!targets.length)return;

  function updateActiveLink(){
    const scrollPos=window.scrollY+180;
    let currentTarget=null;
    for(let i=0;i<targets.length;i++){
      const target=targets[i];
      const top=target.getBoundingClientRect().top+window.scrollY;
      if(scrollPos>=top){
        currentTarget=target;
      }else{
        break;
      }
    }
    // 若在页面最上方，默认激活第一项
    if(!currentTarget&&window.scrollY<250&&targets.length>0){
      currentTarget=targets[0];
    }
    links.forEach(link=>link.classList.remove('active'));
    if(currentTarget){
      const activeLink=targetMap.get(currentTarget);
      if(activeLink)activeLink.classList.add('active');
    }
  }

  let ticking=false;
  window.addEventListener('scroll',()=>{
    if(!ticking){
      window.requestAnimationFrame(()=>{
        updateActiveLink();
        ticking=false;
      });
      ticking=true;
    }
  },{passive:true});

  updateActiveLink();
})();

// ============================================================
// 原生双模课件：翻页式 PPT 演示引擎 (Presentation Engine)
// ============================================================
(function initPPTMode() {
  if (!document.querySelector('.ppt-open-trigger')) {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ppt-open-trigger';
    trigger.innerHTML = '<span>🖥️</span><span>幻灯片演示</span>';
    trigger.title = '进入全屏翻页 PPT 演示模式 (快捷键: P)';
    document.body.appendChild(trigger);
  }

  function createPPTStage() {
    let stage = document.querySelector('.ppt-stage');
    if (stage) return stage;

    stage = document.createElement('div');
    stage.className = 'ppt-stage';
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', 'PPT幻灯片放映区');

    const topbar = document.createElement('div');
    topbar.className = 'ppt-topbar';
    topbar.innerHTML = `
      <button type="button" class="ppt-top-btn" id="ppt-fullscreen-btn" title="全屏放映 (F11)">
        <span>⛶</span><span>全屏</span>
      </button>
      <button type="button" class="ppt-top-btn exit" id="ppt-exit-btn" title="退出 PPT 模式 (Esc)">
        <span>✕</span><span>返回文档</span>
      </button>
    `;
    stage.appendChild(topbar);

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'ppt-nav-btn ppt-nav-prev';
    prevBtn.innerHTML = '‹';
    prevBtn.title = '上一页 (← / ↑ / PageUp)';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'ppt-nav-btn ppt-nav-next';
    nextBtn.innerHTML = '›';
    nextBtn.title = '下一页 (→ / ↓ / Space / PageDown)';

    stage.appendChild(prevBtn);
    stage.appendChild(nextBtn);

    const footer = document.createElement('div');
    footer.className = 'ppt-footer';
    footer.innerHTML = `
      <span class="ppt-slide-title" id="ppt-current-title">封面导引</span>
      <span class="ppt-page-counter" id="ppt-counter">1 / 1</span>
      <span class="ppt-hint">按 ← → / 空格翻页 · Esc 退出</span>
    `;
    stage.appendChild(footer);

    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'ppt-cards-container';
    stage.appendChild(cardsWrap);

    document.body.appendChild(stage);
    return stage;
  }

  let pptSlides = [];
  let currentSlideIndex = 0;

  function buildSlides() {
    const stage = createPPTStage();
    const container = stage.querySelector('.ppt-cards-container');
    container.innerHTML = '';
    pptSlides = [];

    const hero = document.querySelector('.hero, .detail-header');
    if (hero) {
      const card = document.createElement('div');
      card.className = 'ppt-slide-card';
      card.innerHTML = `
        <span class="ppt-slide-badge">🎯 本课主题</span>
        ${hero.innerHTML}
      `;
      container.appendChild(card);
      pptSlides.push({ card, title: '课程导引' });
    }

    const sections = document.querySelectorAll('.lesson-section, body.lesson-page .part');
    sections.forEach((sec, idx) => {
      const h2 = sec.querySelector('h2');
      const rawTitle = h2 ? h2.textContent.replace(/^[0-9\s·|｜-]+/, '').trim() : `板块 ${idx + 1}`;
      const friendlyBadge = h2 ? h2.textContent.trim() : `板块 ${idx + 1}`;

      const stepCards = Array.from(sec.querySelectorAll('.step-card, .practice-task'));
      const h3List = Array.from(sec.querySelectorAll('h3'));
      const hasStepH3 = h3List.some(h => /第\s*\d+\s*步/i.test(h.textContent));

      if (stepCards.length > 1) {
        stepCards.forEach((step, sIdx) => {
          const h3 = step.querySelector('h3, h4, h5');
          const stepTitle = h3 ? h3.textContent.trim() : `第 ${sIdx + 1} 步`;
          const stepCard = document.createElement('div');
          stepCard.className = 'ppt-slide-card';
          stepCard.innerHTML = `
            <span class="ppt-slide-badge">🔨 ${friendlyBadge} · 第 ${sIdx + 1} 步</span>
            ${step.innerHTML}
          `;
          container.appendChild(stepCard);
          pptSlides.push({ card: stepCard, title: `${rawTitle} · ${stepTitle}` });
        });
      } else if (h3List.length > 1 && hasStepH3) {
        // Universal 课次按 H3 智能分步切片
        const children = Array.from(sec.children);
        let currentSlice = [];
        let currentH3Text = '';

        function commitSlice() {
          if (!currentSlice.length) return;
          const card = document.createElement('div');
          card.className = 'ppt-slide-card';
          const badgeText = currentH3Text ? `🔨 ${friendlyBadge} · ${currentH3Text}` : `⚡ ${friendlyBadge} · 任务总览`;
          card.innerHTML = `
            <span class="ppt-slide-badge">${badgeText}</span>
            ${currentSlice.map(el => el.outerHTML).join('\n')}
          `;
          container.appendChild(card);
          pptSlides.push({ card, title: currentH3Text || `${rawTitle} · 总览` });
          currentSlice = [];
        }

        children.forEach(child => {
          if (child.tagName === 'H2') return;
          if (child.tagName === 'H3') {
            commitSlice();
            currentH3Text = child.textContent.trim();
          }
          currentSlice.push(child);
        });
        commitSlice();
      } else {
        const card = document.createElement('div');
        card.className = 'ppt-slide-card';
        card.innerHTML = `
          <span class="ppt-slide-badge">📘 ${friendlyBadge}</span>
          ${sec.innerHTML}
        `;
        container.appendChild(card);
        pptSlides.push({ card, title: rawTitle });
      }
    });

    container.querySelectorAll('.copy-button[data-copy-target]').forEach(button => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.copyTarget;
        const target = container.querySelector('#' + CSS.escape(targetId)) || document.getElementById(targetId);
        const originalText = button.textContent.trim();
        try {
          if (!target) throw Error('目标不存在');
          await copyLessonText(target.textContent.trim());
          button.textContent = '已复制';
        } catch (_) {
          button.textContent = '复制失败，请手动复制';
        }
        setTimeout(() => button.textContent = originalText, 2000);
      });
    });
  }

  function showSlide(index) {
    if (!pptSlides.length) return;
    if (index < 0) index = 0;
    if (index >= pptSlides.length) index = pptSlides.length - 1;
    currentSlideIndex = index;

    pptSlides.forEach((s, idx) => {
      s.card.classList.toggle('active', idx === currentSlideIndex);
      if (idx === currentSlideIndex) {
        s.card.scrollTop = 0;
      }
    });

    const stage = document.querySelector('.ppt-stage');
    if (stage) {
      const counter = stage.querySelector('#ppt-counter');
      const titleSpan = stage.querySelector('#ppt-current-title');
      const prevBtn = stage.querySelector('.ppt-nav-prev');
      const nextBtn = stage.querySelector('.ppt-nav-next');

      if (counter) counter.textContent = `${currentSlideIndex + 1} / ${pptSlides.length}`;
      if (titleSpan) titleSpan.textContent = pptSlides[currentSlideIndex].title;
      if (prevBtn) prevBtn.disabled = (currentSlideIndex === 0);
      if (nextBtn) nextBtn.disabled = (currentSlideIndex === pptSlides.length - 1);
    }
  }

  function openPPT(initialIndex = 0) {
    buildSlides();
    document.body.classList.add('is-ppt-mode');
    showSlide(initialIndex);
  }

  function closePPT() {
    document.body.classList.remove('is-ppt-mode');
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.ppt-open-trigger')) {
      let targetIndex = 0;
      const sections = Array.from(document.querySelectorAll('.hero, .lesson-section, body.lesson-page .part'));
      const scrollPos = window.scrollY + 200;
      for (let i = 0; i < sections.length; i++) {
        if (scrollPos >= sections[i].getBoundingClientRect().top + window.scrollY) {
          targetIndex = i;
        }
      }
      openPPT(targetIndex);
    } else if (e.target.closest('#ppt-exit-btn')) {
      closePPT();
    } else if (e.target.closest('.ppt-nav-prev')) {
      showSlide(currentSlideIndex - 1);
    } else if (e.target.closest('.ppt-nav-next')) {
      showSlide(currentSlideIndex + 1);
    } else if (e.target.closest('#ppt-fullscreen-btn')) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  });

  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (document.body.classList.contains('is-ppt-mode')) {
      if (['ArrowRight', 'ArrowDown', 'Space', 'PageDown'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
        showSlide(currentSlideIndex + 1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.code)) {
        e.preventDefault();
        showSlide(currentSlideIndex - 1);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        closePPT();
      } else if (e.code === 'Home') {
        e.preventDefault();
        showSlide(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        showSlide(pptSlides.length - 1);
      }
    } else {
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        openPPT();
      }
    }
  });

  if (new URLSearchParams(window.location.search).get('mode') === 'ppt') {
    openPPT(0);
  }
})();
