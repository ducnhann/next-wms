// GridFloor Component
// Phase 2: Foundation - T022
// Warehouse floor grid bounded to layout dimensions

import { Grid } from "@react-three/drei";
import type React from "react";
import { useLayoutStore } from "@/store/layout-editor-store";

export const ZoneGrid: React.FC = () => {
  const gridConfig = useLayoutStore((state) => state.editorConfig.grid);
  // const gridSize = useLayoutStore((state) => state.gridSize);
  // TODO: get floor dimensions from a zone type storage_zone
  // const floorDimensions = useLayoutStore(
  //   (state) => state.editorConfig,
  // );
  const selectEntity = useLayoutStore((state) => state.selectEntity);
  const setTransformMode = useLayoutStore((state) => state.setTransformMode);

  const color = gridConfig?.color ?? "#6f6f6f";
  const visible = gridConfig?.visible ?? true;

  // Click on floor clears selection and confirms any active transform
  const handleFloorClick = () => {
    selectEntity(null);
    setTransformMode(null);
  };

  if (!visible) return null;

  const config = {
    cellSize: 0.5,
    cellThickness: 0.5,
    cellColor: color,
    sectionSize: 3,
    sectionThickness: 1,
    sectionColor: "#828282",
    fadeDistance: 50,
    fadeStrength: 1,
    followCamera: false,
    infiniteGrid: true,
    visible: visible,
  };

  return (
    <group>
      {/* Invisible floor plane for click detection */}
      <mesh
        position={[50 / 2, -0.02, 50 / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleFloorClick}
      >
        <planeGeometry args={[50 * 2, 50 * 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Visual grid */}
      <Grid position={[0, -0.01, 0]} args={[10.5, 10.5]} {...config} />
    </group>
  );
};
