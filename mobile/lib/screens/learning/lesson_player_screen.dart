import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../models/course_model.dart';
import 'quiz_sheet.dart';

String? extractYoutubeVideoId(String? url) {
  if (url == null || url.trim().isEmpty) return null;
  final clean = url.trim();
  final regExpShort = RegExp(r'youtu\.be\/([a-zA-Z0-9_\-]{11})');
  final match1 = regExpShort.firstMatch(clean);
  if (match1 != null && match1.groupCount >= 1) return match1.group(1);

  final regExpLong = RegExp(r'(?:watch\?v=|embed\/|v\/|shorts\/)([a-zA-Z0-9_\-]{11})');
  final match2 = regExpLong.firstMatch(clean);
  if (match2 != null && match2.groupCount >= 1) return match2.group(1);

  if (RegExp(r'^[a-zA-Z0-9_\-]{11}$').hasMatch(clean)) return clean;
  return null;
}

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

class _LessonPlayerScreenState extends State<LessonPlayerScreen> with SingleTickerProviderStateMixin {
  late LessonModel _activeLesson;
  YoutubePlayerController? _youtubeController;
  StreamSubscription<YoutubePlayerValue>? _playerSub;
  bool _isMarkingComplete = false;
  final Set<String> _completedLessonIds = {};

  // Auto-advance
  Timer? _autoAdvanceTimer;
  int _autoAdvanceSeconds = 5;
  bool _showAutoAdvanceOverlay = false;

  // Heartbeat progress
  Timer? _heartbeatTimer;

  // Certificate state
  bool _isClaimingCertificate = false;
  Map<String, dynamic>? _claimedCertificate;

  // Tab controller for Curriculum & Resources
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _activeLesson = widget.currentLesson;

    for (final sec in widget.course.sections) {
      for (final l in sec.lessons) {
        if (l.isCompleted) _completedLessonIds.add(l.id);
      }
    }

    _initPlayerForLesson(_activeLesson);
    _startHeartbeat();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _autoAdvanceTimer?.cancel();
    _playerSub?.cancel();
    _youtubeController?.close();
    _tabController.dispose();
    super.dispose();
  }

  void _initPlayerForLesson(LessonModel lesson) {
    _autoAdvanceTimer?.cancel();
    setState(() {
      _showAutoAdvanceOverlay = false;
      _autoAdvanceSeconds = 5;
    });

    final videoId = extractYoutubeVideoId(lesson.activeVideoUrl);

    if (videoId != null && videoId.isNotEmpty) {
      if (_youtubeController == null) {
        _youtubeController = YoutubePlayerController.fromVideoId(
          videoId: videoId,
          autoPlay: true,
          params: const YoutubePlayerParams(
            showControls: true,
            showFullscreenButton: true,
            mute: false,
          ),
        );
        _playerSub = _youtubeController!.stream.listen(_onPlayerStateChange);
      } else {
        _youtubeController!.loadVideoById(videoId: videoId);
      }
    } else {
      _youtubeController?.pauseVideo();
    }
  }

  void _onPlayerStateChange(YoutubePlayerValue value) {
    if (!mounted) return;

    // Video completed event
    if (value.playerState == PlayerState.ended) {
      _onVideoEnded();
    }
  }

  void _onVideoEnded() {
    // Automatically mark complete if not already
    if (!_completedLessonIds.contains(_activeLesson.id)) {
      _toggleCompletion(targetState: true);
    }

    // Check if next lesson exists
    final nextLesson = _getNextLesson();
    if (nextLesson != null && mounted) {
      setState(() {
        _showAutoAdvanceOverlay = true;
        _autoAdvanceSeconds = 5;
      });

      _autoAdvanceTimer?.cancel();
      _autoAdvanceTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }
        if (_autoAdvanceSeconds <= 1) {
          timer.cancel();
          _playNextLesson();
        } else {
          setState(() => _autoAdvanceSeconds--);
        }
      });
    }
  }

  LessonModel? _getNextLesson() {
    final allLessons = _getAllLessons();
    final currentIndex = allLessons.indexWhere((l) => l.id == _activeLesson.id);
    if (currentIndex != -1 && currentIndex + 1 < allLessons.length) {
      return allLessons[currentIndex + 1];
    }
    return null;
  }

  List<LessonModel> _getAllLessons() {
    final list = <LessonModel>[];
    for (final sec in widget.course.sections) {
      list.addAll(sec.lessons);
    }
    return list;
  }

  void _playNextLesson() {
    _autoAdvanceTimer?.cancel();
    final next = _getNextLesson();
    if (next != null) {
      _selectLesson(next);
    }
  }

  void _cancelAutoAdvance() {
    _autoAdvanceTimer?.cancel();
    setState(() => _showAutoAdvanceOverlay = false);
  }

  void _selectLesson(LessonModel lesson) {
    if (_activeLesson.id == lesson.id) return;
    setState(() {
      _activeLesson = lesson;
    });
    _initPlayerForLesson(lesson);
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      if (!mounted || _youtubeController == null) return;
      try {
        final currentSec = (await _youtubeController!.currentTime).toInt();
        final totalSec = (await _youtubeController!.duration).toInt();
        if (currentSec > 0 && totalSec > 0) {
          ApiClient.post(
            ApiConstants.lessonProgress(_activeLesson.id),
            body: {
              'time_seconds': currentSec,
              'duration_seconds': totalSec,
            },
          );
        }
      } catch (_) {}
    });
  }

  Future<void> _toggleCompletion({bool? targetState}) async {
    final willComplete = targetState ?? !_completedLessonIds.contains(_activeLesson.id);

    setState(() => _isMarkingComplete = true);

    final res = await ApiClient.post(
      ApiConstants.lessonProgress(_activeLesson.id),
      body: {'is_completed': willComplete},
    );

    if (mounted) {
      setState(() {
        _isMarkingComplete = false;
        if (res.isSuccess) {
          if (willComplete) {
            _completedLessonIds.add(_activeLesson.id);
          } else {
            _completedLessonIds.remove(_activeLesson.id);
          }
        }
      });

      // If 100% curriculum completed, prompt certificate
      if (_calculateCompletionPct() >= 100 && _claimedCertificate == null) {
        _showCompletionCertificateModal();
      }
    }
  }

  double _calculateCompletionPct() {
    final total = _getAllLessons().length;
    if (total == 0) return 0.0;
    return (_completedLessonIds.length / total) * 100.0;
  }

  Future<void> _downloadMaterial(LessonMaterialModel material) async {
    final res = await ApiClient.get(ApiConstants.materialDownload(material.id));
    if (res.isSuccess && res.data is Map && res.data['url'] != null) {
      final url = Uri.parse(res.data['url'].toString());
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
        return;
      }
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open resource link.'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _claimCertificate() async {
    setState(() => _isClaimingCertificate = true);
    final res = await ApiClient.post(ApiConstants.claimCertificate(widget.course.id));
    if (mounted) {
      setState(() {
        _isClaimingCertificate = false;
        if (res.isSuccess && res.data is Map) {
          _claimedCertificate = Map<String, dynamic>.from(res.data as Map);
        }
      });
      if (_claimedCertificate != null) {
        Navigator.of(context).pop(); // Dismiss prompt modal
        _showVerifiedCertificateDialog(_claimedCertificate!);
      }
    }
  }

  void _showCompletionCertificateModal() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.accentGreen.withOpacity(0.15),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.accentGreen.withOpacity(0.4)),
              ),
              child: const Icon(Icons.emoji_events_rounded, color: AppColors.accentGreen, size: 40),
            ),
            const SizedBox(height: 18),
            const Text(
              'Curriculum 100% Complete! 🎓',
              textAlign: TextAlign.center,
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'Congratulations! You have completed all lessons in ${widget.course.title}. Claim your verifiable completion certificate now.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isClaimingCertificate ? null : _claimCertificate,
                icon: _isClaimingCertificate
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.workspace_premium_rounded, size: 18),
                label: const Text('Claim Official Certificate'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGreen,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Close', style: TextStyle(color: AppColors.textMuted)),
            ),
          ],
        ),
      ),
    );
  }

  void _showVerifiedCertificateDialog(Map<String, dynamic> cert) {
    final certNumber = cert['certificate_number'] ?? 'AX-VERIFIED';
    final issueDate = cert['issue_date'] != null ? cert['issue_date'].toString().split('T')[0] : 'Today';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.accentGreen)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.verified_user_rounded, color: AppColors.accentGreen, size: 48),
            const SizedBox(height: 12),
            const Text(
              'Certificate Verified',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Certificate #', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                      Text(certNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryLight)),
                    ],
                  ),
                  const Divider(height: 12, color: AppColors.cardBorder),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Issued Date', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                      Text(issueDate, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCompleted = _completedLessonIds.contains(_activeLesson.id);
    final videoId = extractYoutubeVideoId(_activeLesson.activeVideoUrl);
    final hasValidVideo = videoId != null && videoId.isNotEmpty;
    final totalLessons = _getAllLessons().length;
    final completionPct = _calculateCompletionPct();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.course.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 15),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: completionPct >= 100 ? AppColors.accentGreen.withOpacity(0.15) : AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: completionPct >= 100 ? AppColors.accentGreen : AppColors.cardBorder),
                ),
                child: Text(
                  '${completionPct.toInt()}% Complete',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: completionPct >= 100 ? AppColors.accentGreen : AppColors.primaryLight,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Video Player / Placeholder Viewport ──────────────────────────────
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              color: Colors.black,
              child: Stack(
                children: [
                  if (hasValidVideo && _youtubeController != null)
                    YoutubePlayer(controller: _youtubeController!)
                  else
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.article_outlined, size: 48, color: AppColors.textMuted),
                          const SizedBox(height: 8),
                          Text(
                            _activeLesson.contentType == 'text' ? 'Reading Material' : 'No Video Available',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ],
                      ),
                    ),

                  // Auto-advance overlay
                  if (_showAutoAdvanceOverlay)
                    Container(
                      color: Colors.black.withOpacity(0.85),
                      padding: const EdgeInsets.all(20),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Up Next in ${_autoAdvanceSeconds}s...',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                OutlinedButton(
                                  onPressed: _cancelAutoAdvance,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white70,
                                    side: const BorderSide(color: Colors.white30),
                                  ),
                                  child: const Text('Cancel'),
                                ),
                                const SizedBox(width: 12),
                                ElevatedButton.icon(
                                  onPressed: _playNextLesson,
                                  icon: const Icon(Icons.play_arrow_rounded, size: 16),
                                  label: const Text('Play Next'),
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // ── Active Lesson Action Bar ─────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.cardBorder)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _activeLesson.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'AXumia Interactive Player · ${_activeLesson.durationMinutes} mins',
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: _isMarkingComplete ? null : () => _toggleCompletion(),
                  icon: _isMarkingComplete
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : Icon(
                          isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                          size: 16,
                          color: isCompleted ? AppColors.accentGreen : AppColors.textMuted,
                        ),
                  label: Text(
                    isCompleted ? 'Done' : 'Mark Done',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isCompleted ? AppColors.accentGreen : AppColors.textSecondary,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: isCompleted ? AppColors.accentGreen.withOpacity(0.5) : AppColors.cardBorder),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
              ],
            ),
          ),

          // ── Tabs: Curriculum & Downloadable Resources ────────────────────────
          TabBar(
            controller: _tabController,
            indicatorColor: AppColors.primaryLight,
            labelColor: AppColors.primaryLight,
            unselectedLabelColor: AppColors.textMuted,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            tabs: [
              Tab(text: 'Curriculum ($totalLessons)'),
              Tab(text: 'Resources (${_activeLesson.materials.length})'),
              const Tab(text: 'Quiz'),
            ],
          ),

          // ── Tab Views ────────────────────────────────────────────────────────
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Curriculum Section & Lesson List
                ListView.builder(
                  itemCount: widget.course.sections.length,
                  itemBuilder: (context, sIdx) {
                    final section = widget.course.sections[sIdx];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          color: AppColors.surfaceElevated.withOpacity(0.5),
                          child: Text(
                            'SECTION ${sIdx + 1}: ${section.title.toUpperCase()}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted, letterSpacing: 0.5),
                          ),
                        ),
                        ...section.lessons.map((lesson) {
                          final isSelected = lesson.id == _activeLesson.id;
                          final isLessonDone = _completedLessonIds.contains(lesson.id);

                          return ListTile(
                            selected: isSelected,
                            selectedTileColor: AppColors.primary.withOpacity(0.12),
                            leading: Icon(
                              isLessonDone
                                  ? Icons.check_circle_rounded
                                  : isSelected
                                      ? Icons.play_arrow_rounded
                                      : Icons.play_circle_outline_rounded,
                              color: isLessonDone
                                  ? AppColors.accentGreen
                                  : isSelected
                                      ? AppColors.primaryLight
                                      : AppColors.textMuted,
                              size: 20,
                            ),
                            title: Text(
                              lesson.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                                color: isSelected ? AppColors.primaryLight : AppColors.textSecondary,
                              ),
                            ),
                            trailing: Text(
                              '${lesson.durationMinutes}m',
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                            ),
                            onTap: () => _selectLesson(lesson),
                          );
                        }),
                      ],
                    );
                  },
                ),

                // Tab 2: Downloadable Resources (Cloudflare R2)
                _activeLesson.materials.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text(
                            'No downloadable materials for this lesson.',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _activeLesson.materials.length,
                        itemBuilder: (context, idx) {
                          final material = _activeLesson.materials[idx];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: ListTile(
                              leading: const Icon(Icons.description_rounded, color: AppColors.primaryLight, size: 24),
                              title: Text(material.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                              subtitle: material.fileType != null ? Text(material.fileType!.toUpperCase(), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)) : null,
                              trailing: IconButton(
                                icon: const Icon(Icons.download_rounded, color: AppColors.accentGreen),
                                onPressed: () => _downloadMaterial(material),
                              ),
                            ),
                          );
                        },
                      ),

                // Tab 3: Interactive Lesson Quiz
                QuizSheet(
                  key: ValueKey(_activeLesson.id),
                  lessonId: _activeLesson.id,
                  onQuizPassed: () {
                    if (!_completedLessonIds.contains(_activeLesson.id)) {
                      _toggleCompletion();
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
