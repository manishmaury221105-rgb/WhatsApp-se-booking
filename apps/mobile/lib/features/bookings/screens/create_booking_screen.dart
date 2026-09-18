import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/models/models.dart';
import '../../../providers/app_providers.dart';

class CreateBookingScreen extends ConsumerStatefulWidget {
  const CreateBookingScreen({super.key});

  @override
  ConsumerState<CreateBookingScreen> createState() => _CreateBookingScreenState();
}

class _CreateBookingScreenState extends ConsumerState<CreateBookingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController(text: '+91');
  final _emailController = TextEditingController();
  final _notesController = TextEditingController();

  ServiceModel? _selectedService;
  StaffModel? _selectedStaff;
  DateTime _selectedDate = DateTime.now();
  String? _selectedSlotTime;
  List<AvailableSlotModel> _availableSlots = [];
  bool _loadingSlots = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Pre-select first service if available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final servicesState = ref.read(servicesProvider);
      servicesState.whenData((services) {
        if (services.isNotEmpty && _selectedService == null) {
          setState(() => _selectedService = services[0]);
          _fetchSlots();
        }
      });
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _fetchSlots() async {
    if (_selectedService == null) return;

    setState(() {
      _loadingSlots = true;
      _selectedSlotTime = null;
    });

    final dateStr = _selectedDate.toIso8601String().split('T')[0];
    try {
      final res = await ApiClient.dio.get('/slots/available', queryParameters: {
        'date': dateStr,
        'service_id': _selectedService!.id,
        if (_selectedStaff != null) 'staff_id': _selectedStaff!.id,
      });

      if (res.data['success'] == true) {
        final slots = (res.data['slots'] as List<dynamic>?)
                ?.map((s) => AvailableSlotModel.fromJson(s as Map<String, dynamic>))
                .toList() ??
            [];
        setState(() {
          _availableSlots = slots;
          _loadingSlots = false;
          if (slots.isNotEmpty) {
            _selectedSlotTime = slots[0].time;
          }
        });
      }
    } catch (e) {
      setState(() => _loadingSlots = false);
    }
  }

  Future<void> _handleCreateBooking() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedService == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a service.')));
      return;
    }
    if (_selectedSlotTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select an available time slot.')));
      return;
    }

    setState(() => _isSubmitting = true);
    final dateStr = _selectedDate.toIso8601String().split('T')[0];

    final payload = {
      'customer_name': _nameController.text.trim(),
      'customer_phone': _phoneController.text.trim(),
      'customer_email': _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : null,
      'service_id': _selectedService!.id,
      'staff_id': _selectedStaff?.id,
      'date': dateStr,
      'start_time': _selectedSlotTime,
      'source': 'MANUAL',
      'notes': _notesController.text.trim(),
    };

    final success = await ref.read(bookingsProvider.notifier).createBooking(payload);
    setState(() => _isSubmitting = false);

    if (success && mounted) {
      ref.read(dashboardProvider.notifier).loadDashboard();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Appointment created! WhatsApp confirmation dispatched.'),
          backgroundColor: AppColors.primary,
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to book. Slot may no longer be available.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final servicesAsync = ref.watch(servicesProvider);
    final staffAsync = ref.watch(staffProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('New Appointment')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Customer Information Section
              Text(
                'CUSTOMER DETAILS',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Customer Full Name *',
                  prefixIcon: Icon(Icons.person_outline, size: 20),
                ),
                validator: (v) => (v == null || v.isEmpty) ? 'Enter customer name' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'WhatsApp Number *',
                  prefixIcon: Icon(Icons.chat_bubble_outline, size: 20),
                ),
                validator: (v) => (v == null || v.isEmpty || v.length < 10) ? 'Enter valid WhatsApp number' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email Address (Optional)',
                  prefixIcon: Icon(Icons.email_outlined, size: 20),
                ),
              ),
              const SizedBox(height: 24),

              // Service Selection
              Text(
                'SELECT SERVICE',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 10),
              servicesAsync.when(
                data: (services) {
                  return DropdownButtonFormField<ServiceModel>(
                    value: _selectedService ?? (services.isNotEmpty ? services[0] : null),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.spa_outlined, size: 20),
                    ),
                    items: services.map((srv) {
                      return DropdownMenuItem(
                        value: srv,
                        child: Text('${srv.name} (${srv.durationMinutes} min) - ₹${srv.price.toStringAsFixed(0)}'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() => _selectedService = val);
                      _fetchSlots();
                    },
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Error loading services: $e'),
              ),
              const SizedBox(height: 16),

              // Staff Selection
              Text(
                'ASSIGN STAFF (OPTIONAL)',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 10),
              staffAsync.when(
                data: (staffList) {
                  return DropdownButtonFormField<StaffModel?>(
                    value: _selectedStaff,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.badge_outlined, size: 20),
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: null,
                        child: Text('Any Available Staff'),
                      ),
                      ...staffList.map((st) {
                        return DropdownMenuItem(
                          value: st,
                          child: Text(st.name),
                        );
                      }),
                    ],
                    onChanged: (val) {
                      setState(() => _selectedStaff = val);
                      _fetchSlots();
                    },
                  );
                },
                loading: () => const SizedBox(),
                error: (e, _) => const SizedBox(),
              ),
              const SizedBox(height: 16),

              // Date Picker
              Text(
                'APPOINTMENT DATE',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                  );
                  if (picked != null) {
                    setState(() => _selectedDate = picked);
                    _fetchSlots();
                  }
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month, color: AppColors.primary, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        _selectedDate.toIso8601String().split('T')[0],
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      const Icon(Icons.arrow_drop_down, color: Colors.grey),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Real-Time Slot Engine Slot Picker
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'REAL-TIME AVAILABLE SLOTS',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  if (_loadingSlots)
                    const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                ],
              ),
              const SizedBox(height: 10),
              if (_availableSlots.isEmpty && !_loadingSlots)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  ),
                  child: const Center(
                    child: Text('No slots available on this date. Please choose another date or staff.'),
                  ),
                )
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _availableSlots.map((slot) {
                    final isSel = _selectedSlotTime == slot.time;
                    return ChoiceChip(
                      label: Text(slot.formattedTime),
                      selected: isSel,
                      selectedColor: AppColors.primary,
                      backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                      side: BorderSide(
                        color: isSel ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _selectedSlotTime = slot.time);
                      },
                    );
                  }).toList(),
                ),
              const SizedBox(height: 20),

              // Notes
              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Appointment Notes (Optional)',
                  prefixIcon: Icon(Icons.notes_outlined, size: 20),
                ),
              ),
              const SizedBox(height: 32),

              // Price Summary & Submit Button
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceCard : AppColors.lightSurfaceCard,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Amount', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text(
                          '₹${_selectedService?.price.toStringAsFixed(0) ?? '0'}',
                          style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _handleCreateBooking,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Confirm & Book', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
