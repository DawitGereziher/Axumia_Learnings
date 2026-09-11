import '../core/constants/api_constants.dart';

class CourseModel {
  final String id;
  final String title;
  final String? slug;
  final String? description;
  final double price;
  final String? thumbnail;
  final bool isPublished;
  final double avgRating;
  final int totalStudents;
  final String? category;
  final CourseInstructorModel? instructor;
  final List<CourseSectionModel> sections;

  CourseModel({
    required this.id,
    required this.title,
    this.slug,
    this.description,
    required this.price,
    this.thumbnail,
    this.isPublished = true,
    this.avgRating = 0.0,
    this.totalStudents = 0,
    this.category,
    this.instructor,
    this.sections = const [],
  });

  bool get isFree => price == 0;

  String? get fullThumbnailUrl {
    if (thumbnail == null || thumbnail!.isEmpty) return null;
    if (thumbnail!.startsWith('http://') || thumbnail!.startsWith('https://')) {
      return thumbnail;
    }
    return '${ApiConstants.r2PublicDomain}/${thumbnail!.replaceAll(RegExp(r'^/+'), '')}';
  }

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled Course',
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      thumbnail: json['thumbnail']?.toString() ?? json['cover_image']?.toString(),
      isPublished: json['is_published'] == true,
      avgRating: double.tryParse(json['avg_rating']?.toString() ?? '0') ?? 0.0,
      totalStudents: json['_count'] != null
          ? int.tryParse(json['_count']['purchases']?.toString() ?? '0') ?? 0
          : int.tryParse(json['total_students']?.toString() ?? '0') ?? 0,
      category: json['category'] != null ? json['category']['name']?.toString() : null,
      instructor: json['instructor'] != null
          ? CourseInstructorModel.fromJson(json['instructor'])
          : null,
      sections: (json['sections'] as List<dynamic>?)
              ?.map((s) => CourseSectionModel.fromJson(s))
              .toList() ??
          [],
    );
  }
}

class CourseInstructorModel {
  final String id;
  final String name;
  final String? avatar;
  final String? headline;

  CourseInstructorModel({
    required this.id,
    required this.name,
    this.avatar,
    this.headline,
  });

  factory CourseInstructorModel.fromJson(Map<String, dynamic> json) {
    final u = json['user'];
    final name = u != null
        ? '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim()
        : 'Instructor';
    return CourseInstructorModel(
      id: json['id']?.toString() ?? '',
      name: name.isNotEmpty ? name : 'Instructor',
      avatar: u != null ? u['image']?.toString() : null,
      headline: json['headline']?.toString(),
    );
  }
}

class CourseSectionModel {
  final String id;
  final String title;
  final int order;
  final List<LessonModel> lessons;

  CourseSectionModel({
    required this.id,
    required this.title,
    required this.order,
    this.lessons = const [],
  });

  factory CourseSectionModel.fromJson(Map<String, dynamic> json) {
    return CourseSectionModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Section',
      order: int.tryParse(json['order']?.toString() ?? '0') ?? 0,
      lessons: (json['lessons'] as List<dynamic>?)
              ?.map((l) => LessonModel.fromJson(l))
              .toList() ??
          [],
    );
  }
}

class LessonModel {
  final String id;
  final String title;
  final String? videoUrl;
  final int durationMinutes;
  final bool isPreview;
  final bool isCompleted;

  LessonModel({
    required this.id,
    required this.title,
    this.videoUrl,
    this.durationMinutes = 0,
    this.isPreview = false,
    this.isCompleted = false,
  });

  factory LessonModel.fromJson(Map<String, dynamic> json) {
    return LessonModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Lesson',
      videoUrl: json['video_url']?.toString(),
      durationMinutes: int.tryParse(json['duration_minutes']?.toString() ?? '0') ?? 0,
      isPreview: json['is_preview'] == true,
      isCompleted: json['is_completed'] == true,
    );
  }
}

class EnrolledCourseModel {
  final String purchaseId;
  final CourseModel course;
  final double progressPct;
  final bool completed;
  final String? lastLessonId;

  EnrolledCourseModel({
    required this.purchaseId,
    required this.course,
    required this.progressPct,
    required this.completed,
    this.lastLessonId,
  });

  factory EnrolledCourseModel.fromJson(Map<String, dynamic> json) {
    final courseData = json['course'] ?? {};
    final progressVal = json['progress'];
    double pct = 0.0;
    if (progressVal is Map && progressVal.containsKey('completionPct')) {
      pct = double.tryParse(progressVal['completionPct'].toString()) ?? 0.0;
    } else if (progressVal != null) {
      pct = double.tryParse(progressVal.toString()) ?? 0.0;
    }

    return EnrolledCourseModel(
      purchaseId: json['id']?.toString() ?? '',
      course: CourseModel.fromJson(courseData),
      progressPct: pct,
      completed: json['completed'] == true || pct >= 100,
      lastLessonId: json['last_lesson_id']?.toString(),
    );
  }
}
