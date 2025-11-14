import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Admin | Dashboard",
    },
  ];
}

export default function Home ({}: Route.ComponentProps) {
  return (
    <SidebarLayout>
      <section className='w-full h-20'>
        <div>
          Admin
        </div>
      </section>
    </SidebarLayout>
  )
}