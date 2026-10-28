import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/payment_service.dart';
import '../../models/booking_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../payment/chapa_checkout_screen.dart';
import 'tutor_detail_screen.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  bool _isInstructorView = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBookings();
    });
  }

  void _loadBookings() {
    context.read<BookingProvider>().fetchMyBookings(isInstructor: _isInstructorView);
  }

  void _showTutorsModal(BuildContext context) {
    context.read<BookingProvider>().fetchTutors();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.75,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (ctx, scrollController) {
            final bookingProv = ctx.watch<BookingProvider>();
            final tutors = bookingProv.tutors;

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Find a Verified Tutor',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Book personalized 1-on-1 tutoring sessions with expert instructors.',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Search tutors by name or subject...',
                      prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.textMuted),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                      fillColor: AppColors.surfaceElevated,
                    ),
                    onChanged: (val) => context.read<BookingProvider>().fetchTutors(search: val),
                  ),
                  const SizedBox(height: 14),
                  Expanded(
                    child: bookingProv.isLoadingTutors
                        ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                        : tutors.isEmpty
                            ? const Center(
                                child: Text('No verified tutors found matching your search.', style: TextStyle(color: AppColors.textMuted)),
                              )
                            : ListView.builder(
                                controller: scrollController,
                                itemCount: tutors.length,
                                itemBuilder: (ctx, idx) {
                                  final tutor = tutors[idx];
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceElevated,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: AppColors.cardBorder),
                                    ),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: AppColors.primary,
                                        backgroundImage: tutor.avatar != null ? NetworkImage(tutor.avatar!) : null,
                                        child: tutor.avatar == null
                                            ? Text(tutor.name.isNotEmpty ? tutor.name[0] : 'T', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                                            : null,
                                      ),
                                      title: Text(tutor.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                      subtitle: Text(
                                        tutor.headline ?? 'Verified Tutor',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                      ),
                                      trailing: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            '${tutor.hourlyRate.toStringAsFixed(0)} ETB/h',
                                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 13),
                                          ),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.star_rounded, size: 14, color: AppColors.accentAmber),
                                              Text(
                                                tutor.avgRating > 0 ? tutor.avgRating.toStringAsFixed(1) : '5.0',
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      onTap: () {
                                        Navigator.pop(ctx);
                                        Navigator.of(context).push(
                                          MaterialPageRoute(builder: (_) => TutorDetailScreen(tutor: tutor)),
                                        );
                                      },
                                    ),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showCreateSlotDialog(BuildContext context) {
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
    TimeOfDay selectedTime = const TimeOfDay(hour: 10, minute: 0);
    int durationMinutes = 60;
    int maxParticipants = 1;
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Add Availability Slot', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Date & Time', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              const SizedBox(height: 6),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today_rounded, color: AppColors.primaryLight, size: 20),
                title: Text(
                  DateFormat('EEE, MMM d, yyyy').format(selectedDate),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                trailing: TextButton(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (picked != null) setDialogState(() => selectedDate = picked);
                  },
                  child: const Text('Change Date'),
                ),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.access_time_rounded, color: AppColors.primaryLight, size: 20),
                title: Text(
                  selectedTime.format(context),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                trailing: TextButton(
                  onPressed: () async {
                    final picked = await showTimePicker(context: context, initialTime: selectedTime);
                    if (picked != null) setDialogState(() => selectedTime = picked);
                  },
                  child: const Text('Change Time'),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Duration', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  DropdownButton<int>(
                    value: durationMinutes,
                    dropdownColor: AppColors.surfaceElevated,
                    items: const [
                      DropdownMenuItem(value: 30, child: Text('30 mins')),
                      DropdownMenuItem(value: 60, child: Text('60 mins')),
                      DropdownMenuItem(value: 90, child: Text('90 mins')),
                    ],
                    onChanged: (val) => setDialogState(() => durationMinutes = val ?? 60),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Max Students', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  DropdownButton<int>(
                    value: maxParticipants,
                    dropdownColor: AppColors.surfaceElevated,
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('1 (Private)')),
                      DropdownMenuItem(value: 3, child: Text('3 (Small Group)')),
                      DropdownMenuItem(value: 5, child: Text('5 (Group Study)')),
                    ],
                    onChanged: (val) => setDialogState(() => maxParticipants = val ?? 1),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
            ),
            ElevatedButton(
              onPressed: isSaving
                  ? null
                  : () async {
                      setDialogState(() => isSaving = true);
                      final start = DateTime(
                        selectedDate.year,
                        selectedDate.month,
                        selectedDate.day,
                        selectedTime.hour,
                        selectedTime.minute,
                      );
                      final end = start.add(Duration(minutes: durationMinutes));

                      final ok = await context.read<BookingProvider>().createSlot(
                            startsAt: start,
                            endsAt: end,
                            maxParticipants: maxParticipants,
                          );

                      if (ctx.mounted) {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(ok ? 'Availability slot created!' : 'Failed to create slot'),
                            backgroundColor: ok ? AppColors.accentGreen : AppColors.error,
                          ),
                        );
                      }
                    },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: isSaving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Publish Slot'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final bookingProv = context.watch<BookingProvider>();
    final bookings = bookingProv.bookings;
    final isInstructor = user?.isInstructor ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Sessions'),
        actions: [
          if (isInstructor)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TextButton.icon(
                onPressed: () {
                  setState(() {
                    _isInstructorView = !_isInstructorView;
                    _loadBookings();
                  });
                },
                icon: Icon(
                  _isInstructorView ? Icons.school_outlined : Icons.co_present_outlined,
                  size: 16,
                  color: AppColors.primaryLight,
                ),
                label: Text(
                  _isInstructorView ? 'Student Mode' : 'Tutor Mode',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: _isInstructorView
          ? FloatingActionButton.extended(
              onPressed: () => _showCreateSlotDialog(context),
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('Add Slot', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : FloatingActionButton.extended(
              onPressed: () => _showTutorsModal(context),
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.person_search_rounded, color: Colors.white),
              label: const Text('Find a Tutor', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
      body: RefreshIndicator(
        onRefresh: () async => _loadBookings(),
        color: AppColors.primary,
        child: bookingProv.isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : bookings.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.calendar_month_outlined, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          Text(
                            _isInstructorView ? 'No student bookings yet' : 'No upcoming sessions',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isInstructorView
                                ? 'When students book your availability slots, reservations will appear here.'
                                : 'Connect 1-on-1 with verified tutors to accelerate your learning.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                          ),
                          const SizedBox(height: 20),
                          if (!_isInstructorView)
                            ElevatedButton.icon(
                              onPressed: () => _showTutorsModal(context),
                              icon: const Icon(Icons.search_rounded, size: 16),
                              label: const Text('Browse Verified Tutors'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                            ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    itemCount: bookings.length,
                    itemBuilder: (context, index) {
                      final item = bookings[index];
                      return _BookingCard(booking: item, onPaymentSuccess: _loadBookings);
                    },
                  ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback onPaymentSuccess;

  const _BookingCard({required this.booking, required this.onPaymentSuccess});

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    Color badgeBg;
    String statusText;

    if (booking.isConfirmed) {
      badgeColor = AppColors.accentGreen;
      badgeBg = AppColors.accentGreen.withOpacity(0.12);
      statusText = 'CONFIRMED';
    } else if (booking.isAwaitingPayment) {
      badgeColor = AppColors.accentAmber;
      badgeBg = AppColors.accentAmber.withOpacity(0.15);
      statusText = 'PAYMENT PENDING';
    } else if (booking.isCancelled) {
      badgeColor = AppColors.error;
      badgeBg = AppColors.error.withOpacity(0.12);
      statusText = 'CANCELLED';
    } else {
      badgeColor = AppColors.primaryLight;
      badgeBg = AppColors.primaryLight.withOpacity(0.12);
      statusText = 'PENDING';
    }

    final formattedDate = booking.startsAt != null
        ? DateFormat('EEE, MMM d · hh:mm a').format(booking.startsAt!)
        : 'Scheduled Session';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: booking.isAwaitingPayment ? AppColors.accentAmber.withOpacity(0.4) : AppColors.cardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Name + Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.primary.withOpacity(0.15),
                    child: Text(
                      booking.otherPartyName.isNotEmpty ? booking.otherPartyName[0] : 'U',
                      style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    booking.otherPartyName,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: badgeColor.withOpacity(0.3)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: badgeColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Date / Time Box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated.withOpacity(0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time_rounded, size: 15, color: AppColors.primaryLight),
                const SizedBox(width: 8),
                Text(
                  formattedDate,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),

          // Session Notes (if any)
          if (booking.notes != null && booking.notes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Note: ${booking.notes}',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontStyle: FontStyle.italic),
            ),
          ],

          // ── Payment Pending Action Button ────────────────────────────────────
          if (booking.isAwaitingPayment) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.accentAmber.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.accentAmber.withOpacity(0.25)),
              ),
              child: const Text(
                'Slot reserved! Please complete payment to confirm your booking and notify the tutor.',
                style: TextStyle(fontSize: 11.5, color: AppColors.accentAmber, height: 1.35),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  final res = await PaymentService.initiateCheckout(
                    entityType: PayableEntityType.booking,
                    entityId: booking.id,
                  );
                  if (context.mounted) {
                    if (res.isSuccess && res.checkoutUrl != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ChapaCheckoutScreen(
                            checkoutUrl: res.checkoutUrl!,
                            txRef: res.txRef ?? '',
                            itemTitle: 'Session with ${booking.otherPartyName}',
                            entityType: PayableEntityType.booking,
                          ),
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(res.errorMessage ?? 'Payment initiation failed'), backgroundColor: AppColors.error),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.credit_card_rounded, size: 16),
                label: const Text('Pay & Confirm Slot'),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              ),
            ),
          ],

          // ── Join Video Meeting Action Button ─────────────────────────────────
          if (booking.isConfirmed && booking.meetingLink != null) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  final uri = Uri.tryParse(booking.meetingLink!);
                  if (uri != null && await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Could not open meeting link: ${booking.meetingLink}')),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.videocam_rounded, size: 18),
                label: const Text('Join Video Meeting'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGreen,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
