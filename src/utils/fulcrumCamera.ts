import * as THREE from 'three';

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _fwd = new THREE.Vector3();

/**
 * Trocar-style rig: fulcrum is fixed in world space; camera sits `armLength` forward along the view axis.
 * Same YXZ pitch/yaw convention as prior fixed-position mount; zoom is still FOV only.
 */
export function setPerspectiveCameraFromFulcrum(
  camera: THREE.PerspectiveCamera,
  fulcrum: THREE.Vector3,
  armLength: number,
  pitch: number,
  yaw: number
): void {
  _euler.set(pitch, yaw, 0);
  camera.quaternion.setFromEuler(_euler);
  _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  camera.position.copy(fulcrum).addScaledVector(_fwd, armLength);
}

/** Port / RCM point behind the camera along the initial view ray. */
export function makeFulcrumBehindCamera(
  cameraPosition: THREE.Vector3,
  pitch: number,
  yaw: number,
  armLength: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  _euler.set(pitch, yaw, 0);
  const q = new THREE.Quaternion().setFromEuler(_euler);
  _fwd.set(0, 0, -1).applyQuaternion(q);
  return target.copy(cameraPosition).addScaledVector(_fwd, -armLength);
}
