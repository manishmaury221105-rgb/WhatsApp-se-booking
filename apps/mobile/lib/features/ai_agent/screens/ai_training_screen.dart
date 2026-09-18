import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/models/models.dart';
import '../../../providers/more_providers.dart';

class AITrainingScreen extends ConsumerStatefulWidget {
  const AITrainingScreen({super.key});

  @override
  ConsumerState<AITrainingScreen> createState() => _AITrainingScreenState();
}

class _AITrainingScreenState extends ConsumerState<AITrainingScreen> {
  final _personaController = TextEditingController();
  final _cancelPolicyController = TextEditingController();
  final _reschedPolicyController = TextEditingController();
  final _customInstController = TextEditingController();

  String _selectedLanguage = 'Hinglish';
  String _selectedTone = 'Friendly';
  List<FAQItem> _faqs = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(aiAgentProvider);
      if (state.config != null) {
        final cfg = state.config!;
        _personaController.text = cfg.personaName;
        _cancelPolicyController.text = cfg.cancellationPolicy;
        _reschedPolicyController.text = cfg.reschedulePolicy;
        _customInstController.text = cfg.customInstructions;
        setState(() {
          _selectedLanguage = cfg.language;
          _selectedTone = cfg.tone;
          _faqs = List.from(cfg.faqs);
        });
      }
    });
  }

  @override
  void dispose() {
    _personaController.dispose();
    _cancelPolicyController.dispose();
    _reschedPolicyController.dispose();
    _customInstController.dispose();
    super.dispose();
  }

  void _showAddFaqDialog() {
    final qController = TextEditingController();
    final aController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add FAQ Training'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: qController, decoration: const InputDecoration(labelText: 'Customer Question *')),
            const SizedBox(height: 12),
            TextField(controller: aController, maxLines: 2, decoration: const InputDecoration(labelText: 'AI Answer *')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (qController.text.isNotEmpty && aController.text.isNotEmpty) {
                setState(() {
                  _faqs.add(FAQItem(question: qController.text.trim(), answer: aController.text.trim()));
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSave() async {
    final payload = {
      'persona_name': _personaController.text.trim(),
      'language': _selectedLanguage,
      'tone': _selectedTone,
      'cancellation_policy': _cancelPolicyController.text.trim(),
      'reschedule_policy': _reschedPolicyController.text.trim(),
      'custom_instructions': _customInstController.text.trim(),
      'faqs': _faqs.map((f) => f.toJson()).toList(),
    };

    final success = await ref.read(aiAgentProvider.notifier).updateConfig(payload);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('AI Agent instructions updated successfully!'), backgroundColor: AppColors.primary),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('AI Agent Training & Persona')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Persona & Voice
            Text(
              'PERSONA & TONE',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _personaController,
              decoration: const InputDecoration(labelText: 'AI Persona Name (e.g. Aria, Priya)'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedLanguage,
                    decoration: const InputDecoration(labelText: 'Primary Language'),
                    items: const [
                      DropdownMenuItem(value: 'Hinglish', child: Text('Hinglish / Hindi')),
                      DropdownMenuItem(value: 'Hindi', child: Text('Pure Hindi')),
                      DropdownMenuItem(value: 'English', child: Text('English')),
                    ],
                    onChanged: (val) => setState(() => _selectedLanguage = val ?? 'Hinglish'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedTone,
                    decoration: const InputDecoration(labelText: 'Conversation Tone'),
                    items: const [
                      DropdownMenuItem(value: 'Friendly', child: Text('Friendly & Warm')),
                      DropdownMenuItem(value: 'Professional', child: Text('Professional')),
                      DropdownMenuItem(value: 'Casual', child: Text('Casual')),
                    ],
                    onChanged: (val) => setState(() => _selectedTone = val ?? 'Friendly'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Custom Instructions
            Text(
              'CUSTOM SYSTEM INSTRUCTIONS',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _customInstController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'e.g. Talk politely in Hinglish, recommend Hair Spa with Hair Cut.',
              ),
            ),
            const SizedBox(height: 24),

            // Policies
            Text(
              'BOOKING & CANCELLATION POLICIES',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _cancelPolicyController,
              decoration: const InputDecoration(labelText: 'Cancellation Policy'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _reschedPolicyController,
              decoration: const InputDecoration(labelText: 'Reschedule Policy'),
            ),
            const SizedBox(height: 24),

            // FAQs Training
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'KNOWLEDGE BASE / FAQS (${_faqs.length})',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    letterSpacing: 0.8,
                  ),
                ),
                TextButton.icon(
                  onPressed: _showAddFaqDialog,
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add FAQ'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _faqs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final faq = _faqs[index];
                return ListTile(
                  tileColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  title: Text(faq.question, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(faq.answer, style: const TextStyle(fontSize: 12)),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                    onPressed: () => setState(() => _faqs.removeAt(index)),
                  ),
                );
              },
            ),
            const SizedBox(height: 32),

            // Save Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _handleSave,
                child: const Text('Save AI Training & Rules', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
