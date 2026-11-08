class PayoutModel {
  final String id;
  final double amount;
  final String currency;
  final String status; // 'pending', 'processing', 'paid', 'rejected'
  final String method; // 'telebirr', 'cbe_birr', 'bank_transfer'
  final String accountDetails;
  final DateTime createdAt;

  PayoutModel({
    required this.id,
    required this.amount,
    required this.currency,
    required this.status,
    required this.method,
    required this.accountDetails,
    required this.createdAt,
  });

  bool get isPaid => status.toLowerCase() == 'paid';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isProcessing => status.toLowerCase() == 'processing';
  bool get isRejected => status.toLowerCase() == 'rejected';

  factory PayoutModel.fromJson(Map<String, dynamic> json) {
    return PayoutModel(
      id: json['id']?.toString() ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      currency: json['currency']?.toString() ?? 'ETB',
      status: json['status']?.toString() ?? 'pending',
      method: json['method']?.toString() ?? 'telebirr',
      accountDetails: json['account_details']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class LedgerItemModel {
  final String id;
  final String type; // 'course_purchase', 'booking', 'help_session'
  final String title;
  final String student;
  final double amount;
  final double net;
  final DateTime date;

  LedgerItemModel({
    required this.id,
    required this.type,
    required this.title,
    required this.student,
    required this.amount,
    required this.net,
    required this.date,
  });

  factory LedgerItemModel.fromJson(Map<String, dynamic> json) {
    return LedgerItemModel(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'course_purchase',
      title: json['title']?.toString() ?? 'Revenue Item',
      student: json['student']?.toString() ?? 'Student',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      net: double.tryParse(json['net']?.toString() ?? '0') ?? 0.0,
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class InstructorEarningsModel {
  final double grossEarned;
  final double platformFees;
  final double netEarned;
  final double totalPaidOut;
  final double totalPendingPayouts;
  final double availableBalance;
  final List<PayoutModel> payouts;
  final List<LedgerItemModel> earningsLedger;

  InstructorEarningsModel({
    required this.grossEarned,
    required this.platformFees,
    required this.netEarned,
    required this.totalPaidOut,
    required this.totalPendingPayouts,
    required this.availableBalance,
    required this.payouts,
    required this.earningsLedger,
  });

  factory InstructorEarningsModel.fromJson(Map<String, dynamic> json) {
    final rawPayouts = json['payouts'];
    final parsedPayouts = rawPayouts is List
        ? rawPayouts.map((p) => PayoutModel.fromJson(p)).toList()
        : <PayoutModel>[];

    final rawLedger = json['earningsLedger'];
    final parsedLedger = rawLedger is List
        ? rawLedger.map((l) => LedgerItemModel.fromJson(l)).toList()
        : <LedgerItemModel>[];

    return InstructorEarningsModel(
      grossEarned: double.tryParse(json['grossEarned']?.toString() ?? '0') ?? 0.0,
      platformFees: double.tryParse(json['platformFees']?.toString() ?? '0') ?? 0.0,
      netEarned: double.tryParse(json['netEarned']?.toString() ?? '0') ?? 0.0,
      totalPaidOut: double.tryParse(json['totalPaidOut']?.toString() ?? '0') ?? 0.0,
      totalPendingPayouts: double.tryParse(json['totalPendingPayouts']?.toString() ?? '0') ?? 0.0,
      availableBalance: double.tryParse(json['availableBalance']?.toString() ?? '0') ?? 0.0,
      payouts: parsedPayouts,
      earningsLedger: parsedLedger,
    );
  }
}
