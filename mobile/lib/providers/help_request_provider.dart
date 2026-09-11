import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/help_request_model.dart';

class HelpRequestProvider extends ChangeNotifier {
  List<HelpRequestModel> _requests = [];
  bool _isLoading = false;
  String? _error;

  List<HelpRequestModel> get requests => _requests;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchRequests() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.helpRequests, requiresAuth: false);
      if (res.isSuccess && res.data != null) {
        final list = res.data is List ? res.data : res.data['data'] ?? [];
        _requests = (list as List).map((r) => HelpRequestModel.fromJson(r)).toList();
      } else {
        _error = res.errorMessage;
      }
    } catch (_) {
      _error = 'Failed to load requests';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createRequest({
    required String subject,
    required String description,
    required double budget,
  }) async {
    final res = await ApiClient.post(
      ApiConstants.helpRequests,
      body: {
        'subject': subject,
        'description': description,
        'budget': budget,
      },
    );
    if (res.isSuccess) {
      await fetchRequests();
      return true;
    }
    return false;
  }

  Future<bool> submitBid({
    required String requestId,
    required double amount,
    required String message,
  }) async {
    final res = await ApiClient.post(
      '/api/help-requests/$requestId/bids',
      body: {'amount': amount, 'message': message},
    );
    if (res.isSuccess) {
      await fetchRequests();
      return true;
    }
    return false;
  }
}
