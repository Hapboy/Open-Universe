import { useEffect, useRef, useState } from "react";
import cn from "classnames";
import type { GlobeInstance } from "globe.gl";
import * as THREE from "three";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import type { WGS84Coordinates } from "@/types.ts";
import type { CharacterNodeParams } from "@/schemas/entities/character.schema.ts";
import type { LocationNodeParams } from "@/schemas/entities/location.schema.ts";
import styles from "@/ui/WorldMap/WorldMap.module.css";

const EARTH_RADIUS_KM = 6371;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface LocationRingDatum {
    label: string;
    geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

type MarkerDatum =
    | { kind: "character"; lat: number; lng: number; color: string; label: string }
    | { kind: "location"; lat: number; lng: number; label: string };

function hasCoords(c: WGS84Coordinates | undefined): c is { lat: number; lon: number } {
    return !!c && c.lat != null && c.lon != null;
}

// globe.gl types per-datum callbacks as `(obj: object) => T` (its data arrays
// are untyped `object[]`), so strict function-type variance rejects our
// concretely-typed callbacks even though the shapes match at runtime — this
// narrows the parameter back without a broad `any`.
function accessor<In, Out>(fn: (d: In) => Out): (d: object) => Out {
    return fn as (d: object) => Out;
}

// Ring of [lng, lat] points (GeoJSON order) at a given great-circle distance
// from a center, used to render a location's real-world radius as a polygon.
function circleRing(lat: number, lon: number, radiusKm: number, segments = 64): [number, number][] {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const angular = radiusKm / EARTH_RADIUS_KM;
    const ring: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
        const bearing = (i / segments) * 2 * Math.PI;
        const destLat = Math.asin(
            Math.sin(latRad) * Math.cos(angular) +
                Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
        );
        const destLon =
            lonRad +
            Math.atan2(
                Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
                Math.cos(angular) - Math.sin(latRad) * Math.sin(destLat),
            );
        ring.push([(destLon * 180) / Math.PI, (destLat * 180) / Math.PI]);
    }
    return ring;
}

function buildMarkerEl(d: MarkerDatum): HTMLElement {
    const el = document.createElement("div");
    el.title = d.label;

    const labelEl = document.createElement("span");
    labelEl.className = styles.markerLabel;
    labelEl.textContent = d.label;

    if (d.kind === "character") {
        el.className = styles.characterMarker;
        el.innerHTML = `
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle class="${styles.pulseRing}" cx="16" cy="16" r="5" fill="none" stroke="${d.color}" stroke-width="2" />
        <circle cx="16" cy="16" r="5" fill="${d.color}" />
      </svg>
    `;
    } else {
        el.className = styles.locationMarker;
    }
    el.appendChild(labelEl);

    return el;
}

export function WorldMap() {
    const { nodes, showWorldMap, setShowWorldMap, worldMapFullscreen, setWorldMapFullscreen } =
        useGraphContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [globe, setGlobe] = useState<GlobeInstance | null>(null);

    // Always reopen in the 50/50 split, regardless of how the panel was
    // previously closed (× button or the Timeline toggle button).
    useEffect(() => {
        if (!showWorldMap) setWorldMapFullscreen(false);
    }, [showWorldMap, setWorldMapFullscreen]);

    // Lazy-init on first open; kept alive across later toggles so the texture
    // and WebGL scene are never reloaded/rebuilt.
    useEffect(() => {
        if (!showWorldMap || globe || !containerRef.current) return;
        let cancelled = false;
        import("globe.gl").then(({ default: Globe }) => {
            if (cancelled || !containerRef.current) return;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
            sunLight.position.set(-1, 0.5, 1);

            const instance = new Globe(containerRef.current)
                .backgroundColor("rgba(0,0,0,0)")
                .showAtmosphere(true)
                .atmosphereColor("#4da6ff")
                .atmosphereAltitude(0.2)
                .lights([ambientLight, sunLight])
                // three-globe's own .d.ts declares GeoJsonGeometry.coordinates as a flat
                // `number[]`, which no real GeoJSON geometry (Polygon, MultiPolygon, ...)
                // actually has — it's an upstream typing bug, and the type isn't even
                // exported publicly so we can't align with it by name. Cast past it.
                .polygonGeoJsonGeometry(
                    accessor(
                        (d: LocationRingDatum) =>
                            d.geometry as unknown as { type: string; coordinates: number[] },
                    ),
                )
                .polygonCapColor(() => "rgba(255,138,61,0.35)")
                .polygonSideColor(() => "rgba(255,138,61,0.15)")
                .polygonStrokeColor(() => "#ff8a3d")
                .polygonAltitude(0.005)
                .polygonLabel(accessor((d: LocationRingDatum) => d.label))
                .htmlLat(accessor((d: MarkerDatum) => d.lat))
                .htmlLng(accessor((d: MarkerDatum) => d.lng))
                .htmlElement(accessor((d: MarkerDatum) => buildMarkerEl(d)))
                .pointOfView({ lat: 20, lng: 45, altitude: 2.5 });

            // Real satellite imagery via Mapbox tiles when a token is configured;
            // otherwise fall back to the bundled static texture so the globe still
            // renders (globeTileEngineUrl/globeImageUrl are alternate rendering
            // paths — only one is active at a time).
            if (MAPBOX_TOKEN) {
                instance
                    .globeTileEngineUrl(
                        (x: number, y: number, l: number) =>
                            `https://api.mapbox.com/v4/mapbox.satellite/${l}/${x}/${y}.jpg90?access_token=${MAPBOX_TOKEN}`,
                    )
                    .globeTileEngineMaxLevel(19);
            } else {
                instance.globeImageUrl("/assets/textures/earth-blue-marble.jpg");
            }

            // Lower shininess/specular so the surface reads as matte rock/water
            // instead of the default glossy plastic look.
            const material = instance.globeMaterial() as THREE.MeshPhongMaterial;
            material.shininess = 6;
            material.specular = new THREE.Color(0x111111);

            // `instance` is a kapsule chainable *function* — pass it via an updater
            // so React stores it as the value instead of calling it as `fn(prevState)`.
            setGlobe(() => instance);
        }, console.error);
        return () => {
            cancelled = true;
        };
    }, [showWorldMap, globe]);

    // globe.gl/three-render-objects has no built-in container-resize tracking —
    // its width/height default to (and stay pinned at) window.innerWidth/
    // innerHeight unless told otherwise, which only looked correct before
    // because the panel used to be a fixed full-viewport overlay. Now that
    // it's a partial-width pane, the renderer must be explicitly kept in
    // sync with its actual container size (initial split width, fullscreen
    // toggle, window resize, ...).
    useEffect(() => {
        if (!globe || !containerRef.current) return;
        const el = containerRef.current;
        const applySize = () => globe.width(el.clientWidth).height(el.clientHeight);
        applySize();
        const observer = new ResizeObserver(applySize);
        observer.observe(el);
        return () => observer.disconnect();
    }, [globe]);

    // Push the active scene's characters/locations whenever either changes.
    // `nodes` already reflects only the active scene's graph (GraphContext
    // swaps it on activeSceneId change), so no extra scene filtering is needed.
    useEffect(() => {
        if (!globe) return;

        const locationNodes = nodes
            .filter((n) => n.data.nodeType === "location")
            .map((n) => ({ label: n.data.label, params: n.data.params as LocationNodeParams }))
            .filter(({ params }) => hasCoords(params.coordinates));

        const locations: LocationRingDatum[] = locationNodes.map(({ label, params: p }) => ({
            label,
            geometry: {
                type: "Polygon",
                coordinates: [circleRing(p.coordinates.lat!, p.coordinates.lon!, p.radiusKm || 5)],
            },
        }));

        const characters = nodes
            .filter((n) => n.data.nodeType === "character")
            .map((n) => ({
                color: n.data.color,
                label: n.data.label,
                params: n.data.params as CharacterNodeParams,
            }))
            .filter(({ params }) => hasCoords(params.currentPosition));

        const markers: MarkerDatum[] = [
            ...characters.map(({ color, label, params }) => ({
                kind: "character" as const,
                lat: params.currentPosition.lat!,
                lng: params.currentPosition.lon!,
                color: color || "#ff8a3d",
                label: params.name?.trim() || label,
            })),
            ...locationNodes.map(({ label, params: p }) => ({
                kind: "location" as const,
                lat: p.coordinates.lat!,
                lng: p.coordinates.lon!,
                label,
            })),
        ];

        globe.polygonsData(locations).htmlElementsData(markers);
    }, [globe, nodes]);

    return (
        <div
            className={cn(
                styles.overlay,
                worldMapFullscreen && styles.fullscreen,
                !showWorldMap && styles.hidden,
            )}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <i className="ti ti-world" />
                    <span>Карта мира</span>
                    <span className={styles.mapboxStatus}>
                        Mapbox: {MAPBOX_TOKEN ? "live" : "mock"}
                    </span>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.fullscreenBtn}
                        onClick={() => setWorldMapFullscreen(!worldMapFullscreen)}
                        title={
                            worldMapFullscreen ? "Свернуть до половины экрана" : "На весь экран"
                        }>
                        <i
                            className={
                                worldMapFullscreen
                                    ? "ti ti-arrows-minimize"
                                    : "ti ti-arrows-maximize"
                            }
                        />
                    </button>
                    <button
                        className={styles.x}
                        onClick={() => setShowWorldMap(false)}
                        title="Закрыть">
                        <i className="ti ti-x" />
                    </button>
                </div>
            </div>
            <div className={styles.globeContainer}>
                <div ref={containerRef} className={styles.globeMount} />
                {MAPBOX_TOKEN && (
                    <div className={styles.attribution}>
                        ©{" "}
                        <a
                            href="https://www.mapbox.com/about/maps/"
                            target="_blank"
                            rel="noreferrer">
                            Mapbox
                        </a>{" "}
                        ©{" "}
                        <a
                            href="https://www.openstreetmap.org/copyright"
                            target="_blank"
                            rel="noreferrer">
                            OpenStreetMap
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
