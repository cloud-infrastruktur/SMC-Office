import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Geschützte Admin-Routen - ohne Anmeldung Weiterleitung zu /login
const PROTECTED_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/filemanager',
  '/admin/content',
  '/admin/crm',
  '/admin/settings',
  '/admin/users',
  '/admin/mail',
  '/admin/calendar',
  '/admin/notes',
  '/downloads',
  '/customer-references',
];

// Öffentliche Routen die keine Auth benötigen
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/api/auth',
  '/',
  '/about',
  '/contact',
  '/competencies',
  '/projects',
  '/references',
  '/trainings',
  '/impressum',
  '/datenschutz',
  '/search',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // API-Routen durchlassen (werden separat geschützt)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Statische Assets durchlassen
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Dateien wie .png, .jpg, .css, .js
  ) {
    return NextResponse.next();
  }
  
  // Prüfen ob Route geschützt ist
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Token prüfen - versuche beide Cookie-Namen (Dev und Prod)
  let token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Falls kein Token gefunden, versuche explizit den Development-Cookie-Namen
  if (!token) {
    token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
    });
  }
  
  // Nicht eingeloggt -> Redirect zu Login mit callbackUrl
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Admin-Routen erfordern admin/manager Rolle
  if (pathname.startsWith('/admin')) {
    const userRole = (token as any)?.role?.toLowerCase();
    const allowedRoles = ['admin', 'manager'];
    
    if (!allowedRoles.includes(userRole)) {
      // Keine Berechtigung -> Redirect zur Startseite
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  // Customer-References erfordert spezielle Rollen
  if (pathname.startsWith('/customer-references')) {
    const userRole = (token as any)?.role?.toLowerCase();
    const allowedRoles = ['consultant', 'customer_ref', 'manager', 'admin'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match alle Routen außer:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
