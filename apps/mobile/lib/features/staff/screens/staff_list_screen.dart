import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../providers/app_providers.dart';
import '../../../widgets/common_widgets.dart';

class StaffListScreen extends ConsumerWidget {
  const StaffListScreen({super.key});

  void _showAddEditStaffDialog(BuildContext context, WidgetRef ref, [StaffModel? existing]) {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final phoneController = TextEditingController(text: existing?.phone ?? '+91');
    final emailController = TextEditingController(text: existing?.email ?? '');
    final startController = TextEditingController(text: existing?.workingHoursStart ?? '10:00');
    final endController = TextEditingController(text: existing?.workingHoursEnd ?? '19:00');
    final breakStartController = TextEditingController(text: existing?.breakStart ?? '13:00');
    final breakEndController = TextEditingController(text: existing?.breakEnd ?? '14:00');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Add Staff Member' : 'Edit Staff Schedule'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Staff Name *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone Number'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email Address'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: startController,
                      decoration: const InputDecoration(labelText: 'Work Start (HH:MM)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: endController,
                      decoration: const InputDecoration(labelText: 'Work End (HH:MM)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: breakStartController,
                      decoration: const InputDecoration(labelText: 'Break Start'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: breakEndController,
                      decoration: const InputDecoration(labelText: 'Break End'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isEmpty) return;
              Navigator.pop(ctx);
              final payload = {
                'name': nameController.text.trim(),
                'phone': phoneController.text.trim(),
                'email': emailController.text.trim(),
                'working_hours_start': startController.text.trim(),
                'working_hours_end': endController.text.trim(),
                'break_start': breakStartController.text.trim(),
                'break_end': breakEndController.text.trim(),
              };

              if (existing == null) {
                await ref.read(staffProvider.notifier).addStaff(payload);
              } else {
                await ref.read(staffProvider.notifier).updateStaff(existing.id, payload);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staffAsync = ref.watch(staffProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add, size: 24, color: AppColors.primary),
            onPressed: () => _showAddEditStaffDialog(context, ref),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: staffAsync.when(
        data: (staffList) {
          if (staffList.isEmpty) {
            return EmptyStateView(
              icon: Icons.badge_outlined,
              title: 'No Staff Added',
              subtitle: 'Add staff members to assign services and configure schedules.',
              actionLabel: 'Add Staff',
              onAction: () => _showAddEditStaffDialog(context, ref),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(staffProvider.notifier).fetchStaff(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: staffList.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final st = staffList[index];
                return Container(
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
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: AppColors.accent.withOpacity(0.15),
                            child: Text(
                              st.name.isNotEmpty ? st.name[0].toUpperCase() : 'S',
                              style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 18),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  st.name,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  st.phone ?? st.email ?? 'Active Staff',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: st.isActive,
                            activeColor: AppColors.primary,
                            onChanged: (_) => ref.read(staffProvider.notifier).toggleStaff(st.id),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed: () => _showAddEditStaffDialog(context, ref, st),
                          ),
                        ],
                      ),
                      const Divider(height: 20),
                      // Schedule details
                      Row(
                        children: [
                          const Icon(Icons.access_time, size: 14, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            'Hours: ${st.workingHoursStart} - ${st.workingHoursEnd}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                          const Spacer(),
                          const Icon(Icons.coffee_outlined, size: 14, color: AppColors.gold),
                          const SizedBox(width: 4),
                          Text(
                            'Break: ${st.breakStart ?? '13:00'} - ${st.breakEnd ?? '14:00'}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorStateView(
          error: e.toString(),
          onRetry: () => ref.read(staffProvider.notifier).fetchStaff(),
        ),
      ),
    );
  }
}
