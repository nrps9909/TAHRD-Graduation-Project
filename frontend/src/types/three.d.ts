// Type declarations for react-three-fiber
import { Object3DNode } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControls: Object3DNode<OrbitControlsImpl, typeof OrbitControlsImpl>
    }
  }
}

export {}
