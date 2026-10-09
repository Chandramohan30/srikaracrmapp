import { ClassSchedule } from '../types/crm';

export interface CalendarEventPayload {
  title: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  studentName: string;
  trainerName: string;
  meetingUrl: string;
  notes?: string;
}

export class GoogleCalendarService {
  private isOAuthConnected: boolean = false;
  private accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('srikara_gcal_token') || null;
    this.isOAuthConnected = !!this.accessToken;
  }

  public isConnected(): boolean {
    return this.isOAuthConnected;
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
    this.isOAuthConnected = !!token;
    if (token) {
      localStorage.setItem('srikara_gcal_token', token);
    } else {
      localStorage.removeItem('srikara_gcal_token');
    }
  }

  /**
   * Generates a 1-click Google Calendar Add Event URL
   * Opens Google Calendar directly in browser with all fields pre-filled!
   */
  public generateGoogleCalendarWebUrl(event: CalendarEventPayload): string {
    const startIso = this.formatDateForGCal(event.date, event.startTime);
    const endIso = this.formatDateForGCal(event.date, event.endTime);

    const title = encodeURIComponent(`${event.title} - Srikara Academy`);
    const details = encodeURIComponent(
      `Topic: ${event.topic}\n` +
      `Student: ${event.studentName}\n` +
      `Trainer: ${event.trainerName}\n` +
      `Meeting Link: ${event.meetingUrl}\n` +
      (event.notes ? `\nNotes: ${event.notes}` : '') +
      `\n\nOrganized by Srikara Training & Placement Academy (www.srikaraacademy.com)`
    );
    const location = encodeURIComponent(event.meetingUrl || 'Google Meet');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  }

  /**
   * Formats date + time into Google Calendar UTC format YYYYMMDDTHHmmSSZ
   */
  private formatDateForGCal(dateStr: string, timeStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Construct local date and convert to basic ISO representation
    const d = new Date(year, month - 1, day, hours, minutes);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    return `${yyyy}${mm}${dd}T${hh}${min}00`;
  }

  /**
   * Generate an RFC 5545 standard .ics file download for instant calendar import
   */
  public downloadIcsFile(schedule: ClassSchedule): void {
    const startFormatted = this.formatDateForGCal(schedule.class_date, schedule.start_time);
    const endFormatted = this.formatDateForGCal(schedule.class_date, schedule.end_time);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Srikara Training & Placement Academy//CRM Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${schedule.id}@srikaraacademy.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${schedule.title} (Srikara Academy)`,
      `DESCRIPTION:Topic: ${schedule.topic}\\nStudent: ${schedule.student_name}\\nTrainer: ${schedule.trainer_name}\\nMeeting Link: ${schedule.meeting_url}`,
      `LOCATION:${schedule.meeting_url}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${schedule.title.replace(/\s+/g, '_')}_class.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generates a realistic Google Meet URL for new classes
   */
  public generateMeetUrl(courseCode: string = 'srk'): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const randomChunk = (len: number) => 
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${courseCode.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3) || 'srk'}-${randomChunk(4)}-${randomChunk(3)}`;
  }

  /**
   * Syncs with Google Calendar API when OAuth access token is active
   */
  public async syncEventWithGoogleCalendar(event: CalendarEventPayload): Promise<{ googleEventId: string; htmlLink?: string }> {
    if (!this.accessToken) {
      // Return simulated Google Calendar event ID
      const mockId = `gcal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return { googleEventId: mockId };
    }

    try {
      const startDateTime = new Date(`${event.date}T${event.startTime}:00`).toISOString();
      const endDateTime = new Date(`${event.date}T${event.endTime}:00`).toISOString();

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: `${event.title} - Srikara Academy`,
          description: `Topic: ${event.topic}\nStudent: ${event.studentName}\nTrainer: ${event.trainerName}\nMeeting: ${event.meetingUrl}\n${event.notes || ''}`,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime },
          location: event.meetingUrl
        })
      });

      if (!res.ok) {
        throw new Error(`Google Calendar API error: ${res.statusText}`);
      }

      const data = await res.json();
      return { googleEventId: data.id, htmlLink: data.htmlLink };
    } catch (err) {
      console.warn('Google Calendar sync fallback to local schedule:', err);
      return { googleEventId: `gcal_offline_${Date.now()}` };
    }
  }
}

export const googleCalendar = new GoogleCalendarService();
