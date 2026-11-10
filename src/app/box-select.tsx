import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { askForPushAt } from '@/lib/push'
import { BottomSheet, BrandLogo, Button, QueryErrorBanner, ScreenHeader, toast } from '@/components/ui'
import { BrandTile, Label, PlusIcon, TickIcon } from '@/components/seller-v23'
import { LocateIcon, SearchIcon } from '@/components/icons'
import { addressAt, currentCoords } from '@/lib/locate'
import { fixed, fontFamily, fs, useColors } from '@/theme'
import { type Side, useAddContainer, useRowContainers, useRows } from '@/api/market'
import { SelectField, SelectSheet } from '@/components/select-sheet'
import { useBrands } from '@/api/directory'
import { useMyShop, useRegisterShop, useRelocateShop } from '@/api/shop'
import { useSession } from '@/store/useSession'
import { useClaimContainer } from '@/api/complaints'
import { ApiError } from '@/lib/api'
import type { Brand } from '@/api/types'
import { t } from '@/i18n'
import { KEYBOARD_DONE } from '@/components/keyboard-done'

/** Rows in the order of the mockup grid [11]; rows the mockup doesn't know go after them. */
const ROW_ORDER = ['19', '18', '17', '16', '15', '14', '13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '1', t('К'), t('Ц'), t('Л'), t('Н'), t('Я'), t('С'), t('Ж'), t('Д'), t('В'), t('Ю'), t('Х'), t('У')]
/** The row picked as «моего ряда нет в списке». */
const MANUAL = -1
/** The container picked as «моего контейнера нет в списке». */
const ADD = -1
const SIDE_NAMES: Record<Side, string> = {
	NORTH: t('Северная сторона'),
	SOUTH: t('Южная сторона'),
	WEST: t('Западная сторона'),
	EAST: t('Восточная сторона'),
}
/** Brand tiles before «Другие» — as in the mockup. */
const TILES = 5

/**
 * 11 «Где вы продаёте» — registration in one minute: on the Кудайберген market (row, container number) or a shop /
 * centre elsewhere (name, address, the point by geolocation), then brands → POST /shops.
 * With a shop already — moving to another container (brands are changed in «Мой бокс»).
 */
export default function BoxSelectScreen() {
	const c = useColors()
	const insets = useSafeAreaInsets()
	const hasShop = useSession((s) => s.hasShop)
	const shop = useMyShop()
	const rows = useRows()
	const brands = useBrands()
	const register = useRegisterShop()
	const relocate = useRelocateShop()
	const addContainer = useAddContainer()

	const current = shop.data?.location
	const [rowId, setRowId] = useState<number | null>(null)
	const [number, setNumber] = useState('')
	// The container picked from the list, or ADD — not in the list, typed.
	const [boxId, setBoxId] = useState<number | null>(null)
	const adding = boxId === ADD
	const [side, setSide] = useState<Side | null>(null)
	const [manualRow, setManualRow] = useState('')
	const [sheet, setSheet] = useState<'row' | 'box' | null>(null)
	const [picked, setPicked] = useState<number[]>([])
	const [othersOpen, setOthersOpen] = useState(false)
	// «Это мой контейнер» — a taken box that is actually yours.
	const [claim, setClaim] = useState<{ id: number; number: number } | null>(null)
	// A seller off the market (a Kia / Toyota centre…): name, address and the point.
	const [onMarket, setOnMarket] = useState(true)
	const store = !hasShop && !onMarket
	const [name, setName] = useState('')
	const [address, setAddress] = useState('')
	const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
	const [locating, setLocating] = useState(false)
	const [locateError, setLocateError] = useState<string | null>(null)

	const locate = async () => {
		setLocating(true)
		setLocateError(null)
		try {
			if (!(await Location.requestForegroundPermissionsAsync()).granted) {
				setLocateError(t('Разрешите доступ к геолокации в настройках'))
				return
			}
			const coords = await currentCoords()
			setPoint({ lat: coords.latitude, lng: coords.longitude })
			if (!address.trim()) {
				const address = await addressAt(coords)
				if (address) setAddress(address)
			}
		} catch {
			setLocateError(t('Не удалось определить место — попробуйте ещё раз'))
		} finally {
			setLocating(false)
		}
	}

	const sortedRows = useMemo(() => {
		const rank = (code: string) => (ROW_ORDER.includes(code) ? ROW_ORDER.indexOf(code) : ROW_ORDER.length)
		return [...(rows.data ?? [])].sort((a, b) => rank(a.code) - rank(b.code))
	}, [rows.data])
	// MANUAL — «моего ряда нет в списке»: the row and the number are typed, the place is kept as text.
	const manual = !hasShop && rowId === MANUAL
	const activeRowId = manual ? null : (rowId ?? current?.rowId ?? null)
	const row = sortedRows.find((r) => r.id === activeRowId)
	const detail = useRowContainers(activeRowId ?? 0)

	// Containers of the row in one list; the side is named only when the row has two of them.
	const sides = (detail.data?.sides ?? []).filter((item) => item.containers.length > 0)
	const twoSides = sides.length > 1
	const boxes = sides.flatMap((item) => item.containers.map((box) => ({ ...box, side: item.side })))
	const sideName = (side: Side) => SIDE_NAMES[side]
	const boxLabel = (box: { number: number; side: Side }) =>
		twoSides ? t('Контейнер {0} · {1}', box.number, sideName(box.side)) : t('Контейнер {0}', box.number)

	// A box that is not in the list yet: its number (and the side, when the row has two).
	const typed = Number(number)
	const newSide: Side | undefined = twoSides ? (side ?? undefined) : undefined
	const sameBox = adding && number ? boxes.find((box) => box.number === typed && (!twoSides || box.side === newSide)) : undefined
	const slot = adding ? sameBox : boxes.find((box) => box.id === boxId)
	const taken = slot ? slot.occupied && slot.id !== current?.containerId : false
	const placeError = taken && slot ? t('Контейнер {0} уже занят другим продавцом', slot.number) : null
	const addReady = adding && typed > 0 && (!twoSides || Boolean(newSide))

	const all = brands.data ?? []
	const popular = all.filter((b) => b.popular).slice(0, TILES)
	// Brands picked in «Другие» show up as tiles too.
	const tiles = [...popular, ...all.filter((b) => picked.includes(b.id) && !popular.some((p) => p.id === b.id))]
	const toggle = (id: number) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

	const ready = store
		? Boolean(name.trim() && address.trim() && point && picked.length > 0)
		: manual
			? Boolean(manualRow.trim() && typed > 0 && picked.length > 0)
			: Boolean((slot ? !taken : addReady) && (hasShop || picked.length > 0))
	const error = register.error ?? relocate.error ?? addContainer.error
	const field = {
		height: 52,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: c.border,
		backgroundColor: c.card,
		paddingHorizontal: 16,
		fontSize: fs.lg,
		fontFamily: fontFamily(500),
		color: c.ink,
	} as const

	const submit = () => {
		if (store) {
			if (!point) return
			register.mutate(
				{ name: name.trim(), address: address.trim(), lat: point.lat, lng: point.lng, brandIds: picked },
				{ onSuccess: (shop) => router.replace(shop.status === 'PENDING_VERIFICATION' ? '/under-review?kind=shop' : '/seller') }
			)
			return
		}
		const done = (shop: { status: string }) =>
			shop.status === 'PENDING_VERIFICATION' ? router.replace('/under-review?kind=shop') : (router.replace('/seller'), askForPushAt('shop'))
		if (manual) {
			// Kept in Russian like every place name on the server: «Ряд К, конт. 5».
			const code = manualRow.trim().replace(/^ряд\s*/i, '').toUpperCase()
			register.mutate({ manualPlace: `Ряд ${code}, конт. ${typed}`, brandIds: picked }, { onSuccess: done })
			return
		}
		const go = (containerId: number) =>
			hasShop
				? relocate.mutate(containerId, { onSuccess: () => (toast(t('Контейнер изменён')), router.back()) })
				: register.mutate({ containerId, brandIds: picked }, { onSuccess: done })
		if (slot) return go(slot.id)
		if (!addReady || !activeRowId) return
		addContainer.mutate({ rowId: activeRowId, number: typed, side: newSide }, { onSuccess: (box) => go(box.id) })
	}

	return (
		<View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>
			<ScreenHeader title={hasShop ? t('Ваш контейнер') : t('Где вы продаёте')} />

			<ScrollView
				contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<QueryErrorBanner error={rows.error ?? detail.error ?? brands.error} onRetry={() => rows.refetch()} />

				{hasShop ? null : (
					<View style={{ flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: c.fill, gap: 4 }}>
						{[
							{ value: true, label: t('На рынке Кудайберген') },
							{ value: false, label: t('Магазин или центр') },
						].map((option) => {
							const active = onMarket === option.value
							return (
								<Pressable
									key={option.label}
									onPress={() => setOnMarket(option.value)}
									style={{ flex: 1, height: 40, borderRadius: 11, backgroundColor: active ? c.card : 'transparent', alignItems: 'center', justifyContent: 'center' }}
								>
									<Text style={{ fontSize: fs.md, fontFamily: fontFamily(active ? 700 : 600), color: active ? c.ink : c.muted }}>{option.label}</Text>
								</Pressable>
							)
						})}
					</View>
				)}

				{store ? (
					<>
						<Label>{t('Название')}</Label>
						<TextInput inputAccessoryViewID={KEYBOARD_DONE}
							value={name}
							onChangeText={(text) => setName(text.slice(0, 60))}
							placeholder={t('Например, Kia Центр Бишкек')}
							placeholderTextColor={c.fillInk}
							style={field}
						/>
						<Label>{t('Адрес')}</Label>
						<TextInput inputAccessoryViewID={KEYBOARD_DONE}
							value={address}
							onChangeText={(text) => setAddress(text.slice(0, 160))}
							placeholder={t('ул. Ленина 45')}
							placeholderTextColor={c.fillInk}
							style={field}
						/>
						<Pressable
							onPress={locate}
							disabled={locating}
							style={{ height: 48, borderRadius: 14, backgroundColor: point ? c.successSoft : c.brandTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
						>
							<LocateIcon size={20} color={point ? c.success : c.brandStrong} />
							<Text style={{ fontSize: fs.base, fontFamily: fontFamily(700), color: point ? c.success : c.brandStrong }}>
								{locating ? t('Определяем…') : point ? t('Точка определена — обновить') : t('Отметить по геолокации')}
							</Text>
						</Pressable>
						{locateError ? (
							<Text style={{ fontSize: fs.md, lineHeight: 19, fontFamily: fontFamily(400), color: c.danger }}>{locateError}</Text>
						) : null}
					</>
				) : (
					<>
						<SelectField
							label={t('Ряд')}
							value={manual ? t('Моего ряда нет в списке') : row?.label}
							placeholder={t('Выберите ряд')}
							onPress={() => setSheet('row')}
						/>

						{manual ? (
							<>
								<Label>{t('Ряд')}</Label>
								<TextInput inputAccessoryViewID={KEYBOARD_DONE}
									value={manualRow}
									onChangeText={(text) => setManualRow(text.slice(0, 12))}
									autoCapitalize="characters"
									placeholder={t('Например, К')}
									placeholderTextColor={c.fillInk}
									style={field}
								/>
							</>
						) : (
							<SelectField
								label={t('Контейнер')}
								value={adding ? t('Моего контейнера нет в списке') : slot ? boxLabel(slot) : null}
								placeholder={row ? t('Выберите контейнер') : t('Сначала выберите ряд')}
								disabled={!row}
								onPress={() => setSheet('box')}
							/>
						)}

						{manual || adding ? (
							<>
								<Label>{t('Номер контейнера')}</Label>
								<TextInput inputAccessoryViewID={KEYBOARD_DONE}
									value={number}
									onChangeText={(text) => setNumber(text.replace(/\D/g, '').slice(0, 3))}
									keyboardType="number-pad"
									placeholder={t('Например, 12')}
									placeholderTextColor={c.fillInk}
									style={field}
								/>
								{adding && twoSides ? (
									<View style={{ flexDirection: 'row', gap: 8 }}>
										{sides.map(({ side: value }) => {
											const active = side === value
											return (
												<Pressable
													key={value}
													onPress={() => setSide(value)}
													style={{
														flex: 1,
														height: 44,
														borderRadius: 12,
														borderWidth: 1.5,
														borderColor: active ? c.brand : c.border,
														backgroundColor: active ? c.brand : c.card,
														alignItems: 'center',
														justifyContent: 'center',
													}}
												>
													<Text style={{ fontSize: fs.md, fontFamily: fontFamily(active ? 700 : 600), color: active ? fixed.white : c.ink }}>
														{sideName(value)}
													</Text>
												</Pressable>
											)
										})}
									</View>
								) : null}
								<Text style={{ fontSize: fs.md, lineHeight: 19, fontFamily: fontFamily(400), color: c.muted }}>
									{manual
										? t('Магазин заработает сразу, место покажем текстом — на карту его добавит администрация.')
										: sameBox
											? t('Такой контейнер уже есть — выберем его.')
											: t('Добавим контейнер в ряд {0}, он появится на карте.', row?.code ?? '')}
								</Text>
							</>
						) : null}
						{placeError ? (
							<View style={{ gap: 4 }}>
								<Text style={{ fontSize: fs.md, fontFamily: fontFamily(500), color: c.danger }}>{placeError}</Text>
								{taken && slot ? (
									<Text
										onPress={() => setClaim({ id: slot.id, number: slot.number })}
										style={{ fontSize: fs.md, fontFamily: fontFamily(700), color: c.brandStrong }}
									>{t('Это мой контейнер')}</Text>
								) : null}
							</View>
						) : null}

					</>
				)}

				{hasShop ? null : (
					<>
						<Label>{t('Какие марки продаёте')}</Label>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
							{tiles.map((brand) => (
								<BrandTile key={brand.id} brand={brand} active={picked.includes(brand.id)} onPress={() => toggle(brand.id)} />
							))}
							<Pressable
								onPress={() => setOthersOpen(true)}
								style={{
									flexBasis: '31%',
									flexGrow: 1,
									minHeight: 82,
									borderRadius: 14,
									borderWidth: 2,
									borderStyle: 'dashed',
									borderColor: c.dashedBrand,
									alignItems: 'center',
									justifyContent: 'center',
									gap: 4,
								}}
							>
								<PlusIcon size={20} color={c.brandStrong} />
								<Text style={{ fontSize: fs.sm, fontFamily: fontFamily(700), color: c.brandStrong }}>{t('Другие')}</Text>
							</Pressable>
						</View>
					</>
				)}

				{error ? <Text style={{ fontSize: fs.md, fontFamily: fontFamily(500), color: c.danger }}>{error.message}</Text> : null}
			</ScrollView>

			{othersOpen ? (
				<OtherBrands brands={all} picked={picked} onToggle={toggle} onClose={() => setOthersOpen(false)} />
			) : (
				<View
					style={{
						paddingTop: 12,
						paddingHorizontal: 16,
						paddingBottom: Math.max(28, insets.bottom + 12),
						backgroundColor: c.card,
						borderTopWidth: 1,
						borderTopColor: c.hairline,
					}}
				>
					<Button
						label={hasShop ? t('Переехать сюда') : t('Начать получать запросы')}
						disabled={!ready}
						loading={register.isPending || relocate.isPending || addContainer.isPending}
						onPress={submit}
					/>
				</View>
			)}

			{sheet === 'row' ? (
				<SelectSheet<number>
					title={t('Ряд')}
					options={[
						...sortedRows.map((item) => ({ key: item.id, label: item.label })),
						...(hasShop ? [] : [{ key: MANUAL, label: t('Моего ряда нет в списке'), sub: t('Впишу ряд и номер сам') }]),
					]}
					selected={manual ? MANUAL : activeRowId}
					onPick={(key) => {
						setRowId(key)
						setBoxId(null)
						setSide(null)
						setNumber('')
						setSheet(null)
					}}
					onClose={() => setSheet(null)}
				/>
			) : null}
			{sheet === 'box' && row ? (
				<SelectSheet<number>
					title={row.label}
					options={[
						...boxes.map((box) => ({
							key: box.id,
							label: boxLabel(box),
							sub: box.occupied && box.id !== current?.containerId ? t('Занят') : null,
						})),
						{ key: ADD, label: t('Моего контейнера нет в списке'), sub: t('Добавлю номер сам') },
					]}
					selected={boxId}
					onPick={(key) => {
						setBoxId(key)
						setNumber('')
						setSide(null)
						setSheet(null)
					}}
					onClose={() => setSheet(null)}
				/>
			) : null}

			<ClaimSheet
				box={claim && row ? { ...claim, place: t('{0} · конт. {1}', row.label, claim.number) } : null}
				onClose={() => setClaim(null)}
				onFree={(free) => {
					setClaim(null)
					const box = boxes.find((item) => item.number === free.number)
					if (box) setBoxId(box.id)
				}}
			/>
		</View>
	)
}

/** «Другие» — all brands A–Я with search. */
function OtherBrands({
	brands,
	picked,
	onToggle,
	onClose,
}: {
	brands: Brand[]
	picked: number[]
	onToggle: (id: number) => void
	onClose: () => void
}) {
	const c = useColors()
	const [q, setQ] = useState('')
	const query = q.trim().toLowerCase()
	// The server knows folk names («мерс», «бэха», «тойота»); the local match covers the moment before it answers.
	const found = useBrands(query ? { q: q.trim() } : {})
	const list = query
		? found.data && !found.isPlaceholderData
			? found.data
			: brands.filter((b) => b.name.toLowerCase().includes(query) || b.shortName.toLowerCase().includes(query))
		: brands

	return (
		<BottomSheet
			onClose={onClose}
			maxHeight={0.8}
			header={
				<View style={{ gap: 12 }}>
					<Text style={{ fontSize: fs.h3, fontFamily: fontFamily(800), color: c.ink }}>{t('Все марки')}</Text>
					<View
						style={{
							height: 48,
							borderRadius: 12,
							backgroundColor: c.surface,
							flexDirection: 'row',
							alignItems: 'center',
							gap: 10,
							paddingHorizontal: 12,
						}}
					>
						<SearchIcon size={20} color={c.muted} strokeWidth={2.4} />
						<TextInput inputAccessoryViewID={KEYBOARD_DONE}
							value={q}
							onChangeText={setQ}
							placeholder={t('Найти марку')}
							placeholderTextColor={c.fillInk}
							style={{ flex: 1, fontSize: fs.lg, fontFamily: fontFamily(400), color: c.ink, padding: 0 }}
						/>
					</View>
				</View>
			}
			footer={<Button label={picked.length ? t('Готово · {0}', picked.length) : t('Готово')} onPress={onClose} />}
		>
			{list.map((brand) => {
				const active = picked.includes(brand.id)
				return (
					<Pressable key={brand.id} onPress={() => onToggle(brand.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
						<BrandLogo brand={brand} size={34} />
						<Text style={{ flex: 1, fontSize: fs.lg, fontFamily: fontFamily(400), color: c.ink }}>{brand.name}</Text>
						<View
							style={{
								width: 24,
								height: 24,
								borderRadius: 7,
								borderWidth: 2,
								borderColor: active ? c.brand : c.border,
								backgroundColor: active ? c.brand : 'transparent',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							{active ? <TickIcon size={14} color={fixed.white} strokeWidth={3} /> : null}
						</View>
					</Pressable>
				)
			})}
		</BottomSheet>
	)
}

/**
 * «Это мой контейнер» — no mockup; a sheet in the style of 09. POST /market/containers/{id}/claim → the dispute goes
 * to the administration, the answer comes as a DISPUTE_RESOLVED push. 409 CONTAINER_FREE — the box is free after all.
 */
function ClaimSheet({
	box,
	onClose,
	onFree,
}: {
	box: { id: number; number: number; place: string } | null
	onClose: () => void
	onFree: (box: { id: number; number: number }) => void
}) {
	const c = useColors()
	const insets = useSafeAreaInsets()
	const claim = useClaimContainer()
	const [text, setText] = useState('')
	const code = claim.error instanceof ApiError ? claim.error.code : null

	const close = () => {
		claim.reset()
		setText('')
		onClose()
	}

	return (
		<Modal visible={box !== null} transparent animationType="slide" onRequestClose={close}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={close} />
				<View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 + insets.bottom, gap: 14 }}>
					{claim.isSuccess ? (
						<>
							<Text style={{ fontSize: fs.h3, fontFamily: fontFamily(700), color: c.ink }}>{t('Заявка на спор отправлена')}</Text>
							<Text style={{ fontSize: fs.base, lineHeight: 23, fontFamily: fontFamily(400), color: c.muted }}>{t('Администрация рынка проверит, чей это контейнер, и пришлёт пуш с решением.')}</Text>
							<Button label={t('Понятно')} onPress={close} />
						</>
					) : (
						<>
							<Text style={{ fontSize: fs.h3, fontFamily: fontFamily(700), color: c.ink }}>{t('{0} занят', box?.place ?? ' ')}</Text>
							<Text style={{ fontSize: fs.base, lineHeight: 23, fontFamily: fontFamily(400), color: c.muted }}>{t('Если это ваш контейнер, а в приложении его занял другой продавец, — откройте спор. Администрация рынка разберётся.')}</Text>
							<TextInput inputAccessoryViewID={KEYBOARD_DONE}
								value={text}
								onChangeText={(v) => setText(v.slice(0, 500))}
								placeholder={t('Комментарий — необязательно: с какого года аренда, договор…')}
								placeholderTextColor={c.fillInk}
								multiline
								style={{ minHeight: 72, borderRadius: 12, borderWidth: 2, borderColor: c.border, paddingVertical: 10, paddingHorizontal: 14, fontSize: fs.base, fontFamily: fontFamily(400), color: c.ink, textAlignVertical: 'top' }}
							/>
							{claim.error ? (
								<Text style={{ fontSize: fs.md, fontFamily: fontFamily(500), color: c.danger }}>{claim.error.message}</Text>
							) : null}
							{code === 'CONTAINER_FREE' && box ? (
								<Button label={t('Занять этот контейнер')} variant="secondary" onPress={() => onFree({ id: box.id, number: box.number })} />
							) : (
								<Button
									label={t('Это мой контейнер')}
									loading={claim.isPending}
									disabled={code === 'OWN_CONTAINER'}
									onPress={() => box && claim.mutate({ containerId: box.id, text: text.trim() || undefined })}
								/>
							)}
						</>
					)}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	)
}
