import { Text, View } from 'react-native'
import { fontFamily, fs, useColors } from '@/theme'

/** Kyrgyz greeting by the time of day — said the same way whatever the app language is. */
export function greetingWord(now = new Date()) {
	const h = now.getHours()
	if (h >= 5 && h < 11) return 'Кутман таң'
	if (h >= 11 && h < 17) return 'Кутман күн'
	if (h >= 17 && h < 23) return 'Кутман кеч'
	return 'Саламатсызбы'
}

/** Home header: «Кутман таң, Айназик!», the car under it. */
export function Greeting({ name, subtitle }: { name?: string | null; subtitle: string }) {
	const c = useColors()
	const first = name?.trim().split(/\s+/)[0]
	return (
		<View style={{ flex: 1 }}>
			<View style={{ gap: 1 }}>
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
