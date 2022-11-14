import * as THREE from "three"
import { PerspectiveCamera, WebGLRenderer } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { createCamera, createRenderer, createScene } from "./components"
import Control, { MouseControl, TouchControl } from "./core/control"
import { Cube } from "./core/cube"

type Nullable<T> = T | null | undefined

const setSize = (container: Element, camera: PerspectiveCamera, renderer: WebGLRenderer) => {
  // Set the camera's aspect ratio
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()

  // update the size of the renderer AND the canvas
  renderer.setSize(container.clientWidth, container.clientHeight)

  // set the pixel ratio (for mobile devices)
  renderer.setPixelRatio(window.devicePixelRatio)
}

export class Rubiks {
  public renderer: THREE.WebGLRenderer
  public camera: THREE.PerspectiveCamera
  public scene: THREE.Scene
  private _controls: Control[] = []

  public center = new THREE.Vector3(0, 0, 0)

  public cube!: Cube

  public raycaster = new THREE.Raycaster() // 碰撞射线
  public intersect: Nullable<THREE.Intersection> // 射线碰撞的元素
  public normalize: Nullable<THREE.Vector3> // 滑动平面法向量
  public startPoint: Nullable<THREE.Vector3> // 触摸点
  public movePoint: Nullable<THREE.Vector3> // 滑动点
  public isRotating = false //魔方是否正在转动

  public constructor(container: Element) {
    this.renderer = createRenderer()
    this.camera = createCamera()
    this.scene = createScene("#ccc")

    container.appendChild(this.renderer.domElement)

    // auto resize
    window.addEventListener("resize", () => {
      setSize(container, this.camera, this.renderer)
      this.render()
    })
    setSize(container, this.camera, this.renderer)

    this.initCube()
  }

  initCube(order: number = 3) {
    this.scene.remove(...this.scene.children)
    this._controls.forEach((control) => control.dispose())

    const cube = new Cube(order)

    this.scene.add(cube)
    this.cube = cube
    this.render()

    const winW = this.renderer.domElement.clientWidth
    const winH = this.renderer.domElement.clientHeight
    const coarseSize = cube.getCoarseCubeSize(this.camera, { w: winW, h: winH })

    const ratio = Math.max(2.2 / (winW / coarseSize), 2.2 / (winH / coarseSize))
    this.camera.position.z *= ratio

    this._controls.push(
      new MouseControl(this.camera, this.scene, this.renderer, cube),
      new TouchControl(this.camera, this.scene, this.renderer, cube)
    )

    this.render()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  // private startAnimation() {
  //   const animation = (time: number) => {
  //     time /= 1000 // convert to seconds
  //     if (this.cube) {
  //       if (time < 2) {
  //         this.cube.position.z = (-1 + time / 2) * 100
  //       } else {
  //         this.cube.position.z = 0
  //       }
  //       const dis = time
  //       this.cube.position.y = Math.sin(dis) * 0.3
  //     }

  //     this.render()
  //     requestAnimationFrame(animation)
  //   }

  //   requestAnimationFrame(animation)
  // }
}

export default Rubiks
