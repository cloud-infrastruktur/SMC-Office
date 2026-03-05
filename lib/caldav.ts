/**
 * CalDAV Client für Apple iCloud Calendar
 * Unterstützt CalDAV-Operationen für Event-Synchronisation
 */

import { parseICS, generateICS, ICSEvent } from './ics-parser';

export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  calendarPath?: string;
}

export interface CalDAVCalendar {
  href: string;
  displayName: string;
  color?: string;
  ctag?: string;
}

export interface CalDAVEvent {
  href: string;
  etag: string;
  data: ICSEvent;
}

/**
 * Apple iCloud CalDAV URLs
 */
export const CALDAV_PROVIDERS = {
  APPLE: {
    name: 'Apple iCloud',
    serverUrl: 'https://caldav.icloud.com/',
    principalPath: '/[user_id]/principal/',
    helpUrl: 'https://support.apple.com/de-de/HT204283'
  },
  NEXTCLOUD: {
    name: 'Nextcloud',
    serverUrl: '', // User provides
    principalPath: '/remote.php/dav/principals/users/[username]/',
    helpUrl: ''
  },
  GOOGLE: {
    name: 'Google Calendar',
    serverUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
    principalPath: '/user/[email]/calendars/',
    helpUrl: ''
  }
};

/**
 * CalDAV Client Class
 */
export class CalDAVClient {
  private config: CalDAVConfig;
  private authHeader: string;

  constructor(config: CalDAVConfig) {
    this.config = config;
    this.authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
  }

  /**
   * Make CalDAV request
   */
  private async request(
    method: string,
    path: string,
    body?: string,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; headers: Headers; body: string }> {
    const url = path.startsWith('http') ? path : `${this.config.serverUrl}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        ...headers
      },
      body
    });

    const responseBody = await response.text();
    
    return {
      status: response.status,
      headers: response.headers,
      body: responseBody
    };
  }

  /**
   * Test connection and credentials
   */
  async testConnection(): Promise<{ success: boolean; error?: string; principalUrl?: string }> {
    try {
      const response = await this.request('PROPFIND', '/', `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>`, {
        'Depth': '0'
      });

      if (response.status === 401) {
        return { success: false, error: 'Ungültige Anmeldedaten' };
      }

      if (response.status !== 207) {
        return { success: false, error: `Server-Fehler: ${response.status}` };
      }

      // Extract principal URL from response
      const principalMatch = response.body.match(/<[^:]*:href[^>]*>([^<]+)<\/[^:]*:href>/i);
      const principalUrl = principalMatch ? principalMatch[1] : undefined;

      return { success: true, principalUrl };
    } catch (error: any) {
      return { success: false, error: error.message || 'Verbindungsfehler' };
    }
  }

  /**
   * Discover calendars for user
   */
  async discoverCalendars(): Promise<CalDAVCalendar[]> {
    const calendars: CalDAVCalendar[] = [];
    
    try {
      // First, get principal URL
      const testResult = await this.testConnection();
      if (!testResult.success || !testResult.principalUrl) {
        return calendars;
      }

      // Get calendar home
      const homeResponse = await this.request('PROPFIND', testResult.principalUrl, `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>`, {
        'Depth': '0'
      });

      const homeMatch = homeResponse.body.match(/<[^:]*:calendar-home-set[^>]*>[\s\S]*?<[^:]*:href[^>]*>([^<]+)/i);
      const homeUrl = homeMatch ? homeMatch[1] : null;

      if (!homeUrl) return calendars;

      // List calendars
      const listResponse = await this.request('PROPFIND', homeUrl, `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
    <C:supported-calendar-component-set/>
    <A:calendar-color/>
    <D:getctag xmlns:D="http://calendarserver.org/ns/"/>
  </D:prop>
</D:propfind>`, {
        'Depth': '1'
      });

      // Parse calendar list (simplified)
      const responses = listResponse.body.split('<d:response>').slice(1);
      
      for (const resp of responses) {
        const hrefMatch = resp.match(/<d:href[^>]*>([^<]+)/i);
        const nameMatch = resp.match(/<d:displayname[^>]*>([^<]+)/i);
        const colorMatch = resp.match(/<a:calendar-color[^>]*>([^<]+)/i);
        const isCalendar = resp.includes('calendar') && resp.includes('VEVENT');
        
        if (hrefMatch && nameMatch && isCalendar) {
          calendars.push({
            href: hrefMatch[1],
            displayName: nameMatch[1],
            color: colorMatch ? colorMatch[1] : undefined
          });
        }
      }
    } catch (error) {
      console.error('Error discovering calendars:', error);
    }

    return calendars;
  }

  /**
   * Fetch events from calendar
   */
  async getEvents(
    calendarPath: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalDAVEvent[]> {
    const events: CalDAVEvent[] = [];
    
    const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    try {
      const response = await this.request('REPORT', calendarPath, `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startStr}" end="${endStr}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`, {
        'Depth': '1'
      });

      // Parse response
      const responses = response.body.split(/<[dD]:response>/i).slice(1);
      
      for (const resp of responses) {
        const hrefMatch = resp.match(/<[dD]:href[^>]*>([^<]+)/i);
        const etagMatch = resp.match(/<[dD]:getetag[^>]*>"?([^"<]+)"?</i);
        const dataMatch = resp.match(/<[cC]:calendar-data[^>]*>([\s\S]*?)<\/[cC]:calendar-data>/i);
        
        if (hrefMatch && etagMatch && dataMatch) {
          const icsData = dataMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
          
          const parsedEvents = parseICS(icsData);
          
          for (const evt of parsedEvents) {
            events.push({
              href: hrefMatch[1],
              etag: etagMatch[1],
              data: evt
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }

    return events;
  }

  /**
   * Create event on calendar
   */
  async createEvent(
    calendarPath: string,
    event: ICSEvent
  ): Promise<{ success: boolean; href?: string; etag?: string; error?: string }> {
    try {
      const eventPath = `${calendarPath}${event.uid}.ics`;
      const icsContent = generateICS([event]);

      const response = await this.request('PUT', eventPath, icsContent, {
        'Content-Type': 'text/calendar; charset=utf-8',
        'If-None-Match': '*'
      });

      if (response.status === 201 || response.status === 204) {
        const etag = response.headers.get('ETag') || '';
        return { success: true, href: eventPath, etag };
      }

      return { success: false, error: `Fehler beim Erstellen: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update event on calendar
   */
  async updateEvent(
    eventPath: string,
    event: ICSEvent,
    etag?: string
  ): Promise<{ success: boolean; etag?: string; error?: string }> {
    try {
      const icsContent = generateICS([event]);
      const headers: Record<string, string> = {
        'Content-Type': 'text/calendar; charset=utf-8'
      };
      
      if (etag) {
        headers['If-Match'] = etag;
      }

      const response = await this.request('PUT', eventPath, icsContent, headers);

      if (response.status === 204 || response.status === 201) {
        const newEtag = response.headers.get('ETag') || '';
        return { success: true, etag: newEtag };
      }

      if (response.status === 412) {
        return { success: false, error: 'Event wurde zwischenzeitlich geändert' };
      }

      return { success: false, error: `Fehler beim Aktualisieren: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete event from calendar
   */
  async deleteEvent(
    eventPath: string,
    etag?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers: Record<string, string> = {};
      
      if (etag) {
        headers['If-Match'] = etag;
      }

      const response = await this.request('DELETE', eventPath, undefined, headers);

      if (response.status === 204 || response.status === 200) {
        return { success: true };
      }

      return { success: false, error: `Fehler beim Löschen: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create CalDAV client for provider
 */
export function createCalDAVClient(
  provider: 'APPLE' | 'NEXTCLOUD' | 'GOOGLE' | 'CALDAV_GENERIC',
  credentials: { username: string; password: string; serverUrl?: string }
): CalDAVClient {
  let serverUrl = credentials.serverUrl || '';
  
  switch (provider) {
    case 'APPLE':
      serverUrl = CALDAV_PROVIDERS.APPLE.serverUrl;
      break;
    case 'GOOGLE':
      serverUrl = CALDAV_PROVIDERS.GOOGLE.serverUrl;
      break;
    case 'NEXTCLOUD':
      // User must provide server URL
      break;
  }
  
  return new CalDAVClient({
    serverUrl,
    username: credentials.username,
    password: credentials.password
  });
}
