class BookingModel {
  final String id;
  final String status;
  final String? meetingLink;
  final String? notes;
  final String? sessionType;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final String otherPartyName;
  final String? otherPartyEmail;
  final double? pricePaid;
  final String? instructorId;

  BookingModel({
    required this.id,
    required this.status,
    this.meetingLink,
    this.notes,
    this.sessionType,
    this.startsAt,
    this.endsAt,
    required this.otherPartyName,
    this.otherPartyEmail,
    this.pricePaid,
    this.instructorId,
  });

  bool get isAwaitingPayment => status == 'awaiting_payment';
  bool get isPending => status == 'pending' || status == 'requested';
  bool get isConfirmed => status == 'confirmed';
  bool get isCancelled => status == 'cancelled';

  factory BookingModel.fromJson(Map<String, dynamic> json, {bool isInstructorView = false}) {
    DateTime? start;
    DateTime? end;
    if (json['slot'] != null) {
      if (json['slot']['starts_at'] != null) {
        start = DateTime.tryParse(json['slot']['starts_at']);
      }
      if (json['slot']['ends_at'] != null) {
        end = DateTime.tryParse(json['slot']['ends_at']);
      }
    }

    String name = 'User';
    String? email;
    if (isInstructorView && json['student'] != null) {
      final s = json['student'];
      name = '${s['first_name'] ?? ''} ${s['last_name'] ?? ''}'.trim();
      email = s['email'];
    } else if (json['instructor'] != null && json['instructor']['user'] != null) {
      final u = json['instructor']['user'];
      name = '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim();
      email = u['email'];
    }

    return BookingModel(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      meetingLink: json['meeting_link']?.toString(),
      notes: json['notes']?.toString(),
      sessionType: json['session_type']?.toString(),
      startsAt: start,
      endsAt: end,
      otherPartyName: name.isNotEmpty ? name : 'Tutor / Student',
      otherPartyEmail: email,
      pricePaid: double.tryParse(json['price_paid']?.toString() ?? '0'),
      instructorId: json['instructor_id']?.toString(),
    );
  }
}

class AvailabilitySlotModel {
  final String id;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool isBooked;
  final int currentParticipants;
  final int maxParticipants;
  final double? hourlyRate;

  AvailabilitySlotModel({
    required this.id,
    required this.startsAt,
    required this.endsAt,
    required this.isBooked,
    this.currentParticipants = 0,
    this.maxParticipants = 1,
    this.hourlyRate,
  });

  bool get isFull => isBooked || currentParticipants >= maxParticipants;

  factory AvailabilitySlotModel.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlotModel(
      id: json['id']?.toString() ?? '',
      startsAt: DateTime.tryParse(json['starts_at']?.toString() ?? '') ?? DateTime.now(),
      endsAt: DateTime.tryParse(json['ends_at']?.toString() ?? '') ?? DateTime.now(),
      isBooked: json['is_booked'] == true || json['booking'] != null,
      currentParticipants: int.tryParse(json['current_participants']?.toString() ?? '0') ?? 0,
      maxParticipants: int.tryParse(json['max_participants']?.toString() ?? '1') ?? 1,
      hourlyRate: json['instructor'] != null
          ? double.tryParse(json['instructor']['hourly_rate']?.toString() ?? '0')
          : null,
    );
  }
}

class TutorModel {
  final String id;
  final String profileId;
  final String name;
  final String? email;
  final String? avatar;
  final String? headline;
  final String? bio;
  final double hourlyRate;
  final double avgRating;
  final int totalStudents;
  final List<String> skills;

  TutorModel({
    required this.id,
    required this.profileId,
    required this.name,
    this.email,
    this.avatar,
    this.headline,
    this.bio,
    this.hourlyRate = 500.0,
    this.avgRating = 0.0,
    this.totalStudents = 0,
    this.skills = const [],
  });

  factory TutorModel.fromJson(Map<String, dynamic> json) {
    final profile = json['instructorProfile'] ?? json;
    final user = json['user'] ?? json;

    final name = '${user['first_name'] ?? ''} ${user['last_name'] ?? ''}'.trim();
    return TutorModel(
      id: user['id']?.toString() ?? profile['user_id']?.toString() ?? '',
      profileId: profile['id']?.toString() ?? '',
      name: name.isNotEmpty ? name : 'Verified Instructor',
      email: user['email']?.toString(),
      avatar: user['image']?.toString() ?? profile['profile_image']?.toString(),
      headline: profile['headline']?.toString() ?? 'Verified Tutor on AXumia',
      bio: profile['bio']?.toString(),
      hourlyRate: double.tryParse(profile['hourly_rate']?.toString() ?? '500') ?? 500.0,
      avgRating: double.tryParse(profile['avg_rating']?.toString() ?? '0') ?? 0.0,
      totalStudents: int.tryParse(profile['total_students']?.toString() ?? '0') ?? 0,
      skills: (profile['skills'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}
