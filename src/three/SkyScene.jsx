import { useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWeather } from '../context/WeatherContext'
import {
  makeCloudTexture,
  makeGlowTexture,
  makeRainTexture,
  makeSnowTexture,
  makeStarTexture,
} from './textures'

// Neutral defaults shown before data arrives
const NEUTRAL = {
  zenith: '#dbe6f3',
  horizon: '#f8fafc',
  warmth: 0,
  elev: 0.7,
  progress: 0.5,
  isDay: true,
  lightColor: '#fff5e0',
  lightIntensity: 1.6,
  ambient: 0.8,
  exposure: 1,
  fogDensity: 0.002,
  fogColor: '#f8fafc',
  cloudCover: 0.25,
  cloudColor: '#ffffff',
  cloudDark: '#9aa7b8',
  rain: 0,
  snow: 0,
  thunder: false,
  stars: 0,
  moonIllumination: 0.5,
}

const damp = THREE.MathUtils.damp

/* ---------------------------------------------------------------- sky dome */

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const skyFragment = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uWarm;
  uniform float uWarmth;
  uniform vec3 uSunDir;
  uniform float uFlash;
  varying vec3 vWorld;

  void main() {
    vec3 dir = normalize(vWorld);
    float h = clamp(dir.y, 0.0, 1.0);
    // Nonlinear falloff gives a believable atmospheric gradient
    float t = pow(1.0 - h, 1.8);
    vec3 col = mix(uZenith, uHorizon, t);

    // Sunset warmth concentrated near the sun's azimuth at the horizon
    float sunAmount = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonBand = pow(1.0 - h, 3.0);
    col = mix(col, uWarm, uWarmth * horizonBand * (0.35 + 0.65 * pow(sunAmount, 2.0)));

    // Subtle glow around the light source
    col += vec3(1.0, 0.95, 0.85) * pow(sunAmount, 24.0) * 0.35 * (1.0 - uWarmth * 0.3);

    // Lightning flash washes the whole sky
    col = mix(col, vec3(0.95, 0.96, 1.0), uFlash * 0.85);

    gl_FragColor = vec4(col, 1.0);
  }
`

function SkyDome({ store }) {
  const mat = useRef()
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(NEUTRAL.zenith) },
      uHorizon: { value: new THREE.Color(NEUTRAL.horizon) },
      uWarm: { value: new THREE.Color('#ff7e3d') },
      uWarmth: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 0.5, -1) },
      uFlash: { value: 0 },
    }),
    [],
  )

  useFrame((_, dt) => {
    const s = store.current
    const u = uniforms
    u.uZenith.value.lerp(s.colZenith, 1 - Math.exp(-1.6 * dt))
    u.uHorizon.value.lerp(s.colHorizon, 1 - Math.exp(-1.6 * dt))
    u.uWarmth.value = damp(u.uWarmth.value, s.smooth.warmth, 1.6, dt)
    u.uSunDir.value.copy(s.lightPos)
    u.uFlash.value = s.flash
  })

  return (
    <mesh scale={[1, 1, 1]} frustumCulled={false}>
      <sphereGeometry args={[160, 32, 24]} />
      <shaderMaterial
        ref={mat}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------ sun and moon */

function CelestialBodies({ store }) {
  const sunGroup = useRef()
  const moonGroup = useRef()
  const sunCore = useRef()
  const sunGlow = useRef()
  const moonCore = useRef()
  const moonGlow = useRef()
  const glowTex = useMemo(() => makeGlowTexture(), [])

  useFrame((_, dt) => {
    const s = store.current
    // Arc across the sky: azimuth sweeps -X to +X, elevation follows sine
    const prog = s.smooth.progress
    const ang = Math.PI * (1 - prog)
    const R = 120
    const x = R * Math.cos(ang) * 0.9
    const y = Math.max(4, R * Math.sin(ang) * 0.55)
    const z = -R * 0.72

    const active = s.smooth.isDayF // 1 = day, 0 = night (smoothed)
    if (sunGroup.current) {
      sunGroup.current.position.set(x, y, z)
      sunGroup.current.visible = active > 0.02
    }
    if (moonGroup.current) {
      moonGroup.current.position.set(x, y, z)
      moonGroup.current.visible = active < 0.98
    }
    s.lightPos.set(x, y, z)

    const cloudDim = 1 - s.smooth.cloudCover * 0.75
    if (sunCore.current) sunCore.current.material.opacity = active * cloudDim
    if (sunGlow.current) sunGlow.current.material.opacity = active * 0.55 * cloudDim
    const moonA = (1 - active) * (0.35 + s.targets.moonIllumination * 0.65)
    if (moonCore.current) moonCore.current.material.opacity = moonA * cloudDim
    if (moonGlow.current) moonGlow.current.material.opacity = moonA * 0.3 * cloudDim

    // Warm the sun sprite near the horizon
    if (sunCore.current) {
      sunCore.current.material.color.setStyle(s.smooth.warmth > 0.45 ? '#ffb36b' : '#fff3c4')
    }
  })

  return (
    <>
      <group ref={sunGroup}>
        <sprite ref={sunGlow} scale={[70, 70, 1]}>
          <spriteMaterial
            map={glowTex}
            color="#ffdf8a"
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite ref={sunCore} scale={[18, 18, 1]}>
          <spriteMaterial map={glowTex} color="#fff3c4" transparent depthWrite={false} />
        </sprite>
      </group>

      <group ref={moonGroup}>
        <sprite ref={moonGlow} scale={[46, 46, 1]}>
          <spriteMaterial
            map={glowTex}
            color="#c7d4f5"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite ref={moonCore} scale={[11, 11, 1]}>
          <spriteMaterial map={glowTex} color="#e8eefc" transparent depthWrite={false} />
        </sprite>
      </group>
    </>
  )
}

/* ------------------------------------------------------------------- stars */

function Stars({ store }) {
  const points = useRef()
  const tex = useMemo(() => makeStarTexture(), [])
  const { positions, phases } = useMemo(() => {
    const n = 700
    const pos = new Float32Array(n * 3)
    const ph = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // Random points on the upper hemisphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 0.95)
      const r = 150
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 6
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      ph[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, phases: ph }
  }, [])

  useFrame(({ clock }, dt) => {
    const s = store.current
    if (!points.current) return
    const m = points.current.material
    m.opacity = damp(m.opacity, s.smooth.stars * 0.9, 1.5, dt)
    points.current.visible = m.opacity > 0.01
    // Gentle global twinkle via size pulsing
    m.size = 1.35 + Math.sin(clock.elapsedTime * 1.7) * 0.15
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={1.35}
        sizeAttenuation={false}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#eef2ff"
      />
    </points>
  )
}

/* ------------------------------------------------------------------ clouds */

const CLUSTERS = 14

function Clouds({ store }) {
  const group = useRef()
  const textures = useMemo(
    () => [makeCloudTexture(11), makeCloudTexture(53), makeCloudTexture(97)],
    [],
  )

  // Build cloud clusters imperatively: each cluster shares one material so we
  // can fade whole clouds in/out cheaply.
  const clusters = useMemo(() => {
    const rng = (() => {
      let s = 42
      return () => {
        s = (s * 16807) % 2147483647
        return s / 2147483647
      }
    })()
    const list = []
    for (let ci = 0; ci < CLUSTERS; ci++) {
      const mat = new THREE.SpriteMaterial({
        map: textures[ci % textures.length],
        transparent: true,
        opacity: 0,
        depthWrite: false,
        color: new THREE.Color('#ffffff'),
      })
      const g = new THREE.Group()
      const puffs = 6 + Math.floor(rng() * 4)
      const spreadX = 16 + rng() * 22
      const baseScale = 14 + rng() * 16
      for (let i = 0; i < puffs; i++) {
        const sp = new THREE.Sprite(mat)
        sp.position.set(
          (rng() - 0.5) * spreadX,
          (rng() - 0.5) * 5,
          (rng() - 0.5) * 10,
        )
        const sc = baseScale * (0.55 + rng() * 0.8)
        sp.scale.set(sc, sc * 0.62, 1)
        g.add(sp)
      }
      const angle = rng() * Math.PI * 2
      const dist = 45 + rng() * 75
      g.position.set(
        Math.cos(angle) * dist,
        26 + rng() * 30 - dist * 0.08,
        Math.sin(angle) * dist * 0.7 - 25,
      )
      list.push({
        group: g,
        mat,
        speed: 0.35 + rng() * 0.75,
        baseOpacity: 0.5 + rng() * 0.35,
        threshold: ci / CLUSTERS, // cluster appears once coverage passes this
      })
    }
    return list
  }, [textures])

  useEffect(() => {
    const g = group.current
    clusters.forEach((c) => g.add(c.group))
    return () => {
      clusters.forEach((c) => {
        g.remove(c.group)
        c.mat.dispose()
      })
      textures.forEach((t) => t.dispose())
    }
  }, [clusters, textures])

  const colA = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const s = store.current
    const cover = s.smooth.cloudCover
    for (const c of clusters) {
      // Drift across the sky, wrap around
      c.group.position.x += c.speed * dt * (1 + s.smooth.rain * 1.5 + (s.targets.thunder ? 1.2 : 0))
      if (c.group.position.x > 130) c.group.position.x = -130

      // Fade cluster in/out based on coverage threshold
      const want = cover > c.threshold ? c.baseOpacity * Math.min(1, (cover - c.threshold) * 4) : 0
      c.mat.opacity = damp(c.mat.opacity, want, 1.2, dt)

      // Light vs shadowed cloud color, weighted by how deep in the deck it is
      colA.copy(s.colCloud).lerp(s.colCloudDark, c.threshold * 0.75)
      c.mat.color.lerp(colA, 1 - Math.exp(-1.5 * dt))

      // Lightning illuminates cloud bellies
      if (s.flash > 0.01) {
        c.mat.color.lerp(new THREE.Color('#ffffff'), s.flash * 0.6)
      }
    }
  })

  return <group ref={group} />
}

/* ----------------------------------------------------------- precipitation */

const RAIN_COUNT = 2600
const SNOW_COUNT = 1400
const AREA = { x: 90, yTop: 55, yBot: -5, z: 70 }

function Rain({ store }) {
  const points = useRef()
  const tex = useMemo(() => makeRainTexture(), [])
  const data = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3)
    const vel = new Float32Array(RAIN_COUNT)
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * AREA.x
      pos[i * 3 + 1] = AREA.yBot + Math.random() * (AREA.yTop - AREA.yBot)
      pos[i * 3 + 2] = (Math.random() - 0.5) * AREA.z - 10
      vel[i] = 42 + Math.random() * 26
    }
    return { pos, vel }
  }, [])

  useFrame((_, dt) => {
    const s = store.current
    const m = points.current.material
    m.opacity = damp(m.opacity, s.smooth.rain * 0.55, 1.8, dt)
    points.current.visible = m.opacity > 0.015
    if (!points.current.visible) return

    const arr = points.current.geometry.attributes.position.array
    const active = Math.floor(RAIN_COUNT * Math.min(1, s.smooth.rain * 1.15))
    points.current.geometry.setDrawRange(0, active)
    const clampedDt = Math.min(dt, 0.05)
    for (let i = 0; i < active; i++) {
      arr[i * 3 + 1] -= data.vel[i] * clampedDt
      arr[i * 3] -= 6 * clampedDt // wind slant
      if (arr[i * 3 + 1] < AREA.yBot) {
        arr[i * 3 + 1] = AREA.yTop
        arr[i * 3] = (Math.random() - 0.5) * AREA.x
      }
    }
    points.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        color="#b9c8dd"
        size={1.6}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

function Snow({ store }) {
  const points = useRef()
  const tex = useMemo(() => makeSnowTexture(), [])
  const data = useMemo(() => {
    const pos = new Float32Array(SNOW_COUNT * 3)
    const meta = new Float32Array(SNOW_COUNT * 3) // fall speed, sway phase, sway amp
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * AREA.x
      pos[i * 3 + 1] = AREA.yBot + Math.random() * (AREA.yTop - AREA.yBot)
      pos[i * 3 + 2] = (Math.random() - 0.5) * AREA.z - 10
      meta[i * 3] = 2.2 + Math.random() * 3.4
      meta[i * 3 + 1] = Math.random() * Math.PI * 2
      meta[i * 3 + 2] = 0.4 + Math.random() * 1.1
    }
    return { pos, meta }
  }, [])

  useFrame(({ clock }, dt) => {
    const s = store.current
    const m = points.current.material
    m.opacity = damp(m.opacity, s.smooth.snow * 0.95, 1.8, dt)
    points.current.visible = m.opacity > 0.015
    if (!points.current.visible) return

    const arr = points.current.geometry.attributes.position.array
    const active = Math.floor(SNOW_COUNT * Math.min(1, s.smooth.snow * 1.2))
    points.current.geometry.setDrawRange(0, active)
    const t = clock.elapsedTime
    const clampedDt = Math.min(dt, 0.05)
    for (let i = 0; i < active; i++) {
      arr[i * 3 + 1] -= data.meta[i * 3] * clampedDt
      arr[i * 3] += Math.sin(t * 0.9 + data.meta[i * 3 + 1]) * data.meta[i * 3 + 2] * clampedDt
      if (arr[i * 3 + 1] < AREA.yBot) {
        arr[i * 3 + 1] = AREA.yTop
        arr[i * 3] = (Math.random() - 0.5) * AREA.x
      }
    }
    points.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        color="#ffffff"
        size={1.05}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------- lights, fog, camera, lightning */

function Atmosphere({ store }) {
  const dirLight = useRef()
  const ambLight = useRef()
  const flashLight = useRef()
  const { scene, gl, camera } = useThree()
  const fog = useMemo(() => new THREE.FogExp2('#f8fafc', 0.002), [])
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    scene.fog = fog
    gl.toneMapping = THREE.ACESFilmicToneMapping
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      scene.fog = null
      window.removeEventListener('pointermove', onMove)
    }
  }, [scene, gl, fog])

  useFrame((state, dt) => {
    const s = store.current
    const sm = s.smooth
    const t = s.targets

    // Smooth every scalar toward its target
    sm.warmth = damp(sm.warmth, t.warmth, 1.2, dt)
    sm.cloudCover = damp(sm.cloudCover, t.cloudCover, 0.9, dt)
    sm.rain = damp(sm.rain, t.rain, 1.2, dt)
    sm.snow = damp(sm.snow, t.snow, 1.2, dt)
    sm.stars = damp(sm.stars, t.stars, 1.0, dt)
    sm.progress = damp(sm.progress, t.progress, 1.2, dt)
    sm.isDayF = damp(sm.isDayF, t.isDay ? 1 : 0, 1.0, dt)
    sm.fogDensity = damp(sm.fogDensity, t.fogDensity, 1.0, dt)
    sm.exposure = damp(sm.exposure, t.exposure, 1.2, dt)
    sm.lightIntensity = damp(sm.lightIntensity, t.lightIntensity, 1.2, dt)
    sm.ambient = damp(sm.ambient, t.ambient, 1.2, dt)

    // Color lerps
    const k = 1 - Math.exp(-1.4 * dt)
    s.colZenith.lerp(s.tZenith, k)
    s.colHorizon.lerp(s.tHorizon, k)
    s.colCloud.lerp(s.tCloud, k)
    s.colCloudDark.lerp(s.tCloudDark, k)
    s.colLight.lerp(s.tLight, k)
    s.colFog.lerp(s.tFog, k)

    // Lightning state machine
    if (t.thunder) {
      s.flashTimer -= dt
      if (s.flashTimer <= 0 && s.flash <= 0.01) {
        s.flash = 0.9 + Math.random() * 0.4
        s.flashTimer = 2.5 + Math.random() * 7
      }
    }
    s.flash = Math.max(0, s.flash - dt * (s.flash > 0.5 ? 2.2 : 4.5))

    // Apply
    fog.density = sm.fogDensity
    fog.color.copy(s.colFog)
    gl.toneMappingExposure = sm.exposure + s.flash * 0.35

    if (dirLight.current) {
      dirLight.current.position.copy(s.lightPos)
      dirLight.current.intensity = sm.lightIntensity
      dirLight.current.color.copy(s.colLight)
    }
    if (ambLight.current) {
      ambLight.current.intensity = sm.ambient
      ambLight.current.color.copy(s.colHorizon)
    }
    if (flashLight.current) {
      flashLight.current.intensity = s.flash * 6
    }

    // Gentle pointer parallax
    const px = pointer.current.x * 3
    const py = 8 - pointer.current.y * 1.6
    camera.position.x = damp(camera.position.x, px, 1.5, dt)
    camera.position.y = damp(camera.position.y, py, 1.5, dt)
    camera.lookAt(0, 18, -60)
  })

  return (
    <>
      <directionalLight ref={dirLight} position={[0, 60, -80]} intensity={1.5} />
      <ambientLight ref={ambLight} intensity={0.8} />
      <directionalLight ref={flashLight} position={[20, 80, -40]} intensity={0} color="#eef2ff" />
    </>
  )
}

/* ------------------------------------------------------------------- store */

function makeStore() {
  return {
    targets: { ...NEUTRAL },
    smooth: {
      warmth: NEUTRAL.warmth,
      cloudCover: NEUTRAL.cloudCover,
      rain: 0,
      snow: 0,
      stars: 0,
      progress: NEUTRAL.progress,
      isDayF: 1,
      fogDensity: NEUTRAL.fogDensity,
      exposure: NEUTRAL.exposure,
      lightIntensity: NEUTRAL.lightIntensity,
      ambient: NEUTRAL.ambient,
    },
    // Current colors (lerped) and their targets
    colZenith: new THREE.Color(NEUTRAL.zenith),
    colHorizon: new THREE.Color(NEUTRAL.horizon),
    colCloud: new THREE.Color(NEUTRAL.cloudColor),
    colCloudDark: new THREE.Color(NEUTRAL.cloudDark),
    colLight: new THREE.Color(NEUTRAL.lightColor),
    colFog: new THREE.Color(NEUTRAL.fogColor),
    tZenith: new THREE.Color(NEUTRAL.zenith),
    tHorizon: new THREE.Color(NEUTRAL.horizon),
    tCloud: new THREE.Color(NEUTRAL.cloudColor),
    tCloudDark: new THREE.Color(NEUTRAL.cloudDark),
    tLight: new THREE.Color(NEUTRAL.lightColor),
    tFog: new THREE.Color(NEUTRAL.fogColor),
    lightPos: new THREE.Vector3(0, 60, -80),
    flash: 0,
    flashTimer: 3,
  }
}

/* --------------------------------------------------------------- component */

export default function SkyScene() {
  const { scene: sceneTargets } = useWeather()
  const store = useRef(null)
  if (!store.current) store.current = makeStore()

  // Push new targets into the mutable store whenever weather data changes.
  useEffect(() => {
    const t = sceneTargets ?? NEUTRAL
    const s = store.current
    s.targets = { ...NEUTRAL, ...t }
    s.tZenith.set(t.zenith ?? NEUTRAL.zenith)
    s.tHorizon.set(t.horizon ?? NEUTRAL.horizon)
    s.tCloud.set(t.cloudColor ?? NEUTRAL.cloudColor)
    s.tCloudDark.set(t.cloudDark ?? NEUTRAL.cloudDark)
    s.tLight.set(t.lightColor ?? NEUTRAL.lightColor)
    s.tFog.set(t.fogColor ?? NEUTRAL.fogColor)
  }, [sceneTargets])

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 8, 18], fov: 60, near: 0.5, far: 400 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <SkyDome store={store} />
        <CelestialBodies store={store} />
        <Stars store={store} />
        <Clouds store={store} />
        <Rain store={store} />
        <Snow store={store} />
        <Atmosphere store={store} />
      </Canvas>
      {/* Soft gradient at the bottom so UI cards sit on a readable surface */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--bg-to))',
          opacity: 0.55,
          transition: 'opacity 900ms ease',
        }}
      />
    </div>
  )
}
