// API Route: Global Search (Volltext)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SearchResult {
  type: 'project' | 'reference' | 'training' | 'competency' | 'page' | 'client';
  id: string;
  title: string;
  description: string;
  url: string;
  highlights?: string[];
  matchedFields?: string[];
}

// Hilfsfunktion für Text-Highlighting
function highlightMatch(text: string, query: string, maxLength: number = 150): string {
  if (!text) return '';
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  // Kontext um das Match herum extrahieren
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 60);
  let excerpt = text.substring(start, end);
  
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt;
}

// Prüfen ob ein Feld den Suchbegriff enthält
function matchesQuery(value: string | null | undefined, query: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(query.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], message: 'Mindestens 2 Zeichen erforderlich' });
    }

    // Session prüfen für erweiterte Suche
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.toLowerCase();
    const canSearchClients = session && ['consultant', 'customer_ref', 'manager', 'admin'].includes(userRole);

    const results: SearchResult[] = [];

    // ========================================
    // PROJEKTE DURCHSUCHEN
    // ========================================
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { client: { contains: query, mode: 'insensitive' } },
          { role: { contains: query, mode: 'insensitive' } },
          { objective: { contains: query, mode: 'insensitive' } },
          { technologies: { hasSome: [query] } },
        ],
      },
      take: 15,
      orderBy: { projectNumber: 'desc' },
    });

    projects.forEach(p => {
      const matchedFields: string[] = [];
      if (matchesQuery(p.title, query)) matchedFields.push('Titel');
      if (matchesQuery(p.client, query)) matchedFields.push('Kunde');
      if (matchesQuery(p.role, query)) matchedFields.push('Rolle');
      if (matchesQuery(p.objective, query)) matchedFields.push('Ziel');
      
      results.push({
        type: 'project',
        id: p.id,
        title: p.title,
        description: highlightMatch(`${p.role} bei ${p.client} - ${p.objective || ''}`, query),
        url: `/projects/${p.id}`,
        highlights: p.technologies?.slice(0, 3) || [],
        matchedFields,
      });
    });

    // ========================================
    // REFERENZEN DURCHSUCHEN
    // ========================================
    const references = await prisma.reference.findMany({
      where: {
        OR: [
          { client: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } },
          { role: { contains: query, mode: 'insensitive' } },
          { period: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 15,
    });

    references.forEach(r => {
      const matchedFields: string[] = [];
      if (matchesQuery(r.client, query)) matchedFields.push('Kunde');
      if (matchesQuery(r.industry, query)) matchedFields.push('Branche');
      if (matchesQuery(r.role, query)) matchedFields.push('Rolle');
      
      results.push({
        type: 'reference',
        id: r.id,
        title: r.client,
        description: highlightMatch(`${r.industry} - ${r.role || ''} (${r.period || ''})`, query),
        url: '/references',
        matchedFields,
      });
    });

    // ========================================
    // TRAININGS DURCHSUCHEN
    // ========================================
    const trainings = await prisma.training.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { provider: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 15,
    });

    trainings.forEach(t => {
      const matchedFields: string[] = [];
      if (matchesQuery(t.title, query)) matchedFields.push('Titel');
      if (matchesQuery(t.provider, query)) matchedFields.push('Anbieter');
      if (matchesQuery(t.category, query)) matchedFields.push('Kategorie');
      
      results.push({
        type: 'training',
        id: t.id,
        title: t.title,
        description: highlightMatch(`${t.provider} - ${t.category}${t.description ? ': ' + t.description : ''}`, query),
        url: '/trainings',
        matchedFields,
      });
    });

    // ========================================
    // KOMPETENZEN DURCHSUCHEN
    // ========================================
    const competencies = await prisma.competency.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 15,
    });

    competencies.forEach(c => {
      const matchedFields: string[] = [];
      if (matchesQuery(c.title, query)) matchedFields.push('Titel');
      if (matchesQuery(c.description, query)) matchedFields.push('Beschreibung');
      if (matchesQuery(c.category, query)) matchedFields.push('Kategorie');
      
      results.push({
        type: 'competency',
        id: c.id,
        title: c.title,
        description: highlightMatch(c.description || c.category || '', query),
        url: '/competencies',
        matchedFields,
      });
    });

    // ========================================
    // CLIENTS DURCHSUCHEN (nur für berechtigte User)
    // ========================================
    if (canSearchClients) {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { anonymizedName: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 15,
      });

      clients.forEach(c => {
        const matchedFields: string[] = [];
        if (matchesQuery(c.name, query)) matchedFields.push('Name');
        if (matchesQuery(c.anonymizedName, query)) matchedFields.push('Anonymisiert');
        if (matchesQuery(c.industry, query)) matchedFields.push('Branche');
        if (matchesQuery(c.description, query)) matchedFields.push('Beschreibung');
        
        results.push({
          type: 'client',
          id: c.id,
          title: c.name,
          description: highlightMatch(`${c.industry || ''} - ${c.anonymizedName || ''}`, query),
          url: '/admin/clients',
          matchedFields,
        });
      });
    }

    // ========================================
    // STATISCHE SEITEN DURCHSUCHEN
    // ========================================
    const staticPages = [
      { name: 'Unternehmen', url: '/', keywords: ['smc', 'schwarz', 'management', 'consulting', 'it', 'beratung', 'home', 'startseite', 'unternehmen', 'firma'] },
      { name: 'Über mich', url: '/about', keywords: ['thomas', 'schwarz', 'profil', 'erfahrung', 'karriere', 'vita', 'lebenslauf', 'über', 'person', 'berater'] },
      { name: 'Kompetenzen', url: '/competencies', keywords: ['kompetenz', 'fähigkeit', 'skill', 'itsm', 'itil', 'service', 'management', 'prozess'] },
      { name: 'Projekterfahrungen', url: '/projects', keywords: ['projekt', 'erfahrung', 'referenz', 'kunde', 'einsatz', 'auftrag'] },
      { name: 'Referenz-Kunden', url: '/references', keywords: ['referenz', 'kunde', 'branche', 'industrie', 'partner'] },
      { name: 'Zertifikate & Trainings', url: '/trainings', keywords: ['zertifikat', 'training', 'weiterbildung', 'schulung', 'itil', 'cobit', 'prince2'] },
      { name: 'Verfügbarkeit', url: '/availability', keywords: ['verfügbar', 'frei', 'projekt', 'tagessatz', 'einsatz', 'kapazität', 'zeit'] },
      { name: 'Kontakt', url: '/contact', keywords: ['kontakt', 'email', 'telefon', 'anfrage', 'nachricht', 'schreiben', 'anrufen'] },
      { name: 'Downloads', url: '/downloads', keywords: ['download', 'datei', 'profil', 'pdf', 'dokument', 'herunterladen'] },
    ];

    staticPages.forEach(page => {
      if (
        page.name.toLowerCase().includes(query) ||
        page.keywords.some(k => k.includes(query))
      ) {
        const matchingKeywords = page.keywords.filter(k => k.includes(query));
        results.push({
          type: 'page',
          id: page.url,
          title: page.name,
          description: `Seite: ${page.name}`,
          url: page.url,
          highlights: matchingKeywords.slice(0, 3),
        });
      }
    });

    // ========================================
    // SORTIERUNG & RELEVANZ
    // ========================================
    // Priorisierung: Exakte Matches > Titel-Matches > Andere
    results.sort((a, b) => {
      // Seiten zuerst bei exaktem Match
      const aExactTitle = a.title.toLowerCase() === query;
      const bExactTitle = b.title.toLowerCase() === query;
      if (aExactTitle && !bExactTitle) return -1;
      if (bExactTitle && !aExactTitle) return 1;
      
      // Titel-Matches vor anderen
      const aTitleMatch = a.title.toLowerCase().includes(query);
      const bTitleMatch = b.title.toLowerCase().includes(query);
      if (aTitleMatch && !bTitleMatch) return -1;
      if (bTitleMatch && !aTitleMatch) return 1;
      
      // Seiten-Typ bevorzugen bei gleichem Match-Level
      if (a.type === 'page' && b.type !== 'page') return -1;
      if (b.type === 'page' && a.type !== 'page') return 1;
      
      return 0;
    });

    return NextResponse.json({
      results: results.slice(0, 25),
      total: results.length,
      query,
      canSearchClients: !!canSearchClients,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Suche fehlgeschlagen', results: [] },
      { status: 500 }
    );
  }
}
