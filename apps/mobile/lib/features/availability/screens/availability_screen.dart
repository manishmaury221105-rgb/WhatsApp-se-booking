import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/more_providers.dart';

class AvailabilityScreen extends ConsumerStatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  ConsumerState<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends ConsumerState<AvailabilityScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  static const _days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showAddHolidayDialog() {
    final nameController = TextEditingController();
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDState) => AlertDialog(
          title: const Text('Add Business Holiday'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Holiday / Occasion Name *'),
              ),
              const SizedBox(height: 14),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today, color: AppColors.primary),
                title: const Text('Date'),
                subtitle: Text(selectedDate.toIso8601String().split('T')[0]),
                trailing: const Icon(Icons.arrow_drop_down),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setDState(() => selectedDate = picked);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.isEmpty) return;
                Navigator.pop(ctx);
                await ref.read(availabilityProvider.notifier).addHoliday(
                      selectedDate.toIso8601String().split('T')[0],
                      nameController.text.trim(),
                    );
              },
              child: const Text('Add Holiday'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddBlockedSlotDialog() {
    final reasonController = TextEditingController(text: 'Staff Training / Maintenance');
    final startController = TextEditingController(text: '14:00');
    final endController = TextEditingController(text: '16:00');
    DateTime selectedDate = DateTime.now();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDState) => AlertDialog(
          title: const Text('Block Time Slot'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_month, color: AppColors.primary),
                  title: const Text('Date'),
                  subtitle: Text(selectedDate.toIso8601String().split('T')[0]),
                  trailing: const Icon(Icons.arrow_drop_down),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (picked != null) setDState(() => selectedDate = picked);
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: startController,
                        decoration: const InputDecoration(labelText: 'Start (HH:MM)'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: endController,
                        decoration: const InputDecoration(labelText: 'End (HH:MM)'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(labelText: 'Reason for blocking'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                await ref.read(availabilityProvider.notifier).addBlockedSlot({
                  'date': selectedDate.toIso8601String().split('T')[0],
                  'start_time': startController.text.trim(),
                  'end_time': endController.text.trim(),
                  'reason': reasonController.text.trim(),
                });
              },
              child: const Text('Block Time'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final availState = ref.watch(availabilityProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Availability & Hours'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'Weekly Hours'),
            Tab(text: 'Holidays'),
            Tab(text: 'Blocked Time'),
          ],
        ),
      ),
      body: availState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Weekly Hours
                ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: availState.businessHours.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final h = availState.businessHours[index];
                    final dayName = _days[h.dayOfWeek % 7];

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  dayName,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                if (h.isOpen)
                                  Text(
                                    '${h.openTime} - ${h.closeTime} (Break: ${h.breakStart ?? 'None'} - ${h.breakEnd ?? ''})',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                    ),
                                  )
                                else
                                  const Text('Closed', style: TextStyle(fontSize: 12, color: AppColors.statusCancelled, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: (h.isOpen ? AppColors.statusConfirmed : AppColors.statusCancelled).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              h.isOpen ? 'OPEN' : 'CLOSED',
                              style: TextStyle(
                                color: h.isOpen ? AppColors.statusConfirmed : AppColors.statusCancelled,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                // Tab 2: Holidays
                Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: ElevatedButton.icon(
                        onPressed: _showAddHolidayDialog,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('+ Add Holiday / Shop Closure'),
                        style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 44)),
                      ),
                    ),
                    Expanded(
                      child: availState.holidays.isEmpty
                          ? const Center(child: Text('No holidays scheduled.'))
                          : ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: availState.holidays.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final hol = availState.holidays[index];
                                return ListTile(
                                  tileColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  leading: const Icon(Icons.beach_access, color: AppColors.gold),
                                  title: Text(hol.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(hol.date),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                    onPressed: () => ref.read(availabilityProvider.notifier).deleteHoliday(hol.id),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),

                // Tab 3: Blocked Time
                Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: ElevatedButton.icon(
                        onPressed: _showAddBlockedSlotDialog,
                        icon: const Icon(Icons.block, size: 18),
                        label: const Text('+ Block Time Interval'),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 44),
                          backgroundColor: AppColors.statusCancelled,
                        ),
                      ),
                    ),
                    Expanded(
                      child: availState.blockedSlots.isEmpty
                          ? const Center(child: Text('No custom blocked time intervals.'))
                          : ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: availState.blockedSlots.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final block = availState.blockedSlots[index];
                                return ListTile(
                                  tileColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  leading: const Icon(Icons.block, color: AppColors.statusCancelled),
                                  title: Text(block.reason, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text('${block.date} • ${block.formattedStartTime} - ${block.formattedEndTime}'),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                    onPressed: () => ref.read(availabilityProvider.notifier).deleteBlockedSlot(block.id),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}
