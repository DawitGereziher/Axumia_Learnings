import 'package:flutter_test/flutter_test.dart';
import 'package:axumia_learning/main.dart';

void main() {
  testWidgets('Axumia mobile app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const AxumiaMobileApp());
    expect(find.byType(AxumiaMobileApp), findsOneWidget);
  });
}
