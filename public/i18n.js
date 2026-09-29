/* Visitor Approval Desk — shared text (Arabic / English) and helpers */
const T={
    ar:{title:'مكتب استقبال الزوار',office:'المكتب الهندسي الخاص',copy:'حقوق الطبع محفوظة © قسم نظم المعلومات',
      switchTo:'English',report:'سجل الزوار',viewAs:'طريقة العرض',manager:'الرئيس',secretary:'السكرتير',viewOnly:'عرض فقط',
      booting:'جارٍ تسجيل الدخول وتحميل الزيارات…',loading:'جارٍ تحميل الزيارات…',
      signInT:'يرجى تسجيل الدخول',signInX:'هذه الصفحة تحفظ طلبات الزيارة للفريق. افتحها بعد تسجيل الدخول وبصلاحية من الرئيس.',
      viewerT:'صلاحيتك للعرض فقط',viewerX:'اطلب من الرئيس مشاركة الصفحة معك بصلاحية «مساهم» (Contributor) لتسجيل الزوار.',
      revokedT:'تغيّرت الصلاحيات',revokedX:'أعد تحميل الصفحة للمتابعة.',loadErr:'تعذّر تحميل التحديثات. أعد تحميل الصفحة.',
      newVisitor:'تسجيل زائر جديد',guest:'اسم الزائر',purpose:'الغرض من الزيارة',guestPh:'مثال: علي العسيري',purposePh:'مثال: عرض البريد اليومي',
      sendToMgr:'طلب اجتماع',needGuest:'أدخل اسم الزائر.',needPurpose:'أدخل الغرض من الزيارة.',sent:'تم إرسال الطلب للرئيس',
      noAddPerm:'ليست لديك صلاحية الإضافة. اطلب صلاحية «مساهم» من الرئيس.',full:'السجل ممتلئ. اطلب من الرئيس حذف الزيارات القديمة.',sendErr:'تعذّر الإرسال. تحقق من الاتصال وحاول مرة أخرى.',
      comment:'تعليق :',commentPh:'اكتب التعليق للسكرتير',send:'إرسال',onVisit:'على زيارة: ',cancel:'إلغاء',save:'حفظ',addComment:'انقر لإضافة تعليق',commentSent:'تم حفظ التعليق',commentErr:'تعذّر إرسال التعليق. حاول مرة أخرى.',
      emptyMgr:'لا يوجد زوار في الانتظار. تظهر الطلبات الجديدة هنا فور إرسالها من السكرتير.',emptySec:'لا توجد زيارات حالية. سجّل زائراً من النموذج أعلاه وسيظهر هنا مع رد الرئيس.',
      thSelect:'اختر',thDate:'تاريخ الزيارة',thTime:'وقت الزيارة',thComment:'التعليق',thStatus:'الحالة',thDecision:'موافق/غير موافق',
      commentOn:'تعليق على زيارة ',decline:'غير موافق',declineOf:'رفض زيارة ',allow:'السماح بالزيارة',allowOf:'السماح بزيارة ',undoDecision:'التراجع عن القرار',allowedTip:'تم السماح',
      undo:'تراجع',rejected:'مرفوض',waitingMgr:'بانتظار الرئيس',done:'رفع الجلسة',
      stAllowed:'السماح بالزيارة ',stDeclined:'غير موافق ',stPending:'ينتظر',
      okAllowed:'تم السماح بالزيارة',okDeclined:'تم رفض الزيارة',mgrOnly:'الموافقة والرفض للرئيس فقط.',decErr:'تعذّر حفظ القرار. حاول مرة أخرى.',
      undone:'أُعيدت الزيارة إلى الانتظار',undoErr:'تعذّر التراجع. حاول مرة أخرى.',finished:'رُفعت الجلسة ونُقلت الزيارة إلى سجل الزوار',finErr:'تعذّر رفع الجلسة. حاول مرة أخرى.',
      repTitle:'سجل الزوار',day:'اليوم',repLoading:'جارٍ تحميل سجل الزوار…',total:'إجمالي الزيارات: ',nAllowed:'تم السماح: ',nDeclined:'غير موافق: ',nWaiting:'بانتظار الرد: ',
      repEmpty:'لا توجد زيارات مسجلة في هذا اليوم.',thLogged:'وقت التسجيل',thFinished:'وقت رفع الجلسة',thBy:'سجّلها'},
    en:{title:'Visitor Reception Desk',office:'Private Engineering Office',copy:'© All rights reserved · Information Systems Section',
      switchTo:'العربية',report:'Visitor Log',viewAs:'View as',manager:'Chairman',secretary:'Secretary',viewOnly:'View only',
      booting:'Signing you in and loading visits…',loading:'Loading visits…',
      signInT:'Please sign in',signInX:'This page keeps visit requests for your team. Open it signed in, with access from the Chairman.',
      viewerT:'Your access is view only',viewerX:'Ask the Chairman to share this page with you as a Contributor so you can log visitors.',
      revokedT:'Your access changed',revokedX:'Reload the page to continue.',loadErr:'Could not load updates. Reload the page.',
      newVisitor:'Log a new visitor',guest:'Guest name',purpose:'Purpose of visit',guestPh:'e.g. Ali Al-Asiri',purposePh:'e.g. Daily mail review',
      sendToMgr:'Request Meeting',needGuest:'Enter the guest’s name.',needPurpose:'Enter the purpose of the visit.',sent:'Sent to the Chairman',
      noAddPerm:'You don’t have permission to add visits. Ask the Chairman for Contributor access.',full:'The register is full. Ask the Chairman to clear old visits.',sendErr:'Could not send. Check your connection and try again.',
      comment:'Comment:',commentPh:'Write a comment for the secretary',send:'Send',onVisit:'On visit: ',cancel:'Cancel',save:'Save',addComment:'Click to add a comment',commentSent:'Comment saved',commentErr:'Could not send the comment. Try again.',
      emptyMgr:'No visitors waiting. New requests appear here as soon as the secretary sends them.',emptySec:'No current visits. Log a visitor with the form above and it appears here with the Chairman’s answer.',
      thSelect:'Select',thDate:'Visit date',thTime:'Visit time',thComment:'Comment',thStatus:'Status',thDecision:'Allow / Decline',
      commentOn:'Comment on visit of ',decline:'Decline',declineOf:'Decline visit of ',allow:'Allow visit',allowOf:'Allow visit of ',undoDecision:'Undo decision',allowedTip:'Allowed',
      undo:'Undo',rejected:'Declined',waitingMgr:'Waiting for manager',done:'Adjourn',
      stAllowed:'Visit allowed ',stDeclined:'Declined ',stPending:'Waiting',
      okAllowed:'Visit allowed',okDeclined:'Visit declined',mgrOnly:'Only the Chairman can allow or decline.',decErr:'Could not save the decision. Try again.',
      undone:'Moved back to waiting',undoErr:'Could not undo. Try again.',finished:'Meeting adjourned and moved to the visitor log',finErr:'Could not adjourn the meeting. Try again.',
      repTitle:'Visitor Log',day:'Day',repLoading:'Loading the visitor log…',total:'Total visits: ',nAllowed:'Allowed: ',nDeclined:'Declined: ',nWaiting:'Awaiting reply: ',
      repEmpty:'No visits logged on this day.',thLogged:'Logged at',thFinished:'Adjourned at',thBy:'Logged by'}
  };

// Strings added for the standalone app
Object.assign(T.ar,{thSerial:'م',newTag:'جديد',signOut:'تسجيل الخروج',loginTitle:'تسجيل الدخول',username:'اسم المستخدم',password:'كلمة المرور',signIn:'دخول',
  badLogin:'اسم المستخدم أو كلمة المرور غير صحيحة.',tooMany:'محاولات كثيرة. انتظر عشر دقائق ثم حاول مرة أخرى.',netErr:'تعذّر الاتصال بالخادم. تحقق من الاتصال.',
  demoTitle:'حسابات تجريبية',useThis:'استخدم هذا الحساب',
  resetData:'مسح كل الزيارات',resetConfirm:'اضغط مرة أخرى للتأكيد',resetDone:'تم مسح كل الزيارات',resetErr:'تعذّر مسح الزيارات.',
  signedOut:'انتهت الجلسة. سجّل الدخول مرة أخرى.'});
Object.assign(T.en,{thSerial:'#',newTag:'New',signOut:'Sign out',loginTitle:'Sign in',username:'Username',password:'Password',signIn:'Sign in',
  badLogin:'Wrong username or password.',tooMany:'Too many attempts. Wait ten minutes and try again.',netErr:'Could not reach the server. Check your connection.',
  demoTitle:'Demo accounts',useThis:'Use this account',
  resetData:'Clear all visits',resetConfirm:'Click again to confirm',resetDone:'All visits cleared',resetErr:'Could not clear the visits.',
  signedOut:'Your session ended. Sign in again.'});

function getLang(){ try{ const s=localStorage.getItem('desk-lang'); if(s==='en'||s==='ar') return s; }catch(_){} return 'ar'; }
function setLang(l){ try{ localStorage.setItem('desk-lang',l); }catch(_){} }
function h(tag,attrs,...kids){
  const el=document.createElement(tag);
  for(const k in (attrs||{})){const v=attrs[k]; if(v==null||v===false) continue;
    if(k==='class') el.className=v; else if(k==='text') el.textContent=v;
    else if(k.startsWith('on')) el.addEventListener(k.slice(2),v);
    else el.setAttribute(k,v===true?'':v);}
  for(const c of kids.flat()){ if(c==null||c===false) continue; el.append(c.nodeType?c:document.createTextNode(String(c))); }
  return el;
}
