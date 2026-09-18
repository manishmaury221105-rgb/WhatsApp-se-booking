class UserModel {
  final String id;
  final String email;
  final String name;
  final String role; // 'ADMIN' | 'STAFF'
  final String? phone;
  final String businessId;
  final String businessName;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.phone,
    required this.businessId,
    required this.businessName,
  });

  bool get isAdmin => role.toUpperCase() == 'ADMIN';
  bool get isStaff => role.toUpperCase() == 'STAFF';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? 'STAFF',
      phone: json['phone'],
      businessId: json['business_id'] ?? '',
      businessName: json['business_name'] ?? 'Luxe Studio',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'role': role,
    'phone': phone,
    'business_id': businessId,
    'business_name': businessName,
  };
}

class DashboardStatsModel {
  final int todayAppointments;
  final int upcomingAppointments;
  final int pending;
  final int confirmed;
  final int completed;
  final int cancelled;
  final int noShow;
  final int totalCustomers;
  final double totalRevenue;

  DashboardStatsModel({
    required this.todayAppointments,
    required this.upcomingAppointments,
    required this.pending,
    required this.confirmed,
    required this.completed,
    required this.cancelled,
    required this.noShow,
    required this.totalCustomers,
    required this.totalRevenue,
  });

  factory DashboardStatsModel.fromJson(Map<String, dynamic> json) {
    return DashboardStatsModel(
      todayAppointments: json['today_appointments'] ?? 0,
      upcomingAppointments: json['upcoming_appointments'] ?? 0,
      pending: json['pending'] ?? 0,
      confirmed: json['confirmed'] ?? 0,
      completed: json['completed'] ?? 0,
      cancelled: json['cancelled'] ?? 0,
      noShow: json['no_show'] ?? 0,
      totalCustomers: json['total_customers'] ?? 0,
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class AppointmentModel {
  final String id;
  final String bookingId;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String serviceId;
  final String serviceName;
  final int serviceDuration;
  final String staffId;
  final String staffName;
  final String date;
  final String startTime;
  final String endTime;
  final String formattedStartTime;
  final String formattedEndTime;
  final double price;
  final String status; // 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED'
  final String source; // 'WHATSAPP_AI' | 'ADMIN' | 'MANUAL'
  final String? notes;
  final String? noshowReason;
  final String currency;

  AppointmentModel({
    required this.id,
    required this.bookingId,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    required this.serviceId,
    required this.serviceName,
    required this.serviceDuration,
    required this.staffId,
    required this.staffName,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.formattedStartTime,
    required this.formattedEndTime,
    required this.price,
    required this.status,
    required this.source,
    this.notes,
    this.noshowReason,
    this.currency = '₹',
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id'] ?? '',
      bookingId: json['booking_id'] ?? '',
      customerId: json['customer_id'] ?? '',
      customerName: json['customer_name'] ?? 'Customer',
      customerPhone: json['customer_phone'] ?? '',
      customerEmail: json['customer_email'],
      serviceId: json['service_id'] ?? '',
      serviceName: json['service_name'] ?? 'Service',
      serviceDuration: json['service_duration'] ?? 30,
      staffId: json['staff_id'] ?? '',
      staffName: json['staff_name'] ?? 'Staff',
      date: json['date'] ?? '',
      startTime: json['start_time'] ?? '',
      endTime: json['end_time'] ?? '',
      formattedStartTime: json['formatted_start_time'] ?? json['start_time'] ?? '',
      formattedEndTime: json['formatted_end_time'] ?? json['end_time'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'CONFIRMED',
      source: json['source'] ?? 'WHATSAPP_AI',
      notes: json['notes'],
      noshowReason: json['noshow_reason'],
      currency: json['currency'] ?? '₹',
    );
  }
}

class AvailableSlotModel {
  final String time;
  final String formattedTime;
  final String staffId;
  final String staffName;
  final int serviceDuration;
  final bool isAvailable;

  AvailableSlotModel({
    required this.time,
    required this.formattedTime,
    required this.staffId,
    required this.staffName,
    required this.serviceDuration,
    required this.isAvailable,
  });

  factory AvailableSlotModel.fromJson(Map<String, dynamic> json) {
    return AvailableSlotModel(
      time: json['time'] ?? '',
      formattedTime: json['formatted_time'] ?? json['time'] ?? '',
      staffId: json['staff_id'] ?? '',
      staffName: json['staff_name'] ?? '',
      serviceDuration: json['service_duration'] ?? 30,
      isAvailable: json['is_available'] ?? true,
    );
  }
}

class CustomerModel {
  final String id;
  final String name;
  final String whatsappNumber;
  final String? email;
  final int totalBookings;
  final int completedBookings;
  final int cancelledBookings;
  final int noshowBookings;
  final String? notes;
  final String createdAt;

  CustomerModel({
    required this.id,
    required this.name,
    required this.whatsappNumber,
    this.email,
    required this.totalBookings,
    required this.completedBookings,
    required this.cancelledBookings,
    required this.noshowBookings,
    this.notes,
    required this.createdAt,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      whatsappNumber: json['whatsapp_number'] ?? '',
      email: json['email'],
      totalBookings: json['total_bookings'] ?? 0,
      completedBookings: json['completed_bookings'] ?? 0,
      cancelledBookings: json['cancelled_bookings'] ?? 0,
      noshowBookings: json['noshow_bookings'] ?? 0,
      notes: json['notes'],
      createdAt: json['created_at'] ?? '',
    );
  }
}

class ServiceModel {
  final String id;
  final String name;
  final String description;
  final int durationMinutes;
  final double price;
  final bool isActive;
  final List<String> assignedStaffIds;

  ServiceModel({
    required this.id,
    required this.name,
    required this.description,
    required this.durationMinutes,
    required this.price,
    required this.isActive,
    required this.assignedStaffIds,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    return ServiceModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      durationMinutes: json['duration_minutes'] ?? 30,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      isActive: json['is_active'] == 1 || json['is_active'] == true,
      assignedStaffIds: (json['assigned_staff_ids'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class StaffModel {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String profilePhoto;
  final List<int> workingDays;
  final String workingHoursStart;
  final String workingHoursEnd;
  final String? breakStart;
  final String? breakEnd;
  final bool isActive;
  final List<String> assignedServiceIds;

  StaffModel({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    required this.profilePhoto,
    required this.workingDays,
    required this.workingHoursStart,
    required this.workingHoursEnd,
    this.breakStart,
    this.breakEnd,
    required this.isActive,
    required this.assignedServiceIds,
  });

  factory StaffModel.fromJson(Map<String, dynamic> json) {
    return StaffModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'],
      email: json['email'],
      profilePhoto: json['profile_photo'] ?? '',
      workingDays: (json['working_days_list'] as List<dynamic>?)?.map((e) => (e as num).toInt()).toList() ?? [1, 2, 3, 4, 5, 6],
      workingHoursStart: json['working_hours_start'] ?? '10:00',
      workingHoursEnd: json['working_hours_end'] ?? '19:00',
      breakStart: json['break_start'],
      breakEnd: json['break_end'],
      isActive: json['is_active'] == 1 || json['is_active'] == true,
      assignedServiceIds: (json['assigned_service_ids'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class BusinessHoursModel {
  final int dayOfWeek;
  final bool isOpen;
  final String openTime;
  final String closeTime;
  final String? breakStart;
  final String? breakEnd;

  BusinessHoursModel({
    required this.dayOfWeek,
    required this.isOpen,
    required this.openTime,
    required this.closeTime,
    this.breakStart,
    this.breakEnd,
  });

  factory BusinessHoursModel.fromJson(Map<String, dynamic> json) {
    return BusinessHoursModel(
      dayOfWeek: json['day_of_week'] ?? 0,
      isOpen: json['is_open'] == 1 || json['is_open'] == true,
      openTime: json['open_time'] ?? '09:00',
      closeTime: json['close_time'] ?? '20:00',
      breakStart: json['break_start'],
      breakEnd: json['break_end'],
    );
  }

  Map<String, dynamic> toJson() => {
    'day_of_week': dayOfWeek,
    'is_open': isOpen ? 1 : 0,
    'open_time': openTime,
    'close_time': closeTime,
    'break_start': breakStart,
    'break_end': breakEnd,
  };
}

class BlockedSlotModel {
  final String id;
  final String? staffId;
  final String? staffName;
  final String date;
  final String startTime;
  final String endTime;
  final String formattedStartTime;
  final String formattedEndTime;
  final String reason;

  BlockedSlotModel({
    required this.id,
    this.staffId,
    this.staffName,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.formattedStartTime,
    required this.formattedEndTime,
    required this.reason,
  });

  factory BlockedSlotModel.fromJson(Map<String, dynamic> json) {
    return BlockedSlotModel(
      id: json['id'] ?? '',
      staffId: json['staff_id'],
      staffName: json['staff_name'],
      date: json['date'] ?? '',
      startTime: json['start_time'] ?? '',
      endTime: json['end_time'] ?? '',
      formattedStartTime: json['formatted_start_time'] ?? json['start_time'] ?? '',
      formattedEndTime: json['formatted_end_time'] ?? json['end_time'] ?? '',
      reason: json['reason'] ?? '',
    );
  }
}

class HolidayModel {
  final String id;
  final String date;
  final String name;

  HolidayModel({required this.id, required this.date, required this.name});

  factory HolidayModel.fromJson(Map<String, dynamic> json) {
    return HolidayModel(
      id: json['id'] ?? '',
      date: json['date'] ?? '',
      name: json['name'] ?? '',
    );
  }
}

class WhatsAppConfigModel {
  final String phoneNumberId;
  final String businessAccountId;
  final String accessTokenMasked;
  final String webhookVerifyToken;
  final bool isConnected;

  WhatsAppConfigModel({
    required this.phoneNumberId,
    required this.businessAccountId,
    required this.accessTokenMasked,
    required this.webhookVerifyToken,
    required this.isConnected,
  });

  factory WhatsAppConfigModel.fromJson(Map<String, dynamic> json) {
    return WhatsAppConfigModel(
      phoneNumberId: json['phone_number_id'] ?? '',
      businessAccountId: json['business_account_id'] ?? '',
      accessTokenMasked: json['access_token_masked'] ?? 'Configured',
      webhookVerifyToken: json['webhook_verify_token'] ?? '',
      isConnected: json['is_connected'] == 1 || json['is_connected'] == true,
    );
  }
}

class AIAgentConfigModel {
  final String personaName;
  final String language;
  final String tone;
  final String cancellationPolicy;
  final String reschedulePolicy;
  final String customInstructions;
  final List<FAQItem> faqs;

  AIAgentConfigModel({
    required this.personaName,
    required this.language,
    required this.tone,
    required this.cancellationPolicy,
    required this.reschedulePolicy,
    required this.customInstructions,
    required this.faqs,
  });

  factory AIAgentConfigModel.fromJson(Map<String, dynamic> json) {
    final faqsList = (json['faqs'] as List<dynamic>?)
            ?.map((f) => FAQItem.fromJson(f as Map<String, dynamic>))
            .toList() ??
        [];
    return AIAgentConfigModel(
      personaName: json['persona_name'] ?? 'Aria',
      language: json['language'] ?? 'Hinglish',
      tone: json['tone'] ?? 'Friendly',
      cancellationPolicy: json['cancellation_policy'] ?? '',
      reschedulePolicy: json['reschedule_policy'] ?? '',
      customInstructions: json['custom_instructions'] ?? '',
      faqs: faqsList,
    );
  }
}

class FAQItem {
  final String question;
  final String answer;

  FAQItem({required this.question, required this.answer});

  factory FAQItem.fromJson(Map<String, dynamic> json) {
    return FAQItem(
      question: json['question'] ?? '',
      answer: json['answer'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'question': question, 'answer': answer};
}

class AutomationRuleModel {
  final String id;
  final String eventTrigger;
  final String? templateId;
  final String? templateName;
  final String? templateContent;
  final int delayMinutes;
  final bool isEnabled;

  AutomationRuleModel({
    required this.id,
    required this.eventTrigger,
    this.templateId,
    this.templateName,
    this.templateContent,
    required this.delayMinutes,
    required this.isEnabled,
  });

  factory AutomationRuleModel.fromJson(Map<String, dynamic> json) {
    return AutomationRuleModel(
      id: json['id'] ?? '',
      eventTrigger: json['event_trigger'] ?? '',
      templateId: json['template_id'],
      templateName: json['template_name'],
      templateContent: json['template_content'],
      delayMinutes: json['delay_minutes'] ?? 0,
      isEnabled: json['is_enabled'] == 1 || json['is_enabled'] == true,
    );
  }
}

class MessageTemplateModel {
  final String id;
  final String templateType;
  final String name;
  final String content;
  final List<String> variablesList;
  final bool isActive;

  MessageTemplateModel({
    required this.id,
    required this.templateType,
    required this.name,
    required this.content,
    required this.variablesList,
    required this.isActive,
  });

  factory MessageTemplateModel.fromJson(Map<String, dynamic> json) {
    return MessageTemplateModel(
      id: json['id'] ?? '',
      templateType: json['template_type'] ?? '',
      name: json['name'] ?? '',
      content: json['content'] ?? '',
      variablesList: (json['variables_list'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      isActive: json['is_active'] == 1 || json['is_active'] == true,
    );
  }
}

class NotificationModel {
  final String id;
  final String title;
  final String body;
  final String type;
  final bool isRead;
  final String createdAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      type: json['type'] ?? 'SYSTEM',
      isRead: json['is_read'] == 1 || json['is_read'] == true,
      createdAt: json['created_at'] ?? '',
    );
  }
}
