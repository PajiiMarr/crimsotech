import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Home",
    },
  ];
}

export default function Home ({}: Route.ComponentProps) {
  return (
    <SidebarLayout>
      <section className='w-full h-20'>
        <div>
          hello
        </div>
      </section>
    </SidebarLayout>
  )
}