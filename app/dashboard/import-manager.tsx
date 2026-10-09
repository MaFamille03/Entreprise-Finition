'use client';
import {useState} from 'react';
export function ImportManager(){const [entity,setEntity]=useState('contacts');const [file,setFile]=useState<File|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function submit(){if(!file)return;setBusy(true);setMessage('');const fd=new FormData();fd.append('file',file);fd.append('entity',entity);const r=await fetch('/api/import',{method:'POST',body:fd});const j=await r.json();setBusy(false);setMessage(r.ok?`${j.imported} ligne(s) importée(s).`:(j.errors?.join(' ')||j.error||'Import impossible.'));}
 return <div className="card"><h3 style={{marginTop:0}}>Import contrôlé</h3><div className="form-grid"><label>Type<select value={entity} onChange={e=>setEntity(e.target.value)}><option value="contacts">Contacts</option><option value="items">Matériaux / consommables</option></select></label><label>Fichier CSV<input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files?.[0]||null)}/></label></div><button className="btn btn-primary" disabled={!file||busy} onClick={submit}>{busy?'Import en cours…':'Importer'}</button>{message&&<p className="muted">{message}</p>}</div>}

