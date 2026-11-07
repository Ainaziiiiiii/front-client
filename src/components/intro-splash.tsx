import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/** The blue of the sign-in film — the native splash uses the middle one. */
export const INTRO_BLUE = '#0636C4'
/** How long the logo plays before the app shows through. */
const HOLD_MS = 3500

/**
 * On launch: the sign-in film — the gear coming apart and back together like a watch — on a calm blue, its edges
 * melting into the background (no frame, no extra drawing), KUDAIBERDI and «Всё для вашего авто» under it, then a
 * soft fade into the app. Once per launch; taps go through to the app underneath.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const { width } = useWindowDimensions()
	// Wider than the screen, so the gear is big; the film's sides fall off the edges and fade out anyway.
	const filmW = width * 1.3
	const filmH = filmW * (690 / 1086)
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
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]}>
			{/* one flat blue: the film's soft edges fade into exactly this colour, so no band shows */}
			<View style={[StyleSheet.absoluteFill, { backgroundColor: INTRO_BLUE }]} />
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Animated.View style={{ width: filmW, height: filmH, opacity: film }}>
					{/* The poster first, so there is no black frame before the film starts. */}
					<Image source={require('../../assets/video/login-poster.jpg')} contentFit="cover" style={StyleSheet.absoluteFill} />
					<VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />
					{/* soft edges: the film melts into the plain blue on every side */}
					<LinearGradient colors={[INTRO_BLUE, 'rgba(6,54,196,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: filmH * 0.22 }} />
					<LinearGradient colors={['rgba(6,54,196,0)', INTRO_BLUE]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: filmH * 0.42 }} />
					<LinearGradient
						colors={[INTRO_BLUE, 'rgba(6,54,196,0)']}
						start={{ x: 0, y: 0.5 }}
						end={{ x: 1, y: 0.5 }}
						style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: filmW * 0.3 }}
					/>
					<LinearGradient
						colors={['rgba(6,54,196,0)', INTRO_BLUE]}
						start={{ x: 0, y: 0.5 }}
						end={{ x: 1, y: 0.5 }}
						style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: filmW * 0.3 }}
					/>
				</Animated.View>
				<Animated.View
					style={{
						marginTop: -filmH * 0.2,
						alignItems: 'center',
						gap: 4,
						opacity: words,
						transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
					}}
				>
					<Text style={{ fontSize: fs.display, lineHeight: 36, fontFamily: fontFamily(800), letterSpacing: -0.5, color: fixed.white }}>KUDAIBERDI</Text>
					<Text style={{ fontSize: fs.lg, fontFamily: fontFamily(500), color: 'rgba(255,255,255,0.88)' }}>{t('Всё для вашего авто')}</Text>
				</Animated.View>
			</View>
		</Animated.View>
	)
}
