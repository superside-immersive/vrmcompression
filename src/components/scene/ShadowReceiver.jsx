export function ShadowReceiver() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow renderOrder={-1}>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
