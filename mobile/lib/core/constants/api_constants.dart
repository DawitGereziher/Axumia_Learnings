import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // Automatically select the correct local development host
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    if (Platform.isAndroid) {
      // 10.0.2.2 points to host localhost in Android Emulator
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  // Cloudflare R2 Public Media Domain
  static const String r2PublicDomain =
      'https://pub-690cc2b08ff243269c59174e79778c39.r2.dev';

  // ── Auth Endpoints ──────────────────────────────────────────────────────────
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';

  // ── User & Profile Endpoints ────────────────────────────────────────────────
  static const String me = '/api/users/me';
  static const String myPurchases = '/api/users/me/purchases';
  static const String instructors = '/api/users/instructors';
  static String instructorDetail(String id) => '/api/users/instructors/$id';

  // ── Course Endpoints ────────────────────────────────────────────────────────
  static const String courses = '/api/courses';
  static const String categories = '/api/courses/categories';
  static const String myWishlist = '/api/courses/wishlist/mine';
  static String courseDetail(String slugOrId) => '/api/courses/$slugOrId';
  static String enrollFree(String courseId) => '/api/courses/$courseId/enroll-free';
  static String lessonProgress(String lessonId) => '/api/courses/lessons/$lessonId/progress';
  static String materialDownload(String materialId) => '/api/courses/materials/$materialId/download-url';

  // ── Certificate Endpoints ───────────────────────────────────────────────────
  static const String myCertificates = '/api/certificates';
  static String claimCertificate(String courseId) => '/api/certificates/courses/$courseId';
  static String verifyCertificate(String certNumber) => '/api/certificates/verify/$certNumber';

  // ── Gamification Endpoints ──────────────────────────────────────────────────
  static const String myGamificationStats = '/api/gamification/me';
  static const String leaderboard = '/api/gamification/leaderboard';
  static const String awardXp = '/api/gamification/award';
  static String courseWishlist(String courseId) => '/api/courses/$courseId/wishlist';

  // ── Quiz Endpoints ──────────────────────────────────────────────────────────
  static String lessonQuiz(String lessonId) => '/api/quizzes/lesson/$lessonId';
  static String submitQuizAttempt(String quizId) => '/api/quizzes/$quizId/attempt';
  static String myQuizAttempts(String quizId) => '/api/quizzes/$quizId/attempts/mine';

  // ── 1-on-1 Tutoring & Booking Endpoints ─────────────────────────────────────
  static const String myBookings = '/api/bookings/mine';
  static const String instructorBookings = '/api/bookings/instructor/mine';
  static const String createSlot = '/api/bookings/slots';
  static String deleteSlot(String slotId) => '/api/bookings/slots/$slotId';
  static String instructorSlots(String profileId) => '/api/bookings/instructor/$profileId/slots';
  static String requestBooking(String slotId) => '/api/bookings/request/$slotId';

  // ── Help Requests & Escrow Endpoints ────────────────────────────────────────
  static const String helpRequests = '/api/help-requests';
  static const String myHelpRequests = '/api/help-requests/mine';
  static String helpRequestDetail(String id) => '/api/help-requests/$id';
  static String submitBid(String requestId) => '/api/help-requests/$requestId/bids';
  static String acceptBid(String bidId) => '/api/help-requests/bids/$bidId/accept';
  static String completeHelpSession(String sessionId) => '/api/help-requests/sessions/$sessionId/complete';
  static String confirmHelpSession(String sessionId) => '/api/help-requests/sessions/$sessionId/confirm';
  static String setSessionMeetingLink(String sessionId) => '/api/help-requests/sessions/$sessionId/link';

  // ── Unified Payment & Payout Endpoints ──────────────────────────────────────
  static String checkoutCourse(String courseId) => '/api/payments/courses/$courseId/checkout';
  static String checkoutBooking(String bookingId) => '/api/payments/bookings/$bookingId/checkout';
  static String checkoutHelpSession(String sessionId) => '/api/payments/help-sessions/$sessionId/checkout';
  static String verifyPayment(String txRef) => '/api/payments/verify/$txRef';
  static const String transactions = '/api/payments/transactions';
  static const String earnings = '/api/payments/instructor/earnings';
  static const String requestPayout = '/api/payments/instructor/payout-request';
}
