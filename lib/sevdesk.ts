// SevDesk API Client
import { prisma } from './db';

export interface SevdeskDocumentFolder {
  id: string;
  objectName: string;
  create: string;
  update: string;
  name: string;
  status: string;
  parent: {
    id: string;
    objectName: string;
  } | null;
}

export interface SevdeskDocument {
  id: string;
  objectName: string;
  create: string;
  update: string;
  filename: string;
  status: string;
  extension: string;
  folder: {
    id: string;
    objectName: string;
  } | null;
}

export interface SevdeskApiResponse<T> {
  objects: T[];
}

export interface SevdeskSingleResponse<T> {
  objects: T;
}

export class SevdeskClient {
  private baseUrl = 'https://my.sevdesk.de/api/v1';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SevDesk API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Get all folders
  async getFolders(): Promise<SevdeskDocumentFolder[]> {
    const result = await this.request<SevdeskApiResponse<SevdeskDocumentFolder>>('/DocumentFolder');
    return result.objects || [];
  }

  // Get subfolders of a parent folder
  async getSubfolders(parentId: string): Promise<SevdeskDocumentFolder[]> {
    const result = await this.request<SevdeskApiResponse<SevdeskDocumentFolder>>(
      `/DocumentFolder?parent[id]=${parentId}&parent[objectName]=DocumentFolder`
    );
    return result.objects || [];
  }

  // Create a new folder
  async createFolder(name: string, parentId: string): Promise<SevdeskDocumentFolder> {
    const result = await this.request<SevdeskSingleResponse<SevdeskDocumentFolder>>('/DocumentFolder', {
      method: 'POST',
      body: JSON.stringify({
        name,
        parent: {
          id: parentId,
          objectName: 'DocumentFolder'
        }
      }),
    });
    return result.objects;
  }

  // Upload a document to a folder
  async uploadDocument(file: Buffer, filename: string, folderId: string): Promise<SevdeskDocument> {
    // SevDesk uses multipart form data for file uploads
    const formData = new FormData();
    const blob = new Blob([file], { type: 'application/octet-stream' });
    formData.append('file', blob, filename);
    formData.append('folder[id]', folderId);
    formData.append('folder[objectName]', 'DocumentFolder');

    const response = await fetch(`${this.baseUrl}/Document/Factory/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiToken,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SevDesk Upload Error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result.objects;
  }

  // Health check
  async checkConnection(): Promise<boolean> {
    try {
      await this.request('/DocumentFolder?limit=1');
      return true;
    } catch {
      return false;
    }
  }
}

// Get SevDesk client from database config
export async function getSevdeskClient(): Promise<SevdeskClient | null> {
  const config = await prisma.sevdeskConfig.findFirst({
    where: { isActive: true },
  });

  if (!config) {
    return null;
  }

  return new SevdeskClient(config.apiToken);
}

// Get SevDesk config
export async function getSevdeskConfig() {
  return prisma.sevdeskConfig.findFirst({
    where: { isActive: true },
  });
}

// Save or update SevDesk config
export async function saveSevdeskConfig(apiToken: string, parentFolderId: string = '22128948') {
  // Deactivate all existing configs
  await prisma.sevdeskConfig.updateMany({
    data: { isActive: false },
  });

  // Create new active config
  return prisma.sevdeskConfig.create({
    data: {
      apiToken,
      parentFolderId,
      isActive: true,
    },
  });
}

// Smart Suggest: Parse tag and find matching folder name
export function suggestFolderName(tag: string): string[] {
  // Parse tag format "SV-MM.YYYY" (e.g., "SV-01.2026")
  const match = tag.match(/^SV-(\d{2})\.(\d{4})$/);
  if (!match) return [];

  const month = parseInt(match[1], 10);
  const year = match[2];

  const monthNames: Record<number, string[]> = {
    1: ['Januar', 'Jan', '01'],
    2: ['Februar', 'Feb', '02'],
    3: ['März', 'Mar', '03'],
    4: ['April', 'Apr', '04'],
    5: ['Mai', 'May', '05'],
    6: ['Juni', 'Jun', '06'],
    7: ['Juli', 'Jul', '07'],
    8: ['August', 'Aug', '08'],
    9: ['September', 'Sep', '09'],
    10: ['Oktober', 'Okt', 'Oct', '10'],
    11: ['November', 'Nov', '11'],
    12: ['Dezember', 'Dez', 'Dec', '12'],
  };

  const monthVariants = monthNames[month] || [];
  const suggestions: string[] = [];

  // Generate possible folder name patterns
  for (const m of monthVariants) {
    suggestions.push(`${year}-${m.padStart(2, '0')}`); // 2026-01
    suggestions.push(`${m} ${year}`);                   // Januar 2026
    suggestions.push(`${m}-${year}`);                   // Januar-2026
    suggestions.push(`${year}_${m.padStart(2, '0')}`); // 2026_01
  }

  return [...new Set(suggestions)]; // Remove duplicates
}

// Find best matching folder from suggestions
export function findMatchingFolder(
  folders: SevdeskDocumentFolder[],
  suggestions: string[]
): SevdeskDocumentFolder | null {
  for (const suggestion of suggestions) {
    const found = folders.find(f => 
      f.name.toLowerCase().includes(suggestion.toLowerCase()) ||
      suggestion.toLowerCase().includes(f.name.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// Generate direct link to SevDesk folder
export function getSevdeskFolderUrl(folderId: string): string {
  return `https://my.sevdesk.de/dms/folder/${folderId}`;
}
