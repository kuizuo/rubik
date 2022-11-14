import { Color, Scene, ColorRepresentation } from "three"

export const createScene = (bgColor: ColorRepresentation) => {
  const scene = new Scene()

  scene.background = new Color(bgColor)

  return scene
}
