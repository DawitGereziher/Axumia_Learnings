import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/instructor_earnings_model.dart';

class InstructorProvider extends ChangeNotifier {
  InstructorEarningsModel? _earnings;
  bool _isLoading = false;
  bool _isSubmittingPayout = false;
  String? _error;

  InstructorEarningsModel? get earnings => _earnings;
  bool get isLoading => _isLoading;
  bool get isSubmittingPayout => _isSubmittingPayout;
  String? get error => _error;

  Future<void> fetchEarnings() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.earnings);
      if (res.isSuccess && res.data != null) {
        _earnings = InstructorEarningsModel.fromJson(res.data);
      } else {
        _error = res.errorMessage ?? 'Failed to load earnings';
      }
    } catch (e) {
      _error = 'Error loading financial earnings: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<({bool success, String? errorMessage})> requestPayout({
    required double amount,
    required String method,
    required String accountDetails,
  }) async {
    _isSubmittingPayout = true;
    notifyListeners();

    try {
      final res = await ApiClient.post(
        ApiConstants.requestPayout,
        body: {
          'amount': amount,
          'method': method,
          'account_details': accountDetails,
        },
      );

      if (res.isSuccess) {
        await fetchEarnings();
        _isSubmittingPayout = false;
        notifyListeners();
        return (success: true, errorMessage: null);
      } else {
        _isSubmittingPayout = false;
        notifyListeners();
        return (success: false, errorMessage: res.errorMessage ?? 'Payout request failed');
      }
    } catch (e) {
      _isSubmittingPayout = false;
      notifyListeners();
      return (success: false, errorMessage: e.toString());
    }
  }
}
