import { type CameraControls, Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

// Helper component to visualize camera orbit target
export function CameraTargetHelper({
  cameraControlsRef,
}: {
  cameraControlsRef: React.RefObject<CameraControls | null>;
}) {
  const sphereRef = useRef<Mesh>(null);

  useFrame(() => {
    if (cameraControlsRef.current && sphereRef.current) {
      cameraControlsRef.current.getTarget(sphereRef.current.position);
    }
  });

  return (
    <Sphere ref={sphereRef} args={[0.2, 16, 16]}>
      <meshBasicMaterial color={0xff0000} />
    </Sphere>
  );
}
