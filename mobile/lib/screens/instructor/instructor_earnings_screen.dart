import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/instructor_provider.dart';

class InstructorEarningsScreen extends StatefulWidget {
  const InstructorEarningsScreen({super.key});

  @override
  State<InstructorEarningsScreen> createState() => _InstructorEarningsScreenState();
}

class _InstructorEarningsScreenState extends State<InstructorEarningsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InstructorProvider>().fetchEarnings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showPayoutRequestModal(BuildContext context, double availableBalance) {
    final amountController = TextEditingController();
    final accountController = TextEditingController();
    String selectedMethod = 'telebirr';
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
                  const Text('Request Payout', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Available for withdrawal: ${availableBalance.toStringAsFixed(2)} ETB',
                style: const TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.w700, fontSize: 13),
              ),
              const SizedBox(height: 18),

              // Payout Method Selector
              const Text('Payout Channel', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildMethodOption('telebirr', 'Telebirr', Icons.phone_android_rounded, selectedMethod, (m) {
                    setModalState(() => selectedMethod = m);
                  }),
                  const SizedBox(width: 8),
                  _buildMethodOption('cbe_birr', 'CBE Birr', Icons.account_balance_wallet_rounded, selectedMethod, (m) {
                    setModalState(() => selectedMethod = m);
                  }),
                  const SizedBox(width: 8),
                  _buildMethodOption('bank_transfer', 'Bank', Icons.account_balance_rounded, selectedMethod, (m) {
                    setModalState(() => selectedMethod = m);
                  }),
                ],
              ),
              const SizedBox(height: 16),

              // Amount
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Amount (ETB)',
                  prefixIcon: const Icon(Icons.payments_rounded),
                  suffixText: 'ETB',
                  helperText: 'Max: ${availableBalance.toStringAsFixed(0)} ETB',
                ),
              ),
              const SizedBox(height: 14),

              // Account Details
              TextField(
                controller: accountController,
                decoration: InputDecoration(
                  labelText: selectedMethod == 'bank_transfer' ? 'Bank Name, Account # & Full Name' : 'Registered Mobile Number (e.g. 0911223344)',
                  hintText: selectedMethod == 'bank_transfer' ? 'Commercial Bank of Ethiopia - 1000...' : '09xxxxxxxx',
                  prefixIcon: const Icon(Icons.person_pin_rounded),
                ),
              ),
              const SizedBox(height: 20),

              // Submit
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final amt = double.tryParse(amountController.text) ?? 0;
                          final details = accountController.text.trim();
                          if (amt <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter a valid payout amount')),
                            );
                            return;
                          }
                          if (amt > availableBalance) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Requested amount exceeds available balance')),
                            );
                            return;
                          }
                          if (details.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter your account details')),
                            );
                            return;
                          }

                          setModalState(() => isSubmitting = true);
                          final res = await context.read<InstructorProvider>().requestPayout(
                                amount: amt,
                                method: selectedMethod,
                                accountDetails: details,
                              );
                          if (ctx.mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(res.success ? 'Payout request submitted successfully!' : res.errorMessage ?? 'Request failed'),
                                backgroundColor: res.success ? AppColors.accentGreen : AppColors.error,
                              ),
                            );
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGreen,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Confirm Payout Request', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMethodOption(String id, String label, IconData icon, String current, ValueChanged<String> onSelect) {
    final isSelected = id == current;
    return Expanded(
      child: GestureDetector(
        onTap: () => onSelect(id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary.withOpacity(0.18) : AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.cardBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: isSelected ? AppColors.primaryLight : AppColors.textMuted),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppColors.textPrimary : AppColors.textMuted,
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
    final prov = context.watch<InstructorProvider>();
    final earnings = prov.earnings;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings & Financial Ledger'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => prov.fetchEarnings(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => prov.fetchEarnings(),
        color: AppColors.primary,
        child: prov.isLoading && earnings == null
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : earnings == null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.account_balance_wallet_outlined, size: 56, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          Text(
                            prov.error ?? 'Could not load instructor financial ledger',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => prov.fetchEarnings(),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Primary Balance Card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(22),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.accentGreen.withOpacity(0.08),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Available for Payout',
                                    style: TextStyle(color: AppColors.textMuted, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.accentGreen.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'READY',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.accentGreen),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${earnings.availableBalance.toStringAsFixed(2)} ETB',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textPrimary,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 18),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: earnings.availableBalance > 0
                                      ? () => _showPayoutRequestModal(context, earnings.availableBalance)
                                      : null,
                                  icon: const Icon(Icons.arrow_outward_rounded, size: 18),
                                  label: const Text('Request Payout', style: TextStyle(fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.accentGreen,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 18),

                        // Metric Breakdown Grid
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricTile(
                                label: 'Gross Revenue',
                                value: '${earnings.grossEarned.toStringAsFixed(0)} ETB',
                                icon: Icons.trending_up_rounded,
                                iconColor: AppColors.primaryLight,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildMetricTile(
                                label: 'Platform Fee (15%)',
                                value: '-${earnings.platformFees.toStringAsFixed(0)} ETB',
                                icon: Icons.pie_chart_outline_rounded,
                                iconColor: AppColors.accentAmber,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricTile(
                                label: 'Net Earned (85%)',
                                value: '${earnings.netEarned.toStringAsFixed(0)} ETB',
                                icon: Icons.account_balance_wallet_rounded,
                                iconColor: AppColors.accentGreen,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildMetricTile(
                                label: 'Total Paid Out',
                                value: '${earnings.totalPaidOut.toStringAsFixed(0)} ETB',
                                icon: Icons.check_circle_outline_rounded,
                                iconColor: AppColors.primaryLight,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Tabs Section: Ledger & Payout History
                        TabBar(
                          controller: _tabController,
                          indicatorColor: AppColors.primary,
                          indicatorWeight: 3,
                          labelColor: AppColors.primaryLight,
                          unselectedLabelColor: AppColors.textMuted,
                          tabs: [
                            Tab(text: 'Ledger (${earnings.earningsLedger.length})'),
                            Tab(text: 'Payouts (${earnings.payouts.length})'),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Tab Content
                        SizedBox(
                          height: 400,
                          child: TabBarView(
                            controller: _tabController,
                            children: [
                              // Tab 1: Financial Ledger
                              earnings.earningsLedger.isEmpty
                                  ? const Center(
                                      child: Text('No earning transactions recorded yet.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                                    )
                                  : ListView.builder(
                                      itemCount: earnings.earningsLedger.length,
                                      itemBuilder: (context, index) {
                                        final item = earnings.earningsLedger[index];
                                        return Container(
                                          margin: const EdgeInsets.only(bottom: 10),
                                          padding: const EdgeInsets.all(14),
                                          decoration: BoxDecoration(
                                            color: AppColors.surface,
                                            borderRadius: BorderRadius.circular(14),
                                            border: Border.all(color: AppColors.cardBorder),
                                          ),
                                          child: Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary.withOpacity(0.12),
                                                  borderRadius: BorderRadius.circular(10),
                                                ),
                                                child: Icon(
                                                  item.type == 'course_purchase' ? Icons.menu_book_rounded : Icons.schedule_rounded,
                                                  color: AppColors.primaryLight,
                                                  size: 20,
                                                ),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      item.title,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                                    ),
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      '${item.student} · ${_formatDate(item.date)}',
                                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.end,
                                                children: [
                                                  Text(
                                                    '+${item.net.toStringAsFixed(0)} ETB',
                                                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 13),
                                                  ),
                                                  Text(
                                                    'Gross: ${item.amount.toStringAsFixed(0)}',
                                                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),

                              // Tab 2: Payout Requests History
                              earnings.payouts.isEmpty
                                  ? const Center(
                                      child: Text('No payout requests yet.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                                    )
                                  : ListView.builder(
                                      itemCount: earnings.payouts.length,
                                      itemBuilder: (context, index) {
                                        final p = earnings.payouts[index];
                                        return Container(
                                          margin: const EdgeInsets.only(bottom: 10),
                                          padding: const EdgeInsets.all(14),
                                          decoration: BoxDecoration(
                                            color: AppColors.surface,
                                            borderRadius: BorderRadius.circular(14),
                                            border: Border.all(color: AppColors.cardBorder),
                                          ),
                                          child: Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: AppColors.surfaceElevated,
                                                  borderRadius: BorderRadius.circular(10),
                                                ),
                                                child: const Icon(Icons.outbox_rounded, color: AppColors.accentGreen, size: 20),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      '${p.amount.toStringAsFixed(0)} ${p.currency}',
                                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                                    ),
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      '${p.method.toUpperCase()} · ${p.accountDetails}',
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              _buildPayoutStatusBadge(p.status),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
          ),
        ],
      ),
    );
  }

  Widget _buildPayoutStatusBadge(String status) {
    Color bg;
    Color fg;
    String label;
    switch (status.toLowerCase()) {
      case 'paid':
        bg = AppColors.accentGreen.withOpacity(0.12);
        fg = AppColors.accentGreen;
        label = 'PAID';
        break;
      case 'processing':
        bg = AppColors.primary.withOpacity(0.12);
        fg = AppColors.primaryLight;
        label = 'PROCESSING';
        break;
      case 'pending':
        bg = AppColors.accentAmber.withOpacity(0.12);
        fg = AppColors.accentAmber;
        label = 'PENDING';
        break;
      case 'rejected':
        bg = AppColors.error.withOpacity(0.12);
        fg = AppColors.error;
        label = 'REJECTED';
        break;
      default:
        bg = AppColors.surfaceElevated;
        fg = AppColors.textMuted;
        label = status.toUpperCase();
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg)),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
