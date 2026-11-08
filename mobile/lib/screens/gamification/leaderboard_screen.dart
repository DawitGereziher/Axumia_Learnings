import 'package:flutter/material.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../models/gamification_model.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  List<LeaderboardEntryModel> _entries = [];
  UserGamificationStatsModel? _myStats;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final leadRes = await ApiClient.get(ApiConstants.leaderboard);
      if (leadRes.isSuccess && leadRes.data is List) {
        _entries = (leadRes.data as List)
            .map((e) => LeaderboardEntryModel.fromJson(e))
            .toList();
      }

      final statsRes = await ApiClient.get(ApiConstants.myGamificationStats);
      if (statsRes.isSuccess && statsRes.data != null) {
        _myStats = UserGamificationStatsModel.fromJson(statsRes.data);
      }
    } catch (e) {
      _error = 'Failed to load leaderboard data';
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Learner Leaderboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchData,
        color: AppColors.primary,
        child: _isLoading && _entries.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Gamification Profile & Streak Banner
                    if (_myStats != null) ...[
                      _buildMyStatsCard(_myStats!),
                      const SizedBox(height: 24),
                    ],

                    // Leaderboard Title
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Top 10 Learners',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: AppColors.textPrimary),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text('XP RANKED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (_entries.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(32),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            const Icon(Icons.emoji_events_outlined, size: 56, color: AppColors.textMuted),
                            const SizedBox(height: 12),
                            const Text('No leaderboard data yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            const SizedBox(height: 4),
                            Text(_error ?? 'Complete lessons and quizzes to earn XP and appear here!',
                                textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    else
                      ..._entries.map((entry) => _buildEntryTile(entry)),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildMyStatsCard(UserGamificationStatsModel stats) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.accentAmber.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.bolt_rounded, color: AppColors.accentAmber, size: 22),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Level ${stats.level} · ${stats.levelTitle}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
                      ),
                      Text('${stats.totalXp} Total XP', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                ],
              ),
              if (stats.currentStreak > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accentRose.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.accentRose.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Text('🔥 ', style: TextStyle(fontSize: 13)),
                      Text('${stats.currentStreak}d Streak',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.accentRose)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: stats.levelProgress,
              minHeight: 8,
              backgroundColor: AppColors.surfaceElevated,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryLight),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${stats.totalXp} XP', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              Text(
                stats.nextLevelXp != null ? 'Next Level: ${stats.nextLevelXp} XP' : 'Max Level Reached',
                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),

          // Badges Scroll
          if (stats.badges.isNotEmpty) ...[
            const Divider(height: 24),
            const Text('Earned Badges', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: stats.badges.map((b) {
                  return Container(
                    margin: const EdgeInsets.only(right: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: b.earned ? AppColors.surfaceElevated : AppColors.surfaceElevated.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: b.earned ? AppColors.accentAmber.withOpacity(0.4) : AppColors.cardBorder,
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(b.icon, style: TextStyle(fontSize: 14, color: b.earned ? null : Colors.grey)),
                        const SizedBox(width: 6),
                        Text(
                          b.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: b.earned ? FontWeight.bold : FontWeight.normal,
                            color: b.earned ? AppColors.textPrimary : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEntryTile(LeaderboardEntryModel entry) {
    Color rankColor;
    String rankBadge;
    if (entry.rank == 1) {
      rankColor = const Color(0xFFFDE047);
      rankBadge = '🥇';
    } else if (entry.rank == 2) {
      rankColor = const Color(0xFF94A3B8);
      rankBadge = '🥈';
    } else if (entry.rank == 3) {
      rankColor = const Color(0xFFCD7F32);
      rankBadge = '🥉';
    } else {
      rankColor = AppColors.textMuted;
      rankBadge = '#${entry.rank}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: entry.isTop3 ? 14 : 10),
      decoration: BoxDecoration(
        color: entry.isTop3 ? AppColors.surfaceElevated : AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: entry.isTop3 ? rankColor.withOpacity(0.4) : AppColors.cardBorder,
        ),
      ),
      child: Row(
        children: [
          // Rank Badge
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: entry.isTop3 ? rankColor.withOpacity(0.15) : AppColors.surfaceElevated,
              border: Border.all(color: rankColor, width: entry.isTop3 ? 1.5 : 1),
            ),
            child: Text(
              rankBadge,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: entry.isTop3 ? 16 : 12,
                color: rankColor,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // User Name & Level
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: entry.isTop3 ? FontWeight.w800 : FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Level ${entry.level} · ${entry.levelTitle}${entry.currentStreak > 0 ? ' · 🔥 ${entry.currentStreak}d' : ''}',
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),

          // Total XP
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${entry.totalXp}',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: entry.isTop3 ? 16 : 14,
                  color: entry.isTop3 ? const Color(0xFFFDE047) : AppColors.primaryLight,
                ),
              ),
              const Text('XP', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
            ],
          ),
        ],
      ),
    );
  }
}
