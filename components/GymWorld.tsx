"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// 실제 3D 공간과 카메라를 만들고, 대화 UI는 키보드로도 이용할 수 있게 HTML로 표시합니다.
export function GymWorld() {
  const container = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLParagraphElement>(null);
  const [dialogue, setDialogue] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      if (fallback.current) fallback.current.hidden = false;
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xe8f2e6);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f2e6);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 1.65, 9);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x82745a, 2.3));
    const sunlight = new THREE.DirectionalLight(0xffffff, 2);
    sunlight.position.set(4, 8, 5);
    scene.add(sunlight);

    // 단순한 입체 도형으로 방과 운동기구를 만들어 어느 방향에서도 공간이 유지됩니다.
    function box(width: number, height: number, depth: number, color: number, x: number, y: number, z: number) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color }));
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    }
    box(12, 0.2, 16, 0xc89565, 0, -0.1, 0);
    box(12, 5, 0.2, 0xf5ead4, 0, 2.5, -5);
    box(0.2, 5, 16, 0xe1ead9, -6, 2.5, 0);
    box(0.2, 5, 16, 0xe1ead9, 6, 2.5, 0);
    box(4.3, 0.05, 2.4, 0x91ac77, 0, 0.03, 1);
    box(2.2, 1.5, 0.6, 0x9c704c, -4.5, 0.75, -3.8);
    box(2.2, 0.1, 0.65, 0xd1aa7e, -4.5, 1, -3.8);
    box(2.2, 0.1, 0.65, 0xd1aa7e, -4.5, 0.5, -3.8);
    box(2.1, 0.5, 0.8, 0x628979, 4.5, 0.25, -3.5);
    box(3, 2, 0.1, 0xaad7e7, 3.2, 3, -4.87);
    box(0.1, 2, 0.15, 0xffffff, 3.2, 3, -4.8);
    box(3, 0.1, 0.15, 0xffffff, 3.2, 3, -4.8);
    for (let i = 0; i < 4; i++) {
      box(0.3, 0.3, 0.65, 0x65756c, -5.2 + i * 0.45, 1.2, -3.8);
    }

    // 곰 코치는 구체와 원통으로 구성하고 팔과 몸을 가볍게 움직입니다.
    const coach = new THREE.Group();
    scene.add(coach);
    coach.position.set(0, 0, -2.5);
    function part(parent: THREE.Group, radius: number, color: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshStandardMaterial({ color }));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      parent.add(mesh);
      return mesh;
    }
    part(coach, 0.55, 0x285f45, 0, 1, 0, 1, 1.1, .7);
    part(coach, 0.5, 0xa7683e, 0, 1.85, 0);
    part(coach, .18, 0xa7683e, -.38, 2.2, 0);
    part(coach, .18, 0xa7683e, .38, 2.2, 0);
    part(coach, .24, 0xe3b187, 0, 1.75, .43, 1, .7, .5);
    part(coach, .07, 0x342620, 0, 1.82, .55);
    part(coach, .045, 0x251b18, -.18, 1.98, .43);
    part(coach, .045, 0x251b18, .18, 1.98, .43);
    part(coach, .22, 0x285f45, -.23, .35, 0, .8, 1.7, .8);
    part(coach, .22, 0x285f45, .23, .35, 0, .8, 1.7, .8);
    part(coach, .22, 0x285f45, -.63, 1.12, 0, .7, 1.6, .7);
    const wavingArm = part(coach, .22, 0x285f45, .62, 1.35, 0, .7, 1.7, .7);
    wavingArm.rotation.z = -.7;

    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;
    function render(now: number) {
      const elapsed = (now - started) / 1000;
      // 카메라가 입구에서 코치 쪽으로 이동하며 입장 장면을 보여줍니다.
      camera.position.z = reducedMotion ? 4.8 : 9 - 4.2 * Math.min(elapsed / 2.5, 1);
      camera.lookAt(0, 1.35, -2.5);
      if (!reducedMotion) {
        coach.position.y = Math.sin(elapsed * 2) * .025;
        wavingArm.rotation.z = -.7 + Math.sin(elapsed * 3) * .15;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section className="world-container" aria-label="곰 코치의 운동 공간">
      <div ref={container} className="world-canvas" aria-hidden="true" />
      <div className="world-dialogue">
        <p className="world-speaker">곰 코치</p>
        <p className="world-message" aria-live="polite">
          {dialogue === 0 ? "어서 와요! 저는 이곳의 곰 코치예요. 함께 식사 목표를 만들어 볼까요?" : "좋아요! 몇 가지 정보를 알려주시면 하루 목표를 계산해 드릴게요."}
        </p>
        <p ref={fallback} hidden role="status">3D 화면을 표시할 수 없지만 아래 버튼으로 계속할 수 있어요.</p>
        <div className="world-actions">
          {dialogue === 0 ? <button className="primary-button" type="button" onClick={() => setDialogue(1)}>좋아요, 시작해요</button> : <Link className="primary-button" href="/register">회원가입하기</Link>}
          <Link className="secondary-button" href="/login">로그인</Link>
        </div>
      </div>
    </section>
  );
}
