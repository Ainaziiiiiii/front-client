import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { fixed, fontFamily, fs } from '@/theme'
import { getItem, setItem } from '@/lib/secure-storage'

/** The flat blue of intro-logo.mp4 — the native splash and the moment before the first frame. */
export const INTRO_BLUE = '#0435C4'
/** How long the film plays before the app shows through: the gear turns, comes apart and starts to close. */
const HOLD_MS = 4500
const NAME = 'KUDAIBERDI'
/** The line under the name — a different one each launch. Approved by the owner; in Russian on purpose. */
const TAGLINES = [
	'Запчасти ищем мы, а не вы',
	'Машина капризничает? Мы её уговорим',
	'Бегать по рынку больше не надо',
	'Обходить 500 контейнеров? Не, не слышали',
	'Машине — запчасть, вам — спокойствие',
	'Не плачь, машинка, мы здесь',
]
const LAST_TAGLINE = 'intro.lastTagline'

/** A random line, never the one shown last time. */
async function nextTagline() {
	const saved = await getItem(LAST_TAGLINE).catch(() => null)
	const last = saved === null ? -1 : Number(saved)
	const choices = TAGLINES.map((_, i) => i).filter((i) => i !== last)
	const pick = choices[Math.floor(Math.random() * choices.length)]
	setItem(LAST_TAGLINE, String(pick)).catch(() => {})
	return TAGLINES[pick]
}
/** In the film the gear sits at 40 % of the height; the name goes under it. */
const NAME_TOP = 0.53

/**
 * On launch: the sign-in animation — the gear coming apart and back together like a watch — with the blueprint keyed
 * out. The film is already portrait and full of its own flat blue, so it covers the screen and no frame or colour
 * step shows (a video's colours never match a view's exactly). KUDAIBERDI builds up letter by letter, the line under
 * it follows, then everything fades into the app. Once per launch.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const { height } = useWindowDimensions()
	const player = useVideoPlayer(require('../../assets/video/intro-logo.mp4'), (p) => {
		p.loop = false
		p.muted = true
		p.play()
	})
	const [letters] = useState(() => NAME.split('').map(() => new Animated.Value(0)))
	const [line] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))
	const [tagline, setTagline] = useState('')

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		nextTagline().then(setTagline)
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			if (reduce) {
				letters.forEach((v) => v.setValue(1))
				line.setValue(1)
			} else {
				Animated.sequence([
					Animated.delay(900),
					// the name builds up letter by letter, each one springing up into place
					Animated.stagger(
						55,
						letters.map((v) => Animated.spring(v, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }))
					),
					Animated.timing(line, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
				]).start()
			}
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: reduce ? 150 : 500, useNativeDriver: true }).start(() => onDone()),
				reduce ? 1200 : HOLD_MS
			)
		})
		return () => clearTimeout(timer)
	}, [letters, line, fade, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100, backgroundColor: INTRO_BLUE }]}>
			<VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />
			<View style={{ position: 'absolute', left: 0, right: 0, top: height * NAME_TOP, alignItems: 'center', gap: 8 }}>
				<View style={{ flexDirection: 'row' }}>
					{NAME.split('').map((ch, i) => (
						<Animated.Text
							key={i}
							style={{
								fontSize: fs.display,
								lineHeight: 38,
								fontFamily: fontFamily(800),
								letterSpacing: 1,
								color: fixed.white,
								opacity: letters[i],
								transform: [
									{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
									{ scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
								],
							}}
						>
							{ch}
						</Animated.Text>
					))}
				</View>
				<Animated.View
					style={{
						opacity: line,
						transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
					}}
				>
					<Text style={{ fontSize: fs.lg, fontFamily: fontFamily(500), letterSpacing: 0.3, color: 'rgba(255,255,255,0.9)' }}>
						{tagline}
					</Text>
				</Animated.View>
			</View>
		</Animated.View>
	)
}
