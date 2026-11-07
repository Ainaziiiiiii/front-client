import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, useWindowDimensions } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/** The blue of the sign-in film — the native splash uses it too. */
export const INTRO_BLUE = '#0636C4'
/** How long the logo plays before the app shows through. */
const HOLD_MS = 3500
/** Where the gear sits in the 1086 × 690 film: centre and the reach of its teeth, as parts of the film's width / height. */
const GEAR_X = 0.5
const GEAR_Y = 0.37
const GEAR_R = 0.18

/**
 * On launch: the sign-in film — the gear coming apart and back together like a watch — seen through a soft round
 * window on flat blue, so none of the film's blueprint shows; KUDAIBERDI and «Всё для вашего авто» under it, then a
 * soft fade into the app. Once per launch; taps go through to the app underneath.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const { width, height } = useWindowDimensions()
	const filmW = width * 1.3
	const filmH = filmW * (690 / 1086)
	const filmTop = (height - filmH) / 2 - filmH * (GEAR_Y - 0.5) - height * 0.06
	const gearCy = filmTop + filmH * GEAR_Y
	const reach = filmW * GEAR_R
	const player = useVideoPlayer(require('../../assets/video/login-loop.mp4'), (p) => {
		p.loop = true
		p.muted = true
		p.play()
	})
	const [film] = useState(() => new Animated.Value(0))
	const [words] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			const ms = (n: number) => (reduce ? 0 : n)
			Animated.parallel([
				Animated.timing(film, { toValue: 1, duration: ms(500), easing: Easing.out(Easing.quad), useNativeDriver: true }),
				Animated.timing(words, { toValue: 1, duration: ms(700), delay: ms(700), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
			]).start()
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: ms(500) || 150, useNativeDriver: true }).start(() => onDone()),
				reduce ? 1200 : HOLD_MS
			)
		})
		return () => clearTimeout(timer)
	}, [film, words, fade, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100, backgroundColor: INTRO_BLUE }]}>
			<Animated.View style={{ position: 'absolute', left: (width - filmW) / 2, top: filmTop, width: filmW, height: filmH, opacity: film }}>
				{/* The poster first, so there is no black frame before the film starts. */}
				<Image source={require('../../assets/video/login-poster.jpg')} contentFit="cover" style={StyleSheet.absoluteFill} />
				<VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />
				{/* A round window on the gear: everything past its teeth melts into the flat blue — no blueprint. */}
				<Svg width={filmW} height={filmH} style={StyleSheet.absoluteFill}>
					<Defs>
						<RadialGradient id="window" cx={filmW * GEAR_X} cy={filmH * GEAR_Y} r={reach * 1.3} gradientUnits="userSpaceOnUse">
							<Stop offset={0.74} stopColor={INTRO_BLUE} stopOpacity={0} />
							<Stop offset={0.92} stopColor={INTRO_BLUE} stopOpacity={0.85} />
							<Stop offset={1} stopColor={INTRO_BLUE} stopOpacity={1} />
						</RadialGradient>
					</Defs>
					<Rect x={0} y={0} width={filmW} height={filmH} fill="url(#window)" />
				</Svg>
			</Animated.View>
			<Animated.View
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: gearCy + reach * 1.2,
					alignItems: 'center',
					gap: 4,
					opacity: words,
					transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
				}}
			>
				<Text style={{ fontSize: fs.display, lineHeight: 36, fontFamily: fontFamily(800), letterSpacing: -0.5, color: fixed.white }}>KUDAIBERDI</Text>
				<Text style={{ fontSize: fs.lg, fontFamily: fontFamily(500), color: 'rgba(255,255,255,0.88)' }}>{t('Всё для вашего авто')}</Text>
			</Animated.View>
		</Animated.View>
	)
}
