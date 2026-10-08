import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase-server';
export async function GET(){const supabase=await createClient(); const {data,error}=await supabase.from('profiles').select('role,full_name,company_id,companies(name)').single(); if(error||!data) return NextResponse.json({error:'unauthorized'},{status:401}); const company = Array.isArray(data.companies) ? data.companies[0] : data.companies; return NextResponse.json({...data, company_name: company?.name ?? ''});}
