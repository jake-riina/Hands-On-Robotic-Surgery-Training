import type { Module, Exercise, ModuleProgress, ExerciseScore } from './types';

// Mock modules data
const mockModules: Module[] = [
  {
    id: 1,
    title: 'Module 1: Basic Techniques',
    description: 'Learn fundamental robotic surgery techniques',
    instructions: 'This module covers the basics of robotic surgery. Follow the instructions carefully.',
    exercises: [
      {
        id: 1,
        moduleId: 1,
        title: 'Exercise 1: Basic Movements',
        description: 'Practice basic hand movements',
        instructions: 'Move your hands slowly and precisely.',
        maxScore: 100,
        passingScore: 70,
      },
      {
        id: 2,
        moduleId: 1,
        title: 'Exercise 2: Pressure Control',
        description: 'Learn to control pressure',
        instructions: 'Maintain consistent pressure throughout the exercise.',
        maxScore: 100,
        passingScore: 70,
      },
    ],
    progress: 0,
    completed: false,
    locked: false,
  },
  {
    id: 2,
    title: 'Module 2: Advanced Techniques',
    description: 'Advanced robotic surgery procedures',
    instructions: 'This module builds on Module 1.',
    exercises: [
      {
        id: 3,
        moduleId: 2,
        title: 'Exercise 1: Complex Movements',
        description: 'Practice complex hand coordination',
        instructions: 'Coordinate both hands simultaneously.',
        maxScore: 100,
        passingScore: 75,
      },
    ],
    progress: 0,
    completed: false,
    locked: true, // Locked until Module 1 is completed
  },
];

// Mock API functions
export const mockModulesAPI = {
  getAllModules: async (): Promise<Module[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockModules;
  },

  getModuleById: async (id: number): Promise<Module | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockModules.find((m) => m.id === id) || null;
  },

  getExerciseById: async (
    moduleId: number,
    exerciseId: number
  ): Promise<Exercise | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const module = mockModules.find((m) => m.id === moduleId);
    if (!module) return null;
    return module.exercises.find((e) => e.id === exerciseId) || null;
  },

  getModuleProgress: async (moduleId: number): Promise<ModuleProgress> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const module = mockModules.find((m) => m.id === moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    return {
      moduleId,
      progress: module.progress,
      exercisesCompleted: 0, // Would be calculated from scores
      totalExercises: module.exercises.length,
      completed: module.completed,
    };
  },

  submitExerciseScore: async (
    moduleId: number,
    exerciseId: number,
    score: number
  ): Promise<ExerciseScore> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const module = mockModules.find((m) => m.id === moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    const exercise = module.exercises.find((e) => e.id === exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    const passed = score >= exercise.passingScore;

    // Update module progress (mock)
    // In real app, this would update the backend

    return {
      exerciseId,
      moduleId,
      score,
      maxScore: exercise.maxScore,
      completedAt: new Date().toISOString(),
      passed,
    };
  },

  completeModule: async (moduleId: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const module = mockModules.find((m) => m.id === moduleId);
    if (module) {
      module.completed = true;
      module.progress = 100;
    }
  },
};

