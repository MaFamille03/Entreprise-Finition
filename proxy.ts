import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: cookies => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) }
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && !path.startsWith('/login')) return NextResponse.redirect(new URL('/login', request.url));
  if (user && path.startsWith('/login')) return NextResponse.redirect(new URL('/dashboard', request.url));
  if (user && !path.startsWith('/onboarding')) {
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
    if (!profile?.company_id) return NextResponse.redirect(new URL('/onboarding', request.url));
  }
  return response;
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
