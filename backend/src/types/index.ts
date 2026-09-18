export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  logo_url: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  timezone: string;
  currency: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday... 6=Saturday
  is_open: number; // 1 or 0
  open_time: string; // HH:MM (e.g. "09:00")
  close_time: string; // HH:MM (e.g. "20:00")
  break_start: string | null; // e.g. "13:00"
  break_end: string | null; // e.g. "14:00"
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: number; // 1 or 0
  created_at: string;
  updated_at: string;
  assigned_staff_ids?: string[];
}

export interface Staff {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  profile_photo: string;
  working_days: string; // JSON array of numbers e.g. "[1,2,3,4,5,6]"
  working_hours_start: string; // "10:00"
  working_hours_end: string; // "19:00"
  break_start: string | null;
  break_end: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  assigned_service_ids?: string[];
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  whatsapp_number: string;
  email: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  noshow_bookings: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
export type BookingSource = 'WHATSAPP_AI' | 'ADMIN' | 'MANUAL';

export interface Appointment {
  id: string;
  booking_id: string; // User-friendly ID e.g. "BK1024"
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  price: number;
  status: AppointmentStatus;
  source: BookingSource;
  notes: string;
  noshow_reason: string | null;
  noshow_time: string | null;
  noshow_marked_by: string | null;
  cancelled_at: string | null;
  reminder_24h_sent: number;
  reminder_2h_sent: number;
  created_at: string;
  updated_at: string;
  // Joined details
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  service_name?: string;
  service_duration?: number;
  staff_name?: string;
}

export interface BlockedSlot {
  id: string;
  business_id: string;
  staff_id: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  reason: string;
  created_at: string;
}

export interface Holiday {
  id: string;
  business_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  created_at: string;
}

export interface StaffLeave {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  business_id: string;
  template_type: string; // 'BOOKING_CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_2H' | 'RESCHEDULE' | 'CANCELLATION' | 'COMPLETED' | 'FEEDBACK' | 'NO_SHOW' | 'CUSTOM'
  name: string;
  content: string;
  variables: string; // JSON array of string e.g. '["customer_name", "date"]'
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  business_id: string;
  event_trigger: string; // 'NEW_BOOKING' | 'REMINDER_24H' | 'REMINDER_2H' | 'APPOINTMENT_COMPLETED' | 'APPOINTMENT_CANCELLED'
  template_id: string;
  delay_minutes: number;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  business_id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: 'NEW_BOOKING' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'UPCOMING' | 'NO_SHOW' | 'AUTOMATION_ERROR' | 'WHATSAPP_ERROR' | 'SYSTEM';
  is_read: number;
  data_json: string | null;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  business_id: string;
  customer_id: string | null;
  phone: string;
  direction: 'INBOUND' | 'OUTBOUND';
  message_text: string;
  message_type: string;
  wa_message_id: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  raw_payload: string | null;
  created_at: string;
}

export interface AIAgentConfig {
  id: string;
  business_id: string;
  persona_name: string;
  language: string; // 'Hinglish' | 'Hindi' | 'English'
  tone: string; // 'Friendly' | 'Professional'
  faqs_json: string; // JSON array of { question, answer }
  cancellation_policy: string;
  reschedule_policy: string;
  custom_instructions: string;
  updated_at: string;
}

export interface WhatsAppConfig {
  id: string;
  business_id: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  webhook_verify_token: string;
  is_connected: number;
  updated_at: string;
}

export interface AvailableSlot {
  time: string; // HH:MM (e.g. "10:00")
  formatted_time: string; // e.g. "10:00 AM"
  staff_id: string;
  staff_name: string;
  service_duration: number;
  is_available: boolean;
}
