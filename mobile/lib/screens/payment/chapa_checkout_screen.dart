import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/payment_service.dart';
import 'payment_result_screen.dart';

class ChapaCheckoutScreen extends StatefulWidget {
  final String checkoutUrl;
  final String txRef;
  final String itemTitle;
  final PayableEntityType entityType;

  const ChapaCheckoutScreen({
    super.key,
    required this.checkoutUrl,
    required this.txRef,
    required this.itemTitle,
    required this.entityType,
  });

  @override
  State<ChapaCheckoutScreen> createState() => _ChapaCheckoutScreenState();
}

class _ChapaCheckoutScreenState extends State<ChapaCheckoutScreen> {
  late final WebViewController _controller;
  int _loadingProgress = 0;
  bool _hasRedirected = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _loadingProgress = progress);
          },
          onNavigationRequest: (request) {
            final url = request.url;
            // Intercept payment success callback
            if (url.contains('/payment-success') || url.contains('payment_success')) {
              _handleRedirectToResult(url, isSuccess: true);
              return NavigationDecision.prevent;
            }
            // Intercept payment failure callback
            if (url.contains('/payment-failure') || url.contains('payment_failure')) {
              _handleRedirectToResult(url, isSuccess: false);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  void _handleRedirectToResult(String url, {required bool isSuccess}) {
    if (_hasRedirected) return;
    _hasRedirected = true;

    String resolvedTxRef = widget.txRef;
    try {
      final uri = Uri.parse(url);
      final refFromQuery = uri.queryParameters['ref'] ?? uri.queryParameters['tx_ref'];
      if (refFromQuery != null && refFromQuery.isNotEmpty) {
        resolvedTxRef = refFromQuery;
      }
    } catch (_) {}

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => PaymentResultScreen(
          txRef: resolvedTxRef,
          entityType: widget.entityType,
          initialFailed: !isSuccess,
        ),
      ),
    );
  }

  Future<bool> _onWillPop() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Cancel Payment?'),
        content: const Text(
          'If you exit now, your transaction will remain pending and your booking/enrollment will not be confirmed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Continue Payment', style: TextStyle(color: AppColors.primaryLight)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Cancel Transaction'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.lock_rounded, size: 14, color: AppColors.accentGreen),
                  SizedBox(width: 6),
                  Text(
                    'Secure Checkout',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Text(
                widget.itemTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: () async {
                final shouldPop = await _onWillPop();
                if (shouldPop && context.mounted) {
                  Navigator.of(context).pop();
                }
              },
            ),
          ],
          bottom: _loadingProgress < 100
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(3),
                  child: LinearProgressIndicator(
                    value: _loadingProgress / 100.0,
                    backgroundColor: AppColors.cardBorder,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryLight),
                  ),
                )
              : null,
        ),
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loadingProgress < 60)
              Container(
                color: AppColors.background,
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: AppColors.primaryLight),
                      SizedBox(height: 16),
                      Text(
                        'Connecting to Chapa Secure Gateway...',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
        bottomNavigationBar: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.cardBorder)),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shield_outlined, size: 14, color: AppColors.accentGreen),
              SizedBox(width: 6),
              Text(
                '256-bit Encrypted · Verified Chapa Payment',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
