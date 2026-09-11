import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../storage/token_storage.dart';

class ApiResponse {
  final bool isSuccess;
  final int statusCode;
  final dynamic data;
  final String? errorMessage;

  ApiResponse({
    required this.isSuccess,
    required this.statusCode,
    this.data,
    this.errorMessage,
  });
}

class ApiClient {
  static Future<Map<String, String>> _headers({bool requiresAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requiresAuth) {
      final token = await TokenStorage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  static Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final base = ApiConstants.baseUrl;
    final url = '$base$path';
    if (queryParams != null && queryParams.isNotEmpty) {
      final queryString = queryParams.entries
          .where((e) => e.value != null)
          .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value.toString())}')
          .join('&');
      return Uri.parse('$url?$queryString');
    }
    return Uri.parse(url);
  }

  static Future<ApiResponse> get(
    String path, {
    Map<String, dynamic>? queryParams,
    bool requiresAuth = true,
  }) async {
    try {
      final uri = _buildUri(path, queryParams);
      final headers = await _headers(requiresAuth: requiresAuth);
      
      final response = await http.get(uri, headers: headers).timeout(
        const Duration(seconds: 15),
      );

      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient.get error on $path: $e');
      return ApiResponse(
        isSuccess: false,
        statusCode: 0,
        errorMessage: 'Network error. Please check your connection.',
      );
    }
  }

  static Future<ApiResponse> post(
    String path, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    try {
      final uri = _buildUri(path);
      final headers = await _headers(requiresAuth: requiresAuth);
      
      final response = await http
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient.post error on $path: $e');
      return ApiResponse(
        isSuccess: false,
        statusCode: 0,
        errorMessage: 'Network error. Please check your connection.',
      );
    }
  }

  static Future<ApiResponse> patch(
    String path, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    try {
      final uri = _buildUri(path);
      final headers = await _headers(requiresAuth: requiresAuth);

      final response = await http
          .patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient.patch error on $path: $e');
      return ApiResponse(
        isSuccess: false,
        statusCode: 0,
        errorMessage: 'Network error. Please check your connection.',
      );
    }
  }

  static Future<ApiResponse> delete(
    String path, {
    bool requiresAuth = true,
  }) async {
    try {
      final uri = _buildUri(path);
      final headers = await _headers(requiresAuth: requiresAuth);

      final response = await http
          .delete(uri, headers: headers)
          .timeout(const Duration(seconds: 15));

      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient.delete error on $path: $e');
      return ApiResponse(
        isSuccess: false,
        statusCode: 0,
        errorMessage: 'Network error. Please check your connection.',
      );
    }
  }

  static ApiResponse _handleResponse(http.Response response) {
    dynamic decodedBody;
    try {
      if (response.body.isNotEmpty) {
        decodedBody = jsonDecode(response.body);
      }
    } catch (_) {
      decodedBody = response.body;
    }

    final isSuccess = response.statusCode >= 200 && response.statusCode < 300;

    String? errorMsg;
    if (!isSuccess) {
      if (decodedBody is Map && decodedBody.containsKey('message')) {
        final m = decodedBody['message'];
        errorMsg = m is List ? m.join(', ') : m.toString();
      } else if (response.statusCode == 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (response.statusCode == 403) {
        errorMsg = 'You do not have permission to perform this action.';
      } else {
        errorMsg = 'Request failed (${response.statusCode})';
      }
    }

    return ApiResponse(
      isSuccess: isSuccess,
      statusCode: response.statusCode,
      data: decodedBody,
      errorMessage: errorMsg,
    );
  }
}
