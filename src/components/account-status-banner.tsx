import { Pressable, Text, View } from 'react-native'
import { fontFamily, fs, useColors } from '@/theme'
import { t } from '@/i18n'

type Status = 'PENDING_VERIFICATION' | 'ACTIVE' | 'BLOCKED' | 'REJECTED'

/**
 * Why requests don't come [11, 21, 39]: on review / blocked / rejected by the administration, with the reason.
 * Rejected — the place was not confirmed: `action` («Выбрать другой контейнер», «Изменить профиль»).
 * A shop off the market has no place to confirm — rejected, it is fixed in the profile like a master.
 */
export function AccountStatusBanner({
	status,
	reason,
	kind,
	offMarket,
	action,
}: {
	status: Status | undefined
	reason: string | null | undefined
	kind: 'shop' | 'master'
	offMarket?: boolean
	action?: { label: string; onPress: () => void }
}) {
	const c = useColors()
	if (!status || status === 'ACTIVE') return null
	const bad = status === 'BLOCKED' || status === 'REJECTED'
	const what = kind === 'shop' ? t('Магазин') : t('Профиль')
	const place = kind === 'shop' && !offMarket
	const title =
		status === 'BLOCKED'
			? t('{0} заблокирован', what)
			: status === 'REJECTED'
				? place
					? t('Место не подтверждено')
					: kind === 'shop'
						? t('Магазин отклонён')
					: t('Профиль отклонён')
				: t('{0} на проверке', what)
	const text =
		reason ??
		(status === 'BLOCKED'
			? t('Запросы не приходят. Напишите в поддержку.')
			: status === 'REJECTED'
				? place
					? t('Администрация не подтвердила контейнер. Магазин скрыт — выберите контейнер заново.')
					: kind === 'shop'
						? t('Администрация не подтвердила магазин. Исправьте данные и сохраните.')
					: t('Администрация не подтвердила профиль. Исправьте данные и сохраните.')
				: place
					? t('Запросы начнут приходить, как только администрация подтвердит место.')
					: kind === 'shop'
						? t('Запросы начнут приходить, как только администрация подтвердит магазин.')
					: t('Заявки начнут приходить, как только администратор подтвердит профиль.'))

	return (
		<View style={{ borderRadius: 12, backgroundColor: bad ? c.dangerTint : c.brandTint, padding: 12, gap: 4 }}>
			<Text style={{ fontSize: fs.base, fontFamily: fontFamily(700), color: bad ? c.danger : c.brandStrong }}>{title}</Text>
			<Text style={{ fontSize: fs.sm, lineHeight: 20, fontFamily: fontFamily(400), color: c.inkSecondary }}>
				{reason && status === 'REJECTED' ? t('Причина: {0}', reason) : text}
			</Text>
			{action && status === 'REJECTED' ? (
				<Pressable onPress={action.onPress} hitSlop={8} style={{ paddingTop: 4 }}>
					<Text style={{ fontSize: fs.md, fontFamily: fontFamily(700), color: c.brandStrong }}>{action.label} ›</Text>
				</Pressable>
			) : null}
		</View>
	)
}
