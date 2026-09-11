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
  });

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
    );
  }
}

class AvailabilitySlotModel {
  final String id;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool isBooked;

  AvailabilitySlotModel({
    required this.id,
    required this.startsAt,
    required this.endsAt,
    required this.isBooked,
  });

  factory AvailabilitySlotModel.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlotModel(
      id: json['id']?.toString() ?? '',
      startsAt: DateTime.tryParse(json['starts_at']?.toString() ?? '') ?? DateTime.now(),
      endsAt: DateTime.tryParse(json['ends_at']?.toString() ?? '') ?? DateTime.now(),
      isBooked: json['booking'] != null,
    );
  }
}
