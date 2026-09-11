class UserModel {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String role;
  final String? image;
  final bool isEmailVerified;
  final String? preferredLanguage;
  final InstructorProfileModel? instructorProfile;

  UserModel({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    required this.role,
    this.image,
    this.isEmailVerified = false,
    this.preferredLanguage,
    this.instructorProfile,
  });

  String get fullName {
    final first = firstName ?? '';
    final last = lastName ?? '';
    final full = '$first $last'.trim();
    return full.isNotEmpty ? full : email.split('@').first;
  }

  bool get isInstructor => role == 'instructor' || role == 'admin';
  bool get isAdmin => role == 'admin';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      firstName: json['first_name']?.toString() ?? json['name']?.toString(),
      lastName: json['last_name']?.toString(),
      role: json['role']?.toString() ?? 'student',
      image: json['image']?.toString(),
      isEmailVerified: json['is_email_verified'] == true,
      preferredLanguage: json['preferred_language']?.toString(),
      instructorProfile: json['instructorProfile'] != null
          ? InstructorProfileModel.fromJson(json['instructorProfile'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'role': role,
      'image': image,
      'is_email_verified': isEmailVerified,
      'preferred_language': preferredLanguage,
    };
  }
}

class InstructorProfileModel {
  final String id;
  final String? headline;
  final String? bio;
  final double hourlyRate;
  final String kycStatus;
  final double avgRating;
  final int totalStudents;
  final List<String> skills;

  InstructorProfileModel({
    required this.id,
    this.headline,
    this.bio,
    required this.hourlyRate,
    required this.kycStatus,
    required this.avgRating,
    required this.totalStudents,
    required this.skills,
  });

  factory InstructorProfileModel.fromJson(Map<String, dynamic> json) {
    return InstructorProfileModel(
      id: json['id']?.toString() ?? '',
      headline: json['headline']?.toString(),
      bio: json['bio']?.toString(),
      hourlyRate: double.tryParse(json['hourly_rate']?.toString() ?? '0') ?? 0.0,
      kycStatus: json['kyc_status']?.toString() ?? 'pending',
      avgRating: double.tryParse(json['avg_rating']?.toString() ?? '0') ?? 0.0,
      totalStudents: int.tryParse(json['total_students']?.toString() ?? '0') ?? 0,
      skills: (json['skills'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}
