import * as THREE from 'three'

// Procedural textures generated once on a canvas — no asset downloads needed.

function canvasTexture(size, draw) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  draw(c.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Soft cloud puff: several overlapping radial gradients for an irregular edge.
export function makeCloudTexture(seed = 1) {
  return canvasTexture(256, (ctx, s) => {
    let rng = seed
    const rand = () => {
      rng = (rng * 16807) % 2147483647
      return rng / 2147483647
    }
    ctx.clearRect(0, 0, s, s)
    const blobs = 9
    for (let i = 0; i < blobs; i++) {
      const x = s / 2 + (rand() - 0.5) * s * 0.4
      const y = s / 2 + (rand() - 0.5) * s * 0.32
      const r = s * (0.16 + rand() * 0.2)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255,255,255,0.55)')
      g.addColorStop(0.55, 'rgba(255,255,255,0.22)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, s, s)
    }
  })
}

// Additive glow disc for sun / moon halo.
export function makeGlowTexture() {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

// Vertical streak for rain drops.
export function makeRainTexture() {
  return canvasTexture(32, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(s * 0.42, 0, s * 0.16, s)
  })
}

// Soft dot for snowflakes.
export function makeSnowTexture() {
  return canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.85)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

// Tiny round star sprite.
export function makeStarTexture() {
  return canvasTexture(32, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}
