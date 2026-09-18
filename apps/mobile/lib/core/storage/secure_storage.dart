import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

class SecureStorage {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> saveToken(String token) async {
    await _prefs?.setString(ApiConstants.keyToken, token);
  }

  static String? getToken() {
    return _prefs?.getString(ApiConstants.keyToken);
  }

  static Future<void> clearToken() async {
    await _prefs?.remove(ApiConstants.keyToken);
    await _prefs?.remove(ApiConstants.keyUser);
  }

  static Future<void> saveUser(Map<String, dynamic> userMap) async {
    await _prefs?.setString(ApiConstants.keyUser, jsonEncode(userMap));
  }

  static Map<String, dynamic>? getUser() {
    final str = _prefs?.getString(ApiConstants.keyUser);
    if (str != null) {
      try {
        return jsonDecode(str) as Map<String, dynamic>;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  static Future<void> setBaseUrl(String url) async {
    await _prefs?.setString(ApiConstants.keyBaseUrl, url);
  }

  static String getBaseUrl() {
    return _prefs?.getString(ApiConstants.keyBaseUrl) ?? ApiConstants.defaultBaseUrl;
  }

  static Future<void> setThemeMode(String mode) async {
    await _prefs?.setString(ApiConstants.keyThemeMode, mode);
  }

  static String getThemeMode() {
    return _prefs?.getString(ApiConstants.keyThemeMode) ?? 'dark';
  }
}
