import type { Module, Exercise, ModuleProgress, ExerciseScore } from './types';

// Mock modules data
const mockModules: Module[] = [
  {
    id: 1,
    title: 'Pressure Control',
    description:
      "Develop precise force control to safely interact with delicate tissue. This module trains your ability to apply consistent pressure—an essential skill for minimizing damage and bleeding.\n\nSkills\n\n• Maintain steady pressure within a target range\n• Prevent excessive force that could damage tissue\n• Improve consistency during sustained interactions",
    instructions: 'This module covers pressure control fundamentals. Follow the instructions carefully.',
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
    progress: 77,
    completed: false,
    locked: false,
  },
  {
    id: 2,
    title: 'Camera Control',
    description:
      "Master camera navigation to maintain optimal visibility throughout a procedure. This module sharpens your ability to position and stabilize the camera for clear, efficient surgical viewing.\n\nSkills\n\n• Precise camera positioning using hand controllers\n• Efficient target acquisition using crosshair alignment\n• Minimizing unnecessary camera motion",
    instructions: 'This module covers camera control and ergonomics.',
    exercises: [
      {
        id: 3,
        moduleId: 2,
        title: 'Exercise 1: Camera Positioning',
        description: 'Practice optimal camera placement',
        instructions: 'Position the camera for clear, stable views.',
        maxScore: 100,
        passingScore: 75,
      },
    ],
    progress: 0,
    completed: false,
    locked: true, // Coming soon
  },
  {
    id: 3,
    title: 'Peg Transfer',
    description:
      "Build dexterity and coordination by transferring objects between hands with precision. This module simulates bimanual instrument use, reinforcing control, accuracy, and fluid motion.\n\nSkills\n\n• Ambidexterity through hand-to-hand coordination\n• Smooth, controlled object manipulation\n• Spatial awareness during placement tasks",
    instructions: 'This module builds hand-eye coordination and instrument control.',
    exercises: [
      {
        id: 4,
        moduleId: 3,
        title: 'Exercise 1: Peg Transfer',
        description: 'Transfer pegs between pegs and targets',
        instructions: 'Pick and place pegs accurately with both hands.',
        maxScore: 100,
        passingScore: 75,
      },
    ],
    progress: 0,
    completed: false,
    locked: true, // Coming soon
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

