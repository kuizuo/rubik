import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// 1.创建渲染器
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor('#ccc');
document.body.appendChild(renderer.domElement);

// 2.创建相机
const viewCenter = new THREE.Vector3(0, 0, 0);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(100, 100, 100);
camera.up.set(0, 1, 0);
camera.lookAt(viewCenter)

// 轨道视角控制器
const orbitController = new OrbitControls(camera, renderer.domElement);
orbitController.enableZoom = false; // 禁止缩放
orbitController.rotateSpeed = 1;
orbitController.target = viewCenter; //设置控制点

// 3.光源
const pointLight = new THREE.PointLight(0xffffff, 1, 2000);
pointLight.position.set(100, 100, 100);

// 4.创建魔方
const Basic = {
  x: 0,
  y: 0,
  z: 0,
  num: 3,
  len: 10,
  // 上黄 下白 左橙 右红 前蓝 后绿 
  colors: ['#fdcd02', '#ffffff', '#ff6b02', '#dd422f', '#3d81f7', '#019d53']
};

// 使用canvas绘制魔方面的纹理
function face(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  //画一个宽高都是256的黑色正方形
  context.fillStyle = 'rgba(0,0,0,1)';
  context.fillRect(0, 0, 256, 256);
  //在内部用某颜色的16px宽的线再画一个宽高为224的圆角正方形并用改颜色填充
  context.rect(16, 16, 224, 224);
  context.lineJoin = 'round';
  context.lineWidth = 16;
  context.fillStyle = color;
  context.strokeStyle = color;
  context.stroke();
  context.fill();
  return canvas;
}

function SimpleCube() {
  const { x, y, z, num, len, colors } = Basic
  let leftUpX = x - num / 2 * len;
  let leftUpY = y + num / 2 * len;
  let leftUpZ = z + num / 2 * len;

  let cubes = [];
  for (let i = 0; i < num; i++) {
    for (let j = 0; j < num * num; j++) {
      const materials = colors.map((color) => {
        const texture = new THREE.Texture(face(color));
        texture.needsUpdate = true;
        return new THREE.MeshBasicMaterial({ map: texture });
      })

      let cubegeo = new THREE.BoxGeometry(len, len, len);
      let cube = new THREE.Mesh(cubegeo, materials);

      // 依次计算各个小方块中心点坐标
      cube.position.x = (leftUpX + len / 2) + (j % num) * len;
      cube.position.y = (leftUpY - len / 2) - Math.floor(j / num) * len;
      cube.position.z = (leftUpZ - len / 2) - i * len;
      cubes.push(cube)
    }
  }
  return cubes;
}

const cubes = SimpleCube()

// 5.创建场景
const scene = new THREE.Scene();

scene.add(pointLight);
cubes.map((cube) => {
  scene.add(cube);
})


function render() {
  renderer.clear();
  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

render()