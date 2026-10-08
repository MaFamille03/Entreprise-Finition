import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
export async function GET(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Non authentifié'},{status:401});
 const {data:profile}=await supabase.from('profiles').select('company_id').eq('id',user.id).single(); if(!profile?.company_id)return NextResponse.json({error:'Entreprise non configurée'},{status:400});
 const [sales,purchases,financial,stock,projects]=await Promise.all([
  supabase.from('company_sales_summary').select('*').maybeSingle(),supabase.from('company_purchase_summary').select('*').maybeSingle(),supabase.from('company_financial_summary').select('*').maybeSingle(),supabase.from('company_stock_summary').select('*').maybeSingle(),supabase.from('project_financial_summary').select('*').order('margin',{ascending:false})
 ]);
 const err=[sales,purchases,financial,stock,projects].find(x=>x.error); if(err?.error)return NextResponse.json({error:err.error.message},{status:400});
 return NextResponse.json({sales:sales.data,purchases:purchases.data,financial:financial.data,stock:stock.data,projects:projects.data||[]});
}
