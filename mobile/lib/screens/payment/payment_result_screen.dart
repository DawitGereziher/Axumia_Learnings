import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/payment_service.dart';
import '../main_nav_screen.dart';

class PaymentResultScreen extends StatefulWidget {
  final String txRef;
  final PayableEntityType entityType;
  final bool initialFailed;

  const PaymentResultScreen({
    super.key,
    required this.txRef,
    required this.entityType,
    this.initialFailed = false,
  });

  @override
  State<PaymentResultScreen> createState() => _PaymentResultScreenState();
}

class _PaymentResultScreenState extends State<PaymentResultScreen> {
  PaymentVerificationResult? _result;
  bool _isLoading = true;
  Timer? _pollingTimer;
  int _pollCount = 0;
  static const int _maxPolls = 10; // 30 seconds total (3s * 10)

  @override
  void initState() {
    super.initState();
    if (widget.initialFailed) {
      _isLoading = false;
      _result = PaymentVerificationResult(
        status: 'failed',
        txRef: widget.txRef,
        isVerified: false,
        errorMessage: 'Transaction was cancelled or declined by the provider.',
      );
    } else {
      _verifyPayment();
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _verifyPayment() async {
    final res = await PaymentService.verifyPayment(widget.txRef);
    if (!mounted) return;

    setState(() {
      _result = res;
      _isLoading = false;
    });

    if (res.isPending && _pollCount < _maxPolls) {
      _pollCount++;
      _pollingTimer?.cancel();
      _pollingTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) _verifyPayment();
      });
    }
  }

  void _navigateToDestination() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MainNavScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Transaction Receipt'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: _isLoading ? _buildLoadingView() : _buildContent(),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingView() {
    return const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: 52,
          height: 52,
          child: CircularProgressIndicator(color: AppColors.accentGreen, strokeWidth: 3),
        ),
        SizedBox(height: 24),
        Text(
          'Verifying Payment...',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppColors.textPrimary),
        ),
        SizedBox(height: 8),
        Text(
          'Confirming transaction status with Chapa Gateway.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
        ),
      ],
    );
  }

  Widget _buildContent() {
    final status = _result?.status ?? 'failed';

    if (status == 'paid') {
      return _buildSuccessCard();
    } else if (status == 'pending') {
      return _buildPendingCard();
    } else {
      return _buildFailedCard();
    }
  }

  Widget _buildSuccessCard() {
    final isHelpSession = widget.entityType == PayableEntityType.helpSession;
    final isBooking = widget.entityType == PayableEntityType.booking;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Glowing Success Icon
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.accentGreen.withOpacity(0.15),
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.accentGreen.withOpacity(0.35), width: 2),
            boxShadow: [
              BoxShadow(
                color: AppColors.accentGreen.withOpacity(0.2),
                blurRadius: 24,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Icon(Icons.check_circle_rounded, color: AppColors.accentGreen, size: 48),
        ),
        const SizedBox(height: 20),

        // Verified Pill
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.accentGreen.withOpacity(0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.verified_rounded, size: 13, color: AppColors.accentGreen),
              SizedBox(width: 5),
              Text(
                'PAYMENT CONFIRMED',
                style: TextStyle(
                  color: AppColors.accentGreen,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        const Text(
          'Payment Successful!',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        Text(
          isHelpSession
              ? 'Your escrow payment has been secured. Your tutor has been notified.'
              : isBooking
                  ? 'Your 1-on-1 session is confirmed! Meeting details are ready in your dashboard.'
                  : 'Enrollment confirmed! You now have full lifetime access to this course.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 24),

        // Receipt Summary Box
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            children: [
              if (_result?.itemTitle != null) ...[
                _buildReceiptRow('Item', _result!.itemTitle!, isBold: true),
                const Divider(height: 16, color: AppColors.cardBorder),
              ],
              if (_result?.amount != null && _result!.amount! > 0) ...[
                _buildReceiptRow(
                  'Amount Paid',
                  '${_result!.amount!.toStringAsFixed(0)} ETB',
                  valueColor: AppColors.accentGreen,
                  isBold: true,
                ),
                const Divider(height: 16, color: AppColors.cardBorder),
              ],
              _buildReceiptRow('Reference ID', widget.txRef, isMonospace: true),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Escrow Safety Badge (if Help Session)
        if (isHelpSession)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary.withOpacity(0.25)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.shield_rounded, size: 20, color: AppColors.primaryLight),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Axumia Escrow Protection: Funds are safely held in escrow until you verify the task is complete.',
                    style: TextStyle(fontSize: 12, color: AppColors.primaryLight, height: 1.35),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 28),

        // Action Buttons
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _navigateToDestination,
            icon: const Icon(Icons.arrow_forward_rounded, size: 18),
            label: Text(
              isHelpSession
                  ? 'View My Help Requests'
                  : isBooking
                      ? 'View My Bookings'
                      : 'Start Learning Now',
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPendingCard() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.accentAmber.withOpacity(0.15),
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.accentAmber.withOpacity(0.35)),
          ),
          child: const Icon(Icons.hourglass_top_rounded, color: AppColors.accentAmber, size: 42),
        ),
        const SizedBox(height: 20),
        const Text(
          'Payment In Progress',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        const Text(
          'We are awaiting confirmation from the bank gateway. You may refresh the status below.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Text(
            'Ref: ${widget.txRef}',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontFamily: 'monospace'),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              setState(() => _isLoading = true);
              _verifyPayment();
            },
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Refresh Status'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(height: 10),
        TextButton(
          onPressed: _navigateToDestination,
          child: const Text('Return to Home', style: TextStyle(color: AppColors.textMuted)),
        ),
      ],
    );
  }

  Widget _buildFailedCard() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.error.withOpacity(0.15),
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.error.withOpacity(0.35)),
          ),
          child: const Icon(Icons.close_rounded, color: AppColors.error, size: 44),
        ),
        const SizedBox(height: 20),
        const Text(
          'Payment Unsuccessful',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        Text(
          _result?.errorMessage ?? 'The transaction could not be completed. No funds have been deducted.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Text(
            'Ref: ${widget.txRef}',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontFamily: 'monospace'),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Try Again'),
          ),
        ),
        const SizedBox(height: 10),
        TextButton(
          onPressed: _navigateToDestination,
          child: const Text('Return to Home', style: TextStyle(color: AppColors.textMuted)),
        ),
      ],
    );
  }

  Widget _buildReceiptRow(
    String label,
    String value, {
    Color? valueColor,
    bool isBold = false,
    bool isMonospace = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              color: valueColor ?? AppColors.textPrimary,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontFamily: isMonospace ? 'monospace' : null,
            ),
          ),
        ),
      ],
    );
  }
}
