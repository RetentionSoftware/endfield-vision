import { EmptyState, LinkButton } from 'endfield-vision'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="pg-fullscreen">
      <EmptyState
        icon={<Compass size={28} />}
        title="Страница не найдена"
        description="Адрес устарел или набран с ошибкой."
        actions={
          <LinkButton href="/overview" variant="primary">
            На главную
          </LinkButton>
        }
      />
    </div>
  )
}
