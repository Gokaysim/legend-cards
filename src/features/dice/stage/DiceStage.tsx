import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Suspense, use, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

import type { DieType } from '../formula'
import type { DiceRoll, DiceStyle, DieMotion, Transform } from '../schema'
import { ENVIRONMENT_URL, meshUrl, TRAY_MESH_URL } from './owlbear/assets'
import { D20_MESH_ROTATION_Z } from './owlbear/faces'
import { loadDiceMaterial, loadTrayMaterial } from './owlbear/materials'
import { playImpact, prepareSounds, SOUND_COOLDOWN_MS } from './owlbear/sounds'
import {
  FRAME_STRIDE,
  FRAMES_PER_SECOND,
  loadPhysics,
  type Simulation,
  simulateThrow,
} from './simulate'
import { rememberedSimulation, rememberSimulation } from './simulationCache'

export type DiceStageProps = {
  /** A roll with its content and motion. */
  roll: DiceRoll
  motion: DieMotion[]
  /** Play the throw; otherwise the dice lie at their recorded rest at once. */
  playing: boolean
  /** A new value plays the throw again ("Tekrar izle"). */
  playKey: number
  sound: boolean
  /** Called once the dice lie at rest. */
  onRest?: () => void
}

/** The device pixel ratio is capped, so a phone does not draw four times the pixels (design D7). */
const MAX_PIXEL_RATIO = 1.5
/** A die that ends off its recorded rest eases there over this long (design D8). */
const SETTLE_SECONDS = 0.3
const FIELD_OF_VIEW = 28
const HALF_VIEW = Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180)
/** The tray's outer half extents once turned a quarter so its long side runs across the screen. */
const TRAY_HALF = { x: 1.04, z: 0.56 }
/** The tray is turned a quarter about the vertical axis: Owlbear's tray is tall, the strip is wide. */
const TURN = new THREE.Euler(0, Math.PI / 2, 0)

const simulations = new Map<string, Promise<Simulation>>()

/** The roll's simulation, run at most once per device (design D7): the roller's device already has it. */
function simulationOf(roll: DiceRoll, motion: DieMotion[]): Promise<Simulation> {
  const known = simulations.get(roll.id)
  if (known) return known
  const remembered = rememberedSimulation(roll.id)
  const content = roll.content
  const promise = remembered
    ? Promise.resolve(remembered)
    : loadPhysics().then(() => {
        const types = content?.dice.map((die) => die.t) ?? []
        const simulation = simulateThrow(
          types,
          content?.style ?? 'galaxy',
          motion.map((die) => die.throw),
        )
        rememberSimulation(roll.id, simulation)
        return simulation
      })
  simulations.set(roll.id, promise)
  return promise
}

const materials = new Map<string, Promise<THREE.Material>>()
const textureLoader = new THREE.TextureLoader()

function diceMaterialOf(style: DiceStyle): Promise<THREE.Material> {
  const known = materials.get(style)
  if (known) return known
  const promise = loadDiceMaterial(style, textureLoader)
  materials.set(style, promise)
  return promise
}

function trayMaterial(): Promise<THREE.Material> {
  const known = materials.get('tray')
  if (known) return known
  const promise = loadTrayMaterial(textureLoader)
  materials.set('tray', promise)
  return promise
}

function geometryOf(gltf: { scene: THREE.Object3D }): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry | null = null
  gltf.scene.traverse((object) => {
    if (!geometry && object instanceof THREE.Mesh)
      geometry = object.geometry as THREE.BufferGeometry
  })
  if (!geometry) throw new Error('A dice mesh without geometry')
  return geometry
}

/** How high the camera stands above the tray's centre to see the whole tray. */
function cameraHeight(aspect: number): number {
  return Math.max(TRAY_HALF.z / HALF_VIEW, TRAY_HALF.x / (HALF_VIEW * aspect))
}

function Camera() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    const aspect = size.height > 0 ? size.width / size.height : 1
    camera.position.set(0, cameraHeight(aspect), 0)
    camera.rotation.set(-Math.PI / 2, 0, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, invalidate])
  return null
}

/** Owlbear's studio lighting: the HDR environment, attached to the scene. */
function Environment() {
  const texture = useLoader(HDRLoader, ENVIRONMENT_URL)
  return (
    <primitive
      object={texture}
      attach="environment"
      mapping={THREE.EquirectangularReflectionMapping}
    />
  )
}

function Tray() {
  const gltf = useLoader(GLTFLoader, TRAY_MESH_URL)
  const material = use(trayMaterial())
  const geometry = useMemo(() => geometryOf(gltf), [gltf])
  return (
    <group scale={0.1}>
      <mesh geometry={geometry} material={material} position={[0, -0.33, 0]} receiveShadow />
    </group>
  )
}

type Pose = { position: THREE.Vector3; quaternion: THREE.Quaternion }

function poseOf(transform: Transform): Pose {
  const { position: p, rotation: r } = transform
  return {
    position: new THREE.Vector3(p.x, p.y, p.z),
    quaternion: new THREE.Quaternion(r.x, r.y, r.z, r.w),
  }
}

function framePose(simulation: Simulation, frame: number, die: number, count: number): Pose {
  const offset = (frame * count + die) * FRAME_STRIDE
  const f = simulation.frames
  return {
    position: new THREE.Vector3(f[offset], f[offset + 1], f[offset + 2]),
    quaternion: new THREE.Quaternion(f[offset + 3], f[offset + 4], f[offset + 5], f[offset + 6]),
  }
}

type DiceProps = {
  types: readonly DieType[]
  style: DiceStyle
  simulation: Simulation
  recorded: readonly number[]
  rests: readonly Transform[]
  rollId: string
  playing: boolean
  playKey: number
  sound: boolean
  onRest: () => void
}

/** Plays the simulated frames against time, then settles onto the record (design D2, D8). It never steps physics. */
function Dice({
  types,
  style,
  simulation,
  recorded,
  rests,
  rollId,
  playing,
  playKey,
  sound,
  onRest,
}: DiceProps) {
  const kinds = useMemo(() => [...new Set(types)], [types])
  const gltfs = useLoader(
    GLTFLoader,
    kinds.map((type) => meshUrl(style, type)),
  )
  const material = use(diceMaterialOf(style))
  const geometries = useMemo(
    () =>
      new Map(
        kinds.map((type, index) => [type, geometryOf(gltfs[index] as { scene: THREE.Object3D })]),
      ),
    [kinds, gltfs],
  )
  const groups = useRef<(THREE.Group | null)[]>([])
  const recordedPoses = useMemo(() => rests.map(poseOf), [rests])
  const invalidate = useThree((state) => state.invalidate)

  // The playback's own clock: when it started, when the settling started, and the last sound of each die.
  const playback = useRef({
    start: -1,
    settleStart: -1,
    done: false,
    lastSound: [] as number[],
    from: [] as Pose[],
  })

  useLayoutEffect(() => {
    playback.current = { start: -1, settleStart: -1, done: !playing, lastSound: [], from: [] }
    if (!playing) {
      // Reduced motion, or a roll shown at rest: the recorded rests at once.
      groups.current.forEach((group, index) => {
        const pose = recordedPoses[index]
        if (group && pose) {
          group.position.copy(pose.position)
          group.quaternion.copy(pose.quaternion)
        }
      })
      invalidate()
      onRest()
    }
  }, [playing, playKey, recordedPoses, invalidate, onRest])

  useEffect(() => {
    if (sound) prepareSounds()
  }, [sound])

  useFrame((state) => {
    const run = playback.current
    if (run.done) return
    const now = state.clock.elapsedTime
    if (run.start < 0) run.start = now
    const elapsed = now - run.start
    const count = types.length
    const last = simulation.frameCount - 1
    const position = Math.min(elapsed * FRAMES_PER_SECOND, last)
    const frame = Math.floor(position)
    const blend = position - frame

    if (run.settleStart < 0) {
      groups.current.forEach((group, die) => {
        if (!group) return
        const a = framePose(simulation, frame, die, count)
        const b = framePose(simulation, Math.min(frame + 1, last), die, count)
        group.position.copy(a.position).lerp(b.position, blend)
        group.quaternion.copy(a.quaternion).slerp(b.quaternion, blend)
      })
      if (sound) {
        for (const impact of simulation.impacts) {
          if (impact.frame !== frame) continue
          const heard = run.lastSound[impact.die] ?? -Infinity
          if ((elapsed - heard) * 1000 < SOUND_COOLDOWN_MS) continue
          run.lastSound[impact.die] = elapsed
          playImpact(impact.strength)
        }
      }
      if (position < last) return
      // The frames have ended: compare with the record (design D8).
      const drifted = simulation.values.some((value, die) => value !== recorded[die])
      if (drifted) {
        console.warn(
          `Dice roll ${rollId} played onto other faces than recorded; settling onto the record`,
        )
      }
      run.from = groups.current.map((group) => ({
        position: group?.position.clone() ?? new THREE.Vector3(),
        quaternion: group?.quaternion.clone() ?? new THREE.Quaternion(),
      }))
      run.settleStart = elapsed
    }

    const progress = Math.min((elapsed - run.settleStart) / SETTLE_SECONDS, 1)
    const eased = 1 - (1 - progress) ** 3
    groups.current.forEach((group, die) => {
      const from = run.from[die]
      const to = recordedPoses[die]
      if (!group || !from || !to) return
      group.position.copy(from.position).lerp(to.position, eased)
      group.quaternion.copy(from.quaternion).slerp(to.quaternion, eased)
    })
    if (progress >= 1) {
      run.done = true
      onRest()
    }
  })

  return (
    <>
      {types.map((type, index) => (
        <group
          // The dice of a roll never reorder.
          key={`${playKey}-${index}`}
          ref={(group) => {
            groups.current[index] = group
          }}
        >
          <mesh
            geometry={geometries.get(type)}
            material={material}
            scale={0.1}
            rotation={type === 'd20' ? [0, 0, D20_MESH_ROTATION_Z] : [0, 0, 0]}
            castShadow
          />
        </group>
      ))}
    </>
  )
}

/**
 * The 3D dice of one roll (design D7): Owlbear's tray and dice in the roll's style, playing the throw the roll
 * recorded, simulated once on this device. Loaded lazily with three.js, React Three Fiber and Rapier; nothing outside
 * `stage/` imports them.
 */
export function DiceStage({ roll, motion, playing, playKey, sound, onRest }: DiceStageProps) {
  const content = roll.content
  const simulation = use(simulationOf(roll, motion))
  const types = useMemo(() => content?.dice.map((die) => die.t) ?? [], [content])
  const recorded = useMemo(() => content?.dice.map((die) => die.v) ?? [], [content])
  const rests = useMemo(() => motion.map((die) => die.rest), [motion])
  const [restedKey, setRestedKey] = useState<number | null>(null)
  const isAtRest = restedKey === playKey || !playing
  const onRestRef = useRef(onRest)
  useLayoutEffect(() => {
    onRestRef.current = onRest
  })
  const handleRest = useMemo(
    () => () => {
      setRestedKey(playKey)
      onRestRef.current?.()
    },
    [playKey],
  )

  if (!content) return null
  return (
    <Canvas
      dpr={[1, MAX_PIXEL_RATIO]}
      frameloop={isAtRest ? 'demand' : 'always'}
      shadows
      camera={{ fov: FIELD_OF_VIEW, near: 0.1, far: 20, position: [0, 4.3, 0] }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Camera />
        <Environment />
        <directionalLight
          position={[0.6, 3, 0.4]}
          intensity={0.6}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-1.2}
          shadow-camera-right={1.2}
          shadow-camera-top={1.2}
          shadow-camera-bottom={-1.2}
        />
        <group rotation={TURN}>
          <Tray />
          <Dice
            types={types}
            style={content.style}
            simulation={simulation}
            recorded={recorded}
            rests={rests}
            rollId={roll.id}
            playing={playing}
            playKey={playKey}
            sound={sound}
            onRest={handleRest}
          />
        </group>
      </Suspense>
    </Canvas>
  )
}
