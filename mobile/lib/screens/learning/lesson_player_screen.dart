import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../models/course_model.dart';

class LessonPlayerScreen extends StatefulWidget {
  final CourseModel course;
  final LessonModel currentLesson;

  const LessonPlayerScreen({
    super.key,
    required this.course,
    required this.currentLesson,
  });

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen> {
  late LessonModel _activeLesson;
  bool _isMarkingComplete = false;
  bool _isCompleted = false;

  @override
  void initState() {
    super.initState();
    _activeLesson = widget.currentLesson;
    _isCompleted = _activeLesson.isCompleted;
  }

  Future<void> _toggleCompletion() async {
    setState(() => _isMarkingComplete = true);
    final res = await ApiClient.post(
      '/api/courses/lessons/${_activeLesson.id}/progress',
      body: {'is_completed': !_isCompleted},
    );
    if (mounted) {
      setState(() {
        _isMarkingComplete = false;
        if (res.isSuccess) {
          _isCompleted = !_isCompleted;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.course.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 16),
        ),
      ),
      body: Column(
        children: [
          // Video Player Viewport Container
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              color: Colors.black,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Video backdrop or placeholder
                  if (widget.course.fullThumbnailUrl != null)
                    Opacity(
                      opacity: 0.35,
                      child: Image.network(
                        widget.course.fullThumbnailUrl!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: double.infinity,
                      ),
                    ),
                  // Centered Play Button
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.9),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 16,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.play_arrow_rounded,
                      size: 38,
                      color: Colors.white,
                    ),
                  ),
                  // Title overlay on video bottom
                  Positioned(
                    bottom: 12,
                    left: 14,
                    right: 14,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            _activeLesson.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                        if (_activeLesson.durationMinutes > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                            child: Text(
                              '${_activeLesson.durationMinutes}:00',
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Lesson Details & Actions
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _activeLesson.title,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'AXumia Interactive Classroom',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                // Mark Complete Button
                OutlinedButton.icon(
                  onPressed: _isMarkingComplete ? null : _toggleCompletion,
                  icon: _isMarkingComplete
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : Icon(
                          _isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                          size: 18,
                          color: _isCompleted ? AppColors.accentGreen : AppColors.textMuted,
                        ),
                  label: Text(
                    _isCompleted ? 'Completed' : 'Mark Done',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _isCompleted ? AppColors.accentGreen : AppColors.textSecondary,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: _isCompleted ? AppColors.accentGreen.withOpacity(0.5) : AppColors.cardBorder,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.cardBorder),

          // Curriculum Navigation Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Curriculum',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textSecondary),
                ),
                Text(
                  '${widget.course.sections.length} sections',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),

          // Scrollable Section & Lesson List
          Expanded(
            child: ListView.builder(
              itemCount: widget.course.sections.length,
              itemBuilder: (context, sIdx) {
                final section = widget.course.sections[sIdx];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      color: AppColors.surface.withOpacity(0.6),
                      child: Text(
                        'SECTION ${sIdx + 1}: ${section.title.toUpperCase()}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    ...section.lessons.map((lesson) {
                      final isSelected = lesson.id == _activeLesson.id;
                      return ListTile(
                        selected: isSelected,
                        selectedTileColor: AppColors.primary.withOpacity(0.12),
                        leading: Icon(
                          isSelected ? Icons.play_arrow_rounded : Icons.play_circle_outline_rounded,
                          color: isSelected ? AppColors.primaryLight : AppColors.textMuted,
                          size: 20,
                        ),
                        title: Text(
                          lesson.title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                            color: isSelected ? AppColors.primaryLight : AppColors.textSecondary,
                          ),
                        ),
                        trailing: lesson.durationMinutes > 0
                            ? Text('${lesson.durationMinutes}m', style: const TextStyle(fontSize: 11, color: AppColors.textMuted))
                            : null,
                        onTap: () {
                          setState(() {
                            _activeLesson = lesson;
                            _isCompleted = lesson.isCompleted;
                          });
                        },
                      );
                    }),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
