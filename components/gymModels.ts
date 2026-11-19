import * as THREE from "three";

export function addGymBox(parent: THREE.Object3D, width: number, height: number, depth: number, color: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function ellipsoid(parent: THREE.Object3D, color: number, x: number, y: number, z: number, width: number, height: number, depth: number) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

function joint(parent: THREE.Object3D, x: number, y: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

export function addGymCoach(scene: THREE.Scene) {
  const coach = joint(scene, 0, 0, -2.5);
  const jacket = 0x2a6e57;
  const fur = 0xac714b;
  const trim = 0xffedc9;

  // 얼굴과 운동복을 여러 도형으로 나눠 눈빛, 지퍼, 소매 띠를 표현합니다.
  ellipsoid(coach, jacket, 0, 1.02, 0, .49, .54, .33);
  addGymBox(coach, .035, .69, .025, trim, 0, 1.02, .327);
  addGymBox(coach, .075, .105, .035, 0xd1a855, 0, 1.31, .34);
  ellipsoid(coach, fur, 0, 1.79, 0, .49, .43, .40);
  ellipsoid(coach, 0xedb888, 0, 1.69, .331, .25, .155, .149);
  ellipsoid(coach, 0x43291e, 0, 1.755, .456, .081, .056, .057);
  const smile = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-.103, 1.679, .463),
    new THREE.Vector3(0, 1.548, .484),
    new THREE.Vector3(.103, 1.679, .463),
  );
  coach.add(new THREE.Mesh(new THREE.TubeGeometry(smile, 12, .013, 5, false), new THREE.MeshStandardMaterial({ color: 0x502e24 })));

  for (const side of [-1, 1]) {
    ellipsoid(coach, fur, side * .37, 2.12, -.01, .17, .17, .105);
    ellipsoid(coach, 0xe0a17f, side * .38, 2.13, .073, .103, .105, .034);
    ellipsoid(coach, 0x291b17, side * .163, 1.873, .362, .054, .063, .03);
    ellipsoid(coach, 0xfffbeb, side * .163 - .016, 1.897, .387, .014, .015, .008);
    ellipsoid(coach, 0xdf8d74, side * .268, 1.738, .317, .072, .04, .024);
    ellipsoid(coach, 0x233d37, side * .205, .345, 0, .17, .29, .155);
    ellipsoid(coach, trim, side * .205, .105, .095, .181, .104, .25);
    ellipsoid(coach, 0xcebe9f, side * .205, .045, .095, .18, .042, .249);
  }

  // 어깨를 중심으로 회전시켜 손과 소매가 함께 인사하게 합니다.
  const leftArm = joint(coach, -.4, 1.27, 0);
  const wavingArm = joint(coach, .4, 1.28, 0);
  for (const arm of [leftArm, wavingArm]) {
    ellipsoid(arm, jacket, 0, -.19, 0, .153, .25, .143);
    ellipsoid(arm, trim, 0, -.346, 0, .142, .05, .135);
    ellipsoid(arm, fur, 0, -.44, 0, .124, .133, .108);
  }
  leftArm.rotation.z = -.25;
  wavingArm.rotation.z = 2.15;
  return { coach, wavingArm };
}

export function addGymTreadmill(scene: THREE.Scene) {
  // 기구와 토끼를 같은 그룹에 두어 발과 벨트의 좌표를 맞춥니다.
  const treadmill = joint(scene, 2.35, 0, -1.83);
  treadmill.rotation.y = .91;
  addGymBox(treadmill, 1.35, .22, 2.38, 0x354440, 0, .17, 0);
  addGymBox(treadmill, 1.04, .032, 1.92, 0x172321, 0, .29, .06);
  addGymBox(treadmill, 1.24, .23, .36, 0x465b53, 0, .33, -1);
  for (const side of [-1, 1]) {
    addGymBox(treadmill, .09, 1.12, .09, 0x485d56, side * .57, .88, -.91).rotation.x = -.09;
    addGymBox(treadmill, .12, .09, .56, 0x273b35, side * .57, 1.4, -.65);
  }
  addGymBox(treadmill, .72, .13, .32, 0x344842, 0, 1.5, -.91).rotation.x = .26;
  addGymBox(treadmill, .34, .028, .17, 0x71ccc0, 0, 1.571, -.88).rotation.x = .26;
  const beltMarks = Array.from({ length: 7 }, (_, index) =>
    addGymBox(treadmill, .93, .005, .014, 0x445451, 0, .309, -.84 + index * .26),
  );

  const runner = joint(treadmill, 0, .307, .13);
  runner.rotation.y = Math.PI;
  const torso = joint(runner, 0, .65, 0);
  torso.rotation.x = .12;
  const shirt = 0xd9724b;
  const fur = 0xf7dfc5;
  const pants = 0x364d57;

  ellipsoid(torso, shirt, 0, .26, 0, .25, .33, .172);
  ellipsoid(torso, 0xffbc82, 0, .35, .166, .095, .099, .015);
  ellipsoid(torso, fur, 0, .69, .035, .258, .242, .224);
  ellipsoid(torso, 0x659592, 0, .785, .019, .262, .054, .226);
  ellipsoid(torso, 0xf7efdf, 0, .638, .207, .136, .093, .079);
  ellipsoid(torso, 0xae6966, 0, .665, .278, .034, .022, .02);
  ellipsoid(runner, fur, 0, .76, -.12, .104, .096, .096);

  const limbs = [-1, 1].map((side) => {
    const ear = joint(torso, side * .129, .944, .015);
    ear.rotation.z = -side * .16;
    ellipsoid(ear, fur, 0, .096, 0, .069, .19, .061);
    ellipsoid(ear, 0xdb9c8e, 0, .096, .045, .039, .138, .019);
    ellipsoid(torso, 0x3d3027, side * .095, .711, .231, .029, .037, .016);
    ellipsoid(torso, 0xfffbeb, side * .095 - .008, .726, .243, .008, .01, .006);

    const arm = joint(torso, side * .225, .38, 0);
    ellipsoid(arm, shirt, 0, -.101, 0, .083, .143, .079);
    const elbow = joint(arm, 0, -.22, 0);
    elbow.rotation.x = -1.1;
    ellipsoid(elbow, fur, 0, -.091, 0, .064, .117, .064);
    ellipsoid(elbow, fur, 0, -.183, 0, .065, .071, .064);

    const hip = joint(runner, side * .123, .65, 0);
    ellipsoid(hip, pants, 0, -.15, 0, .089, .193, .088);
    const knee = joint(hip, 0, -.33, 0);
    ellipsoid(knee, pants, 0, -.151, 0, .074, .185, .074);
    const ankle = joint(knee, 0, -.33, 0);
    ellipsoid(ankle, 0xe0c194, 0, -.046, .057, .083, .027, .144);
    ellipsoid(ankle, 0xf7f4e8, 0, -.005, .06, .084, .062, .146);
    return { arm, hip, knee, ankle };
  });

  function animate(elapsed: number) {
    // 두 발을 반 주기씩 어긋나게 놓고 디디는 동안 벨트와 같은 속도로 뒤로 보냅니다.
    const cycle = elapsed * 1.7;
    const bounce = .036 * Math.cos(cycle * Math.PI * 4);
    torso.position.y = .65 + bounce;
    for (const [index, { arm, hip, knee, ankle }] of limbs.entries()) {
      const phase = (cycle + index * .5) % 1;
      const swing = Math.max(0, (phase - .54) / .46);
      const footHeight = .073 + Math.sin(swing * Math.PI) * .21;
      const footZ = phase < .54 ? .27 - (.54 * phase) / .54 : -.27 + .54 * (1 - Math.cos(swing * Math.PI)) / 2;
      hip.position.y = torso.position.y;
      // 발 위치와 다리 길이로 무릎 각도를 구해 신발이 벨트에 닿도록 합니다.
      const drop = hip.position.y - footHeight;
      const bend = Math.acos(Math.min(1, Math.hypot(drop, footZ) / .66));
      hip.rotation.x = -Math.atan2(footZ, drop) - bend;
      knee.rotation.x = 2 * bend;
      ankle.rotation.x = -hip.rotation.x - knee.rotation.x;
      arm.rotation.x = .57 * Math.cos(phase * Math.PI * 2);
    }
    beltMarks.forEach((mark, index) => {
      mark.position.z = -.84 + (index * .26 + elapsed * 1.7) % 1.82;
    });
  }
  return animate;
}
