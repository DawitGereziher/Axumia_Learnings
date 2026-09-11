import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/course_model.dart';
import '../../providers/course_provider.dart';
import 'lesson_player_screen.dart';

class MyCoursesScreen extends StatefulWidget {
  const MyCoursesScreen({super.key});

  @override
  State<MyCoursesScreen> createState() => _MyCoursesScreenState();
}

class _MyCoursesScreenState extends State<MyCoursesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CourseProvider>().fetchEnrolledCourses();
    });
  }

  @override
  Widget build(BuildContext context) {
    final courseProv = context.watch<CourseProvider>();
    final enrolled = courseProv.enrolledCourses;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Learning'),
      ),
      body: RefreshIndicator(
        onRefresh: () => courseProv.fetchEnrolledCourses(),
        color: AppColors.primary,
        child: courseProv.isLoadingEnrolled
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : enrolled.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.school_outlined, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Text(
                            'No courses enrolled yet',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Explore our catalog to enroll in courses and track your progress here.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    itemCount: enrolled.length,
                    itemBuilder: (context, index) {
                      final item = enrolled[index];
                      return _EnrolledCourseCard(
                        item: item,
                        onTap: () {
                          // Find first lesson
                          final firstLesson = item.course.sections.isNotEmpty &&
                                  item.course.sections.first.lessons.isNotEmpty
                              ? item.course.sections.first.lessons.first
                              : LessonModel(id: '1', title: 'Course Overview');
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => LessonPlayerScreen(course: item.course, currentLesson: firstLesson),
                            ),
                          );
                        },
                      );
                    },
                  ),
      ),
    );
  }
}

class _EnrolledCourseCard extends StatelessWidget {
  final EnrolledCourseModel item;
  final VoidCallback onTap;

  const _EnrolledCourseCard({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final pct = item.progressPct.clamp(0.0, 100.0);
    final isDone = item.completed || pct >= 100;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Course Icon / Thumbnail Box
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: item.course.fullThumbnailUrl != null
                          ? Image.network(
                              item.course.fullThumbnailUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.menu_book_rounded, color: AppColors.primaryLight),
                            )
                          : const Icon(Icons.menu_book_rounded, color: AppColors.primaryLight),
                    ),
                    const SizedBox(width: 14),

                    // Title & Completed Badge
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isDone ? AppColors.accentGreen.withOpacity(0.15) : AppColors.primary.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isDone ? 'Completed' : 'In Progress',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: isDone ? AppColors.accentGreen : AppColors.primaryLight,
                                  ),
                                ),
                              ),
                              Text(
                                '${pct.toInt()}%',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: isDone ? AppColors.accentGreen : AppColors.primaryLight,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            item.course.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Linear Progress Indicator
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: pct / 100,
                    minHeight: 6,
                    backgroundColor: Colors.white.withOpacity(0.06),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      isDone ? AppColors.accentGreen : AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Resume Action Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      isDone ? 'Review Course' : 'Continue Learning',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isDone ? AppColors.accentGreen : AppColors.primaryLight,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 14,
                      color: isDone ? AppColors.accentGreen : AppColors.primaryLight,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
