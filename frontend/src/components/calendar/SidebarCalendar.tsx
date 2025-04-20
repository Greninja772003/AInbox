import { useState, useEffect } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './calendar.css'; // We'll create this file for custom styling

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  colorId?: string;
}

const SidebarCalendar = ({ collapsed }: { collapsed: boolean }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        setLoading(true);
        const res = await axios.get<GoogleCalendarEvent[]>('http://localhost:5000/api/calendar/events', {
          withCredentials: true
        });
        setEvents(res.data.map((event: GoogleCalendarEvent) => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date || '',
          end: event.end.dateTime || event.end.date || '',
          allDay: !event.start.dateTime,
          backgroundColor: getEventColor(event)
        })));
        setError(null);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
        setError('Failed to load calendar events');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarEvents();
  }, []);

  // Assign different colors to different event types
  const getEventColor = (event: GoogleCalendarEvent): string => {
    // You can customize this based on event properties
    if (event.colorId === '1') return '#4285F4'; // Blue
    if (event.colorId === '2') return '#EA4335'; // Red
    if (event.colorId === '3') return '#FBBC04'; // Yellow
    if (event.colorId === '4') return '#34A853'; // Green
    return '#039BE5'; // Default blue
  };

  // Show mini preview when collapsed
  if (collapsed) {
    return (
      <div className="px-3 my-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center p-2"
          title="Calendar"
        >
          <Calendar size={20} />
        </Button>
      </div>
    );
  }

  // Show either collapsed or expanded calendar
  return (
    <div className="px-3 my-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Calendar size={16} className="mr-2" />
          <h3 className="text-sm font-medium">Calendar</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '−' : '+'}
        </Button>
      </div>

      {expanded ? (
        <Card className="mb-3 overflow-hidden">
          <CardContent className="p-1">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <span className="text-xs text-gray-500">Loading calendar...</span>
              </div>
            ) : error ? (
              <div className="h-[200px] flex items-center justify-center">
                <span className="text-xs text-red-500">{error}</span>
              </div>
            ) : (
              <div className="sidebar-calendar-container">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridWeek"
                  headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: ''
                  }}
                  height="auto"
                  contentHeight={180}
                  events={events}
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                  }}
                  dayHeaderFormat={{ weekday: 'short' }}
                  eventDisplay="block"
                  dayMaxEventRows={1}
                  moreLinkClick="popover"
                  slotEventOverlap={false}
                  viewClassNames="sidebar-calendar-view"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-3">
          <CardContent className="p-2">
            {loading ? (
              <div className="h-[80px] flex items-center justify-center">
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            ) : error ? (
              <div className="h-[80px] flex items-center justify-center">
                <span className="text-xs text-red-500">Error loading calendar</span>
              </div>
            ) : events.length > 0 ? (
              <div className="text-xs">
                <p className="font-medium mb-1">Upcoming events:</p>
                <ul className="space-y-1">
                  {events.slice(0, 2).map(event => (
                    <li key={event.id} className="truncate">
                      <span 
                        className="w-2 h-2 inline-block rounded-full mr-1"
                        style={{ backgroundColor: event.backgroundColor }} 
                      />
                      {event.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="h-[80px] flex items-center justify-center">
                <span className="text-xs text-gray-500">No upcoming events</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SidebarCalendar; 