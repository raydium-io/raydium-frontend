let cachedCanvas: HTMLCanvasElement | null = null

const resultCache = new Map<string, boolean>()

export default async function hasOpacityPx(imgSrc: string | undefined): Promise<boolean> {
  if (!imgSrc) return false
  if (resultCache.has(imgSrc)) return resultCache.get(imgSrc)!
  if (!('document' in globalThis)) return false

  //#region ------------------- get canvas context -------------------
  let inMemoryCanvas: HTMLCanvasElement
  if (!cachedCanvas) {
    const canvas = globalThis.document.createElement('canvas')
    inMemoryCanvas = canvas
    cachedCanvas = canvas
  } else {
    inMemoryCanvas = cachedCanvas
  }
  const ctx = inMemoryCanvas.getContext('2d')
  if (!ctx) return false
  //#endregion

  const img = globalThis.document.createElement('img')
  img.src = imgSrc
  img.setAttribute('crossOrigin', '')
  if (resultCache.has(imgSrc)) return resultCache.get(imgSrc)!

  return new Promise((resolve) => {
    img.addEventListener('load', () => {
      if (resultCache.has(imgSrc)) {
        resolve(resultCache.get(imgSrc)!)
      } else {
        let judgeResult = false
        ctx.clearRect(0, 0, inMemoryCanvas.width, inMemoryCanvas.height)
        ctx.drawImage(img, 0, 0, 5, 5)

        const allPointsCoors = [
          // 4 corner
          [1, 1],
          [3, 1],
          [1, 3],
          [3, 3],

          // 4 side
          // [0, 2],
          // [2, 0],
          // [4, 2],
          // [2, 4],

          // 1 center
          [2, 2]
        ]

        for (const [x, y] of allPointsCoors) {
          const [, , , alpha] = ctx.getImageData(x, y, 1, 1).data
          if (alpha !== 255) {
            judgeResult = true
            break
          }
        }

        // cache the result
        resultCache.set(imgSrc, judgeResult)

        resolve(judgeResult)
      }
    })
  })
}
