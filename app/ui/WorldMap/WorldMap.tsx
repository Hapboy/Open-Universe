import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import type { GlobeInstance } from 'globe.gl'
import { useGraphContext } from '../../store/contexts/GraphContext.tsx'
import type { CharacterNodeParams, LocationNodeParams, WGS84Coordinates } from '../../types.ts'
import styles from './WorldMap.module.css'

const EARTH_RADIUS_KM = 6371

interface LocationRingDatum {
  label: string
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

interface CharacterMarkerDatum {
  lat: number
  lng: number
  color: string
  label: string
}

function hasCoords(c: WGS84Coordinates | undefined): c is { lat: number; lon: number } {
  return !!c && c.lat != null && c.lon != null
}

// Ring of [lng, lat] points (GeoJSON order) at a given great-circle distance
// from a center, used to render a location's real-world radius as a polygon.
function circleRing(lat: number, lon: number, radiusKm: number, segments = 64): [number, number][] {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  const angular = radiusKm / EARTH_RADIUS_KM
  const ring: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const bearing = (i / segments) * 2 * Math.PI
    const destLat = Math.asin(
      Math.sin(latRad) * Math.cos(angular) +
        Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing)
    )
    const destLon =
      lonRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
        Math.cos(angular) - Math.sin(latRad) * Math.sin(destLat)
      )
    ring.push([(destLon * 180) / Math.PI, (destLat * 180) / Math.PI])
  }
  return ring
}

function buildCharacterMarkerEl(d: CharacterMarkerDatum): HTMLElement {
  const el = document.createElement('div')
  el.className = styles.characterMarker
  el.title = d.label
  el.innerHTML = `
    <svg viewBox="0 0 32 32" width="28" height="28">
      <circle class="${styles.pulseRing}" cx="16" cy="16" r="5" fill="none" stroke="${d.color}" stroke-width="2" />
      <circle cx="16" cy="16" r="5" fill="${d.color}" />
    </svg>
  `
  return el
}

export function WorldMap() {
  const { nodes, showWorldMap, setShowWorldMap } = useGraphContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [globe, setGlobe] = useState<GlobeInstance | null>(null)

  // Lazy-init on first open; kept alive across later toggles so the texture
  // and WebGL scene are never reloaded/rebuilt.
  useEffect(() => {
    if (!showWorldMap || globe || !containerRef.current) return
    let cancelled = false
    import('globe.gl').then(({ default: Globe }) => {
      if (cancelled || !containerRef.current) return
      const instance = new Globe(containerRef.current)
        .globeImageUrl('/textures/earth-blue-marble.jpg')
        .backgroundColor('rgba(0,0,0,0)')
        .polygonGeoJsonGeometry((d: LocationRingDatum) => d.geometry)
        .polygonCapColor(() => 'rgba(255,138,61,0.35)')
        .polygonSideColor(() => 'rgba(255,138,61,0.15)')
        .polygonStrokeColor(() => '#ff8a3d')
        .polygonAltitude(0.005)
        .polygonLabel((d: LocationRingDatum) => d.label)
        .htmlLat((d: CharacterMarkerDatum) => d.lat)
        .htmlLng((d: CharacterMarkerDatum) => d.lng)
        .htmlElement((d: CharacterMarkerDatum) => buildCharacterMarkerEl(d))
        .pointOfView({ lat: 20, lng: 45, altitude: 2.5 })
      // `instance` is a kapsule chainable *function* — pass it via an updater
      // so React stores it as the value instead of calling it as `fn(prevState)`.
      setGlobe(() => instance)
    })
    return () => {
      cancelled = true
    }
  }, [showWorldMap, globe])

  // Push the active scene's characters/locations whenever either changes.
  // `nodes` already reflects only the active scene's graph (GraphContext
  // swaps it on activeSceneId change), so no extra scene filtering is needed.
  useEffect(() => {
    if (!globe) return

    const locations: LocationRingDatum[] = nodes
      .filter((n) => n.data.nodeType === 'location')
      .map((n) => n.data.params as LocationNodeParams)
      .filter((p) => hasCoords(p.coordinates))
      .map((p) => ({
        label: 'Локация',
        geometry: {
          type: 'Polygon',
          coordinates: [circleRing(p.coordinates.lat!, p.coordinates.lon!, p.radiusKm || 5)],
        },
      }))

    const characters: CharacterMarkerDatum[] = nodes
      .filter((n) => n.data.nodeType === 'character')
      .map((n) => ({
        color: n.data.color,
        label: n.data.label,
        params: n.data.params as CharacterNodeParams,
      }))
      .filter(({ params }) => hasCoords(params.currentPosition))
      .map(({ color, label, params }) => ({
        lat: params.currentPosition.lat!,
        lng: params.currentPosition.lon!,
        color: color || '#ff8a3d',
        label,
      }))

    globe.polygonsData(locations).htmlElementsData(characters)
  }, [globe, nodes])

  return (
    <div className={cn(styles.overlay, !showWorldMap && styles.hidden)}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <i className="ti ti-world" />
          <span>Карта мира</span>
        </div>
        <button className={styles.x} onClick={() => setShowWorldMap(false)} title="Закрыть">
          <i className="ti ti-x" />
        </button>
      </div>
      <div ref={containerRef} className={styles.globeContainer} />
    </div>
  )
}
