import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/more_providers.dart';

class WhatsAppSettingsScreen extends ConsumerStatefulWidget {
  const WhatsAppSettingsScreen({super.key});

  @override
  ConsumerState<WhatsAppSettingsScreen> createState() => _WhatsAppSettingsScreenState();
}

class _WhatsAppSettingsScreenState extends ConsumerState<WhatsAppSettingsScreen> {
  final _phoneIdController = TextEditingController();
  final _accountIdController = TextEditingController();
  final _tokenController = TextEditingController();
  final _verifyTokenController = TextEditingController();

  final _testPhoneController = TextEditingController(text: '+91');
  final _testMsgController = TextEditingController(text: 'Hello from WhatsApp Booking App! Testing connection.');
  bool _isSendingTest = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(whatsappProvider);
      if (state.config != null) {
        _phoneIdController.text = state.config!.phoneNumberId;
        _accountIdController.text = state.config!.businessAccountId;
        _verifyTokenController.text = state.config!.webhookVerifyToken;
      }
    });
  }

  @override
  void dispose() {
    _phoneIdController.dispose();
    _accountIdController.dispose();
    _tokenController.dispose();
    _verifyTokenController.dispose();
    _testPhoneController.dispose();
    _testMsgController.dispose();
    super.dispose();
  }

  Future<void> _handleSaveConfig() async {
    final success = await ref.read(whatsappProvider.notifier).updateConfig({
      'phone_number_id': _phoneIdController.text.trim(),
      'business_account_id': _accountIdController.text.trim(),
      if (_tokenController.text.isNotEmpty) 'access_token': _tokenController.text.trim(),
      'webhook_verify_token': _verifyTokenController.text.trim(),
    });

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('WhatsApp Cloud API configuration saved!'), backgroundColor: AppColors.primary),
      );
    }
  }

  Future<void> _handleSendTestMessage() async {
    final phone = _testPhoneController.text.trim();
    final msg = _testMsgController.text.trim();
    if (phone.isEmpty || msg.isEmpty) return;

    setState(() => _isSendingTest = true);
    final res = await ref.read(whatsappProvider.notifier).sendTestMessage(phone, msg);
    setState(() => _isSendingTest = false);

    if (mounted) {
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ WhatsApp message dispatched successfully!'), backgroundColor: AppColors.primary),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${res['error']}'), backgroundColor: AppColors.statusCancelled),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final waState = ref.watch(whatsappProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('WhatsApp Cloud API')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.whatsappDark.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.whatsappDark.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified, color: AppColors.whatsapp, size: 36),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Meta WhatsApp Cloud API Active',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.whatsapp,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Inbound Webhooks & AI Agent responses operational.',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Security Callout
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Icon(Icons.shield_outlined, size: 18, color: AppColors.primary),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'API tokens are securely stored and executed on the backend server. The mobile app never exposes credentials directly.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Meta Credentials Form
            Text(
              'CLOUD API CREDENTIALS',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneIdController,
              decoration: const InputDecoration(labelText: 'Phone Number ID'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _accountIdController,
              decoration: const InputDecoration(labelText: 'Business Account ID'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _tokenController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'System User Access Token',
                hintText: waState.config?.accessTokenMasked ?? 'Enter new token to update',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _verifyTokenController,
              decoration: const InputDecoration(labelText: 'Webhook Verify Token'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _handleSaveConfig,
                child: const Text('Save WhatsApp Config'),
              ),
            ),
            const SizedBox(height: 32),

            // Live Test Message Dispatcher
            Text(
              'LIVE TEST MESSAGE DISPATCHER',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _testPhoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Recipient WhatsApp Number',
                      prefixIcon: Icon(Icons.phone_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _testMsgController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Test Message Content',
                      prefixIcon: Icon(Icons.message_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      onPressed: _isSendingTest ? null : _handleSendTestMessage,
                      icon: const Icon(Icons.send, size: 16),
                      label: _isSendingTest
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Send Live Test Message'),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.whatsappDark),
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
