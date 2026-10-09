import React from 'react';
import { 
  Calendar, ExternalLink, Download, CheckCircle, Video, 
  Clock, User, BookOpen, Sparkles, RefreshCw 
} from 'lucide-react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { googleCalendar } from '../services/calendarService';

export const GoogleCalendarView: React.FC = () => {
  const { currentUser } = useAuth();
  const schedules = db.getSchedules(currentUser.role, currentUser.id);

  return (
    <div className="space-y-6">
      {/* Integration Status Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Google Calendar & Google Meet Integration
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Synced
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-way training calendar sync for Srikara Training & Placement Academy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Google Calendar Web
            </a>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">Instant Web Event Sync</span>
            <span className="text-slate-500">Every scheduled class includes a 1-click Google Calendar add link with pre-filled title, topic, time, and location.</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">Auto Google Meet Links</span>
            <span className="text-slate-500">Video conferencing links are auto-formatted for each class session so trainers and students connect seamlessly.</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">iCalendar (.ics) Export</span>
            <span className="text-slate-500">Supports universal RFC 5545 calendar import into Google Calendar, Apple Calendar, and Outlook.</span>
          </div>
        </div>
      </div>

      {/* Syncable Calendar Events Roster */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Synchronized Class Events ({schedules.length})
          </span>
          <span className="text-slate-500 font-mono">
            Timezone: Asia/Kolkata (IST)
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {schedules.map((sch) => {
            const gcalUrl = googleCalendar.generateGoogleCalendarWebUrl({
              title: sch.title,
              topic: sch.topic,
              date: sch.class_date,
              startTime: sch.start_time,
              endTime: sch.end_time,
              studentName: sch.student_name,
              trainerName: sch.trainer_name,
              meetingUrl: sch.meeting_url,
              notes: sch.notes
            });

            return (
              <div key={sch.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {sch.class_date} · {sch.start_time} - {sch.end_time}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {sch.title}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">
                    Topic: {sch.topic}
                  </p>
                  <div className="flex items-center gap-4 text-slate-500 text-[11px] pt-1">
                    <span>Student: <strong className="text-slate-800">{sch.student_name}</strong></span>
                    <span>Trainer: <strong className="text-slate-800">{sch.trainer_name}</strong></span>
                    <span>Meet: <strong className="text-blue-600 font-mono">{sch.meeting_url}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={gcalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Open in Google Calendar
                  </a>

                  <button
                    onClick={() => googleCalendar.downloadIcsFile(sch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .ics
                  </button>

                  <a
                    href={sch.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                    title="Launch Google Meet"
                  >
                    <Video className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
