import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../providers/more_providers.dart';

class MessageTemplatesScreen extends ConsumerWidget {
  const MessageTemplatesScreen({super.key});

  void _showEditTemplateDialog(BuildContext context, WidgetRef ref, MessageTemplateModel tmpl) {
    final contentController = TextEditingController(text: tmpl.content);
    String previewText = '';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDState) {
          Future<void> updatePreview() async {
            final p = await ref.read(automationsProvider.notifier).previewTemplate(contentController.text);
            setDState(() => previewText = p);
          }

          if (previewText.isEmpty) {
            updatePreview();
          }

          return AlertDialog(
            title: Text(tmpl.name),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Template Content (WhatsApp Markdown supported):', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: contentController,
                    maxLines: 5,
                    onChanged: (_) => updatePreview(),
                    decoration: const InputDecoration(hintText: 'Enter template content with {{variables}}...'),
                  ),
                  const SizedBox(height: 12),
                  const Text('Available Dynamic Variables:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: tmpl.variablesList.map((v) {
                      return ActionChip(
                        label: Text('{{$v}}', style: const TextStyle(fontSize: 11)),
                        onPressed: () {
                          contentController.text += ' {{$v}}';
                          updatePreview();
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  const Text('Live Rendered Preview:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.whatsappDark.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.whatsappDark.withOpacity(0.3)),
                    ),
                    child: Text(previewText, style: const TextStyle(fontSize: 12, height: 1.4)),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await ref.read(automationsProvider.notifier).updateTemplate(tmpl.id, {
                    'content': contentController.text.trim(),
                  });
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Template saved successfully!'), backgroundColor: AppColors.primary),
                    );
                  }
                },
                child: const Text('Save Template'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final autoState = ref.watch(automationsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Message Templates')),
      body: autoState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: autoState.templates.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final tmpl = autoState.templates[index];
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
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.chat_bubble_outline, size: 18, color: AppColors.whatsapp),
                              const SizedBox(width: 8),
                              Text(
                                tmpl.name,
                                style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed: () => _showEditTemplateDialog(context, ref, tmpl),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceCard : AppColors.lightSurfaceCard,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          tmpl.content,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
