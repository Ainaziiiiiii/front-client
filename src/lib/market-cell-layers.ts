// Слои контейнеров на карте рынка — общие для веба (maplibre-gl) и телефона (maplibre-react-native).
// Ячейки появляются при приближении, номера — ещё ближе, названия магазинов — у самого ряда.
// Нужный контейнер (target) виден всегда: жёлтая метка с номером поверх всего —
// жёлтый в приложении всегда значит «идти сюда» (fixed.plate, как табличка места).
import { fixed, raw } from '@/theme'

type Colors = { brand: string; brandTint: string; brandStrong: string; ink: string }

/** style-spec выражения: важен валидный JSON (см. Expr в market-map-maplibre). */
type Expr = any

export interface CellLayer {
	id: string
	source: 'market-cells' | 'market-cell-labels' | 'market-target'
	type: 'fill' | 'line' | 'symbol' | 'circle'
	minzoom?: number
	maxzoom?: number
	filter?: Expr
	layout?: Record<string, Expr>
	paint: Record<string, Expr>
}

/** С какого зума видны ячейки, номера и названия магазинов. */
export const CELL_ZOOM = 16.8
export const NUMBER_ZOOM = 18.2
export const SHOP_ZOOM = 19.2

const isTarget: Expr = ['==', ['get', 'target'], true]
const isShop: Expr = ['==', ['get', 'shop'], true]
/** Подсвечен фильтром («где продают Toyota»). */
const isHl: Expr = ['==', ['get', 'hl'], true]

/**
 * pulseScale — «дыхание» метки цели: 1…1.6 (анимация на карте), без анимации — 1.
 */
export function cellLayers(c: Colors, pulseScale = 1): CellLayer[] {
	return [
		{
			id: 'market-cell-fill',
			source: 'market-cells',
			type: 'fill',
			minzoom: CELL_ZOOM,
			paint: {
				'fill-color': ['case', isTarget, fixed.plate, isHl, c.brand, isShop, c.brandTint, fixed.white],
				'fill-opacity': ['interpolate', ['linear'], ['zoom'], CELL_ZOOM, 0, CELL_ZOOM + 0.5, 1],
			},
		},
		{
			id: 'market-cell-line',
			source: 'market-cells',
			type: 'line',
			minzoom: CELL_ZOOM,
			paint: {
				'line-color': ['case', isTarget, fixed.plateInk, isHl, c.brandStrong, isShop, c.brand, raw.mapRowBorder],
				'line-width': ['case', isTarget, 2.5, isHl, 1.6, isShop, 1.4, 0.8],
				'line-opacity': ['interpolate', ['linear'], ['zoom'], CELL_ZOOM, 0, CELL_ZOOM + 0.5, 1],
			},
		},
		{
			// контейнеры по фильтру видны и издалека — точками, пока ячеек ещё нет
			id: 'market-cell-hl-dot',
			source: 'market-cell-labels',
			type: 'circle',
			maxzoom: CELL_ZOOM + 0.5,
			filter: ['all', isHl, ['!', isTarget]],
			paint: {
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 4, CELL_ZOOM, 7],
				'circle-color': c.brand,
				'circle-stroke-color': fixed.white,
				'circle-stroke-width': 2,
			},
		},
		{
			id: 'market-cell-number',
			source: 'market-cell-labels',
			type: 'symbol',
			minzoom: NUMBER_ZOOM,
			filter: ['!', isTarget],
			layout: {
				'text-field': ['get', 'number'],
				'text-font': ['Noto Sans Regular'],
				'text-size': ['interpolate', ['linear'], ['zoom'], NUMBER_ZOOM, 9, 20, 14],
				'text-allow-overlap': false,
				'text-padding': 0,
			},
			paint: {
				'text-color': ['case', isHl, fixed.white, isShop, c.brandStrong, c.ink],
				'text-halo-color': ['case', isHl, c.brandStrong, fixed.white],
				'text-halo-width': 1,
			},
		},
		{
			id: 'market-cell-shop',
			source: 'market-cell-labels',
			type: 'symbol',
			minzoom: SHOP_ZOOM,
			filter: ['all', isShop, ['!', isTarget]],
			layout: {
				'text-field': ['get', 'shopName'],
				'text-font': ['Noto Sans Regular'],
				'text-size': 11,
				'text-offset': [0, 1.3],
				'text-max-width': 7,
				'text-optional': true,
			},
			paint: { 'text-color': c.brandStrong, 'text-halo-color': fixed.white, 'text-halo-width': 1.4 },
		},
		{
			id: 'market-target-halo',
			source: 'market-target',
			type: 'circle',
			paint: {
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 16 * pulseScale, 19, 34 * pulseScale],
				'circle-color': fixed.plate,
				'circle-opacity': 0.45 * (1.6 - pulseScale),
			},
		},
		{
			id: 'market-target-pin',
			source: 'market-target',
			type: 'circle',
			paint: {
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 11, 19, 18],
				'circle-color': fixed.plate,
				'circle-stroke-color': fixed.plateInk,
				'circle-stroke-width': 2.5,
			},
		},
		{
			id: 'market-target-number',
			source: 'market-target',
			type: 'symbol',
			layout: {
				'text-field': ['get', 'number'],
				'text-font': ['Noto Sans Regular'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 15, 11, 19, 16],
				'text-allow-overlap': true,
				'text-ignore-placement': true,
			},
			paint: { 'text-color': fixed.plateInk },
		},
		{
			id: 'market-target-caption',
			source: 'market-target',
			type: 'symbol',
			layout: {
				'text-field': ['get', 'caption'],
				'text-font': ['Noto Sans Regular'],
				'text-size': 13,
				'text-offset': [0, 2.2],
				'text-allow-overlap': true,
			},
			paint: { 'text-color': fixed.plateInk, 'text-halo-color': fixed.plate, 'text-halo-width': 3 },
		},
	]
}

/** Пульс метки цели: масштаб 1…1.6 по синусу, период ~1,6 с. */
export function pulseAt(ms: number) {
	return 1 + 0.3 * (1 + Math.sin((ms / 1600) * Math.PI * 2))
}
