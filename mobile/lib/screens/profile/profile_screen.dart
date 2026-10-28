import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../course/wishlist_screen.dart';
import '../gamification/leaderboard_screen.dart';
import '../instructor/instructor_earnings_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          children: [
            // User Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      (user?.fullName.isNotEmpty == true ? user!.fullName[0] : 'U').toUpperCase(),
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.fullName ?? 'AXumia User',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            (user?.role ?? 'STUDENT').toUpperCase(),
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primaryLight),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Instructor Portal Section
            if (user?.isInstructor == true) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: EdgeInsets.only(left: 4, bottom: 8),
                  child: Text(
                    'INSTRUCTOR PORTAL',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primaryLight, letterSpacing: 0.8),
                  ),
                ),
              ),
              _SettingsTile(
                icon: Icons.account_balance_wallet_rounded,
                title: 'Instructor Earnings & Ledger',
                subtitle: 'Manage revenue, ledger & request payouts',
                trailingColor: AppColors.accentGreen,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const InstructorEarningsScreen()),
                  );
                },
              ),
              _SettingsTile(
                icon: Icons.verified_user_rounded,
                title: 'KYC & Tutor Verification',
                subtitle: user?.instructorProfile?.kycStatus.toUpperCase() ?? 'APPROVED / VERIFIED',
                trailingColor: AppColors.accentGreen,
                onTap: () {},
              ),
              const SizedBox(height: 16),
            ],

            // General Settings & Navigation Tiles
            const Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: EdgeInsets.only(left: 4, bottom: 8),
                child: Text(
                  'PREFERENCES & SECURITY',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textMuted, letterSpacing: 0.8),
                ),
              ),
            ),
            _SettingsTile(
              icon: Icons.badge_outlined,
              title: 'Account Role',
              subtitle: user?.role.toUpperCase() ?? 'STUDENT',
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.language_rounded,
              title: 'Preferred Language',
              subtitle: user?.preferredLanguage ?? 'English',
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.mark_email_read_outlined,
              title: 'Email Verification',
              subtitle: user?.isEmailVerified == true ? 'Verified' : 'Unverified',
              trailingColor: user?.isEmailVerified == true ? AppColors.accentGreen : AppColors.accentAmber,
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.favorite_border_rounded,
              title: 'Saved Courses (Wishlist)',
              subtitle: 'Courses bookmarked for later',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const WishlistScreen()),
                );
              },
            ),
            _SettingsTile(
              icon: Icons.emoji_events_outlined,
              title: 'XP Leaderboard & Badges',
              subtitle: 'View learner rankings, streaks and badges',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
                );
              },
            ),
            const SizedBox(height: 16),

            // Support & About
            _SettingsTile(
              icon: Icons.help_outline_rounded,
              title: 'Help & Support',
              subtitle: 'FAQs and platform guidelines',
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.info_outline_rounded,
              title: 'About AXumia',
              subtitle: 'Version 1.0.0 Mobile',
              onTap: () {},
            ),
            const SizedBox(height: 32),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: AppColors.surface,
                      title: const Text('Sign Out'),
                      content: const Text('Are you sure you want to sign out from AXumia?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            context.read<AuthProvider>().logout();
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                          child: const Text('Sign Out'),
                        ),
                      ],
                    ),
                  );
                },
                icon: const Icon(Icons.logout_rounded, color: AppColors.error, size: 18),
                label: const Text('Sign Out', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color? trailingColor;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailingColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primaryLight, size: 22),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(
          subtitle,
          style: TextStyle(fontSize: 12, color: trailingColor ?? AppColors.textMuted),
        ),
        trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
        onTap: onTap,
      ),
    );
  }
}
