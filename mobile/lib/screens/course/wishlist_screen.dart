import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/course_provider.dart';
import 'course_detail_screen.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CourseProvider>().fetchWishlist();
    });
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<CourseProvider>();
    final wishlist = prov.wishlist;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved Courses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => prov.fetchWishlist(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => prov.fetchWishlist(),
        color: AppColors.primary,
        child: prov.isLoadingWishlist && wishlist.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : wishlist.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.favorite_border_rounded, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Text(
                            'Your Wishlist is Empty',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Explore the course catalog and bookmark programs you want to master next.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.explore_outlined, size: 18),
                            label: const Text('Browse Catalog'),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    itemCount: wishlist.length,
                    itemBuilder: (context, index) {
                      final course = wishlist[index];
                      final thumbUrl = course.fullThumbnailUrl;
                      final priceText = course.price == 0 ? 'Free' : '${course.price.toStringAsFixed(0)} ETB';

                      return InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => CourseDetailScreen(slugOrId: course.id),
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Row(
                            children: [
                              // Thumbnail
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  width: 80,
                                  height: 80,
                                  color: AppColors.surfaceElevated,
                                  child: thumbUrl != null
                                      ? Image.network(
                                          thumbUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => const Icon(Icons.book_rounded, color: AppColors.textMuted),
                                        )
                                      : const Icon(Icons.book_rounded, color: AppColors.textMuted),
                                ),
                              ),
                              const SizedBox(width: 14),

                              // Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      course.title,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      course.instructorName ?? 'Instructor',
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      priceText,
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13,
                                        color: course.price == 0 ? AppColors.accentGreen : AppColors.primaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Remove button
                              IconButton(
                                icon: const Icon(Icons.favorite_rounded, color: AppColors.accentRose),
                                tooltip: 'Remove from wishlist',
                                onPressed: () {
                                  prov.toggleWishlist(course);
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
