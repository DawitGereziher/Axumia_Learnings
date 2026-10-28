import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/help_request_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/help_request_provider.dart';
import 'create_help_request_screen.dart';
import 'help_request_detail_screen.dart';

class HelpMarketplaceScreen extends StatefulWidget {
  const HelpMarketplaceScreen({super.key});

  @override
  State<HelpMarketplaceScreen> createState() => _HelpMarketplaceScreenState();
}

class _HelpMarketplaceScreenState extends State<HelpMarketplaceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HelpRequestProvider>().fetchRequests();
      context.read<HelpRequestProvider>().fetchMyRequests();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showBidModal(BuildContext context, HelpRequestModel request) {
    final amountController = TextEditingController(text: request.budget > 0 ? request.budget.toInt().toString() : '150');
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
              Text('Bidding for: ${request.title}', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 16),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Proposed Rate (ETB/hr)', prefixIcon: Icon(Icons.attach_money_rounded)),
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
    final isInstructor = user?.isInstructor ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Academic Help & Escrow'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelColor: AppColors.primaryLight,
          unselectedLabelColor: AppColors.textMuted,
          tabs: const [
            Tab(text: 'Browse Marketplace'),
            Tab(text: 'My Requests'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final prov = context.read<HelpRequestProvider>();
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CreateHelpRequestScreen()),
          );
          if (mounted) {
            prov.fetchRequests();
            prov.fetchMyRequests();
          }
        },
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Post Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Browse Public Marketplace
          _buildRequestsList(
            context,
            requests: helpProv.requests,
            isLoading: helpProv.isLoading,
            onRefresh: () => helpProv.fetchRequests(),
            isInstructor: isInstructor,
            isMyRequestsTab: false,
          ),

          // Tab 2: My Posted Requests
          _buildRequestsList(
            context,
            requests: helpProv.myRequests,
            isLoading: helpProv.isLoading,
            onRefresh: () => helpProv.fetchMyRequests(),
            isInstructor: isInstructor,
            isMyRequestsTab: true,
          ),
        ],
      ),
    );
  }

  Widget _buildRequestsList(
    BuildContext context, {
    required List<HelpRequestModel> requests,
    required bool isLoading,
    required Future<void> Function() onRefresh,
    required bool isInstructor,
    required bool isMyRequestsTab,
  }) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.primary,
      child: isLoading && requests.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : requests.isEmpty
              ? Center(
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.handshake_outlined, size: 64, color: AppColors.textMuted),
                        const SizedBox(height: 16),
                        Text(
                          isMyRequestsTab ? 'No requests posted yet' : 'No open requests',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isMyRequestsTab
                              ? 'Tap "+ Post Request" to get 1-on-1 personalized tutoring or homework help.'
                              : 'Be the first to post a custom tutoring need or homework request.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  itemCount: requests.length,
                  itemBuilder: (context, index) {
                    final item = requests[index];
                    return InkWell(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => HelpRequestDetailScreen(requestId: item.id),
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
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
                                _buildBadge(item.status),
                                Text(
                                  item.budgetMaxPerHour > 0 ? '${item.budgetMaxPerHour.toStringAsFixed(0)} ETB/hr' : 'Flexible',
                                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 14),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              item.title,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textPrimary),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'By ${item.studentName ?? 'Student'} · ${item.bidsCount} proposal${item.bidsCount == 1 ? '' : 's'}',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                                if (isInstructor && item.isOpen && !isMyRequestsTab)
                                  TextButton.icon(
                                    onPressed: () => _showBidModal(context, item),
                                    icon: const Icon(Icons.send_rounded, size: 14, color: AppColors.primaryLight),
                                    label: const Text('Bid', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
                                  )
                                else
                                  const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildBadge(String status) {
    Color bg;
    Color fg;
    String label;
    switch (status) {
      case 'open':
        bg = AppColors.accentGreen.withOpacity(0.12);
        fg = AppColors.accentGreen;
        label = 'OPEN';
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: fg.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }
}
