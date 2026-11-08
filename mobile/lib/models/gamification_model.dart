class BadgeModel {
  final String id;
  final String label;
  final String description;
  final String icon;
  final bool earned;
  final DateTime? earnedAt;

  BadgeModel({
    required this.id,
    required this.label,
    required this.description,
    required this.icon,
    required this.earned,
    this.earnedAt,
  });

  factory BadgeModel.fromJson(Map<String, dynamic> json) {
    return BadgeModel(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      icon: json['icon']?.toString() ?? '🎯',
      earned: json['earned'] == true,
      earnedAt: json['earned_at'] != null ? DateTime.tryParse(json['earned_at']) : null,
    );
  }
}

class UserGamificationStatsModel {
  final int totalXp;
  final int level;
  final int currentStreak;
  final int longestStreak;
  final int? nextLevelXp;
  final List<BadgeModel> badges;

  UserGamificationStatsModel({
    required this.totalXp,
    required this.level,
    required this.currentStreak,
    required this.longestStreak,
    this.nextLevelXp,
    required this.badges,
  });

  String get levelTitle {
    const titles = ['Newcomer', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Legend', 'Champion'];
    if (level >= 1 && level <= titles.length) {
      return titles[level - 1];
    }
    return 'Champion';
  }

  double get levelProgress {
    if (nextLevelXp == null || nextLevelXp! <= 0) return 1.0;
    return (totalXp / nextLevelXp!).clamp(0.0, 1.0);
  }

  factory UserGamificationStatsModel.fromJson(Map<String, dynamic> json) {
    final rawBadges = json['badges'];
    final parsedBadges = rawBadges is List
        ? rawBadges.map((b) => BadgeModel.fromJson(b)).toList()
        : <BadgeModel>[];

    return UserGamificationStatsModel(
      totalXp: int.tryParse(json['total_xp']?.toString() ?? '0') ?? 0,
      level: int.tryParse(json['level']?.toString() ?? '1') ?? 1,
      currentStreak: int.tryParse(json['current_streak']?.toString() ?? '0') ?? 0,
      longestStreak: int.tryParse(json['longest_streak']?.toString() ?? '0') ?? 0,
      nextLevelXp: json['next_level_xp'] != null ? int.tryParse(json['next_level_xp'].toString()) : null,
      badges: parsedBadges,
    );
  }
}

class LeaderboardEntryModel {
  final int rank;
  final String userId;
  final String name;
  final String? avatar;
  final int totalXp;
  final int level;
  final int currentStreak;

  LeaderboardEntryModel({
    required this.rank,
    required this.userId,
    required this.name,
    this.avatar,
    required this.totalXp,
    required this.level,
    required this.currentStreak,
  });

  bool get isTop3 => rank <= 3;

  String get levelTitle {
    const titles = ['Newcomer', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Legend', 'Champion'];
    if (level >= 1 && level <= titles.length) {
      return titles[level - 1];
    }
    return 'Champion';
  }

  factory LeaderboardEntryModel.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntryModel(
      rank: int.tryParse(json['rank']?.toString() ?? '0') ?? 0,
      userId: json['user_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Anonymous',
      avatar: json['avatar']?.toString(),
      totalXp: int.tryParse(json['total_xp']?.toString() ?? '0') ?? 0,
      level: int.tryParse(json['level']?.toString() ?? '1') ?? 1,
      currentStreak: int.tryParse(json['current_streak']?.toString() ?? '0') ?? 0,
    );
  }
}
