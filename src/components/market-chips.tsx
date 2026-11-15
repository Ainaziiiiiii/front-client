import { Pressable, ScrollView, Text } from 'react-native'
import { useMarkets } from '@/api/market'
import { fontFamily, fs, useColors } from '@/theme'
import { t } from '@/i18n'

/** marketId of «Магазины и центры» — shops off the markets (the backend's PartSearch.NO_MARKET). */
export const OFF_MARKET = 0

/**
 * «Все рынки · Кудайберген · Дордой Моторс · Дордой · Геология · Магазины и центры» — the buyer picks where to look,
 * like the market sections of Тез Кызмат. null — everywhere.
 */
export function MarketChips({ value, onChange }: { value: number | null; onChange: (marketId: number | null) => void }) {
	const c = useColors()
	const markets = useMarkets().data ?? []
	// Until the list loads (or offline with nothing cached) there is nothing to choose from.
	if (!markets.length) return null
	const options = [
		{ id: null, name: t('Все рынки') },
		...markets.map((market) => ({ id: market.id as number | null, name: market.name })),
		{ id: OFF_MARKET, name: t('Магазины и центры') },
	]
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
			{options.map((option) => {
				const active = value === option.id
				return (
					<Pressable
						key={option.id ?? 'all'}
						onPress={() => onChange(option.id)}
						style={{
							height: 34,
							paddingHorizontal: 12,
							borderRadius: 17,
							backgroundColor: active ? c.ink : 'transparent',
							borderWidth: 1,
							borderColor: active ? c.ink : c.border,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Text style={{ fontSize: fs.sm, fontFamily: fontFamily(active ? 700 : 600), color: active ? c.surface : c.ink }}>{option.name}</Text>
					</Pressable>
				)
			})}
		</ScrollView>
	)
}
