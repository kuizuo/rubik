import "./style.css"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import States from "three/examples/jsm/libs/stats.module"

type Nullable<T> = T | null | undefined

import { Rubik } from "./rubik"

// const container = document.getElementById('app')
const canvas = document.createElement("canvas")

export class Main {
  public width = window.innerWidth
  public height = window.innerHeight

  public renderer!: THREE.WebGLRenderer
  public camera!: THREE.PerspectiveCamera
  public controller!: OrbitControls
  public light!: THREE.PointLight
  public scene!: THREE.Scene

  public center = new THREE.Vector3(0, 0, 0)

  public rubik!: Rubik
  public rubikName = "rubik"

  public raycaster = new THREE.Raycaster() // 碰撞射线
  public intersect: Nullable<THREE.Intersection> // 射线碰撞的元素
  public normalize: Nullable<THREE.Vector3> // 滑动平面法向量
  public startPoint: Nullable<THREE.Vector3> // 触摸点
  public movePoint: Nullable<THREE.Vector3> // 滑动点
  public isRotating = false //魔方是否正在转动

  public originHeight: number = 0
  public originWidth: number = 0

  constructor() {
    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas })
    // this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor("#ccc")
    document.body.appendChild(this.renderer.domElement)

    // 相机
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1500)
    this.camera.position.set(0, 0, 100 / this.camera.aspect) // 设置相机位置
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(this.center)

    // 透视投影相机视角为垂直视角，根据视角可以求出原点所在裁切面的高度，然后已知高度和宽高比可以计算出宽度
    this.originHeight = Math.tan((22.5 / 180) * Math.PI) * this.camera.position.z * 2
    this.originWidth = this.originHeight * this.camera.aspect

    // 轨道视角控制器
    // const orbitController = new OrbitControls(this.camera, this.renderer.domElement)
    // orbitController.enableZoom = false // 禁止缩放
    // orbitController.rotateSpeed = 1
    // orbitController.target = this.center //设置控制点
    // this.controller = orbitController

    // 光源
    const pointLight = new THREE.PointLight(0xffffff, 1, 2000)
    pointLight.position.set(100, 100, 100)
    this.light = pointLight

    // 场景
    this.scene = new THREE.Scene()

    this.scene.add(this.light)

    this.rubik = new Rubik(
      {
        x: 0,
        y: 0,
        z: 0,
        order: 3,
        len: 10,
        colors: ["#dd422f", "#ff6b02", "#fdcd02", "#ffffff", "#3d81f7", "#019d53"],
      },
      this
    )
    this.rubik.model(this.rubikName)
    console.log("rubik init", this.rubik)

    // const states = States()
    // document.body.appendChild(states.dom) // 添加性能监控

    this.initEvent()
  }

  render() {
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)

    requestAnimationFrame(this.render.bind(this))
  }

  initEvent() {
    //监听鼠标事件
    this.renderer.domElement.addEventListener("mousedown", this.startCube.bind(this))
    this.renderer.domElement.addEventListener("mousemove", this.moveCube.bind(this))
    this.renderer.domElement.addEventListener("mouseup", this.stopCube.bind(this))

    //监听触摸事件
    this.renderer.domElement.addEventListener("touchstart", this.startCube.bind(this))
    this.renderer.domElement.addEventListener("touchmove", this.moveCube.bind(this))
    this.renderer.domElement.addEventListener("touchend", this.stopCube.bind(this))

    //监听窗口变化
    window.addEventListener("resize", this.onWindowResize.bind(this), false)
  }

  startCube(event: TouchEvent | MouseEvent) {
    this.getIntersects(event as TouchEvent & MouseEvent)

    // 方块: 魔方没有处于转动过程中且存在碰撞物体(即点击到了方块)
    if (!this.isRotating && this.intersect) {
      this.startPoint = this.intersect.point //开始转动，设置起始点
    }

    // 视图: 魔方没有处于转动过程中且不存在碰撞物体(即点击到了方块外)
    // if (!this.isRotating && !this.intersect)
    //   this.startPoint = new THREE.Vector2(event.clientX, event.clientY);
    // }
  }

  moveCube(event: TouchEvent | MouseEvent) {
    this.getIntersects(event as TouchEvent & MouseEvent)
    // 方块
    if (!this.isRotating && this.startPoint && this.intersect) {
      this.movePoint = this.intersect.point
      if (!this.movePoint.equals(this.startPoint)) {
        this.rotateRubik()
      }
    }
    // 视图
    /*     if (!this.isRotating && this.startPoint && !this.intersect) {//触摸点没在魔方上
          this.movePoint = new THREE.Vector2(event.clientX, event.clientY);
          if (!this.movePoint.equals(this.startPoint! as THREE.Vector2)) {
            this.rotateView();
          }
        } */
  }

  stopCube(event: TouchEvent | MouseEvent) {
    this.resetRotateParams() // 重置参数
  }

  /**
   * 获取操作魔方时的触摸点坐标以及该触摸点所在平面的法向量
   */
  getIntersects(event: TouchEvent & MouseEvent) {
    const mouse = new THREE.Vector2()
    if (event.touches) {
      const touch = event.touches[0]
      mouse.x = (touch.clientX / this.width) * 2 - 1
      mouse.y = -(touch.clientY / this.height) * 2 + 1
    } else {
      mouse.x = (event.clientX / this.width) * 2 - 1
      mouse.y = -(event.clientY / this.height) * 2 + 1
    }

    this.raycaster.setFromCamera(mouse, this.camera)

    let intersect = this.scene.children.find((c) => c.name === this.rubikName)

    if (intersect) {
      // 相交的所有物体
      const intersects = this.raycaster.intersectObjects(intersect.children)
      if (intersects.length >= 2) {
        // 射线与外层透明正方体相交时，即可得到相交的元素（方块）与滑动平面法向量
        if (intersects[0].object.name === "coverCube") {
          this.intersect = intersects[1]
          this.normalize = intersects[0].face?.normal
        } else {
          this.intersect = intersects[0]
          this.normalize = intersects[1].face?.normal
        }
      }
    }
  }

  /**
   * 转动魔方
   */
  rotateRubik() {
    this.isRotating = true // 正在转动

    const vector = this.movePoint!.sub(this.startPoint! as THREE.Vector2 & THREE.Vector3) // 计算向量 => 滑动方向
    const direction = this.rubik.getDirection(
      vector as THREE.Vector3,
      this.normalize as THREE.Vector3
    ) // 计算魔方的转动方向
    const id = this.intersect!.object.id // 获取转动的方块的id

    // console.log(id, direction, this.normalize, vector)

    this.rubik.rotateMove(id, direction)
  }

  /**
   * 重置魔方转动参数
   */
  resetRotateParams() {
    this.isRotating = false
    this.intersect = null
    this.normalize = null
    this.startPoint = null
    this.movePoint = null
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

const main = new Main()

main.render()
