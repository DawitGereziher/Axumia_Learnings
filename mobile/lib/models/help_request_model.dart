class HelpRequestModel {
  final String id;
  final String subject;
  final String description;
  final double budget;
  final String status;
  final String? studentName;
  final String? studentId;
  final int bidsCount;
  final DateTime createdAt;

  HelpRequestModel({
    required this.id,
    required this.subject,
    required this.description,
    required this.budget,
    required this.status,
    this.studentName,
    this.studentId,
    this.bidsCount = 0,
    required this.createdAt,
  });

  bool get isOpen => status == 'open';

  factory HelpRequestModel.fromJson(Map<String, dynamic> json) {
    String name = 'Student';
    String? sId;
    if (json['student'] != null) {
      final s = json['student'];
      name = '${s['first_name'] ?? ''} ${s['last_name'] ?? ''}'.trim();
      sId = s['id']?.toString();
    }
    if (name.isEmpty) name = 'Student';

    int count = 0;
    if (json['_count'] != null && json['_count']['bids'] != null) {
      count = int.tryParse(json['_count']['bids'].toString()) ?? 0;
    } else if (json['bids'] is List) {
      count = (json['bids'] as List).length;
    }

    return HelpRequestModel(
      id: json['id']?.toString() ?? '',
      subject: json['subject']?.toString() ?? json['title']?.toString() ?? 'Tutoring Request',
      description: json['description']?.toString() ?? '',
      budget: double.tryParse(json['budget']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'open',
      studentName: name,
      studentId: sId ?? json['student_id']?.toString(),
      bidsCount: count,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
