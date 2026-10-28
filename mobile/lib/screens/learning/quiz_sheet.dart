import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../models/quiz_model.dart';

class QuizSheet extends StatefulWidget {
  final String lessonId;
  final VoidCallback? onQuizPassed;

  const QuizSheet({super.key, required this.lessonId, this.onQuizPassed});

  @override
  State<QuizSheet> createState() => _QuizSheetState();
}

class _QuizSheetState extends State<QuizSheet> {
  QuizModel? _quiz;
  List<PastQuizAttemptModel> _pastAttempts = [];
  bool _isLoading = true;
  String? _error;

  // Active taking state
  bool _hasStarted = false;
  final Map<String, String> _selectedAnswers = {};
  int _currentQuestionIndex = 0;
  bool _isSubmitting = false;

  // Timer
  Timer? _countdownTimer;
  int _secondsRemaining = 0;

  // Result state
  QuizAttemptResultModel? _result;

  @override
  void initState() {
    super.initState();
    _fetchQuizData();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchQuizData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await ApiClient.get(ApiConstants.lessonQuiz(widget.lessonId));
      if (res.isSuccess && res.data != null) {
        final q = QuizModel.fromJson(res.data);
        _quiz = q;

        // Fetch past attempts
        final attRes = await ApiClient.get(ApiConstants.myQuizAttempts(q.id));
        if (attRes.isSuccess && attRes.data is List) {
          _pastAttempts = (attRes.data as List)
              .map((a) => PastQuizAttemptModel.fromJson(a))
              .toList();
        }
      } else {
        _error = res.errorMessage ?? 'No quiz available for this lesson';
      }
    } catch (e) {
      _error = 'Error loading quiz: $e';
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _startQuiz() {
    if (_quiz == null || _quiz!.questions.isEmpty) return;
    setState(() {
      _hasStarted = true;
      _selectedAnswers.clear();
      _currentQuestionIndex = 0;
      _result = null;

      if (_quiz!.timeLimit != null && _quiz!.timeLimit! > 0) {
        _secondsRemaining = _quiz!.timeLimit! * 60;
        _countdownTimer?.cancel();
        _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (_secondsRemaining > 0) {
            setState(() => _secondsRemaining--);
          } else {
            timer.cancel();
            _handleSubmitAttempt();
          }
        });
      }
    });
  }

  Future<void> _handleSubmitAttempt() async {
    if (_quiz == null || _isSubmitting) return;

    _countdownTimer?.cancel();
    setState(() => _isSubmitting = true);

    try {
      final answersPayload = _selectedAnswers.entries.map((e) {
        return {'question_id': e.key, 'answer': e.value};
      }).toList();

      final res = await ApiClient.post(
        ApiConstants.submitQuizAttempt(_quiz!.id),
        body: {
          'answers': answersPayload,
          'time_taken': _quiz!.timeLimit != null ? (_quiz!.timeLimit! * 60 - _secondsRemaining) : null,
        },
      );

      if (res.isSuccess && res.data != null) {
        final attemptResult = QuizAttemptResultModel.fromJson(res.data);
        setState(() {
          _result = attemptResult;
          _hasStarted = false;
        });

        if (attemptResult.passed) {
          // Award XP
          ApiClient.post(
            ApiConstants.awardXp,
            body: {
              'reason': attemptResult.score == 100 ? 'quiz_perfect' : 'quiz_passed',
              'metadata': {'quiz_id': _quiz!.id, 'lesson_id': widget.lessonId},
            },
          );
          widget.onQuizPassed?.call();
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.errorMessage ?? 'Submission failed'), backgroundColor: AppColors.error),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error submitting quiz: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (_error != null || _quiz == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.quiz_outlined, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 12),
              Text(_error ?? 'No quiz found', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: _fetchQuizData, child: const Text('Refresh')),
            ],
          ),
        ),
      );
    }

    if (_result != null) {
      return _buildResultView(_result!);
    }

    if (_hasStarted) {
      return _buildTakingView(_quiz!);
    }

    return _buildOverviewView(_quiz!);
  }

  Widget _buildOverviewView(QuizModel quiz) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  quiz.title,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${quiz.questions.length} Questions',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                ),
              ),
            ],
          ),
          if (quiz.description != null && quiz.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(quiz.description!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4)),
          ],
          const SizedBox(height: 18),

          // Criteria chips
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              children: [
                _buildCriteriaRow(Icons.check_circle_outline_rounded, 'Passing Score', '${quiz.passScore}% minimum'),
                const Divider(height: 16),
                _buildCriteriaRow(Icons.timer_outlined, 'Time Limit', quiz.timeLimit != null ? '${quiz.timeLimit} minutes' : 'Unlimited'),
                const Divider(height: 16),
                _buildCriteriaRow(Icons.replay_rounded, 'Max Attempts', '${quiz.maxAttempts} allowed (${_pastAttempts.length} used)'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Start Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: quiz.questions.isNotEmpty ? _startQuiz : null,
              icon: const Icon(Icons.play_arrow_rounded),
              label: Text(_pastAttempts.isEmpty ? 'Start Quiz' : 'Retake Quiz'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentGreen,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),

          // Past attempts
          if (_pastAttempts.isNotEmpty) ...[
            const SizedBox(height: 24),
            const Text('Past Attempts', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary)),
            const SizedBox(height: 10),
            ..._pastAttempts.map((att) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Score: ${att.score.toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: att.passed ? AppColors.accentGreen : AppColors.error,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: (att.passed ? AppColors.accentGreen : AppColors.error).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        att.passed ? 'PASSED' : 'FAILED',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: att.passed ? AppColors.accentGreen : AppColors.error),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildCriteriaRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primaryLight),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
      ],
    );
  }

  Widget _buildTakingView(QuizModel quiz) {
    final currentQ = quiz.questions[_currentQuestionIndex];
    final selectedAnswer = _selectedAnswers[currentQ.id];

    return Column(
      children: [
        // Top Taking Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.surfaceElevated,
            border: Border(bottom: BorderSide(color: AppColors.cardBorder)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Question ${_currentQuestionIndex + 1} of ${quiz.questions.length}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary),
              ),
              if (_countdownTimer != null) ...[
                Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 16, color: AppColors.accentAmber),
                    const SizedBox(width: 4),
                    Text(
                      '${(_secondsRemaining ~/ 60).toString().padLeft(2, '0')}:${(_secondsRemaining % 60).toString().padLeft(2, '0')}',
                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.accentAmber, fontSize: 13),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),

        // Question & Options
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  currentQ.question,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary, height: 1.4),
                ),
                const SizedBox(height: 20),

                // Options list
                if (currentQ.type == 'multiple_choice' || currentQ.type == 'true_false') ...[
                  ...currentQ.options.map((opt) {
                    final isSelected = selectedAnswer == opt;
                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedAnswers[currentQ.id] = opt;
                        });
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary.withOpacity(0.18) : AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.cardBorder,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? AppColors.primaryLight : AppColors.textMuted,
                                  width: 2,
                                ),
                                color: isSelected ? AppColors.primaryLight : Colors.transparent,
                              ),
                              child: isSelected ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                opt,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ] else ...[
                  TextField(
                    onChanged: (val) => _selectedAnswers[currentQ.id] = val,
                    decoration: const InputDecoration(
                      hintText: 'Type your answer here...',
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Navigation Footer
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.cardBorder)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (_currentQuestionIndex > 0)
                OutlinedButton(
                  onPressed: () => setState(() => _currentQuestionIndex--),
                  child: const Text('Previous'),
                )
              else
                const SizedBox.shrink(),
              if (_currentQuestionIndex < quiz.questions.length - 1)
                ElevatedButton(
                  onPressed: () => setState(() => _currentQuestionIndex++),
                  child: const Text('Next Question'),
                )
              else
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmitAttempt,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGreen),
                  child: _isSubmitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Submit Quiz'),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildResultView(QuizAttemptResultModel result) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Score summary ring
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: result.passed ? AppColors.accentGreen.withOpacity(0.4) : AppColors.error.withOpacity(0.4)),
            ),
            child: Column(
              children: [
                Text(
                  '${result.score.toStringAsFixed(0)}%',
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w900,
                    color: result.passed ? AppColors.accentGreen : AppColors.error,
                  ),
                ),
                Text(
                  result.passed ? '🎉 Congratulations, You Passed!' : 'Needs Improvement',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: result.passed ? AppColors.accentGreen : AppColors.error,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Passing score: ${result.passScore}% · Earned ${result.earned} of ${result.total} pts',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Answer Explanations
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('Review Answers', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
          const SizedBox(height: 10),

          ...result.answers.map((ans) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: ans.isCorrect ? AppColors.accentGreen.withOpacity(0.3) : AppColors.error.withOpacity(0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        ans.isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                        color: ans.isCorrect ? AppColors.accentGreen : AppColors.error,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your answer: ${ans.answer}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: ans.isCorrect ? AppColors.textPrimary : AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (ans.explanation != null && ans.explanation!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(ans.explanation!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ],
                ],
              ),
            );
          }),
          const SizedBox(height: 20),

          // Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _startQuiz,
                  child: const Text('Try Again'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    setState(() => _result = null);
                    _fetchQuizData();
                  },
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
