import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../core/models/models.dart';
import '../core/network/api_client.dart';
import '../core/storage/secure_storage.dart';

// -------------------------------------------------------------
// 1. THEME PROVIDER
// -------------------------------------------------------------
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.dark) {
    _load();
  }

  void _load() {
    final modeStr = SecureStorage.getThemeMode();
    if (modeStr == 'light') {
      state = ThemeMode.light;
    } else if (modeStr == 'system') {
      state = ThemeMode.system;
    } else {
      state = ThemeMode.dark;
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    String modeStr = 'dark';
    if (mode == ThemeMode.light) modeStr = 'light';
    if (mode == ThemeMode.system) modeStr = 'system';
    await SecureStorage.setThemeMode(modeStr);
  }
}

// -------------------------------------------------------------
// 2. AUTH PROVIDER
// -------------------------------------------------------------
class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserModel? user;
  final String? token;
  final String? error;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.token,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserModel? user,
    String? token,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      token: token ?? this.token,
      error: error,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState(isLoading: true)) {
    checkSession();
  }

  Future<void> checkSession() async {
    final token = SecureStorage.getToken();
    final userMap = SecureStorage.getUser();

    if (token != null && userMap != null) {
      try {
        final res = await ApiClient.dio.get('/auth/me');
        if (res.data['success'] == true) {
          final user = UserModel.fromJson(res.data['user']);
          await SecureStorage.saveUser(user.toJson());
          state = AuthState(
            isLoading: false,
            isAuthenticated: true,
            user: user,
            token: token,
          );
          return;
        }
      } catch (e) {
        // Fallback to cached user if offline
        final user = UserModel.fromJson(userMap);
        state = AuthState(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          token: token,
        );
        return;
      }
    }

    state = AuthState(isLoading: false, isAuthenticated: false);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (res.data['success'] == true) {
        final token = res.data['token'];
        final user = UserModel.fromJson(res.data['user']);
        await SecureStorage.saveToken(token);
        await SecureStorage.saveUser(user.toJson());

        state = AuthState(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          token: token,
        );
        return true;
      } else {
        state = state.copyWith(isLoading: false, error: res.data['error'] ?? 'Login failed');
        return false;
      }
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, error: e.error.toString());
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorage.clearToken();
    state = AuthState(isLoading: false, isAuthenticated: false);
  }
}

// -------------------------------------------------------------
// 3. DASHBOARD PROVIDER
// -------------------------------------------------------------
class DashboardState {
  final bool isLoading;
  final DashboardStatsModel? stats;
  final List<AppointmentModel> upcomingList;
  final String? error;

  DashboardState({
    this.isLoading = false,
    this.stats,
    this.upcomingList = const [],
    this.error,
  });
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier();
});

class DashboardNotifier extends StateNotifier<DashboardState> {
  DashboardNotifier() : super(DashboardState(isLoading: true)) {
    loadDashboard();
  }

  Future<void> loadDashboard() async {
    try {
      final res = await ApiClient.dio.get('/dashboard/stats');
      if (res.data['success'] == true) {
        final stats = DashboardStatsModel.fromJson(res.data['stats']);
        final list = (res.data['upcoming_list'] as List<dynamic>?)
                ?.map((item) => AppointmentModel.fromJson(item as Map<String, dynamic>))
                .toList() ??
            [];
        state = DashboardState(isLoading: false, stats: stats, upcomingList: list);
      }
    } catch (e) {
      state = DashboardState(isLoading: false, error: e.toString());
    }
  }
}

// -------------------------------------------------------------
// 4. BOOKINGS PROVIDER
// -------------------------------------------------------------
class BookingsState {
  final bool isLoading;
  final List<AppointmentModel> bookings;
  final String selectedStatus; // 'ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'
  final String searchQuery;
  final String? error;

  BookingsState({
    this.isLoading = false,
    this.bookings = const [],
    this.selectedStatus = 'ALL',
    this.searchQuery = '',
    this.error,
  });

  BookingsState copyWith({
    bool? isLoading,
    List<AppointmentModel>? bookings,
    String? selectedStatus,
    String? searchQuery,
    String? error,
  }) {
    return BookingsState(
      isLoading: isLoading ?? this.isLoading,
      bookings: bookings ?? this.bookings,
      selectedStatus: selectedStatus ?? this.selectedStatus,
      searchQuery: searchQuery ?? this.searchQuery,
      error: error,
    );
  }
}

final bookingsProvider = StateNotifierProvider<BookingsNotifier, BookingsState>((ref) {
  return BookingsNotifier();
});

class BookingsNotifier extends StateNotifier<BookingsState> {
  BookingsNotifier() : super(BookingsState(isLoading: true)) {
    fetchBookings();
  }

  Future<void> fetchBookings() async {
    try {
      final res = await ApiClient.dio.get('/bookings', queryParameters: {
        if (state.selectedStatus != 'ALL') 'status': state.selectedStatus,
        if (state.searchQuery.isNotEmpty) 'search': state.searchQuery,
      });

      if (res.data['success'] == true) {
        final list = (res.data['bookings'] as List<dynamic>?)
                ?.map((e) => AppointmentModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        state = state.copyWith(isLoading: false, bookings: list);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setStatusFilter(String status) {
    state = state.copyWith(selectedStatus: status, isLoading: true);
    fetchBookings();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query, isLoading: true);
    fetchBookings();
  }

  Future<bool> createBooking(Map<String, dynamic> data) async {
    try {
      final res = await ApiClient.dio.post('/bookings', data: data);
      if (res.data['success'] == true) {
        fetchBookings();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> confirmBooking(String id) async {
    try {
      await ApiClient.dio.post('/bookings/$id/confirm');
      fetchBookings();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> rescheduleBooking(String id, String newDate, String newStartTime, {String? staffId}) async {
    try {
      final data = <String, dynamic>{
        'new_date': newDate,
        'new_start_time': newStartTime,
      };
      if (staffId != null) {
        data['new_staff_id'] = staffId;
      }
      await ApiClient.dio.post('/bookings/$id/reschedule', data: data);
      fetchBookings();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> cancelBooking(String id, {String? reason}) async {
    try {
      await ApiClient.dio.post('/bookings/$id/cancel', data: {'reason': reason});
      fetchBookings();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> completeBooking(String id) async {
    try {
      await ApiClient.dio.post('/bookings/$id/complete');
      fetchBookings();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> markNoShow(String id, {String? reason}) async {
    try {
      await ApiClient.dio.post('/bookings/$id/no-show', data: {'reason': reason});
      fetchBookings();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// -------------------------------------------------------------
// 5. SERVICES PROVIDER
// -------------------------------------------------------------
final servicesProvider = StateNotifierProvider<ServicesNotifier, AsyncValue<List<ServiceModel>>>((ref) {
  return ServicesNotifier();
});

class ServicesNotifier extends StateNotifier<AsyncValue<List<ServiceModel>>> {
  ServicesNotifier() : super(const AsyncValue.loading()) {
    fetchServices();
  }

  Future<void> fetchServices() async {
    try {
      final res = await ApiClient.dio.get('/services');
      if (res.data['success'] == true) {
        final list = (res.data['services'] as List<dynamic>?)
                ?.map((e) => ServiceModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        state = AsyncValue.data(list);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> addService(Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.post('/services', data: data);
      fetchServices();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateService(String id, Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.put('/services/$id', data: data);
      fetchServices();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> toggleService(String id) async {
    try {
      await ApiClient.dio.patch('/services/$id/toggle');
      fetchServices();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteService(String id) async {
    try {
      await ApiClient.dio.delete('/services/$id');
      fetchServices();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// -------------------------------------------------------------
// 6. STAFF PROVIDER
// -------------------------------------------------------------
final staffProvider = StateNotifierProvider<StaffNotifier, AsyncValue<List<StaffModel>>>((ref) {
  return StaffNotifier();
});

class StaffNotifier extends StateNotifier<AsyncValue<List<StaffModel>>> {
  StaffNotifier() : super(const AsyncValue.loading()) {
    fetchStaff();
  }

  Future<void> fetchStaff() async {
    try {
      final res = await ApiClient.dio.get('/staff');
      if (res.data['success'] == true) {
        final list = (res.data['staff'] as List<dynamic>?)
                ?.map((e) => StaffModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        state = AsyncValue.data(list);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> addStaff(Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.post('/staff', data: data);
      fetchStaff();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateStaff(String id, Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.put('/staff/$id', data: data);
      fetchStaff();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> toggleStaff(String id) async {
    try {
      await ApiClient.dio.patch('/staff/$id/toggle');
      fetchStaff();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteStaff(String id) async {
    try {
      await ApiClient.dio.delete('/staff/$id');
      fetchStaff();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// -------------------------------------------------------------
// 7. CUSTOMERS PROVIDER
// -------------------------------------------------------------
final customersProvider = StateNotifierProvider<CustomersNotifier, AsyncValue<List<CustomerModel>>>((ref) {
  return CustomersNotifier();
});

class CustomersNotifier extends StateNotifier<AsyncValue<List<CustomerModel>>> {
  CustomersNotifier() : super(const AsyncValue.loading()) {
    fetchCustomers();
  }

  Future<void> fetchCustomers({String? search}) async {
    try {
      final res = await ApiClient.dio.get('/customers', queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
      });
      if (res.data['success'] == true) {
        final list = (res.data['customers'] as List<dynamic>?)
                ?.map((e) => CustomerModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        state = AsyncValue.data(list);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> addCustomer(Map<String, dynamic> data) async {
    try {
      await ApiClient.dio.post('/customers', data: data);
      fetchCustomers();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// -------------------------------------------------------------
// 8. NOTIFICATIONS PROVIDER
// -------------------------------------------------------------
class NotificationsState {
  final bool isLoading;
  final int unreadCount;
  final List<NotificationModel> notifications;

  NotificationsState({
    this.isLoading = false,
    this.unreadCount = 0,
    this.notifications = const [],
  });
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  return NotificationsNotifier();
});

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  NotificationsNotifier() : super(NotificationsState(isLoading: true)) {
    fetchNotifications();
  }

  Future<void> fetchNotifications() async {
    try {
      final res = await ApiClient.dio.get('/notifications');
      if (res.data['success'] == true) {
        final list = (res.data['notifications'] as List<dynamic>?)
                ?.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        state = NotificationsState(
          isLoading: false,
          unreadCount: res.data['unread_count'] ?? 0,
          notifications: list,
        );
      }
    } catch (e) {
      state = NotificationsState(isLoading: false);
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await ApiClient.dio.post('/notifications/read-all');
      fetchNotifications();
    } catch (_) {
      // Ignored
    }
  }
}
