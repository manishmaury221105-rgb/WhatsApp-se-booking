import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static Dio? _dioInstance;

  static Dio get dio {
    if (_dioInstance == null) {
      final baseUrl = SecureStorage.getBaseUrl();
      _dioInstance = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      );

      _dioInstance!.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            final token = SecureStorage.getToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            return handler.next(options);
          },
          onError: (DioException e, handler) {
            String message = 'An unexpected error occurred';
            if (e.response?.data is Map && e.response?.data['error'] != null) {
              message = e.response!.data['error'].toString();
            } else if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
              message = 'Connection timed out. Please check your internet or server.';
            } else if (e.type == DioExceptionType.connectionError) {
              message = 'Unable to connect to server. Please check backend is running.';
            }
            return handler.reject(
              DioException(
                requestOptions: e.requestOptions,
                response: e.response,
                type: e.type,
                error: message,
              ),
            );
          },
        ),
      );
    }
    return _dioInstance!;
  }

  static void resetBaseUrl() {
    _dioInstance = null;
  }
}
