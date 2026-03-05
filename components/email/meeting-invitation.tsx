'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  HelpCircle,
  Loader2,
  ExternalLink,
  Repeat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseRRule } from '@/lib/ics-parser';

interface MeetingInvitationProps {
  icsContent: string;
  parsedEvent: {
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
      status?: string;
    }>;
    method?: string;
  };
  userEmail: string;
  onRespond: (response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => Promise<void>;
  onAddToCalendar: () => Promise<void>;
}

export function MeetingInvitation({
  icsContent,
  parsedEvent,
  userEmail,
  onRespond,
  onAddToCalendar
}: MeetingInvitationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [responded, setResponded] = useState(false);

  const isInvitation = icsContent.includes('METHOD:REQUEST');
  const isCancellation = icsContent.includes('METHOD:CANCEL');
  
  // Find user's current status
  const userAttendee = parsedEvent.attendees?.find(
    a => a.email.toLowerCase() === userEmail.toLowerCase()
  );
  const currentStatus = userAttendee?.status;

  const handleRespond = async (response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => {
    setIsLoading(true);
    try {
      await onRespond(response);
      setResponded(true);
    } catch (error) {
      console.error('Error responding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCalendar = async () => {
    setIsLoading(true);
    try {
      await onAddToCalendar();
    } catch (error) {
      console.error('Error adding to calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-4 my-4',
        isCancellation
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isCancellation
              ? 'bg-red-100 dark:bg-red-900/40'
              : 'bg-blue-100 dark:bg-blue-900/40'
          )}>
            <Calendar className={cn(
              'w-5 h-5',
              isCancellation ? 'text-red-600' : 'text-blue-600'
            )} />
          </div>
          <div>
            <p className={cn(
              'text-sm font-medium',
              isCancellation ? 'text-red-600' : 'text-blue-600'
            )}>
              {isCancellation ? 'Termin abgesagt' : 'Meeting-Einladung'}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {parsedEvent.summary}
            </h3>
          </div>
        </div>

        {/* Current Status */}
        {currentStatus && currentStatus !== 'NEEDS-ACTION' && (
          <div className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            currentStatus === 'ACCEPTED' && 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
            currentStatus === 'DECLINED' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            currentStatus === 'TENTATIVE' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          )}>
            {currentStatus === 'ACCEPTED' && 'Zugesagt'}
            {currentStatus === 'DECLINED' && 'Abgelehnt'}
            {currentStatus === 'TENTATIVE' && 'Vorläufig'}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        {/* Date/Time */}
        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <Clock className="w-4 h-4 text-gray-500" />
          <div>
            <div>{formatDate(new Date(parsedEvent.dtstart))}</div>
            {!parsedEvent.allDay && (
              <div className="text-sm text-gray-500">
                {formatTime(new Date(parsedEvent.dtstart))}
                {parsedEvent.dtend && (
                  <> – {formatTime(new Date(parsedEvent.dtend))}</>
                )}
              </div>
            )}
            {parsedEvent.allDay && (
              <div className="text-sm text-gray-500">Ganztägig</div>
            )}
          </div>
        </div>

        {/* Recurrence */}
        {parsedEvent.rrule && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Repeat className="w-4 h-4 text-gray-500" />
            <span>{parseRRule(parsedEvent.rrule)}</span>
          </div>
        )}

        {/* Location */}
        {parsedEvent.location && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{parsedEvent.location}</span>
          </div>
        )}

        {/* Organizer */}
        {parsedEvent.organizer && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Users className="w-4 h-4 text-gray-500" />
            <span>
              Organisiert von {parsedEvent.organizer.name || parsedEvent.organizer.email}
            </span>
          </div>
        )}

        {/* Attendees */}
        {parsedEvent.attendees && parsedEvent.attendees.length > 0 && (
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">
                {parsedEvent.attendees.length} Teilnehmer
              </div>
              <div className="flex flex-wrap gap-1">
                {parsedEvent.attendees.slice(0, 5).map((att, i) => (
                  <span
                    key={i}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                      att.status === 'ACCEPTED' && 'bg-green-100 text-green-700',
                      att.status === 'DECLINED' && 'bg-red-100 text-red-700',
                      att.status === 'TENTATIVE' && 'bg-amber-100 text-amber-700',
                      (!att.status || att.status === 'NEEDS-ACTION') && 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {att.status === 'ACCEPTED' && <Check className="w-3 h-3" />}
                    {att.status === 'DECLINED' && <X className="w-3 h-3" />}
                    {att.status === 'TENTATIVE' && <HelpCircle className="w-3 h-3" />}
                    {att.name || att.email.split('@')[0]}
                  </span>
                ))}
                {parsedEvent.attendees.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{parsedEvent.attendees.length - 5} weitere
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {parsedEvent.description && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {parsedEvent.description}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isCancellation && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {isInvitation && !responded && (
            <>
              <Button
                size="sm"
                onClick={() => handleRespond('ACCEPTED')}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Zusagen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond('TENTATIVE')}
                disabled={isLoading}
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Vorläufig
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond('DECLINED')}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Ablehnen
              </Button>
            </>
          )}

          {responded && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Antwort gesendet
            </p>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddToCalendar}
            disabled={isLoading}
            className="ml-auto"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Zum Kalender
          </Button>
        </div>
      )}

      {isCancellation && (
        <div className="pt-3 border-t border-red-200 dark:border-red-700">
          <p className="text-sm text-red-600 dark:text-red-400">
            Dieser Termin wurde vom Organisator abgesagt.
          </p>
        </div>
      )}
    </motion.div>
  );
}
