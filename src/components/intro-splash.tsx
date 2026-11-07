import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, useWindowDimensions } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs, useColors } from '@/theme'
import { t } from '@/i18n'

/** How long the card holds before the app shows through. */
const HOLD_MS = 2000

/**
 * On launch: the same brand card as on sign-in — the moving gear on the blue blueprint, KUDAIBERDI and
 * «Всё для вашего авто» over it — in the middle of the screen, then a soft fade into the app.
 * Once per launch; taps go through to the app underneath.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const c = useColors()
	const { width } = useWindowDimensions()
	const cardWidth = Math.min(width - 48, 420)
	const player = useVideoPlayer(require('../../assets/video/login-loop.mp4'), (p) => {
		p.loop = true
		p.muted = true
		p.play()
	})
	const [card] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			Animated.timing(card, { toValue: 1, duration: reduce ? 0 : 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: reduce ? 150 : 420, useNativeDriver: true }).start(() => onDone()),
				reduce ? 700 : HOLD_MS
			)
		})
		return () => clearTimeout(timer)
	}, [card, fade, onDone])

	return (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: fade, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }]}
		>
			<Animated.View
				style={{
					width: cardWidth,
					aspectRatio: 1086 / 690,
					borderRadius: 28,
					overflow: 'hidden',
					backgroundColor: fixed.brandCard,
					opacity: card,
					transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
				}}
			>
				<Image source={require('../../assets/video/login-poster.jpg')} style={StyleSheet.absoluteFill} />
				<VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />
				<Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center', gap: 2 }}>
					<Text style={{ fontSize: fs.display, lineHeight: 34, fontFamily: fontFamily(800), letterSpacing: -0.5, color: fixed.white }}>KUDAIBERDI</Text>
					<Text style={{ fontSize: fs.md, lineHeight: 21, fontFamily: fontFamily(500), color: 'rgba(255,255,255,0.85)' }}>{t('Всё для вашего авто')}</Text>
				</Animated.View>
			</Animated.View>
		</Animated.View>
	)
}
