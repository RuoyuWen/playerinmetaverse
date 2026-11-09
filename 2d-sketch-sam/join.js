(()=>{
 const $=id=>document.getElementById(id),API='https://self-scape-sketch-sam-data.christianqaq.chatgpt.site/api/cohort',SLOT='cohort-sam-claim';let busy=false;
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
   const token=await browserToken(),response=await fetch(API+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}),data=await response.json();
   if(!response.ok)throw Error(data.error||'暂时无法领取，请稍后重试。');enter(token);
  }catch(e){$('joinStatus').textContent=e.message;$('joinStatus').classList.add('error');}finally{busy=false;$('joinStart').disabled=!$('joinConfirm').checked;}
 };
 $('recoverForm').onsubmit=async e=>{
  e.preventDefault();if(busy)return;busy=true;const token=$('recoverCode').value.trim();$('joinStatus').textContent='正在找回原任务…';
  try{if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw Error('恢复码格式不正确。');const r=await fetch(API+'/auth',{headers:{Authorization:'Bearer '+token}}),data=await r.json();if(!r.ok||data.access!=='claim')throw Error('恢复码无效，请联系研究者，不要重新报名。');enter(token);}catch(e){$('joinStatus').textContent=e.message;}finally{busy=false;}
 };
})();
