import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson'
import { schemaToGeo } from '@/lib/geo'
import bundled from '@/data/market-map.json'
import { t } from '@/i18n'

// The market scheme (GET /market/map, or the bundled copy offline) → GeoJSON for MapLibre.
// Coordinates are scheme pixels (Y down) and go through the GPS calibration in lib/geo.

interface Rect {
	x: number
	y: number
	w: number
	h: number
}

/** The part of MapDto the map needs; the bundled file is converted to the same shape. */
export interface MarketScheme {
	version: number
	boundary: number[][]
	/** Non-row blocks: shops, admin, parking. */
	blocks: { kind: string; rect?: Rect; polygon?: number[][] }[]
	rows: {
		id: number
		code: string
		label: string
		type: string
		geometry: { rect?: Rect; polygon?: number[][] }
		/** Контейнеры с центром, углом оси ряда и длиной ячейки (есть только в схеме с сервера). */
		containers?: SchemeContainer[]
	}[]
	passages: { points: number[][]; width: number }[]
	entrances: { x: number; y: number; label: string }[]
}

export interface SchemeContainer {
	id: number
	number: number
	side: string
	x: number
	y: number
	angle: number
	length: number
	shop?: { shopId: number | null; name: string | null; avatarUrl: string | null } | null
}

/** Глубина контейнера на схеме: ~2,4 м при 0,25 м на единицу схемы. */
const CELL_DEPTH = 9.6

/** Прямоугольник ячейки контейнера в координатах схемы: длина вдоль оси ряда, глубина поперёк. */
function cellRing(cell: SchemeContainer): number[][] {
	const a = (cell.angle * Math.PI) / 180
	const ux = Math.cos(a)
	const uy = Math.sin(a)
	const hl = (Math.max(cell.length, 6) * 0.86) / 2
	const hd = CELL_DEPTH / 2
	return [
		[cell.x - ux * hl - uy * hd, cell.y - uy * hl + ux * hd],
		[cell.x + ux * hl - uy * hd, cell.y + uy * hl + ux * hd],
		[cell.x + ux * hl + uy * hd, cell.y + uy * hl - ux * hd],
		[cell.x - ux * hl + uy * hd, cell.y - uy * hl - ux * hd],
	]
}

/** Offline fallback: the bundled market-map.json in the server's shape (rows without server ids). */
export function bundledScheme(): MarketScheme {
	const rows: MarketScheme['rows'] = []
	const blocks: MarketScheme['blocks'] = []
	bundled.blocks.forEach((b, i) => {
		const rect = { x: b.x, y: b.y, w: b.w, h: b.h }
		if (b.kind === 'row' || b.kind === 'stall') {
			rows.push({ id: -(i + 1), code: b.label, label: b.label, type: b.kind === 'row' ? 'ROW' : 'STALL', geometry: { rect } })
		} else {
			blocks.push({ kind: b.kind, rect })
		}
	})
	rows.push({ id: -1001, code: t('З'), label: t('З'), type: 'VROW', geometry: { polygon: bundled.zone_Z_polygon } })
	rows.push({ id: -1002, code: t('А'), label: t('А'), type: 'VROW', geometry: { polygon: bundled.row_A_polygon } })
	return { version: 0, boundary: bundled.boundary, blocks, rows, passages: bundled.passages, entrances: bundled.entrances }
}

const toGeo = ([x, y]: number[]) => schemaToGeo(x, y)

function ring(geometry: { rect?: Rect; polygon?: number[][] }): number[][] {
	if (geometry.polygon) return geometry.polygon
	const r = geometry.rect!
	return [
		[r.x, r.y],
		[r.x + r.w, r.y],
		[r.x + r.w, r.y + r.h],
		[r.x, r.y + r.h],
	]
}

function centerOf(points: number[][]): [number, number] {
	const xs = points.map(([x]) => x)
	const ys = points.map(([, y]) => y)
	return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

function polygon(points: number[][], properties: Record<string, unknown>): Feature<Polygon> {
	return { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [[...points, points[0]].map(toGeo)] } }
}

/** Row label on the map: «Ряд 14», «Жайма 1»; vertical rows by their letter. */
const mapLabel = (row: MarketScheme['rows'][number]) => (row.type === 'VROW' ? row.code : row.label)

export interface MarketGeo {
	boundary: FeatureCollection<Polygon>
	passages: FeatureCollection<LineString>
	/** Rows and other blocks; rows carry `rowId`, `hl` (highlighted) and `muted` (another row is). */
	blocks: FeatureCollection<Polygon>
	labels: FeatureCollection<Point>
	entrances: FeatureCollection<Point>
	/** Ячейки контейнеров: `containerId`, `number`, `shop` (есть продавец), `shopId`, `shopName`, `target`, `hl` (фильтр). */
	cells: FeatureCollection<Polygon>
	/** Номера и названия магазинов в центрах ячеек — те же свойства. */
	cellLabels: FeatureCollection<Point>
	/** Нужный контейнер: точка для метки «вам сюда» (пусто, если не задан). */
	target: FeatureCollection<Point>
	center: [number, number]
	/** [lon, lat] of a row's centre — to fly the camera there. */
	rowCenter: (rowId: number) => [number, number] | null
}

export function buildMarketGeo(
	scheme: MarketScheme,
	highlightedRowIds: number[] = [],
	targetContainerId?: number,
	highlightedContainerIds: number[] = [],
): MarketGeo {
	const highlightedCells = new Set(highlightedContainerIds)
	const highlighted = new Set(highlightedRowIds)
	const active = highlighted.size > 0
	const kindOf = (type: string) => (type === 'VROW' ? 'vrow' : type === 'STALL' ? 'stall' : 'row')

	const rowFeatures = scheme.rows.map((row) =>
		polygon(ring(row.geometry), {
			rowId: row.id,
			label: mapLabel(row),
			kind: kindOf(row.type),
			hl: highlighted.has(row.id),
			muted: active && !highlighted.has(row.id),
		})
	)
	const otherFeatures = scheme.blocks.map((block) => polygon(ring(block), { kind: block.kind, hl: false, muted: false }))

	const centers = new Map(scheme.rows.map((row) => [row.id, centerOf(ring(row.geometry))]))

	const cells: Feature<Polygon>[] = []
	const cellLabels: Feature<Point>[] = []
	const target: Feature<Point>[] = []
	for (const row of scheme.rows) {
		for (const cell of row.containers ?? []) {
			const properties = {
				containerId: cell.id,
				number: String(cell.number),
				shop: Boolean(cell.shop?.shopId),
				shopId: cell.shop?.shopId ?? 0,
				shopName: cell.shop?.name ?? '',
				target: cell.id === targetContainerId,
				hl: highlightedCells.has(cell.id),
				caption: row.type === 'STALL' ? t('{0} · конт. {1}', row.label, cell.number) : t('Ряд {0} · конт. {1}', row.code, cell.number),
			}
			cells.push(polygon(cellRing(cell), properties))
			const point: Feature<Point> = { type: 'Feature', properties, geometry: { type: 'Point', coordinates: toGeo([cell.x, cell.y]) } }
			cellLabels.push(point)
			if (properties.target) target.push(point)
		}
	}

	return {
		boundary: { type: 'FeatureCollection', features: [polygon(scheme.boundary, { kind: 'boundary' })] },
		passages: {
			type: 'FeatureCollection',
			features: scheme.passages.map((passage, index) => ({
				type: 'Feature',
				properties: { index, width: passage.width },
				geometry: { type: 'LineString', coordinates: passage.points.map(toGeo) },
			})),
		},
		blocks: { type: 'FeatureCollection', features: [...otherFeatures, ...rowFeatures] },
		labels: {
			type: 'FeatureCollection',
			features: scheme.rows.map((row) => ({
				type: 'Feature',
				properties: { label: mapLabel(row), hl: highlighted.has(row.id) },
				geometry: { type: 'Point', coordinates: toGeo(centers.get(row.id)!) },
			})),
		},
		entrances: {
			type: 'FeatureCollection',
			features: scheme.entrances.map((entrance) => ({
				type: 'Feature',
				properties: { label: entrance.label },
				geometry: { type: 'Point', coordinates: schemaToGeo(entrance.x, entrance.y) },
			})),
		},
		cells: { type: 'FeatureCollection', features: cells },
		cellLabels: { type: 'FeatureCollection', features: cellLabels },
		target: { type: 'FeatureCollection', features: target },
		center: toGeo(centerOf(scheme.boundary)),
		rowCenter: (rowId) => {
			const center = centers.get(rowId)
			return center ? toGeo(center) : null
		},
	}
}

/** A route polyline (scheme pixels) → GeoJSON line. */
export function routeToGeoJSON(points: number[][]): FeatureCollection<LineString> {
	return {
		type: 'FeatureCollection',
		features: points.length
			? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(toGeo) } }]
			: [],
	}
}
