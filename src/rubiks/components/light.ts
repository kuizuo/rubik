import { PointLight, ColorRepresentation } from "three"

export const createLight = (lightColor: ColorRepresentation = "0xffffff") => {
  const light = new PointLight(lightColor, 1, 2000)
  light.position.set(100, 100, 100)

  return light
}
