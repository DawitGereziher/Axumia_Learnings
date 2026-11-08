class QuizQuestionModel {
  final String id;
  final String question;
  final String type; // 'multiple_choice', 'true_false', 'text'
  final List<String> options;
  final int points;
  final int position;

  QuizQuestionModel({
    required this.id,
    required this.question,
    required this.type,
    required this.options,
    required this.points,
    required this.position,
  });

  factory QuizQuestionModel.fromJson(Map<String, dynamic> json) {
    final rawOptions = json['options'];
    final parsedOptions = rawOptions is List
        ? rawOptions.map((e) => e.toString()).toList()
        : <String>[];

    return QuizQuestionModel(
      id: json['id']?.toString() ?? '',
      question: json['question']?.toString() ?? '',
      type: json['type']?.toString() ?? 'multiple_choice',
      options: parsedOptions,
      points: int.tryParse(json['points']?.toString() ?? '1') ?? 1,
      position: int.tryParse(json['position']?.toString() ?? '0') ?? 0,
    );
  }
}

class QuizModel {
  final String id;
  final String title;
  final String? description;
  final int passScore;
  final int? timeLimit; // minutes
  final int maxAttempts;
  final bool isGating;
  final List<QuizQuestionModel> questions;

  QuizModel({
    required this.id,
    required this.title,
    this.description,
    required this.passScore,
    this.timeLimit,
    required this.maxAttempts,
    required this.isGating,
    required this.questions,
  });

  factory QuizModel.fromJson(Map<String, dynamic> json) {
    final rawQuestions = json['questions'];
    final parsedQuestions = rawQuestions is List
        ? rawQuestions.map((q) => QuizQuestionModel.fromJson(q)).toList()
        : <QuizQuestionModel>[];

    return QuizModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Lesson Quiz',
      description: json['description']?.toString(),
      passScore: int.tryParse(json['pass_score']?.toString() ?? '70') ?? 70,
      timeLimit: json['time_limit'] != null ? int.tryParse(json['time_limit'].toString()) : null,
      maxAttempts: int.tryParse(json['max_attempts']?.toString() ?? '3') ?? 3,
      isGating: json['is_gating'] == true,
      questions: parsedQuestions,
    );
  }
}

class QuizGradedAnswerModel {
  final String questionId;
  final String answer;
  final bool isCorrect;
  final String? explanation;

  QuizGradedAnswerModel({
    required this.questionId,
    required this.answer,
    required this.isCorrect,
    this.explanation,
  });

  factory QuizGradedAnswerModel.fromJson(Map<String, dynamic> json) {
    return QuizGradedAnswerModel(
      questionId: json['question_id']?.toString() ?? '',
      answer: json['answer']?.toString() ?? '',
      isCorrect: json['is_correct'] == true,
      explanation: json['explanation']?.toString(),
    );
  }
}

class QuizAttemptResultModel {
  final String attemptId;
  final double score;
  final bool passed;
  final int passScore;
  final int earned;
  final int total;
  final int? timeTaken;
  final List<QuizGradedAnswerModel> answers;

  QuizAttemptResultModel({
    required this.attemptId,
    required this.score,
    required this.passed,
    required this.passScore,
    required this.earned,
    required this.total,
    this.timeTaken,
    required this.answers,
  });

  factory QuizAttemptResultModel.fromJson(Map<String, dynamic> json) {
    final rawAnswers = json['answers'];
    final parsedAnswers = rawAnswers is List
        ? rawAnswers.map((a) => QuizGradedAnswerModel.fromJson(a)).toList()
        : <QuizGradedAnswerModel>[];

    return QuizAttemptResultModel(
      attemptId: json['attempt_id']?.toString() ?? '',
      score: double.tryParse(json['score']?.toString() ?? '0') ?? 0.0,
      passed: json['passed'] == true,
      passScore: int.tryParse(json['pass_score']?.toString() ?? '70') ?? 70,
      earned: int.tryParse(json['earned']?.toString() ?? '0') ?? 0,
      total: int.tryParse(json['total']?.toString() ?? '0') ?? 0,
      timeTaken: json['time_taken'] != null ? int.tryParse(json['time_taken'].toString()) : null,
      answers: parsedAnswers,
    );
  }
}

class PastQuizAttemptModel {
  final String id;
  final double score;
  final bool passed;
  final DateTime completedAt;

  PastQuizAttemptModel({
    required this.id,
    required this.score,
    required this.passed,
    required this.completedAt,
  });

  factory PastQuizAttemptModel.fromJson(Map<String, dynamic> json) {
    return PastQuizAttemptModel(
      id: json['id']?.toString() ?? '',
      score: double.tryParse(json['score']?.toString() ?? '0') ?? 0.0,
      passed: json['passed'] == true,
      completedAt: DateTime.tryParse(json['completed_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
