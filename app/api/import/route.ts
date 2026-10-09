import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

function parseCsv(text:string){
  const rows:string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i]; if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[];}else cell+=c;}
  if(cell.length||row.length){row.push(cell.trim());if(row.some(Boolean))rows.push(row);} return rows;
}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

export async function POST(request:Request){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Non authentifié'},{status:401});
  const {data:profile}=await supabase.from('profiles').select('company_id').eq('id',user.id).single();
  if(!profile?.company_id)return NextResponse.json({error:'Entreprise non configurée'},{status:400});
  const form=await request.formData(); const file=form.get('file'); const entity=String(form.get('entity')||'contacts');
  if(!(file instanceof File))return NextResponse.json({error:'Fichier manquant'},{status:400});
  if(!['contacts','items'].includes(entity))return NextResponse.json({error:'Import supporté: contacts ou items'},{status:400});
  const rows=parseCsv(await file.text()); if(rows.length<2)return NextResponse.json({error:'CSV vide ou sans lignes de données'},{status:400});
  const headers=rows[0].map(normalize); const data=rows.slice(1).filter(r=>r.some(Boolean));
  const values=data.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  const errors:string[]=[];
  if(entity==='contacts'){
    const allowed=['client','prospect','supplier','provider','subcontractor','other'];
    const payload=values.map((v:any,i)=>{const type=(v.type||v.typedecontact||'client').toLowerCase(); if(!v.name&&!v.nom)errors.push(`Ligne ${i+2}: nom manquant`); if(!allowed.includes(type))errors.push(`Ligne ${i+2}: type invalide`); return {company_id:profile.company_id,name:String(v.name||v.nom||'').trim(),type,phone:v.phone||v.telephone||null,email:v.email||null,address:v.address||v.adresse||null,city:v.city||v.ville||null,tax_id:v.taxid||v.identifiantfiscal||null,credit_limit:Number(v.creditlimit||v.limitedecredit||0)||0};});
    if(errors.length)return NextResponse.json({imported:0,errors},{status:422});
    const {error}=await supabase.from('contacts').insert(payload); if(error)return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({imported:payload.length,errors:[]});
  }
  const payload=values.map((v:any,i)=>{const name=v.name||v.nom||v.designation; if(!name)errors.push(`Ligne ${i+2}: désignation manquante`); const requestedType=String(v.itemtype||v.type||'material').toLowerCase(); const itemType=['material','product','service'].includes(requestedType)?requestedType:'material'; return {company_id:profile.company_id,name:String(name||'').trim(),sku:v.sku||v.reference||null,item_type:itemType,unit:v.unit||v.unite||'pcs',purchase_price:Number(v.purchaseprice||v.prixachat||0)||0,sale_price:Number(v.saleprice||v.prixvente||0)||0,vat_rate:Number(v.vatrate||v.tva||18)||18,stock_quantity:Number(v.stockquantity||v.stockinitial||0)||0,min_stock_quantity:Number(v.minstockquantity||v.stockminimum||0)||0,is_stockable:itemType!=='service'};});
  if(errors.length)return NextResponse.json({imported:0,errors},{status:422});
  const {error}=await supabase.from('items').insert(payload); if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({imported:payload.length,errors:[]});
}
