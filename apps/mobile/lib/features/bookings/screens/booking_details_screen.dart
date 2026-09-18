import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/models/models.dart';
import '../../../providers/app_providers.dart';
import '../../../widgets/common_widgets.dart';

class BookingDetailsScreen extends ConsumerStatefulWidget {
  final String bookingId;

  const BookingDetailsScreen({super.key, required this.bookingId});

  @override
  ConsumerState<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends ConsumerState<BookingDetailsScreen> {
  AppointmentModel? _appointment;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchBookingDetails();
  }

  Future<void> _fetchBookingDetails() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.dio.get('/bookings/${widget.bookingId}');
      if (res.data['success'] == true) {
        setState(() {
          _appointment = AppointmentModel.fromJson(res.data['booking']);
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _showRescheduleDialog() {
    if (_appointment == null) return;
    DateTime selectedDate = DateTime.parse(_appointment!.date);
    String selectedTime = _appointment!.startTime;
    List<AvailableSlotModel> availableSlots = [];
    bool loadingSlots = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> loadSlotsForDate(DateTime date) async {
            setModalState(() => loadingSlots = true);
            final dateStr = date.toIso8601String().split('T')[0];
            try {
              final res = await ApiClient.dio.get('/slots/available', queryParameters: {
                'date': dateStr,
                'service_id': _appointment!.serviceId,
              });
              if (res.data['success'] == true) {
                final slots = (res.data['slots'] as List<dynamic>?)
                        ?.map((s) => AvailableSlotModel.fromJson(s as Map<String, dynamic>))
                        .toList() ??
                    [];
                setModalState(() {
                  availableSlots = slots;
                  loadingSlots = false;
                  if (slots.isNotEmpty) {
                    selectedTime = slots[0].time;
                  }
                });
              }
            } catch (e) {
              setModalState(() => loadingSlots = false);
            }
          }

          if (availableSlots.isEmpty && !loadingSlots) {
            loadSlotsForDate(selectedDate);
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Reschedule Appointment',
                      style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 8),

                // Date Picker Button
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_month, color: AppColors.primary),
                  title: const Text('Select New Date', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(selectedDate.toIso8601String().split('T')[0]),
                  trailing: const Icon(Icons.arrow_drop_down),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 60)),
                    );
                    if (picked != null) {
                      setModalState(() => selectedDate = picked);
                      loadSlotsForDate(picked);
                    }
                  },
                ),
                const SizedBox(height: 12),

                // Slot Picker
                Text(
                  'AVAILABLE TIME SLOTS',
                  style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                loadingSlots
                    ? const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
                    : availableSlots.isEmpty
                        ? const Center(child: Padding(padding: EdgeInsets.all(16), child: Text('No slots available on this date.')))
                        : Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: availableSlots.map((slot) {
                              final isSel = selectedTime == slot.time;
                              return ChoiceChip(
                                label: Text(slot.formattedTime),
                                selected: isSel,
                                selectedColor: AppColors.primary,
                                onSelected: (val) {
                                  if (val) setModalState(() => selectedTime = slot.time);
                                },
                              );
                            }).toList(),
                          ),
                const SizedBox(height: 24),

                // Confirm Reschedule Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () async {
                      final newDateStr = selectedDate.toIso8601String().split('T')[0];
                      Navigator.pop(ctx);
                      final success = await ref.read(bookingsProvider.notifier).rescheduleBooking(
                            _appointment!.id,
                            newDateStr,
                            selectedTime,
                          );
                      if (success) {
                        _fetchBookingDetails();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Appointment rescheduled successfully!')),
                        );
                      }
                    },
                    child: const Text('Confirm Reschedule'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showCancelDialog() {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Appointment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Are you sure you want to cancel this appointment? The slot will be released and customer notified.'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(hintText: 'Cancellation reason (optional)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep Appointment')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusCancelled),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(bookingsProvider.notifier).cancelBooking(
                    _appointment!.id,
                    reason: reasonController.text.trim(),
                  );
              if (success) {
                _fetchBookingDetails();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Appointment cancelled.')),
                );
              }
            },
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );
  }

  void _showNoShowDialog() {
    final reasonController = TextEditingController(text: 'Customer did not show up');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark as No-Show'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Mark customer as No-Show and update customer attendance history:'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(labelText: 'Reason / Note'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Back')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusNoShow),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(bookingsProvider.notifier).markNoShow(
                    _appointment!.id,
                    reason: reasonController.text.trim(),
                  );
              if (success) {
                _fetchBookingDetails();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Marked as No-Show.')),
                );
              }
            },
            child: const Text('Mark No-Show'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null || _appointment == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Appointment Details')),
        body: ErrorStateView(error: _error ?? 'Not found', onRetry: _fetchBookingDetails),
      );
    }

    final appt = _appointment!;

    return Scaffold(
      appBar: AppBar(
        title: Text(appt.bookingId),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Center(child: StatusBadge(status: appt.status)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Customer Details Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CUSTOMER DETAILS',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          letterSpacing: 0.8,
                        ),
                      ),
                      SourceBadge(source: appt.source),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: AppColors.primary.withOpacity(0.15),
                        child: Text(
                          appt.customerName.isNotEmpty ? appt.customerName[0].toUpperCase() : 'C',
                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              appt.customerName,
                              style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              appt.customerPhone,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Opening WhatsApp chat with ${appt.customerPhone}...')),
                            );
                          },
                          icon: const Icon(Icons.chat, size: 16, color: AppColors.whatsapp),
                          label: const Text('WhatsApp'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Calling ${appt.customerPhone}...')),
                            );
                          },
                          icon: const Icon(Icons.call, size: 16, color: AppColors.primary),
                          label: const Text('Call'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Service & Staff Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SERVICE & APPOINTMENT SCHEDULE',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _DetailRow(icon: Icons.spa_outlined, label: 'Service', value: '${appt.serviceName} (${appt.serviceDuration} mins)'),
                  const SizedBox(height: 10),
                  _DetailRow(icon: Icons.person_outline, label: 'Assigned Staff', value: appt.staffName),
                  const SizedBox(height: 10),
                  _DetailRow(icon: Icons.calendar_today_outlined, label: 'Date', value: appt.date),
                  const SizedBox(height: 10),
                  _DetailRow(icon: Icons.access_time, label: 'Time Slot', value: '${appt.formattedStartTime} - ${appt.formattedEndTime}'),
                  const SizedBox(height: 10),
                  _DetailRow(icon: Icons.attach_money, label: 'Price', value: '${appt.currency}${appt.price.toStringAsFixed(0)}'),
                  if (appt.notes != null && appt.notes!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    _DetailRow(icon: Icons.notes_outlined, label: 'Notes', value: appt.notes!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Action Buttons based on status
            if (appt.status == 'CONFIRMED' || appt.status == 'PENDING' || appt.status == 'RESCHEDULED') ...[
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final success = await ref.read(bookingsProvider.notifier).completeBooking(appt.id);
                    if (success) {
                      _fetchBookingDetails();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Appointment completed! Feedback follow-up dispatched to WhatsApp.')),
                      );
                    }
                  },
                  icon: const Icon(Icons.check_circle_outline, size: 18),
                  label: const Text('Mark Completed'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusCompleted),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _showRescheduleDialog,
                      icon: const Icon(Icons.calendar_sync, size: 16),
                      label: const Text('Reschedule'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _showNoShowDialog,
                      icon: const Icon(Icons.person_off_outlined, size: 16, color: AppColors.statusNoShow),
                      label: const Text('No-Show', style: TextStyle(color: AppColors.statusNoShow)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: _showCancelDialog,
                  icon: const Icon(Icons.cancel_outlined, size: 16, color: AppColors.statusCancelled),
                  label: const Text('Cancel Appointment', style: TextStyle(color: AppColors.statusCancelled)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        Text('$label: ', style: const TextStyle(fontSize: 13, color: Colors.grey)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
