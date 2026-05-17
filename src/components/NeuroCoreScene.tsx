import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
};

const nodePositions = [
  [-1.44, 0.76, 0.2],
  [-1.06, -0.78, 0.46],
  [-0.34, 1.18, -0.52],
  [0.1, -1.2, -0.34],
  [0.74, 0.9, 0.56],
  [1.34, -0.24, 0.18],
  [0.34, 0.08, 1.12],
  [-0.64, 0.18, -1.12],
  [1.02, 0.36, -0.74],
  [-1.26, -0.12, -0.66],
] as const;

const NeuroCoreFallback = () => (
  <div className="relative h-full min-h-[340px] w-full overflow-hidden">
    <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-[28%] border border-primary/35 bg-black/40 shadow-[0_0_90px_hsl(160_84%_39%/0.22)]" />
    <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[24%] border border-white/10 bg-primary/5" />
    <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl" />
  </div>
);

const NeuroCoreScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !isWebGLAvailable()) return;
    setWebglReady(true);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.06, 7.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const coreGroup = new THREE.Group();
    coreGroup.scale.setScalar(0.82);
    coreGroup.position.set(-0.46, -0.02, 0);
    scene.add(coreGroup);

    const ambient = new THREE.AmbientLight(0x4fffd1, 0.32);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x6fffe0, 15, 15);
    keyLight.position.set(-2.6, 2.3, 4.6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x7aa7ff, 8, 14);
    rimLight.position.set(3.4, -1.1, 4.2);
    scene.add(rimLight);

    const centerGeometry = new THREE.IcosahedronGeometry(0.92, 4);
    const centerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x060b0a,
      metalness: 0.62,
      roughness: 0.34,
      clearcoat: 0.85,
      clearcoatRoughness: 0.22,
      transmission: 0.08,
      thickness: 0.9,
      emissive: 0x0b3a2e,
      emissiveIntensity: 0.34,
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    coreGroup.add(center);

    const edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(centerGeometry, 12),
      new THREE.LineBasicMaterial({
        color: 0x55f5c8,
        transparent: true,
        opacity: 0.34,
      }),
    );
    edgeLines.scale.setScalar(1.012);
    coreGroup.add(edgeLines);

    const innerGeometry = new THREE.IcosahedronGeometry(0.42, 2);
    const inner = new THREE.Mesh(
      innerGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x4dffd0,
        transparent: true,
        opacity: 0.22,
      }),
    );
    coreGroup.add(inner);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x72f5d1,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const rings = [
      { radius: 1.62, tube: 0.005, rotate: [Math.PI / 2.1, 0.18, 0.36] },
      { radius: 1.88, tube: 0.004, rotate: [1.02, Math.PI / 2.3, -0.18] },
      { radius: 1.36, tube: 0.005, rotate: [-0.28, 0.74, Math.PI / 2.5] },
    ].map((r) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r.radius, r.tube, 8, 180), ringMaterial);
      ring.rotation.set(r.rotate[0], r.rotate[1], r.rotate[2]);
      coreGroup.add(ring);
      return ring;
    });

    const nodeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0d1513,
      metalness: 0.72,
      roughness: 0.26,
      clearcoat: 0.9,
      emissive: 0x27ffd0,
      emissiveIntensity: 0.56,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x57ffd4,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });

    const nodes = nodePositions.map(([x, y, z], index) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(index % 3 === 0 ? 0.086 : 0.068, 24, 16), nodeMaterial);
      node.position.set(x, y, z);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), glowMaterial);
      glow.position.copy(node.position);
      coreGroup.add(glow);
      coreGroup.add(node);
      return { node, glow };
    });

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x5dffd2,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });

    const linePairs = [
      [0, 2],
      [2, 4],
      [4, 5],
      [5, 3],
      [3, 1],
      [1, 0],
      [6, 4],
      [6, 1],
      [7, 2],
      [7, 3],
      [8, 4],
      [8, 5],
      [9, 0],
      [9, 1],
    ];

    linePairs.forEach(([a, b]) => {
      const start = new THREE.Vector3(...nodePositions[a]);
      const end = new THREE.Vector3(...nodePositions[b]);
      const mid = start.clone().lerp(end, 0.5).multiplyScalar(0.62);
      mid.z += 0.18;
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const points = curve.getPoints(32);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
      coreGroup.add(line);
    });

    const fieldMaterial = new THREE.PointsMaterial({
      color: 0x9cffec,
      transparent: true,
      opacity: 0.18,
      size: 0.018,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fieldPoints = Array.from({ length: 180 }, (_, index) => {
      const t = index / 180;
      const angle = t * Math.PI * 13.5;
      const radius = 1.3 + t * 1.38;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        (t - 0.5) * 2.3,
        Math.sin(angle) * radius * 0.7,
      );
    });
    const field = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(fieldPoints),
      fieldMaterial,
    );
    field.rotation.set(0.2, 0.58, -0.14);
    coreGroup.add(field);

    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    mount.addEventListener("pointermove", handlePointerMove);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frameId = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const speed = prefersReducedMotion ? 0.08 : 1;
      coreGroup.rotation.y = elapsed * 0.16 * speed + pointer.x * 0.08;
      coreGroup.rotation.x = -0.16 + Math.sin(elapsed * 0.34) * 0.045 + pointer.y * 0.045;
      coreGroup.rotation.z = Math.sin(elapsed * 0.22) * 0.035;
      inner.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.045);
      rings[0].rotation.z += 0.0025 * speed;
      rings[1].rotation.x += 0.0018 * speed;
      rings[2].rotation.y -= 0.0022 * speed;
      field.rotation.y -= 0.0016 * speed;
      nodes.forEach(({ node, glow }, index) => {
        const pulse = 1 + Math.sin(elapsed * 1.25 + index * 0.7) * 0.18;
        glow.scale.setScalar(pulse);
        node.scale.setScalar(1 + (pulse - 1) * 0.22);
      });
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mount.removeEventListener("pointermove", handlePointerMove);
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        }
      });
      renderer.dispose();
      setWebglReady(false);
    };
  }, []);

  return (
    <div className="pointer-events-auto relative h-[390px] min-h-[320px] w-full md:h-[560px]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,hsl(160_84%_39%/0.22),transparent_34%),radial-gradient(circle_at_72%_36%,hsl(218_90%_65%/0.13),transparent_28%)] blur-xl" />
      <div className="absolute inset-x-[16%] bottom-[8%] h-16 rounded-full bg-primary/10 blur-2xl" />
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 [background:linear-gradient(90deg,transparent,rgba(255,255,255,0.045),transparent)] opacity-40 mix-blend-screen" />
      {!webglReady && <NeuroCoreFallback />}
    </div>
  );
};

export default NeuroCoreScene;
