class HelpBidModel {
  final String id;
  final double quotedRate;
  final double estimatedHours;
  final String message;
  final String status; // 'pending', 'accepted', 'rejected'
  final DateTime createdAt;
  final String helperName;
  final String? helperHeadline;
  final String? helperAvatar;
  final String helperId;

  HelpBidModel({
    required this.id,
    required this.quotedRate,
    required this.estimatedHours,
    required this.message,
    required this.status,
    required this.createdAt,
    required this.helperName,
    this.helperHeadline,
    this.helperAvatar,
    required this.helperId,
  });

  bool get isPending => status == 'pending';
  bool get isAccepted => status == 'accepted';
  bool get isRejected => status == 'rejected';
  double get totalEstimate => quotedRate * estimatedHours;

  factory HelpBidModel.fromJson(Map<String, dynamic> json) {
    String name = 'Verified Tutor';
    String? headline;
    String? avatar;
    String hId = '';

    if (json['helper'] != null) {
      final helper = json['helper'];
      hId = helper['id']?.toString() ?? '';
      headline = helper['headline']?.toString();
      if (helper['user'] != null) {
        final u = helper['user'];
        name = '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim();
        avatar = u['image']?.toString();
      }
    }
    if (name.isEmpty) name = 'Verified Tutor';

    return HelpBidModel(
      id: json['id']?.toString() ?? '',
      quotedRate: double.tryParse(json['quoted_rate']?.toString() ?? json['amount']?.toString() ?? '0') ?? 0.0,
      estimatedHours: double.tryParse(json['estimated_hours']?.toString() ?? '1') ?? 1.0,
      message: json['message']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
      helperName: name,
      helperHeadline: headline,
      helperAvatar: avatar,
      helperId: hId,
    );
  }
}

class HelpSessionModel {
  final String id;
  final String status; // 'awaiting_payment', 'scheduled', 'in_progress', 'completed', 'cancelled'
  final String? meetingLink;
  final double? actualHours;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? platform;

  HelpSessionModel({
    required this.id,
    required this.status,
    this.meetingLink,
    this.actualHours,
    this.startedAt,
    this.completedAt,
    this.platform,
  });

  bool get isAwaitingPayment => status == 'awaiting_payment';
  bool get isScheduled => status == 'scheduled';
  bool get isLive => status == 'in_progress';
  bool get isHelperCompleted => status == 'helper_completed';
  bool get isCompleted => status == 'completed';
  bool get isDisputed => status == 'disputed';

  factory HelpSessionModel.fromJson(Map<String, dynamic> json) {
    return HelpSessionModel(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'scheduled',
      meetingLink: json['meeting_link']?.toString(),
      actualHours: double.tryParse(json['actual_hours']?.toString() ?? ''),
      startedAt: json['started_at'] != null ? DateTime.tryParse(json['started_at']) : null,
      completedAt: json['completed_at'] != null ? DateTime.tryParse(json['completed_at']) : null,
      platform: json['platform']?.toString(),
    );
  }
}

class HelpRequestModel {
  final String id;
  final String title;
  final String description;
  final String? subjectArea;
  final double budgetMaxPerHour;
  final double estimatedHours;
  final DateTime? deadline;
  final String status; // 'open', 'in_progress', 'completed', 'cancelled'
  final String? studentName;
  final String? studentId;
  final int bidsCount;
  final DateTime createdAt;
  final List<HelpBidModel> bids;
  final HelpSessionModel? session;

  HelpRequestModel({
    required this.id,
    required this.title,
    required this.description,
    this.subjectArea,
    required this.budgetMaxPerHour,
    this.estimatedHours = 1.0,
    this.deadline,
    required this.status,
    this.studentName,
    this.studentId,
    this.bidsCount = 0,
    required this.createdAt,
    this.bids = const [],
    this.session,
  });

  bool get isOpen => status == 'open';
  bool get isInProgress => status == 'in_progress';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';
  double get totalBudgetEstimate => budgetMaxPerHour * estimatedHours;

  // Backward compatibility getter
  String get subject => title;
  double get budget => totalBudgetEstimate;

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

    final rawBids = json['bids'];
    final parsedBids = rawBids is List ? rawBids.map((b) => HelpBidModel.fromJson(b)).toList() : <HelpBidModel>[];

    final rawSession = json['session'];
    final parsedSession = rawSession is Map ? HelpSessionModel.fromJson(Map<String, dynamic>.from(rawSession)) : null;

    final rawBudget = json['budget_max_per_hour'] ?? json['budget'] ?? '0';

    return HelpRequestModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? json['subject']?.toString() ?? 'Tutoring Request',
      description: json['description']?.toString() ?? '',
      subjectArea: json['subject_area']?.toString(),
      budgetMaxPerHour: double.tryParse(rawBudget.toString()) ?? 0.0,
      estimatedHours: double.tryParse(json['estimated_hours']?.toString() ?? '1') ?? 1.0,
      deadline: json['deadline'] != null ? DateTime.tryParse(json['deadline']) : null,
      status: json['status']?.toString() ?? 'open',
      studentName: name,
      studentId: sId ?? json['student_id']?.toString(),
      bidsCount: count > 0 ? count : parsedBids.length,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
      bids: parsedBids,
      session: parsedSession,
    );
  }
}
