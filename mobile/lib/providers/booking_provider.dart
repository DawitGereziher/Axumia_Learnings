import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/booking_model.dart';

class BookingRequestResult {
  final bool isSuccess;
  final String? checkoutUrl;
  final String? txRef;
  final BookingModel? booking;
  final String? errorMessage;

  BookingRequestResult({
    required this.isSuccess,
    this.checkoutUrl,
    this.txRef,
    this.booking,
    this.errorMessage,
  });
}

class BookingProvider extends ChangeNotifier {
  List<BookingModel> _bookings = [];
  List<AvailabilitySlotModel> _availableSlots = [];
  List<TutorModel> _tutors = [];
  bool _isLoading = false;
  bool _isLoadingTutors = false;
  String? _error;

  List<BookingModel> get bookings => _bookings;
  List<AvailabilitySlotModel> get availableSlots => _availableSlots;
  List<TutorModel> get tutors => _tutors;
  bool get isLoading => _isLoading;
  bool get isLoadingTutors => _isLoadingTutors;
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

  Future<void> fetchTutors({String? search}) async {
    _isLoadingTutors = true;
    notifyListeners();

    try {
      final queryParams = search != null && search.isNotEmpty ? {'search': search} : null;
      final res = await ApiClient.get(
        ApiConstants.instructors,
        queryParams: queryParams,
        requiresAuth: false,
      );

      if (res.isSuccess && res.data != null) {
        final list = res.data is Map && res.data['data'] != null
            ? res.data['data'] as List
            : (res.data is List ? res.data as List : []);

        _tutors = list.map((t) => TutorModel.fromJson(t)).toList();
      }
    } catch (e) {
      debugPrint('Error fetching tutors: $e');
    } finally {
      _isLoadingTutors = false;
      notifyListeners();
    }
  }

  Future<void> fetchInstructorSlots(String profileId) async {
    _availableSlots = [];
    notifyListeners();

    final res = await ApiClient.get(
      ApiConstants.instructorSlots(profileId),
      requiresAuth: true,
    );

    if (res.isSuccess && res.data is List) {
      _availableSlots = (res.data as List)
          .map((s) => AvailabilitySlotModel.fromJson(s))
          .toList();
      notifyListeners();
    }
  }

  Future<BookingRequestResult> requestBooking({
    required String slotId,
    String? notes,
    String sessionType = '1-on-1',
  }) async {
    final res = await ApiClient.post(
      ApiConstants.requestBooking(slotId),
      body: {'notes': notes, 'session_type': sessionType},
    );

    if (res.isSuccess && res.data is Map) {
      final data = res.data as Map;
      final bookingJson = data['booking'] ?? data;
      final booking = BookingModel.fromJson(bookingJson);
      final checkoutUrl = data['checkoutUrl']?.toString();
      final txRef = data['txRef']?.toString();

      await fetchMyBookings();

      return BookingRequestResult(
        isSuccess: true,
        checkoutUrl: checkoutUrl,
        txRef: txRef,
        booking: booking,
      );
    }

    return BookingRequestResult(
      isSuccess: false,
      errorMessage: res.errorMessage ?? 'Failed to reserve booking slot.',
    );
  }

  Future<bool> createSlot({
    required DateTime startsAt,
    required DateTime endsAt,
    int maxParticipants = 1,
  }) async {
    final res = await ApiClient.post(
      ApiConstants.createSlot,
      body: {
        'starts_at': startsAt.toIso8601String(),
        'ends_at': endsAt.toIso8601String(),
        'max_participants': maxParticipants,
      },
    );
    return res.isSuccess;
  }

  Future<bool> deleteSlot(String slotId) async {
    final res = await ApiClient.delete(ApiConstants.deleteSlot(slotId));
    return res.isSuccess;
  }
}
