import "./style.css"
import Rubiks from "./rubiks"

window.onload = () => {
  const container = document.getElementById("container")
  const restore = document.getElementById("restore") as HTMLButtonElement

  if (container) {
    const rubiks = new Rubiks(container)

    restore.addEventListener("click", () => {
      const ok = window.confirm("还原后，不可恢复哦！")

      if (ok) {
        rubiks.restore()
      }
    })
  }
}
