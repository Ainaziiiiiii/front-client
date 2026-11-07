import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/** The blue of the sign-in film — the native splash uses it too. */
export const INTRO_BLUE = '#0636C4'
/** How long the logo holds before the app shows through. */
const HOLD_MS = 3500
const GEAR = 176

/**
 * On launch: the KUDAIBERDI gear (the crisp transparent mark, not the film — the film has its blueprint baked in)
 * winds up on flat blue — it turns in, overshoots a little and clicks into place like a mechanism — then
 * KUDAIBERDI and «Всё для вашего авто» rise under it and everything fades into the app. Once per launch.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const [wind] = useState(() => new Animated.Value(0))
	const [words] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			if (reduce) {
				wind.setValue(1)
				words.setValue(1)
			} else {
				Animated.sequence([
					// wind up: a long turn that slows down…
					Animated.timing(wind, { toValue: 0.9, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
					// …and the click into place
					Animated.spring(wind, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
				]).start()
				Animated.timing(words, { toValue: 1, duration: 700, delay: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
			}
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: reduce ? 150 : 500, useNativeDriver: true }).start(() => onDone()),
				reduce ? 1200 : HOLD_MS
			)
		})
		return () => clearTimeout(timer)
	}, [wind, words, fade, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100, backgroundColor: INTRO_BLUE }]}>
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
				<Animated.View
					style={{
						opacity: wind.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
						transform: [
							{ scale: wind.interpolate({ inputRange: [0, 0.9, 1], outputRange: [0.5, 1.04, 1] }) },
							{ rotate: wind.interpolate({ inputRange: [0, 0.9, 1], outputRange: ['-300deg', '6deg', '0deg'] }) },
						],
					}}
				>
					<Image source={require('../../assets/images/logo-mark.png')} style={{ width: GEAR, height: GEAR }} />
				</Animated.View>
				<Animated.View
					style={{
						alignItems: 'center',
						gap: 4,
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
