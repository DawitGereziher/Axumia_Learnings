import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/payment_service.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../payment/chapa_checkout_screen.dart';

class TutorDetailScreen extends StatefulWidget {
  final TutorModel tutor;

  const TutorDetailScreen({super.key, required this.tutor});

  @override
  State<TutorDetailScreen> createState() => _TutorDetailScreenState();
}

class _TutorDetailScreenState extends State<TutorDetailScreen> {
  AvailabilitySlotModel? _selectedSlot;
  String _sessionType = '1-on-1';
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  final Map<String, double> _multipliers = {
    '1-on-1': 1.0,
    'Group Study': 0.7,
    'Consultation': 1.25,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().fetchInstructorSlots(widget.tutor.profileId);
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  double get _totalPrice {
    final base = widget.tutor.hourlyRate;
    final mult = _multipliers[_sessionType] ?? 1.0;
    return (base * mult);
  }

  Future<void> _handleBookSession() async {
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an available time slot.'), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final result = await context.read<BookingProvider>().requestBooking(
          slotId: _selectedSlot!.id,
          sessionType: _sessionType,
          notes: _notesController.text.trim(),
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result.isSuccess && result.checkoutUrl != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ChapaCheckoutScreen(
            checkoutUrl: result.checkoutUrl!,
            txRef: result.txRef ?? '',
            itemTitle: 'Live Tutoring with ${widget.tutor.name}',
            entityType: PayableEntityType.booking,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.errorMessage ?? 'Failed to reserve booking slot.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final slots = bookingProv.availableSlots;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.tutor.name),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tutor Profile Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 34,
                    backgroundColor: AppColors.primary,
                    backgroundImage: widget.tutor.avatar != null ? NetworkImage(widget.tutor.avatar!) : null,
                    child: widget.tutor.avatar == null
                        ? Text(
                            widget.tutor.name.isNotEmpty ? widget.tutor.name[0] : 'T',
                            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.tutor.name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.tutor.headline ?? 'Verified AXumia Instructor',
                          style: const TextStyle(fontSize: 12, color: AppColors.primaryLight),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, size: 16, color: AppColors.accentAmber),
                            const SizedBox(width: 4),
                            Text(
                              widget.tutor.avgRating > 0 ? widget.tutor.avgRating.toStringAsFixed(1) : '5.0',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            const SizedBox(width: 14),
                            Text(
                              '${widget.tutor.hourlyRate.toStringAsFixed(0)} ETB/hr',
                              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentGreen, fontSize: 13),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Bio
            if (widget.tutor.bio != null && widget.tutor.bio!.isNotEmpty) ...[
              const Text('About the Instructor', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 6),
              Text(
                widget.tutor.bio!,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 24),
            ],

            // Session Type Selector
            const Text('Select Session Type', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            Row(
              children: _multipliers.keys.map((type) {
                final isSelected = _sessionType == type;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _sessionType = type),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary.withOpacity(0.18) : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? AppColors.primaryLight : AppColors.cardBorder,
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            type,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? AppColors.primaryLight : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${(widget.tutor.hourlyRate * (_multipliers[type] ?? 1.0)).toStringAsFixed(0)} ETB',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? AppColors.accentGreen : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Availability Slots
            const Text('Available Time Slots', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            slots.isEmpty
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: const Text(
                      'No available booking slots currently published by this tutor.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                  )
                : Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: slots.map((slot) {
                      final isSelected = _selectedSlot?.id == slot.id;
                      final isFull = slot.isFull;
                      final dateStr = DateFormat('EEE, MMM d · hh:mm a').format(slot.startsAt);

                      return ChoiceChip(
                        label: Text(
                          isFull ? '$dateStr (Full)' : dateStr,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : isFull
                                    ? AppColors.textMuted
                                    : AppColors.textPrimary,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.surface,
                        disabledColor: AppColors.surfaceElevated.withOpacity(0.3),
                        side: BorderSide(
                          color: isSelected ? AppColors.primaryLight : AppColors.cardBorder,
                        ),
                        onSelected: isFull
                            ? null
                            : (val) {
                                setState(() => _selectedSlot = val ? slot : null);
                              },
                      );
                    }).toList(),
                  ),
            const SizedBox(height: 24),

            // Notes field
            const Text('Session Goals or Notes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'e.g. Help with Data Structures recursion assignment...',
              ),
            ),
            const SizedBox(height: 32),

            // Book & Pay CTA
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Investment', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                      const SizedBox(height: 2),
                      Text(
                        '${_totalPrice.toStringAsFixed(0)} ETB',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppColors.accentGreen),
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _handleBookSession,
                    icon: _isSubmitting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.credit_card_rounded, size: 16),
                    label: const Text('Book & Pay'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
