"use client";

import type { Route } from './+types/home'
import SidebarLayout from '~/components/layouts/sidebar'
import SearchForm from '~/components/customer/search-bar'
import { GiftProductCard } from '~/components/customer/product-gifts'
import { ProductCategory } from '~/components/customer/product-category'
import { TopProductCard } from '~/components/customer/top-product'
import { UserProvider } from '~/components/providers/user-role-provider';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Comgift",
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

export default function Comgift({ loaderData }: Route.ComponentProps) {
  const user = loaderData;

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <section className="w-full p-1">

          {/* Search bar */}
          <div className="mb-6">
            <SearchForm />
          </div>

          {/* Categories */}
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Categories</h2>

          <div className="flex gap-4 overflow-x-auto py-2">
            <ProductCategory title="Wires" image="/public/wire.jpg" />
            <ProductCategory title="Appliances" image="/public/appliances.jpg" />
            <ProductCategory title="Smartphones" image="/public/phon.jpg" />
            <ProductCategory title="Accessories" image="/public/controller.jpg" />
            <ProductCategory title="Watches" image="/public/controller.jpg" />
          </div>

          {/* Suggested For You */}
          <h2 className="mt-5 mb-4 text-lg font-semibold text-gray-700">
            Suggested For You
          </h2>

          {/* Grid for product cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
            <GiftProductCard />
          </div>

        </section>
      </SidebarLayout>
    </UserProvider>
  );
}
