import '../constants/api_constants.dart';
import '../network/api_client.dart';

enum PayableEntityType {
  course,
  booking,
  helpSession,
}

class PaymentInitiationResult {
  final bool isSuccess;
  final bool isDirectEnrollment;
  final String? checkoutUrl;
  final String? txRef;
  final String? errorMessage;

  PaymentInitiationResult({
    required this.isSuccess,
    this.isDirectEnrollment = false,
    this.checkoutUrl,
    this.txRef,
    this.errorMessage,
  });
}

class PaymentVerificationResult {
  final String status; // 'paid', 'pending', 'failed', 'not_found'
  final String txRef;
  final bool isVerified;
  final double? amount;
  final String? itemTitle;
  final String? entityType;
  final String? entityId;
  final String? courseSlug;
  final String? bookingId;
  final String? helpSessionId;
  final String? errorMessage;

  PaymentVerificationResult({
    required this.status,
    required this.txRef,
    required this.isVerified,
    this.amount,
    this.itemTitle,
    this.entityType,
    this.entityId,
    this.courseSlug,
    this.bookingId,
    this.helpSessionId,
    this.errorMessage,
  });

  bool get isPaid => status == 'paid';
  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed' || status == 'not_found';
}

class PaymentService {
  /// Initiates payment across Courses, Bookings, or Help Sessions.
  /// Bypasses payment gateway for free courses.
  static Future<PaymentInitiationResult> initiateCheckout({
    required PayableEntityType entityType,
    required String entityId,
    bool isFree = false,
  }) async {
    // ── Free course direct enrollment bypass ───────────────────────────────────
    if (entityType == PayableEntityType.course && isFree) {
      final res = await ApiClient.post(ApiConstants.enrollFree(entityId));
      if (res.isSuccess) {
        return PaymentInitiationResult(
          isSuccess: true,
          isDirectEnrollment: true,
        );
      }
      return PaymentInitiationResult(
        isSuccess: false,
        errorMessage: res.errorMessage ?? 'Failed to complete free enrollment.',
      );
    }

    // ── Paid entity checkout via Chapa ─────────────────────────────────────────
    String endpoint;
    switch (entityType) {
      case PayableEntityType.course:
        endpoint = ApiConstants.checkoutCourse(entityId);
        break;
      case PayableEntityType.booking:
        endpoint = ApiConstants.checkoutBooking(entityId);
        break;
      case PayableEntityType.helpSession:
        endpoint = ApiConstants.checkoutHelpSession(entityId);
        break;
    }

    final res = await ApiClient.post(endpoint);
    if (!res.isSuccess || res.data == null) {
      return PaymentInitiationResult(
        isSuccess: false,
        errorMessage: res.errorMessage ?? 'Could not initiate secure payment gateway.',
      );
    }

    final data = res.data;
    if (data is Map) {
      final checkoutUrl = data['checkoutUrl']?.toString();
      final txRef = data['txRef']?.toString();

      if (checkoutUrl != null && checkoutUrl.isNotEmpty) {
        return PaymentInitiationResult(
          isSuccess: true,
          checkoutUrl: checkoutUrl,
          txRef: txRef,
        );
      }
    }

    return PaymentInitiationResult(
      isSuccess: false,
      errorMessage: 'Payment gateway did not provide a valid checkout session URL.',
    );
  }

  /// Verifies transaction status via backend ownership-safe verify endpoint
  static Future<PaymentVerificationResult> verifyPayment(String txRef) async {
    final res = await ApiClient.get(ApiConstants.verifyPayment(txRef));
    if (!res.isSuccess || res.data == null) {
      return PaymentVerificationResult(
        status: 'failed',
        txRef: txRef,
        isVerified: false,
        errorMessage: res.errorMessage ?? 'Failed to verify transaction status.',
      );
    }

    final data = res.data;
    if (data is Map) {
      final status = data['status']?.toString() ?? 'pending';
      final verified = data['verified'] == true;
      final amount = data['amount'] != null ? (double.tryParse(data['amount'].toString()) ?? 0.0) : null;
      final itemTitle = data['itemTitle']?.toString();
      final entityType = data['entityType']?.toString();
      final entityId = data['entityId']?.toString();
      final courseSlug = data['courseSlug']?.toString();
      final bookingId = data['bookingId']?.toString();
      final helpSessionId = data['helpSessionId']?.toString();

      return PaymentVerificationResult(
        status: status,
        txRef: txRef,
        isVerified: verified,
        amount: amount,
        itemTitle: itemTitle,
        entityType: entityType,
        entityId: entityId,
        courseSlug: courseSlug,
        bookingId: bookingId,
        helpSessionId: helpSessionId,
      );
    }

    return PaymentVerificationResult(
      status: 'failed',
      txRef: txRef,
      isVerified: false,
      errorMessage: 'Invalid verification response format.',
    );
  }
}
