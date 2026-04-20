import type { InstructionStep } from '../components/instructions/instructionFlowTypes';

/**
 * Editable copy for Module 3 (Peg Transfer) onboarding — four steps, no key takeaway UI.
 */
export const module3InstructionSteps: InstructionStep[] = [
  {
    id: 'why-peg-transfer',
    title: 'Why Peg Transfer Matters',
    paragraphs: [
      'In robotic surgery, surgeons must use both hands together with precision and control.',
      'Peg transfer trains bimanual coordination, dexterity, and smooth hand-to-hand movement between instruments.',
      'It also reinforces accurate object handling and placement—skills that underpin efficient instrument control during surgery.',
    ],
  },
  {
    id: 'complete-transfer',
    title: 'Complete the Transfer',
    paragraphs: [
      <>
        Use one instrument to pick up a ring from its peg: move the tip to the ring, <strong>click to grasp</strong>, then
        click-and-drag while holding it.
      </>,
      'Move the ring across the workspace, transfer it to your other hand, and place it on the corresponding peg directly opposite its starting side.',
      'Moving each stylus moves only that hand’s instrument on screen. The camera moves when you click with both hands and move both together.',
      'Repeat across all rings within the one-minute time limit.',
    ],
  },
  {
    id: 'ring-handoff',
    title: 'Pass the Ring Between Hands',
    paragraphs: [
      'While holding the ring with one hand, bring the other instrument’s jaws close to the ring.',
      'Click with the second hand so both instruments are gripping the ring together.',
      'Release the original hand’s grasp to complete the handoff—then continue toward the target peg.',
    ],
  },
  {
    id: 'scoring',
    title: "How You're Scored",
    paragraphs: [
      'Your score is completed transfers divided by total attempted transfers. With five pegs, you can complete up to ten successful transfers in a full run.',
      'Each completed transfer increases the numerator (capped at 10). Every drop increases the denominator because it counts as an additional attempt.',
      'Dropped rings snap back to their original peg—avoiding drops keeps your attempts aligned with real progress.',
      'Strong performance means completing transfers efficiently and minimizing mistakes that inflate the denominator.',
    ],
  },
];
