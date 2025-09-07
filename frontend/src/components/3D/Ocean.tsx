import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'
import { collisionSystem } from '@/utils/collision'

export const Ocean = () => {
  const oceanRef = useRef<THREE.Mesh>(null)
  const { timeOfDay, weather } = useTimeStore()

  // 海洋不設置邊界碰撞檢測，允許自由移動

  // 創建海洋幾何體 - 大範圍平面
  const oceanGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(1000, 1000, 256, 256)
  }, [])

  // 創建海洋材質
  const oceanMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        oceanColor: { value: new THREE.Color('#006994') },
        shallowColor: { value: new THREE.Color('#7DD3FC') },
        foamColor: { value: new THREE.Color('#FFFFFF') },
        waveHeight: { value: 2.0 },
        waveSpeed: { value: 1.0 },
        transparency: { value: 0.8 },
        timeOfDay: { value: 0.5 }, // 0=夜晚, 0.5=白天, 1=日落
        weatherIntensity: { value: 0.0 }, // 天氣強度
      },
      vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveSpeed;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vElevation;

        // 噪聲函數
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
          return mod289(((x*34.0)+1.0)*x);
        }

        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 - 0.85373472095314 * r;
        }

        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 =   v - i + dot(i, C.xxx) ;

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
          vUv = uv;
          vPosition = position;

          // 計算波浪
          float wave1 = snoise(vec3(position.x * 0.01 + time * waveSpeed * 0.5, position.y * 0.01, time * 0.3)) * waveHeight;
          float wave2 = snoise(vec3(position.x * 0.02 + time * waveSpeed * 0.3, position.y * 0.02 + time * 0.2, time * 0.5)) * waveHeight * 0.5;
          float wave3 = snoise(vec3(position.x * 0.05 + time * waveSpeed * 0.7, position.y * 0.05 - time * 0.1, time * 0.7)) * waveHeight * 0.3;

          vElevation = wave1 + wave2 + wave3;

          vec3 newPosition = position;
          newPosition.z = vElevation;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 oceanColor;
        uniform vec3 shallowColor;
        uniform vec3 foamColor;
        uniform float time;
        uniform float transparency;
        uniform float timeOfDay;
        uniform float weatherIntensity;
        
        varying vec3 vPosition;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          // 基於距離中心的淺水效果
          float distanceFromCenter = length(vPosition.xy) / 200.0;
          distanceFromCenter = clamp(distanceFromCenter, 0.0, 1.0);

          // 根據時間調整顏色
          vec3 dayOcean = oceanColor;
          vec3 nightOcean = oceanColor * 0.3;
          vec3 sunsetOcean = mix(oceanColor, vec3(0.9, 0.4, 0.2), 0.3);
          
          vec3 currentOceanColor = dayOcean;
          if (timeOfDay < 0.3) {
            // 夜晚
            currentOceanColor = nightOcean;
          } else if (timeOfDay > 0.7) {
            // 日落
            currentOceanColor = sunsetOcean;
          }

          // 根據天氣調整顏色
          currentOceanColor = mix(currentOceanColor, currentOceanColor * 0.6, weatherIntensity);

          // 混合深水和淺水顏色
          vec3 finalColor = mix(shallowColor, currentOceanColor, distanceFromCenter);

          // 添加泡沫效果（基於波浪高度）
          float foamFactor = smoothstep(1.0, 2.0, abs(vElevation));
          finalColor = mix(finalColor, foamColor, foamFactor * 0.5);

          // 添加微光效果
          float sparkle = sin(vPosition.x * 0.1 + time * 2.0) * sin(vPosition.y * 0.1 + time * 1.5) * 0.1 + 0.1;
          finalColor += sparkle * vec3(1.0, 1.0, 1.0) * (1.0 - weatherIntensity);

          gl_FragColor = vec4(finalColor, transparency);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })
  }, [])

  // 動畫更新
  useFrame((state) => {
    if (oceanRef.current && oceanMaterial) {
      oceanMaterial.uniforms.time.value = state.clock.elapsedTime

      // 根據時間更新顏色
      let timeValue = 0.5
      if (timeOfDay === 'night') timeValue = 0.2
      else if (timeOfDay === 'evening' || timeOfDay === 'dawn') timeValue = 0.8
      oceanMaterial.uniforms.timeOfDay.value = timeValue

      // 根據天氣調整波浪和顏色
      let weatherIntensity = 0.0
      let waveIntensity = 1.0
      switch (weather) {
        case 'stormy':
        case 'mountain_storm':
          weatherIntensity = 0.8
          waveIntensity = 2.0
          break
        case 'rainy':
        case 'drizzle':
          weatherIntensity = 0.4
          waveIntensity = 1.3
          break
        case 'cloudy':
          weatherIntensity = 0.2
          waveIntensity = 0.8
          break
      }
      
      oceanMaterial.uniforms.weatherIntensity.value = weatherIntensity
      oceanMaterial.uniforms.waveHeight.value = 2.0 * waveIntensity
      oceanMaterial.uniforms.waveSpeed.value = 1.0 * waveIntensity
    }
  })

  return (
    <mesh
      ref={oceanRef}
      geometry={oceanGeometry}
      material={oceanMaterial}
      position={[0, 0, -5]} // 稍微低於地面
      rotation={[-Math.PI / 2, 0, 0]} // 旋轉成水平面
      receiveShadow // 接收太陽和月亮投射的陰影
    />
  )
}