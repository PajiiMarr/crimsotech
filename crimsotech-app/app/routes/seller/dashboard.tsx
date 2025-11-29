import type { Route } from './+types/dashboard'
import SellerSidebarLayout from '~/components/layouts/seller-sidebar'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Seller | Dashboard",
    },
  ];
}
export default function SellerDashboard() {
  
  return (
      <SellerSidebarLayout>
        <section className='w-full h-20'>
          <div>
            Seller Dashboard
          </div>
        </section>
      </SellerSidebarLayout>
      
        
    )
}
