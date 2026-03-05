// Paperless-ngx API Client
import { prisma } from './db';

export interface PaperlessDocument {
  id: number;
  title: string;
  correspondent: number | null;
  document_type: number | null;
  tags: number[];
  created: string | null;
  added: string;
  archive_serial_number: number | null;
  original_file_name: string;
  content?: string;
}

export interface PaperlessCorrespondent {
  id: number;
  name: string;
  slug: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
}

export interface PaperlessDocumentType {
  id: number;
  name: string;
  slug: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
}

export interface PaperlessTag {
  id: number;
  name: string;
  slug: string;
  color: string;
  text_color: string;
  is_inbox_tag: boolean;
  document_count: number;
}

export interface PaperlessApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class PaperlessClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiToken = apiToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Paperless API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Documents
  async getDocuments(params?: {
    correspondent?: number;
    document_type?: number;
    tags__id__all?: number[];
    search?: string;
    page?: number;
    page_size?: number;
    ordering?: string;
  }): Promise<PaperlessApiResponse<PaperlessDocument>> {
    const searchParams = new URLSearchParams();
    if (params?.correspondent) searchParams.set('correspondent__id', params.correspondent.toString());
    if (params?.document_type) searchParams.set('document_type__id', params.document_type.toString());
    if (params?.tags__id__all) params.tags__id__all.forEach(t => searchParams.append('tags__id__all', t.toString()));
    if (params?.search) searchParams.set('query', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    
    const query = searchParams.toString();
    return this.request<PaperlessApiResponse<PaperlessDocument>>(`/documents/${query ? `?${query}` : ''}`);
  }

  async getDocument(id: number): Promise<PaperlessDocument> {
    return this.request<PaperlessDocument>(`/documents/${id}/`);
  }

  async getDocumentThumbnail(id: number): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/api/documents/${id}/thumb/`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${this.apiToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  async downloadDocument(id: number): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/api/documents/${id}/download/`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${this.apiToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  // Correspondents
  async getCorrespondents(): Promise<PaperlessApiResponse<PaperlessCorrespondent>> {
    return this.request<PaperlessApiResponse<PaperlessCorrespondent>>('/correspondents/?page_size=1000');
  }

  async getCorrespondent(id: number): Promise<PaperlessCorrespondent> {
    return this.request<PaperlessCorrespondent>(`/correspondents/${id}/`);
  }

  // Document Types
  async getDocumentTypes(): Promise<PaperlessApiResponse<PaperlessDocumentType>> {
    return this.request<PaperlessApiResponse<PaperlessDocumentType>>('/document_types/?page_size=1000');
  }

  // Tags
  async getTags(): Promise<PaperlessApiResponse<PaperlessTag>> {
    return this.request<PaperlessApiResponse<PaperlessTag>>('/tags/?page_size=1000');
  }

  // Get documents by tag names (for SevDesk integration)
  async getDocumentsByTags(tagNames: string[]): Promise<Array<{
    id: number;
    title: string;
    correspondent?: { name: string } | null;
    document_type?: { name: string } | null;
    tags?: Array<{ name: string }>;
    created?: string;
    added?: string;
  }>> {
    // First, get all tags to find IDs by name
    const tagsResponse = await this.getTags();
    const tagMap = new Map(tagsResponse.results.map(t => [t.name.toLowerCase(), t.id]));
    
    // Find tag IDs for the requested tag names
    const tagIds: number[] = [];
    for (const name of tagNames) {
      const id = tagMap.get(name.toLowerCase());
      if (id) tagIds.push(id);
    }
    
    if (tagIds.length === 0) {
      return [];
    }
    
    // Get documents with these tags
    const docsResponse = await this.getDocuments({
      tags__id__all: tagIds,
      page_size: 500,
      ordering: '-created',
    });
    
    // Get correspondents and document types for enrichment
    const [correspondentsRes, docTypesRes] = await Promise.all([
      this.getCorrespondents(),
      this.getDocumentTypes(),
    ]);
    
    const correspondentMap = new Map(correspondentsRes.results.map(c => [c.id, c.name]));
    const docTypeMap = new Map(docTypesRes.results.map(d => [d.id, d.name]));
    const allTagsMap = new Map(tagsResponse.results.map(t => [t.id, t.name]));
    
    // Enrich documents with names instead of IDs
    return docsResponse.results.map(doc => ({
      id: doc.id,
      title: doc.title,
      correspondent: doc.correspondent ? { name: correspondentMap.get(doc.correspondent) || 'Unknown' } : null,
      document_type: doc.document_type ? { name: docTypeMap.get(doc.document_type) || 'Unknown' } : null,
      tags: doc.tags.map(tid => ({ name: allTagsMap.get(tid) || 'Unknown' })),
      created: doc.created || undefined,
      added: doc.added,
    }));
  }

  // Health check
  async checkConnection(): Promise<boolean> {
    try {
      await this.request('/documents/?page_size=1');
      return true;
    } catch {
      return false;
    }
  }
}

// Get Paperless client from database config
export async function getPaperlessClient(): Promise<PaperlessClient | null> {
  const config = await prisma.paperlessConfig.findFirst({
    where: { isActive: true },
  });

  if (!config) {
    return null;
  }

  return new PaperlessClient(config.baseUrl, config.apiToken);
}

// Get Paperless config
export async function getPaperlessConfig() {
  return prisma.paperlessConfig.findFirst({
    where: { isActive: true },
  });
}

// Save or update Paperless config
export async function savePaperlessConfig(baseUrl: string, apiToken: string) {
  // Deactivate all existing configs
  await prisma.paperlessConfig.updateMany({
    data: { isActive: false },
  });

  // Create new active config
  return prisma.paperlessConfig.create({
    data: {
      baseUrl,
      apiToken,
      isActive: true,
    },
  });
}
