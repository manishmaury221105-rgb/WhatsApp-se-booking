import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _waController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _descController = TextEditingController();
  final _currencyController = TextEditingController(text: '₹');
  final _timezoneController = TextEditingController(text: 'Asia/Kolkata');

  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final res = await ApiClient.dio.get('/business/profile');
      if (res.data['success'] == true) {
        final b = res.data['business'];
        _nameController.text = b['name'] ?? '';
        _phoneController.text = b['phone'] ?? '';
        _waController.text = b['whatsapp_number'] ?? '';
        _emailController.text = b['email'] ?? '';
        _addressController.text = b['address'] ?? '';
        _descController.text = b['description'] ?? '';
        _currencyController.text = b['currency'] ?? '₹';
        _timezoneController.text = b['timezone'] ?? 'Asia/Kolkata';
      }
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    try {
      await ApiClient.dio.put('/business/profile', data: {
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'whatsapp_number': _waController.text.trim(),
        'email': _emailController.text.trim(),
        'address': _addressController.text.trim(),
        'description': _descController.text.trim(),
        'currency': _currencyController.text.trim(),
        'timezone': _timezoneController.text.trim(),
      });
      setState(() => _isSaving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Business Profile updated successfully!'), backgroundColor: AppColors.primary),
        );
      }
    } catch (e) {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Business Profile')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'BUSINESS INFORMATION',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Business Name *')),
                  const SizedBox(height: 12),
                  TextField(controller: _waController, decoration: const InputDecoration(labelText: 'WhatsApp Business Number *')),
                  const SizedBox(height: 12),
                  TextField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Support Phone Number')),
                  const SizedBox(height: 12),
                  TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'Business Email')),
                  const SizedBox(height: 12),
                  TextField(controller: _addressController, maxLines: 2, decoration: const InputDecoration(labelText: 'Physical Address / Location')),
                  const SizedBox(height: 12),
                  TextField(controller: _descController, maxLines: 3, decoration: const InputDecoration(labelText: 'About Business / Bio')),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: TextField(controller: _currencyController, decoration: const InputDecoration(labelText: 'Currency Symbol (₹, \$)'))),
                      const SizedBox(width: 12),
                      Expanded(child: TextField(controller: _timezoneController, decoration: const InputDecoration(labelText: 'Timezone'))),
                    ],
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _handleSave,
                      child: _isSaving
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save Business Profile', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
