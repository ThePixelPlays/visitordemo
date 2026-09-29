/* Visitor Approval Desk — dashboard (Secretary + Chairman views; the Chairman's role key is "manager") */
(function(){
  const $=(id)=>document.getElementById(id);
  let lang=getLang(); const t=(k)=>T[lang][k];

  const I=(p)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
  const ICON_ALLOW=I('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  const ICON_DECLINE=I('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>');
  const ICON_UNDO=I('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>');
  const svg=(m)=>{const x=document.createElement('template');x.innerHTML=m.trim();return x.content.firstChild;};

  let tt; function toast(m){const x=$('toast');x.textContent=m;x.hidden=false;clearTimeout(tt);tt=setTimeout(()=>x.hidden=true,2600);}
  const fDate=(ms)=>ms?new Intl.DateTimeFormat('en-US',{month:'numeric',day:'numeric',year:'numeric'}).format(new Date(ms)):'';
  const fTime=(ms)=>ms?new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(ms)):'';
  const dayKey=(ms)=>{const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  function tick(){ $('clock').textContent=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(new Date()); }

  const S={me:null,role:null,view:null,report:false,reportDay:dayKey(Date.now()),visits:[],version:null,loaded:false,
    sel:null,commentDraft:'',drafts:{},busy:false,saving:false,resetArmed:false};

  /* ---- server calls ---- */
  async function api(path,body){
    const r=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.status===401){ toast(t('signedOut')); setTimeout(()=>location.href='/login',1200); throw {code:'signed_out'}; }
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw Object.assign({status:r.status},data);
    return data;
  }
  /* ---- "new" entries: waiting visits this Chairman hasn't looked at yet (remembered per browser) ---- */
  let seen=null;
  const seenKey=()=>'desk-seen-'+(S.me?S.me.username:'');
  function loadSeen(){ try{ const raw=localStorage.getItem(seenKey()); if(raw) seen=new Set(JSON.parse(raw)); }catch(_){} }
  function saveSeen(){ try{ localStorage.setItem(seenKey(),JSON.stringify([...seen].slice(-1000))); }catch(_){} }
  function markSeen(id){ if(seen&&!seen.has(id)){ seen.add(id); saveSeen(); return true; } return false; }
  const isNew=(v)=>S.role==='manager'&&S.view==='manager'&&seen&&v.status==='pending'&&!v.comment&&!seen.has(v.id);
  function updateTitle(){ const n=S.visits.filter(v=>!v.adjournedAt&&isNew(v)).length; document.title=(n?'('+n+') ':'')+t('title'); }

  async function load(){
    try{
      const d=await api('/api/visits'+(S.version?('?since='+encodeURIComponent(S.version)):''));
      if(!d.unchanged){
        S.visits=d.visits||[]; S.version=d.version;
        if(!seen){ seen=new Set(S.visits.map(v=>v.id)); saveSeen(); } // first time in this browser: nothing counts as new
        S.loaded=true; paint();
      }
    }catch(e){ if(e&&e.code!=='signed_out'&&!S.loaded){ S.loaded=true; paint(); } }
  }
  function poll(){ load().finally(()=>setTimeout(poll,document.hidden?15000:4000)); }
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) load(); });

  /* ---- language ---- */
  function applyLang(){
    const dir=lang==='ar'?'rtl':'ltr';
    document.documentElement.lang=lang; document.documentElement.dir=dir;
    for(const id of ['wrap','foot','toast']){ $(id).dir=dir; $(id).lang=lang; }
    document.title=t('title');
    $('langBtn').textContent=t('switchTo');
    $('reportBtn').textContent=t('report'); $('seg').setAttribute('aria-label',t('viewAs'));
    $('asManager').textContent=t('manager'); $('asSecretary').textContent=t('secretary');
    $('outBtn').textContent=t('signOut');
    $('footL').textContent=t('office'); $('footR').textContent=t('copy'); $('logo').alt=t('office');
    if($('boot')) $('boot').textContent=t('booting');
  }
  $('langBtn').onclick=()=>{ lang=lang==='ar'?'en':'ar'; setLang(lang); applyLang(); paint(); };
  $('outBtn').onclick=async()=>{ try{ await fetch('/api/logout',{method:'POST'}); }catch(_){} location.href='/login'; };
  $('reportBtn').onclick=()=>{ S.report=!S.report; S.resetArmed=false; $('reportBtn').setAttribute('aria-pressed',S.report); S.sel=null; paint(); };

  function setView(v){S.view=v;S.sel=null;$('asManager').setAttribute('aria-pressed',v==='manager');$('asSecretary').setAttribute('aria-pressed',v==='secretary');paint();}

  async function start(){
    applyLang(); tick(); setInterval(tick,1000);
    try{ S.me=await api('/api/me'); }catch(_){ return; }
    loadSeen();
    S.role=S.me.role; S.view=S.role;
    if(S.role==='manager'){ $('seg').hidden=false; $('asManager').onclick=()=>setView('manager'); $('asSecretary').onclick=()=>setView('secretary'); }
    paint(); poll();
  }

  /* ---- rendering ---- */
  function paint(){
    if(!S.me) return;
    const a=document.activeElement, aid=a&&a.id, pos=aid&&a.selectionStart;
    const parts=[];
    if(S.report) parts.push(reportView());
    else{ if(S.view==='secretary') parts.push(entryForm()); parts.push(activeTable()); }
    S.painting=true; $('main').replaceChildren(...parts); S.painting=false; updateTitle();
    if(aid&&$(aid)){const el=$(aid);el.focus();try{if(pos!=null)el.setSelectionRange(pos,pos);}catch(_){}}
  }
  const activeRows=()=>S.visits.filter(v=>!v.adjournedAt).sort((a,b)=>b.createdAt-a.createdAt);
  function statusCell(v){
    if(v.status==='accepted') return h('span',{class:'status st-accepted'},h('i',{class:'dot'}),t('stAllowed'),h('span',{class:'t',text:'('+fTime(v.decidedAt)+')'}));
    if(v.status==='declined') return h('span',{class:'status st-declined'},h('i',{class:'dot'}),t('stDeclined'),h('span',{class:'t',text:'('+fTime(v.decidedAt)+')'}));
    return h('span',{class:'status st-pending'},h('i',{class:'dot'}),t('stPending'));
  }

  function entryForm(){
    const g=h('input',{id:'gName',type:'text',maxlength:'120',autocomplete:'off',placeholder:t('guestPh')});
    const p=h('textarea',{id:'gPurpose',maxlength:'500',placeholder:t('purposePh')});
    g.value=S.drafts.g||''; p.value=S.drafts.p||'';
    g.oninput=()=>S.drafts.g=g.value; p.oninput=()=>S.drafts.p=p.value;
    const b=h('button',{class:'btn-add',id:'addBtn',type:'submit',disabled:S.busy},t('sendToMgr'));
    const f=h('form',{class:'entry'},h('h2',{text:t('newVisitor')}),
      h('div',{class:'f'},h('label',{for:'gName',text:t('guest')}),g),
      h('div',{class:'f'},h('label',{for:'gPurpose',text:t('purpose')}),p),b);
    f.addEventListener('submit',async e=>{
      e.preventDefault(); const gn=g.value.trim(), pp=p.value.trim();
      if(!gn){g.focus();toast(t('needGuest'));return;}
      if(!pp){p.focus();toast(t('needPurpose'));return;}
      S.busy=true; b.disabled=true;
      try{ await api('/api/visits',{guestName:gn,purpose:pp}); S.drafts={}; toast(t('sent')); if(document.activeElement) document.activeElement.blur(); await load(); }
      catch(err){ if(err&&err.code!=='signed_out') toast(err&&err.status===403?t('noAddPerm'):t('sendErr')); }
      S.busy=false; paint();
    });
    return f;
  }

  function startEdit(id){ markSeen(id); const v=S.visits.find(x=>x.id===id); S.sel=id; S.commentDraft=(v&&v.comment)||''; paint(); const el=$('cInput'); if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);} }
  function stopEdit(){ S.sel=null; S.commentDraft=''; paint(); }
  async function saveComment(id){
    if(S.saving) return; S.saving=true;
    const cur=(S.visits.find(x=>x.id===id)||{}).comment||'';
    if(S.commentDraft.trim()===cur){ S.saving=false; stopEdit(); return; }
    try{ await api('/api/visits/'+id+'/comment',{comment:S.commentDraft.trim()}); toast(t('commentSent')); S.sel=null; S.commentDraft=''; await load(); }
    catch(e){ if(e&&e.code!=='signed_out') toast(t('commentErr')); }
    S.saving=false; paint();
  }
  function fitBox(el){ el.style.height='auto'; el.style.height=el.scrollHeight+'px'; }
  function commentCell(v,mgr){
    if(!mgr) return h('div',{class:'box'+(v.comment?'':' empty'),text:v.comment||''});
    if(S.sel===v.id){
      const ta=h('textarea',{id:'cInput',class:'box-edit',maxlength:'500',rows:'1',placeholder:t('commentPh'),'aria-label':t('commentOn')+v.guestName});
      ta.value=S.commentDraft;
      ta.oninput=()=>{ S.commentDraft=ta.value; fitBox(ta); };
      ta.onkeydown=(e)=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveComment(v.id);} else if(e.key==='Escape'){e.preventDefault();stopEdit();} };
      ta.onblur=()=>{ if(!S.painting&&S.sel===v.id) saveComment(v.id); };
      setTimeout(()=>fitBox(ta),0);
      return ta;
    }
    return h('button',{class:'box box-btn'+(v.comment?'':' empty'),type:'button',id:'cm-'+v.id,'aria-label':t('commentOn')+v.guestName,onclick:()=>startEdit(v.id)},v.comment||t('addComment'));
  }
  function activeTable(){
    if(!S.loaded) return h('div',{class:'none',text:t('loading')});
    const mgr=S.view==='manager'&&S.role==='manager';
    const rows=activeRows();
    if(!rows.length) return h('div',{class:'none',text:mgr?t('emptyMgr'):t('emptySec')});
    const head=h('tr',{},h('th',{class:'c',text:t('thSerial')}),h('th',{text:t('guest')}),h('th',{text:t('thDate')}),h('th',{text:t('thTime')}),
      h('th',{text:t('purpose')}),h('th',{text:t('thComment')}),h('th',{text:t('thStatus')}),h('th',{class:'c'},''),h('th',{class:'c',text:t('thDecision')}));
    const body=rows.map(v=>{
      let acts;
      if(v.status==='pending'){
        acts=mgr? h('div',{class:'acts'},
          h('button',{class:'ico allow',id:'ok-'+v.id,title:t('allow'),'aria-label':t('allowOf')+v.guestName,onclick:()=>decide(v.id,'accepted')},svg(ICON_ALLOW)),
          h('button',{class:'ico',id:'no-'+v.id,title:t('decline'),'aria-label':t('declineOf')+v.guestName,onclick:()=>decide(v.id,'declined')},svg(ICON_DECLINE)))
          : h('div',{class:'acts'},h('span',{text:t('waitingMgr')}));
      }else if(v.status==='accepted'){
        acts=h('div',{class:'acts'},h('button',{class:'ico muted',disabled:!mgr,id:'re-'+v.id,title:mgr?t('undoDecision'):t('allowedTip'),'aria-label':mgr?t('undoDecision'):t('allowedTip'),onclick:mgr?()=>decide(v.id,'pending'):null},svg(ICON_ALLOW)));
      }else{
        acts=h('div',{class:'acts'},mgr?h('button',{class:'ico muted',id:'re-'+v.id,title:t('undoDecision'),'aria-label':t('undoDecision'),onclick:()=>decide(v.id,'pending')},svg(ICON_UNDO)):h('span',{text:t('rejected')}));
      }
      const fresh=isNew(v);
      return h('tr',{class:(v.status==='pending'?'pending':'')+(fresh?' new':''),onclick:fresh?()=>{ if(markSeen(v.id)) paint(); }:null},
        h('td',{class:'c num serial',text:v.serial||'—'}),
        h('td',{},h('div',{class:'box guest'},v.guestName,fresh?h('span',{class:'tag-new',text:t('newTag')}):null)),
        h('td',{class:'num',text:fDate(v.createdAt)}),
        h('td',{class:'num',text:fTime(v.createdAt)}),
        h('td',{},h('div',{class:'box',text:v.purpose})),
        h('td',{},commentCell(v,mgr)),
        h('td',{},statusCell(v)),
        h('td',{class:'c'},h('button',{class:'btn-done',id:'dn-'+v.id,onclick:()=>adjourn(v.id)},t('done'))),
        h('td',{class:'c'},acts));
    });
    return h('div',{class:'tbl-wrap'},h('table',{},h('thead',{},head),h('tbody',{},body)));
  }

  async function decide(id,status){
    markSeen(id);
    try{ await api('/api/visits/'+id+'/decision',{status});
      toast(status==='accepted'?t('okAllowed'):status==='declined'?t('okDeclined'):t('undone')); await load(); }
    catch(e){ if(e&&e.code!=='signed_out') toast(e&&e.status===403?t('mgrOnly'):t('decErr')); }
  }
  async function adjourn(id){
    markSeen(id);
    try{ await api('/api/visits/'+id+'/adjourn',{}); if(S.sel===id) S.sel=null; toast(t('finished')); await load(); }
    catch(e){ if(e&&e.code!=='signed_out') toast(t('finErr')); }
  }

  function reportView(){
    const di=h('input',{type:'date',id:'repDay',value:S.reportDay,onchange:(e)=>{S.reportDay=e.target.value;paint();}});
    const wrap=h('section',{style:'display:flex;flex-direction:column;gap:12px'},
      h('div',{class:'rep-head'},h('h2',{text:t('repTitle')}),h('label',{style:'display:flex;gap:8px;align-items:center'},t('day'),di)));
    if(!S.loaded){ wrap.append(h('div',{class:'none',text:t('repLoading')})); return wrap; }
    const rows=S.visits.filter(v=>dayKey(v.createdAt)===S.reportDay).sort((a,b)=>a.createdAt-b.createdAt);
    const c={a:0,d:0,p:0}; rows.forEach(v=>{if(v.status==='accepted')c.a++;else if(v.status==='declined')c.d++;else c.p++;});
    wrap.append(h('div',{class:'stats'},
      h('span',{},t('total'),h('b',{text:rows.length})),h('span',{},t('nAllowed'),h('b',{text:c.a})),
      h('span',{},t('nDeclined'),h('b',{text:c.d})),h('span',{},t('nWaiting'),h('b',{text:c.p}))));
    if(!rows.length) wrap.append(h('div',{class:'none',text:t('repEmpty')}));
    else{
      const head=h('tr',{},h('th',{class:'c',text:t('thSerial')}),h('th',{text:t('guest')}),h('th',{text:t('thLogged')}),h('th',{text:t('purpose')}),
        h('th',{text:t('thComment')}),h('th',{text:t('thStatus')}),h('th',{text:t('thFinished')}),h('th',{text:t('thBy')}));
      const body=rows.map((v,i)=>h('tr',{},h('td',{class:'c num serial',text:v.serial||i+1}),h('td',{},h('div',{class:'box guest',text:v.guestName})),h('td',{class:'num',text:fTime(v.createdAt)}),
        h('td',{},h('div',{class:'box',text:v.purpose})),h('td',{},h('div',{class:'box'+(v.comment?'':' empty'),text:v.comment||'—'})),
        h('td',{},statusCell(v)),h('td',{class:'num',text:v.adjournedAt?fTime(v.adjournedAt):'—'}),h('td',{text:v.createdByName||'—'})));
      wrap.append(h('div',{class:'tbl-wrap'},h('table',{},h('thead',{},head),h('tbody',{},body))));
    }
    if(S.role==='manager'){
      const btn=h('button',{class:'btn-reset'+(S.resetArmed?' confirm':''),id:'resetBtn',type:'button',onclick:reset},S.resetArmed?t('resetConfirm'):t('resetData'));
      wrap.append(h('div',{class:'danger-zone'},btn));
    }
    return wrap;
  }
  let armT;
  async function reset(){
    if(!S.resetArmed){ S.resetArmed=true; paint(); clearTimeout(armT); armT=setTimeout(()=>{S.resetArmed=false;paint();},4000); return; }
    S.resetArmed=false; clearTimeout(armT);
    try{ await api('/api/reset',{confirm:'RESET'}); toast(t('resetDone')); await load(); }
    catch(e){ if(e&&e.code!=='signed_out') toast(t('resetErr')); }
    paint();
  }

  start();
})();
