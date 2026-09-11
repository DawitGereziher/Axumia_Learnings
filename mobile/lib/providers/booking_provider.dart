import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/booking_model.dart';

class BookingProvider extends ChangeNotifier {
  List<BookingModel> _bookings = [];
  List<AvailabilitySlotModel> _availableSlots = [];
  bool _isLoading = false;
  String? _error;

  List<BookingModel> get bookings => _bookings;
  List<AvailabilitySlotModel> get availableSlots => _availableSlots;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchMyBookings({bool isInstructor = false}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final endpoint = isInstructor ? ApiConstants.instructorBookings : ApiConstants.myBookings;
      final res = await ApiClient.get(endpoint);
      if (res.isSuccess && res.data is List) {
        _bookings = (res.data as List)
            .map((b) => BookingModel.fromJson(b, isInstructorView: isInstructor))
            .toList();
      } else {
        _error = res.errorMessage;
      }
    } catch (_) {
      _error = 'Failed to load bookings';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchInstructorSlots(String profileId) async {
    _availableSlots = [];
    notifyListeners();

    final res = await ApiClient.get(
      '/api/bookings/slots/instructor/$profileId',
      requiresAuth: false,
    );
    if (res.isSuccess && res.data is List) {
      _availableSlots = (res.data as List)
          .map((s) => AvailabilitySlotModel.fromJson(s))
          .toList();
      notifyListeners();
    }
  }

  Future<bool> requestBooking({
    required String slotId,
    String? notes,
    String sessionType = '1-on-1',
  }) async {
    final res = await ApiClient.post(
      '/api/bookings/request/$slotId',
      body: {'notes': notes, 'session_type': sessionType},
    );
    if (res.isSuccess) {
      await fetchMyBookings();
      return true;
    }
    return false;
  }
}
