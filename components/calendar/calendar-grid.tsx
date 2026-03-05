'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Repeat,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color?: string;
  isRecurring?: boolean;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  responseStatus?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS_ACTION';
  contact?: { id: string; firstName: string; lastName: string };
  deal?: { id: string; title: string };
  project?: { id: string; title: string };
}

interface CalendarGridProps {
  events: CalendarEvent[];
  view: CalendarView;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, hour?: number) => void;
  onCreateClick: () => void;
}

const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export function CalendarGrid({
  events,
  view,
  selectedDate,
  onDateChange,
  onViewChange,
  onEventClick,
  onSlotClick,
  onCreateClick
}: CalendarGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Navigation
  const navigatePrev = () => {
    const newDate = new Date(selectedDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToToday = () => onDateChange(new Date());

  // Title based on view
  const title = useMemo(() => {
    if (view === 'month') {
      return `${MONTHS_DE[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else if (view === 'week') {
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getDate()}. - ${weekEnd.getDate()}. ${MONTHS_DE[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
      }
      return `${weekStart.getDate()}. ${MONTHS_DE[weekStart.getMonth()].slice(0, 3)} - ${weekEnd.getDate()}. ${MONTHS_DE[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;
    } else if (view === 'day') {
      return `${WEEKDAYS_DE[getWeekdayIndex(selectedDate)]}, ${selectedDate.getDate()}. ${MONTHS_DE[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    return 'Agenda';
  }, [view, selectedDate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
          <Button variant="ghost" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                )}
              >
                {v === 'month' ? 'Monat' : v === 'week' ? 'Woche' : v === 'day' ? 'Tag' : 'Agenda'}
              </button>
            ))}
          </div>

          <Button onClick={onCreateClick} className="gap-1">
            <Plus className="w-4 h-4" />
            Termin
          </Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-auto">
        {view === 'month' && (
          <MonthView
            selectedDate={selectedDate}
            events={events}
            today={today}
            onDateClick={(date) => {
              onDateChange(date);
              onViewChange('day');
            }}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {view === 'week' && (
          <WeekView
            selectedDate={selectedDate}
            events={events}
            today={today}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {view === 'day' && (
          <DayView
            selectedDate={selectedDate}
            events={events}
            today={today}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {view === 'agenda' && (
          <AgendaView
            events={events}
            onEventClick={onEventClick}
          />
        )}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  selectedDate,
  events,
  today,
  onDateClick,
  onEventClick,
  onSlotClick
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  today: Date;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const result: Date[] = [];
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Start from Monday
    const startDay = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDay.setDate(startDay.getDate() - offset);
    
    // 6 weeks
    for (let i = 0; i < 42; i++) {
      result.push(new Date(startDay));
      startDay.setDate(startDay.getDate() + 1);
    }
    
    return result;
  }, [selectedDate]);

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="h-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700">
        {WEEKDAYS_DE.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 h-[calc(100%-2.5rem)]">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
          const isToday = day.toDateString() === today.toDateString();
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={index}
              onClick={() => onSlotClick(day)}
              className={cn(
                'min-h-[100px] p-1 border-b border-r border-gray-100 dark:border-slate-800 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-gray-50 dark:bg-slate-900/50',
                'hover:bg-blue-50 dark:hover:bg-slate-800'
              )}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick(day);
                }}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium cursor-pointer mb-1',
                  isToday
                    ? 'bg-blue-600 text-white'
                    : isCurrentMonth
                    ? 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
                    : 'text-gray-400 dark:text-gray-600'
                )}
              >
                {day.getDate()}
              </div>

              {/* Events */}
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80',
                      event.status === 'CANCELLED' && 'line-through opacity-60'
                    )}
                    style={{ backgroundColor: event.color || '#3b82f6', color: 'white' }}
                  >
                    {!event.allDay && (
                      <span className="mr-1 opacity-75">
                        {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    +{dayEvents.length - 3} weitere
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  selectedDate,
  events,
  today,
  onEventClick,
  onSlotClick
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  today: Date;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, hour?: number) => void;
}) {
  const weekStart = getWeekStart(selectedDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with dates */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="w-16 flex-shrink-0" />
        {weekDays.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div
              key={i}
              className="flex-1 py-2 text-center border-l border-gray-100 dark:border-slate-800"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {WEEKDAYS_DE[i]}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isToday ? 'text-blue-600' : 'text-gray-900 dark:text-white'
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="flex h-12 border-b border-gray-100 dark:border-slate-800">
              <div className="w-16 flex-shrink-0 text-right pr-2 text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  onClick={() => {
                    const clickDate = new Date(day);
                    clickDate.setHours(hour);
                    onSlotClick(clickDate, hour);
                  }}
                  className="flex-1 border-l border-gray-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                />
              ))}
            </div>
          ))}

          {/* Events overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="flex h-full">
              <div className="w-16 flex-shrink-0" />
              {weekDays.map((day, dayIndex) => {
                const dayEvents = getEventsForDay(day).filter(e => !e.allDay);
                return (
                  <div key={dayIndex} className="flex-1 relative">
                    {dayEvents.map((event) => {
                      const startHour = new Date(event.start).getHours();
                      const startMin = new Date(event.start).getMinutes();
                      const endDate = event.end ? new Date(event.end) : new Date(event.start);
                      endDate.setHours(endDate.getHours() + 1);
                      const duration = (endDate.getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="absolute left-1 right-1 rounded px-1 py-0.5 text-xs text-white overflow-hidden pointer-events-auto cursor-pointer hover:opacity-90"
                          style={{
                            top: `${(startHour + startMin / 60) * 48}px`,
                            height: `${Math.max(duration * 48 - 2, 20)}px`,
                            backgroundColor: event.color || '#3b82f6'
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          {duration > 0.5 && (
                            <div className="opacity-75 truncate">
                              {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  selectedDate,
  events,
  today,
  onEventClick,
  onSlotClick
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  today: Date;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, hour?: number) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isToday = selectedDate.toDateString() === today.toDateString();
  
  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  const allDayEvents = dayEvents.filter(e => e.allDay);
  const timedEvents = dayEvents.filter(e => !e.allDay);

  return (
    <div className="flex flex-col h-full">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ganztägig</div>
          <div className="space-y-1">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="px-2 py-1 rounded text-sm text-white cursor-pointer hover:opacity-90"
                style={{ backgroundColor: event.color || '#3b82f6' }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="flex h-16 border-b border-gray-100 dark:border-slate-800">
              <div className="w-20 flex-shrink-0 text-right pr-3 text-sm text-gray-500 dark:text-gray-400 -mt-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div
                onClick={() => {
                  const clickDate = new Date(selectedDate);
                  clickDate.setHours(hour);
                  onSlotClick(clickDate, hour);
                }}
                className="flex-1 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
              />
            </div>
          ))}

          {/* Events overlay */}
          <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
            {timedEvents.map((event) => {
              const startHour = new Date(event.start).getHours();
              const startMin = new Date(event.start).getMinutes();
              const endDate = event.end ? new Date(event.end) : new Date(event.start);
              endDate.setHours(endDate.getHours() + 1);
              const duration = (endDate.getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
              
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute left-2 right-2 rounded p-2 text-white overflow-hidden pointer-events-auto cursor-pointer hover:opacity-90"
                  style={{
                    top: `${(startHour + startMin / 60) * 64}px`,
                    height: `${Math.max(duration * 64 - 4, 28)}px`,
                    backgroundColor: event.color || '#3b82f6'
                  }}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm opacity-75 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    {event.end && (
                      <> - {new Date(event.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </div>
                  {event.location && duration > 1 && (
                    <div className="text-sm opacity-75 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current time indicator */}
          {isToday && (
            <div
              className="absolute left-20 right-0 h-0.5 bg-red-500 z-10"
              style={{
                top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 64}px`
              }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 -mt-0.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Agenda View Component
function AgendaView({
  events,
  onEventClick
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    // Sort events by start date
    const sorted = [...events].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    
    for (const event of sorted) {
      const dateKey = new Date(event.start).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    }
    
    return groups;
  }, [events]);

  const dateKeys = Object.keys(groupedEvents);

  if (dateKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <CalendarIcon className="w-12 h-12 mb-2 opacity-50" />
        <p>Keine Termine im ausgewählten Zeitraum</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {dateKeys.map((dateKey) => {
        const date = new Date(dateKey);
        const dayEvents = groupedEvents[dateKey];
        const isToday = date.toDateString() === new Date().toDateString();
        
        return (
          <div key={dateKey}>
            <div className={cn(
              'sticky top-0 bg-white dark:bg-slate-900 py-2 mb-2 border-b border-gray-200 dark:border-slate-700',
              isToday && 'border-blue-500'
            )}>
              <h3 className={cn(
                'font-semibold',
                isToday ? 'text-blue-600' : 'text-gray-900 dark:text-white'
              )}>
                {isToday && <span className="mr-2">Heute •</span>}
                {WEEKDAYS_DE[getWeekdayIndex(date)]}, {date.getDate()}. {MONTHS_DE[date.getMonth()]} {date.getFullYear()}
              </h3>
            </div>
            
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onEventClick(event)}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  {/* Time indicator */}
                  <div
                    className="w-1 self-stretch rounded-full"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={cn(
                        'font-medium text-gray-900 dark:text-white truncate',
                        event.status === 'CANCELLED' && 'line-through opacity-60'
                      )}>
                        {event.title}
                      </h4>
                      {event.isRecurring && <Repeat className="w-3 h-3 text-gray-400" />}
                      {event.responseStatus === 'NEEDS_ACTION' && (
                        <HelpCircle className="w-4 h-4 text-amber-500" />
                      )}
                      {event.responseStatus === 'ACCEPTED' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {event.responseStatus === 'DECLINED' && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.allDay ? (
                          'Ganztägig'
                        ) : (
                          <>
                            {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            {event.end && (
                              <> - {new Date(event.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</>
                            )}
                          </>
                        )}
                      </span>
                      
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                      
                      {event.contact && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.contact.firstName} {event.contact.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekdayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
