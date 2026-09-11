import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/course_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../course/course_detail_screen.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CourseProvider>().fetchCourses();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final courseProv = context.watch<CourseProvider>();
    final courses = courseProv.filteredCourses;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => courseProv.fetchCourses(),
          color: AppColors.primary,
          child: CustomScrollView(
            slivers: [
              // Top Header & Search Bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Greeting & Title
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user != null ? 'Hello, ${user.firstName ?? 'Learner'} 👋' : 'Welcome to AXumia',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Explore Courses',
                                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w800,
                                    ),
                              ),
                            ],
                          ),
                          // Avatar / Role badge
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.surfaceElevated,
                            child: Text(
                              (user?.firstName?.isNotEmpty == true ? user!.firstName![0] : 'A').toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.primaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // Search input
                      TextField(
                        controller: _searchController,
                        onChanged: courseProv.setSearchQuery,
                        decoration: InputDecoration(
                          hintText: 'Search courses, subjects, skills...',
                          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 22),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textMuted),
                                  onPressed: () {
                                    _searchController.clear();
                                    courseProv.setSearchQuery('');
                                  },
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Category Horizontal List
                      SizedBox(
                        height: 38,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: courseProv.categories.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final cat = courseProv.categories[i];
                            final isSelected = courseProv.selectedCategory == cat;
                            return ChoiceChip(
                              label: Text(cat),
                              selected: isSelected,
                              onSelected: (_) => courseProv.setCategory(cat),
                              backgroundColor: AppColors.surface,
                              selectedColor: AppColors.primary.withOpacity(0.2),
                              labelStyle: TextStyle(
                                color: isSelected ? AppColors.primaryLight : AppColors.textSecondary,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                fontSize: 12,
                              ),
                              side: BorderSide(
                                color: isSelected ? AppColors.primary : AppColors.cardBorder,
                              ),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Course Grid / List
              if (courseProv.isLoading)
                const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (courses.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.menu_book_outlined, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        const Text(
                          'No courses found',
                          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textSecondary, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        const Text('Try adjusting your search or filters', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final course = courses[index];
                        return _CourseCard(
                          course: course,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CourseDetailScreen(slugOrId: course.slug ?? course.id),
                              ),
                            );
                          },
                        );
                      },
                      childCount: courses.length,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  final CourseModel course;
  final VoidCallback onTap;

  const _CourseCard({required this.course, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.cardBorder),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  course.fullThumbnailUrl != null
                      ? Image.network(
                          course.fullThumbnailUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.surfaceElevated,
                            child: const Center(child: Icon(Icons.school_rounded, size: 40, color: AppColors.textMuted)),
                          ),
                        )
                      : Container(
                          color: AppColors.surfaceElevated,
                          child: const Center(child: Icon(Icons.school_rounded, size: 40, color: AppColors.textMuted)),
                        ),
                  // Price Tag Overlay
                  Positioned(
                    bottom: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: course.isFree ? AppColors.accentGreen : AppColors.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        course.isFree ? 'Free' : '${course.price.toStringAsFixed(0)} ETB',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Details
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.textPrimary, height: 1.3),
                  ),
                  const SizedBox(height: 8),

                  // Instructor Name & Stats
                  Row(
                    children: [
                      if (course.instructor != null) ...[
                        const Icon(Icons.person_outline_rounded, size: 14, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            course.instructor!.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ),
                      ],
                      if (course.avgRating > 0) ...[
                        const Icon(Icons.star_rounded, size: 16, color: AppColors.accentAmber),
                        const SizedBox(width: 3),
                        Text(
                          course.avgRating.toStringAsFixed(1),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accentAmber),
                        ),
                      ] else ...[
                        const Text('New', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      ],
                      if (course.totalStudents > 0) ...[
                        const SizedBox(width: 8),
                        Text(
                          '· ${course.totalStudents} students',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
