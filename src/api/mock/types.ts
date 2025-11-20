// Type definitions for mock API responses

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'trainee' | 'physician' | 'instructor' | 'admin';
}

export interface Module {
  id: number;
  title: string;
  description: string;
  instructions: string;
  exercises: Exercise[];
  progress: number; // 0-100
  completed: boolean;
  locked: boolean;
}

export interface Exercise {
  id: number;
  moduleId: number;
  title: string;
  description: string;
  instructions: string;
  maxScore: number;
  passingScore: number; // Minimum score to pass
}

export interface ExerciseScore {
  exerciseId: number;
  moduleId: number;
  score: number;
  maxScore: number;
  completedAt: string;
  passed: boolean;
}

export interface ModuleProgress {
  moduleId: number;
  progress: number;
  exercisesCompleted: number;
  totalExercises: number;
  completed: boolean;
}

