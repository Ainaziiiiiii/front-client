import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/** Night blue — the same colour the native splash uses, so launch flows in without a flash. */
export const INTRO_BG = '#0B0F1A'
const INTRO_BG_LOW = '#131C36'
/** How long the logo holds before the app shows through. */
const HOLD_MS = 1500

/**
 * On launch: the KUDAIBERDI gear comes up out of the dark and turns into place, the name and «Всё для вашего авто»
 * rise under it, then everything fades into the app. Once per launch; taps go through to the app underneath.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const [gear] = useState(() => new Animated.Value(0))
	const [words] = useState(() => new Animated.Value(0))
	const [glow] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			const ms = (n: number) => (reduce ? 0 : n)
			Animated.parallel([
				Animated.timing(gear, { toValue: 1, duration: ms(900), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
				Animated.timing(glow, { toValue: 1, duration: ms(1200), easing: Easing.out(Easing.quad), useNativeDriver: true }),
				Animated.timing(words, { toValue: 1, duration: ms(600), delay: ms(550), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
			]).start()
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: ms(420) || 150, useNativeDriver: true }).start(() => onDone()),
				reduce ? 700 : HOLD_MS + 600
			)
		})
		return () => clearTimeout(timer)
	}, [gear, words, glow, fade, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]}>
			<LinearGradient colors={[INTRO_BG, INTRO_BG, INTRO_BG_LOW]} style={StyleSheet.absoluteFill} />
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
				<View style={{ width: 168, height: 168, alignItems: 'center', justifyContent: 'center' }}>
					{/* the brand glow swells behind the gear */}
					<Animated.View
						style={{
							position: 'absolute',
							width: 300,
							height: 300,
							opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
							transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
						}}
					>
						<Image source={require('../../assets/images/logo-glow.png')} style={{ width: 300, height: 300 }} />
					</Animated.View>
					<Animated.View
						style={{
							opacity: gear.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
							transform: [
								{ scale: gear.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
								{ rotate: gear.interpolate({ inputRange: [0, 1], outputRange: ['-120deg', '0deg'] }) },
							],
						}}
					>
						<Image source={require('../../assets/images/logo-mark.png')} style={{ width: 150, height: 150 }} />
					</Animated.View>
				</View>
				<Animated.View
					style={{
						alignItems: 'center',
						gap: 8,
						opacity: words,
						transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
					}}
				>
					<Text style={{ fontSize: fs.h2, fontFamily: fontFamily(800), letterSpacing: 6, color: fixed.white }}>KUDAIBERDI</Text>
					<Text style={{ fontSize: fs.lg, fontFamily: fontFamily(500), letterSpacing: 0.3, color: 'rgba(255,255,255,0.7)' }}>{t('Всё для вашего авто')}</Text>
				</Animated.View>
			</View>
		</Animated.View>
	)
}
