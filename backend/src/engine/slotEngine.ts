import { db } from '../db/database.js';
import { AvailableSlot, Service, Staff, BusinessHours, Appointment, BlockedSlot, StaffLeave, Holiday } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface SlotEngineParams {
  business_id: string;
  date: string; // YYYY-MM-DD
  service_id: string;
  staff_id?: string;
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isTimeOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

export class SlotEngine {
  /**
   * Calculate all available slots for a given business, date, service, and optional staff.
   */
  public static calculateAvailableSlots(params: SlotEngineParams): AvailableSlot[] {
    const { business_id, date, service_id, staff_id } = params;

    // 1. Fetch Service
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND business_id = ? AND is_active = 1').get(service_id, business_id) as Service | undefined;
    if (!service) {
      return [];
    }

    const duration = service.duration_minutes;

    // 2. Check Business Holiday
    const holiday = db.prepare('SELECT * FROM holidays WHERE business_id = ? AND date = ?').get(business_id, date) as Holiday | undefined;
    if (holiday) {
      return [];
    }

    // 3. Check Day of Week & Business Hours
    const targetDate = new Date(date + 'T00:00:00Z');
    const dayOfWeek = targetDate.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat

    const bizHours = db.prepare('SELECT * FROM business_hours WHERE business_id = ? AND day_of_week = ?').get(business_id, dayOfWeek) as BusinessHours | undefined;
    if (!bizHours || bizHours.is_open === 0) {
      return [];
    }

    const bizOpenMin = parseTimeToMinutes(bizHours.open_time);
    const bizCloseMin = parseTimeToMinutes(bizHours.close_time);
    const bizBreakStartMin = bizHours.break_start ? parseTimeToMinutes(bizHours.break_start) : null;
    const bizBreakEndMin = bizHours.break_end ? parseTimeToMinutes(bizHours.break_end) : null;

    // 4. Find Eligible Staff
    let eligibleStaffList: Staff[] = [];
    if (staff_id) {
      const singleStaff = db.prepare(`
        SELECT s.* FROM staff s
        JOIN staff_services ss ON s.id = ss.staff_id
        WHERE s.id = ? AND s.business_id = ? AND s.is_active = 1 AND ss.service_id = ?
      `).get(staff_id, business_id, service_id) as Staff | undefined;
      if (singleStaff) {
        eligibleStaffList.push(singleStaff);
      }
    } else {
      eligibleStaffList = db.prepare(`
        SELECT s.* FROM staff s
        JOIN staff_services ss ON s.id = ss.staff_id
        WHERE s.business_id = ? AND s.is_active = 1 AND ss.service_id = ?
      `).all(business_id, service_id) as Staff[];
    }

    if (eligibleStaffList.length === 0) {
      return [];
    }

    // 5. Fetch Existing Appointments on this date
    const existingAppts = db.prepare(`
      SELECT * FROM appointments
      WHERE business_id = ? AND date = ? AND status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
    `).all(business_id, date) as Appointment[];

    // 6. Fetch Blocked Slots
    const blockedSlots = db.prepare(`
      SELECT * FROM blocked_slots
      WHERE business_id = ? AND date = ?
    `).all(business_id, date) as BlockedSlot[];

    // 7. Fetch Staff Leaves
    const staffLeaves = db.prepare(`
      SELECT * FROM staff_leaves
      WHERE status = 'APPROVED' AND ? BETWEEN start_date AND end_date
    `).all(date) as StaffLeave[];
    const staffOnLeaveSet = new Set(staffLeaves.map((l) => l.staff_id));

    const candidateSlots: AvailableSlot[] = [];
    const slotStepMinutes = 30; // 30-minute intervals

    for (const member of eligibleStaffList) {
      // Check if staff is on leave
      if (staffOnLeaveSet.has(member.id)) {
        continue;
      }

      // Check working days
      let workingDays: number[] = [1, 2, 3, 4, 5, 6];
      try {
        workingDays = JSON.parse(member.working_days);
      } catch (e) {
        // default
      }
      if (!workingDays.includes(dayOfWeek)) {
        continue;
      }

      const staffStartMin = Math.max(bizOpenMin, parseTimeToMinutes(member.working_hours_start));
      const staffEndMin = Math.min(bizCloseMin, parseTimeToMinutes(member.working_hours_end));

      const staffBreakStartMin = member.break_start ? parseTimeToMinutes(member.break_start) : null;
      const staffBreakEndMin = member.break_end ? parseTimeToMinutes(member.break_end) : null;

      // Iterate possible start times
      for (let cur = staffStartMin; cur + duration <= staffEndMin; cur += slotStepMinutes) {
        const slotStart = cur;
        const slotEnd = cur + duration;

        // Check Business Break overlap
        if (bizBreakStartMin !== null && bizBreakEndMin !== null) {
          if (isTimeOverlapping(slotStart, slotEnd, bizBreakStartMin, bizBreakEndMin)) {
            continue;
          }
        }

        // Check Staff Break overlap
        if (staffBreakStartMin !== null && staffBreakEndMin !== null) {
          if (isTimeOverlapping(slotStart, slotEnd, staffBreakStartMin, staffBreakEndMin)) {
            continue;
          }
        }

        // Check Blocked Slots (all staff or this specific staff)
        const isBlocked = blockedSlots.some((block) => {
          if (!block.staff_id || block.staff_id === member.id) {
            const bStart = parseTimeToMinutes(block.start_time);
            const bEnd = parseTimeToMinutes(block.end_time);
            return isTimeOverlapping(slotStart, slotEnd, bStart, bEnd);
          }
          return false;
        });
        if (isBlocked) continue;

        // Check Existing Appointments for this staff
        const hasConflict = existingAppts.some((appt) => {
          if (appt.staff_id === member.id) {
            const aStart = parseTimeToMinutes(appt.start_time);
            const aEnd = parseTimeToMinutes(appt.end_time);
            return isTimeOverlapping(slotStart, slotEnd, aStart, aEnd);
          }
          return false;
        });
        if (hasConflict) continue;

        const timeStr = minutesToTimeStr(slotStart);
        candidateSlots.push({
          time: timeStr,
          formatted_time: formatTime12h(timeStr),
          staff_id: member.id,
          staff_name: member.name,
          service_duration: duration,
          is_available: true
        });
      }
    }

    // Sort by time ascending
    candidateSlots.sort((a, b) => a.time.localeCompare(b.time));
    return candidateSlots;
  }

  /**
   * Verifies if a specific slot is completely free without conflicts.
   */
  public static isSlotAvailable(
    business_id: string,
    date: string,
    start_time: string,
    end_time: string,
    staff_id: string,
    exclude_appointment_id?: string
  ): boolean {
    const startMin = parseTimeToMinutes(start_time);
    const endMin = parseTimeToMinutes(end_time);

    // Check existing appointments
    let query = `
      SELECT * FROM appointments
      WHERE business_id = ? AND staff_id = ? AND date = ? AND status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
    `;
    const params: any[] = [business_id, staff_id, date];
    if (exclude_appointment_id) {
      query += ` AND id != ?`;
      params.push(exclude_appointment_id);
    }

    const existingAppts = db.prepare(query).all(...params) as Appointment[];
    for (const appt of existingAppts) {
      const aStart = parseTimeToMinutes(appt.start_time);
      const aEnd = parseTimeToMinutes(appt.end_time);
      if (isTimeOverlapping(startMin, endMin, aStart, aEnd)) {
        return false;
      }
    }

    // Check blocked slots
    const blockedSlots = db.prepare(`
      SELECT * FROM blocked_slots
      WHERE business_id = ? AND (staff_id IS NULL OR staff_id = ?) AND date = ?
    `).all(business_id, staff_id, date) as BlockedSlot[];
    for (const block of blockedSlots) {
      const bStart = parseTimeToMinutes(block.start_time);
      const bEnd = parseTimeToMinutes(block.end_time);
      if (isTimeOverlapping(startMin, endMin, bStart, bEnd)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Transaction-safe Booking Execution.
   * Eliminates race conditions and guarantees no double-booking occurs.
   */
  public static createBookingTransaction(data: {
    business_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    service_id: string;
    staff_id?: string;
    date: string;
    start_time: string;
    source?: 'WHATSAPP_AI' | 'ADMIN' | 'MANUAL';
    notes?: string;
  }): Appointment {
    const { business_id, customer_name, customer_phone, customer_email, service_id, date, start_time } = data;
    const source = data.source || 'WHATSAPP_AI';
    const notes = data.notes || '';

    const executeTx = db.transaction(() => {
      // 1. Fetch Service
      const service = db.prepare('SELECT * FROM services WHERE id = ? AND business_id = ?').get(service_id, business_id) as Service | undefined;
      if (!service) {
        throw new Error(`Service not found: ${service_id}`);
      }

      // Calculate end time
      const startMin = parseTimeToMinutes(start_time);
      const endMin = startMin + service.duration_minutes;
      const end_time = minutesToTimeStr(endMin);

      // 2. Determine Staff
      let selectedStaffId = data.staff_id;
      if (!selectedStaffId) {
        const availableSlots = this.calculateAvailableSlots({ business_id, date, service_id });
        const matchingSlot = availableSlots.find((s) => s.time === start_time);
        if (!matchingSlot) {
          throw new Error(`No staff available for slot ${start_time} on date ${date}`);
        }
        selectedStaffId = matchingSlot.staff_id;
      }

      // 3. Atomically Check Slot Availability
      const isAvailable = this.isSlotAvailable(business_id, date, start_time, end_time, selectedStaffId);
      if (!isAvailable) {
        throw new Error(`Slot ${start_time} - ${end_time} on ${date} is already booked or blocked! Double-booking prevented.`);
      }

      // 4. Find or Create Customer
      let customer = db.prepare('SELECT * FROM customers WHERE business_id = ? AND whatsapp_number = ?').get(business_id, customer_phone) as any;
      if (!customer) {
        const newCustomerId = `cust_${uuidv4().substring(0, 8)}`;
        db.prepare(`
          INSERT INTO customers (id, business_id, name, whatsapp_number, email, total_bookings, completed_bookings, cancelled_bookings, noshow_bookings, notes)
          VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, ?)
        `).run(newCustomerId, business_id, customer_name, customer_phone, customer_email || null, 'Auto-created on booking');
        customer = { id: newCustomerId, name: customer_name, whatsapp_number: customer_phone };
      } else {
        // Update customer total bookings count and name if provided
        db.prepare(`
          UPDATE customers
          SET total_bookings = total_bookings + 1,
              name = CASE WHEN ? != '' THEN ? ELSE name END,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(customer_name, customer_name, customer.id);
      }

      // 5. Generate User-friendly Booking ID (e.g. BK1042)
      const countRow = db.prepare('SELECT COUNT(*) as cnt FROM appointments WHERE business_id = ?').get(business_id) as { cnt: number };
      const nextNum = 1000 + (countRow.cnt || 0) + 1;
      const booking_id = `BK${nextNum}`;

      const appointmentId = `appt_${uuidv4().substring(0, 8)}`;

      // 6. Insert Appointment
      db.prepare(`
        INSERT INTO appointments (
          id, booking_id, business_id, customer_id, service_id, staff_id,
          date, start_time, end_time, price, status, source, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
      `).run(
        appointmentId,
        booking_id,
        business_id,
        customer.id,
        service.id,
        selectedStaffId,
        date,
        start_time,
        end_time,
        service.price,
        source,
        notes
      );

      // 7. Create In-App Notification
      db.prepare(`
        INSERT INTO notifications (id, business_id, title, body, type, data_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `notif_${uuidv4().substring(0, 8)}`,
        business_id,
        'New Appointment Booked',
        `${customer_name} booked ${service.name} for ${date} at ${formatTime12h(start_time)} (${booking_id})`,
        'NEW_BOOKING',
        JSON.stringify({ booking_id, appointment_id: appointmentId, customer_id: customer.id })
      );

      // 8. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, business_id, action, entity_type, entity_id, details_json)
        VALUES (?, ?, 'CREATE_APPOINTMENT', 'appointments', ?, ?)
      `).run(
        `audit_${uuidv4().substring(0, 8)}`,
        business_id,
        appointmentId,
        JSON.stringify({ booking_id, date, start_time, end_time, service_name: service.name, source })
      );

      // Retrieve full joined appointment
      const fullAppt = db.prepare(`
        SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone, c.email as customer_email,
               s.name as service_name, s.duration_minutes as service_duration,
               st.name as staff_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        JOIN staff st ON a.staff_id = st.id
        WHERE a.id = ?
      `).get(appointmentId) as Appointment;

      return fullAppt;
    });

    return executeTx();
  }

  /**
   * Reschedule an appointment transaction-safely
   */
  public static rescheduleAppointmentTransaction(data: {
    business_id: string;
    appointment_id: string;
    new_date: string;
    new_start_time: string;
    new_staff_id?: string;
  }): Appointment {
    const { business_id, appointment_id, new_date, new_start_time } = data;

    const executeTx = db.transaction(() => {
      const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND business_id = ?').get(appointment_id, business_id) as Appointment | undefined;
      if (!appt) {
        throw new Error('Appointment not found');
      }

      const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appt.service_id) as Service;
      const targetStaffId = data.new_staff_id || appt.staff_id;
      const startMin = parseTimeToMinutes(new_start_time);
      const endMin = startMin + service.duration_minutes;
      const new_end_time = minutesToTimeStr(endMin);

      // Check slot availability excluding current appointment
      const isFree = this.isSlotAvailable(business_id, new_date, new_start_time, new_end_time, targetStaffId, appointment_id);
      if (!isFree) {
        throw new Error(`Slot ${new_start_time} on ${new_date} is already booked or blocked!`);
      }

      // Update appointment
      db.prepare(`
        UPDATE appointments
        SET date = ?,
            start_time = ?,
            end_time = ?,
            staff_id = ?,
            status = 'RESCHEDULED',
            reminder_24h_sent = 0,
            reminder_2h_sent = 0,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(new_date, new_start_time, new_end_time, targetStaffId, appointment_id);

      // In-app notification
      db.prepare(`
        INSERT INTO notifications (id, business_id, title, body, type, data_json)
        VALUES (?, ?, 'Appointment Rescheduled', ?, 'BOOKING_RESCHEDULED', ?)
      `).run(
        `notif_${uuidv4().substring(0, 8)}`,
        business_id,
        `Booking ${appt.booking_id} rescheduled to ${new_date} at ${formatTime12h(new_start_time)}`,
        JSON.stringify({ booking_id: appt.booking_id, appointment_id })
      );

      return db.prepare(`
        SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone, c.email as customer_email,
               s.name as service_name, s.duration_minutes as service_duration,
               st.name as staff_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        JOIN staff st ON a.staff_id = st.id
        WHERE a.id = ?
      `).get(appointment_id) as Appointment;
    });

    return executeTx();
  }

  /**
   * Cancel an appointment
   */
  public static cancelAppointmentTransaction(data: {
    business_id: string;
    appointment_id: string;
    reason?: string;
  }): Appointment {
    const { business_id, appointment_id, reason } = data;

    const executeTx = db.transaction(() => {
      const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND business_id = ?').get(appointment_id, business_id) as Appointment | undefined;
      if (!appt) {
        throw new Error('Appointment not found');
      }

      db.prepare(`
        UPDATE appointments
        SET status = 'CANCELLED',
            cancelled_at = datetime('now'),
            notes = CASE WHEN ? != '' THEN notes || ' [Cancel Reason: ' || ? || ']' ELSE notes END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(reason || '', reason || '', appointment_id);

      // Update customer stats
      db.prepare(`
        UPDATE customers
        SET cancelled_bookings = cancelled_bookings + 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(appt.customer_id);

      // Notification
      db.prepare(`
        INSERT INTO notifications (id, business_id, title, body, type, data_json)
        VALUES (?, ?, 'Appointment Cancelled', ?, 'BOOKING_CANCELLED', ?)
      `).run(
        `notif_${uuidv4().substring(0, 8)}`,
        business_id,
        `Booking ${appt.booking_id} was cancelled. Slot is now free.`,
        JSON.stringify({ booking_id: appt.booking_id, appointment_id })
      );

      return db.prepare(`
        SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone, c.email as customer_email,
               s.name as service_name, s.duration_minutes as service_duration,
               st.name as staff_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        JOIN staff st ON a.staff_id = st.id
        WHERE a.id = ?
      `).get(appointment_id) as Appointment;
    });

    return executeTx();
  }
}
