import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/course_model.dart';

class CourseProvider extends ChangeNotifier {
  List<CourseModel> _courses = [];
  List<EnrolledCourseModel> _enrolledCourses = [];
  List<String> _categories = ['All'];
  String _selectedCategory = 'All';
  String _searchQuery = '';
  bool _isLoading = false;
  bool _isLoadingEnrolled = false;
  String? _error;

  List<CourseModel> get courses => _courses;
  List<EnrolledCourseModel> get enrolledCourses => _enrolledCourses;
  List<String> get categories => _categories;
  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  bool get isLoadingEnrolled => _isLoadingEnrolled;
  String? get error => _error;

  List<CourseModel> get filteredCourses {
    return _courses.where((c) {
      final matchesSearch = _searchQuery.isEmpty ||
          c.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (c.description?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);

      final matchesCategory = _selectedCategory == 'All' ||
          (c.category?.toLowerCase() == _selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    }).toList();
  }

  Future<void> fetchCourses() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.courses, requiresAuth: false);
      if (res.isSuccess && res.data != null) {
        final list = res.data is List ? res.data : res.data['data'] ?? [];
        _courses = (list as List).map((e) => CourseModel.fromJson(e)).toList();
      } else {
        _error = res.errorMessage;
      }

      // Fetch categories
      final catRes = await ApiClient.get(ApiConstants.categories, requiresAuth: false);
      if (catRes.isSuccess && catRes.data is List) {
        final cats = (catRes.data as List)
            .map((e) => e is Map ? e['name']?.toString() : e.toString())
            .whereType<String>()
            .toList();
        _categories = ['All', ...cats];
      }
    } catch (e) {
      _error = 'Failed to load courses';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchEnrolledCourses() async {
    _isLoadingEnrolled = true;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.myPurchases);
      if (res.isSuccess && res.data is List) {
        _enrolledCourses = (res.data as List)
            .map((e) => EnrolledCourseModel.fromJson(e))
            .toList();
      }
    } catch (_) {
      // silent
    } finally {
      _isLoadingEnrolled = false;
      notifyListeners();
    }
  }

  Future<CourseModel?> fetchCourseDetail(String slugOrId) async {
    final res = await ApiClient.get('${ApiConstants.courses}/$slugOrId', requiresAuth: false);
    if (res.isSuccess && res.data != null) {
      return CourseModel.fromJson(res.data);
    }
    return null;
  }

  Future<bool> enrollFree(String courseId) async {
    final res = await ApiClient.post('${ApiConstants.courses}/$courseId/enroll-free');
    if (res.isSuccess) {
      await fetchEnrolledCourses();
      return true;
    }
    return false;
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }
}
