import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/help_request_provider.dart';

class CreateHelpRequestScreen extends StatefulWidget {
  const CreateHelpRequestScreen({super.key});

  @override
  State<CreateHelpRequestScreen> createState() => _CreateHelpRequestScreenState();
}

class _CreateHelpRequestScreenState extends State<CreateHelpRequestScreen> {
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _budgetController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final subject = _subjectController.text.trim();
    final description = _descriptionController.text.trim();
    final budget = double.tryParse(_budgetController.text) ?? 0.0;

    if (subject.isEmpty || description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide a subject and description')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final ok = await context.read<HelpRequestProvider>().createRequest(
          subject: subject,
          description: description,
          budget: budget,
        );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Help request posted to marketplace!'),
            backgroundColor: AppColors.accentGreen,
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to post request'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post Help Request'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Describe Your Task',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Instructors will review your post and submit customized proposals.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 24),

              // Subject
              Text('Topic or Subject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              TextField(
                controller: _subjectController,
                decoration: const InputDecoration(
                  hintText: 'e.g. Python AsyncIO & Recursion Assignment',
                ),
              ),
              const SizedBox(height: 18),

              // Description
              Text('Detailed Requirements', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              TextField(
                controller: _descriptionController,
                maxLines: 5,
                decoration: const InputDecoration(
                  hintText: 'Describe exactly what you need help with, any deadlines, and goals for the session...',
                ),
              ),
              const SizedBox(height: 18),

              // Budget
              Text('Budget (ETB) — optional', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              TextField(
                controller: _budgetController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: 'e.g. 500 (leave empty for flexible)',
                  prefixIcon: Icon(Icons.attach_money_rounded, size: 20),
                ),
              ),
              const SizedBox(height: 28),

              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _handleSubmit,
                child: _isSubmitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Post to Marketplace'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
