import type { InstructionStep } from '../components/instructions/instructionFlowTypes';

/**
 * Editable copy for Module 1 onboarding. Visuals are composed in the page layer.
 */
export const module1InstructionSteps: InstructionStep[] = [
  {
    id: 'sensor',
    title: 'Control Starts at Your Fingertip',
    paragraphs: [
      <>
        You’ll wear a <strong>glove with a pressure sensor</strong> on your index finger.
      </>,
      'The pressure you apply controls instrument behavior in the module—your PSI reading drives what you see on screen.',
      'In robotic surgery, controlled force matters: too much pressure can harm tissue; too little can reduce precision.',
    ],
  },
  {
    id: 'live-view',
    title: 'See Pressure in Action',
    paragraphs: [
      'When the module begins, you’ll see a robotic instrument and a PSI gauge along the bottom.',
      'As you apply pressure, the instrument jaws open and close in real time.',
      'The gauge shows your current PSI so you can adjust and stay in control.',
    ],
  },
  {
    id: 'intervals',
    title: 'Follow the Target Range',
    paragraphs: [
      'The run lasts 20 seconds, split into four 5-second intervals.',
      'In each interval, keep your pressure inside the green target zone on the gauge.',
      'With about 2 seconds left before a change, the next green zone pulses so you can prepare.',
    ],
  },
  {
    id: 'scoring',
    title: 'How You Succeed',
    paragraphs: [
      'Your score reflects how long you stay inside the active green zone across the full 20 seconds.',
      'Steady pressure and smooth transitions between ranges beat sudden spikes or drift.',
    ],
  },
];
