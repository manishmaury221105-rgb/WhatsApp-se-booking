import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../services/screens/services_list_screen.dart';
import '../staff/screens/staff_list_screen.dart';
import '../availability/screens/availability_screen.dart';
import '../whatsapp/screens/whatsapp_settings_screen.dart';
import '../ai_agent/screens/ai_training_screen.dart';
import '../ai_agent/screens/ai_chat_simulator_screen.dart';
import '../automations/screens/automations_screen.dart';
import '../templates/screens/message_templates_screen.dart';
import '../analytics/screens/analytics_screen.dart';
import '../notifications/screens/notifications_screen.dart';
import '../business_profile/screens/business_profile_screen.dart';
import '../settings/screens/settings_screen.dart';

class MoreMenuScreen extends ConsumerWidget {
  const MoreMenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final items = [
      _MenuItem(
        title: 'Services Catalogue',
        subtitle: 'Manage salon services, pricing & durations',
        icon: Icons.spa_outlined,
        color: AppColors.primary,
        destination: const ServicesListScreen(),
      ),
      _MenuItem(
        title: 'Staff Management',
        subtitle: 'Staff members, working schedules & leaves',
        icon: Icons.badge_outlined,
        color: AppColors.accent,
        destination: const StaffListScreen(),
      ),
      _MenuItem(
        title: 'Availability & Hours',
        subtitle: 'Weekly business hours, holidays & blocked time',
        icon: Icons.access_time_outlined,
        color: AppColors.gold,
        destination: const AvailabilityScreen(),
      ),
      _MenuItem(
        title: 'WhatsApp Cloud API',
        subtitle: 'Meta Cloud credentials, webhook & test message',
        icon: Icons.chat_bubble_outline,
        color: AppColors.whatsapp,
        destination: const WhatsAppSettingsScreen(),
      ),
      _MenuItem(
        title: 'AI Agent Training',
        subtitle: 'Configure AI Persona, FAQs & Booking Rules',
        icon: Icons.smart_toy_outlined,
        color: AppColors.primaryLight,
        destination: const AITrainingScreen(),
      ),
      _MenuItem(
        title: 'AI Chat Simulator',
        subtitle: 'Live interactive WhatsApp conversation testing',
        icon: Icons.forum_outlined,
        color: AppColors.whatsappDark,
        destination: const AIChatSimulatorScreen(),
      ),
      _MenuItem(
        title: 'Automation Rules',
        subtitle: 'Configure triggers for 24h/2h reminders & follow-ups',
        icon: Icons.bolt_outlined,
        color: Colors.amber,
        destination: const AutomationsScreen(),
      ),
      _MenuItem(
        title: 'Message Templates',
        subtitle: 'WhatsApp confirmation & reminder templates',
        icon: Icons.description_outlined,
        color: Colors.indigo,
        destination: const MessageTemplatesScreen(),
      ),
      _MenuItem(
        title: 'Analytics & Insights',
        subtitle: 'Revenue, booking density & customer trends',
        icon: Icons.bar_chart_outlined,
        color: Colors.teal,
        destination: const AnalyticsScreen(),
      ),
      _MenuItem(
        title: 'Notifications Center',
        subtitle: 'Booking alerts and system notifications',
        icon: Icons.notifications_outlined,
        color: Colors.deepOrange,
        destination: const NotificationsScreen(),
      ),
      _MenuItem(
        title: 'Business Profile',
        subtitle: 'Business name, address, timezone & currency',
        icon: Icons.storefront_outlined,
        color: Colors.purple,
        destination: const BusinessProfileScreen(),
      ),
      _MenuItem(
        title: 'Settings & Theme',
        subtitle: 'Dark/Light mode, account & API endpoints',
        icon: Icons.settings_outlined,
        color: Colors.blueGrey,
        destination: const SettingsScreen(),
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Manage & Configure')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = items[index];
          return InkWell(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => item.destination),
              );
            },
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: item.color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(item.icon, color: item.color, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.subtitle,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _MenuItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Widget destination;

  _MenuItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.destination,
  });
}
