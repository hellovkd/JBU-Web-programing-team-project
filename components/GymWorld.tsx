"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { addGymBox, addGymCoach, addGymTreadmill } from "./gymModels";

// 실제 3D 공간과 카메라를 만들고, 대화 UI는 키보드로도 이용할 수 있게 HTML로 표시합니다.
export function GymWorld() {
  const container = useRef<HTMLDivElement>(null);
  const speech = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLParagraphElement>(null);
  const [dialogue, setDialogue] = useState(0);

  useEffect(() => {
    const element = container.current;
    const bubble = speech.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      if (bubble) bubble.hidden = false;
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
      return addGymBox(scene, width, height, depth, color, x, y, z);
    }
    box(12, 0.2, 11.55, 0x9c765b, 0, -0.1, .675);
    box(12, 5, 0.2, 0xe7e7db, 0, 2.5, -5);
    box(0.2, 5, 16, 0xdbe5d8, -6, 2.5, 0);
    box(0.2, 5, 16, 0xdbe5d8, 6, 2.5, 0);
    box(12, .15, 16, 0xf5f2e8, 0, 5, 0);
    box(4.3, 0.05, 2.4, 0x638a72, 0, 0.03, .3);
    // 뒷벽의 거울과 수납장을 만들어 운동 공간을 구분합니다.
    box(4.2, 2.2, .12, 0x42564e, -2.8, 2.9, -4.85);
    box(4, 2, .14, 0xb8d9db, -2.8, 2.9, -4.77);
    box(.08, 2, .15, 0xe9f2ed, -2.8, 2.9, -4.68);
    box(3, 2, 0.1, 0xaad7e7, 3.2, 3, -4.87);
    box(0.1, 2, 0.15, 0xffffff, 3.2, 3, -4.8);
    box(3, 0.1, 0.15, 0xffffff, 3.2, 3, -4.8);
    box(2.3, .15, .65, 0x394b45, -3.5, .75, -3.65);
    box(2.3, .15, .65, 0x394b45, -3.5, 1.3, -3.65);
    box(.12, 1.4, .6, 0x394b45, -4.5, .7, -3.65);
    box(.12, 1.4, .6, 0x394b45, -2.5, .7, -3.65);
    // 손잡이와 양쪽 원판을 갖춘 덤벨을 선반에 올립니다.
    for (let i = 0; i < 4; i++) {
      const x = -4.25 + i * .5;
      box(.3, .07, .07, 0xaab6ae, x, 1.45, -3.65);
      box(.08, .22, .22, 0x303b37, x - .15, 1.45, -3.65);
      box(.08, .22, .22, 0x303b37, x + .15, 1.45, -3.65);
    }
    // 양옆에 운동기구를 배치해 입구에서 코치까지의 통로를 남깁니다.
    const animateRunner = addGymTreadmill(scene);
    box(1.1, .12, .75, 0x263b34, -3.3, .65, -.7);
    box(.13, .65, .13, 0x4b5c54, -3.7, .32, -.7);
    box(.13, .65, .13, 0x4b5c54, -2.9, .32, -.7);
    box(.12, 1.8, .12, 0x4b5c54, -4.25, .9, -1.45);
    box(.12, 1.8, .12, 0x4b5c54, -2.35, .9, -1.45);
    box(2.4, .08, .08, 0xc2c9c2, -3.3, 1.7, -1.45);
    box(.1, .55, .55, 0x2b3833, -4.35, 1.7, -1.45);
    box(.1, .55, .55, 0x2b3833, -2.25, 1.7, -1.45);

    // 입구 주변을 벽으로 채워 문이 닫혀 있는 동안 어느 화면 비율에서도 내부가 보이지 않게 합니다.
    const doorZ = 6.5;
    const facade = 0xb0bca9;
    const frameColor = 0x354e41;
    box(22, .18, 7, 0xc5b39d, 0, -.09, 9.95);
    box(4, 2.9, .34, facade, 0, 4.95, doorZ);
    box(4.32, .19, .40, frameColor, 0, 3.59, doorZ);
    const doors: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      box(9, 6.4, .34, facade, side * 6.5, 3.2, doorZ);
      box(.17, 3.6, .38, frameColor, side * 2.055, 1.8, doorZ);
      box(8.8, .17, .37, 0x7a8e7b, side * 6.55, .085, doorZ + .035);
      const door = new THREE.Group();
      door.position.set(side * 2, 0, doorZ);
      addGymBox(door, 2, 3.5, .13, 0x466e58, -side, 1.75, 0);
      // 유리처럼 보이는 불투명 패널을 양쪽에 넣어 실내를 가립니다.
      for (const face of [-1, 1]) {
        addGymBox(door, 1.6, 1.96, .035, 0x294d3d, -side, 2.25, .075 * face);
        addGymBox(door, 1.46, 1.82, .024, 0x9bc2b6, -side, 2.25, .1 * face);
        addGymBox(door, 1.45, .63, .032, 0x395e49, -side, .59, .078 * face);
        addGymBox(door, .095, .42, .16, 0xd8bf79, -side * 1.77, 1.43, .12 * face);
      }
      scene.add(door);
      doors.push(door);
    }
    const { coach, wavingArm } = addGymCoach(scene);

    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      // 세로 화면에서는 시야각을 넓혀 코치와 양옆 운동기구를 함께 보여줍니다.
      camera.fov = width < 600 ? Math.min(105, THREE.MathUtils.radToDeg(2 * Math.atan(.58 / camera.aspect))) : 48;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const speechAnchor = new THREE.Vector3();
    const entrance = (elapsed: number, start: number, end: number) =>
      THREE.MathUtils.smoothstep(elapsed, start, end);
    const started = performance.now();
    let frame = 0;
    function render(now: number) {
      const elapsed = (now - started) / 1000;
      const reducedMotion = motionPreference.matches;
      // 문이 먼저 열리고, 충분히 벌어졌을 때 카메라가 문틀을 통과합니다.
      const open = reducedMotion ? 1 : entrance(elapsed, .6, 1.85);
      const walk = reducedMotion ? 1 : entrance(elapsed, 1.32, 3.05);
      doors[0].rotation.y = open * Math.PI * .48;
      doors[1].rotation.y = -open * Math.PI * .48;
      camera.position.z = 9 - 4.2 * walk;
      camera.lookAt(0, 1.35, -2.5);
      const motionTime = reducedMotion ? 0 : elapsed;
      coach.position.y = (1 - Math.cos(motionTime * 2)) * .015;
      wavingArm.rotation.z = 2.15 + Math.sin(motionTime * 3) * .22;
      animateRunner(motionTime);
      renderer.render(scene, camera);
      if (bubble) {
        // 코치의 머리 위 점을 화면 좌표로 옮겨 카메라와 말풍선의 위치를 맞춥니다.
        const inside = camera.position.z < doorZ - .35;
        const hideSpeech = !inside;
        if (bubble.hidden !== hideSpeech) bubble.hidden = hideSpeech;
        if (inside) {
          speechAnchor.set(coach.position.x, 2.42, coach.position.z).project(camera);
          bubble.style.setProperty("--speech-top", `${((1 - speechAnchor.y) * 50).toFixed(2)}%`);
        }
      }
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
      if (bubble) bubble.hidden = false;
    };
  }, []);

  return (
    <section className="world-container" aria-label="곰 코치의 운동 공간">
      <div ref={container} className="world-canvas" aria-hidden="true" />
      {/* 대사는 코치 위에, 선택 버튼은 화면 끝에 두어 움직이는 캐릭터가 가려지지 않게 합니다. */}
      <div ref={speech} className="world-dialogue" hidden>
        <p className="world-speaker">곰 코치</p>
        <p className="world-message" aria-live="polite">
          {dialogue === 0 ? "어서 와요! 같이 식사 목표를 정해 볼까요?" : "좋아요! 몇 가지 정보를 알려주면 하루 목표를 계산해 드릴게요."}
        </p>
        <p ref={fallback} hidden role="status">3D 화면을 표시할 수 없지만 아래 버튼으로 계속할 수 있어요.</p>
      </div>
      <div className="world-actions">
        {dialogue === 0 ? <button className="primary-button" type="button" onClick={() => setDialogue(1)}>좋아요, 시작해요</button> : <Link className="primary-button" href="/register">회원가입하기</Link>}
        <Link className="secondary-button" href="/login">로그인</Link>
      </div>
    </section>
  );
}
