import { Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { fontFamily, fs, useColors } from '@/theme'

/** Kyrgyz greeting by the time of day — said the same way whatever the app language is. */
export function greetingWord(now = new Date()) {
	const h = now.getHours()
	if (h >= 5 && h < 11) return 'Кутман таң'
	if (h >= 11 && h < 17) return 'Кутман күн'
	if (h >= 17 && h < 23) return 'Кутман кеч'
	return 'Саламатсызбы'
}

/** «Кочкор мүйүз» — the ram's-horn curl of Kyrgyz ornament, as a small mark. */
export function RamHorns({ size = 36, color }: { size?: number; color: string }) {
	const line = { stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
	return (
		<Svg width={size} height={size} viewBox="2 6 28 24" fill="none">
			<Path d="M16 25C16 17 12.5 9.5 7.8 9.6C4.2 9.7 3.6 15.2 7.4 15.6C10 15.9 10.9 12.9 9 12.2" {...line} />
			<Path d="M16 25C16 17 19.5 9.5 24.2 9.6C27.8 9.7 28.4 15.2 24.6 15.6C22 15.9 21.1 12.9 23 12.2" {...line} />
			<Path d="M12.5 28.2L16 25L19.5 28.2" {...line} />
		</Svg>
	)
}

/** Home header: «Кутман таң, Айназик!» with the ornament, the car (or a road wish) under it. */
export function Greeting({ name, subtitle }: { name?: string | null; subtitle: string }) {
	const c = useColors()
	const first = name?.trim().split(/\s+/)[0]
	return (
		<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
			<View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.brandTint, alignItems: 'center', justifyContent: 'center' }}>
				<RamHorns color={c.brandStrong} />
			</View>
			<View style={{ flex: 1, gap: 1 }}>
				<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, fontSize: fs.h3, lineHeight: 28, fontFamily: fontFamily(800), letterSpacing: -0.3, color: c.ink }}>
					{greetingWord()}
					{first ? <Text style={{ color: c.brandStrong }}>{`, ${first}`}</Text> : null}!
				</Text>
				<Text numberOfLines={1} style={{ fontSize: fs.md, fontFamily: fontFamily(500), color: c.muted }}>
					{subtitle}
				</Text>
			</View>
		</View>
	)
}
