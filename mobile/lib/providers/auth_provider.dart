import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _errorMessage;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated && _user != null;

  AuthProvider() {
    initAuth();
  }

  Future<void> initAuth() async {
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final token = await TokenStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }

      // Try fetching current user profile
      final res = await ApiClient.get(ApiConstants.me);
      if (res.isSuccess && res.data != null) {
        _user = UserModel.fromJson(res.data);
        _status = AuthStatus.authenticated;
        await TokenStorage.saveCachedUser(jsonEncode(_user!.toJson()));
      } else {
        // Token expired or invalid
        await TokenStorage.clear();
        _status = AuthStatus.unauthenticated;
      }
    } catch (_) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.post(
      ApiConstants.login,
      body: {'email': email.trim(), 'password': password},
      requiresAuth: false,
    );

    if (res.isSuccess && res.data != null) {
      final data = res.data;
      final accessToken = data['accessToken'] ?? data['token'] ?? data['access_token'];
      final refreshToken = data['refreshToken'] ?? data['refresh_token'];

      if (accessToken != null) {
        await TokenStorage.saveTokens(
          accessToken: accessToken.toString(),
          refreshToken: refreshToken?.toString(),
        );

        // Fetch fresh user profile
        final userRes = await ApiClient.get(ApiConstants.me);
        if (userRes.isSuccess && userRes.data != null) {
          _user = UserModel.fromJson(userRes.data);
        } else if (data['user'] != null) {
          _user = UserModel.fromJson(data['user']);
        }

        _status = AuthStatus.authenticated;
        notifyListeners();
        return true;
      }
    }

    _errorMessage = res.errorMessage ?? 'Invalid email or password';
    _status = AuthStatus.unauthenticated;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String role = 'student',
  }) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.post(
      ApiConstants.register,
      body: {
        'email': email.trim(),
        'password': password,
        'first_name': firstName.trim(),
        'last_name': lastName.trim(),
        'role': role,
      },
      requiresAuth: false,
    );

    if (res.isSuccess) {
      // Auto-login after successful registration
      return await login(email, password);
    }

    _errorMessage = res.errorMessage ?? 'Failed to register account';
    _status = AuthStatus.unauthenticated;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    await TokenStorage.clear();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
