import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:4000/api';
    }
    if (Platform.isAndroid) {
      // 10.0.2.2 is Android emulator loopback to host
      return 'http://10.0.2.2:4000/api';
    }
    // iOS Simulator, macOS, Linux, Windows
    return 'http://localhost:4000/api';
  }

  static const String keyToken = 'auth_token';
  static const String keyUser = 'user_data';
  static const String keyBaseUrl = 'custom_base_url';
  static const String keyThemeMode = 'app_theme_mode';
}
