import { EmptyState, LinkButton } from 'endfield-vision'
import { Compass } from 'lucide-react'
import { getLang } from '@/lib/lang-server'

export default async function NotFound() {
  const en = (await getLang()) === 'en'
  return (
    <div className="pg-fullscreen">
      <EmptyState
        icon={<Compass size={28} />}
        title={en ? 'Page not found' : 'Страница не найдена'}
        description={en ? 'The address is outdated or mistyped.' : 'Адрес устарел или набран с ошибкой.'}
        actions={
          <LinkButton href="/overview" variant="primary">
            {en ? 'Go to overview' : 'На главную'}
          </LinkButton>
        }
      />
    </div>
  )
}
