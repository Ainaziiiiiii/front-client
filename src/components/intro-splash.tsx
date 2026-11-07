import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, G, Line } from 'react-native-svg'
import { Image } from '@/components/ui/image'
import { fixed, fontFamily, fs } from '@/theme'
import { t } from '@/i18n'

/** The blue of the sign-in film — the native splash uses the middle one. */
export const INTRO_BLUE = '#0636C4'
const BLUE_TOP = '#2455DD'
const BLUE_LOW = '#00229C'
/** How long the logo holds before the app shows through. */
const HOLD_MS = 2000
const GRID = 44

/** The blueprint of the sign-in film, full screen: a fine grid and drafting circles with dashed cross-hairs. */
function Blueprint({ width, height }: { width: number; height: number }) {
	const line = 'rgba(255,255,255,0.13)'
	const draft = 'rgba(255,255,255,0.32)'
	const cols = Math.ceil(width / GRID)
	const rows = Math.ceil(height / GRID)
	const circles = [
		{ cx: width * 1.02, cy: height * 0.2, r: width * 0.42, inner: width * 0.26 },
		{ cx: -width * 0.08, cy: height * 0.72, r: width * 0.4, inner: width * 0.2 },
		{ cx: width * 0.5, cy: -height * 0.04, r: width * 0.22, inner: 0 },
	]
	return (
		<Svg width={width} height={height} style={StyleSheet.absoluteFill}>
			{Array.from({ length: cols }, (_, i) => (
				<Line key={`v${i}`} x1={i * GRID} y1={0} x2={i * GRID} y2={height} stroke={line} strokeWidth={1} />
			))}
			{Array.from({ length: rows }, (_, i) => (
				<Line key={`h${i}`} x1={0} y1={i * GRID} x2={width} y2={i * GRID} stroke={line} strokeWidth={1} />
			))}
			{circles.map((k, i) => (
				<G key={i}>
					<Circle cx={k.cx} cy={k.cy} r={k.r} stroke={draft} strokeWidth={1.5} fill="none" />
					{k.inner ? <Circle cx={k.cx} cy={k.cy} r={k.inner} stroke={draft} strokeWidth={1.5} fill="none" /> : null}
					<Line x1={k.cx - k.r - 24} y1={k.cy} x2={k.cx + k.r + 24} y2={k.cy} stroke={draft} strokeWidth={1.5} strokeDasharray="10 8" />
					<Line x1={k.cx} y1={k.cy - k.r - 24} x2={k.cx} y2={k.cy + k.r + 24} stroke={draft} strokeWidth={1.5} strokeDasharray="10 8" />
				</G>
			))}
		</Svg>
	)
}

/**
 * On launch: the sign-in film's blue blueprint over the whole screen, the KUDAIBERDI gear turning into place in the
 * middle, the name and «Всё для вашего авто» under it, then a soft fade into the app. Once per launch; taps go through.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
	const { width, height } = useWindowDimensions()
	const [gear] = useState(() => new Animated.Value(0))
	const [words] = useState(() => new Animated.Value(0))
	const [fade] = useState(() => new Animated.Value(1))

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
			const ms = (n: number) => (reduce ? 0 : n)
			Animated.parallel([
				Animated.timing(gear, { toValue: 1, duration: ms(1000), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
				Animated.timing(words, { toValue: 1, duration: ms(600), delay: ms(550), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
			]).start()
			timer = setTimeout(
				() => Animated.timing(fade, { toValue: 0, duration: ms(420) || 150, useNativeDriver: true }).start(() => onDone()),
				reduce ? 700 : HOLD_MS
			)
		})
		return () => clearTimeout(timer)
	}, [gear, words, fade, onDone])

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]}>
			<LinearGradient colors={[BLUE_TOP, INTRO_BLUE, BLUE_LOW]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
			<Blueprint width={width} height={height} />
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
				<Animated.View
					style={{
						opacity: gear.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
						transform: [
							{ scale: gear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
							{ rotate: gear.interpolate({ inputRange: [0, 1], outputRange: ['-140deg', '0deg'] }) },
						],
					}}
				>
					<Image source={require('../../assets/images/logo-mark.png')} style={{ width: 168, height: 168 }} />
				</Animated.View>
				<Animated.View
					style={{
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
