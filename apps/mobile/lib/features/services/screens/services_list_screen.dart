import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../providers/app_providers.dart';
import '../../../widgets/common_widgets.dart';

class ServicesListScreen extends ConsumerWidget {
  const ServicesListScreen({super.key});

  void _showAddEditDialog(BuildContext context, WidgetRef ref, [ServiceModel? existing]) {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final descController = TextEditingController(text: existing?.description ?? '');
    final durationController = TextEditingController(text: existing?.durationMinutes.toString() ?? '30');
    final priceController = TextEditingController(text: existing?.price.toStringAsFixed(0) ?? '350');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Add New Service' : 'Edit Service'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Service Name *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: durationController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Duration (mins) *'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: priceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Price (₹) *'),
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
                'description': descController.text.trim(),
                'duration_minutes': int.tryParse(durationController.text) ?? 30,
                'price': double.tryParse(priceController.text) ?? 0,
              };

              if (existing == null) {
                await ref.read(servicesProvider.notifier).addService(payload);
              } else {
                await ref.read(servicesProvider.notifier).updateService(existing.id, payload);
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
    final servicesAsync = ref.watch(servicesProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Services Catalogue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 26, color: AppColors.primary),
            onPressed: () => _showAddEditDialog(context, ref),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: servicesAsync.when(
        data: (services) {
          if (services.isEmpty) {
            return EmptyStateView(
              icon: Icons.spa_outlined,
              title: 'No Services Added',
              subtitle: 'Add services to let customers book on WhatsApp and Mobile app.',
              actionLabel: 'Add Service',
              onAction: () => _showAddEditDialog(context, ref),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(servicesProvider.notifier).fetchServices(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: services.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final srv = services[index];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.spa_outlined, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              srv.name,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${srv.durationMinutes} mins • ₹${srv.price.toStringAsFixed(0)}',
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (srv.description.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                srv.description,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Active Switch & Edit
                      Switch(
                        value: srv.isActive,
                        activeColor: AppColors.primary,
                        onChanged: (_) => ref.read(servicesProvider.notifier).toggleService(srv.id),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        onPressed: () => _showAddEditDialog(context, ref, srv),
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
          onRetry: () => ref.read(servicesProvider.notifier).fetchServices(),
        ),
      ),
    );
  }
}
