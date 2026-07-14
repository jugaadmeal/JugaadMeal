'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { ArrowLeft, Upload, CheckCircle2, Loader2, Sparkles, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Lecture {
  day: string;
  period: string;
  block: string;
  room: string;
  timeSlot: string;
}

export default function TimetableManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [uploading, setUploading] = useState(false);
  const [timetableParsed, setTimetableParsed] = useState(false);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const saved = localStorage.getItem('ce_timetable');
    if (saved) {
      setLectures(JSON.parse(saved));
      setTimetableParsed(true);
    }
  }, [isAuthenticated, router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);

    // Simulate OCR delay (Tesseract/Google Vision API simulation)
    setTimeout(() => {
      setUploading(false);
      setTimetableParsed(true);
      const parsedLectures = [
        { day: 'Monday', period: 'Period 3', block: 'CSE Block', room: 'Room 201', timeSlot: '10:30 AM - 12:00 PM' },
        { day: 'Tuesday', period: 'Period 2', block: 'Block A', room: 'Room 105', timeSlot: '09:00 AM - 10:30 AM' },
        { day: 'Wednesday', period: 'Period 4', block: 'CSE Block', room: 'Room 304', timeSlot: '12:00 PM - 01:30 PM' },
        { day: 'Thursday', period: 'Period 3', block: 'Block B', room: 'Room 210', timeSlot: '10:30 AM - 12:00 PM' },
        { day: 'Friday', period: 'Period 5', block: 'Food Court', room: 'First Floor', timeSlot: '01:30 PM - 03:00 PM' },
      ];
      setLectures(parsedLectures);
      localStorage.setItem('ce_timetable', JSON.stringify(parsedLectures));

      confetti({
        particleCount: 80,
        spread: 55,
      });
    }, 2500);
  };

  return (
    <div className="space-y-8 pb-20 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/profile')} className="text-text-muted hover:text-text-primary p-2 border border-edge bg-white rounded-xl shadow-sm transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-secondary tracking-tight">Smart Timetable</h1>
          <p className="text-xs text-text-muted">Extract lecture coordinates to auto-complete delivery blocks.</p>
        </div>
      </div>

      {/* Main Drag & Drop Form */}
      <div className="bg-white border border-edge p-6 rounded-2xl shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-secondary">Upload Schedule PDF / Photo</h3>
        
        {!timetableParsed ? (
          <div className="border-2 border-dashed border-edge rounded-xl p-10 text-center space-y-4 hover:border-primary/50 transition-colors relative cursor-pointer">
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="space-y-3">
                <Loader2 size={36} className="text-primary animate-spin mx-auto" />
                <h4 className="font-bold text-secondary text-sm">Analyzing Timetable</h4>
                <p className="text-[11px] text-text-muted">Invoking OCR engine parser...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-orange-50 text-primary rounded-full flex items-center justify-center mx-auto">
                  <Upload size={22} />
                </div>
                <h4 className="font-bold text-secondary text-sm">Select files or drag & drop</h4>
                <p className="text-[10px] text-text-muted">Supports JPEG, PNG, or PDF up to 4MB.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-green-800">Timetable Extracted Successfully!</h4>
              <p className="text-[10px] text-green-700 leading-relaxed">
                Parsed 5 recurring lecture slots. Smart coordinates will be automatically suggested at menu checkout periods.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Auto-fill Toggle Preferences */}
      {timetableParsed && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white border border-edge p-4 rounded-xl shadow-sm text-xs font-semibold">
            <div>
              <h4 className="text-secondary font-bold">Auto-suggest location at checkout</h4>
              <p className="text-[10px] text-text-muted mt-0.5 font-medium">Fills room coordinates matching active lecture periods.</p>
            </div>
            <input
              type="checkbox"
              checked={autoFillEnabled}
              onChange={(e) => setAutoFillEnabled(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </div>

          {/* List of parsed schedules */}
          <div className="bg-white border border-edge p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Extracted Lecture Map</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100">
                <Sparkles size={10} />
                OCR Parsed
              </span>
            </div>

            <div className="divide-y divide-edge text-xs font-semibold text-text-muted">
              {lectures.map((lec, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-secondary">{lec.day} • {lec.period}</h4>
                    <p className="text-[10px] text-text-muted">{lec.timeSlot}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-surface-dark px-3 py-1.5 rounded-lg border border-edge">
                    <MapPin size={12} className="text-primary" />
                    <span className="text-[10px] font-extrabold text-secondary">{lec.block} ({lec.room})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
