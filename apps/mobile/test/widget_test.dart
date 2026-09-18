import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:whatsapp_booking/main.dart';
import 'package:whatsapp_booking/core/storage/secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await SecureStorage.init();
  });

  testWidgets('WhatsAppBookingApp renders splash screen and transitions to login', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: WhatsAppBookingApp(),
      ),
    );

    // Initial frame on splash screen
    expect(find.text('WhatsApp Booking'), findsOneWidget);

    // Advance timer past splash delay (1800ms)
    await tester.pump(const Duration(milliseconds: 2000));
    await tester.pumpAndSettle();

    // Verify it cleanly navigated to Login Screen
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });
}
