import * as THREE from 'three';

export type ToolArmSide = 'left' | 'right';

export type ToolOrientationYXZ = {
  // Stored in the same semantics as repo placeholders: YXZ Euler components (radians).
  pitch: number; // rotation about X in 'YXZ' convention
  yaw: number; // rotation about Y in 'YXZ' convention
  roll: number; // rotation about Z in 'YXZ' convention
};

export type WorldFrameArm = {
  tip: THREE.Vector3;
  leftJaw: THREE.Vector3;
  rightJaw: THREE.Vector3;
  biteMid: THREE.Vector3;
  biteQuatWorld: THREE.Quaternion;
};

export type WorldFrameRef = {
  left: WorldFrameArm;
  right: WorldFrameArm;
};

export type ToolKinematicsArm = {
  // Constrained in world space through fixed trocar points.
  tipWorld: THREE.Vector3;
  orientation: ToolOrientationYXZ;
  // 0 = jaws open, 1 = jaws closed (placeholder only).
  gripClosure: number;
};

export type ToolKinematicsRef = {
  left: ToolKinematicsArm;
  right: ToolKinematicsArm;
};

export function createWorldFrameRef(): WorldFrameRef {
  const mkArm = (): WorldFrameArm => ({
    tip: new THREE.Vector3(),
    leftJaw: new THREE.Vector3(),
    rightJaw: new THREE.Vector3(),
    biteMid: new THREE.Vector3(),
    biteQuatWorld: new THREE.Quaternion(),
  });

  return {
    left: mkArm(),
    right: mkArm(),
  };
}
