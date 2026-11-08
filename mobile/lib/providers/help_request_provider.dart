import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/help_request_model.dart';

class HelpRequestProvider extends ChangeNotifier {
  List<HelpRequestModel> _requests = [];
  List<HelpRequestModel> _myRequests = [];
  HelpRequestModel? _currentRequest;
  bool _isLoading = false;
  String? _error;

  List<HelpRequestModel> get requests => _requests;
  List<HelpRequestModel> get myRequests => _myRequests;
  HelpRequestModel? get currentRequest => _currentRequest;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchRequests({String? subject}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final endpoint = subject != null && subject.isNotEmpty
          ? '${ApiConstants.helpRequests}?subject=${Uri.encodeComponent(subject)}'
          : ApiConstants.helpRequests;
      final res = await ApiClient.get(endpoint, requiresAuth: false);
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

  Future<void> fetchMyRequests() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.myHelpRequests);
      if (res.isSuccess && res.data != null) {
        final list = res.data is List ? res.data : res.data['data'] ?? [];
        _myRequests = (list as List).map((r) => HelpRequestModel.fromJson(r)).toList();
      } else {
        _error = res.errorMessage;
      }
    } catch (_) {
      _error = 'Failed to load my requests';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<HelpRequestModel?> fetchRequestDetail(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.helpRequestDetail(id));
      if (res.isSuccess && res.data != null) {
        _currentRequest = HelpRequestModel.fromJson(res.data);
        return _currentRequest;
      } else {
        _error = res.errorMessage;
      }
    } catch (_) {
      _error = 'Failed to load request details';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return null;
  }

  Future<bool> createRequest({
    required String subject,
    required String description,
    required double budget,
    double estimatedHours = 1.0,
    DateTime? deadline,
    String? subjectArea,
  }) async {
    final effectiveDeadline = deadline ?? DateTime.now().add(const Duration(days: 7));
    final res = await ApiClient.post(
      ApiConstants.helpRequests,
      body: {
        'title': subject,
        'subject': subject,
        'description': description,
        'subject_area': subjectArea ?? (subject.length > 20 ? subject.substring(0, 20) : subject),
        'budget_max_per_hour': budget > 0 ? budget : 100.0,
        'estimated_hours': estimatedHours,
        'deadline': effectiveDeadline.toIso8601String(),
      },
    );
    if (res.isSuccess) {
      await fetchRequests();
      await fetchMyRequests();
      return true;
    }
    return false;
  }

  Future<bool> submitBid({
    required String requestId,
    required double amount,
    double estimatedHours = 1.0,
    required String message,
  }) async {
    final res = await ApiClient.post(
      ApiConstants.submitBid(requestId),
      body: {
        'quoted_rate': amount,
        'estimated_hours': estimatedHours,
        'message': message,
      },
    );
    if (res.isSuccess) {
      await fetchRequests();
      await fetchRequestDetail(requestId);
      return true;
    }
    return false;
  }

  Future<({bool success, String? checkoutUrl, String? txRef, HelpSessionModel? session, String? errorMessage})>
      acceptBid(String bidId) async {
    try {
      final res = await ApiClient.patch(ApiConstants.acceptBid(bidId));
      if (res.isSuccess && res.data != null) {
        final checkoutUrl = res.data['checkoutUrl']?.toString();
        final txRef = res.data['txRef']?.toString();
        final rawSession = res.data['session'];
        final session = rawSession != null ? HelpSessionModel.fromJson(rawSession) : null;
        return (success: true, checkoutUrl: checkoutUrl, txRef: txRef, session: session, errorMessage: null);
      }
      return (success: false, checkoutUrl: null, txRef: null, session: null, errorMessage: res.errorMessage ?? 'Could not accept proposal');
    } catch (e) {
      return (success: false, checkoutUrl: null, txRef: null, session: null, errorMessage: e.toString());
    }
  }

  Future<bool> setMeetingLink(String sessionId, String meetingLink) async {
    final res = await ApiClient.patch(
      ApiConstants.setSessionMeetingLink(sessionId),
      body: {'meetingLink': meetingLink},
    );
    return res.isSuccess;
  }

  Future<bool> reportHelperComplete(String sessionId, double actualHours) async {
    final res = await ApiClient.patch(
      ApiConstants.completeHelpSession(sessionId),
      body: {'actualHours': actualHours},
    );
    return res.isSuccess;
  }

  Future<bool> confirmSessionCompletion(String sessionId, bool confirmed) async {
    final res = await ApiClient.patch(
      ApiConstants.confirmHelpSession(sessionId),
      body: {'confirmed': confirmed},
    );
    return res.isSuccess;
  }
}

