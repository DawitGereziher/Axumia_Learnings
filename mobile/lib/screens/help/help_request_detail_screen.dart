import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/payment_service.dart';
import '../../models/help_request_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/help_request_provider.dart';
import '../payment/chapa_checkout_screen.dart';
import '../payment/payment_result_screen.dart';

class HelpRequestDetailScreen extends StatefulWidget {
  final String requestId;

  const HelpRequestDetailScreen({super.key, required this.requestId});

  @override
  State<HelpRequestDetailScreen> createState() => _HelpRequestDetailScreenState();
}

class _HelpRequestDetailScreenState extends State<HelpRequestDetailScreen> {
  bool _isProcessingAction = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HelpRequestProvider>().fetchRequestDetail(widget.requestId);
    });
  }

  Future<void> _handleAcceptBid(HelpBidModel bid) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Accept Proposal & Escrow Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'You are accepting ${bid.helperName}\'s proposal.',
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Hourly Rate:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text('${bid.quotedRate.toStringAsFixed(0)} ETB/hr', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estimated Hours:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text('${bid.estimatedHours} hrs', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Escrow Deposit:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text('${bid.totalEstimate.toStringAsFixed(0)} ETB',
                          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 15)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              '🔒 Funds are securely held in escrow until the session is successfully completed and you confirm release.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11, height: 1.4),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentGreen,
              foregroundColor: Colors.white,
            ),
            child: const Text('Proceed to Payment'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _isProcessingAction = true);
    final result = await context.read<HelpRequestProvider>().acceptBid(bid.id);
    if (!mounted) return;
    setState(() => _isProcessingAction = false);

    if (result.success && result.checkoutUrl != null) {
      final nav = Navigator.of(context);
      final paidRef = await nav.push<String>(
        MaterialPageRoute(
          builder: (_) => ChapaCheckoutScreen(
            checkoutUrl: result.checkoutUrl!,
            txRef: result.txRef ?? '',
            itemTitle: 'Escrow: ${bid.helperName}',
            entityType: PayableEntityType.helpSession,
          ),
        ),
      );

      if (paidRef != null && mounted) {
        nav.pushReplacement(
          MaterialPageRoute(
            builder: (_) => PaymentResultScreen(
              txRef: paidRef,
              entityType: PayableEntityType.helpSession,
            ),
          ),
        );
      } else if (mounted) {
        context.read<HelpRequestProvider>().fetchRequestDetail(widget.requestId);
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.errorMessage ?? 'Failed to accept proposal'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handleReleaseEscrow(String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Release Escrow Funds?'),
        content: const Text(
          'Confirm that the tutor delivered the requested tutoring and you are satisfied with the session. This will release the escrow payout to the instructor.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGreen),
            child: const Text('Release Payment'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isProcessingAction = true);
    final ok = await context.read<HelpRequestProvider>().confirmSessionCompletion(sessionId, true);
    if (!mounted) return;
    setState(() => _isProcessingAction = false);

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Escrow released! Session marked completed.'), backgroundColor: AppColors.accentGreen),
      );
      context.read<HelpRequestProvider>().fetchRequestDetail(widget.requestId);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to release escrow.'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _handleDispute(String sessionId) async {
    final dispute = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Dispute Session?'),
        content: const Text(
          'If the tutor did not show up or did not fulfill the agreement, you can open a dispute. Funds will be held until admin investigation.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Confirm Dispute'),
          ),
        ],
      ),
    );

    if (dispute != true || !mounted) return;

    setState(() => _isProcessingAction = true);
    final ok = await context.read<HelpRequestProvider>().confirmSessionCompletion(sessionId, false);
    if (!mounted) return;
    setState(() => _isProcessingAction = false);

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session disputed. Admin notified for mediation.'), backgroundColor: AppColors.warning),
      );
      context.read<HelpRequestProvider>().fetchRequestDetail(widget.requestId);
    }
  }

  void _showSetMeetingLinkModal(BuildContext context, String sessionId) {
    final linkController = TextEditingController();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Provide Video Meeting Link', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 6),
              const Text('Enter a valid Google Meet or Zoom link for the student to join.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              const SizedBox(height: 16),
              TextField(
                controller: linkController,
                decoration: const InputDecoration(
                  labelText: 'Meeting URL',
                  hintText: 'https://meet.google.com/abc-defg-hij',
                  prefixIcon: Icon(Icons.video_call_rounded),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final link = linkController.text.trim();
                          if (link.isEmpty) return;
                          setModalState(() => isSaving = true);
                          final ok = await context.read<HelpRequestProvider>().setMeetingLink(sessionId, link);
                          if (ctx.mounted) {
                            Navigator.pop(ctx);
                            if (ok) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Meeting link updated!'), backgroundColor: AppColors.accentGreen),
                              );
                              context.read<HelpRequestProvider>().fetchRequestDetail(widget.requestId);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Failed to set link. Must be Zoom or Google Meet.'), backgroundColor: AppColors.error),
                              );
                            }
                          }
                        },
                  child: isSaving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Save & Start Session'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBidModal(BuildContext context, HelpRequestModel request) {
    final amountController = TextEditingController(text: request.budgetMaxPerHour > 0 ? request.budgetMaxPerHour.toInt().toString() : '150');
    final hoursController = TextEditingController(text: request.estimatedHours.toString());
    final messageController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Submit Proposal', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 6),
              Text('Topic: ${request.title}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Rate (ETB/hr)', prefixIcon: Icon(Icons.attach_money_rounded)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: hoursController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Est. Hours', prefixIcon: Icon(Icons.schedule_rounded)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Pitch / Proposal Message',
                  hintText: 'Explain your qualifications and approach to solving this...',
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final rate = double.tryParse(amountController.text) ?? 0;
                          final hours = double.tryParse(hoursController.text) ?? 1.0;
                          final msg = messageController.text.trim();
                          if (rate <= 0 || msg.isEmpty) return;

                          setModalState(() => isSubmitting = true);
                          final ok = await context.read<HelpRequestProvider>().submitBid(
                                requestId: request.id,
                                amount: rate,
                                estimatedHours: hours,
                                message: msg,
                              );
                          if (ctx.mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(ok ? 'Proposal submitted successfully!' : 'Failed to submit proposal'),
                                backgroundColor: ok ? AppColors.accentGreen : AppColors.error,
                              ),
                            );
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Send Proposal'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final helpProv = context.watch<HelpRequestProvider>();
    final request = helpProv.currentRequest;
    final isOwner = user != null && request != null && (user.id == request.studentId || user.email == request.studentName);
    final isInstructor = user?.isInstructor ?? false;

    if (helpProv.isLoading && request == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (request == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Request Detail')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text(helpProv.error ?? 'Request not found'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => helpProv.fetchRequestDetail(widget.requestId),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final session = request.session;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Help Request'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => helpProv.fetchRequestDetail(widget.requestId),
          ),
        ],
      ),
      bottomNavigationBar: (isInstructor && request.isOpen && !isOwner)
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.cardBorder)),
              ),
              child: SafeArea(
                child: ElevatedButton.icon(
                  onPressed: () => _showBidModal(context, request),
                  icon: const Icon(Icons.handshake_rounded),
                  label: const Text('Submit a Proposal'),
                ),
              ),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => helpProv.fetchRequestDetail(widget.requestId),
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (request.subjectArea != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                            ),
                            child: Text(
                              request.subjectArea!.toUpperCase(),
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                            ),
                          ),
                        _buildStatusBadge(request.status),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      request.title,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.person_outline_rounded, size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 6),
                        Text(request.studentName ?? 'Student', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                        const Spacer(),
                        const Icon(Icons.payments_outlined, size: 16, color: AppColors.accentGreen),
                        const SizedBox(width: 6),
                        Text(
                          '${request.budgetMaxPerHour.toStringAsFixed(0)} ETB/hr (~${request.estimatedHours} hrs)',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.accentGreen),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    const Text('Description & Requirements', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textMuted)),
                    const SizedBox(height: 6),
                    Text(
                      request.description,
                      style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Active Session / Escrow Status Card (if session exists)
              if (session != null) ...[
                _buildSessionEscrowCard(context, session, request, isOwner, isInstructor),
                const SizedBox(height: 20),
              ],

              // Bids / Proposals Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Proposals (${request.bids.length})',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: AppColors.textPrimary),
                  ),
                  if (request.isOpen)
                    const Text('Accepting bids', style: TextStyle(fontSize: 12, color: AppColors.accentGreen, fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 12),

              if (request.bids.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.hourglass_empty_rounded, size: 36, color: AppColors.textMuted),
                      const SizedBox(height: 10),
                      const Text('No proposals yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 4),
                      const Text(
                        'Verified instructors will review your request and send custom quotes soon.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                )
              else
                ...request.bids.map((bid) => _buildBidCard(context, bid, request, isOwner)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg;
    Color fg;
    String label;
    switch (status) {
      case 'open':
        bg = AppColors.accentGreen.withOpacity(0.12);
        fg = AppColors.accentGreen;
        label = 'OPEN FOR BIDS';
        break;
      case 'in_progress':
        bg = AppColors.primary.withOpacity(0.12);
        fg = AppColors.primaryLight;
        label = 'IN PROGRESS';
        break;
      case 'completed':
        bg = AppColors.accentGreen.withOpacity(0.12);
        fg = AppColors.accentGreen;
        label = 'COMPLETED';
        break;
      case 'cancelled':
        bg = AppColors.error.withOpacity(0.12);
        fg = AppColors.error;
        label = 'CANCELLED';
        break;
      default:
        bg = AppColors.cardBorder;
        fg = AppColors.textMuted;
        label = status.toUpperCase();
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg)),
    );
  }

  Widget _buildSessionEscrowCard(BuildContext context, HelpSessionModel session, HelpRequestModel request, bool isOwner, bool isInstructor) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_rounded, size: 20, color: AppColors.primaryLight),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Escrow Protected Session', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    Text(
                      'Status: ${session.status.replaceAll('_', ' ').toUpperCase()}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: session.isCompleted
                            ? AppColors.accentGreen
                            : session.isAwaitingPayment
                                ? AppColors.warning
                                : AppColors.primaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Awaiting payment banner
          if (session.isAwaitingPayment && isOwner) ...[
            const Text(
              'Your proposal acceptance is pending escrow funding. Please complete the Chapa checkout to confirm the session.',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isProcessingAction
                    ? null
                    : () async {
                        final nav = Navigator.of(context);
                        setState(() => _isProcessingAction = true);
                        final res = await context.read<HelpRequestProvider>().acceptBid(widget.requestId);
                        if (!mounted) return;
                        setState(() => _isProcessingAction = false);
                        if (res.checkoutUrl != null) {
                          nav.push(
                            MaterialPageRoute(
                              builder: (_) => ChapaCheckoutScreen(
                                checkoutUrl: res.checkoutUrl!,
                                txRef: res.txRef ?? '',
                                itemTitle: 'Confirm Tutoring Escrow',
                                entityType: PayableEntityType.helpSession,
                              ),
                            ),
                          );
                        }
                      },
                icon: const Icon(Icons.payment_rounded),
                label: const Text('Pay & Lock Escrow'),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGreen),
              ),
            ),
          ],

          // Active / Scheduled session
          if (session.isScheduled || session.isLive) ...[
            if (session.meetingLink != null && session.meetingLink!.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.videocam_rounded, color: AppColors.primaryLight),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        session.meetingLink!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.open_in_new_rounded, size: 20, color: AppColors.primaryLight),
                      onPressed: () async {
                        final uri = Uri.parse(session.meetingLink!);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final uri = Uri.parse(session.meetingLink!);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Launch Video Session'),
                ),
              ),
            ] else ...[
              const Text(
                'Waiting for the instructor to attach the Zoom/Google Meet video link.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              if (isInstructor) ...[
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showSetMeetingLinkModal(context, session.id),
                    icon: const Icon(Icons.add_link_rounded),
                    label: const Text('Set Meeting Link'),
                  ),
                ),
              ],
            ],
          ],

          // Helper Completed (Student confirmation needed)
          if (session.isHelperCompleted) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.warning.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tutor Reported Completion', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.warning)),
                  const SizedBox(height: 4),
                  Text(
                    'Actual Hours Reported: ${session.actualHours ?? 1} hrs.\nPlease verify the tutoring was provided and release escrow.',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            if (isOwner) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isProcessingAction ? null : () => _handleDispute(session.id),
                      style: OutlinedButton.styleFrom(foregroundColor: AppColors.error),
                      child: const Text('Dispute'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isProcessingAction ? null : () => _handleReleaseEscrow(session.id),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGreen),
                      child: const Text('Release Escrow'),
                    ),
                  ),
                ],
              ),
            ],
          ],

          // Completed
          if (session.isCompleted) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.accentGreen.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: AppColors.accentGreen, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Session finished & escrow funds paid out successfully.',
                      style: TextStyle(fontSize: 12, color: AppColors.accentGreen, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBidCard(BuildContext context, HelpBidModel bid, HelpRequestModel request, bool isOwner) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: bid.isAccepted ? AppColors.accentGreen.withOpacity(0.6) : AppColors.cardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.primary.withOpacity(0.2),
                backgroundImage: bid.helperAvatar != null ? NetworkImage(bid.helperAvatar!) : null,
                child: bid.helperAvatar == null
                    ? Text(
                        bid.helperName.isNotEmpty ? bid.helperName[0].toUpperCase() : 'T',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bid.helperName,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
                    ),
                    if (bid.helperHeadline != null)
                      Text(
                        bid.helperHeadline!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${bid.totalEstimate.toStringAsFixed(0)} ETB',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 15),
                  ),
                  Text(
                    '${bid.quotedRate.toStringAsFixed(0)} ETB/h · ${bid.estimatedHours}h',
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            bid.message,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 12),

          // Status & Action button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (bid.isAccepted)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreen.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('ACCEPTED', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.accentGreen)),
                )
              else if (bid.isRejected)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('DECLINED', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.error)),
                )
              else
                const Text('Pending review', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),

              if (isOwner && request.isOpen && bid.isPending)
                ElevatedButton.icon(
                  onPressed: _isProcessingAction ? null : () => _handleAcceptBid(bid),
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
                  label: const Text('Accept & Pay Escrow', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
