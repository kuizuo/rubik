import "./style.css"
import Rubiks from "./rubiks"

window.onload = () => {
  const container = document.getElementById("container")

  if (container) {
    const rubiks = new Rubiks(container)
  }
}
