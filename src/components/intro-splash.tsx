import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/**
 * The flat blue of intro-logo.mp4 — the sign-in film with its blueprint keyed out (every blue pixel replaced by this
 * colour, the silver and gold gear kept). Measured from the encoded file, so the film's edge never shows.
 */
export const INTRO_BLUE = '#0435C4'
/** How long the film plays before the app shows through: the gear turns, comes apart and starts to close. */
const HOLD_MS = 4500

/**
 * On launch: the same animation as on sign-in — the gear coming apart and back together like a watch — on flat blue
 * with no blueprint, KUDAIBERDI and «Всё для вашего авто» under it, then a soft fade into the app. Once per launch.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const { width } = useWindowDimensions()
	const filmH = width * (690 / 1086)
	const player = useVideoPlayer(require('../../assets/video/intro-logo.mp4'), (p) => {
		p.loop = false
		p.muted = true
		p.play()
	})
	const [words] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			Animated.timing(words, { toValue: 1, duration: reduce ? 0 : 700, delay: reduce ? 0 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: reduce ? 150 : 500, useNativeDriver: true }).start(() => onDone()),
				reduce ? 1200 : HOLD_MS
			)
		})
		return () => clearTimeout(timer)
	}, [words, fade, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100, backgroundColor: INTRO_BLUE }]}>
			<View style={{ flex: 1, justifyContent: 'center' }}>
				<View style={{ width, height: filmH }}>
					<VideoView player={player} nativeControls={false} contentFit="contain" style={StyleSheet.absoluteFill} />
				</View>
				<Animated.View
					style={{
						alignItems: 'center',
						gap: 4,
						marginTop: -filmH * 0.12,
						opacity: words,
						transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
					}}
				>
					<Text style={{ fontSize: fs.display, lineHeight: 36, fontFamily: fontFamily(800), letterSpacing: -0.5, color: fixed.white }}>KUDAIBERDI</Text>
					<Text style={{ fontSize: fs.lg, fontFamily: fontFamily(500), color: 'rgba(255,255,255,0.88)' }}>{t('Всё для вашего авто')}</Text>
				</Animated.View>
			</View>
		</Animated.View>
	)
}
