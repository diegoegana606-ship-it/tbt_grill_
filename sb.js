/* TBT Grill · conexión con Supabase (sin librerías externas).
   Solo usa la URL del proyecto y la clave pública (publishable). Nunca pongas aquí la clave secreta. */
(function(){
  var URL_='https://vwljnekdxymgosqnvcoo.supabase.co';
  var KEY='sb_publishable_2F8uPJJtR3R_KLQsSSDKew_Lh_i-Vnf';
  var LS='tbt-sb-sesion';
  var ses=null;
  try{ses=JSON.parse(localStorage.getItem(LS))}catch(e){}
  function store(s){ses=s;try{s?localStorage.setItem(LS,JSON.stringify(s)):localStorage.removeItem(LS)}catch(e){}}
  async function j(r){
    var t=await r.text(),d=null;try{d=t?JSON.parse(t):null}catch(e){d=t}
    if(!r.ok){var e=new Error((d&&(d.msg||d.message||d.error_description||d.error))||('Error '+r.status));e.status=r.status;e.data=d;throw e}
    return d;
  }
  async function auth(grant,body){
    var d=await j(await fetch(URL_+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}));
    store({at:d.access_token,rt:d.refresh_token,exp:Date.now()+(d.expires_in||3600)*1000-60000,email:(d.user&&d.user.email)||(ses&&ses.email)||''});
    return ses;
  }
  var refreshing=null;
  async function token(){
    if(!ses)return null;
    if(Date.now()>ses.exp){
      refreshing=refreshing||auth('refresh_token',{refresh_token:ses.rt}).catch(function(e){if(e.status>=400&&e.status<500)store(null);throw e}).finally(function(){refreshing=null});
      await refreshing;
    }
    return ses&&ses.at;
  }
  async function H(extra){var h=Object.assign({apikey:KEY},extra||{});var t=await token();if(t)h.Authorization='Bearer '+t;return h}
  var JSONH={'Content-Type':'application/json'};
  async function write(method,path,body){
    var d=await j(await fetch(URL_+'/rest/v1/'+path,{method:method,headers:await H(Object.assign({Prefer:'return=representation'},body!==undefined?JSONH:{})),body:body!==undefined?JSON.stringify(body):undefined}));
    if(Array.isArray(d)&&!d.length){var e=new Error('Sin permiso: vuelve a entrar al panel.');e.status=403;throw e}
    return d;
  }
  window.SB={
    url:URL_,key:KEY,
    get email(){return ses&&ses.email},
    hasSession:function(){return !!ses},
    login:function(email,password){return auth('password',{email:email,password:password})},
    logout:async function(){try{var t=await token();if(t)await fetch(URL_+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+t}})}catch(e){}store(null)},
    rpc:async function(fn,args){return j(await fetch(URL_+'/rest/v1/rpc/'+fn,{method:'POST',headers:await H(JSONH),body:JSON.stringify(args||{})}))},
    get:async function(path){return j(await fetch(URL_+'/rest/v1/'+path,{headers:await H(),cache:'no-store'}))},
    insert:function(t,row){return write('POST',t,row)},
    update:function(t,q,patch){return write('PATCH',t+'?'+q,patch)},
    del:function(t,q){return write('DELETE',t+'?'+q)},
    upload:async function(path,blob){
      await j(await fetch(URL_+'/storage/v1/object/fotos/'+path,{method:'POST',headers:await H({'Content-Type':blob.type||'image/webp','x-upsert':'true','cache-control':'31536000'}),body:blob}));
      return URL_+'/storage/v1/object/public/fotos/'+path;
    }
  };
})();
