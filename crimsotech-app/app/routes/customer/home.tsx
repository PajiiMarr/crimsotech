import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { ProductCard } from '~/components/customer/product-card'
import { ProductCategory } from '~/components/customer/product-category'
import { TopProductCard } from '~/components/customer/top-product'
import { UserProvider } from '~/components/providers/user-role-provider';
// import { requireRole } from '~/middleware/role-require.server';
// import { userContext } from '~/contexts/user-role';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Home",
    },
  ];
}


export async function loader({ request, context }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireAuth } = await import("~/middleware/auth.server");
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = context.get(userContext);
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  return user;
}




export default function Home ({loaderData}: Route.ComponentProps) {
  const user = loaderData;
  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-1">
          {/* Search bar */}
          <div className="mb-6">
            <SearchForm />
          </div>

          <h2 className="mb-4 text-lg font-semibold text-gray-700">
          Categories
        </h2>

        <div className="flex gap-4 mb- overflow-x-auto py-2">
          <ProductCategory title="Wires" image="/public/wire.jpg" />
          <ProductCategory title="Appliances" image="/public/appliances.jpg" />
          <ProductCategory title="Smartphones" image="/public/phon.jpg" />
          <ProductCategory title="Accessories" image="/public/controller.jpg" />
          <ProductCategory title="Watches" image="/public/controller.jpg" />
        </div>


        {/* Top Products */}
          <h2 className="mb-4 text-lg font-semibold text-gray-700">
            Top Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <TopProductCard />
            <TopProductCard />
            <TopProductCard />
            <TopProductCard />
          </div>


          {/* Suggested For You label */}
          <h2 className="mt-5 mb-4 text-lg font-semibold text-gray-700">
            Suggested For You
          </h2>

          {/* Grid for multiple product cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
            <ProductCard />
          </div>
        </section>
      </SidebarLayout>
    </UserProvider>
  )
}