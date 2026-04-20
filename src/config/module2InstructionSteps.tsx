import type { InstructionStep } from '../components/instructions/instructionFlowTypes';

/**
 * Editable copy for Module 2 (Camera Control) onboarding — five steps, no key takeaway UI.
 */
export const module2InstructionSteps: InstructionStep[] = [
  {
    id: 'why-camera',
    title: 'Why Camera Control Matters',
    paragraphs: [
      'In robotic surgery, the camera is how the surgeon sees the operative field.',
      'Good camera control lets you place the view exactly where it is needed—panning, tilting, and re-centering with purpose.',
      'A stable, well-framed view supports precision, visibility, and safer instrument movement.',
    ],
  },
  {
    id: 'stylus-instruments',
    title: 'Move the Instruments',
    paragraphs: [
      'You use two Geomagic Touch haptic devices—one in each hand.',
      'Moving a stylus moves its corresponding surgical instrument on screen: position and orientation follow your hand.',
      'This is how you reach, orient tools, and work in 3D space.',
    ],
  },
  {
    id: 'camera-both-hands',
    title: 'Move the Camera',
    paragraphs: [
      'The camera does not move from stylus motion alone.',
      'To reposition the view, click with both hands (both controllers) and move the instruments together.',
      'That deliberate two-hand action is what pans, tilts, and re-frames the endoscope so you can see the next target clearly.',
    ],
  },
  {
    id: 'orbs',
    title: 'Collect the Orbs',
    paragraphs: [
      'You have one minute to collect five orbs. They appear one at a time in 3D space.',
      'Align the center crosshair over an orb and hold it there for five seconds to collect it.',
      'An indicator arrow points toward where the next orb has appeared. Aim for smooth, efficient paths—controlled motion beats wandering the view.',
    ],
  },
  {
    id: 'scoring',
    title: 'How You’re Scored',
    paragraphs: [
      'Your score is driven mainly by how many orbs you collect out of five.',
      'Score = orbs collected / 5 (often shown as a percentage in your results).',
      'Strong performance also means economy of motion: take the shortest practical path, avoid unnecessary camera swings, and stay deliberate between targets.',
    ],
  },
];
