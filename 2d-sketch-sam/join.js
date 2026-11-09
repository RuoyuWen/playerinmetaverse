(()=>{
 const $=id=>document.getElementById(id),API='/api/cohort',SLOT='cohort-sam-claim';let busy=false;
 try{if(localStorage.getItem(SLOT))$('joinStart').textContent='继续我的原任务（不新增名额） →';}catch{}
 // IndexedDB read/write transactions serialize first-time token creation across browser tabs.
 function browserToken(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open('self-scape-cohort',1);req.onupgradeneeded=()=>req.result.createObjectStore('identity');req.onerror=()=>reject(Error('本浏览器无法保存领取凭据。请允许网站存储后再试，勿使用无痕模式。'));
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('identity','readwrite'),store=tx.objectStore('identity');let token;
   const read=store.get('token');read.onsuccess=()=>{const cached=localStorage.getItem(SLOT);token=cached||read.result;if(!token){const bytes=crypto.getRandomValues(new Uint8Array(24));token=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_');}store.put(token,'token');};
   tx.oncomplete=()=>{db.close();resolve(token);};tx.onerror=tx.onabort=()=>{db.close();reject(Error('无法保存恢复凭据，请允许网站存储后重试。'));};
  };
 });}
 function enter(token){localStorage.setItem(SLOT,token);sessionStorage.setItem('cohort-sam-online-access',token);location.replace('./');}
 $('joinConfirm').onchange=()=>{$('joinStart').disabled=busy||!$('joinConfirm').checked;};
 $('joinStart').onclick=async()=>{
  if(busy||!$('joinConfirm').checked)return;busy=true;$('joinStart').disabled=true;$('joinStatus').textContent='正在领取或找回你的编号…';
  try{
   // Check storage BEFORE server reservation so a blocked browser cannot consume a new slot.
   localStorage.setItem('cohort-storage-check','1');localStorage.removeItem('cohort-storage-check');
   if(!localStorage.getItem(SLOT)&&!window.confirm('确认正式参与本次研究吗？\n\n确认后才会分配参与者编号，并占用 1 个正式名额。\n如果你只是查看页面或测试，请选择“取消”。\n研究者测试评分请使用 ADMIN 入口的测试模式。')){
    $('joinStatus').textContent='已取消参与，未分配编号，也未占用名额。';return;
   }
   const token=await browserToken(),response=await SamApi.request(API+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}),data=await response.json();
   if(!response.ok)throw Error(data.error||'暂时无法领取，请稍后重试。');enter(token);
  }catch(e){$('joinStatus').textContent=e.message;$('joinStatus').classList.add('error');}finally{busy=false;$('joinStart').disabled=!$('joinConfirm').checked;}
 };
 $('recoverForm').onsubmit=async e=>{
  e.preventDefault();if(busy)return;busy=true;const token=$('recoverCode').value.trim();$('joinStatus').textContent='正在找回原任务…';
  try{if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw Error('恢复码格式不正确。');const r=await SamApi.request(API+'/auth',{headers:{Authorization:'Bearer '+token}}),data=await r.json();if(!r.ok||data.access!=='claim')throw Error('恢复码无效，请联系研究者，不要重新报名。');enter(token);}catch(e){$('joinStatus').textContent=e.message;}finally{busy=false;}
 };
})();
