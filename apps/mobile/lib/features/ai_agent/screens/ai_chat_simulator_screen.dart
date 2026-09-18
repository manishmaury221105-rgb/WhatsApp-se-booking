import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/more_providers.dart';
import '../../../widgets/common_widgets.dart';
import '../../bookings/screens/booking_details_screen.dart';

class AIChatSimulatorScreen extends ConsumerStatefulWidget {
  const AIChatSimulatorScreen({super.key});

  @override
  ConsumerState<AIChatSimulatorScreen> createState() => _AIChatSimulatorScreenState();
}

class _AIChatSimulatorScreenState extends ConsumerState<AIChatSimulatorScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSend() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    await ref.read(aiAgentProvider.notifier).sendSimulatorMessage(text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final aiState = ref.watch(aiAgentProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    _scrollToBottom();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.whatsapp,
              child: const Icon(Icons.smart_toy, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  aiState.config?.personaName ?? 'Aria (AI Agent)',
                  style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const Text(
                  'WhatsApp Simulator • Online',
                  style: TextStyle(fontSize: 11, color: AppColors.whatsapp, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 22),
            tooltip: 'Reset Conversation',
            onPressed: () => ref.read(aiAgentProvider.notifier).resetSimulator(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.whatsappDark.withOpacity(0.12),
            child: Row(
              children: const [
                Icon(Icons.info_outline, size: 14, color: AppColors.whatsapp),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Interactive WhatsApp Simulator: Test natural language booking in Hindi, Hinglish, or English.',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),

          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: aiState.chatMessages.length,
              itemBuilder: (context, index) {
                final msg = aiState.chatMessages[index];
                final isUser = msg.sender == 'user';

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Column(
                    crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                    children: [
                      Container(
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isUser
                              ? AppColors.primary
                              : (isDark ? AppColors.darkSurface : AppColors.lightSurfaceCard),
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                            bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                          ),
                          border: isUser
                              ? null
                              : Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                        ),
                        child: Text(
                          msg.text,
                          style: TextStyle(
                            color: isUser ? Colors.white : (isDark ? Colors.white : Colors.black87),
                            fontSize: 14,
                            height: 1.4,
                          ),
                        ),
                      ),

                      // If AI booked an appointment, display Appointment Card
                      if (msg.bookedAppointment != null) ...[
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => BookingDetailsScreen(bookingId: msg.bookedAppointment!.id),
                              ),
                            );
                          },
                          child: Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.statusConfirmed.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.statusConfirmed),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${msg.bookedAppointment!.bookingId} Confirmed',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.statusConfirmed),
                                    ),
                                    const StatusBadge(status: 'CONFIRMED'),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text('${msg.bookedAppointment!.serviceName} • ₹${msg.bookedAppointment!.price.toStringAsFixed(0)}'),
                                Text('${msg.bookedAppointment!.date} at ${msg.bookedAppointment!.formattedStartTime}'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),

          // Sending indicator
          if (aiState.isSendingChat)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
              child: Row(
                children: const [
                  SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('AI is typing & checking real slots...', style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),

          // Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    onSubmitted: (_) => _handleSend(),
                    decoration: const InputDecoration(
                      hintText: 'Type: "Hair Cut book karna hai kal 4 PM"',
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _handleSend,
                  icon: const Icon(Icons.send, color: AppColors.whatsapp),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
