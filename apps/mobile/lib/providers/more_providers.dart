import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models/models.dart';
import '../core/network/api_client.dart';

// -------------------------------------------------------------
// 1. AVAILABILITY PROVIDER
// -------------------------------------------------------------
class AvailabilityState {
  final bool isLoading;
  final List<BusinessHoursModel> businessHours;
  final List<HolidayModel> holidays;
  final List<BlockedSlotModel> blockedSlots;
  final String? error;

  AvailabilityState({
    this.isLoading = false,
    this.businessHours = const [],
    this.holidays = const [],
    this.blockedSlots = const [],
    this.error,
  });

  AvailabilityState copyWith({
    bool? isLoading,
    List<BusinessHoursModel>? businessHours,
    List<HolidayModel>? holidays,
    List<BlockedSlotModel>? blockedSlots,
    String? error,
  }) {
    return AvailabilityState(
      isLoading: isLoading ?? this.isLoading,
      businessHours: businessHours ?? this.businessHours,
      holidays: holidays ?? this.holidays,
      blockedSlots: blockedSlots ?? this.blockedSlots,
      error: error,
    );
  }
}

final availabilityProvider = StateNotifierProvider<AvailabilityNotifier, AvailabilityState>((ref) {
  return AvailabilityNotifier();
});

class AvailabilityNotifier extends StateNotifier<AvailabilityState> {
  AvailabilityNotifier() : super(AvailabilityState(isLoading: true)) {
    loadAll();
  }

  Future<void> loadAll() async {
    try {
      final hoursRes = await ApiClient.dio.get('/availability/hours');
      final holRes = await ApiClient.dio.get('/availability/holidays');
      final blockRes = await ApiClient.dio.get('/availability/blocked-slots');

      final hours = (hoursRes.data['hours'] as List<dynamic>?)
              ?.map((e) => BusinessHoursModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];
      final holidays = (holRes.data['holidays'] as List<dynamic>?)
              ?.map((e) => HolidayModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];
      final blocks = (blockRes.data['blocked_slots'] as List<dynamic>?)
              ?.map((e) => BlockedSlotModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];

      state = AvailabilityState(
        isLoading: false,
        businessHours: hours,
        holidays: holidays,
        blockedSlots: blocks,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> saveBusinessHours(List<BusinessHoursModel> hours) async {
    try {
      final payload = hours.map((h) => h.toJson()).toList();
      await ApiClient.dio.put('/availability/hours', data: {'hours': payload});
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> addHoliday(String date, String name) async {
    try {
      await ApiClient.dio.post('/availability/holidays', data: {'date': date, 'name': name});
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteHoliday(String id) async {
    try {
      await ApiClient.dio.delete('/availability/holidays/$id');
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> addBlockedSlot(Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.post('/availability/blocked-slots', data: data);
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteBlockedSlot(String id) async {
    try {
      await ApiClient.dio.delete('/availability/blocked-slots/$id');
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// -------------------------------------------------------------
// 2. WHATSAPP CONFIG & TEST PROVIDER
// -------------------------------------------------------------
class WhatsAppState {
  final bool isLoading;
  final WhatsAppConfigModel? config;
  final List<dynamic> messages;
  final String? error;

  WhatsAppState({
    this.isLoading = false,
    this.config,
    this.messages = const [],
    this.error,
  });

  WhatsAppState copyWith({
    bool? isLoading,
    WhatsAppConfigModel? config,
    List<dynamic>? messages,
    String? error,
  }) {
    return WhatsAppState(
      isLoading: isLoading ?? this.isLoading,
      config: config ?? this.config,
      messages: messages ?? this.messages,
      error: error,
    );
  }
}

final whatsappProvider = StateNotifierProvider<WhatsAppNotifier, WhatsAppState>((ref) {
  return WhatsAppNotifier();
});

class WhatsAppNotifier extends StateNotifier<WhatsAppState> {
  WhatsAppNotifier() : super(WhatsAppState(isLoading: true)) {
    loadConfig();
    fetchMessages();
  }

  Future<void> loadConfig() async {
    try {
      final res = await ApiClient.dio.get('/whatsapp/config');
      if (res.data['success'] == true) {
        final cfg = WhatsAppConfigModel.fromJson(res.data['config']);
        state = state.copyWith(isLoading: false, config: cfg);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchMessages() async {
    try {
      final res = await ApiClient.dio.get('/whatsapp/messages');
      if (res.data['success'] == true) {
        state = state.copyWith(messages: res.data['messages'] ?? []);
      }
    } catch (_) {
      // Ignored
    }
  }

  Future<bool> updateConfig(Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.put('/whatsapp/config', data: data);
      loadConfig();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>> sendTestMessage(String phone, String message) async {
    try {
      final res = await ApiClient.dio.post('/whatsapp/test', data: {
        'phone': phone,
        'message': message,
      });
      fetchMessages();
      return res.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}

// -------------------------------------------------------------
// 3. AI AGENT & SIMULATOR PROVIDER
// -------------------------------------------------------------
class ChatSimulatorMessage {
  final String sender; // 'user' or 'ai'
  final String text;
  final String? time;
  final AppointmentModel? bookedAppointment;

  ChatSimulatorMessage({
    required this.sender,
    required this.text,
    this.time,
    this.bookedAppointment,
  });
}

class AIAgentState {
  final bool isLoading;
  final AIAgentConfigModel? config;
  final List<ChatSimulatorMessage> chatMessages;
  final bool isSendingChat;

  AIAgentState({
    this.isLoading = false,
    this.config,
    this.chatMessages = const [],
    this.isSendingChat = false,
  });

  AIAgentState copyWith({
    bool? isLoading,
    AIAgentConfigModel? config,
    List<ChatSimulatorMessage>? chatMessages,
    bool? isSendingChat,
  }) {
    return AIAgentState(
      isLoading: isLoading ?? this.isLoading,
      config: config ?? this.config,
      chatMessages: chatMessages ?? this.chatMessages,
      isSendingChat: isSendingChat ?? this.isSendingChat,
    );
  }
}

final aiAgentProvider = StateNotifierProvider<AIAgentNotifier, AIAgentState>((ref) {
  return AIAgentNotifier();
});

class AIAgentNotifier extends StateNotifier<AIAgentState> {
  AIAgentNotifier() : super(AIAgentState(isLoading: true)) {
    loadConfig();
    _initChat();
  }

  void _initChat() {
    state = state.copyWith(chatMessages: [
      ChatSimulatorMessage(
        sender: 'ai',
        text: 'Namaste! 🙏 Main Aria, aapki AI Booking Assistant. Aap konsi service book karna chahte hain?',
      )
    ]);
  }

  Future<void> loadConfig() async {
    try {
      final res = await ApiClient.dio.get('/ai/config');
      if (res.data['success'] == true) {
        final cfg = AIAgentConfigModel.fromJson(res.data['config']);
        state = state.copyWith(isLoading: false, config: cfg);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> updateConfig(Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.put('/ai/config', data: data);
      loadConfig();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> sendSimulatorMessage(String message) async {
    final userMsg = ChatSimulatorMessage(sender: 'user', text: message);
    state = state.copyWith(
      chatMessages: [...state.chatMessages, userMsg],
      isSendingChat: true,
    );

    try {
      final res = await ApiClient.dio.post('/ai/chat-simulate', data: {
        'message': message,
        'customer_phone': '+919999900000',
        'customer_name': 'Test User',
      });

      if (res.data['success'] == true) {
        final replyText = res.data['reply'] ?? '';
        AppointmentModel? appt;
        if (res.data['appointment'] != null) {
          appt = AppointmentModel.fromJson(res.data['appointment']);
        }

        final aiMsg = ChatSimulatorMessage(
          sender: 'ai',
          text: replyText,
          bookedAppointment: appt,
        );

        state = state.copyWith(
          chatMessages: [...state.chatMessages, aiMsg],
          isSendingChat: false,
        );
      }
    } catch (e) {
      final errReply = ChatSimulatorMessage(
        sender: 'ai',
        text: 'Error connecting to AI: $e',
      );
      state = state.copyWith(
        chatMessages: [...state.chatMessages, errReply],
        isSendingChat: false,
      );
    }
  }

  Future<void> resetSimulator() async {
    await ApiClient.dio.post('/ai/chat-simulate/reset');
    _initChat();
  }
}

// -------------------------------------------------------------
// 4. AUTOMATIONS & TEMPLATES PROVIDER
// -------------------------------------------------------------
class AutomationsState {
  final bool isLoading;
  final List<AutomationRuleModel> rules;
  final List<MessageTemplateModel> templates;

  AutomationsState({
    this.isLoading = false,
    this.rules = const [],
    this.templates = const [],
  });

  AutomationsState copyWith({
    bool? isLoading,
    List<AutomationRuleModel>? rules,
    List<MessageTemplateModel>? templates,
  }) {
    return AutomationsState(
      isLoading: isLoading ?? this.isLoading,
      rules: rules ?? this.rules,
      templates: templates ?? this.templates,
    );
  }
}

final automationsProvider = StateNotifierProvider<AutomationsNotifier, AutomationsState>((ref) {
  return AutomationsNotifier();
});

class AutomationsNotifier extends StateNotifier<AutomationsState> {
  AutomationsNotifier() : super(AutomationsState(isLoading: true)) {
    loadAll();
  }

  Future<void> loadAll() async {
    try {
      final autoRes = await ApiClient.dio.get('/automations');
      final tmplRes = await ApiClient.dio.get('/templates');

      final rules = (autoRes.data['automations'] as List<dynamic>?)
              ?.map((e) => AutomationRuleModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];
      final templates = (tmplRes.data['templates'] as List<dynamic>?)
              ?.map((e) => MessageTemplateModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];

      state = AutomationsState(isLoading: false, rules: rules, templates: templates);
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> updateRule(String id, {bool? isEnabled, String? templateId, int? delayMinutes}) async {
    try {
      final payload = <String, dynamic>{};
      if (isEnabled != null) payload['is_enabled'] = isEnabled;
      if (templateId != null) payload['template_id'] = templateId;
      if (delayMinutes != null) payload['delay_minutes'] = delayMinutes;

      await ApiClient.dio.put('/automations/$id', data: payload);
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateTemplate(String id, Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.put('/templates/$id', data: data);
      loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<String> previewTemplate(String content) async {
    try {
      final res = await ApiClient.dio.post('/templates/preview', data: {'content': content});
      return res.data['preview'] ?? content;
    } catch (e) {
      return content;
    }
  }
}

// -------------------------------------------------------------
// 5. ANALYTICS PROVIDER
// -------------------------------------------------------------
final analyticsProvider = StateNotifierProvider<AnalyticsNotifier, AsyncValue<Map<String, dynamic>>>((ref) {
  return AnalyticsNotifier();
});

class AnalyticsNotifier extends StateNotifier<AsyncValue<Map<String, dynamic>>> {
  AnalyticsNotifier() : super(const AsyncValue.loading()) {
    fetchAnalytics();
  }

  Future<void> fetchAnalytics({String range = '30d'}) async {
    try {
      final res = await ApiClient.dio.get('/analytics', queryParameters: {'range': range});
      if (res.data['success'] == true) {
        state = AsyncValue.data(res.data);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
