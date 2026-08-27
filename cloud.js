(function(){
  const KEY='skhc_cloud_config_v1';
  let client=null;
  let config=null;

  try{
    config=JSON.parse(localStorage.getItem(KEY)||'null');
  }catch(e){
    config=null;
  }

  function configured(){
    return !!(config && config.url && config.key);
  }

  function init(){
    if(!configured()) return null;
    if(!window.supabase) return null;

    try{
      client=window.supabase.createClient(
        config.url,
        config.key,
        {
          auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:true
          }
        }
      );
      return client;
    }catch(e){
      console.error('Supabase init:',e);
      client=null;
      return null;
    }
  }

  async function getClient(){
    if(client) return client;
    return init();
  }

  async function session(){
    const c=await getClient();
    if(!c) return null;

    try{
      const {data,error}=await c.auth.getSession();
      if(error){
        console.error('Supabase session:',error);
        return null;
      }
      return data?.session||null;
    }catch(e){
      console.error('Supabase session:',e);
      return null;
    }
  }

  async function signIn(email,password){
    const c=await getClient();

    if(!c){
      throw new Error('Configura primero Supabase');
    }

    return await c.auth.signInWithPassword({
      email:String(email||'').trim(),
      password:String(password||'')
    });
  }

  async function signUp(email,password){
    const c=await getClient();

    if(!c){
      throw new Error('Configura primero Supabase');
    }

    return await c.auth.signUp({
      email:String(email||'').trim(),
      password:String(password||'')
    });
  }

  async function signOut(){
    const c=await getClient();

    if(c){
      await c.auth.signOut({scope:'local'});
    }
  }

  async function saveState(state){
    const c=await getClient();
    if(!c) return {skipped:true};

    const s=await session();
    if(!s) return {skipped:true};

    const payload={
      settings:state.settings,
      clients:state.clients,
      products:state.products,
      documents:state.documents,
      toolLists:state.toolLists
    };

    const {error}=await c
      .from('company_state')
      .upsert(
        {
          user_id:s.user.id,
          payload,
          updated_at:new Date().toISOString()
        },
        {
          onConflict:'user_id'
        }
      );

    if(error) throw error;

    return {ok:true};
  }

  async function loadState(){
    const c=await getClient();
    if(!c) return null;

    const s=await session();
    if(!s) return null;

    const {data,error}=await c
      .from('company_state')
      .select('payload')
      .eq('user_id',s.user.id)
      .maybeSingle();

    if(error) throw error;

    return data?.payload||null;
  }

  function setConfig(url,key){
    config={
      url:String(url||'').trim(),
      key:String(key||'').trim()
    };

    localStorage.setItem(KEY,JSON.stringify(config));

    client=null;
    init();

    return true;
  }

  window.SKCloud={
    getConfig:()=>config||{url:'',key:''},
    setConfig,
    configured,
    session,
    signIn,
    signUp,
    signOut,
    saveState,
    loadState,
    isConnected:async()=>!!(await session())
  };

  init();
})();
