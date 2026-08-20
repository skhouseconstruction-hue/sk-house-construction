const KEY='skhc_v1';
const state=JSON.parse(localStorage.getItem(KEY)||'null')||{toolLists:[],settings:{company:'SK House Construction',phone:'',email:'',address:'',rfc:'',bank:'',holder:'',account:'',iva:16,notes:'Gracias por su preferencia.'},clients:[],products:[],documents:[],editing:null};
function save(){localStorage.setItem(KEY,JSON.stringify(state)); if(window.SKCloud){window.SKCloud.saveState(state).catch(e=>{console.warn('Cloud save:',e);})}}
async function syncCloudIntoState(){
 try{
  const cloud=window.SKCloud?await window.SKCloud.loadState():null;
  if(cloud){
    if(cloud.settings) state.settings=cloud.settings;
    if(Array.isArray(cloud.clients)) state.clients=cloud.clients;
    if(Array.isArray(cloud.products)) state.products=cloud.products;
    if(Array.isArray(cloud.documents)) state.documents=cloud.documents;
    localStorage.setItem(KEY,JSON.stringify(state));
    toast('Datos sincronizados con la nube');
  } else if(window.SKCloud){ await window.SKCloud.saveState(state); }
  render(); updateCloudStatus();
 }catch(e){console.error(e); toast('No se pudo sincronizar con la nube. Revisa la configuración.'); updateCloudStatus();}
}
function cloudStatusText(){return window.SKCloud?.configured()?'Configuración de nube guardada':'Nube no configurada'}
async function updateCloudStatus(){const el=document.getElementById('cloudStatus');if(!el)return;try{const s=window.SKCloud?await window.SKCloud.session():null;el.innerHTML=s?`<span class="cloud-ok">● Conectado: ${esc(s.user.email||'usuario')}</span>`:`<span class="muted">○ ${esc(cloudStatusText())}</span>`}catch(e){el.textContent='○ Nube no disponible'}}
async function cloudConfigure(){const url=document.getElementById('cloud_url').value.trim(),key=document.getElementById('cloud_key').value.trim();if(!url||!key)return toast('Escribe la URL y la clave pública de Supabase');window.SKCloud.setConfig(url,key);await updateCloudStatus();toast('Configuración de nube guardada')}
async function cloudLogin(){try{const email=document.getElementById('cloud_email').value.trim(),pass=document.getElementById('cloud_pass').value;if(!email||!pass)return toast('Escribe correo y contraseña');const r=await window.SKCloud.signIn(email,pass);if(r.error)throw r.error;await syncCloudIntoState();toast('Conectado a la nube')}catch(e){console.error(e);toast(e.message||'No se pudo iniciar sesión')}}
async function cloudSignup(){try{const email=document.getElementById('cloud_email').value.trim(),pass=document.getElementById('cloud_pass').value;if(!email||pass.length<6)return toast('Usa un correo y una contraseña de al menos 6 caracteres');const r=await window.SKCloud.signUp(email,pass);if(r.error)throw r.error; if(r.data.session){await syncCloudIntoState();toast('Cuenta creada y conectada')}else toast('Cuenta creada. Revisa tu correo para confirmar y después inicia sesión.')}catch(e){console.error(e);toast(e.message||'No se pudo crear la cuenta')}}
async function cloudLogout(){try{await window.SKCloud.signOut();await updateCloudStatus();toast('Sesión cerrada')}catch(e){toast('No se pudo cerrar sesión')}}
function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n)||0)}
function today(){const d=new Date();return d.toISOString().slice(0,10)}
function folio(type){const p=type==='quote'?'COT':'NV';let max=0;state.documents.filter(x=>x.type===type).forEach(x=>max=Math.max(max,Number((x.folio||'').split('-')[1])||0));return `${p}-${String(max+1).padStart(5,'0')}`}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function render(){const view=state.view||'dashboard';document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const c=document.getElementById('content');c.className='content';({dashboard:dashboard,quote:()=>documentForm('quote',c),note:()=>documentForm('note',c),clients:clients,products:products,history:history,tools:tools,settings:settings}[view]||dashboard)(c)}
function dashboard(c){const qs=state.documents.filter(x=>x.type==='quote'),ns=state.documents.filter(x=>x.type==='note');const sales=ns.reduce((s,x)=>s+x.total,0);c.innerHTML=`<div class="section"><h1>Resumen general</h1><div class="cards"><div class="card"><div class="muted">Cotizaciones</div><div class="metric">${qs.length}</div></div><div class="card"><div class="muted">Notas de venta</div><div class="metric">${ns.length}</div></div><div class="card"><div class="muted">Ventas</div><div class="metric">${money(sales)}</div></div><div class="card"><div class="muted">Clientes</div><div class="metric">${state.clients.length}</div></div></div></div>
<div class="section"><h2>Accesos rápidos</h2><div class="quick"><button onclick="newDocument('quote')">＋ Nueva Cotización</button><button onclick="newDocument('note')">＋ Nueva Nota de Venta</button><button onclick="state.view='clients';render()">＋ Nuevo Cliente</button><button onclick="state.view='products';render()">＋ Nuevo Producto</button></div></div>
<div class="section"><h2>Últimos documentos</h2>${state.documents.length?`<div class="table-wrap"><table class="table"><tr><th>Folio</th><th>Tipo</th><th>Cliente</th><th>Fecha</th><th>Total</th><th></th></tr>${state.documents.slice(-8).reverse().map(d=>`<tr><td>${d.folio}</td><td>${d.type==='quote'?'Cotización':'Nota de venta'}</td><td>${d.client.name||''}</td><td>${d.date}</td><td>${money(d.total)}</td><td><button class="btn outline" onclick="editDoc('${d.id}')">Abrir</button></td></tr>`).join('')}</table></div>`:'<div class="empty">Aún no hay documentos guardados.</div>'}</div>`}
function newDocument(type){state.editing={id:null,type,folio:folio(type),date:today(),client:{name:'',phone:'',email:'',rfc:'',address:''},items:[{qty:1,desc:'',price:0,images:[]}],discount:0,notes:state.settings.notes,total:0};state.view=type;render()}
function documentForm(type,c){
 let d=state.editing;
 if(!d||d.type!==type){newDocument(type);d=state.editing}
 c.innerHTML=`<div class="section">
   <div class="actions no-print" style="margin-top:0;margin-bottom:12px">
     <button class="btn outline" id="homeBtn">← Volver al inicio</button>
     <button class="btn danger" id="clearBtn">Limpiar / Nueva</button>
   </div>
   <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap">
     <div><h1 style="margin-bottom:4px">${type==='quote'?'Nueva cotización':'Nueva nota de venta'}</h1>
     <span class="muted">Captura la información y genera tu documento profesional.</span></div>
     <div style="background:#fff7df;border:1px solid #f2d68c;border-radius:10px;padding:9px 13px"><b>${d.folio}</b><br><span class="small">${d.date}</span></div>
   </div>
 </div>
 <div class="section client-section">
   <h2>Datos del cliente</h2>
   <div class="form-grid">
    <div class="field full"><label>Nombre del cliente / razón social</label><input id="cname" value="${esc(d.client.name)}"></div>
    <div class="field"><label>Teléfono</label><input id="cphone" value="${esc(d.client.phone)}"></div>
    <div class="field"><label>Correo electrónico</label><input id="cemail" value="${esc(d.client.email)}"></div>
    <div class="field"><label>RFC</label><input id="crfc" value="${esc(d.client.rfc)}"></div>
    <div class="field"><label>Dirección</label><input id="caddr" value="${esc(d.client.address)}"></div>
   </div>
 </div>
 <div class="section">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2 style="margin:0">Conceptos</h2><button class="btn outline" id="addItemBtn">＋ Agregar concepto</button></div>
   <div class="table-wrap" style="margin-top:12px"><table class="items"><thead><tr><th>Cantidad</th><th>Descripción</th><th>Precio unitario</th><th>Importe</th><th></th></tr></thead><tbody id="itemRows"></tbody></table></div>
   <div class="totals"><div class="total-row"><span>Subtotal</span><strong id="subTotal"></strong></div>
   <div class="total-row"><span>Descuento</span><input id="discount" inputmode="decimal" value="${d.discount}" style="width:120px;text-align:right"></div>
   <div class="total-row"><span>IVA (${state.settings.iva}%)</span><strong id="ivaTotal"></strong></div>
   <div class="total-row grand"><span>TOTAL</span><strong id="grandTotal"></strong></div></div>
 </div>
 <div class="section">
   <h2>Notas y condiciones</h2>
   <div class="field"><textarea id="notes" rows="4">${esc(d.notes||'')}</textarea></div>
 </div>
 <div class="section no-print">
   <div class="actions" style="margin-top:0">
    <button class="btn primary" id="saveBtn">Guardar</button>
    <button class="btn outline" id="previewBtn">Vista previa</button>
    <button class="btn gold" id="shareBtn">📱 WhatsApp / Compartir PDF</button>
    <button class="btn outline" id="emailBtn">✉ Correo electrónico</button>
   </div>
 </div>`;
 renderItems();bindDocumentInputs();updateTotalsUI();
}
function renderItems(){
 const tbody=document.getElementById('itemRows');
 if(!tbody)return;
 tbody.innerHTML=state.editing.items.map((it,i)=>`<tr>
 <td><input inputmode="decimal" data-i="${i}" data-k="qty" value="${esc(it.qty)}"></td>
 <td><input data-i="${i}" data-k="desc" value="${esc(it.desc)}"></td>
 <td><input inputmode="decimal" data-i="${i}" data-k="price" value="${esc(it.price)}"></td>
 <td class="num" id="line_${i}">${money(num(it.qty)*num(it.price))}</td>
 <td><button class="btn danger" type="button" data-remove="${i}">×</button></td></tr>`).join('');
 tbody.querySelectorAll('input[data-i]').forEach(e=>{
   e.addEventListener('input',()=>{
     const i=Number(e.dataset.i),k=e.dataset.k;
     state.editing.items[i][k]=e.value;
     updateTotalsUI();
   });
 });
 tbody.querySelectorAll('[data-img]').forEach(inp=>inp.addEventListener('change',async()=>{
 const i=Number(inp.dataset.img); for(const file of Array.from(inp.files||[])){const data=await resizeImage(file,1200);state.editing.items[i].images=state.editing.items[i].images||[];state.editing.items[i].images.push({data,text:''});} renderItems(); updateTotalsUI();
}));
tbody.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{
   const i=Number(b.dataset.remove); if(state.editing.items.length>1){state.editing.items.splice(i,1);renderItems();updateTotalsUI();}
 }));
}

function resizeImage(file,max){
 return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const scale=Math.min(1,max/im.width);const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.88));};im.onerror=reject;im.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});
}
function editImageText(i,j){const old=state.editing.items[i].images[j].text||'';const t=prompt('Texto para la imagen (ej. Trabajo por realizar, 25 m², 18 ml, descripción del trabajo):',old);if(t!==null){state.editing.items[i].images[j].text=t;renderItems();}}
function removeImage(i,j){if(confirm('¿Eliminar esta imagen?')){state.editing.items[i].images.splice(j,1);renderItems();}}
function bindDocumentInputs(){
 const map={date:'date',cname:'client.name',cphone:'client.phone',cemail:'client.email',crfc:'client.rfc',caddr:'client.address',discount:'discount',notes:'notes'};
 Object.entries(map).forEach(([id,path])=>{
   const e=document.getElementById(id); if(!e)return;
   e.addEventListener('input',()=>{let target=state.editing;const parts=path.split('.');if(parts.length===2)target[parts[0]][parts[1]]=e.value;else target[path]=e.value;updateTotalsUI();});
 });
 document.getElementById('addItemBtn').addEventListener('click',()=>addItem());
 document.getElementById('homeBtn').addEventListener('click',()=>{state.editing=null;if(!state.toolLists)state.toolLists=[]; if(!state.clients)state.clients=[]; if(!state.products)state.products=[]; if(!state.documents)state.documents=[]; state.view='dashboard';render(); setTimeout(async()=>{if(window.SKCloud){try{if(await window.SKCloud.session()) await syncCloudIntoState(); else updateCloudStatus();}catch(e){console.warn(e);updateCloudStatus();}}},150);});
 document.getElementById('clearBtn').addEventListener('click',()=>{if(confirm('¿Limpiar y comenzar una nueva '+(state.editing.type==='quote'?'cotización':'nota de venta')+'?')){newDocument(state.editing.type);}});
 document.getElementById('saveBtn').addEventListener('click',()=>saveDoc());
 document.getElementById('previewBtn').addEventListener('click',()=>previewDoc());
 document.getElementById('shareBtn').addEventListener('click',async()=>{saveDoc();await shareDoc(state.editing);});
 document.getElementById('emailBtn').addEventListener('click',async()=>{saveDoc();await shareByEmail(state.editing);});
 document.getElementById('cancelBtn').addEventListener('click',()=>{state.editing=null;if(!state.toolLists)state.toolLists=[]; if(!state.clients)state.clients=[]; if(!state.products)state.products=[]; if(!state.documents)state.documents=[]; state.view='dashboard';render(); setTimeout(async()=>{if(window.SKCloud){try{if(await window.SKCloud.session()) await syncCloudIntoState(); else updateCloudStatus();}catch(e){console.warn(e);updateCloudStatus();}}},150);});
}
function num(v){
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  const s=String(v??'').trim().replace(/[$\s]/g,'').replace(/,/g,'');
  const n=Number(s);
  return Number.isFinite(n)?n:0;
}
function calc(d){
  const sub=(d.items||[]).reduce((sum,it)=>sum+num(it.qty)*num(it.price),0);
  const discount=Math.max(0,num(d.discount));
  const taxable=Math.max(0,sub-discount);
  const ivaAmount=taxable*num(state.settings.iva||0)/100;
  return {sub,discount,iva:ivaAmount,total:taxable+ivaAmount};
}
function updateTotalsUI(){
 const d=state.editing;if(!d)return;
 const c=calc(d);
 document.getElementById('subTotal').textContent=money(c.sub);
 document.getElementById('ivaTotal').textContent=money(c.iva);
 document.getElementById('grandTotal').textContent=money(c.total);
 d.items.forEach((it,i)=>{const e=document.getElementById('line_'+i);if(e)e.textContent=money(num(it.qty)*num(it.price));});
}
function addItem(){state.editing.items.push({qty:1,desc:'',price:0,images:[]});renderItems();updateTotalsUI()}
function removeItem(i){if(state.editing.items.length>1){state.editing.items.splice(i,1);render()}}
function subtotal(d){return calc(d).sub}
function iva(d){return calc(d).iva}
function total(d){return calc(d).total}
function saveDoc(){const d=state.editing;if(!d)return;d.total=total(d);const idx=state.documents.findIndex(x=>x.id===d.id);if(idx>=0)state.documents[idx]=JSON.parse(JSON.stringify(d));else{d.id=crypto.randomUUID();state.documents.push(JSON.parse(JSON.stringify(d)));}save();state.editing=JSON.parse(JSON.stringify(d));toast('Documento guardado correctamente')}
function editDoc(id){const d=state.documents.find(x=>x.id===id);if(d){state.editing=JSON.parse(JSON.stringify(d));state.view=d.type;render()}}
function history(c){
 const qs=state.documents.filter(x=>x.type==='quote').slice().reverse();
 const ns=state.documents.filter(x=>x.type==='note').slice().reverse();
 const rows=(arr,type)=>arr.length?`<div class="table-wrap"><table class="table"><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Acciones</th></tr>${arr.map(d=>`<tr><td><b>${esc(d.folio)}</b></td><td>${esc(d.client.name||'')}</td><td>${esc(d.date)}</td><td>${money(d.total)}</td><td><button class="btn outline" type="button" onclick="editDoc('${d.id}')">✎ Modificar</button> <button class="btn gold" type="button" onclick="previewStored('${d.id}')">PDF</button></td></tr>`).join('')}</table></div>`:'<div class="empty">No hay documentos guardados.</div>';
 c.innerHTML=`<div class="section"><h1>Historial</h1>
 <p class="muted">Puedes abrir cualquier documento, modificarlo, guardarlo nuevamente y generar su PDF actualizado.</p>
 <div class="actions"><button class="btn primary" type="button" onclick="showHistoryType('quote')">Cotizaciones (${qs.length})</button><button class="btn gold" type="button" onclick="showHistoryType('note')">Notas de venta (${ns.length})</button></div>
 <div id="historyList" style="margin-top:16px">${rows(qs,'quote')}</div></div>`;
}
function showHistoryType(type){
 const arr=state.documents.filter(x=>x.type===type).slice().reverse();
 const box=document.getElementById('historyList'); if(!box)return;
 box.innerHTML=arr.length?`<div class="table-wrap"><table class="table"><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Acciones</th></tr>${arr.map(d=>`<tr><td><b>${esc(d.folio)}</b></td><td>${esc(d.client.name||'')}</td><td>${esc(d.date)}</td><td>${money(d.total)}</td><td><button class="btn outline" type="button" onclick="editDoc('${d.id}')">✎ Modificar</button> <button class="btn gold" type="button" onclick="previewStored('${d.id}')">PDF</button></td></tr>`).join('')}</table></div>`:'<div class="empty">No hay documentos guardados.</div>';
}
function clients(c){c.innerHTML=`<div class="section"><h1>Clientes</h1><div class="form-grid"><div class="field"><label>Nombre</label><input id="newcn"></div><div class="field"><label>Teléfono</label><input id="newcp"></div><div class="field"><label>Correo</label><input id="newce"></div><div class="field"><label>RFC</label><input id="newcr"></div><div class="field full"><label>Dirección</label><input id="newca"></div></div><div class="actions"><button class="btn primary" onclick="addClient()">Guardar cliente</button></div></div><div class="section"><h2>Clientes registrados</h2>${state.clients.length?`<div class="table-wrap"><table class="table"><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>RFC</th></tr>${state.clients.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${esc(x.email)}</td><td>${esc(x.rfc)}</td></tr>`).join('')}</table></div>`:'<div class="empty">No hay clientes registrados.</div>'}</div>`}
function addClient(){const x={name:newcn.value,phone:newcp.value,email:newce.value,rfc:newcr.value,address:newca.value};if(!x.name)return toast('Escribe el nombre del cliente');state.clients.push(x);save();render();toast('Cliente guardado')}
function products(c){c.innerHTML=`<div class="section"><h1>Productos / Servicios</h1><div class="form-grid"><div class="field"><label>Descripción</label><input id="npn"></div><div class="field"><label>Precio</label><input id="npp" inputmode="decimal"></div></div><div class="actions"><button class="btn primary" onclick="addProduct()">Guardar producto</button></div></div><div class="section"><h2>Catálogo</h2>${state.products.length?`<div class="table-wrap"><table class="table"><tr><th>Descripción</th><th>Precio</th></tr>${state.products.map(x=>`<tr><td>${esc(x.name)}</td><td>${money(x.price)}</td></tr>`).join('')}</table></div>`:'<div class="empty">No hay productos.</div>'}</div>`}
function addProduct(){if(!npn.value)return toast('Escribe una descripción');state.products.push({name:npn.value,price:Number(npp.value)||0});save();render();toast('Producto guardado')}

function tools(c){
 c.innerHTML=`<div class="section"><div class="actions" style="margin-top:0"><button class="btn outline" type="button" onclick="state.view='dashboard';render()">← Volver al inicio</button><button class="btn danger" type="button" onclick="newToolList()">＋ Nueva lista</button></div>
 <h1>Lista de herramientas</h1><p class="muted">Crea una lista editable para entregar a empresas, con tu logotipo y datos de SK House Construction.</p>
 ${state.toolLists.length?state.toolLists.slice().reverse().map(x=>`<div class="list-item"><div><b>${esc(x.name)}</b><br><small>${x.items.length} herramienta(s) · ${esc(x.date)}</small></div><div><button class="btn outline" onclick="editToolList('${x.id}')">Abrir / modificar</button></div></div>`).join(''):'<div class="empty">No hay listas de herramientas guardadas.</div>'}</div>`;
}
function newToolList(){
 state.toolEditing={id:null,name:'Lista de herramientas',date:today(),notes:'',items:[{qty:1,name:'',unit:'pz',obs:''}]};
 toolEditor();
}
function editToolList(id){const x=state.toolLists.find(x=>x.id===id);if(x){state.toolEditing=JSON.parse(JSON.stringify(x));toolEditor();}}
function toolEditor(){
 const d=state.toolEditing,c=document.getElementById('content');
 c.innerHTML=`<div class="section"><div class="actions" style="margin-top:0"><button class="btn outline" onclick="state.view='tools';render()">← Volver</button><button class="btn danger" onclick="newToolList()">Limpiar / Nueva</button></div>
 <div class="form-grid"><div class="field"><label>Nombre de la lista</label><input id="toolName" value="${esc(d.name)}"></div><div class="field"><label>Fecha</label><input id="toolDate" type="date" value="${d.date}"></div></div></div>
 <div class="section"><h2>Herramientas</h2><div class="tool-list"><div class="tool-row tool-header"><div>#</div><div>Herramienta</div><div>Cantidad</div><div>Unidad</div><div></div></div><div id="toolRows"></div></div><div class="actions"><button class="btn outline" id="addTool">＋ Agregar herramienta</button></div></div>
 <div class="section"><div class="field"><label>Observaciones / instrucciones</label><textarea id="toolNotes" rows="4">${esc(d.notes)}</textarea></div><div class="actions"><button class="btn primary" onclick="saveToolList()">Guardar lista</button><button class="btn outline" onclick="previewToolList()">Vista previa</button></div></div>`;
 renderToolRows();
 document.getElementById('addTool').onclick=()=>{d.items.push({qty:1,name:'',unit:'pz',obs:''});renderToolRows()};
 document.getElementById('toolName').oninput=e=>d.name=e.target.value;
 document.getElementById('toolDate').oninput=e=>d.date=e.target.value;
 document.getElementById('toolNotes').oninput=e=>d.notes=e.target.value;
}
function renderToolRows(){
 const d=state.toolEditing,box=document.getElementById('toolRows');if(!box)return;
 box.innerHTML=d.items.map((it,i)=>`<div class="tool-row"><div>${i+1}</div><div><input data-t="${i}" data-k="name" value="${esc(it.name)}"></div><div><input data-t="${i}" data-k="qty" inputmode="decimal" value="${esc(it.qty)}"></div><div><input data-t="${i}" data-k="unit" value="${esc(it.unit)}"></div><div><button class="btn danger" onclick="dltTool(${i})">×</button></div></div>`).join('');
 box.querySelectorAll('[data-t]').forEach(e=>e.oninput=()=>{d.items[+e.dataset.t][e.dataset.k]=e.value});
}
function dltTool(i){if(state.toolEditing.items.length>1){state.toolEditing.items.splice(i,1);renderToolRows()}}
function saveToolList(){const d=state.toolEditing;const x={...JSON.parse(JSON.stringify(d)),id:d.id||crypto.randomUUID()};const i=state.toolLists.findIndex(z=>z.id===x.id);if(i>=0)state.toolLists[i]=x;else state.toolLists.push(x);save();state.toolEditing=x;toast('Lista guardada')}
function previewToolList(){const d=state.toolEditing,m=document.getElementById('modal');m.classList.remove('hidden');m.innerHTML=`<div class="modal-card"><div class="actions no-print"><button class="btn primary" onclick="window.print()">Imprimir / PDF</button><button class="btn danger" onclick="closeModal()">Cerrar</button></div><div class="tool-paper"><div class="tool-paper-head"><img src="logo.jpg"><div><div class="doc-company">SK House Construction</div><b>${esc(d.name)}</b><br><span class="small">${esc(d.date)}</span></div></div><table class="doc-table" style="margin-top:18px"><tr><th>#</th><th>Herramienta</th><th>Cantidad</th><th>Unidad</th></tr>${d.items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.name)}</td><td>${esc(it.qty)}</td><td>${esc(it.unit)}</td></tr>`).join('')}</table><div style="margin-top:20px;font-size:12px"><b>Observaciones:</b><br>${esc(d.notes).replace(/\n/g,'<br>')}</div><div class="doc-foot" style="text-align:center">SK House Construction</div></div></div>`}
function settings(c){const cfg=window.SKCloud?window.SKCloud.getConfig():{url:'',key:''};c.innerHTML=`<div class="section"><h1>Configuración</h1><div class="form-grid">${[['company','Empresa'],['phone','Teléfono'],['email','Correo'],['rfc','RFC'],['address','Dirección'],['bank','Banco'],['holder','Titular'],['account','Cuenta / CLABE']].map(([k,l])=>`<div class="field"><label>${l}</label><input id="s_${k}" value="${esc(state.settings[k]||'')}"></div>`).join('')}<div class="field"><label>IVA (%)</label><input id="s_iva" inputmode="decimal" value="${state.settings.iva}"></div><div class="field full"><label>Notas predeterminadas</label><textarea id="s_notes" rows="3">${esc(state.settings.notes||'')}</textarea></div></div><div class="actions"><button class="btn primary" onclick="saveSettings()">Guardar configuración</button><button class="btn outline" onclick="backup()">Respaldar datos</button><label class="btn outline">Restaurar<input type="file" accept=".json" hidden onchange="restore(this.files[0])"></label></div></div><div class="section"><h2>☁️ Base de datos en línea</h2><p class="muted">Conecta esta aplicación a Supabase para que clientes, productos, cotizaciones, notas y configuración estén disponibles desde cualquier dispositivo. Usa la misma cuenta de acceso en todos tus equipos.</p><div class="form-grid"><div class="field full"><label>Supabase Project URL</label><input id="cloud_url" value="${esc(cfg.url||'')}" placeholder="https://tu-proyecto.supabase.co"></div><div class="field full"><label>Supabase Publishable / Anon Key</label><input id="cloud_key" value="${esc(cfg.key||'')}" placeholder="sb_publishable_..."></div><div class="field"><label>Correo de acceso</label><input id="cloud_email" type="email" placeholder="tu-correo@ejemplo.com"></div><div class="field"><label>Contraseña</label><input id="cloud_pass" type="password" placeholder="Mínimo 6 caracteres"></div></div><div class="actions"><button class="btn outline" onclick="cloudConfigure()">Guardar conexión</button><button class="btn primary" onclick="cloudLogin()">Iniciar sesión</button><button class="btn outline" onclick="cloudSignup()">Crear cuenta</button><button class="btn danger" onclick="cloudLogout()">Cerrar sesión</button></div><div id="cloudStatus" class="small" style="margin-top:10px">Comprobando conexión…</div></div><div class="section"><h2>Logotipo</h2><img src="logo.jpg" class="logo-preview"><p class="muted small">El logotipo oficial está integrado en la aplicación y en los documentos.</p></div>`}
function saveSettings(){Object.keys(state.settings).forEach(k=>{const e=document.getElementById('s_'+k);if(e)state.settings[k]=k==='iva'?Number(e.value)||16:e.value});save();render();toast('Configuración guardada')}
function backup(){const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='SK_House_Construction_respaldo.json';a.click()}
function restore(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);Object.assign(state,x);save();render();toast('Datos restaurados')}catch(e){toast('Archivo de respaldo inválido')}};r.readAsText(file)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function previewDoc(){const d=state.editing;if(!d)return;showPreview(d)}
function previewStored(id){const d=state.documents.find(x=>x.id===id);if(d)showPreview(d)}
function showPreview(d){const m=document.getElementById('modal');m.classList.remove('hidden');m.innerHTML=`<div class="modal-card"><div class="actions no-print"><button class="btn primary" onclick="downloadPDF(${JSON.stringify(d).replace(/"/g,'&quot;')})">Guardar PDF</button><button class="btn gold" onclick="sharePDF(${JSON.stringify(d).replace(/"/g,'&quot;')})">Compartir PDF</button><button class="btn primary" onclick="returnToDocument()">← Volver a la cotización</button><button class="btn outline" onclick="window.print()">Imprimir</button><button class="btn danger" onclick="closeModal()">Cerrar</button></div><div id="paper" class="preview-paper">${docHTML(d)}</div></div>`}
function returnToDocument(){closeModal(); if(state.editing){state.view=state.editing.type; render();}}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
function docHTML(d){
 return `<div class="preview-paper">
 <div class="doc-head">
   <img src="logo.jpg" alt="SK House Construction">
   <div class="doc-brand-block">
    <div class="doc-company">SK House Construction</div>
    <div class="doc-company-data">
      ${esc(state.settings.phone)}${state.settings.phone&&state.settings.email?' &nbsp;·&nbsp; ':''}${esc(state.settings.email)}
      ${state.settings.address?`<br>${esc(state.settings.address)}`:''}
      ${state.settings.rfc?`<br>RFC: ${esc(state.settings.rfc)}`:''}
    </div>
   </div>
   <div class="doc-meta">
    <b>${d.type==='quote'?'COTIZACIÓN':'NOTA DE VENTA'}</b><br>
    Folio: ${esc(d.folio)}<br>Fecha: ${esc(d.date)}
   </div>
 </div>
 <div class="doc-client"><b>CLIENTE</b><br>${esc(d.client.name)}<br>${esc(d.client.phone)} · ${esc(d.client.email)}<br>${esc(d.client.rfc)} · ${esc(d.client.address)}</div>
 <table class="doc-table"><tr><th>Cantidad</th><th>Descripción</th><th>Precio unitario</th><th>Importe</th></tr>${d.items.map(it=>`<tr><td>${esc(it.qty)}</td><td>${esc(it.desc)}${(it.images||[]).map(im=>`<div style="margin-top:6px"><img src="${im.data}" style="max-width:150px;max-height:90px;object-fit:contain"><br><span class="annotation">${esc(im.text||'')}</span></div>`).join('')}</td><td>${money(it.price)}</td><td>${money(num(it.qty)*num(it.price))}</td></tr>`).join('')}</table>
 <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:25px;margin-top:25px">
  <div style="width:52%;font-size:11px;padding:12px;background:#f7f9fc;border-left:4px solid #174f8f">
   <b>DATOS BANCARIOS</b><br>
   Banco: ${esc(state.settings.bank)}<br>
   Titular: ${esc(state.settings.holder)}<br>
   Cuenta / CLABE: ${esc(state.settings.account)}
  </div>
  <div class="doc-total" style="width:280px;margin:0">
   <div><span>Subtotal</span><span>${money(subtotal(d))}</span></div>
   <div><span>Descuento</span><span>${money(d.discount)}</span></div>
   <div><span>IVA (${state.settings.iva}%)</span><span>${money(iva(d))}</span></div>
   <div class="grand"><span>TOTAL</span><span>${money(total(d))}</span></div>
  </div>
 </div>
 <div class="doc-notes"><b>Notas:</b> ${esc(d.notes||'')}</div><div class="doc-foot">SK House Construction</div>
 </div>`;
}
async function canvasPDF(d){
 const paper=document.createElement('div');
 paper.style.cssText='position:absolute;left:-10000px;top:0;width:794px;background:#fff;padding:40px;font-family:Arial;color:#111';
 paper.innerHTML=docHTML(d);
 document.body.appendChild(paper);
 await new Promise(r=>setTimeout(r,250));
 if(!window.html2canvas || !window.jspdf) throw new Error('No se cargaron las herramientas PDF');
 const canvas=await window.html2canvas(paper,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
 paper.remove();
 const {jsPDF}=window.jspdf;
 const pdf=new jsPDF('p','mm','a4');
 const pageW=210,pageH=297,margin=8;
 const imgW=pageW-margin*2;
 const imgH=canvas.height*imgW/canvas.width;
 const img=canvas.toDataURL('image/jpeg',0.95);
 let remaining=imgH, offset=0;
 while(remaining>0){
   pdf.addImage(img,'JPEG',margin,margin-offset,imgW,imgH);
   remaining-=pageH-margin*2;
   if(remaining>0){pdf.addPage();offset+=pageH-margin*2;}
 }
 return pdf.output('blob');
}
async function downloadPDF(d){
 try{
   const blob=await canvasPDF(d);
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${d.folio}_SK_House_Construction.pdf`;a.click();
   setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast('PDF generado correctamente');
 }catch(e){console.error(e);toast('No se pudo generar el PDF');}
}
function shareMessage(d){
 const tipo=d.type==='quote'?'cotización':'nota de venta';
 const cliente=(d.client?.name||'cliente').trim();
 const concepto=(d.items||[]).map(x=>String(x.desc||'').trim()).filter(Boolean)[0]||'';
 const detalle=concepto?` correspondiente a ${concepto}`:'';
 return `Hola ${cliente},\n\nTe compartimos tu ${tipo} ${d.folio}${detalle}, elaborada por SK House Construction.\n\nAdjuntamos el documento en PDF para tu revisión. Si tienes alguna pregunta o deseas realizar algún ajuste, con gusto te atenderemos.\n\nSaludos cordiales,\nSK House Construction`;
}
async function shareDoc(d){
 try{
   const blob=await canvasPDF(d);
   const file=new File([blob],`${d.folio}_SK_House_Construction.pdf`,{type:'application/pdf'});
   const docName=d.type==='quote'?'cotización':'nota de venta';
   const client=d.client?.name ? ` ${d.client.name}` : '';
   const firstConcept=(d.items||[]).find(x=>String(x.desc||'').trim());
   const concept=firstConcept ? ` correspondiente a ${String(firstConcept.desc).trim()}` : '';
   const message=`Hola${client},\n\nTe compartimos tu ${docName} ${d.folio}${concept}, elaborada por SK House Construction.\n\nAdjuntamos el documento en PDF para tu revisión. Si tienes alguna pregunta o deseas realizar algún ajuste, con gusto te atenderemos.\n\nSaludos cordiales,\nSK House Construction`;

   if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
     await navigator.share({
       title:`${docName} ${d.folio} - SK House Construction`,
       text:message,
       files:[file]
     });
     return;
   }

   // Android/browser fallback: save the PDF and open WhatsApp with the
   // professional message already written.
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=`${d.folio}_SK_House_Construction.pdf`;
   a.click();
   setTimeout(()=>URL.revokeObjectURL(url),2000);

   const phone=String(d.client?.phone||'').replace(/\D/g,'');
   const waUrl=phone
     ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
     : `https://wa.me/?text=${encodeURIComponent(message)}`;
   window.open(waUrl,'_blank');
   toast('PDF guardado y mensaje preparado para WhatsApp');
 }catch(e){
   console.error(e);
   toast('No se pudo preparar el envío por WhatsApp');
 }
}

async function shareByEmail(d){
 try{
   const blob=await canvasPDF(d);
   const file=new File([blob],`${d.folio}_SK_House_Construction.pdf`,{type:'application/pdf'});
   const subject=`${d.type==='quote'?'Cotización':'Nota de venta'} ${d.folio} - SK House Construction`;
   const body=shareMessage(d);
   if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
     await navigator.share({title:subject,text:body,files:[file]});
   }else{
     await downloadPDF(d);
     window.location.href='mailto:'+encodeURIComponent(d.client.email||'')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
     toast('Se abrió el correo con el mensaje preparado.');
   }
 }catch(e){console.error(e);toast('No se pudo abrir el correo');}
}

if(!state.toolLists)state.toolLists=[]; if(!state.clients)state.clients=[]; if(!state.products)state.products=[]; if(!state.documents)state.documents=[]; state.view='dashboard';render(); setTimeout(async()=>{if(window.SKCloud){try{if(await window.SKCloud.session()) await syncCloudIntoState(); else updateCloudStatus();}catch(e){console.warn(e);updateCloudStatus();}}},150);

window.editDoc=editDoc;window.previewStored=previewStored;window.showHistoryType=showHistoryType;window.shareByEmail=shareByEmail;window.render=render;

window.returnToDocument=returnToDocument;

window.cloudConfigure=cloudConfigure;window.cloudLogin=cloudLogin;window.cloudSignup=cloudSignup;window.cloudLogout=cloudLogout;window.syncCloudIntoState=syncCloudIntoState;window.updateCloudStatus=updateCloudStatus;

window.tools=tools;window.newToolList=newToolList;window.editToolList=editToolList;window.dltTool=dltTool;window.saveToolList=saveToolList;window.previewToolList=previewToolList;window.removeImage=removeImage;window.editImageText=editImageText;
