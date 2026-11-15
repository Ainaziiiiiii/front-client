import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui'
import { TabBarContainer, TabButton } from '@/components/tab-bar'
import { useUnread } from '@/api/chats'
import { ChatIcon, HomeIcon, MarketIcon, ProfileIcon, SearchIcon } from '@/components/icons'
import { t } from '@/i18n'
import { useSignedIn } from '@/api/catalog'

/** Buyer tabs: Главная · Запчасти · Рынок (карта) · Чаты · Профиль. «Мои запросы» — на главной [03]. */
export default function BuyerLayout() {
	// Unread chats for this side — counted on the server, kept live by the UNREAD event.
	const signedIn = useSignedIn()
	const unread = useUnread(signedIn).data?.asBuyer ?? 0

	return (
		<Tabs>
			<TabSlot style={{ flex: 1 }} />

			<TabBarContainer>
				<TabTrigger name="home" asChild>
					<TabButton icon={HomeIcon} label={t('Главная')} />
				</TabTrigger>
				<TabTrigger name="parts" asChild>
					<TabButton icon={SearchIcon} label={t('Запчасти')} />
				</TabTrigger>
				<TabTrigger name="market" asChild>
					<TabButton icon={MarketIcon} label={t('Рынок')} />
				</TabTrigger>
				<TabTrigger name="chats" asChild>
					<TabButton icon={ChatIcon} label={t('Чаты')} badge={unread || undefined} />
				</TabTrigger>
				<TabTrigger name="profile" asChild>
					<TabButton icon={ProfileIcon} label={t('Профиль')} />
				</TabTrigger>
			</TabBarContainer>

			<TabList style={{ display: 'none' }}>
				<TabTrigger name="home" href="/buyer" />
				<TabTrigger name="parts" href="/buyer/parts" />
				<TabTrigger name="market" href="/buyer/market" />
				<TabTrigger name="chats" href="/buyer/chats" />
				<TabTrigger name="profile" href="/buyer/profile" />
			</TabList>
		</Tabs>
	)
}
