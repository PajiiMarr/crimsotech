import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Moderator | Dashboard",
    },
  ];
}

export default function Home ({}: Route.ComponentProps) {
  return (
    <SidebarLayout>
      <section className='w-full h-20'>
        <div>
          Moderator
        </div>
      </section>
    </SidebarLayout>
  )
}