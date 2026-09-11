import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/help_request_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/help_request_provider.dart';
import 'create_help_request_screen.dart';

class HelpMarketplaceScreen extends StatefulWidget {
  const HelpMarketplaceScreen({super.key});

  @override
  State<HelpMarketplaceScreen> createState() => _HelpMarketplaceScreenState();
}

class _HelpMarketplaceScreenState extends State<HelpMarketplaceScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HelpRequestProvider>().fetchRequests();
    });
  }

  void _showBidModal(BuildContext context, HelpRequestModel request) {
    final amountController = TextEditingController(text: request.budget > 0 ? request.budget.toInt().toString() : '');
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
              Text('Bidding for: ${request.subject}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Proposed Amount (ETB)', prefixIcon: Icon(Icons.attach_money_rounded)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Pitch / Message to Student', hintText: 'Explain how you will solve this problem...'),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final amt = double.tryParse(amountController.text) ?? 0;
                          final msg = messageController.text.trim();
                          if (amt <= 0 || msg.isEmpty) return;

                          setModalState(() => isSubmitting = true);
                          final ok = await context.read<HelpRequestProvider>().submitBid(
                                requestId: request.id,
                                amount: amt,
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
    final requests = helpProv.requests;
    final isInstructor = user?.isInstructor ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Help Marketplace'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CreateHelpRequestScreen()),
          );
        },
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Post Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () => helpProv.fetchRequests(),
        color: AppColors.primary,
        child: helpProv.isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : requests.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.handshake_outlined, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Text(
                            'No open requests',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Be the first to post a custom tutoring need or homework request.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    itemCount: requests.length,
                    itemBuilder: (context, index) {
                      final item = requests[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentGreen.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                                  ),
                                  child: const Text(
                                    'OPEN',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.accentGreen),
                                  ),
                                ),
                                Text(
                                  item.budget > 0 ? '${item.budget.toStringAsFixed(0)} ETB' : 'Flexible',
                                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 14),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              item.subject,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textPrimary),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item.description,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'By ${item.studentName ?? 'Student'} · ${item.bidsCount} bids',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                                if (isInstructor && item.isOpen)
                                  TextButton.icon(
                                    onPressed: () => _showBidModal(context, item),
                                    icon: const Icon(Icons.send_rounded, size: 14, color: AppColors.primaryLight),
                                    label: const Text('Bid', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
