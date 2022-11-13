import * as THREE from "three"
import { Main } from "./main"

interface CubeConfig {
  x: number
  y: number
  z: number
  order: number
  len: number
  colors: string[]
}

type CubeDirection = "R" | "R'" | "U" | "U'" | "F" | "F'" | "L" | "L'" | "D" | "D'" | "B" | "B'"

// 魔方的面
function face(color: string) {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext("2d")!
  //画一个宽高都是256的黑色正方形
  context.fillStyle = "rgba(0,0,0,1)"
  context.fillRect(0, 0, 256, 256)
  //在内部用某颜色的16px宽的线再画一个宽高为224的圆角正方形并用改颜色填充
  context.rect(16, 16, 224, 224)
  context.lineJoin = "round"
  context.lineWidth = 16
  context.fillStyle = color
  context.strokeStyle = color
  context.stroke()
  context.fill()
  return canvas
}

function generateCube(config: CubeConfig) {
  const { x, y, z, order, len, colors } = config
  let leftUpX = x - (order / 2) * len
  let leftUpY = y + (order / 2) * len
  let leftUpZ = z + (order / 2) * len

  let cubes = []
  for (let i = 0; i < order; i++) {
    for (let j = 0; j < order * order; j++) {
      const materials = colors.map((color) => {
        const texture = new THREE.Texture(face(color))
        texture.needsUpdate = true
        return new THREE.MeshBasicMaterial({ map: texture })
      })

      let cubegeo = new THREE.BoxGeometry(len, len, len)
      let cube = new THREE.Mesh(cubegeo, materials)

      // 依次计算各个小方块中心点坐标
      cube.position.x = leftUpX + len / 2 + (j % order) * len
      cube.position.y = leftUpY - len / 2 - Math.floor(j / order) * len
      cube.position.z = leftUpZ - len / 2 - i * len
      cubes.push(cube)
    }
  }
  return cubes
}

export class Rubik {
  public main: Main
  public cubes: THREE.Mesh[] = []
  public initStatus: any[] = []
  public config!: CubeConfig
  public group!: THREE.Group
  public container!: THREE.Mesh

  public defaultTotalTime = 250 //默认转动动画时长
  public minIndex!: number

  public center: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  public xLine!: THREE.Vector3
  public yLine!: THREE.Vector3
  public zLine!: THREE.Vector3
  public xLine2!: THREE.Vector3
  public yLine2!: THREE.Vector3
  public zLine2!: THREE.Vector3

  constructor(config: CubeConfig, main: Main) {
    this.config = config

    // 六种转动方向向量
    this.xLine = new THREE.Vector3(1, 0, 0)
    this.xLine2 = new THREE.Vector3(-1, 0, 0)
    this.yLine = new THREE.Vector3(0, 1, 0)
    this.yLine2 = new THREE.Vector3(0, -1, 0)
    this.zLine = new THREE.Vector3(0, 0, 1)
    this.zLine2 = new THREE.Vector3(0, 0, -1)

    this.main = main
  }

  model(type: string = "rubik") {
    // 以组的方式来加入场景
    this.group = new THREE.Group()
    this.group.name = type

    this.cubes = generateCube(this.config)

    /**
     * 由于筛选运动元素时是根据物体的id规律来的
     * 但是滚动之后位置发生了变化
     * 再根据初始规律筛选会出问题，而且id是只读变量
     * 所以这里通过 cube.userData.index 给每个物体设置一个额外索引
     * 每次滚动之后更新根据初始状态更新该索引
     * 让该变量一直保持初始规律即可
     */
    this.cubes.forEach((cube) => {
      this.initStatus.push({
        x: cube.position.x,
        y: cube.position.y,
        z: cube.position.z,
        userData: {
          index: cube.id,
        },
      })
      cube.userData.index = cube.id
    })
    this.group.add(...this.cubes)

    // 外层透明正方体 用于检测射线碰撞
    const width = this.config.order * this.config.len
    const cubegeo = new THREE.BoxGeometry(width, width, width)

    const cubemat = new THREE.MeshBasicMaterial({
      vertexColors: false,
      opacity: 0,
      transparent: true,
    })
    this.container = new THREE.Mesh(cubegeo, cubemat)
    this.container.name = "coverCube"
    this.group.add(this.container)

    // 进行一定的旋转变换保证三个面可见
    this.group.rotateY((-45 / 180) * Math.PI)
    this.group.rotateOnAxis(new THREE.Vector3(-1, 0, 1), (-25 / 180) * Math.PI)

    this.main.scene.add(this.group)

    this.getMinIndex()
  }

  /**
   * 获取最小索引值
   */
  getMinIndex() {
    this.minIndex = Math.min(...this.cubes.map((cube) => cube.userData.index))
  }

  /**
   * 根据索引获取方块
   */
  getCube(index: number) {
    return this.cubes[index - this.minIndex]
  }

  /**
   * 获得自身坐标系的坐标轴在世界坐标系中坐标
   */
  updateCurLocalAxisInWorld() {
    const center = new THREE.Vector3(0, 0, 0)
    const xPoint = new THREE.Vector3(1, 0, 0)
    const xPoint2 = new THREE.Vector3(-1, 0, 0)
    const yPoint = new THREE.Vector3(0, 1, 0)
    const yPoint2 = new THREE.Vector3(0, -1, 0)
    const zPoint = new THREE.Vector3(0, 0, 1)
    const zPoint2 = new THREE.Vector3(0, 0, -1)

    const matrix = this.group.matrixWorld //魔方的在世界坐标系的变换矩阵

    center.applyMatrix4(matrix)
    xPoint.applyMatrix4(matrix)
    xPoint2.applyMatrix4(matrix)
    yPoint.applyMatrix4(matrix)
    yPoint2.applyMatrix4(matrix)
    zPoint.applyMatrix4(matrix)
    zPoint2.applyMatrix4(matrix)

    this.center = center
    this.xLine = xPoint.sub(center)
    this.xLine2 = xPoint2.sub(center)
    this.yLine = yPoint.sub(center)
    this.yLine2 = yPoint2.sub(center)
    this.zLine = zPoint.sub(center)
    this.zLine2 = zPoint2.sub(center)
  }

  /**
   * 计算转动方向
   */
  getDirection(vector: THREE.Vector3, normalize: THREE.Vector3) {
    this.updateCurLocalAxisInWorld()

    let direction: CubeDirection | null = null

    // 计算差向量和x、y、z轴的夹角
    let xAngle = vector.angleTo(this.xLine)
    let xAngle2 = vector.angleTo(this.xLine2)
    let yAngle = vector.angleTo(this.yLine)
    let yAngle2 = vector.angleTo(this.yLine2)
    let zAngle = vector.angleTo(this.zLine)
    let zAngle2 = vector.angleTo(this.zLine2)
    let minAngle = Math.min(...[xAngle, xAngle2, yAngle, yAngle2, zAngle, zAngle2]) //最小夹角

    if (minAngle > 0.8) {
      return null
    }

    // 根据最小夹角判断转动方向
    let xLine = new THREE.Vector3(1, 0, 0)
    let xLine2 = new THREE.Vector3(-1, 0, 0)
    let yLine = new THREE.Vector3(0, 1, 0)
    let yLine2 = new THREE.Vector3(0, -1, 0)
    let zLine = new THREE.Vector3(0, 0, 1)
    let zLine2 = new THREE.Vector3(0, 0, -1)

    switch (minAngle) {
      case xAngle: // 向x轴正方向旋转90度
        if (normalize.equals(yLine)) {
          direction = "F" // 绕Y轴顺时针转动
        } else if (normalize.equals(yLine2)) {
          direction = "U'" // 绕Y轴逆时针
        } else if (normalize.equals(zLine)) {
          direction = "D" // 绕Z轴逆时针
        } else if (normalize.equals(zLine2)) {
          direction = "B'" // 绕Z轴顺时针
        }
        break
      case xAngle2:
        if (normalize.equals(yLine)) {
          direction = "F'"
        } else if (normalize.equals(yLine2)) {
          direction = "U'"
        } else if (normalize.equals(zLine)) {
          direction = "D'"
        } else if (normalize.equals(zLine2)) {
          direction = "B"
        }
        break
      case yAngle:
        if (normalize.equals(xLine)) {
          direction = "R"
        } else if (normalize.equals(xLine2)) {
          direction = "L'"
        } else if (normalize.equals(zLine)) {
          direction = "F'"
        } else if (normalize.equals(zLine2)) {
          direction = "B"
        }
        break
      case yAngle2:
        if (normalize.equals(xLine)) {
          direction = "R'"
        } else if (normalize.equals(xLine2)) {
          direction = "L"
        } else if (normalize.equals(zLine)) {
          direction = "F"
        } else if (normalize.equals(zLine2)) {
          direction = "B'"
        }
        break
      case zAngle:
        if (normalize.equals(xLine)) {
          direction = "R'"
        } else if (normalize.equals(xLine2)) {
          direction = "L"
        } else if (normalize.equals(yLine)) {
          direction = "U"
        } else if (normalize.equals(yLine2)) {
          direction = "D'"
        }
        break
      case zAngle2:
        if (normalize.equals(xLine)) {
          direction = "R"
        } else if (normalize.equals(xLine2)) {
          direction = "L'"
        } else if (normalize.equals(yLine)) {
          direction = "U'"
        } else if (normalize.equals(yLine2)) {
          direction = "D"
        }
        break
      default:
        break
    }
    console.log(normalize, direction)
    return direction
  }

  /**
   * 根据触摸方块的索引以及滑动方向获得转动元素
   */
  getBoxs(index: number, direction: CubeDirection | null) {
    const targetIndex = index - this.minIndex
    const numI = Math.floor(targetIndex / 9)
    const numJ = targetIndex % 9
    const boxs: THREE.Mesh[] = []

    // console.log(`targetIndex=${targetIndex}`, targetIndex, "numI", numI, "numJ", numJ)

    switch (direction) {
      case "U":
      case "U'":
      case "D":
      case "D'":
        this.cubes.forEach((cube) => {
          const index = cube.userData.index - this.minIndex
          if (Math.floor(numJ / 3) === Math.floor((index % 9) / 3)) {
            boxs.push(cube)
          }
        })

        break
      case "R":
      case "R'":
      case "L":
      case "L'":
        // this.cubes.forEach((cube) => {
        //   const index = cube.userData.index - this.minIndex
        //   if (numI === Math.floor(index / 9)) {
        //     boxs.push(cube)
        //   }
        // })

        break
      case "F":
      case "F'":
      case "B":
      case "B'":
        // this.cubes.forEach((cube) => {
        //   const index = cube.userData.index - this.minIndex
        //   if ((index % 9) % 3 === numJ % 3) {
        //     boxs.push(cube)
        //   }
        // })
        break
      default:
        break
    }

    return boxs
  }

  /**
   * 整个面转动 绕过点p的向量 vector 旋转一定角度
   */
  rotateAroundWorldAxis(p: THREE.Vector3, vector: THREE.Vector3, rad: number) {
    vector.normalize()
    const u = vector.x
    const v = vector.y
    const w = vector.z

    const a = p.x
    const b = p.y
    const c = p.z

    const matrix4 = new THREE.Matrix4()

    matrix4.set(
      u * u + (v * v + w * w) * Math.cos(rad),
      u * v * (1 - Math.cos(rad)) - w * Math.sin(rad),
      u * w * (1 - Math.cos(rad)) + v * Math.sin(rad),
      (a * (v * v + w * w) - u * (b * v + c * w)) * (1 - Math.cos(rad)) +
        (b * w - c * v) * Math.sin(rad),
      u * v * (1 - Math.cos(rad)) + w * Math.sin(rad),
      v * v + (u * u + w * w) * Math.cos(rad),
      v * w * (1 - Math.cos(rad)) - u * Math.sin(rad),
      (b * (u * u + w * w) - v * (a * u + c * w)) * (1 - Math.cos(rad)) +
        (c * u - a * w) * Math.sin(rad),
      u * w * (1 - Math.cos(rad)) - v * Math.sin(rad),
      v * w * (1 - Math.cos(rad)) + u * Math.sin(rad),
      w * w + (u * u + v * v) * Math.cos(rad),
      (c * (u * u + v * v) - w * (a * u + b * v)) * (1 - Math.cos(rad)) +
        (a * v - b * u) * Math.sin(rad),
      0,
      0,
      0,
      1
    )

    return matrix4
  }

  /**
   * 转动动画
   */
  rotateAnimation(
    elements: THREE.Mesh[],
    direction: CubeDirection | null,
    currentstamp: number, // 当前时间戳
    startstamp: number, // 开始时间戳
    laststamp: number, // 结束时间戳
    totalTime: number, // 动画时间
    callback: Function
  ) {
    let isAnimationEnd = false //动画是否结束

    if (startstamp === 0) {
      startstamp = currentstamp
      laststamp = currentstamp
    }
    if (currentstamp - startstamp >= totalTime) {
      isAnimationEnd = true
      currentstamp = startstamp + totalTime
    }
    let rotateMatrix = new THREE.Matrix4() // 旋转矩阵

    const origin = new THREE.Vector3(0, 0, 0)
    const xLine = new THREE.Vector3(1, 0, 0)
    const yLine = new THREE.Vector3(0, 1, 0)
    const zLine = new THREE.Vector3(0, 0, 1)

    const rad = (90 / 180) * Math.PI * ((currentstamp - laststamp) / totalTime) // 旋转弧度

    switch (direction) {
      case "U":
      case "D'":
        rotateMatrix = this.rotateAroundWorldAxis(origin, yLine, rad)
        break
      case "U'":
      case "D":
        rotateMatrix = this.rotateAroundWorldAxis(origin, yLine, -rad)
        break
      case "R":
      case "L'":
        rotateMatrix = this.rotateAroundWorldAxis(origin, xLine, rad)
        break
      case "R'":
      case "L":
        rotateMatrix = this.rotateAroundWorldAxis(origin, xLine, -rad)
        break
      case "F":
      case "B'":
        rotateMatrix = this.rotateAroundWorldAxis(origin, zLine, rad)
        break
      case "F'":
      case "B":
        rotateMatrix = this.rotateAroundWorldAxis(origin, zLine, -rad)
        break
      default:
        break
    }

    elements.forEach((element) => {
      element.applyMatrix4(rotateMatrix)
    })

    if (!isAnimationEnd) {
      requestAnimationFrame((timestamp) => {
        this.rotateAnimation(
          elements,
          direction,
          timestamp,
          startstamp,
          currentstamp,
          totalTime,
          callback
        )
      })
    } else {
      callback()
    }
  }

  /**
   * 更新位置索引
   */
  updateIndex(elements: THREE.Mesh[]) {
    for (const i in elements) {
      const element = elements[i]
      for (const status of this.initStatus) {
        if (
          Math.abs(element.position.x - status.x) <= this.config.len / 2 &&
          Math.abs(element.position.y - status.y) <= this.config.len / 2 &&
          Math.abs(element.position.z - status.z) <= this.config.len / 2
        ) {
          elements[i].userData.index = status.userData.index
          break
        }
      }
    }
  }

  /**
   * 转动魔方
   */
  rotateMove(
    index: number,
    direction: CubeDirection | null,
    totalTime: number = this.defaultTotalTime,
    callback?: Function
  ) {
    const elements = this.getBoxs(index, direction) // 获得需要转动的元素

    requestAnimationFrame((timestamp) => {
      this.rotateAnimation(elements, direction, timestamp, 0, 0, totalTime, () => {
        this.updateIndex(elements)
        if (callback) {
          callback()
        }
      })
    })
  }
}
