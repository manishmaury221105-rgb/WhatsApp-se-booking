import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/app_providers.dart';
import '../../../widgets/common_widgets.dart';
import 'booking_details_screen.dart';
import 'create_booking_screen.dart';

class BookingsListScreen extends ConsumerWidget {
  const BookingsListScreen({super.key});

  static const _statusFilters = [
    'ALL',
    'CONFIRMED',
    'PENDING',
    'COMPLETED',
    'RESCHEDULED',
    'CANCELLED',
    'NO_SHOW',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsState = ref.watch(bookingsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('All Appointments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, size: 26, color: AppColors.primary),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CreateBookingScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Search Box
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: TextField(
              onChanged: (val) => ref.read(bookingsProvider.notifier).setSearchQuery(val),
              decoration: InputDecoration(
                hintText: 'Search customer name, phone, booking ID...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: bookingsState.searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () => ref.read(bookingsProvider.notifier).setSearchQuery(''),
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),

          // Horizontal Status Filter Tabs
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _statusFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final status = _statusFilters[index];
                final isSelected = bookingsState.selectedStatus == status;
                return ChoiceChip(
                  label: Text(
                    status.replaceAll('_', ' '),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected
                          ? Colors.white
                          : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  side: BorderSide(
                    color: isSelected ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      ref.read(bookingsProvider.notifier).setStatusFilter(status);
                    }
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Bookings List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.read(bookingsProvider.notifier).fetchBookings(),
              child: bookingsState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : bookingsState.bookings.isEmpty
                      ? EmptyStateView(
                          icon: Icons.calendar_today_outlined,
                          title: 'No Appointments Found',
                          subtitle: 'No appointments match the selected filters.',
                          actionLabel: 'Create New Booking',
                          onAction: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const CreateBookingScreen()),
                            );
                          },
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: bookingsState.bookings.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final appt = bookingsState.bookings[index];
                            return _BookingListItem(appt: appt);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingListItem extends StatelessWidget {
  final dynamic appt;

  const _BookingListItem({required this.appt});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => BookingDetailsScreen(bookingId: appt.id)),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Booking ID, Source, and Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        appt.bookingId,
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SourceBadge(source: appt.source),
                  ],
                ),
                StatusBadge(status: appt.status),
              ],
            ),
            const Divider(height: 20),

            // Customer Name & Service
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        appt.customerName,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.phone_outlined, size: 12, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            appt.customerPhone,
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Text(
                  '${appt.currency}${appt.price.toStringAsFixed(0)}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Service details and Staff
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceCard : AppColors.lightSurfaceCard,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.spa_outlined, size: 15, color: AppColors.gold),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${appt.serviceName} (${appt.serviceDuration} min)',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const Icon(Icons.person_outline, size: 15, color: AppColors.accent),
                  const SizedBox(width: 4),
                  Text(
                    appt.staffName,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Date & Time Footer
            Row(
              children: [
                const Icon(Icons.access_time, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  '${appt.date} • ${appt.formattedStartTime} - ${appt.formattedEndTime}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
