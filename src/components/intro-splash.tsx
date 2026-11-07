import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/** The blue of the logo film at its edges — the film fades into it, so no frame is visible. */
const TOP = '#1A4BD8'
const MID = '#0636C4'
const BOTTOM = '#00229C'
/** How long the logo plays before the app shows through. */
const SHOW_MS = 2300

/**
 * On launch: the moving KUDAIBERDI gear in the middle, the name and «Всё для вашего авто» under it, then a soft
 * fade into the app. Shown once per launch; taps go through to the app underneath.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const { width } = useWindowDimensions()
	const film = width * (690 / 1086)
	const player = useVideoPlayer(require('../../assets/video/login-loop.mp4'), (p) => {
		p.loop = true
		p.muted = true
		p.play()
	})
	const [fade] = useState(() => new Animated.Value(1))
	const [words] = useState(() => new Animated.Value(0))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			Animated.timing(words, { toValue: 1, duration: reduce ? 0 : 600, delay: reduce ? 0 : 450, useNativeDriver: true }).start()
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: reduce ? 150 : 450, useNativeDriver: true }).start(() => onDone()),
				reduce ? 900 : SHOW_MS
			)
		})
		return () => clearTimeout(timer)
	}, [fade, words, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]}>
			<LinearGradient colors={[TOP, MID, BOTTOM]} style={StyleSheet.absoluteFill} />
			<View style={{ flex: 1, justifyContent: 'center' }}>
				<View style={{ width, height: film }}>
					{/* The poster first, so there is no black frame before the film starts. */}
					<Image source={require('../../assets/video/login-poster.jpg')} contentFit="cover" style={StyleSheet.absoluteFill} />
					<VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />
					<LinearGradient colors={[MID, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: film * 0.14 }} />
					<LinearGradient colors={['transparent', BOTTOM]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: film * 0.3 }} />
					<Animated.View
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: film * 0.06,
							alignItems: 'center',
							gap: 4,
							opacity: words,
							transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
						}}
					>
						<Text style={{ fontSize: fs.display, lineHeight: 36, fontFamily: fontFamily(800), letterSpacing: 1, color: fixed.white }}>KUDAIBERDI</Text>
						<Text style={{ fontSize: fs.lg, fontFamily: fontFamily(500), color: 'rgba(255,255,255,0.88)' }}>{t('Всё для вашего авто')}</Text>
					</Animated.View>
				</View>
			</View>
		</Animated.View>
	)
}
