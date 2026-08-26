import CustomerMenu from '@/components/customer/CustomerMenu';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
  searchParams?: Promise<{
    table?: string;
  }>;
}

export default async function CustomerMenuCatchAllPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  const slugParts = resolvedParams.slug || [];
  const restaurantSlug = slugParts[0] || '';

  let tableId = resolvedSearchParams?.table;
  let isTakeaway = false;
  let isReservation = false;

  if (slugParts[1] === 'table' && slugParts[2]) {
    tableId = slugParts[2];
  } else if (slugParts[1] === 'takeaway') {
    isTakeaway = true;
  } else if (slugParts[1] === 'reservation') {
    isReservation = true;
  }

  return (
    <CustomerMenu
      restaurantSlug={restaurantSlug}
      tableId={tableId}
      isTakeaway={isTakeaway}
      isReservation={isReservation}
    />
  );
}
