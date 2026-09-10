(function(){
 const KEY='skhc_cloud_config_v1';
 const DEFAULT_CONFIG={
 url:'https://gtbjeqhhiryoicaxnrno.supabase.co',
 key:'sb_publishable_A2gHgOLCvh0BUOM5k3GZMw_mR_3vvtG'
 };
 let client=null;
 let authSubscription=null;
 const AUTH_STORAGE_KEY='skhc_supabase_auth_v1';
 const AUTH_EMAIL_KEY='skhc_last_login_email_v1';
 let currentSession=null;
 let config=DEFAULT_CONFIG;
 let sessionRequest=null;
 try{
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved&&typeof saved==='object'&&!Array.isArray(saved))config={...DEFAULT_CONFIG,...saved};
 }catch(e){console.warn('Configuración de nube dañada; se usarán los valores predeterminados.',e);}
 function configured(){return !!(config&&config.url&&config.key)}
 function migrateLegacyAuthStorage(){
 try{
 if(localStorage.getItem(AUTH_STORAGE_KEY))return;
 const ref=new URL(config.url).hostname.split('.')[0];
 const legacyKey=`sb-${ref}-auth-token`;
 const legacy=localStorage.getItem(legacyKey);
 if(legacy)localStorage.setItem(AUTH_STORAGE_KEY,legacy);
 }catch(e){console.warn('No se pudo migrar la sesión anterior de Supabase:',e);}
 }
 function init(){
 if(!configured() || !window.supabase) return null;
 try{
 if(client)return client;
 migrateLegacyAuthStorage();
 client=window.supabase.createClient(config.url,config.key,{
 auth:{
 persistSession:true,
 autoRefreshToken:true,
 detectSessionInUrl:true,
 storage:window.localStorage,
 storageKey:AUTH_STORAGE_KEY,
 flowType:'pkce'
 }
 });
 if(client.auth?.onAuthStateChange){
 const result=client.auth.onAuthStateChange((event,session)=>{
 currentSession=session||null;
 if(session?.user?.email) localStorage.setItem(AUTH_EMAIL_KEY,session.user.email);
 setTimeout(()=>window.dispatchEvent(new CustomEvent('sk-auth-state-change',{detail:{event,session}})),0);
 });
 authSubscription=result?.data?.subscription||null;
 }
 return client;
 }catch(e){
 console.error('Supabase init:',e);
 client=null;
 authSubscription=null;
 currentSession=null;
 return null;
 }
 }
 init();
 function withTimeout(promise,ms,label){
 let timer;
 return Promise.race([
 promise,
 new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label||'CLOUD_TIMEOUT')),ms);})
 ]).finally(()=>clearTimeout(timer));
 }
 async function session(forceRefresh=false){
 if(!client) init();
 if(!client) return null;
 if(currentSession && !forceRefresh) return currentSession;
 if(sessionRequest && !forceRefresh)return sessionRequest;
 sessionRequest=(async()=>{
 try{
 const r=await withTimeout(client.auth.getSession(),8000,'CLOUD_SESSION_TIMEOUT');
 if(r.error)throw r.error;
 currentSession=r.data?.session||null;
 if(currentSession?.user?.email) localStorage.setItem(AUTH_EMAIL_KEY,currentSession.user.email);
 return currentSession;
 }finally{sessionRequest=null;}
 })();
 return sessionRequest;
 }
 async function signIn(email,password){ if(!client) init(); if(!client) throw new Error('Configura primero Supabase'); const r=await withTimeout(client.auth.signInWithPassword({email,password}),12000,'CLOUD_LOGIN_TIMEOUT'); if(r.data?.session) currentSession=r.data.session; if(r.data?.user?.email) localStorage.setItem(AUTH_EMAIL_KEY,r.data.user.email); return r; }
 async function signUp(email,password){ if(!client) init(); if(!client) throw new Error('Configura primero Supabase'); const r=await withTimeout(client.auth.signUp({email,password}),12000,'CLOUD_SIGNUP_TIMEOUT'); if(r.data?.session) currentSession=r.data.session; if(r.data?.user?.email) localStorage.setItem(AUTH_EMAIL_KEY,r.data.user.email); return r; }
 async function signOut(){ if(client) await withTimeout(client.auth.signOut({scope:'local'}),8000,'CLOUD_LOGOUT_TIMEOUT'); currentSession=null; sessionRequest=null; }
 function buildPayload(state){
 const meta={...(state._meta||{})};
 // cloudSyncPending is a local/transient flag; never replicate it between devices.
 delete meta.cloudSyncPending;
 return {version:'stable-2.4.2',meta,settings:state.settings,clients:state.clients,products:state.products,documents:state.documents,toolLists:state.toolLists};
 }
 function mergePayload(local,remote){
 if(!remote)return local;
 const merged={...local};
 const lmeta=local?.meta||{},rmeta=remote?.meta||{};
 const deleted={};
 for(const k of ['clients','products','documents','toolLists']){
 const ldel=Array.isArray(lmeta.deleted?.[k])?lmeta.deleted[k]:[];
 const rdel=Array.isArray(rmeta.deleted?.[k])?rmeta.deleted[k]:[];
 deleted[k]=[...new Set([...ldel,...rdel].map(String))];
 const lm=Array.isArray(local?.[k])?local[k]:[]; const rm=Array.isArray(remote?.[k])?remote[k]:[];
 const map=new Map();
 // Remote is loaded first, then local. When timestamps tie or are missing,
 // prefer the local copy so an older device cannot overwrite fresh local edits.
 for(const item of [...rm,...lm]){
 if(!item||typeof item!=='object')continue;
 const id=String(item.id||''); if(!id)continue;
 const cur=map.get(id);
 if(!cur){map.set(id,item);continue;}
 const ct=Date.parse(cur.updatedAt||'')||0,it=Date.parse(item.updatedAt||'')||0;
 if(it>=ct)map.set(id,item);
 }
 merged[k]=[...map.values()].filter(x=>!deleted[k].includes(String(x.id||'')));
 }
 const lt=Date.parse(lmeta.settingsUpdatedAt||'')||0,rt=Date.parse(rmeta.settingsUpdatedAt||'')||0;
 merged.settings=rt>lt?(remote.settings||local.settings):((local.settings)||remote.settings);
 merged.meta={...rmeta,...lmeta,deleted,usedFolios:{}};
 for(const k of ['quote','note']){
 const lu=Array.isArray(lmeta.usedFolios?.[k])?lmeta.usedFolios[k]:[];
 const ru=Array.isArray(rmeta.usedFolios?.[k])?rmeta.usedFolios[k]:[];
 merged.meta.usedFolios[k]=[...new Set([...lu,...ru].map(String).filter(Boolean))];
 }
 merged.version='stable-2.4.2';
 return merged;
 }
 async function saveState(state,expectedUpdatedAt=null){
 const s=await session(); if(!s) return {skipped:true};
 let expected=expectedUpdatedAt;
 for(let attempt=0;attempt<3;attempt++){
 const payload=buildPayload(state);
 if(!expected){
 const current=await client.from('company_state').select('payload,updated_at').eq('user_id',s.user.id).maybeSingle();
 if(current.error)throw current.error;
 if(current.data){
 const merged=mergePayload(payload,current.data.payload);
 expected=current.data.updated_at;
 const stamp=new Date().toISOString();
 const res=await client.from('company_state').update({payload:merged,updated_at:stamp}).eq('user_id',s.user.id).eq('updated_at',expected).select('payload,updated_at').maybeSingle();
 if(res.error)throw res.error;
 if(res.data)return {ok:true,payload:res.data.payload,updatedAt:res.data.updated_at};
 expected=null; continue;
 }
 }
 const stamp=new Date().toISOString();
 if(expected){
 const res=await client.from('company_state').update({payload,updated_at:stamp}).eq('user_id',s.user.id).eq('updated_at',expected).select('payload,updated_at').maybeSingle();
 if(res.error)throw res.error;
 if(res.data)return {ok:true,payload:res.data.payload,updatedAt:res.data.updated_at};
 expected=null; continue;
 }
 const res=await client.from('company_state').insert({user_id:s.user.id,payload,updated_at:stamp}).select('payload,updated_at').maybeSingle();
 if(res.error){
 if(res.error.code==='23505'){expected=null;continue;}
 throw res.error;
 }
 return {ok:true,payload:res.data?.payload||payload,updatedAt:res.data?.updated_at||stamp};
 }
 throw new Error('CLOUD_CONFLICT_RETRY_EXHAUSTED');
 }
 async function loadState(){
 const s=await session(); if(!s) return null;
 const {data,error}=await client.from('company_state').select('payload,updated_at').eq('user_id',s.user.id).maybeSingle();
 if(error) throw error;
 return data?{payload:data.payload||null,updatedAt:data.updated_at||null}:null;
 }
 window.SKCloud={
 getConfig:()=>config||{url:'',key:''},
 getLastLoginEmail:()=>localStorage.getItem(AUTH_EMAIL_KEY)||'',
 setConfig:(url,key)=>{
 const next={url:String(url||'').trim(),key:String(key||'').trim()};
 const changed=next.url!==config.url||next.key!==config.key;
 config=next;
 localStorage.setItem(KEY,JSON.stringify(config));
 if(changed){
 try{authSubscription?.unsubscribe?.();}catch(_e){}
 authSubscription=null; client=null; currentSession=null; sessionRequest=null;
 }
 init();
 },
 configured,session,signIn,signUp,signOut,saveState,loadState,
 isConnected:async()=>!!(await session())
 };
})();
