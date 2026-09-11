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

  // Auth endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';

  // User endpoints
  static const String me = '/api/users/me';
  static const String myPurchases = '/api/users/me/purchases';
  static const String instructors = '/api/users/instructors';

  // Course endpoints
  static const String courses = '/api/courses';
  static const String categories = '/api/courses/categories';
  static const String myWishlist = '/api/courses/wishlist/mine';

  // Bookings endpoints
  static const String myBookings = '/api/bookings/mine';
  static const String instructorBookings = '/api/bookings/instructor/mine';
  static const String createSlot = '/api/bookings/slots';

  // Help Requests
  static const String helpRequests = '/api/help-requests';
  static const String myHelpRequests = '/api/help-requests/mine';

  // Payments
  static const String transactions = '/api/payments/transactions';
  static const String earnings = '/api/payments/instructor/earnings';
}
