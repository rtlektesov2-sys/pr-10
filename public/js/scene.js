
import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


const CONFIG = {
  model:       '/models/carousel_slow.glb',
  exposure:    1.0,
  worldColor:  0x0d0f12,
  transparent: true,
  controls:    false,
  autoRotate:  false,
  shadows:     true,
  environment: true
};

const box = document.getElementById('scene3d');   //блок на странице

window.__scene3d = { module: true, box: !!box };

if (box) { window.__scene3d.started = true; start(box); }
else console.error('Не найден блок с id="scene3d" — проверьте разметку в index.ejs');

function start(box) {
  const canvas = box.querySelector('canvas');
  const loadEl = box.querySelector('.scene3d-load');
  const barEl  = box.querySelector('.scene3d-bar i');
  const errEl  = box.querySelector('.scene3d-err');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: CONFIG.transparent });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.toneMapping         = THREE.AgXToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  if (CONFIG.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  scene.background = CONFIG.transparent ? null : new THREE.Color(CONFIG.worldColor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(-5, 8, 12);
  scene.add(keyLight);

  let camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 500);
  camera.up.set(0, 0, 1);
  let bounds = null;
  let orthographicFrame = null;

  let controls = null, mixer = null, loaded = false;
  const clock = new THREE.Clock();

  function frameCamera() {
    if (!bounds) return;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const fitDistance = Math.max(
      size.x / (2 * Math.tan(horizontalFov / 2)),
      size.z / (2 * Math.tan(verticalFov / 2))
    );
    const distance = fitDistance * 1.08 + size.y / 2;
    camera.position.set(center.x, center.y - distance, center.z);
    camera.lookAt(center);
    camera.far = distance + size.y + 100;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (camera.isPerspectiveCamera) {
      camera.aspect = w / h;
      frameCamera();
    } else if (camera.isOrthographicCamera && orthographicFrame) {
      const aspect = w / h;
      const halfWidth = Math.max(orthographicFrame.xmag, orthographicFrame.ymag * aspect);
      const halfHeight = halfWidth / aspect;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    }
  }
  new ResizeObserver(resize).observe(box);

  new GLTFLoader().load(
    CONFIG.model,
    (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(gltf.scene);
      if (gltf.cameras && gltf.cameras.length > 0) {
        camera = gltf.cameras[0];
        if (camera.isOrthographicCamera) {
          orthographicFrame = {
            xmag: (camera.right - camera.left) / 2,
            ymag: (camera.top - camera.bottom) / 2
          };
        }
      }

      if (CONFIG.shadows) {
        gltf.scene.traverse((o) => {
          if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
          if (o.isLight) {
            o.castShadow = true;
            o.shadow.mapSize.set(1024, 1024);
            o.shadow.bias = -0.0015;
            if (o.isDirectionalLight) {
              const c = o.shadow.camera;
              c.left = -10; c.right = 10; c.top = 10; c.bottom = -10;
              c.near = 0.1; c.far = 50; c.updateProjectionMatrix();
            }
          }
        });
      }

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) mixer.clipAction(clip).play();
      }

      if (CONFIG.controls) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping   = true;
        controls.autoRotate      = CONFIG.autoRotate;
        controls.autoRotateSpeed = 0.6;
        controls.enableZoom      = false;
        // сохраняем кадрирование из Blender
        const bb     = new THREE.Box3().setFromObject(gltf.scene);
        const center = bb.getCenter(new THREE.Vector3());
        const dir    = new THREE.Vector3();
        camera.getWorldDirection(dir);
        controls.target.copy(camera.position)
                .add(dir.multiplyScalar(camera.position.distanceTo(center)));
        controls.update();
      }

      if (CONFIG.environment) scene.environment = pmrem.fromScene(scene, 0.02).texture;

      resize();
      loaded = true;
      box.classList.add('is-ready');
      if (loadEl) loadEl.classList.add('hidden');
    },
    (e) => { if (e.total && barEl) barEl.style.width = (e.loaded / e.total * 100).toFixed(0) + '%'; },
    (e) => {
      if (loadEl) loadEl.classList.add('hidden');
      if (errEl) {
        errEl.style.display = 'block';
        errEl.textContent = 'Сцена не загрузилась. Проверьте, что файл лежит в public' +
                            CONFIG.model + ' и что в server.js включена раздача папки public.';
      }
      console.error('Сцена не загрузилась:', e);
    }
  );

  let visible = true;
  new IntersectionObserver(
    ([entry]) => { visible = entry.isIntersecting; },
    { threshold: 0.01 }
  ).observe(box);

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    if (!loaded || !visible) return;
    if (mixer) mixer.update(dt);
    if (controls) controls.update();
    renderer.render(scene, camera);
  });
}
