(function(){
  const KEY='skhc_cloud_config_v1';
  let client=null;
  let config=JSON.parse(localStorage.getItem(KEY)||'null');
  function configured(){return !!(config&&config.url&&config.key)}
  function init(){
    if(!configured() || !window.supabase) return null;
    try{ client=window.supabase.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); return client; }
    catch(e){ console.error(e); client=null; return null; }
  }
  init();
  async function session(){ if(!client) init(); if(!client) return null; const r=await client.auth.getSession(); return r.data.session||null; }
  async function signIn(email,password){ if(!client) init(); if(!client) throw new Error('Configura primero Supabase'); return await client.auth.signInWithPassword({email,password}); }
  async function signUp(email,password){ if(!client) init(); if(!client) throw new Error('Configura primero Supabase'); return await client.auth.signUp({email,password}); }
  async function signOut(){ if(client) await client.auth.signOut({scope:'local'}); }
  async function saveState(state){
    const s=await session(); if(!s) return {skipped:true};
    const payload={settings:state.settings,clients:state.clients,products:state.products,documents:state.documents,toolLists:state.toolLists};
    const {error}=await client.from('company_state').upsert({user_id:s.user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error) throw error; return {ok:true};
  }
  async function loadState(){
    const s=await session(); if(!s) return null;
    const {data,error}=await client.from('company_state').select('payload').eq('user_id',s.user.id).maybeSingle();
    if(error) throw error; return data?.payload||null;
  }
  window.SKCloud={
    getConfig:()=>config||{url:'',key:''},
    setConfig:(url,key)=>{config={url:String(url||'').trim(),key:String(key||'').trim()};localStorage.setItem(KEY,JSON.stringify(config));init()},
    configured,session,signIn,signUp,signOut,saveState,loadState,
    isConnected:async()=>!!(await session())
  };
})();
