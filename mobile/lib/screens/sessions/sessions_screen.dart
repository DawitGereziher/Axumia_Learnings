import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/booking_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';

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
              padding: const EdgeInsets.only(right: 12),
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
                                ? 'When students request 1-on-1 tutoring sessions, they will appear here.'
                                : 'Book 1-on-1 sessions with verified tutors to accelerate your learning.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
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
                      return _BookingCard(booking: item);
                    },
                  ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final BookingModel booking;

  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    Color badgeBg;
    String statusText;

    if (booking.isConfirmed) {
      badgeColor = AppColors.accentGreen;
      badgeBg = AppColors.accentGreen.withOpacity(0.12);
      statusText = 'CONFIRMED';
    } else if (booking.isCancelled) {
      badgeColor = AppColors.error;
      badgeBg = AppColors.error.withOpacity(0.12);
      statusText = 'CANCELLED';
    } else {
      badgeColor = AppColors.accentAmber;
      badgeBg = AppColors.accentAmber.withOpacity(0.12);
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
        border: Border.all(color: AppColors.cardBorder),
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

          // Join Meeting Action (if confirmed & link present)
          if (booking.isConfirmed && booking.meetingLink != null) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Meeting link: ${booking.meetingLink}')),
                  );
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
