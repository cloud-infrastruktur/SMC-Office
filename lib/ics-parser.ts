/**
 * ICS/iCalendar Parser & Generator
 * Parst ICS-Dateien aus E-Mail-Anhängen und generiert ICS für Export
 */

export interface ICSEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Date;
  dtend?: Date;
  allDay: boolean;
  rrule?: string;
  organizer?: {
    email: string;
    name?: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
    status?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS-ACTION';
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR';
  }>;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  sequence?: number;
  method?: 'REQUEST' | 'REPLY' | 'CANCEL' | 'PUBLISH';
}

/**
 * Parse ICS content string into events
 */
export function parseICS(icsContent: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const lines = unfoldLines(icsContent);
  
  let currentEvent: Partial<ICSEvent> | null = null;
  let inEvent = false;
  let globalMethod: string | undefined;
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':');
    const keyParts = key.split(';');
    const mainKey = keyParts[0].toUpperCase();
    
    if (mainKey === 'METHOD') {
      globalMethod = value.toUpperCase() as ICSEvent['method'];
    }
    
    if (mainKey === 'BEGIN' && value.toUpperCase() === 'VEVENT') {
      inEvent = true;
      currentEvent = { method: globalMethod as ICSEvent['method'] };
      continue;
    }
    
    if (mainKey === 'END' && value.toUpperCase() === 'VEVENT') {
      inEvent = false;
      if (currentEvent && currentEvent.uid && currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as ICSEvent);
      }
      currentEvent = null;
      continue;
    }
    
    if (!inEvent || !currentEvent) continue;
    
    switch (mainKey) {
      case 'UID':
        currentEvent.uid = value;
        break;
        
      case 'SUMMARY':
        currentEvent.summary = unescapeICS(value);
        break;
        
      case 'DESCRIPTION':
        currentEvent.description = unescapeICS(value);
        break;
        
      case 'LOCATION':
        currentEvent.location = unescapeICS(value);
        break;
        
      case 'DTSTART':
        const startResult = parseDateTime(key, value);
        currentEvent.dtstart = startResult.date;
        currentEvent.allDay = startResult.allDay;
        break;
        
      case 'DTEND':
        currentEvent.dtend = parseDateTime(key, value).date;
        break;
        
      case 'RRULE':
        currentEvent.rrule = value;
        break;
        
      case 'STATUS':
        currentEvent.status = value.toUpperCase() as ICSEvent['status'];
        break;
        
      case 'SEQUENCE':
        currentEvent.sequence = parseInt(value, 10);
        break;
        
      case 'ORGANIZER':
        const orgParams = parseParams(keyParts.slice(1));
        currentEvent.organizer = {
          email: value.replace(/^mailto:/i, ''),
          name: orgParams['CN']
        };
        break;
        
      case 'ATTENDEE':
        const attParams = parseParams(keyParts.slice(1));
        if (!currentEvent.attendees) currentEvent.attendees = [];
        currentEvent.attendees.push({
          email: value.replace(/^mailto:/i, ''),
          name: attParams['CN'],
          status: (attParams['PARTSTAT'] || 'NEEDS-ACTION') as any,
          role: (attParams['ROLE'] || 'REQ-PARTICIPANT') as any
        });
        break;
    }
  }
  
  return events;
}

/**
 * Generate ICS content from event data
 */
export function generateICS(events: ICSEvent[], method: 'PUBLISH' | 'REQUEST' | 'REPLY' | 'CANCEL' = 'PUBLISH'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SMC-CRM//Calendar//DE',
    `METHOD:${method}`,
    'CALSCALE:GREGORIAN'
  ];
  
  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatDateTime(new Date())}`);
    
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(event.dtstart)}`);
      if (event.dtend) {
        lines.push(`DTEND;VALUE=DATE:${formatDate(event.dtend)}`);
      }
    } else {
      lines.push(`DTSTART:${formatDateTime(event.dtstart)}`);
      if (event.dtend) {
        lines.push(`DTEND:${formatDateTime(event.dtend)}`);
      }
    }
    
    lines.push(`SUMMARY:${escapeICS(event.summary)}`);
    
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }
    
    if (event.location) {
      lines.push(`LOCATION:${escapeICS(event.location)}`);
    }
    
    if (event.rrule) {
      lines.push(`RRULE:${event.rrule}`);
    }
    
    if (event.status) {
      lines.push(`STATUS:${event.status}`);
    }
    
    if (event.organizer) {
      const orgLine = event.organizer.name 
        ? `ORGANIZER;CN=${escapeICS(event.organizer.name)}:mailto:${event.organizer.email}`
        : `ORGANIZER:mailto:${event.organizer.email}`;
      lines.push(orgLine);
    }
    
    if (event.attendees) {
      for (const att of event.attendees) {
        let attLine = 'ATTENDEE';
        if (att.name) attLine += `;CN=${escapeICS(att.name)}`;
        if (att.role) attLine += `;ROLE=${att.role}`;
        if (att.status) attLine += `;PARTSTAT=${att.status}`;
        attLine += `:mailto:${att.email}`;
        lines.push(attLine);
      }
    }
    
    lines.push('END:VEVENT');
  }
  
  lines.push('END:VCALENDAR');
  
  return foldLines(lines.join('\r\n'));
}

/**
 * Generate REPLY ICS for meeting response
 */
export function generateReply(
  originalEvent: ICSEvent,
  userEmail: string,
  userName: string,
  response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
): string {
  const replyEvent: ICSEvent = {
    ...originalEvent,
    attendees: [{
      email: userEmail,
      name: userName,
      status: response,
      role: 'REQ-PARTICIPANT'
    }],
    sequence: (originalEvent.sequence || 0) + 1
  };
  
  return generateICS([replyEvent], 'REPLY');
}

// Helper functions

function unfoldLines(content: string): string[] {
  // ICS line folding: lines starting with space/tab are continuations
  return content
    .replace(/\r\n[ \t]/g, '')
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => line.trim());
}

function foldLines(content: string): string {
  // Fold lines longer than 75 chars
  return content.split('\r\n').map(line => {
    if (line.length <= 75) return line;
    const parts: string[] = [];
    for (let i = 0; i < line.length; i += 74) {
      parts.push(i === 0 ? line.slice(i, i + 75) : ' ' + line.slice(i, i + 74));
    }
    return parts.join('\r\n');
  }).join('\r\n');
}

function parseDateTime(key: string, value: string): { date: Date; allDay: boolean } {
  const isAllDay = key.includes('VALUE=DATE') && !key.includes('VALUE=DATE-TIME');
  
  let dateStr = value;
  let date: Date;
  
  if (isAllDay || value.length === 8) {
    // YYYYMMDD
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1;
    const day = parseInt(dateStr.slice(6, 8), 10);
    date = new Date(year, month, day);
    return { date, allDay: true };
  }
  
  // YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = parseInt(dateStr.slice(6, 8), 10);
  const hour = parseInt(dateStr.slice(9, 11), 10);
  const minute = parseInt(dateStr.slice(11, 13), 10);
  const second = parseInt(dateStr.slice(13, 15), 10) || 0;
  
  if (dateStr.endsWith('Z')) {
    date = new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    date = new Date(year, month, day, hour, minute, second);
  }
  
  return { date, allDay: false };
}

function formatDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function parseParams(parts: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of parts) {
    const [key, ...vals] = part.split('=');
    params[key.toUpperCase()] = vals.join('=').replace(/^"|"$/g, '');
  }
  return params;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Parse RRULE string to human readable format (German)
 */
export function parseRRule(rrule: string): string {
  if (!rrule) return '';
  
  const parts = rrule.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  const freq = parts['FREQ'];
  const interval = parseInt(parts['INTERVAL'] || '1', 10);
  const until = parts['UNTIL'];
  const count = parts['COUNT'];
  const byday = parts['BYDAY'];
  
  const dayNames: Record<string, string> = {
    'MO': 'Mo', 'TU': 'Di', 'WE': 'Mi', 'TH': 'Do', 'FR': 'Fr', 'SA': 'Sa', 'SU': 'So'
  };
  
  let text = '';
  
  switch (freq) {
    case 'DAILY':
      text = interval === 1 ? 'Täglich' : `Alle ${interval} Tage`;
      break;
    case 'WEEKLY':
      text = interval === 1 ? 'Wöchentlich' : `Alle ${interval} Wochen`;
      if (byday) {
        const days = byday.split(',').map(d => dayNames[d] || d).join(', ');
        text += ` (${days})`;
      }
      break;
    case 'MONTHLY':
      text = interval === 1 ? 'Monatlich' : `Alle ${interval} Monate`;
      break;
    case 'YEARLY':
      text = interval === 1 ? 'Jährlich' : `Alle ${interval} Jahre`;
      break;
    default:
      text = rrule;
  }
  
  if (until) {
    const untilDate = parseDateTime('', until).date;
    text += ` bis ${untilDate.toLocaleDateString('de-DE')}`;
  } else if (count) {
    text += `, ${count} mal`;
  }
  
  return text;
}

/**
 * Generate RRULE from user-friendly options
 */
export function generateRRule(options: {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  until?: Date;
  count?: number;
  byDay?: string[]; // ['MO', 'WE', 'FR']
}): string {
  const parts = [`FREQ=${options.frequency}`];
  
  if (options.interval && options.interval > 1) {
    parts.push(`INTERVAL=${options.interval}`);
  }
  
  if (options.byDay && options.byDay.length > 0) {
    parts.push(`BYDAY=${options.byDay.join(',')}`);
  }
  
  if (options.until) {
    parts.push(`UNTIL=${formatDateTime(options.until)}`);
  } else if (options.count) {
    parts.push(`COUNT=${options.count}`);
  }
  
  return parts.join(';');
}

/**
 * Check if ICS content is a meeting invitation
 */
export function isMeetingInvitation(icsContent: string): boolean {
  return icsContent.includes('METHOD:REQUEST') || 
         icsContent.includes('METHOD:CANCEL');
}

/**
 * Check if ICS content is a meeting reply
 */
export function isMeetingReply(icsContent: string): boolean {
  return icsContent.includes('METHOD:REPLY');
}
