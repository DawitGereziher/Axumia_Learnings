import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/course_model.dart';
import '../../providers/course_provider.dart';
import '../learning/lesson_player_screen.dart';

class CourseDetailScreen extends StatefulWidget {
  final String slugOrId;

  const CourseDetailScreen({super.key, required this.slugOrId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  CourseModel? _course;
  bool _isLoading = true;
  bool _isEnrolling = false;

  @override
  void initState() {
    super.initState();
    _loadCourse();
  }

  Future<void> _loadCourse() async {
    setState(() => _isLoading = true);
    final c = await context.read<CourseProvider>().fetchCourseDetail(widget.slugOrId);
    if (mounted) {
      setState(() {
        _course = c;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleEnroll() async {
    if (_course == null) return;

    if (_course!.isFree) {
      setState(() => _isEnrolling = true);
      final success = await context.read<CourseProvider>().enrollFree(_course!.id);
      if (mounted) {
        setState(() => _isEnrolling = false);
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Successfully enrolled!'), backgroundColor: AppColors.accentGreen),
          );
          // Navigate to lesson player with first lesson
          final firstLesson = _course!.sections.isNotEmpty && _course!.sections.first.lessons.isNotEmpty
              ? _course!.sections.first.lessons.first
              : null;
          if (firstLesson != null) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => LessonPlayerScreen(course: _course!, currentLesson: firstLesson),
              ),
            );
          }
        }
      }
    } else {
      // Chapa Paid Checkout
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Checkout for ${_course!.price.toStringAsFixed(0)} ETB via Chapa'),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (_course == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Course not found')),
      );
    }

    final totalLessons = _course!.sections.fold<int>(
      0,
      (sum, sec) => sum + sec.lessons.length,
    );

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Collapsible App Bar with Course Image
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: _course!.fullThumbnailUrl != null
                  ? Image.network(
                      _course!.fullThumbnailUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: AppColors.surfaceElevated),
                    )
                  : Container(color: AppColors.surfaceElevated),
            ),
          ),

          // Course Body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    _course!.title,
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          height: 1.3,
                        ),
                  ),
                  const SizedBox(height: 12),

                  // Rating & Students Row
                  Row(
                    children: [
                      if (_course!.avgRating > 0) ...[
                        const Icon(Icons.star_rounded, size: 18, color: AppColors.accentAmber),
                        const SizedBox(width: 4),
                        Text(
                          _course!.avgRating.toStringAsFixed(1),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentAmber),
                        ),
                        const SizedBox(width: 10),
                      ],
                      Text(
                        '${_course!.totalStudents} students',
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                      ),
                      const SizedBox(width: 10),
                      Text('· $totalLessons lessons', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Instructor Card
                  if (_course!.instructor != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primary.withOpacity(0.2),
                            child: Text(
                              _course!.instructor!.name[0],
                              style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _course!.instructor!.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                if (_course!.instructor!.headline != null)
                                  Text(
                                    _course!.instructor!.headline!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 20),

                  // Description
                  if (_course!.description != null && _course!.description!.isNotEmpty) ...[
                    const Text('About Course', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(
                      _course!.description!,
                      style: const TextStyle(color: AppColors.textSecondary, height: 1.5, fontSize: 14),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Curriculum Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Curriculum', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      Text('${_course!.sections.length} sections · $totalLessons lessons', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Sections List
                  ..._course!.sections.map((section) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: ExpansionTile(
                        initiallyExpanded: true,
                        title: Text(
                          section.title,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary),
                        ),
                        subtitle: Text('${section.lessons.length} lessons', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                        children: section.lessons.map((lesson) {
                          return ListTile(
                            leading: const Icon(Icons.play_circle_outline_rounded, color: AppColors.primaryLight, size: 22),
                            title: Text(lesson.title, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                            trailing: lesson.durationMinutes > 0
                                ? Text('${lesson.durationMinutes}m', style: const TextStyle(color: AppColors.textMuted, fontSize: 11))
                                : null,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => LessonPlayerScreen(course: _course!, currentLesson: lesson),
                                ),
                              );
                            },
                          );
                        }).toList(),
                      ),
                    );
                  }),
                  const SizedBox(height: 80), // Padding for sticky bottom bar
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: const Border(top: BorderSide(color: AppColors.cardBorder)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, -4)),
          ],
        ),
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Total Price', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                Text(
                  _course!.isFree ? 'FREE' : '${_course!.price.toStringAsFixed(0)} ETB',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: _course!.isFree ? AppColors.accentGreen : AppColors.primaryLight,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 24),
            Expanded(
              child: ElevatedButton(
                onPressed: _isEnrolling ? null : _handleEnroll,
                child: _isEnrolling
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_course!.isFree ? 'Enroll for Free' : 'Buy Course'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
