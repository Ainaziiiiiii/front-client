import { router, type Href } from 'expo-router'

/**
 * «Назад», which always goes somewhere. A screen opened from a push, a link or a web reload has nothing behind it —
 * `router.back()` then does nothing (GO_BACK «was not handled by any navigator») and the button looks dead.
 * Without history: the fallback, by default `/`, which redirects to the user's home by role.
 */
export function goBack(fallback: Href = '/') {
	if (router.canGoBack()) router.back()
	else router.replace(fallback)
}
